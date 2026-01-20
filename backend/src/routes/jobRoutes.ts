/**
 * Job Routes
 * Admin endpoints for managing scheduled jobs
 */

import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import {
  getSchedulerStatus,
  triggerJob,
  runStatsUpdateJob,
} from '../services/scheduledJobs.js'
import {
  getRecentJobExecutions,
  getLatestJobExecutions,
  getJobStats,
  type JobName,
} from '../services/alertService.js'

const router = Router()

// All job routes require admin authentication
router.use(authenticate)
router.use(requireAdmin)

/**
 * GET /api/admin/jobs/status
 * Get scheduler status and job configuration
 */
router.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const status = getSchedulerStatus()
    const latestExecutions = await getLatestJobExecutions()

    res.json({
      success: true,
      data: {
        scheduler: status,
        latestExecutions,
      },
    })
  })
)

/**
 * GET /api/admin/jobs/history
 * Get recent job execution history
 */
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20
    const jobName = req.query.jobName as JobName | undefined

    const executions = await getRecentJobExecutions(limit, jobName)

    res.json({
      success: true,
      data: executions,
    })
  })
)

/**
 * GET /api/admin/jobs/stats
 * Get job execution statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 30

    const [updateStats, leaderboardStats] = await Promise.all([
      getJobStats('update_stats', days),
      getJobStats('calculate_leaderboard', days),
    ])

    res.json({
      success: true,
      data: {
        update_stats: updateStats,
        calculate_leaderboard: leaderboardStats,
        periodDays: days,
      },
    })
  })
)

/**
 * POST /api/admin/jobs/trigger
 * Manually trigger a job
 */
router.post(
  '/trigger',
  asyncHandler(async (req, res) => {
    const { jobName, seasonYear, date } = req.body

    if (!jobName) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_JOB_NAME', message: 'jobName is required' },
      })
    }

    const validJobs: JobName[] = ['update_stats', 'calculate_leaderboard']
    if (!validJobs.includes(jobName)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_JOB_NAME',
          message: `Invalid jobName. Valid options: ${validJobs.join(', ')}`,
        },
      })
    }

    console.log(`🔧 Admin ${req.user?.email} triggered job: ${jobName}`)

    const result = await triggerJob(jobName, { seasonYear, date })

    if (result.success) {
      return res.json({
        success: true,
        message: `Job ${jobName} completed successfully`,
        data: result,
      })
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: 'JOB_FAILED',
          message: result.error || 'Job execution failed',
        },
      })
    }
  })
)

/**
 * POST /api/admin/jobs/update-stats
 * Shortcut to trigger stats update with options
 */
router.post(
  '/update-stats',
  asyncHandler(async (req, res) => {
    const { seasonYear, date } = req.body

    console.log(`🔧 Admin ${req.user?.email} triggered stats update`)
    console.log(`   Season: ${seasonYear || 'default'}`)
    console.log(`   Date: ${date || 'yesterday'}`)

    const result = await runStatsUpdateJob(seasonYear, date)

    if (result.success) {
      res.json({
        success: true,
        message: 'Stats update completed successfully',
        data: {
          stats: result.statsResult,
          leaderboardUpdated: result.leaderboardUpdated,
        },
      })
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_UPDATE_FAILED',
          message: result.error || 'Stats update failed',
        },
      })
    }
  })
)

export default router
