/**
 * Leaderboard Controller
 * Handles leaderboard-related HTTP requests
 */

import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import {
  getOverallLeaderboard,
  getMonthlyLeaderboard,
  calculateOverallLeaderboard,
  calculateMonthlyLeaderboard,
  recalculateAllLeaderboards,
} from '../services/leaderboardService.js'
import { calculateTeamScore } from '../services/scoringService.js'
import { ValidationError } from '../utils/errors.js'

/**
 * GET /api/leaderboards/overall
 * Get overall season leaderboard (includes postseason)
 */
export const getOverall = asyncHandler(async (req: Request, res: Response) => {
  const seasonYear = req.query.seasonYear ? parseInt(req.query.seasonYear as string) : 2025

  const leaderboard = await getOverallLeaderboard(seasonYear)

  res.json({
    success: true,
    data: {
      leaderboard,
      seasonYear,
      leaderboardType: 'overall',
      totalTeams: leaderboard.length,
    },
  })
})

/**
 * GET /api/leaderboards/monthly/:month
 * Get monthly leaderboard (regular season only)
 */
export const getMonthly = asyncHandler(async (req: Request, res: Response) => {
  const month = parseInt(req.params.month)
  const seasonYear = req.query.seasonYear ? parseInt(req.query.seasonYear as string) : 2025

  if (month < 1 || month > 12) {
    throw new ValidationError('Month must be between 1 and 12')
  }

  const leaderboard = await getMonthlyLeaderboard(seasonYear, month)

  res.json({
    success: true,
    data: {
      leaderboard,
      seasonYear,
      month,
      leaderboardType: 'monthly',
      totalTeams: leaderboard.length,
    },
  })
})

/**
 * POST /api/leaderboards/recalculate
 * Manually trigger leaderboard recalculation (admin only)
 */
export const recalculate = asyncHandler(async (req: Request, res: Response) => {
  const seasonYear = req.body.seasonYear || 2025
  const type = req.body.type || 'all'  // 'overall', 'monthly', or 'all'

  if (type === 'overall') {
    await calculateOverallLeaderboard(seasonYear)
    res.json({
      success: true,
      message: `Overall leaderboard recalculated for ${seasonYear}`,
    })
  } else if (type === 'monthly') {
    const month = req.body.month

    if (!month || month < 1 || month > 12) {
      throw new ValidationError('Month required and must be between 1 and 12')
    }

    await calculateMonthlyLeaderboard(seasonYear, month)
    res.json({
      success: true,
      message: `Monthly leaderboard recalculated for ${seasonYear}-${month.toString().padStart(2, '0')}`,
    })
  } else {
    // Recalculate all
    await recalculateAllLeaderboards(seasonYear)
    res.json({
      success: true,
      message: `All leaderboards recalculated for ${seasonYear}`,
    })
  }
})

/**
 * GET /api/leaderboards/team/:teamId
 * Get specific team's ranking and score details
 */
export const getTeamRanking = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.params
  const seasonYear = req.query.seasonYear ? parseInt(req.query.seasonYear as string) : 2025

  // Calculate real-time score for this team
  const teamScore = await calculateTeamScore(teamId, seasonYear, true)

  // Get full overall leaderboard to find rank
  const leaderboard = await getOverallLeaderboard(seasonYear)
  const rank = leaderboard.findIndex(entry => entry.teamId === teamId) + 1

  res.json({
    success: true,
    data: {
      ...teamScore,
      rank: rank > 0 ? rank : null,
      totalTeams: leaderboard.length,
    },
  })
})

/**
 * GET /api/leaderboards/stats
 * Get league-wide statistics
 */
export const getLeagueStats = asyncHandler(async (req: Request, res: Response) => {
  const seasonYear = req.query.seasonYear ? parseInt(req.query.seasonYear as string) : 2025

  const leaderboard = await getOverallLeaderboard(seasonYear)

  if (leaderboard.length === 0) {
    res.json({
      success: true,
      data: {
        totalTeams: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
      },
    })
    return
  }

  const scores = leaderboard.map(entry => entry.totalHrs)
  const totalScore = scores.reduce((sum, score) => sum + score, 0)

  res.json({
    success: true,
    data: {
      totalTeams: leaderboard.length,
      averageScore: Math.round(totalScore / leaderboard.length),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      topTeam: leaderboard[0],
    },
  })
})
