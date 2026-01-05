/**
 * Leaderboard Routes
 * API endpoints for leaderboard data and team rankings
 */

import { Router } from 'express'
import {
  getOverall,
  getMonthly,
  recalculate,
  getTeamRanking,
  getLeagueStats,
} from '../controllers/leaderboardController.js'
import { requireAdmin, optionalAuth } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/leaderboards/overall
 * Public endpoint - get overall season leaderboard
 * Query params: ?seasonYear=2025
 */
router.get('/overall', getOverall)

/**
 * GET /api/leaderboards/monthly/:month
 * Public endpoint - get monthly leaderboard
 * Params: month (1-12)
 * Query params: ?seasonYear=2025
 */
router.get('/monthly/:month', getMonthly)

/**
 * GET /api/leaderboards/team/:teamId
 * Public endpoint - get specific team's ranking and score
 * Query params: ?seasonYear=2025
 */
router.get('/team/:teamId', getTeamRanking)

/**
 * GET /api/leaderboards/stats
 * Public endpoint - get league-wide statistics
 * Query params: ?seasonYear=2025
 */
router.get('/stats', getLeagueStats)

/**
 * POST /api/leaderboards/recalculate
 * Admin only - manually trigger leaderboard recalculation
 * Body: { seasonYear?: number, type?: 'overall' | 'monthly' | 'all', month?: number }
 */
router.post('/recalculate', requireAdmin, recalculate)

export default router
