/**
 * Seed Monthly Leaderboard Test Data
 * Creates 26 teams with player stats spread across months for testing monthly leaderboards
 *
 * - 3 teams for user contifrank4
 * - 23 teams for sample users
 * - PlayerStats with cumulative totals across months (April-September)
 *
 * Usage: npx tsx src/scripts/seedMonthlyLeaderboard.ts
 */

import '../env.js'
import { db } from '../services/db.js'
import { supabaseAdmin } from '../config/supabase.js'
import {
  calculateOverallLeaderboard,
  calculateMonthlyLeaderboard
} from '../services/leaderboardService.js'
import { hashPassword } from '../utils/password.js'

const SEASON_YEAR = 2025
const TARGET_EMAIL = 'contifrank4@gmail.com'
const TARGET_USERNAME = 'contifrank4'

// Sample teams (23 teams + 3 for contifrank4 = 26 total)
const SAMPLE_TEAMS = [
  { username: 'homer_king', email: 'homer@sample.com', teamName: 'Dinger Dynasty' },
  { username: 'yard_queen', email: 'yard@sample.com', teamName: 'Moonshot Mavericks' },
  { username: 'slugger_sam', email: 'slugger@sample.com', teamName: 'Blast Brigade' },
  { username: 'power_pete', email: 'power@sample.com', teamName: 'Power Surge' },
  { username: 'bomb_squad', email: 'bomb@sample.com', teamName: 'Bomb Squad Elite' },
  { username: 'fence_buster', email: 'fence@sample.com', teamName: 'Fence Busters' },
  { username: 'long_ball', email: 'longball@sample.com', teamName: 'Long Ball Legends' },
  { username: 'tater_tots', email: 'tater@sample.com', teamName: 'Tater Tot Crew' },
  { username: 'grand_slam', email: 'grand@sample.com', teamName: 'Grand Slam Gang' },
  { username: 'upper_deck', email: 'upper@sample.com', teamName: 'Upper Deck United' },
  { username: 'jack_attack', email: 'jack@sample.com', teamName: 'Jack Attack' },
  { username: 'big_fly', email: 'bigfly@sample.com', teamName: 'Big Fly Society' },
  { username: 'gone_yard', email: 'gone@sample.com', teamName: 'Gone Yard Gang' },
  { username: 'deep_shot', email: 'deep@sample.com', teamName: 'Deep Shot Crew' },
  { username: 'moon_crew', email: 'moon@sample.com', teamName: 'To The Moon' },
  { username: 'blast_off', email: 'blast@sample.com', teamName: 'Blast Off Boys' },
  { username: 'launch_pad', email: 'launch@sample.com', teamName: 'Launch Pad Squad' },
  { username: 'exit_velo', email: 'exit@sample.com', teamName: 'Exit Velo Elite' },
  { username: 'barrel_boys', email: 'barrel@sample.com', teamName: 'Barrel Boys' },
  { username: 'swing_kings', email: 'swing@sample.com', teamName: 'Swing Kings' },
  { username: 'power_alley', email: 'alley@sample.com', teamName: 'Power Alley Pros' },
  { username: 'clutch_hrs', email: 'clutch@sample.com', teamName: 'Clutch Homers' },
  { username: 'bench_mob', email: 'bench@sample.com', teamName: 'Bench Mob Mashers' },
]

// Target user's 3 teams
const TARGET_TEAMS = [
  { teamName: "Frank's Sluggers", rank: 3 },
  { teamName: "Frank's B-Team", rank: 12 },
  { teamName: "Frank's Underdogs", rank: 22 },
]

// MLB season months (March-September)
const SEASON_MONTHS = [3, 4, 5, 6, 7, 8, 9]

/**
 * Generate random monthly HR distribution for a player
 * Returns array of HRs per month [Apr, May, Jun, Jul, Aug, Sep]
 */
function generateMonthlyHrs(totalSeasonHrs: number): number[] {
  // Distribute HRs across months with some randomness
  const weights = SEASON_MONTHS.map(() => Math.random() + 0.5)
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  const monthlyHrs = weights.map(w => Math.round((w / totalWeight) * totalSeasonHrs))

  // Adjust to match exact total
  const sum = monthlyHrs.reduce((a, b) => a + b, 0)
  const diff = totalSeasonHrs - sum
  if (diff !== 0) {
    // Add/subtract difference to a random month
    const randomMonth = Math.floor(Math.random() * monthlyHrs.length)
    monthlyHrs[randomMonth] = Math.max(0, monthlyHrs[randomMonth] + diff)
  }

  return monthlyHrs
}

