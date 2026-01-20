/**
 * Leaderboard Service
 * Calculates and caches leaderboard rankings in the database
 */

import { db } from './db.js'
import { supabaseAdmin } from '../config/supabase.js'
import { calculateAllTeamScores, calculateMonthlyScores, PlayerScore } from './scoringService.js'
import { leaderboardCache } from './leaderboardCache.js'

export type LeaderboardType = 'overall' | 'monthly' | 'allstar'

export interface LeaderboardEntry {
  rank: number
  teamId: string
  teamName: string
  totalHrs: number
  userId: string
  username: string
  avatarUrl: string | null
  playerScores?: PlayerScore[]  // Optional detailed player breakdown
}

/**
 * Calculate and save overall season leaderboard
 * Includes both regular season and postseason HRs
 */
export async function calculateOverallLeaderboard(seasonYear: number = 2025): Promise<LeaderboardEntry[]> {
  console.log(`\n🏆 Calculating overall leaderboard for ${seasonYear}...`)

  // Calculate all team scores
  const teamScores = await calculateAllTeamScores(seasonYear, true)

  // Clear existing overall leaderboard for this season
  await clearLeaderboard(seasonYear, 'overall')

  // Save to database and build response
  const entries: LeaderboardEntry[] = []

  for (let i = 0; i < teamScores.length; i++) {
    const score = teamScores[i]
    const rank = i + 1

    // Get team user info
    const team = await db.team.findUnique({ id: score.teamId }, { user: true })

    if (!team || !team.user) {
      console.warn(`⚠️  Team ${score.teamId} has no user, skipping`)
      continue
    }

    // Save to Leaderboard table
    await db.leaderboard.create({
      teamId: score.teamId,
      leaderboardType: 'overall',
      month: null,
      rank,
      totalHrs: score.totalHrs,
      seasonYear,
      calculatedAt: new Date().toISOString(),
    })

    entries.push({
      rank,
      teamId: score.teamId,
      teamName: score.teamName,
      totalHrs: score.totalHrs,
      userId: team.user.id,
      username: team.user.username,
      avatarUrl: team.user.avatarUrl,
    })
  }

  console.log(`✅ Overall leaderboard saved (${entries.length} teams)\n`)

  // Invalidate cache after recalculation
  leaderboardCache.invalidate(`overall:${seasonYear}`)

  return entries
}

/**
 * Calculate and save monthly leaderboard (regular season only)
 */
export async function calculateMonthlyLeaderboard(
  seasonYear: number,
  month: number
): Promise<LeaderboardEntry[]> {
  console.log(`\n📅 Calculating monthly leaderboard for ${seasonYear}-${month.toString().padStart(2, '0')}...`)

  // Calculate monthly team scores
  const teamScores = await calculateMonthlyScores(seasonYear, month)

  // Clear existing monthly leaderboard for this month
  await clearLeaderboard(seasonYear, 'monthly', month)

  // Save to database
  const entries: LeaderboardEntry[] = []

  for (let i = 0; i < teamScores.length; i++) {
    const score = teamScores[i]
    const rank = i + 1

    const team = await db.team.findUnique({ id: score.teamId }, { user: true })

    if (!team || !team.user) continue

    await db.leaderboard.create({
      teamId: score.teamId,
      leaderboardType: 'monthly',
      month,
      rank,
      totalHrs: score.totalHrs,
      seasonYear,
      calculatedAt: new Date().toISOString(),
    })

    entries.push({
      rank,
      teamId: score.teamId,
      teamName: score.teamName,
      totalHrs: score.totalHrs,
      userId: team.user.id,
      username: team.user.username,
      avatarUrl: team.user.avatarUrl,
    })
  }

  console.log(`✅ Monthly leaderboard saved (${entries.length} teams)\n`)

  // Invalidate cache after recalculation
  leaderboardCache.invalidate(`monthly:${seasonYear}:${month}`)

  return entries
}

/**
 * Get overall leaderboard from database (cached)
 * Optimized to use a single JOIN query instead of N+1 queries
 */
