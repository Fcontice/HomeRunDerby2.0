/**
 * Validate 2025 Eligibility Data
 * Verifies data quality after import from MLB-StatsAPI
 *
 * Checks:
 * - Record counts match between Player and PlayerSeasonStats
 * - mlbId format is correct (mlb-{playerId})
 * - No 'UNK' team abbreviations
 * - All players are eligible
 * - All players have >= 10 HRs
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

    // Check eligibility
    const ineligible = players.filter(p => !p.isEligible)
    console.log(`\n⚾ Eligibility Status:`)
    console.log(`   Ineligible players: ${ineligible.length}`)
    if (ineligible.length > 0) {
      hasIssues = true
      console.log(`   ⚠️  Found ineligible players:`, ineligible.map(p => p.name))
    } else {
      console.log(`   ✅ All players are eligible`)
    }

    // Check HR threshold
    const lowHrs = players.filter(p => p.hrsPreviousSeason < 10)
    console.log(`\n🏠 Home Run Threshold:`)
    console.log(`   Players with <10 HRs: ${lowHrs.length}`)
    if (lowHrs.length > 0) {
      hasIssues = true
      console.log(`   ⚠️  Players below threshold:`)
      lowHrs.forEach(p => {
        console.log(`      - ${p.name}: ${p.hrsPreviousSeason} HRs`)
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

