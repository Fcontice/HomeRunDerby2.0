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
 *
 * OPTIMIZED: Uses batch queries to fetch all user info and batch insert leaderboard entries
 * Previously made 2N queries (1 user lookup + 1 insert per team)
 * Now makes 2 queries total: 1 batch user lookup + 1 batch insert
 */
export async function calculateOverallLeaderboard(seasonYear: number = 2025): Promise<LeaderboardEntry[]> {
  console.log(`\n[Leaderboard] Calculating overall leaderboard for ${seasonYear}...`)
  const startTime = Date.now()

  // Calculate all team scores (already optimized with batch queries)
  const teamScores = await calculateAllTeamScores(seasonYear, true)

  // Clear existing overall leaderboard for this season
  await clearLeaderboard(seasonYear, 'overall')

  if (teamScores.length === 0) {
    console.log(`[Leaderboard] No teams to add to leaderboard`)
    return []
  }

  // Step 1: Batch fetch all team user info in ONE query
  const teamIds = teamScores.map(s => s.teamId)
  const { data: teamsData, error: teamsError } = await supabaseAdmin
    .from('Team')
    .select(`
      id,
      user:User(
        id,
        username,
        avatarUrl
      )
    `)
    .in('id', teamIds)
    .is('deletedAt', null)

  if (teamsError) {
    console.error('Error fetching team users:', teamsError)
    throw teamsError
  }

  // Build a map of teamId -> user info
  const teamUserMap = new Map<string, { id: string; username: string; avatarUrl: string | null }>()
  for (const teamData of teamsData || []) {
    const team = teamData as unknown as { id: string; user: { id: string; username: string; avatarUrl: string | null } }
    if (team.user) {
      teamUserMap.set(team.id, team.user)
    }
  }

  // Step 2: Build leaderboard entries and batch insert data
  const entries: LeaderboardEntry[] = []
  const leaderboardInserts: Array<{
    teamId: string
    leaderboardType: string
    month: null
    rank: number
    totalHrs: number
    seasonYear: number
    calculatedAt: string
  }> = []

  const now = new Date().toISOString()

  // Competition ranking: tied teams share rank, next team gets position-based rank
  // Example: 50 HRs → #1, 50 HRs → #1, 45 HRs → #3 (skips #2)
  let currentRank = 1
  let previousHrs = -1

  for (let i = 0; i < teamScores.length; i++) {
    const score = teamScores[i]

    // Update rank only when HRs differ from previous team
    if (score.totalHrs !== previousHrs) {
      currentRank = i + 1  // Position-based rank (creates gaps after ties)
      previousHrs = score.totalHrs
    }

    const rank = currentRank
    const user = teamUserMap.get(score.teamId)

    if (!user) {
      console.warn(`   Team ${score.teamId} has no user, skipping`)
      continue
    }

    leaderboardInserts.push({
      teamId: score.teamId,
      leaderboardType: 'overall',
      month: null,
      rank,
      totalHrs: score.totalHrs,
      seasonYear,
      calculatedAt: now,
    })

    entries.push({
      rank,
      teamId: score.teamId,
      teamName: score.teamName,
      totalHrs: score.totalHrs,
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    })
  }

  // Step 3: Batch insert all leaderboard entries in ONE query
  if (leaderboardInserts.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('Leaderboard')
      .insert(leaderboardInserts)

    if (insertError) {
      console.error('Error batch inserting leaderboard entries:', insertError)
      throw insertError
    }
  }

  const duration = Date.now() - startTime
  console.log(`[Leaderboard] Overall leaderboard saved (${entries.length} teams) in ${duration}ms\n`)

  // Invalidate cache after recalculation
  leaderboardCache.invalidate(`overall:${seasonYear}`)

  return entries
}

/**
 * Calculate and save monthly leaderboard (regular season only)
 *
 * OPTIMIZED: Uses batch queries to fetch all user info and batch insert leaderboard entries
 * Previously made 2N queries (1 user lookup + 1 insert per team)
 * Now makes 2 queries total: 1 batch user lookup + 1 batch insert
 */
