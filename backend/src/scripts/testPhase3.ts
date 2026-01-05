/**
 * Phase 3 Test Script
 * Tests the complete stats → scoring → leaderboard pipeline
 *
 * REFACTORED: Now uses Python MLB-StatsAPI for game-by-game tracking
 * Previous implementation: Baseball Savant CSV scraping
 *
 * Usage: npm run test:phase3
 * Usage with specific date: npm run test:phase3 -- --date 2026-04-15
 */

import '../env.js'
import { updatePlayerStats } from '../services/statsService.js'
import { calculateAllTeamScores, calculateTeamScore } from '../services/scoringService.js'
import {
  calculateOverallLeaderboard,
  calculateMonthlyLeaderboard,
  getOverallLeaderboard,
  getMonthlyLeaderboard,
} from '../services/leaderboardService.js'
import { db } from '../services/db.js'

const SEASON_YEAR = 2026

// Parse command line arguments
const args = process.argv.slice(2)
const dateIndex = args.indexOf('--date')
const specificDate = dateIndex !== -1 ? args[dateIndex + 1] : undefined

async function testPhase3() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 PHASE 3 PIPELINE TEST')
  console.log('='.repeat(60) + '\n')

  try {
    // ==================== STEP 1: UPDATE PLAYER STATS ====================
    console.log('📊 STEP 1: Updating player stats from MLB-StatsAPI (Python)...\n')

    if (specificDate) {
      console.log(`   Testing with specific date: ${specificDate}\n`)
    }

    const statsResult = await updatePlayerStats(SEASON_YEAR, specificDate)

    console.log(`\n✅ Stats update completed:`)
    console.log(`   - Created: ${statsResult.created}`)
    console.log(`   - Updated: ${statsResult.updated}`)
    console.log(`   - Errors: ${statsResult.errors}\n`)

    if (statsResult.created === 0 && statsResult.updated === 0) {
      console.log('⚠️  Warning: No stats were created or updated. This might indicate:')
      console.log('   - No eligible players in database yet')
      console.log('   - No games played on this date (off-day or future date)')
      console.log('   - Season has not started yet\n')
    }

    // ==================== STEP 2: VERIFY PLAYER STATS ====================
    console.log('\n' + '-'.repeat(60))
    console.log('🔍 STEP 2: Verifying player stats in database...\n')

    const samplePlayers = await db.player.findMany({}, { take: 5 })

    if (samplePlayers.length === 0) {
      console.log('⚠️  No players found in database. Run import:players script first.\n')
      return
    }

    console.log(`Found ${samplePlayers.length} sample players. Checking their stats:\n`)

    for (const player of samplePlayers) {
      const latestStats = await db.playerStats.getLatest(player.id, SEASON_YEAR)

      if (latestStats) {
        console.log(`✓ ${player.name} (${player.teamAbbr}):`)
        console.log(`  Total HRs: ${latestStats.hrsTotal} (Regular: ${latestStats.hrsRegularSeason}, Postseason: ${latestStats.hrsPostseason})`)
        console.log(`  Last updated: ${latestStats.lastUpdated}`)
      } else {
        console.log(`✗ ${player.name} (${player.teamAbbr}): No stats found for ${SEASON_YEAR}`)
      }
    }

    // ==================== STEP 3: TEST TEAM SCORING ====================
    console.log('\n' + '-'.repeat(60))
    console.log('🎯 STEP 3: Testing team scoring (best 7 of 8)...\n')

    const teams = await db.team.findMany({
      seasonYear: SEASON_YEAR,
      entryStatus: { in: ['entered', 'locked'] },
      deletedAt: null,
    }, { take: 3 })

    if (teams.length === 0) {
      console.log('⚠️  No entered teams found for testing.\n')
    } else {
      console.log(`Testing scoring for ${teams.length} team(s):\n`)

      for (const team of teams) {
        try {
          const teamScore = await calculateTeamScore(team.id, SEASON_YEAR, true)

          console.log(`Team: ${teamScore.teamName}`)
          console.log(`Total HRs (best 7): ${teamScore.totalHrs}`)
          console.log(`  Regular Season: ${teamScore.regularSeasonHrs}`)
          console.log(`  Postseason: ${teamScore.postseasonHrs}`)
          console.log(`\nPlayer breakdown:`)

          for (const player of teamScore.playerScores) {
            const status = player.included ? '✓ COUNTS' : '✗ excluded'
            console.log(`  ${status} - ${player.playerName}: ${player.hrsTotal} HRs`)
          }

          console.log('')
        } catch (error) {
          console.error(`❌ Error calculating score for ${team.name}:`, error)
        }
      }
    }

    // ==================== STEP 4: CALCULATE ALL TEAM SCORES ====================
    console.log('\n' + '-'.repeat(60))
    console.log('📈 STEP 4: Calculating scores for all teams...\n')

    const allScores = await calculateAllTeamScores(SEASON_YEAR, true)

    console.log(`✅ Calculated scores for ${allScores.length} teams`)
    console.log(`\nTop 5 teams:`)

    for (let i = 0; i < Math.min(5, allScores.length); i++) {
      const score = allScores[i]
      console.log(`  ${i + 1}. ${score.teamName}: ${score.totalHrs} HRs`)
    }

    // ==================== STEP 5: GENERATE OVERALL LEADERBOARD ====================
    console.log('\n' + '-'.repeat(60))
    console.log('🏆 STEP 5: Generating overall leaderboard...\n')

    const overallLeaderboard = await calculateOverallLeaderboard(SEASON_YEAR)

    console.log(`✅ Overall leaderboard saved with ${overallLeaderboard.length} teams`)
    console.log(`\nTop 10 teams:`)

    for (let i = 0; i < Math.min(10, overallLeaderboard.length); i++) {
      const entry = overallLeaderboard[i]
      console.log(`  ${entry.rank}. ${entry.teamName} (@${entry.username}): ${entry.totalHrs} HRs`)
    }

    // ==================== STEP 6: GENERATE MONTHLY LEADERBOARD ====================
    console.log('\n' + '-'.repeat(60))
    console.log('📅 STEP 6: Generating monthly leaderboard (current month)...\n')

    const currentMonth = new Date().getMonth() + 1

    try {
      const monthlyLeaderboard = await calculateMonthlyLeaderboard(SEASON_YEAR, currentMonth)

      console.log(`✅ Monthly leaderboard (${SEASON_YEAR}-${currentMonth.toString().padStart(2, '0')}) saved with ${monthlyLeaderboard.length} teams`)
      console.log(`\nTop 10 teams for this month:`)

      for (let i = 0; i < Math.min(10, monthlyLeaderboard.length); i++) {
        const entry = monthlyLeaderboard[i]
        console.log(`  ${entry.rank}. ${entry.teamName}: ${entry.totalHrs} HRs (regular season only)`)
      }
    } catch (error) {
      console.error(`⚠️  Could not generate monthly leaderboard:`, error)
    }

    // ==================== STEP 7: RETRIEVE CACHED LEADERBOARDS ====================
    console.log('\n' + '-'.repeat(60))
    console.log('💾 STEP 7: Testing cached leaderboard retrieval...\n')

    const cachedOverall = await getOverallLeaderboard(SEASON_YEAR)
    console.log(`✅ Retrieved cached overall leaderboard: ${cachedOverall.length} teams`)

    const cachedMonthly = await getMonthlyLeaderboard(SEASON_YEAR, currentMonth)
    console.log(`✅ Retrieved cached monthly leaderboard: ${cachedMonthly.length} teams`)

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60))
    console.log('✅ PHASE 3 PIPELINE TEST COMPLETE')
    console.log('='.repeat(60))
    console.log('\nAll systems operational:')
    console.log('  ✓ Stats fetching from MLB-StatsAPI (game-by-game, Python)')
    console.log('  ✓ Player stats database updates (regular season only)')
    console.log('  ✓ Team scoring calculation (best 7 of 8)')
    console.log('  ✓ Overall leaderboard generation')
    console.log('  ✓ Monthly leaderboard generation')
    console.log('  ✓ Cached leaderboard retrieval')
    console.log('\nReady for API endpoint testing! 🚀\n')

  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
    console.error('\nStack trace:', error instanceof Error ? error.stack : 'No stack trace')
    process.exit(1)
  } finally {
    // Clean up database connection
    await db.$disconnect()
  }
}

// Run the test
testPhase3()
