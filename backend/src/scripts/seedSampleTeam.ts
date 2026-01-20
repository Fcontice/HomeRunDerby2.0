/**
 * Seed Sample Team Script
 * Creates a team for a specific user with a target leaderboard rank
 * Also creates 24 other sample teams to populate the leaderboard
 *
 * Usage: npx tsx src/scripts/seedSampleTeam.ts
 */

import '../env.js'
import { db } from '../services/db.js'
import { hashPassword } from '../utils/password.js'

const SEASON_YEAR = 2025
const TARGET_EMAIL = 'contifrank4@gmail.com'
const TARGET_RANK = 22
const TEAM_NAME = "Frank's Sluggers"

// Sample teams to create (24 teams, skipping rank 22)
const SAMPLE_TEAMS = [
  { username: 'homer_king', email: 'homer@sample.com', teamName: 'Dinger Dynasty', rank: 1, hrs: 156 },
  { username: 'yard_queen', email: 'yard@sample.com', teamName: 'Moonshot Mavericks', rank: 2, hrs: 148 },
  { username: 'slugger_sam', email: 'slugger@sample.com', teamName: 'Blast Brigade', rank: 3, hrs: 142 },
  { username: 'power_pete', email: 'power@sample.com', teamName: 'Power Surge', rank: 4, hrs: 138 },
  { username: 'bomb_squad', email: 'bomb@sample.com', teamName: 'Bomb Squad Elite', rank: 5, hrs: 134 },
  { username: 'fence_buster', email: 'fence@sample.com', teamName: 'Fence Busters', rank: 6, hrs: 129 },
  { username: 'long_ball', email: 'longball@sample.com', teamName: 'Long Ball Legends', rank: 7, hrs: 125 },
  { username: 'tater_tots', email: 'tater@sample.com', teamName: 'Tater Tot Crew', rank: 8, hrs: 121 },
  { username: 'grand_slam', email: 'grand@sample.com', teamName: 'Grand Slam Gang', rank: 9, hrs: 118 },
  { username: 'upper_deck', email: 'upper@sample.com', teamName: 'Upper Deck United', rank: 10, hrs: 114 },
  { username: 'jack_attack', email: 'jack@sample.com', teamName: 'Jack Attack', rank: 11, hrs: 110 },
  { username: 'big_fly', email: 'bigfly@sample.com', teamName: 'Big Fly Society', rank: 12, hrs: 106 },
  { username: 'gone_yard', email: 'gone@sample.com', teamName: 'Gone Yard Gang', rank: 13, hrs: 102 },
  { username: 'deep_shot', email: 'deep@sample.com', teamName: 'Deep Shot Crew', rank: 14, hrs: 99 },
  { username: 'moon_crew', email: 'moon@sample.com', teamName: 'To The Moon', rank: 15, hrs: 96 },
  { username: 'blast_off', email: 'blast@sample.com', teamName: 'Blast Off Boys', rank: 16, hrs: 93 },
  { username: 'launch_pad', email: 'launch@sample.com', teamName: 'Launch Pad Squad', rank: 17, hrs: 91 },
  { username: 'exit_velo', email: 'exit@sample.com', teamName: 'Exit Velo Elite', rank: 18, hrs: 89 },
  { username: 'barrel_boys', email: 'barrel@sample.com', teamName: 'Barrel Boys', rank: 19, hrs: 87 },
  { username: 'swing_kings', email: 'swing@sample.com', teamName: 'Swing Kings', rank: 20, hrs: 86 },
  { username: 'power_alley', email: 'alley@sample.com', teamName: 'Power Alley Pros', rank: 21, hrs: 85 },
  // Rank 22 is reserved for TARGET_EMAIL (84 HRs)
  { username: 'clutch_hrs', email: 'clutch@sample.com', teamName: 'Clutch Homers', rank: 23, hrs: 82 },
  { username: 'bench_mob', email: 'bench@sample.com', teamName: 'Bench Mob Mashers', rank: 24, hrs: 79 },
  { username: 'rookie_power', email: 'rookie@sample.com', teamName: 'Rookie Power', rank: 25, hrs: 75 },
]

