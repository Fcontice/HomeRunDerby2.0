/**
 * Scoring Service
 * Handles team scoring calculation (best 7 of 8 players logic)
 *
 * OPTIMIZED: Uses batch queries to avoid N+1 query problems
 */

import { db } from './db.js'
import { supabaseAdmin } from '../config/supabase.js'

export interface PlayerScore {
  playerId: string
  playerName: string
  hrsTotal: number
  hrsRegularSeason: number
  hrsPostseason: number
  included: boolean  // Whether this player is in the best 7
}

export interface TeamScore {
  teamId: string
  teamName: string
  totalHrs: number  // Sum of best 7 players
  regularSeasonHrs: number
  postseasonHrs: number
  playerScores: PlayerScore[]
  calculatedAt: string
}

// Type for team with players from Supabase query
interface TeamWithPlayers {
  id: string
  name: string
  userId: string
  createdAt: string
  user?: {
    id: string
    username: string
    email: string
    avatarUrl: string | null
  }
  teamPlayers: Array<{
    id: string
    position: number
    player: {
      id: string
      name: string
      mlbId: string
    }
  }>
}

/**
 * Batch fetch latest stats for multiple players
 * Returns a Map of playerId -> stats
 */
async function batchFetchLatestStats(
  playerIds: string[],
  seasonYear: number
): Promise<Map<string, { hrsTotal: number; hrsRegularSeason: number; hrsPostseason: number }>> {
  if (playerIds.length === 0) {
    return new Map()
  }

  const { data: allStats, error } = await supabaseAdmin
    .from('PlayerStats')
    .select('playerId, hrsTotal, hrsRegularSeason, hrsPostseason, date')
    .eq('seasonYear', seasonYear)
    .in('playerId', playerIds)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error batch fetching player stats:', error)
    throw error
  }

  // Keep only the latest stat for each player
  const statsMap = new Map<string, { hrsTotal: number; hrsRegularSeason: number; hrsPostseason: number }>()
  if (allStats) {
    for (const stat of allStats) {
      if (!statsMap.has(stat.playerId)) {
        statsMap.set(stat.playerId, {
          hrsTotal: stat.hrsTotal || 0,
          hrsRegularSeason: stat.hrsRegularSeason || 0,
          hrsPostseason: stat.hrsPostseason || 0,
        })
      }
    }
  }

  return statsMap
}

/**
 * Batch fetch monthly stats for multiple players
 * Returns a Map of playerId -> HRs hit during that specific month
 *
 * Uses hrsDaily field to sum daily HR counts within the date range.
 * This is simpler and more efficient than the old 2-query cumulative approach.
 */
async function batchFetchMonthlyStats(
  playerIds: string[],
  seasonYear: number,
  startDate: string,
  endDate: string
): Promise<Map<string, { hrsRegularSeason: number }>> {
  if (playerIds.length === 0) {
    return new Map()
  }

  // Fetch all daily stats within the date range
  const { data: dailyStats, error } = await supabaseAdmin
    .from('PlayerStats')
    .select('playerId, hrsDaily')
    .eq('seasonYear', seasonYear)
    .in('playerId', playerIds)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) {
    console.error('Error batch fetching monthly stats:', error)
    throw error
  }

  // Aggregate hrsDaily per player
  const totals = new Map<string, number>()
  if (dailyStats) {
    for (const stat of dailyStats) {
      const current = totals.get(stat.playerId) || 0
      totals.set(stat.playerId, current + (stat.hrsDaily || 0))
    }
  }

  // Build result map (ensure all requested players have an entry)
  const statsMap = new Map<string, { hrsRegularSeason: number }>()
  for (const playerId of playerIds) {
    statsMap.set(playerId, {
      hrsRegularSeason: totals.get(playerId) || 0,
    })
  }

  return statsMap
}

/**
 * Calculate team score using "best 7 of 8" rule
 * @param teamId - Team ID to calculate score for
 * @param seasonYear - Season year (e.g., 2025)
 * @param includePostseason - Whether to include postseason HRs (default: true for overall leaderboard)
 * @returns Team score with player breakdown
 */
