/**
 * Validate 2025 Eligibility Data
 * Verifies data quality after import from MLB-StatsAPI
 *
 * Checks:
 * - Record counts match between Player and PlayerSeasonStats
 * - mlbId format is correct (mlb-{playerId})
 * - No 'UNK' team abbreviations
 * - All players are eligible
 * - All players have >= 9 HRs
 * - HR distribution stats
 * - Team distribution
 * - No duplicate mlbIds
 *
 * Usage: npm run validate:data
 */

import '../env.js'
import { db } from '../services/db.js'

const SEASON_YEAR = 2025

async function validateData() {
  console.log('\n🔍 Validating 2025 eligibility data...\n')
  console.log('='.repeat(60))

  try {
    // Fetch all players and season stats
    const players = await db.player.findMany({ seasonYear: SEASON_YEAR })
    const seasonStats = await db.playerSeasonStats.findMany({ seasonYear: SEASON_YEAR })

    console.log(`\n📊 Record Counts:`)
    console.log(`   Players: ${players.length}`)
    console.log(`   Season Stats: ${seasonStats.length}`)

    // Track issues
    let hasIssues = false

    // Check for invalid mlbId format
    const invalidMlbIds = players.filter(p => !p.mlbId.startsWith('mlb-'))
    console.log(`\n🔍 mlbId Format:`)
    console.log(`   Invalid format: ${invalidMlbIds.length}`)
    if (invalidMlbIds.length > 0) {
      hasIssues = true
      console.log(`   ❌ Invalid IDs:`, invalidMlbIds.slice(0, 5).map(p => p.mlbId))
      if (invalidMlbIds.length > 5) {
        console.log(`      ... and ${invalidMlbIds.length - 5} more`)
      }
    } else {
      console.log(`   ✅ All mlbIds have correct format`)
    }

    // Check for 'UNK' teams
    const unkTeams = players.filter(p => p.teamAbbr === 'UNK')
    console.log(`\n🏟️  Team Abbreviations:`)
    console.log(`   'UNK' teams: ${unkTeams.length}`)
    if (unkTeams.length > 0) {
      hasIssues = true
      console.log(`   ❌ Players with 'UNK' team:`, unkTeams.slice(0, 5).map(p => p.name))
      if (unkTeams.length > 5) {
        console.log(`      ... and ${unkTeams.length - 5} more`)
      }
    } else {
      console.log(`   ✅ All players have valid team abbreviations`)
    }

    // Check eligibility via season stats
    const ineligibleStats = seasonStats.filter(s => s.hrsTotal < 10)
    console.log(`\n⚾ Eligibility Status:`)
    console.log(`   Ineligible players: ${ineligibleStats.length}`)
    if (ineligibleStats.length > 0) {
      hasIssues = true
      console.log(`   ⚠️  Found ineligible players:`, ineligibleStats.map(s => s.playerId))
    } else {
      console.log(`   ✅ All players are eligible`)
    }

    // Check HR threshold via season stats
    const lowHrs = seasonStats.filter(s => s.hrsTotal < 10)
    console.log(`\n🏠 Home Run Threshold:`)
    console.log(`   Players with <10 HRs: ${lowHrs.length}`)
    if (lowHrs.length > 0) {
      hasIssues = true
      console.log(`   ⚠️  Players below threshold:`)
      lowHrs.forEach(s => {
        console.log(`      - ${s.playerId}: ${s.hrsTotal} HRs`)
      })
    } else {
      console.log(`   ✅ All players meet 10+ HR threshold`)
    }

    // Check record count match
    const countMismatch = players.length !== seasonStats.length
    console.log(`\n📋 Stats Consistency:`)
    console.log(`   Player/Stats count match: ${!countMismatch ? '✅ Yes' : '❌ No'}`)
    if (countMismatch) {
      hasIssues = true
      console.log(`   ⚠️  Mismatch: ${players.length} players vs ${seasonStats.length} stats records`)
    }

    // HR distribution stats from season stats
    const hrsList = seasonStats.map(s => s.hrsTotal)
    const minHrs = Math.min(...hrsList)
    const maxHrs = Math.max(...hrsList)
    const avgHrs = hrsList.reduce((a, b) => a + b, 0) / hrsList.length

    console.log(`\n📈 HR Distribution:`)
    console.log(`   Min: ${minHrs}`)
    console.log(`   Max: ${maxHrs}`)
    console.log(`   Avg: ${avgHrs.toFixed(2)}`)

    // Team distribution
    const teamCounts: Record<string, number> = {}
    players.forEach(p => {
      teamCounts[p.teamAbbr] = (teamCounts[p.teamAbbr] || 0) + 1
    })
    const topTeams = Object.entries(teamCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    console.log(`\n🏟️  Top 5 Teams by Player Count:`)
    topTeams.forEach(([team, count]) => {
      console.log(`   ${team}: ${count} players`)
    })

    // Check for duplicate mlbIds
    const mlbIdCounts: Record<string, number> = {}
    players.forEach(p => {
      mlbIdCounts[p.mlbId] = (mlbIdCounts[p.mlbId] || 0) + 1
    })
    const duplicates = Object.entries(mlbIdCounts).filter(([_, count]) => count > 1)
    console.log(`\n🔍 Duplicate mlbIds: ${duplicates.length}`)
    if (duplicates.length > 0) {
      hasIssues = true
      console.log(`   ❌ Found duplicates:`, duplicates.map(([id]) => id))
    } else {
      console.log(`   ✅ No duplicate mlbIds`)
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`)
    if (hasIssues) {
      console.log(`\n⚠️  Validation completed with issues. Please review above.`)
      process.exit(1)
    } else {
      console.log(`\n✅ Validation passed! All checks successful.`)
      process.exit(0)
    }
  } catch (error) {
    console.error('\n❌ Validation failed with error:')
    console.error(error)
    process.exit(1)
  }
}

// Run validation
validateData()
