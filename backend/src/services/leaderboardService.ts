/**
 * Leaderboard Service
 * Calculates and caches leaderboard rankings in the database
 */

import { db } from './db.js'
import { calculateAllTeamScores, calculateMonthlyScores, PlayerScore } from './scoringService.js'

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

  return entries
}

/**
 * Get overall leaderboard from database (cached)
 */
export async function getOverallLeaderboard(seasonYear: number = 2025): Promise<LeaderboardEntry[]> {
  const leaderboardRecords = await db.leaderboard.findMany({
    leaderboardType: 'overall',
    seasonYear,
  }, {
    orderBy: { rank: 'asc' },
  })

  const entries: LeaderboardEntry[] = []

  for (const record of leaderboardRecords) {
    const team = await db.team.findUnique({ id: record.teamId }, { user: true, teamPlayers: true })

    if (!team || !team.user) continue

    // Get player scores for this team
    const playerScores: PlayerScore[] = []
    if (team.teamPlayers) {
      for (const tp of team.teamPlayers) {
        const player = tp.player
        const latestStats = await db.playerStats.getLatest(player.id, seasonYear)

        playerScores.push({
          playerId: player.id,
          playerName: player.name,
          hrsTotal: latestStats?.hrsTotal || 0,
          hrsRegularSeason: latestStats?.hrsRegularSeason || 0,
          hrsPostseason: latestStats?.hrsPostseason || 0,
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

  return entries
}

/**
 * Get monthly leaderboard from database (cached)
 */
export async function getMonthlyLeaderboard(
  seasonYear: number,
  month: number
): Promise<LeaderboardEntry[]> {
  const leaderboardRecords = await db.leaderboard.findMany({
    leaderboardType: 'monthly',
    month,
    seasonYear,
  }, {
    orderBy: { rank: 'asc' },
  })

  const entries: LeaderboardEntry[] = []

  for (const record of leaderboardRecords) {
    const team = await db.team.findUnique({ id: record.teamId }, { user: true })

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
