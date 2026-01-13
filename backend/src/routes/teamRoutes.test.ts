import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

// Store mock user for tests
let mockUser: any = null

// Mock the db service
vi.mock('../services/db.js', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamPlayer: {
      findMany: vi.fn(),
    },
    player: {
      findMany: vi.fn(),
    },
    playerSeasonStats: {
      findMany: vi.fn(),
    },
    seasonConfig: {
      findFirst: vi.fn(),
      findCurrent: vi.fn(),
    },
  },
}))

// Mock supabase admin to prevent real connections
vi.mock('../config/supabase.js', () => ({
  default: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        match: vi.fn(() => ({
          is: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
  },
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        match: vi.fn(() => ({
          is: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
  },
}))

// Mock JWT utils to allow test authentication
vi.mock('../utils/jwt.js', () => ({
  verifyToken: vi.fn((token: string) => {
    // Return the mockUser if set, otherwise throw
    if (mockUser) {
      return mockUser
    }
    throw new Error('Invalid or expired token')
  }),
  generateAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
}))

import teamRoutes from './teamRoutes.js'
import { db } from '../services/db.js'
import { errorHandler } from '../middleware/errorHandler.js'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/teams', teamRoutes)
app.use(errorHandler)

// Valid UUIDs for testing
const PLAYER_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
]

describe('Team Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null

    // Default: registration phase active
    vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
      phase: 'registration',
      seasonYear: 2026,
      isCurrentSeason: true,
    } as any)
  })

  describe('GET /api/teams/:id', () => {
    it('should return team details (public route)', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'My Team',
        userId: 'user-456',
        seasonYear: 2026,
        paymentStatus: 'paid',
        entryStatus: 'entered',
      } as any)

      const response = await request(app).get('/api/teams/team-123')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('My Team')
    })

    it('should return 404 for non-existent team', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue(null)

      const response = await request(app).get('/api/teams/nonexistent')

      expect(response.status).toBe(404)
      expect(response.body.error.message).toContain('Team not found')
    })
  })

  describe('GET /api/teams/my-teams', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/teams/my-teams')

      expect(response.status).toBe(401)
    })

    it('should return user teams when authenticated', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.team.findMany).mockResolvedValue([
        { id: 'team-1', name: 'Team 1', userId: 'user-123' },
        { id: 'team-2', name: 'Team 2', userId: 'user-123' },
      ] as any)

      const response = await request(app)
        .get('/api/teams/my-teams')
        .set('Authorization', 'Bearer mock-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
    })

    it('should filter by seasonYear', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.team.findMany).mockResolvedValue([])

      await request(app)
        .get('/api/teams/my-teams?seasonYear=2026')
        .set('Authorization', 'Bearer mock-token')

      expect(db.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          seasonYear: 2026,
        }),
        expect.any(Object)
      )
    })
  })

  describe('POST /api/teams', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({
          name: 'My Team',
          seasonYear: 2026,
          playerIds: PLAYER_IDS,
        })

      expect(response.status).toBe(401)
    })

    it('should return 403 during off_season phase', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
        phase: 'off_season',
        seasonYear: 2026,
      } as any)

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: 'My Team',
          seasonYear: 2026,
          playerIds: PLAYER_IDS,
        })

      expect(response.status).toBe(403)
    })

    it('should return 400 for invalid team name', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-123',
        emailVerified: true,
      } as any)

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: '', // Empty name
          seasonYear: 2026,
          playerIds: PLAYER_IDS,
        })

      expect(response.status).toBe(400)
    })

    it('should return 400 for wrong number of players', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-123',
        emailVerified: true,
      } as any)

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: 'My Team',
          seasonYear: 2026,
          playerIds: PLAYER_IDS.slice(0, 3), // Only 3 players
        })

      expect(response.status).toBe(400)
      expect(response.body.error.message).toContain('8 players')
    })

    it('should return 400 for duplicate players', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-123',
        emailVerified: true,
      } as any)

      const duplicatePlayerIds = [PLAYER_IDS[0], PLAYER_IDS[0], ...PLAYER_IDS.slice(2)]

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: 'My Team',
          seasonYear: 2026,
          playerIds: duplicatePlayerIds, // First player duplicated
        })

      expect(response.status).toBe(400)
      expect(response.body.error.message).toContain('duplicate')
    })

    it('should create team successfully', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-123',
        emailVerified: true,
      } as any)

      // Mock player stats for eligibility
      vi.mocked(db.playerSeasonStats.findMany).mockResolvedValue([
        { playerId: PLAYER_IDS[0], seasonYear: 2025, hrsTotal: 20 },
        { playerId: PLAYER_IDS[1], seasonYear: 2025, hrsTotal: 22 },
        { playerId: PLAYER_IDS[2], seasonYear: 2025, hrsTotal: 18 },
        { playerId: PLAYER_IDS[3], seasonYear: 2025, hrsTotal: 25 },
        { playerId: PLAYER_IDS[4], seasonYear: 2025, hrsTotal: 15 },
        { playerId: PLAYER_IDS[5], seasonYear: 2025, hrsTotal: 20 },
        { playerId: PLAYER_IDS[6], seasonYear: 2025, hrsTotal: 22 },
        { playerId: PLAYER_IDS[7], seasonYear: 2025, hrsTotal: 18 }, // Total: 160, under 172
      ] as any)

      vi.mocked(db.team.create).mockResolvedValue({
        id: 'new-team-id',
        name: 'My Team',
        userId: 'user-123',
        seasonYear: 2026,
        paymentStatus: 'draft',
        entryStatus: 'draft',
      } as any)

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: 'My Team',
          seasonYear: 2026,
          playerIds: PLAYER_IDS,
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('My Team')
    })

    it('should return 400 if HR total exceeds 172', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-123',
        emailVerified: true,
      } as any)

      // Mock player stats with high HR totals
      vi.mocked(db.playerSeasonStats.findMany).mockResolvedValue([
        { playerId: PLAYER_IDS[0], seasonYear: 2025, hrsTotal: 40 },
        { playerId: PLAYER_IDS[1], seasonYear: 2025, hrsTotal: 35 },
        { playerId: PLAYER_IDS[2], seasonYear: 2025, hrsTotal: 30 },
        { playerId: PLAYER_IDS[3], seasonYear: 2025, hrsTotal: 25 },
        { playerId: PLAYER_IDS[4], seasonYear: 2025, hrsTotal: 20 },
        { playerId: PLAYER_IDS[5], seasonYear: 2025, hrsTotal: 15 },
        { playerId: PLAYER_IDS[6], seasonYear: 2025, hrsTotal: 12 },
        { playerId: PLAYER_IDS[7], seasonYear: 2025, hrsTotal: 10 }, // Total: 187, exceeds 172
      ] as any)

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: 'My Team',
          seasonYear: 2026,
          playerIds: PLAYER_IDS,
        })

      expect(response.status).toBe(400)
      expect(response.body.error.message).toContain('exceeds HR limit')
    })
  })

  describe('PATCH /api/teams/:id', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .patch('/api/teams/team-123')
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(401)
    })

    it('should return 403 if not team owner', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        userId: 'other-user', // Different user
        entryStatus: 'draft',
      } as any)

      const response = await request(app)
        .patch('/api/teams/team-123')
        .set('Authorization', 'Bearer mock-token')
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(403)
    })

    it('should return 403 if team is locked', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        userId: 'user-123',
        entryStatus: 'locked', // Locked team
      } as any)

      const response = await request(app)
        .patch('/api/teams/team-123')
        .set('Authorization', 'Bearer mock-token')
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(403)
      expect(response.body.error.message).toContain('locked')
    })

    it('should update team name successfully', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        userId: 'user-123',
        entryStatus: 'draft',
        seasonYear: 2026,
      } as any)

      vi.mocked(db.team.update).mockResolvedValue({
        id: 'team-123',
        name: 'Updated Name',
        userId: 'user-123',
      } as any)

      const response = await request(app)
        .patch('/api/teams/team-123')
        .set('Authorization', 'Bearer mock-token')
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('DELETE /api/teams/:id', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).delete('/api/teams/team-123')

      expect(response.status).toBe(401)
    })

    it('should return 403 if not team owner', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        userId: 'other-user',
        entryStatus: 'draft',
      } as any)

      const response = await request(app)
        .delete('/api/teams/team-123')
        .set('Authorization', 'Bearer mock-token')

      expect(response.status).toBe(403)
    })

    it('should return 403 if team is locked', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        userId: 'user-123',
        entryStatus: 'locked',
      } as any)

      const response = await request(app)
        .delete('/api/teams/team-123')
        .set('Authorization', 'Bearer mock-token')

      expect(response.status).toBe(403)
    })

    it('should delete team successfully', async () => {
      mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' }

      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        userId: 'user-123',
        entryStatus: 'draft',
      } as any)

      vi.mocked(db.team.delete).mockResolvedValue({} as any)

      const response = await request(app)
        .delete('/api/teams/team-123')
        .set('Authorization', 'Bearer mock-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('deleted')
    })
  })
})