export async function getOverallLeaderboard(seasonYear: number = 2025): Promise<LeaderboardEntry[]> {
  // Check cache first
  const cacheKey = `overall:${seasonYear}`
  const cached = leaderboardCache.get<LeaderboardEntry[]>(cacheKey)
  if (cached) {
    console.log(`📋 Leaderboard cache hit for ${cacheKey}`)
    return cached
  }

  console.log(`📋 Fetching leaderboard from database for ${seasonYear}...`)
  const startTime = Date.now()

  // Single query with JOINs to get all data at once
  const { data, error } = await supabaseAdmin
    .from('Leaderboard')
    .select(`
      id,
      teamId,
      rank,
      totalHrs,
      team:Team!inner(
        id,
        name,
        deletedAt,
        user:User!inner(
          id,
          username,
          avatarUrl
        ),
        teamPlayers:TeamPlayer(
          id,
          player:Player(
            id,
            name
          )
        )
      )
    `)
    .eq('leaderboardType', 'overall')
    .eq('seasonYear', seasonYear)
    .is('team.deletedAt', null)
    .order('rank', { ascending: true })

  if (error) {
    console.error('Error fetching leaderboard:', error)
    throw error
  }

  // Get all player IDs from all teams in one pass
  const allPlayerIds = new Set<string>()
  for (const record of data || []) {
    const team = record.team as unknown as {
      teamPlayers: Array<{ player: { id: string } }>
    }
    if (team?.teamPlayers) {
      for (const tp of team.teamPlayers) {
        if (tp.player?.id) {
          allPlayerIds.add(tp.player.id)
        }
      }
    }
  }

  // Fetch all latest player stats in one query
  const playerStatsMap = new Map<string, { hrsTotal: number; hrsRegularSeason: number; hrsPostseason: number }>()

  if (allPlayerIds.size > 0) {
    // Get the latest stats for each player by using a subquery approach
    // We'll fetch all stats and then filter to the latest per player
    const { data: allStats, error: statsError } = await supabaseAdmin
      .from('PlayerStats')
      .select('playerId, hrsTotal, hrsRegularSeason, hrsPostseason, date')
      .eq('seasonYear', seasonYear)
      .in('playerId', Array.from(allPlayerIds))
      .order('date', { ascending: false })

    if (statsError) {
      console.error('Error fetching player stats:', statsError)
      throw statsError
    }

    // Keep only the latest stat for each player
    if (allStats) {
      for (const stat of allStats) {
        if (!playerStatsMap.has(stat.playerId)) {
          playerStatsMap.set(stat.playerId, {
            hrsTotal: stat.hrsTotal || 0,
            hrsRegularSeason: stat.hrsRegularSeason || 0,
            hrsPostseason: stat.hrsPostseason || 0,
          })
        }
      }
    }
  }

  // Transform data to LeaderboardEntry format
  const entries: LeaderboardEntry[] = []

  for (const record of data || []) {
    const team = record.team as unknown as {
      id: string
      name: string
      user: { id: string; username: string; avatarUrl: string | null }
      teamPlayers: Array<{ id: string; player: { id: string; name: string } }>
    }

    if (!team || !team.user) continue

    // Build player scores from the fetched stats
    const playerScores: PlayerScore[] = []
    if (team.teamPlayers) {
      for (const tp of team.teamPlayers) {
        const player = tp.player
        const stats = playerStatsMap.get(player.id)

        playerScores.push({
          playerId: player.id,
          playerName: player.name,
          hrsTotal: stats?.hrsTotal || 0,
          hrsRegularSeason: stats?.hrsRegularSeason || 0,
          hrsPostseason: stats?.hrsPostseason || 0,
          included: false, // Will be calculated below
        })
      }

      // Sort by HRs and mark top 7 as included
      playerScores.sort((a, b) => b.hrsTotal - a.hrsTotal)
      for (let i = 0; i < Math.min(7, playerScores.length); i++) {
        playerScores[i].included = true
      }
    }

    entries.push({
      rank: record.rank,
      teamId: record.teamId,
      teamName: team.name,
      totalHrs: record.totalHrs,
      userId: team.user.id,
      username: team.user.username,
      avatarUrl: team.user.avatarUrl,
      playerScores,
    })
  }

  const duration = Date.now() - startTime
  console.log(`✅ Leaderboard fetched in ${duration}ms (${entries.length} teams)`)

  // Cache the results
  leaderboardCache.set(cacheKey, entries)

  return entries
}

/**
 * Get monthly leaderboard from database (cached)
 * Optimized to use a single JOIN query
 */
