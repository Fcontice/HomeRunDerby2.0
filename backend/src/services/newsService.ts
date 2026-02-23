/**
 * News Service
 * Fetches, normalizes, and stores daily news digest items
 * from MLB Stats API (transactions, HR logs) and RSS feeds (injuries, trade rumors).
 *
 * Only items referencing players in the active contest pool are stored.
 */

import axios from 'axios'
import Parser from 'rss-parser'
import { db } from './db.js'
import supabaseAdmin from '../config/supabase.js'
import type { NewsItem } from '../types/entities.js'

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1'

const rssParser = new Parser({ timeout: 15000 })

const RSS_FEEDS = [
  { url: 'https://www.mlbtraderumors.com/feed', name: 'MLB Trade Rumors' },
]

// ==================== PLAYER POOL LOOKUP ====================

interface PlayerPoolEntry {
  id: string
  mlbId: string
  name: string
  teamAbbr: string
}

interface PlayerPool {
  byName: Map<string, PlayerPoolEntry>
  byMlbId: Map<string, PlayerPoolEntry>
  allPlayers: PlayerPoolEntry[]
}

/**
 * Build a lookup map of all players in the active contest pool
 */
async function getPlayerPool(): Promise<PlayerPool> {
  const players = await db.player.findMany()
  const byName = new Map<string, PlayerPoolEntry>()
  const byMlbId = new Map<string, PlayerPoolEntry>()
  const allPlayers: PlayerPoolEntry[] = []

  for (const p of players) {
    const entry: PlayerPoolEntry = { id: p.id, mlbId: p.mlbId, name: p.name, teamAbbr: p.teamAbbr }
    byName.set(p.name.toLowerCase(), entry)
    byMlbId.set(p.mlbId, entry)
    // Also index without the "mlb-" prefix
    if (p.mlbId.startsWith('mlb-')) {
      byMlbId.set(p.mlbId.replace('mlb-', ''), entry)
    }
    allPlayers.push(entry)
  }

  return { byName, byMlbId, allPlayers }
}

// ==================== HR NEWS (from existing PlayerStats) ====================

/**
 * Fetch HR news from existing PlayerStats for a given date.
 * Reuses data already imported by the 3 AM stats update job.
 */
async function fetchHRNews(dateStr: string): Promise<Partial<NewsItem>[]> {
  const { data: stats, error } = await supabaseAdmin
    .from('PlayerStats')
    .select('playerId, hrsDaily, hrsTotal, date, player:Player!inner(id, name, teamAbbr, mlbId)')
    .eq('date', dateStr)
    .gt('hrsDaily', 0)
    .order('hrsDaily', { ascending: false })

  if (error) {
    console.error('Failed to fetch HR stats:', error)
    return []
  }
  if (!stats || stats.length === 0) return []

  return stats.map((stat: Record<string, unknown>) => {
    const player = stat.player as { id: string; name: string; teamAbbr: string; mlbId: string }
    const hrsDaily = stat.hrsDaily as number
    const hrsTotal = stat.hrsTotal as number
    const playerId = stat.playerId as string
    const mlbIdClean = player.mlbId.replace('mlb-', '')

    return {
      dateKey: dateStr,
      category: 'hr' as const,
      headline: `${player.name} hit ${hrsDaily} HR${hrsDaily > 1 ? 's' : ''} (${hrsTotal} total)`,
      summary: `${player.name} (${player.teamAbbr}) went deep ${hrsDaily} time${hrsDaily > 1 ? 's' : ''} on ${dateStr}`,
      playerId,
      playerName: player.name,
      teamAbbr: player.teamAbbr,
      sourceUrl: `https://www.mlb.com/player/${mlbIdClean}`,
      sourceName: 'MLB Stats',
      externalId: `hr-${playerId}-${dateStr}`,
      metadata: { hrsOnDate: hrsDaily, hrsTotal },
    }
  })
}

// ==================== MLB TRANSACTIONS API ====================

/**
 * Fetch MLB transactions for a date, filtered to pool players
 */
