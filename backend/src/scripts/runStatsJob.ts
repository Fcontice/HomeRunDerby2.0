#!/usr/bin/env tsx
/**
 * Manual Stats Job Runner
 *
 * Usage:
 *   npm run job:stats                    # Run stats update for yesterday
 *   npm run job:stats:date 2026-04-15    # Run for specific date
 *   tsx src/scripts/runStatsJob.ts --date 2026-04-15
 */

import '../env.js'
import { runStatsUpdateJob } from '../services/scheduledJobs.js'

const SEASON_YEAR = parseInt(process.env.SEASON_YEAR || '2026', 10)

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 MANUAL STATS JOB RUNNER')
  console.log('='.repeat(60))

  // Parse command line arguments
  const args = process.argv.slice(2)
  let dateStr: string | undefined

  // Check for --date flag
  const dateArgIndex = args.indexOf('--date')
  if (dateArgIndex !== -1 && args[dateArgIndex + 1]) {
    dateStr = args[dateArgIndex + 1]
  } else if (args.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(args[0])) {
    // Also accept date as first positional argument (e.g., npm run job:stats 2025-07-15)
    dateStr = args[0]
  }

  // Validate date format if provided
  if (dateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.error('❌ Invalid date format. Use YYYY-MM-DD')
    process.exit(1)
  }

  console.log(`\nConfiguration:`)
  console.log(`  Season Year: ${SEASON_YEAR}`)
  console.log(`  Date: ${dateStr || 'yesterday (default)'}`)
  console.log(`  Time: ${new Date().toISOString()}`)
  console.log('')

  try {
    const result = await runStatsUpdateJob(SEASON_YEAR, dateStr)

    if (result.success) {
      console.log('\n' + '='.repeat(60))
      console.log('✅ JOB COMPLETED SUCCESSFULLY')
      console.log('='.repeat(60))
      console.log('\nResults:')
      if (result.statsResult) {
        console.log(`  Stats Updated: ${result.statsResult.updated}`)
        console.log(`  Stats Created: ${result.statsResult.created}`)
        console.log(`  Stats Errors: ${result.statsResult.errors}`)
      }
      console.log(`  Leaderboard Updated: ${result.leaderboardUpdated}`)
      process.exit(0)
    } else {
      console.error('\n' + '='.repeat(60))
      console.error('❌ JOB FAILED')
      console.error('='.repeat(60))
      console.error(`\nError: ${result.error}`)
      process.exit(1)
    }
  } catch (error) {
    console.error('\n' + '='.repeat(60))
    console.error('❌ UNEXPECTED ERROR')
    console.error('='.repeat(60))
    console.error(error)
    process.exit(1)
  }
}

main()