export async function getMonthlyLeaderboard(
  seasonYear: number,
  month: number
): Promise<LeaderboardEntry[]> {
  // Check cache first
  const cacheKey = `monthly:${seasonYear}:${month}`
  const cached = leaderboardCache.get<LeaderboardEntry[]>(cacheKey)
  if (cached) {
    console.log(`📋 Monthly leaderboard cache hit for ${cacheKey}`)
    return cached
  }

  console.log(`📋 Fetching monthly leaderboard from database for ${seasonYear}-${month}...`)
  const startTime = Date.now()

  // Single query with JOINs
  const { data, error } = await supabaseAdmin
    .from('Leaderboard')
    .select(`
      id,
      teamId,
      rank,
      totalHrs,
      team:Team!inner(
        id,
        name,
        deletedAt,
        user:User!inner(
          id,
          username,
          avatarUrl
        )
      )
    `)
    .eq('leaderboardType', 'monthly')
    .eq('month', month)
    .eq('seasonYear', seasonYear)
    .is('team.deletedAt', null)
    .order('rank', { ascending: true })

  if (error) {
    console.error('Error fetching monthly leaderboard:', error)
    throw error
  }

  // Transform data to LeaderboardEntry format
  const entries: LeaderboardEntry[] = []

  for (const record of data || []) {
    const team = record.team as unknown as {
      id: string
      name: string
      user: { id: string; username: string; avatarUrl: string | null }
    }

    if (!team || !team.user) continue

    entries.push({
      rank: record.rank,
      teamId: record.teamId,
      teamName: team.name,
      totalHrs: record.totalHrs,
      userId: team.user.id,
      username: team.user.username,
      avatarUrl: team.user.avatarUrl,
    })
  }

  const duration = Date.now() - startTime
  console.log(`✅ Monthly leaderboard fetched in ${duration}ms (${entries.length} teams)`)

  // Cache the results
  leaderboardCache.set(cacheKey, entries)

  return entries
}

/**
 * Clear leaderboard cache for recalculation
 */
async function clearLeaderboard(
  seasonYear: number,
  leaderboardType: LeaderboardType,
  month?: number
) {
  await db.leaderboard.deleteMany({
    leaderboardType,
    seasonYear,
    month: month !== undefined ? month : null,
  })
}

/**
 * Add a team to the leaderboard with 0 HRs
 * Called when a team is approved (payment success or admin approval)
 */
export async function addTeamToLeaderboard(teamId: string, seasonYear: number): Promise<void> {
  // Get team with user info
  const team = await db.team.findUnique({ id: teamId }, { user: true })

  if (!team || !team.user) {
    console.warn(`⚠️  Cannot add team ${teamId} to leaderboard: team or user not found`)
    return
  }

  // Check if team is already in leaderboard
  const existing = await db.leaderboard.findMany({
    teamId,
    leaderboardType: 'overall',
    seasonYear,
  })

  if (existing.length > 0) {
    console.log(`Team ${team.name} already in leaderboard, skipping`)
    return
  }

  // Get current team count to determine rank (new teams go to the end)
  const currentEntries = await db.leaderboard.findMany({
    leaderboardType: 'overall',
    seasonYear,
  })
  const newRank = currentEntries.length + 1

  // Add to leaderboard with 0 HRs
  await db.leaderboard.create({
    teamId,
    leaderboardType: 'overall',
    month: null,
    rank: newRank,
    totalHrs: 0,
    seasonYear,
    calculatedAt: new Date().toISOString(),
  })

  console.log(`✅ Added team "${team.name}" to leaderboard (rank ${newRank}, 0 HRs)`)
}

/**
 * Recalculate all leaderboards (overall + all monthly)
 * This is expensive - use sparingly (e.g., once per day or on-demand)
 */
export async function recalculateAllLeaderboards(seasonYear: number = 2025) {
  console.log(`\n🔄 Recalculating all leaderboards for ${seasonYear}...\n`)

  // Calculate overall
  await calculateOverallLeaderboard(seasonYear)

  // Calculate monthly leaderboards for each month in the season
  // Assuming MLB season is March-September (months 3-9)
  for (let month = 3; month <= 9; month++) {
    await calculateMonthlyLeaderboard(seasonYear, month)
  }

  console.log(`✅ All leaderboards recalculated!\n`)
}
