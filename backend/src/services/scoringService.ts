/**
 * Scoring Service
 * Handles team scoring calculation (best 7 of 8 players logic)
 */

import { db } from './db.js'

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

  // Step 2: Get latest stats for each player
  const playerScores: PlayerScore[] = []

  for (const teamPlayer of team.teamPlayers) {
    const player = teamPlayer.player

    // Get player's latest stats for the season
    const latestStats = await db.playerStats.getLatest(player.id, seasonYear)

    if (!latestStats) {
      // No stats yet for this player - count as 0 HRs
      playerScores.push({
        playerId: player.id,
        playerName: player.name,
        hrsTotal: 0,
        hrsRegularSeason: 0,
        hrsPostseason: 0,
        included: false,
      })
      continue
    }

    const totalHrs = includePostseason
      ? latestStats.hrsTotal
      : latestStats.hrsRegularSeason

    playerScores.push({
      playerId: player.id,
      playerName: player.name,
      hrsTotal: totalHrs,
      hrsRegularSeason: latestStats.hrsRegularSeason,
      hrsPostseason: latestStats.hrsPostseason,
      included: false,  // Will be set below
    })
  }

  // Step 3: Sort by HR count (descending) and select best 7
  playerScores.sort((a, b) => b.hrsTotal - a.hrsTotal)

  // Mark the top 7 players as included
  for (let i = 0; i < Math.min(7, playerScores.length); i++) {
    playerScores[i].included = true
  }

  // Step 4: Calculate totals for best 7
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
 * @param seasonYear - Season year
 * @param includePostseason - Whether to include postseason HRs
 * @returns Array of team scores, sorted by totalHrs (descending)
 */
export async function calculateAllTeamScores(
  seasonYear: number = 2025,
  includePostseason: boolean = true
): Promise<TeamScore[]> {
  console.log(`\n🏆 Calculating scores for all teams (season ${seasonYear})...`)

  // Get all entered/locked teams for the season
  const teams = await db.team.findMany({
    seasonYear,
    entryStatus: { in: ['entered', 'locked'] },
    deletedAt: null,
  })

  console.log(`   Found ${teams.length} entered teams`)

  const teamScores: TeamScore[] = []

  for (const team of teams) {
    try {
      const score = await calculateTeamScore(team.id, seasonYear, includePostseason)
      teamScores.push(score)
    } catch (error) {
      console.error(`⚠️  Error calculating score for team ${team.name}:`, error)
    }
  }

  // Sort by total HRs (descending)
  teamScores.sort((a, b) => b.totalHrs - a.totalHrs)

  console.log(`✅ Calculated scores for ${teamScores.length} teams\n`)

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
 * @param seasonYear - Season year
 * @param month - Month number (1-12)
 * @returns Array of team scores for that month
 */
export async function calculateMonthlyScores(
  seasonYear: number,
  month: number
): Promise<TeamScore[]> {
  console.log(`\n📅 Calculating monthly scores for ${seasonYear}-${month.toString().padStart(2, '0')}...`)

  // Get all entered/locked teams
  const teams = await db.team.findMany({
    seasonYear,
    entryStatus: { in: ['entered', 'locked'] },
    deletedAt: null,
  })

  const teamScores: TeamScore[] = []

  // Get first and last day of the month
  const startDate = new Date(seasonYear, month - 1, 1).toISOString().split('T')[0]
  const endDate = new Date(seasonYear, month, 0).toISOString().split('T')[0]

  for (const team of teams) {
    try {
      const teamData = await db.team.findUnique({ id: team.id }, { teamPlayers: true })

      if (!teamData || !teamData.teamPlayers) continue

      const playerScores: PlayerScore[] = []

      for (const teamPlayer of teamData.teamPlayers) {
        const player = teamPlayer.player

        // Get stats for this month
        const monthStats = await db.playerStats.findMany({
          playerId: player.id,
          seasonYear,
          date: { gte: startDate, lte: endDate },
        }, {
          orderBy: { date: 'desc' },
          take: 1,  // Latest stats in the month
        })

        const latestInMonth = monthStats[0]

        const hrs = latestInMonth ? latestInMonth.hrsRegularSeason : 0

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
      console.error(`⚠️  Error calculating monthly score for team ${team.name}:`, error)
    }
  }

  // Sort by total HRs
  teamScores.sort((a, b) => b.totalHrs - a.totalHrs)

  console.log(`✅ Calculated monthly scores for ${teamScores.length} teams\n`)

  return teamScores
}