async function fetchTransactionNews(
  dateStr: string,
  playerPool: PlayerPool
): Promise<Partial<NewsItem>[]> {
  const items: Partial<NewsItem>[] = []

  try {
    const response = await axios.get(`${MLB_API_BASE}/transactions`, {
      params: { date: dateStr },
      timeout: 15000,
    })

    const transactions = response.data?.transactions || []

    for (const txn of transactions) {
      const playerInfo = txn.person
      if (!playerInfo) continue

      // Match against player pool by MLB ID
      const mlbIdStr = String(playerInfo.id)
      const poolPlayer = playerPool.byMlbId.get(mlbIdStr)
        || playerPool.byMlbId.get(`mlb-${mlbIdStr}`)
        || playerPool.byName.get(playerInfo.fullName?.toLowerCase())

      if (!poolPlayer) continue // Not in our player pool

      const typeDesc = txn.typeDesc || txn.description || 'Transaction'
      const descLower = (txn.description || '').toLowerCase()

      // IL placements/returns → category: injury
      if (descLower.includes('injured list') || descLower.includes('disabled list')) {
        const isReturn = descLower.includes('reinstated') || descLower.includes('activated')
        items.push({
          dateKey: dateStr,
          category: 'injury',
          headline: isReturn
            ? `${poolPlayer.name} activated from IL`
            : `${poolPlayer.name} placed on IL`,
          summary: txn.description,
          playerId: poolPlayer.id,
          playerName: poolPlayer.name,
          teamAbbr: poolPlayer.teamAbbr,
          sourceUrl: `https://www.mlb.com/player/${mlbIdStr}`,
          sourceName: 'MLB Transactions',
          externalId: `txn-${txn.id || `${mlbIdStr}-${dateStr}-il`}`,
          metadata: {
            status: isReturn ? 'returned' : 'placed',
            injuryType: typeDesc,
          },
        })
        continue
      }

      // Categorize other transactions
      let transactionType = 'trade'
      if (descLower.includes('designated for assignment') || descLower.includes('dfa')) {
        transactionType = 'dfa'
      } else if (descLower.includes('recalled') || descLower.includes('selected')) {
        transactionType = 'call-up'
      } else if (descLower.includes('optioned')) {
        transactionType = 'option'
      } else if (descLower.includes('claimed') || descLower.includes('waiver')) {
        transactionType = 'waiver'
      }

      items.push({
        dateKey: dateStr,
        category: 'trade',
        headline: `${poolPlayer.name}: ${typeDesc}`,
        summary: txn.description,
        playerId: poolPlayer.id,
        playerName: poolPlayer.name,
        teamAbbr: poolPlayer.teamAbbr,
        sourceUrl: `https://www.mlb.com/player/${mlbIdStr}`,
        sourceName: 'MLB Transactions',
        externalId: `txn-${txn.id || `${mlbIdStr}-${dateStr}-${transactionType}`}`,
        metadata: {
          transactionType,
          fromTeam: txn.fromTeam?.name,
          toTeam: txn.toTeam?.name,
        },
      })
    }
  } catch (error) {
    console.error('Failed to fetch MLB transactions:', error instanceof Error ? error.message : error)
    // Non-fatal: continue with other news sources
  }

  return items
}

// ==================== RSS FEED NEWS ====================

/**
 * Find pool players mentioned in a text block
 */
function findMentionedPlayers(text: string, playerPool: PlayerPool): PlayerPoolEntry[] {
  const textLower = text.toLowerCase()
  const matched: PlayerPoolEntry[] = []
  const seenIds = new Set<string>()

  for (const player of playerPool.allPlayers) {
    if (seenIds.has(player.id)) continue

    // Match full name
    if (textLower.includes(player.name.toLowerCase())) {
      matched.push(player)
      seenIds.add(player.id)
      continue
    }

    // Match last name only if >= 6 chars (avoid false positives like "Cruz", "Bell")
    const lastName = player.name.split(' ').pop() || ''
    if (lastName.length >= 6 && textLower.includes(lastName.toLowerCase())) {
      matched.push(player)
      seenIds.add(player.id)
    }
  }

  return matched
}

/**
 * Categorize RSS item based on keywords in title/content
 */
function categorizeRSSItem(title: string, content: string): 'injury' | 'trade' | null {
  const combined = `${title} ${content}`.toLowerCase()

  const injuryKeywords = [
    'injury', 'injured list', 'il stint', 'disabled list', 'surgery',
    'mri', 'strain', 'sprain', 'fracture', 'concussion', 'day-to-day',
    'out for', 'sidelined', 'rehab',
  ]
  const tradeKeywords = [
    'trade', 'traded', 'dfa', 'designated for assignment', 'recalled',
    'optioned', 'claimed', 'waiver', 'released', 'signed', 'call-up',
    'callup', 'free agent', 'extension', 'deal',
  ]

  if (injuryKeywords.some(kw => combined.includes(kw))) return 'injury'
  if (tradeKeywords.some(kw => combined.includes(kw))) return 'trade'
  return null
}

