/**
 * Scheduled Jobs Service
 * Handles automated task scheduling using node-cron
 *
 * Jobs:
 * - Daily stats update at 3am ET (updates yesterday's game data)
 * - Leaderboard recalculation after stats update
 */

import cron from 'node-cron'
import { updatePlayerStats } from './statsService.js'
import { generateDailyNewsDigest } from './newsService.js'
import { calculateOverallLeaderboard, calculateMonthlyLeaderboard } from './leaderboardService.js'
import {
  logJobStart,
  logJobComplete,
  alertAdminJobFailure,
  type JobName,
} from './alertService.js'
import { invalidateStatsCache } from '../middleware/cache.js'
import { playerCache } from './playerCache.js'

// Track scheduled tasks for cleanup
const scheduledTasks: cron.ScheduledTask[] = []

// Job execution locks to prevent concurrent runs
const jobLocks = new Map<string, boolean>()

function acquireJobLock(jobName: string): boolean {
  if (jobLocks.get(jobName)) {
    return false // Already running
  }
  jobLocks.set(jobName, true)
  return true
}

function releaseJobLock(jobName: string): void {
  jobLocks.delete(jobName)
}

// Current season year (can be overridden via env)
const CURRENT_SEASON_YEAR = parseInt(process.env.SEASON_YEAR || '2026', 10)

// Whether scheduling is enabled (can disable in dev)
const SCHEDULING_ENABLED = process.env.DISABLE_SCHEDULED_JOBS !== 'true'

/**
 * Run the daily stats update job
 * Updates yesterday's stats and recalculates leaderboard
 */