export async function calculateMonthlyLeaderboard(
  seasonYear: number,
  month: number
): Promise<LeaderboardEntry[]> {
  console.log(`\n[Leaderboard] Calculating monthly leaderboard for ${seasonYear}-${month.toString().padStart(2, '0')}...`)
  const startTime = Date.now()

  // Calculate monthly team scores (already optimized with batch queries)
  const teamScores = await calculateMonthlyScores(seasonYear, month)

  // Clear existing monthly leaderboard for this month
  await clearLeaderboard(seasonYear, 'monthly', month)

  if (teamScores.length === 0) {
    console.log(`[Leaderboard] No teams to add to monthly leaderboard`)
    return []
  }

  // Step 1: Batch fetch all team user info in ONE query
  const teamIds = teamScores.map(s => s.teamId)
  const { data: teamsData, error: teamsError } = await supabaseAdmin
    .from('Team')
    .select(`
      id,
      user:User(
        id,
        username,
        avatarUrl
      )
    `)
    .in('id', teamIds)
    .is('deletedAt', null)

  if (teamsError) {
    console.error('Error fetching team users:', teamsError)
    throw teamsError
  }

  // Build a map of teamId -> user info
  const teamUserMap = new Map<string, { id: string; username: string; avatarUrl: string | null }>()
  for (const teamData of teamsData || []) {
    const team = teamData as unknown as { id: string; user: { id: string; username: string; avatarUrl: string | null } }
    if (team.user) {
      teamUserMap.set(team.id, team.user)
    }
  }

  // Step 2: Build leaderboard entries and batch insert data
  const entries: LeaderboardEntry[] = []
  const leaderboardInserts: Array<{
    teamId: string
    leaderboardType: string
    month: number
    rank: number
    totalHrs: number
    seasonYear: number
    calculatedAt: string
  }> = []

  const now = new Date().toISOString()

  // Competition ranking: tied teams share rank, next team gets position-based rank
  // Example: 50 HRs → #1, 50 HRs → #1, 45 HRs → #3 (skips #2)
  let currentRank = 1
  let previousHrs = -1

  for (let i = 0; i < teamScores.length; i++) {
    const score = teamScores[i]

    // Update rank only when HRs differ from previous team
    if (score.totalHrs !== previousHrs) {
      currentRank = i + 1  // Position-based rank (creates gaps after ties)
      previousHrs = score.totalHrs
    }

    const rank = currentRank
    const user = teamUserMap.get(score.teamId)

    if (!user) continue

    leaderboardInserts.push({
      teamId: score.teamId,
      leaderboardType: 'monthly',
      month,
      rank,
      totalHrs: score.totalHrs,
      seasonYear,
      calculatedAt: now,
    })

    entries.push({
      rank,
      teamId: score.teamId,
      teamName: score.teamName,
      totalHrs: score.totalHrs,
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    })
  }

  // Step 3: Batch insert all leaderboard entries in ONE query
  if (leaderboardInserts.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('Leaderboard')
      .insert(leaderboardInserts)

    if (insertError) {
      console.error('Error batch inserting monthly leaderboard entries:', insertError)
      throw insertError
    }
  }

  const duration = Date.now() - startTime
  console.log(`[Leaderboard] Monthly leaderboard saved (${entries.length} teams) in ${duration}ms\n`)

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
        createdAt,
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
        createdAt,
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
 * Remove a team from all leaderboards
 * Called when a team's payment status changes to rejected or refunded
 */
export async function removeTeamFromLeaderboard(teamId: string, seasonYear: number): Promise<void> {
  // Get team info for logging
  const team = await db.team.findUnique({ id: teamId })
  const teamName = team?.name || teamId

  // Check if team exists in leaderboard
  const existing = await db.leaderboard.findMany({
    teamId,
    seasonYear,
  })

  if (existing.length === 0) {
    console.log(`Team "${teamName}" not in leaderboard, nothing to remove`)
    return
  }

  // Remove from overall leaderboard
  try {
    await db.leaderboard.delete({
      teamId,
      leaderboardType: 'overall',
      month: null,
    })
    console.log(`Removed team "${teamName}" from overall leaderboard`)
  } catch (error) {
    // May not exist, which is fine
    console.log(`Team "${teamName}" not in overall leaderboard (may already be removed)`)
  }

  // Remove from all monthly leaderboards (months 3-9)
  for (let month = 3; month <= 9; month++) {
    try {
      await db.leaderboard.delete({
        teamId,
        leaderboardType: 'monthly',
        month,
      })
      console.log(`Removed team "${teamName}" from monthly leaderboard (month ${month})`)
    } catch (error) {
      // May not exist for this month, which is fine
    }
  }

  // Invalidate caches
  leaderboardCache.invalidate(`overall:${seasonYear}`)
  for (let month = 3; month <= 9; month++) {
    leaderboardCache.invalidate(`monthly:${seasonYear}:${month}`)
  }

  console.log(`✅ Removed team "${teamName}" from all leaderboards`)
}

/**
 * Add a team to the leaderboard with 0 HRs
 * Called when a team is approved (payment success or admin approval)
 *
 * Uses upsert to prevent duplicate entries from concurrent operations.
 * The database unique constraint (teamId, leaderboardType, month) ensures
 * that even if two concurrent requests try to add the same team, only one
 * entry will be created.
 */
export async function addTeamToLeaderboard(teamId: string, seasonYear: number): Promise<void> {
  // Get team with user info
  const team = await db.team.findUnique({ id: teamId }, { user: true })

  if (!team || !team.user) {
    console.warn(`⚠️  Cannot add team ${teamId} to leaderboard: team or user not found`)
    return
  }

  // Get current team count to determine rank (new teams go to the end)
  // Note: In case of concurrent operations, the rank may be slightly off,
  // but it will be corrected during the next leaderboard recalculation
  const currentEntries = await db.leaderboard.findMany({
    leaderboardType: 'overall',
    seasonYear,
  })
  const newRank = currentEntries.length + 1

  // Use upsert to atomically add or update the leaderboard entry
  // This prevents duplicate entries from concurrent admin operations
  const { data: entry, created } = await db.leaderboard.upsert(
    {
      teamId,
      leaderboardType: 'overall',
      seasonYear,
      month: null,
    },
    {
      // Create data - used when inserting new entry
      rank: newRank,
      totalHrs: 0,
    },
    {
      // Update data - used when entry already exists (no-op, keep existing values)
      // We don't update anything since the team is already in the leaderboard
    }
  )

  if (created) {
    console.log(`✅ Added team "${team.name}" to leaderboard (rank ${entry.rank}, 0 HRs)`)
  } else {
    console.log(`Team "${team.name}" already in leaderboard (rank ${entry.rank}), skipping`)
  }
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