// Distribute total HRs across 8 players (top 7 count toward team score)
function distributeHrs(totalHrs: number): number[] {
  // Create a distribution where top 7 sum to totalHrs
  // 8th player gets fewer HRs (doesn't count)
  const base = Math.floor(totalHrs / 7)
  const remainder = totalHrs % 7

  const hrs = [
    base + Math.min(remainder, 1) + 3,  // Best player gets a bit more
    base + Math.min(Math.max(remainder - 1, 0), 1) + 2,
    base + Math.min(Math.max(remainder - 2, 0), 1) + 1,
    base + Math.min(Math.max(remainder - 3, 0), 1),
    base + Math.min(Math.max(remainder - 4, 0), 1),
    base + Math.min(Math.max(remainder - 5, 0), 1) - 1,
    base + Math.min(Math.max(remainder - 6, 0), 1) - 2,
    Math.floor(base * 0.4), // 8th player - doesn't count
  ]

  return hrs.map(h => Math.max(h, 0))
}

async function createSampleTeam(
  sampleData: typeof SAMPLE_TEAMS[0],
  players: any[],
  playerIndex: number,
  hashedPassword: string,
  today: string
): Promise<number> {
  // Check if user exists
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

  // Check for existing team
  const existingTeams = await db.team.findMany({
    userId: user.id,
    seasonYear: SEASON_YEAR,
    deletedAt: null,
  })

  let teamId: string
  let teamPlayerIds: string[] = []

  if (existingTeams.length > 0) {
    teamId = existingTeams[0].id
    // Get existing team players
    const existingTeamPlayers = await db.teamPlayer.findMany({ teamId })
    teamPlayerIds = existingTeamPlayers.map(tp => tp.playerId)
  } else {
    // Get 8 players for this team
    const teamPlayers = players.slice(playerIndex, playerIndex + 8)

    if (teamPlayers.length < 8) {
      console.log(`   ⚠️  Not enough players for ${sampleData.teamName}`)
      return playerIndex
    }

    const team = await db.team.create({
      name: sampleData.teamName,
      userId: user.id,
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

    teamId = team.id
    teamPlayerIds = teamPlayers.map(p => p.id)
    playerIndex += 8
  }

  // Create player stats for each team member
  const hrDistribution = distributeHrs(sampleData.hrs)
  for (let i = 0; i < teamPlayerIds.length; i++) {
    const playerId = teamPlayerIds[i]
    const hrs = hrDistribution[i] || 0

    // Check if stats exist
    const existingStats = await db.playerStats.findFirst({
      playerId,
      seasonYear: SEASON_YEAR,
    })

    if (!existingStats) {
      await db.playerStats.create({
        playerId,
        seasonYear: SEASON_YEAR,
        date: today,
        hrsTotal: hrs,
        hrsRegularSeason: hrs,
        hrsPostseason: 0,
      })
    }
  }

  // Check if already in leaderboard
  const existingLeaderboard = await db.leaderboard.findMany({
    teamId,
    leaderboardType: 'overall',
    seasonYear: SEASON_YEAR,
  })

  if (existingLeaderboard.length > 0) {
    // Delete and recreate
    await db.leaderboard.delete({
      teamId,
      leaderboardType: 'overall',
      month: null,
    })
  }

  await db.leaderboard.create({
    teamId,
    leaderboardType: 'overall',
    month: null,
    rank: sampleData.rank,
    totalHrs: sampleData.hrs,
    seasonYear: SEASON_YEAR,
  })

  return playerIndex
}

async function seedSampleTeam() {
  console.log('\n' + '='.repeat(60))
  console.log('🌱 SEEDING LEADERBOARD DATA')
  console.log('='.repeat(60) + '\n')

  try {
    const hashedPassword = await hashPassword('TestPass123!')

    // ==================== STEP 1: GET PLAYERS ====================
    console.log('📋 STEP 1: Fetching players...\n')

    const players = await db.player.findMany({}, { take: 250 })

    if (players.length < 200) {
      console.log(`   ⚠️  Only ${players.length} players in database.`)
      console.log('   Some teams may share players (which is fine for demo).')
    }

    // Shuffle players
    const shuffledPlayers = players.sort(() => Math.random() - 0.5)
    console.log(`   ✅ Found ${players.length} players\n`)

    // ==================== STEP 2: CREATE SAMPLE TEAMS ====================
    console.log('👥 STEP 2: Creating 24 sample teams...\n')

    const today = new Date().toISOString().split('T')[0]
    let playerIndex = 0
    let teamsCreated = 0

    for (const sampleData of SAMPLE_TEAMS) {
      playerIndex = await createSampleTeam(sampleData, shuffledPlayers, playerIndex, hashedPassword, today)
      teamsCreated++
      console.log(`   ✅ Rank ${sampleData.rank}: ${sampleData.teamName} (${sampleData.hrs} HRs)`)

      // Wrap around if we run out of players
      if (playerIndex >= shuffledPlayers.length - 8) {
        playerIndex = 0
      }
    }

    console.log(`\n   Created/updated ${teamsCreated} sample teams\n`)

    // ==================== STEP 3: CREATE TARGET USER'S TEAM ====================
    console.log('⭐ STEP 3: Creating target user team...\n')

    let user = await db.user.findUnique({ email: TARGET_EMAIL })

    if (!user) {
      user = await db.user.create({
        email: TARGET_EMAIL,
        username: 'contifrank4',
        passwordHash: hashedPassword,
        role: 'user',
        emailVerified: true,
      })
      console.log(`   ✅ Created user: ${user.username}`)
    } else {
      console.log(`   ✅ Found existing user: ${user.username}`)
    }

    // Check for existing team
    const existingTeams = await db.team.findMany({
      userId: user.id,
      seasonYear: SEASON_YEAR,
      deletedAt: null,
    })

    let teamId: string
    let targetTeamPlayerIds: string[] = []
    const TARGET_HRS = 84

    if (existingTeams.length > 0) {
      teamId = existingTeams[0].id
      console.log(`   ✅ Found existing team: ${existingTeams[0].name}`)
      // Get existing team players
      const existingTeamPlayers = await db.teamPlayer.findMany({ teamId })
      targetTeamPlayerIds = existingTeamPlayers.map(tp => tp.playerId)
    } else {
      const teamPlayers = shuffledPlayers.slice(playerIndex, playerIndex + 8)

      const team = await db.team.create({
        name: TEAM_NAME,
        userId: user.id,
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

      teamId = team.id
      targetTeamPlayerIds = teamPlayers.map(p => p.id)
      console.log(`   ✅ Created team: ${team.name}`)
    }

    // Create player stats for target team
    const targetHrDistribution = distributeHrs(TARGET_HRS)
    for (let i = 0; i < targetTeamPlayerIds.length; i++) {
      const playerId = targetTeamPlayerIds[i]
      const hrs = targetHrDistribution[i] || 0

      const existingStats = await db.playerStats.findFirst({
        playerId,
        seasonYear: SEASON_YEAR,
      })

      if (!existingStats) {
        await db.playerStats.create({
          playerId,
          seasonYear: SEASON_YEAR,
          date: today,
          hrsTotal: hrs,
          hrsRegularSeason: hrs,
          hrsPostseason: 0,
        })
      }
    }

    // Update leaderboard entry
    const existingLeaderboard = await db.leaderboard.findMany({
      teamId,
      leaderboardType: 'overall',
      seasonYear: SEASON_YEAR,
    })

    if (existingLeaderboard.length > 0) {
      await db.leaderboard.delete({
        teamId,
        leaderboardType: 'overall',
        month: null,
      })
    }

    await db.leaderboard.create({
      teamId,
      leaderboardType: 'overall',
      month: null,
      rank: TARGET_RANK,
      totalHrs: TARGET_HRS,
      seasonYear: SEASON_YEAR,
    })

    console.log(`   ✅ Added to leaderboard at rank ${TARGET_RANK} (${TARGET_HRS} HRs)`)

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60))
    console.log('✅ LEADERBOARD SEEDING COMPLETE')
    console.log('='.repeat(60))
    console.log('\nLeaderboard Preview:')
    console.log('   Rank | Team                      | HRs')
    console.log('   ' + '-'.repeat(45))

    // Show top 5 and around rank 22
    const previewRanks = [1, 2, 3, 4, 5, 20, 21, 22, 23, 24, 25]
    for (const rank of previewRanks) {
      if (rank === 22) {
        console.log(`   ${rank.toString().padStart(4)} | ${TEAM_NAME.padEnd(25)} | 84  ⭐`)
      } else {
        const sample = SAMPLE_TEAMS.find(s => s.rank === rank)
        if (sample) {
          console.log(`   ${rank.toString().padStart(4)} | ${sample.teamName.padEnd(25)} | ${sample.hrs}`)
        }
      }
      if (rank === 5) console.log('        | ...                       |')
    }

    console.log('\nTotal teams in leaderboard: 25')
    console.log('\nView at /leaderboard\n')

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Run the seeder
seedSampleTeam()