export async function runStatsUpdateJob(
  seasonYear: number = CURRENT_SEASON_YEAR,
  dateStr?: string
): Promise<{
  success: boolean
  statsResult?: { updated: number; created: number; errors: number }
  leaderboardUpdated: boolean
  error?: string
}> {
  const lockName = 'update_stats'

  if (!acquireJobLock(lockName)) {
    console.log('⚠️ Stats update job already running, skipping')
    return {
      success: false,
      error: 'Job already running',
      statsResult: { updated: 0, created: 0, errors: 0 },
      leaderboardUpdated: false,
    }
  }

  const jobId = await logJobStart('update_stats', { seasonYear, date: dateStr || 'yesterday' })

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📅 SCHEDULED JOB: Daily Stats Update`)
  console.log(`   Season: ${seasonYear}`)
  console.log(`   Date: ${dateStr || 'yesterday (default)'}`)
  console.log(`   Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`)
  console.log(`${'='.repeat(60)}\n`)

  let statsResult: { updated: number; created: number; errors: number } | undefined
  let leaderboardUpdated = false

  try {
    // Step 1: Update player stats
    console.log('📊 Step 1: Updating player stats...')
    statsResult = await updatePlayerStats(seasonYear, dateStr)

    console.log(`   ✅ Stats updated: ${statsResult.updated} updated, ${statsResult.created} created`)

    // Step 2: Recalculate leaderboards if stats changed
    if (statsResult.updated > 0 || statsResult.created > 0) {
      console.log('\n📈 Step 2a: Recalculating overall leaderboard...')
      await calculateOverallLeaderboard(seasonYear)
      console.log('   ✅ Overall leaderboard recalculated')

      // Step 2b: Recalculate the current month's leaderboard
      // Determine which month to update (from dateStr or current date)
      const statsDate = dateStr ? new Date(dateStr) : new Date()
      const currentMonth = statsDate.getMonth() + 1 // 1-12

      // Only calculate monthly leaderboard for MLB season months (March-September = 3-9)
      if (currentMonth >= 3 && currentMonth <= 9) {
        console.log(`\n📈 Step 2b: Recalculating monthly leaderboard for month ${currentMonth}...`)
        await calculateMonthlyLeaderboard(seasonYear, currentMonth)
        console.log(`   ✅ Monthly leaderboard (month ${currentMonth}) recalculated`)
      }

      leaderboardUpdated = true

      // Step 3: Invalidate HTTP cache so users see fresh data immediately
      console.log('\n🔄 Step 3: Invalidating HTTP cache...')
      invalidateStatsCache()
      playerCache.invalidate()
      console.log('   ✅ Cache invalidated - users will see fresh data')
    } else {
      console.log('\n📈 Step 2: Skipping leaderboard (no stats changes)')
    }

    // Log success
    await logJobComplete(jobId, 'success', {
      context: {
        statsUpdated: statsResult.updated,
        statsCreated: statsResult.created,
        statsErrors: statsResult.errors,
        leaderboardUpdated,
      },
    })

    console.log(`\n${'='.repeat(60)}`)
    console.log(`✅ SCHEDULED JOB COMPLETED SUCCESSFULLY`)
    console.log(`${'='.repeat(60)}\n`)

    return {
      success: true,
      statsResult,
      leaderboardUpdated,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error(`\n❌ SCHEDULED JOB FAILED: ${errorMessage}`)
    if (errorStack) {
      console.error(errorStack)
    }

    // Log failure
    await logJobComplete(jobId, 'failed', {
      errorMessage,
      errorStack,
      context: {
        statsResult,
        leaderboardUpdated,
      },
    })

    // Alert admin
    await alertAdminJobFailure(
      {
        jobName: 'update_stats',
        error: errorMessage,
        errorStack,
        timestamp: new Date().toISOString(),
        context: { seasonYear, date: dateStr },
      },
      jobId
    )

    return {
      success: false,
      statsResult,
      leaderboardUpdated,
      error: errorMessage,
    }
  } finally {
    releaseJobLock(lockName)
  }
}

/**
 * Run leaderboard recalculation job
 */
export async function runLeaderboardJob(
  seasonYear: number = CURRENT_SEASON_YEAR
): Promise<{
  success: boolean
  error?: string
}> {
  const lockName = 'calculate_leaderboard'

  if (!acquireJobLock(lockName)) {
    console.log('⚠️ Leaderboard job already running, skipping')
    return {
      success: false,
      error: 'Job already running',
    }
  }

  const jobId = await logJobStart('calculate_leaderboard', { seasonYear })

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📈 SCHEDULED JOB: Leaderboard Recalculation`)
  console.log(`   Season: ${seasonYear}`)
  console.log(`   Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`)
  console.log(`${'='.repeat(60)}\n`)

  try {
    await calculateOverallLeaderboard(seasonYear)

    // Invalidate HTTP cache so users see fresh leaderboard immediately
    invalidateStatsCache()
    console.log('   🔄 Cache invalidated - users will see fresh leaderboard')

    await logJobComplete(jobId, 'success', {
      context: { seasonYear },
    })

    console.log(`✅ Leaderboard recalculation completed`)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error(`❌ Leaderboard recalculation failed: ${errorMessage}`)

    await logJobComplete(jobId, 'failed', {
      errorMessage,
      errorStack,
    })

    await alertAdminJobFailure(
      {
        jobName: 'calculate_leaderboard',
        error: errorMessage,
        errorStack,
        timestamp: new Date().toISOString(),
        context: { seasonYear },
      },
      jobId
    )

    return {
      success: false,
      error: errorMessage,
    }
  } finally {
    releaseJobLock(lockName)
  }
}

/**
 * Run the daily news digest job
 * Fetches HR logs, transactions, and RSS feeds for yesterday's date
 */
