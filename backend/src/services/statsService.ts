/**
 * Player Stats Service
 * Handles player statistics updates using MLB-StatsAPI via Python
 *
 * REFACTORED: Now uses Python script with MLB-StatsAPI for game-by-game tracking
 * Previous implementation: Baseball Savant CSV scraping (season totals only)
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'
import { db } from './db.js'

const execPromise = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Execute command with retry logic and exponential backoff
 */
async function execWithRetry(
  command: string,
  options: any,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<{ stdout: string; stderr: string }> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}: Executing Python script...`)

      const result = await execPromise(command, {
        ...options,
        timeout: 5 * 60 * 1000,  // 5 minute timeout
      })

      console.log(`✅ Python script succeeded on attempt ${attempt}`)
      return result

    } catch (error) {
      lastError = error as Error

      // Don't retry on certain errors
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase()

        // Non-retryable errors
        if (errorMsg.includes('python: command not found') ||
            errorMsg.includes('no module named') ||
            errorMsg.includes('syntax error')) {
          console.error('❌ Non-retryable error detected:', errorMsg)
          throw error
        }
      }

      // Calculate backoff delay
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1)  // Exponential backoff
        console.warn(`⚠️  Attempt ${attempt} failed. Retrying in ${delay}ms...`)
        console.warn(`   Error: ${lastError.message}`)

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // All retries exhausted
  throw new Error(
    `Python stats updater failed after ${maxRetries} attempts. ` +
    `Last error: ${lastError?.message}`
  )
}

export interface CurrentSeasonStats {
  playerId: string
  name: string
  mlbId: string
  teamAbbr: string
  homeRuns: number
  homeRunsPostseason: number
}

/**
 * Update player stats using Python MLB-StatsAPI script
 *
 * This runs the Python script that:
 * 1. Fetches yesterday's completed games from MLB-StatsAPI
 * 2. Extracts game-by-game home run data (regular season only)
 * 3. Aggregates daily totals per player
 * 4. Updates Supabase PlayerStats table directly
 *
 * @param seasonYear - Season year to update (default: 2025)
 * @param dateStr - Optional specific date to process (YYYY-MM-DD). Defaults to yesterday.
 * @returns Stats update summary
 */
export async function updatePlayerStats(
  seasonYear: number = 2025,
  dateStr?: string
): Promise<{
  updated: number
  created: number
  errors: number
}> {
  console.log(`\n🔄 Updating player stats for ${seasonYear} season...`)

  try {
    // Path to Python script
    const pythonScriptPath = path.join(__dirname, '../scripts/python/update_stats.py')

    // Build command
    let command = `python "${pythonScriptPath}" --season-year ${seasonYear}`
    if (dateStr) {
      command += ` --date ${dateStr}`
    }

    console.log(`📡 Running Python stats updater with retry logic...`)
    console.log(`   Command: ${command}`)

    // Execute Python script with retry logic (3 attempts, exponential backoff)
    const { stdout, stderr } = await execWithRetry(
      command,
      {
        cwd: path.join(__dirname, '../scripts/python'),
        env: {
          ...process.env,
          // Pass Supabase credentials from Node.js environment
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          SEASON_YEAR: seasonYear.toString(),
        },
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for output
      },
      3,      // Max retries
      2000    // Initial delay (2s, then 4s, then 8s)
    )

    // Log Python script output
    if (stdout) {
      console.log('\n📋 Python script output:')
      console.log(stdout)
    }

    if (stderr) {
      console.error('\n⚠️  Python script warnings:')
      console.error(stderr)
    }

    // Parse summary from output
    // Look for lines like "✅ Updated: 25", "➕ Created: 5", etc.
    const updatedMatch = stdout.match(/Updated:\s*(\d+)/)
    const createdMatch = stdout.match(/Created:\s*(\d+)/)
    const skippedMatch = stdout.match(/Skipped:\s*(\d+)/)

    const updated = updatedMatch ? parseInt(updatedMatch[1]) : 0
    const created = createdMatch ? parseInt(createdMatch[1]) : 0
    const errors = skippedMatch ? parseInt(skippedMatch[1]) : 0

    console.log(`\n📊 Stats update complete:`)
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ➕ Created: ${created}`)
    console.log(`   ⚠️  Errors: ${errors}\n`)

    return { updated, created, errors }

  } catch (error) {
    console.error('❌ Python stats updater failed after all retries:', error)

    if (error instanceof Error && 'stderr' in error) {
      console.error('Python error output:', (error as any).stderr)
    }

    throw new Error(`Stats update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get latest stats for a specific player
 *
 * NOTE: This function reads from the database that the Python script writes to.
 * It does not call the Python script itself.
 */
export async function getLatestPlayerStats(playerId: string, seasonYear: number = 2025) {
  const stats = await db.playerStats.findFirst({
    playerId,
    seasonYear,
  }, {
    orderBy: { date: 'desc' },
    take: 1,
  })

  return stats
}

/**
 * Get player stats for a specific date range
 *
 * NOTE: This function reads from the database that the Python script writes to.
 * Useful for monthly leaderboards (date-range filtering).
 */
export async function getPlayerStatsDateRange(
  playerId: string,
  seasonYear: number,
  startDate: string,
  endDate: string
) {
  const stats = await db.playerStats.findMany({
    playerId,
    seasonYear,
    date: { gte: startDate, lte: endDate },
  }, {
    orderBy: { date: 'asc' },
  })

  return stats
}

/**
 * DEPRECATED: Baseball Savant scraper (kept for reference only)
 *
 * This function has been replaced by the Python MLB-StatsAPI implementation.
 * The new implementation provides:
 * - Game-by-game tracking (not just season totals)
 * - Regular season filtering (postseason excluded)
 * - More reliable data source (official MLB API)
 * - Better player metadata
 *
 * If you need to revert to Baseball Savant, see git history for the original implementation.
 */
export async function fetchCurrentSeasonStats(seasonYear: number = 2025): Promise<CurrentSeasonStats[]> {
  throw new Error(
    'fetchCurrentSeasonStats() has been deprecated. ' +
    'Use updatePlayerStats() which calls the Python MLB-StatsAPI script instead.'
  )
}