// Flag to track if hrsDaily column exists (checked once at start)
let hrsDailyColumnExists: boolean | null = null

async function checkHrsDailyColumn(): Promise<boolean> {
  if (hrsDailyColumnExists !== null) return hrsDailyColumnExists

  try {
    // Try a simple query to check if column exists
    const { error } = await supabaseAdmin
      .from('PlayerStats')
      .select('hrsDaily')
      .limit(1)

    hrsDailyColumnExists = !error
    return hrsDailyColumnExists
  } catch {
    hrsDailyColumnExists = false
    return false
  }
}

/**
 * Create PlayerStats records with cumulative totals for each month end
 * First deletes any existing stats for this player/season, then creates fresh ones
 */
async function createMonthlyStats(
  playerId: string,
  seasonYear: number,
  monthlyHrs: number[]
): Promise<void> {
  // Delete existing stats for this player/season to start fresh
  await supabaseAdmin
    .from('PlayerStats')
    .delete()
    .eq('playerId', playerId)
    .eq('seasonYear', seasonYear)

  const includeHrsDaily = await checkHrsDailyColumn()
  let cumulativeHrs = 0

  for (let i = 0; i < SEASON_MONTHS.length; i++) {
    const month = SEASON_MONTHS[i]
    const dailyHrs = monthlyHrs[i]  // HRs for this specific month
    cumulativeHrs += dailyHrs

    // Last day of each month
    const lastDay = new Date(seasonYear, month, 0).getDate()
    const dateStr = `${seasonYear}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`

    // Create fresh stat record
    const statsData: Record<string, unknown> = {
      playerId,
      seasonYear,
      date: dateStr,
      hrsTotal: cumulativeHrs,
      hrsRegularSeason: cumulativeHrs,
      hrsPostseason: 0,
    }

    // Include hrsDaily if column exists in DB
    if (includeHrsDaily) {
      statsData.hrsDaily = dailyHrs
    }

    await db.playerStats.create(statsData as any)
  }
}

/**
 * Distribute total team HRs across 8 players (top 7 count toward team score)
 */
function distributeTeamHrs(totalHrs: number): number[] {
  const base = Math.floor(totalHrs / 7)
  const remainder = totalHrs % 7

  return [
    base + Math.min(remainder, 1) + 4,  // Best player
    base + Math.min(Math.max(remainder - 1, 0), 1) + 3,
    base + Math.min(Math.max(remainder - 2, 0), 1) + 2,
    base + Math.min(Math.max(remainder - 3, 0), 1) + 1,
    base + Math.min(Math.max(remainder - 4, 0), 1),
    base + Math.min(Math.max(remainder - 5, 0), 1) - 1,
    base + Math.min(Math.max(remainder - 6, 0), 1) - 2,
    Math.floor(base * 0.3), // 8th player - doesn't count in best 7
  ].map(h => Math.max(h, 0))
}