export async function calculateTeamScore(
  teamId: string,
  seasonYear: number = 2025,
  includePostseason: boolean = true
): Promise<TeamScore> {
  // Step 1: Get team with players
  const team = await db.team.findUnique({ id: teamId }, { teamPlayers: true })

  if (!team) {
    throw new Error(`Team ${teamId} not found`)
  }

  if (!team.teamPlayers || team.teamPlayers.length === 0) {
    throw new Error(`Team ${teamId} has no players`)
  }

  // Step 2: Batch fetch all player stats in one query
  const playerIds = team.teamPlayers.map(tp => tp.player.id)
  const statsMap = await batchFetchLatestStats(playerIds, seasonYear)

  // Step 3: Build player scores from the batch-fetched stats
  const playerScores: PlayerScore[] = []

  for (const teamPlayer of team.teamPlayers) {
    const player = teamPlayer.player
    const stats = statsMap.get(player.id)

    const totalHrs = stats
      ? (includePostseason ? stats.hrsTotal : stats.hrsRegularSeason)
      : 0

    playerScores.push({
      playerId: player.id,
      playerName: player.name,
      hrsTotal: totalHrs,
      hrsRegularSeason: stats?.hrsRegularSeason || 0,
      hrsPostseason: stats?.hrsPostseason || 0,
      included: false,  // Will be set below
    })
  }

  // Step 4: Sort by HR count (descending) and select best 7
  playerScores.sort((a, b) => b.hrsTotal - a.hrsTotal)

  // Mark the top 7 players as included
  for (let i = 0; i < Math.min(7, playerScores.length); i++) {
    playerScores[i].included = true
  }

  // Step 5: Calculate totals for best 7
  const best7 = playerScores.filter(p => p.included)

  const totalHrs = best7.reduce((sum, p) => sum + p.hrsTotal, 0)
  const regularSeasonHrs = best7.reduce((sum, p) => sum + p.hrsRegularSeason, 0)
  const postseasonHrs = best7.reduce((sum, p) => sum + p.hrsPostseason, 0)

  return {
    teamId: team.id,
    teamName: team.name,
    totalHrs,
    regularSeasonHrs,
    postseasonHrs,
    playerScores,
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * Calculate scores for all teams in a season
 * OPTIMIZED: Uses batch queries to fetch all teams with players and all stats in minimal queries
 * Previously made N+1 queries (1 per team + 8 per team for players = 9N queries for N teams)
 * Now makes only 2 queries total: 1 for all teams with players, 1 for all player stats
 *
 * @param seasonYear - Season year
 * @param includePostseason - Whether to include postseason HRs
 * @returns Array of team scores, sorted by totalHrs (descending)
 */
export async function calculateAllTeamScores(
  seasonYear: number = 2025,
  includePostseason: boolean = true
): Promise<TeamScore[]> {
  console.log(`\n[Scoring] Calculating scores for all teams (season ${seasonYear})...`)
  const startTime = Date.now()

  // Step 1: Get ALL entered/locked teams with their players in ONE query
  const { data: teamsData, error: teamsError } = await supabaseAdmin
    .from('Team')
    .select(`
      id,
      name,
      userId,
      createdAt,
      teamPlayers:TeamPlayer(
        id,
        position,
        player:Player(
          id,
          name,
          mlbId
        )
      )
    `)
    .eq('seasonYear', seasonYear)
    .in('entryStatus', ['entered', 'locked'])
    .is('deletedAt', null)

  if (teamsError) {
    console.error('Error fetching teams:', teamsError)
    throw teamsError
  }

  const teams = (teamsData || []) as unknown as TeamWithPlayers[]
  console.log(`   Found ${teams.length} entered teams`)

  if (teams.length === 0) {
    return []
  }

  // Step 2: Collect ALL player IDs across ALL teams
  const allPlayerIds = new Set<string>()
  for (const team of teams) {
    if (team.teamPlayers) {
      for (const tp of team.teamPlayers) {
        if (tp.player?.id) {
          allPlayerIds.add(tp.player.id)
        }
      }
    }
  }

  console.log(`   Fetching stats for ${allPlayerIds.size} unique players...`)

  // Step 3: Batch fetch ALL player stats in ONE query
  const statsMap = await batchFetchLatestStats(Array.from(allPlayerIds), seasonYear)

  // Step 4: Calculate scores for all teams using in-memory data (no more DB queries)
  const teamScores: TeamScore[] = []

  for (const team of teams) {
    try {
      if (!team.teamPlayers || team.teamPlayers.length === 0) {
        console.warn(`   Team ${team.name} has no players, skipping`)
        continue
      }

      const playerScores: PlayerScore[] = []

      for (const teamPlayer of team.teamPlayers) {
        const player = teamPlayer.player
        if (!player) continue

        const stats = statsMap.get(player.id)
        const totalHrs = stats
          ? (includePostseason ? stats.hrsTotal : stats.hrsRegularSeason)
          : 0

        playerScores.push({
          playerId: player.id,
          playerName: player.name,
          hrsTotal: totalHrs,
          hrsRegularSeason: stats?.hrsRegularSeason || 0,
          hrsPostseason: stats?.hrsPostseason || 0,
          included: false,
        })
      }

      // Sort by HR count (descending) and select best 7
      playerScores.sort((a, b) => b.hrsTotal - a.hrsTotal)
      for (let i = 0; i < Math.min(7, playerScores.length); i++) {
        playerScores[i].included = true
      }

      const best7 = playerScores.filter(p => p.included)
      const totalHrs = best7.reduce((sum, p) => sum + p.hrsTotal, 0)
      const regularSeasonHrs = best7.reduce((sum, p) => sum + p.hrsRegularSeason, 0)
      const postseasonHrs = best7.reduce((sum, p) => sum + p.hrsPostseason, 0)

      teamScores.push({
        teamId: team.id,
        teamName: team.name,
        totalHrs,
        regularSeasonHrs,
        postseasonHrs,
        playerScores,
        calculatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`   Error calculating score for team ${team.name}:`, error)
    }
  }

  // Sort by total HRs (descending)
  teamScores.sort((a, b) => b.totalHrs - a.totalHrs)

  const duration = Date.now() - startTime
  console.log(`[Scoring] Calculated scores for ${teamScores.length} teams in ${duration}ms (2 queries total)\n`)

  return teamScores
}

/**
 * Get team rank in overall leaderboard
 * @param teamId - Team ID
 * @param seasonYear - Season year
 * @returns Rank (1-based) or null if not ranked
 */
export async function getTeamRank(teamId: string, seasonYear: number = 2025): Promise<number | null> {
  const allScores = await calculateAllTeamScores(seasonYear, true)
  const index = allScores.findIndex(score => score.teamId === teamId)

  return index >= 0 ? index + 1 : null
}

/**
 * Calculate monthly leaderboard scores (regular season only)
 * OPTIMIZED: Uses batch queries to fetch all teams with players and all stats in minimal queries
 * Previously made N+1 queries (2 per team + 8 per team for players)
 * Now makes only 2 queries total: 1 for all teams with players, 1 for all player stats
 *
 * @param seasonYear - Season year
 * @param month - Month number (1-12)
 * @returns Array of team scores for that month
 */
export async function calculateMonthlyScores(
  seasonYear: number,
  month: number
): Promise<TeamScore[]> {
  console.log(`\n[Scoring] Calculating monthly scores for ${seasonYear}-${month.toString().padStart(2, '0')}...`)
  const startTime = Date.now()

  // Get first and last day of the month
  const startDate = new Date(seasonYear, month - 1, 1).toISOString().split('T')[0]
  const endDate = new Date(seasonYear, month, 0).toISOString().split('T')[0]

  // Step 1: Get ALL entered/locked teams with their players in ONE query
  const { data: teamsData, error: teamsError } = await supabaseAdmin
    .from('Team')
    .select(`
      id,
      name,
      userId,
      createdAt,
      teamPlayers:TeamPlayer(
        id,
        position,
        player:Player(
          id,
          name,
          mlbId
        )
      )
    `)
    .eq('seasonYear', seasonYear)
    .in('entryStatus', ['entered', 'locked'])
    .is('deletedAt', null)

  if (teamsError) {
    console.error('Error fetching teams:', teamsError)
    throw teamsError
  }

  const teams = (teamsData || []) as unknown as TeamWithPlayers[]
  console.log(`   Found ${teams.length} entered teams`)

  if (teams.length === 0) {
    return []
  }

  // Step 2: Collect ALL player IDs across ALL teams
  const allPlayerIds = new Set<string>()
  for (const team of teams) {
    if (team.teamPlayers) {
      for (const tp of team.teamPlayers) {
        if (tp.player?.id) {
          allPlayerIds.add(tp.player.id)
        }
      }
    }
  }

  console.log(`   Fetching monthly stats for ${allPlayerIds.size} unique players...`)

  // Step 3: Batch fetch ALL player monthly stats in ONE query
  const statsMap = await batchFetchMonthlyStats(Array.from(allPlayerIds), seasonYear, startDate, endDate)

  // Step 4: Calculate scores for all teams using in-memory data (no more DB queries)
  const teamScores: TeamScore[] = []

  for (const team of teams) {
    try {
      if (!team.teamPlayers || team.teamPlayers.length === 0) {
        console.warn(`   Team ${team.name} has no players, skipping`)
        continue
      }

      const playerScores: PlayerScore[] = []

      for (const teamPlayer of team.teamPlayers) {
        const player = teamPlayer.player
        if (!player) continue

        const stats = statsMap.get(player.id)
        const hrs = stats?.hrsRegularSeason || 0

        playerScores.push({
          playerId: player.id,
          playerName: player.name,
          hrsTotal: hrs,
          hrsRegularSeason: hrs,
          hrsPostseason: 0,  // Monthly = regular season only
          included: false,
        })
      }

      // Sort and select best 7
      playerScores.sort((a, b) => b.hrsTotal - a.hrsTotal)
      for (let i = 0; i < Math.min(7, playerScores.length); i++) {
        playerScores[i].included = true
      }

      const best7 = playerScores.filter(p => p.included)
      const totalHrs = best7.reduce((sum, p) => sum + p.hrsTotal, 0)

      teamScores.push({
        teamId: team.id,
        teamName: team.name,
        totalHrs,
        regularSeasonHrs: totalHrs,
        postseasonHrs: 0,
        playerScores,
        calculatedAt: new Date().toISOString(),
      })

    } catch (error) {
      console.error(`   Error calculating monthly score for team ${team.name}:`, error)
    }
  }

  // Sort by total HRs (descending)
  teamScores.sort((a, b) => b.totalHrs - a.totalHrs)

  const duration = Date.now() - startTime
  console.log(`[Scoring] Calculated monthly scores for ${teamScores.length} teams in ${duration}ms (2 queries total)\n`)

  return teamScores
}