export async function runNewsDigestJob(
  dateStr?: string
): Promise<{
  success: boolean
  error?: string
}> {
  const lockName = 'news_digest'

  if (!acquireJobLock(lockName)) {
    console.log('⚠️ News digest job already running, skipping')
    return { success: false, error: 'Job already running' }
  }

  const jobId = await logJobStart('news_digest', { date: dateStr || 'yesterday' })

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📰 SCHEDULED JOB: Daily News Digest`)
  console.log(`   Date: ${dateStr || 'yesterday (default)'}`)
  console.log(`   Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`)
  console.log(`${'='.repeat(60)}\n`)

  try {
    const result = await generateDailyNewsDigest(dateStr)

    await logJobComplete(jobId, 'success', {
      context: {
        hrCount: result.hrCount,
        injuryCount: result.injuryCount,
        tradeCount: result.tradeCount,
        totalItems: result.totalItems,
      },
    })

    console.log(`\n${'='.repeat(60)}`)
    console.log(`✅ NEWS DIGEST COMPLETED: ${result.totalItems} items`)
    console.log(`${'='.repeat(60)}\n`)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error(`\n❌ NEWS DIGEST FAILED: ${errorMessage}`)

    await logJobComplete(jobId, 'failed', {
      errorMessage,
      errorStack,
    })

    await alertAdminJobFailure(
      {
        jobName: 'news_digest',
        error: errorMessage,
        errorStack,
        timestamp: new Date().toISOString(),
        context: { date: dateStr },
      },
      jobId
    )

    return { success: false, error: errorMessage }
  } finally {
    releaseJobLock(lockName)
  }
}

/**
 * Initialize all scheduled jobs
 * Called once at server startup
 */
export function initializeScheduledJobs(): void {
  if (!SCHEDULING_ENABLED) {
    console.log('⚠️  Scheduled jobs are DISABLED (DISABLE_SCHEDULED_JOBS=true)')
    return
  }

  console.log('\n📅 Initializing scheduled jobs...')

  // Daily stats update at 3:00 AM ET
  // Note: node-cron runs in server timezone. We use America/New_York for ET.
  const statsJob = cron.schedule(
    '0 3 * * *', // 3:00 AM every day
    async () => {
      console.log('\n🔔 Triggered: Daily stats update job')
      await runStatsUpdateJob(CURRENT_SEASON_YEAR)
    },
    {
      timezone: 'America/New_York',
      scheduled: true,
    }
  )

  scheduledTasks.push(statsJob)
  console.log('   ✅ Daily stats update: 3:00 AM ET')

  // Daily news digest at 7:00 AM ET (after stats update at 3 AM)
  const newsDigestJob = cron.schedule(
    '0 7 * * *', // 7:00 AM every day
    async () => {
      console.log('\n🔔 Triggered: Daily news digest job')
      await runNewsDigestJob()
    },
    {
      timezone: 'America/New_York',
      scheduled: true,
    }
  )

  scheduledTasks.push(newsDigestJob)
  console.log('   ✅ Daily news digest: 7:00 AM ET')

  // Optional: Add a health check job that runs every hour
  const healthCheckJob = cron.schedule(
    '0 * * * *', // Every hour at :00
    () => {
      console.log(`💓 Scheduler heartbeat: ${new Date().toISOString()}`)
    },
    {
      timezone: 'America/New_York',
      scheduled: true,
    }
  )

  scheduledTasks.push(healthCheckJob)
  console.log('   ✅ Hourly heartbeat: every hour')

  console.log(`\n✅ Scheduled jobs initialized (${scheduledTasks.length} jobs)`)
  console.log(`   Season year: ${CURRENT_SEASON_YEAR}`)
  console.log(`   Next stats update: 3:00 AM ET\n`)
}

/**
 * Stop all scheduled jobs
 * Called on server shutdown
 */
export function stopScheduledJobs(): void {
  console.log('\n🛑 Stopping scheduled jobs...')

  for (const task of scheduledTasks) {
    task.stop()
  }

  scheduledTasks.length = 0
  console.log('   ✅ All scheduled jobs stopped\n')
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  enabled: boolean
  jobCount: number
  seasonYear: number
  jobs: { name: string; schedule: string; timezone: string }[]
} {
  return {
    enabled: SCHEDULING_ENABLED,
    jobCount: scheduledTasks.length,
    seasonYear: CURRENT_SEASON_YEAR,
    jobs: [
      {
        name: 'Daily Stats Update',
        schedule: '0 3 * * * (3:00 AM)',
        timezone: 'America/New_York',
      },
      {
        name: 'Daily News Digest',
        schedule: '0 7 * * * (7:00 AM)',
        timezone: 'America/New_York',
      },
      {
        name: 'Heartbeat',
        schedule: '0 * * * * (every hour)',
        timezone: 'America/New_York',
      },
    ],
  }
}

/**
 * Manually trigger a job (for admin use)
 */
export async function triggerJob(
  jobName: JobName,
  options: { seasonYear?: number; date?: string } = {}
): Promise<{ success: boolean; error?: string }> {
  const seasonYear = options.seasonYear || CURRENT_SEASON_YEAR

  console.log(`\n🔧 Manually triggering job: ${jobName}`)

  switch (jobName) {
    case 'update_stats':
      const statsResult = await runStatsUpdateJob(seasonYear, options.date)
      return { success: statsResult.success, error: statsResult.error }

    case 'calculate_leaderboard':
      const leaderboardResult = await runLeaderboardJob(seasonYear)
      return { success: leaderboardResult.success, error: leaderboardResult.error }

    case 'news_digest':
      const newsResult = await runNewsDigestJob(options.date)
      return { success: newsResult.success, error: newsResult.error }

    default:
      return { success: false, error: `Unknown job: ${jobName}` }
  }
}
