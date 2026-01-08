/**
 * Seed Test Data Script
 * Creates test users, teams, and player stats for leaderboard testing
 *
 * Usage: npm run seed:test
 */

import '../env.js'
import { db } from '../services/db.js'
import { calculateOverallLeaderboard } from '../services/leaderboardService.js'
import { hashPassword } from '../utils/password.js'

const SEASON_YEAR = 2025

// Test user data (username used for team names)
const testUsers = [
  { username: 'slugger_mike', email: 'mike@test.com' },
  { username: 'hr_queen', email: 'sarah@test.com' },
  { username: 'dingerdan', email: 'dan@test.com' },
  { username: 'yard_master', email: 'chris@test.com' },
  { username: 'moonshot_maria', email: 'maria@test.com' },
]

async function seedTestData() {
  console.log('\n' + '='.repeat(60))
  console.log('🌱 SEEDING TEST DATA')
  console.log('='.repeat(60) + '\n')

  try {
    // ==================== STEP 1: GET AVAILABLE PLAYERS ====================
    console.log('📋 STEP 1: Fetching available players...\n')

    // Get players and their season stats
    const players = await db.player.findMany({}, { take: 50 })

    if (players.length < 40) {
      console.log('❌ Not enough players in database. Need at least 40 players.')
      console.log('   Run the player import script first.')
      return
    }

    // Shuffle players for variety in team composition
    const shuffledPlayers = players.sort(() => Math.random() - 0.5)

    console.log(`✅ Found ${players.length} players available for drafting\n`)

    // ==================== STEP 2: CREATE TEST USERS ====================
    console.log('👤 STEP 2: Creating test users...\n')

    const hashedPassword = await hashPassword('TestPass123!')
    const createdUsers: any[] = []

    for (const userData of testUsers) {
      // Check if user already exists
      const existing = await db.user.findUnique({ email: userData.email })

      if (existing) {
        console.log(`   ⏭️  User ${userData.username} already exists, skipping...`)
        createdUsers.push(existing)
      } else {
        const user = await db.user.create({
          ...userData,
          passwordHash: hashedPassword,
          role: 'user',
          emailVerified: true,
        })
        console.log(`   ✅ Created user: ${user.username}`)
        createdUsers.push(user)
      }
    }

    console.log(`\n✅ ${createdUsers.length} users ready\n`)

    // ==================== STEP 3: CREATE TEST TEAMS ====================
    console.log('⚾ STEP 3: Creating test teams...\n')

    const createdTeams: any[] = []
    let playerIndex = 0

    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i]

      // Check if user already has a team for this season
      const existingTeams = await db.team.findMany({
        userId: user.id,
        seasonYear: SEASON_YEAR,
        deletedAt: null,
      })

      if (existingTeams.length > 0) {
        console.log(`   ⏭️  ${user.username} already has a team, skipping...`)
        createdTeams.push(existingTeams[0])
        playerIndex += 8
        continue
      }

      // Get 8 unique players for this team
      const teamPlayers = shuffledPlayers.slice(playerIndex, playerIndex + 8)
      playerIndex += 8

      if (teamPlayers.length < 8) {
        console.log(`   ⚠️  Not enough remaining players for ${user.username}`)
        continue
      }

      const teamName = `${user.username}'s Squad`

      const team = await db.team.create({
        name: teamName,
        userId: user.id,
        seasonYear: SEASON_YEAR,
        entryStatus: 'entered',
        paymentStatus: 'paid',
        totalHrs2024: 150, // Arbitrary value for test data
        teamPlayers: {
          create: teamPlayers.map((player, idx) => ({
            playerId: player.id,
            position: idx + 1,
          })),
        },
      })

      console.log(`   ✅ Created team: ${team.name} (${teamPlayers.length} players)`)
      createdTeams.push(team)
    }

    console.log(`\n✅ ${createdTeams.length} teams created\n`)

    // ==================== STEP 4: CREATE PLAYER STATS ====================
    console.log('📊 STEP 4: Creating player stats...\n')

    const today = new Date().toISOString().split('T')[0]
    let statsCreated = 0

    // Get all unique players from created teams
    const teamPlayerIds = new Set<string>()
    for (const team of createdTeams) {
      if (team.teamPlayers) {
        for (const tp of team.teamPlayers) {
          teamPlayerIds.add(tp.player?.id || tp.playerId)
        }
      }
    }

    // Create stats for each player with random HR counts
    for (const playerId of teamPlayerIds) {
      // Check if stats already exist
      const existingStats = await db.playerStats.findFirst({
        playerId,
        seasonYear: SEASON_YEAR,
      })

      if (existingStats) {
        continue // Skip if stats exist
      }

      // Random HR count between 5-35 for variety
      const hrsTotal = Math.floor(Math.random() * 31) + 5

      await db.playerStats.create({
        playerId,
        seasonYear: SEASON_YEAR,
        date: today,
        hrsTotal,
        hrsRegularSeason: hrsTotal,
        hrsPostseason: 0,
      })

      statsCreated++
    }

    console.log(`   ✅ Created stats for ${statsCreated} players\n`)

    // ==================== STEP 5: GENERATE LEADERBOARD ====================
    console.log('🏆 STEP 5: Generating leaderboard...\n')

    const leaderboard = await calculateOverallLeaderboard(SEASON_YEAR)

    console.log(`   ✅ Leaderboard generated with ${leaderboard.length} teams\n`)

    // Display leaderboard
    console.log('📊 LEADERBOARD PREVIEW:\n')
    console.log('   Rank | Team Name                    | HRs')
    console.log('   ' + '-'.repeat(50))

    for (const entry of leaderboard) {
      const rank = entry.rank.toString().padStart(4)
      const name = entry.teamName.substring(0, 28).padEnd(28)
      console.log(`   ${rank} | ${name} | ${entry.totalHrs}`)
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60))
    console.log('✅ TEST DATA SEEDING COMPLETE')
    console.log('='.repeat(60))
    console.log('\nSummary:')
    console.log(`  • Users: ${createdUsers.length}`)
    console.log(`  • Teams: ${createdTeams.length}`)
    console.log(`  • Player stats: ${statsCreated}`)
    console.log(`  • Leaderboard entries: ${leaderboard.length}`)
    console.log('\nYou can now view the leaderboard at /leaderboard 🚀\n')

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Run the seeder
seedTestData()