/**
 * Fetch and filter RSS feed items to contest pool players
 */
async function fetchRSSNews(dateStr: string, playerPool: PlayerPool): Promise<Partial<NewsItem>[]> {
  const items: Partial<NewsItem>[] = []
  const targetDate = new Date(dateStr + 'T00:00:00Z')
  const dayBefore = new Date(targetDate)
  dayBefore.setDate(dayBefore.getDate() - 1)
  const dayAfter = new Date(targetDate)
  dayAfter.setDate(dayAfter.getDate() + 1)

  for (const feed of RSS_FEEDS) {
    try {
      const feedData = await rssParser.parseURL(feed.url)

      for (const entry of feedData.items || []) {
        // Only include items from within a 48-hour window around the target date
        const pubDate = entry.pubDate ? new Date(entry.pubDate) : null
        if (pubDate && (pubDate < dayBefore || pubDate > dayAfter)) {
          continue
        }

        const title = entry.title || ''
        const content = entry.contentSnippet || entry.content || ''

        const category = categorizeRSSItem(title, content)
        if (!category) continue

        const mentionedPlayers = findMentionedPlayers(`${title} ${content}`, playerPool)
        if (mentionedPlayers.length === 0) continue

        // Create one news item per mentioned pool player
        for (const player of mentionedPlayers) {
          const guidHash = (entry.guid || entry.link || title).slice(0, 80)
          const externalId = `rss-${feed.name.replace(/\s+/g, '-').toLowerCase()}-${guidHash}-${player.id}`

          items.push({
            dateKey: dateStr,
            category,
            headline: title.length > 200 ? title.slice(0, 197) + '...' : title,
            summary: content.slice(0, 300) || null,
            playerId: player.id,
            playerName: player.name,
            teamAbbr: player.teamAbbr,
            sourceUrl: entry.link || undefined,
            sourceName: feed.name,
            externalId,
            metadata: category === 'injury'
              ? { status: title.toLowerCase().includes('return') ? 'returned' : 'placed' }
              : { transactionType: 'trade' },
          })
        }
      }
    } catch (error) {
      console.error(`Failed to fetch RSS feed ${feed.name}:`, error instanceof Error ? error.message : error)
      // Non-fatal: continue with other feeds
    }
  }

  return items
}

// ==================== ORCHESTRATOR ====================

/**
 * Generate the full daily news digest for a given date.
 * Called by the scheduled job at 7 AM ET.
 * Safe to re-run (idempotent due to externalId uniqueness).
 */
export async function generateDailyNewsDigest(dateStr?: string): Promise<{
  success: boolean
  hrCount: number
  injuryCount: number
  tradeCount: number
  totalItems: number
  error?: string
}> {
  // Default to yesterday's date
  const targetDate = dateStr || (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  })()

  console.log(`\n📰 Generating daily news digest for ${targetDate}...`)

  const playerPool = await getPlayerPool()
  console.log(`   Player pool: ${playerPool.allPlayers.length} players`)

  // Fetch from all sources in parallel
  const [hrItems, txnItems, rssItems] = await Promise.all([
    fetchHRNews(targetDate),
    fetchTransactionNews(targetDate, playerPool),
    fetchRSSNews(targetDate, playerPool),
  ])

  const allItems = [...hrItems, ...txnItems, ...rssItems]
  console.log(`   HR items: ${hrItems.length}, Transaction items: ${txnItems.length}, RSS items: ${rssItems.length}`)

  if (allItems.length === 0) {
    console.log('   No news items for this date.')
    return { success: true, hrCount: 0, injuryCount: 0, tradeCount: 0, totalItems: 0 }
  }

  // Bulk upsert to database (duplicates skipped via unique constraint)
  const inserted = await db.newsItem.bulkCreate(allItems)
  console.log(`   Stored ${inserted} news items in database`)

  return {
    success: true,
    hrCount: hrItems.length,
    injuryCount: allItems.filter(i => i.category === 'injury').length,
    tradeCount: allItems.filter(i => i.category === 'trade').length,
    totalItems: inserted,
  }
}