async function seedMonthlyLeaderboard() {
  console.log('\n' + '='.repeat(60))
  console.log('🌱 SEEDING MONTHLY LEADERBOARD DATA')
  console.log('='.repeat(60) + '\n')

  try {
    const hashedPassword = await hashPassword('TestPass123!')

    // ==================== STEP 1: GET PLAYERS ====================
    console.log('📋 STEP 1: Fetching players...\n')

    const players = await db.player.findMany({}, { take: 250 })

    if (players.length < 200) {
      console.log(`   ⚠️  Only ${players.length} players. Some teams may share players.`)
    }

    const shuffledPlayers = players.sort(() => Math.random() - 0.5)
    console.log(`   ✅ Found ${players.length} players\n`)

    // ==================== STEP 2: CREATE TARGET USER ====================
    console.log('⭐ STEP 2: Creating/finding target user (contifrank4)...\n')

    let targetUser = await db.user.findUnique({ email: TARGET_EMAIL })

    if (!targetUser) {
      targetUser = await db.user.create({
        email: TARGET_EMAIL,
        username: TARGET_USERNAME,
        passwordHash: hashedPassword,
        role: 'user',
        emailVerified: true,
      })
      console.log(`   ✅ Created user: ${targetUser.username}`)
    } else {
      console.log(`   ✅ Found existing user: ${targetUser.username}`)
    }

    // ==================== STEP 3: CREATE SAMPLE USERS ====================
    console.log('\n👥 STEP 3: Creating sample users...\n')

    const sampleUsers: any[] = []

    for (const sampleData of SAMPLE_TEAMS) {
      let user = await db.user.findUnique({ email: sampleData.email })

      if (!user) {
        user = await db.user.create({
          email: sampleData.email,
          username: sampleData.username,
          passwordHash: hashedPassword,
          role: 'user',
          emailVerified: true,
        })
      }

      sampleUsers.push({ ...user, teamName: sampleData.teamName })
    }

    console.log(`   ✅ ${sampleUsers.length} sample users ready\n`)

    // ==================== STEP 4: CREATE TEAMS ====================
    console.log('⚾ STEP 4: Creating 26 teams...\n')

    let playerIndex = 0
    const allTeams: { team: any; totalHrs: number; playerHrs: number[][] }[] = []

    // Assign HR totals for ranking (higher = better rank)
    // We'll create varied totals that will produce interesting rankings
    // 26 teams total (3 target + 23 sample)
    const hrTotals = [
      156, 148, 142, 138, 134, 129, 125, 121, 118, 114,
      110, 106, 102, 99, 96, 93, 91, 89, 87, 86,
      85, 82, 79, 75, 70, 65
    ]

    // Create target user's 3 teams first
    console.log(`\n   Creating ${TARGET_TEAMS.length} teams for ${TARGET_USERNAME}...\n`)

    for (let i = 0; i < TARGET_TEAMS.length; i++) {
      const targetTeamData = TARGET_TEAMS[i]
      console.log(`   [${i + 1}/${TARGET_TEAMS.length}] Processing: ${targetTeamData.teamName}`)

      const teamPlayers = shuffledPlayers.slice(playerIndex, playerIndex + 8)
      playerIndex += 8

      if (teamPlayers.length < 8) {
        console.log(`      ❌ Not enough players for ${targetTeamData.teamName} (got ${teamPlayers.length})`)
        continue
      }

      // Check for existing team
      const existingTeams = await db.team.findMany({
        userId: targetUser.id,
        name: targetTeamData.teamName,
        seasonYear: SEASON_YEAR,
        deletedAt: null,
      })

      let team: any

      if (existingTeams.length > 0) {
        team = existingTeams[0]
        console.log(`      ⏭️  Team exists (id: ${team.id}), updating stats...`)
      } else {
        try {
          team = await db.team.create({
            name: targetTeamData.teamName,
            userId: targetUser.id,
            seasonYear: SEASON_YEAR,
            entryStatus: 'entered',
            paymentStatus: 'paid',
            totalHrs2024: 150,
            teamPlayers: {
              create: teamPlayers.map((player, idx) => ({
                playerId: player.id,
                position: idx + 1,
              })),
            },
          })
          console.log(`      ✅ Created team (id: ${team.id})`)
        } catch (err: any) {
          console.log(`      ❌ Failed to create team: ${err.message}`)
          console.log(`         Error details:`, err)
          continue
        }
      }

      // Assign HRs based on target rank
      const rankIndex = targetTeamData.rank - 1
      const totalHrs = hrTotals[rankIndex] || 80
      const playerHrDistribution = distributeTeamHrs(totalHrs)

      // Generate monthly breakdown for each player
      const playerMonthlyHrs: number[][] = playerHrDistribution.map(hrs =>
        generateMonthlyHrs(hrs)
      )

      allTeams.push({ team, totalHrs, playerHrs: playerMonthlyHrs })

      // Get team player IDs
      const teamPlayerRecords = await db.teamPlayer.findMany({ teamId: team.id })
      console.log(`      Found ${teamPlayerRecords.length} team players`)

      // Create monthly stats for each player
      console.log(`      Creating stats for ${teamPlayerRecords.length} players...`)
      for (let j = 0; j < teamPlayerRecords.length; j++) {
        const playerId = teamPlayerRecords[j].playerId
        await createMonthlyStats(playerId, SEASON_YEAR, playerMonthlyHrs[j])
      }
      console.log(`      ✅ Stats created\n`)
    }

    console.log(`   ✅ Finished creating ${TARGET_TEAMS.length} teams for ${TARGET_USERNAME}\n`)

    // Create sample teams
    let hrIndex = 0
    let sampleTeamCount = 0
    for (const sampleUser of sampleUsers) {
      sampleTeamCount++
      // Skip HR totals already used by target teams
      while (TARGET_TEAMS.some(t => hrTotals[hrIndex] === hrTotals[t.rank - 1])) {
        hrIndex++
      }

      const teamPlayers = shuffledPlayers.slice(playerIndex, playerIndex + 8)
      playerIndex += 8

      if (playerIndex >= shuffledPlayers.length - 8) {
        playerIndex = 0 // Wrap around if needed
      }

      if (teamPlayers.length < 8) {
        console.log(`   ⚠️  Not enough players for ${sampleUser.teamName}`)
        continue
      }

      // Check for existing team
      const existingTeams = await db.team.findMany({
        userId: sampleUser.id,
        name: sampleUser.teamName,
        seasonYear: SEASON_YEAR,
        deletedAt: null,
      })

      let team: any

      if (existingTeams.length > 0) {
        team = existingTeams[0]
      } else {
        team = await db.team.create({
          name: sampleUser.teamName,
          userId: sampleUser.id,
          seasonYear: SEASON_YEAR,
          entryStatus: 'entered',
          paymentStatus: 'paid',
          totalHrs2024: 150,
          teamPlayers: {
            create: teamPlayers.map((player, idx) => ({
              playerId: player.id,
              position: idx + 1,
            })),
          },
        })
        console.log(`   ✅ Created: ${sampleUser.teamName}`)
      }

      const totalHrs = hrTotals[hrIndex] || 70
      hrIndex++

      const playerHrDistribution = distributeTeamHrs(totalHrs)
      const playerMonthlyHrs: number[][] = playerHrDistribution.map(hrs =>
        generateMonthlyHrs(hrs)
      )

      allTeams.push({ team, totalHrs, playerHrs: playerMonthlyHrs })

      // Get team player IDs
      const teamPlayerRecords = await db.teamPlayer.findMany({ teamId: team.id })

      // Create monthly stats for each player
      console.log(`   [${sampleTeamCount}/23] ${sampleUser.teamName}: creating player stats...`)
      for (let j = 0; j < teamPlayerRecords.length; j++) {
        const playerId = teamPlayerRecords[j].playerId
        await createMonthlyStats(playerId, SEASON_YEAR, playerMonthlyHrs[j])
      }
    }

    console.log(`\n   ✅ ${allTeams.length} teams ready with monthly stats\n`)

    // ==================== STEP 5: CALCULATE LEADERBOARDS ====================
    console.log('🏆 STEP 5: Calculating leaderboards...\n')

    // Calculate overall leaderboard
    console.log('   📊 Calculating overall leaderboard...')
    const overallLeaderboard = await calculateOverallLeaderboard(SEASON_YEAR)
    console.log(`   ✅ Overall leaderboard: ${overallLeaderboard.length} teams\n`)

    // Calculate monthly leaderboards for each month
    for (const month of SEASON_MONTHS) {
      const monthName = new Date(2025, month - 1, 1).toLocaleString('en-US', { month: 'long' })
      console.log(`   📊 Calculating ${monthName} leaderboard...`)
      const monthlyLeaderboard = await calculateMonthlyLeaderboard(SEASON_YEAR, month)
      console.log(`   ✅ ${monthName}: ${monthlyLeaderboard.length} teams`)
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60))
    console.log('✅ MONTHLY LEADERBOARD SEEDING COMPLETE')
    console.log('='.repeat(60))

    console.log('\n📊 OVERALL LEADERBOARD PREVIEW:\n')
    console.log('   Rank | Team                      | HRs | Owner')
    console.log('   ' + '-'.repeat(55))

    for (const entry of overallLeaderboard.slice(0, 10)) {
      const isTarget = entry.username === TARGET_USERNAME
      const marker = isTarget ? ' ⭐' : ''
      console.log(`   ${entry.rank.toString().padStart(4)} | ${entry.teamName.padEnd(25)} | ${entry.totalHrs.toString().padStart(3)} | @${entry.username}${marker}`)
    }
    console.log('   ... ')

    // Show target user's teams
    const targetEntries = overallLeaderboard.filter(e => e.username === TARGET_USERNAME)
    for (const entry of targetEntries) {
      if (entry.rank > 10) {
        console.log(`   ${entry.rank.toString().padStart(4)} | ${entry.teamName.padEnd(25)} | ${entry.totalHrs.toString().padStart(3)} | @${entry.username} ⭐`)
      }
    }

    console.log('\n📅 MONTHLY LEADERBOARDS CREATED:')
    for (const month of SEASON_MONTHS) {
      const monthName = new Date(2025, month - 1, 1).toLocaleString('en-US', { month: 'long' })
      console.log(`   ✅ ${monthName} (month ${month})`)
    }

    console.log('\n👤 Target user (contifrank4) teams:')
    for (const entry of targetEntries) {
      console.log(`   • ${entry.teamName} - Rank #${entry.rank} (${entry.totalHrs} HRs)`)
    }

    console.log('\nTotal teams: 26')
    console.log('\nView at:')
    console.log('  • /leaderboard (Overall tab)')
    console.log('  • /leaderboard (Monthly tab - select month)\n')

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Run the seeder
seedMonthlyLeaderboard()
