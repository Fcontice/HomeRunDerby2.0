import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

// Mock the db service
vi.mock('../services/db.js', () => ({
  db: {
    player: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    playerSeasonStats: {
      findMany: vi.fn(),
      findByPlayer: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    teamPlayer: {
      findMany: vi.fn(),
    },
  },
}))

// Mock supabase admin
vi.mock('../config/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          in: vi.fn(() => ({
            is: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}))

import playerRoutes from './playerRoutes.js'
import { db } from '../services/db.js'
import { errorHandler } from '../middleware/errorHandler.js'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/players', playerRoutes)
app.use(errorHandler)

describe('Player Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/players', () => {
    it('should return paginated players', async () => {
      const mockStats = [
        {
          id: 'stat-1',
          playerId: 'p1',
          seasonYear: 2025,
          hrsTotal: 62,
          teamAbbr: 'NYY',
          player: { id: 'p1', name: 'Aaron Judge', mlbId: '592450', photoUrl: null },
        },
        {
          id: 'stat-2',
          playerId: 'p2',
          seasonYear: 2025,
          hrsTotal: 54,
          teamAbbr: 'LAD',
          player: { id: 'p2', name: 'Shohei Ohtani', mlbId: '660271', photoUrl: null },
        },
      ]

      vi.mocked(db.playerSeasonStats.findMany).mockResolvedValue(mockStats as any)
      vi.mocked(db.playerSeasonStats.count).mockResolvedValue(2)

      const response = await request(app).get('/api/players')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.players).toHaveLength(2)
      expect(response.body.data.pagination.total).toBe(2)
    })

    it('should filter by team', async () => {
      vi.mocked(db.playerSeasonStats.findMany).mockResolvedValue([])
      vi.mocked(db.playerSeasonStats.count).mockResolvedValue(0)

      const response = await request(app).get('/api/players?team=NYY')

      expect(response.status).toBe(200)
      expect(db.playerSeasonStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ teamAbbr: 'NYY' }),
        expect.any(Object)
      )
    })

    it('should filter by minHrs', async () => {
      vi.mocked(db.playerSeasonStats.findMany).mockResolvedValue([])
      vi.mocked(db.playerSeasonStats.count).mockResolvedValue(0)

      const response = await request(app).get('/api/players?minHrs=20')

      expect(response.status).toBe(200)
      expect(db.playerSeasonStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          hrsTotal: expect.objectContaining({ gte: 20 }),
        }),
        expect.any(Object)
      )
    })

    it('should handle pagination', async () => {
      vi.mocked(db.playerSeasonStats.findMany).mockResolvedValue([])
      vi.mocked(db.playerSeasonStats.count).mockResolvedValue(100)

      const response = await request(app).get('/api/players?limit=10&offset=20')

      expect(response.status).toBe(200)
      expect(db.playerSeasonStats.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      )
    })
  })

  describe('GET /api/players/search', () => {
    it('should return 400 for missing search query', async () => {
      const response = await request(app).get('/api/players/search')

      expect(response.status).toBe(400)
      expect(response.body.error.message).toContain('Search query')
    })

    it('should return 400 for empty search query', async () => {
      const response = await request(app).get('/api/players/search?q=')

      expect(response.status).toBe(400)
    })

    it('should search players by name', async () => {
      const mockStats = [
        {
          id: 'stat-1',
          playerId: 'p1',
          seasonYear: 2025,
          hrsTotal: 62,
          teamAbbr: 'NYY',
          player: { id: 'p1', name: 'Aaron Judge', mlbId: '592450', photoUrl: null },
        },
      ]

      vi.mocked(db.playerSeasonStats.findMany).mockResolvedValue(mockStats as any)

      const response = await request(app).get('/api/players/search?q=Judge')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].name).toBe('Aaron Judge')
    })

    it('should be case insensitive', async () => {
      const mockStats = [
        {
          id: 'stat-1',
          playerId: 'p1',
          seasonYear: 2025,
          hrsTotal: 62,
          teamAbbr: 'NYY',
          player: { id: 'p1', name: 'Aaron Judge', mlbId: '592450' },
        },
      ]

      vi.mocked(db.playerSeasonStats.findMany).mockResolvedValue(mockStats as any)

      const response = await request(app).get('/api/players/search?q=judge')

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
    })
  })

  describe('GET /api/players/:id', () => {
    it('should return player details', async () => {
      const mockPlayer = {
        id: 'p1',
        name: 'Aaron Judge',
        mlbId: '592450',
        teamAbbr: 'NYY',
        photoUrl: null,
      }

      vi.mocked(db.player.findUnique).mockResolvedValue(mockPlayer as any)
      vi.mocked(db.playerSeasonStats.findByPlayer).mockResolvedValue([
        { seasonYear: 2025, hrsTotal: 62 },
        { seasonYear: 2024, hrsTotal: 37 },
      ] as any)
      vi.mocked(db.teamPlayer.findMany).mockResolvedValue([])

      const response = await request(app).get('/api/players/p1')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('Aaron Judge')
      expect(response.body.data.seasonHistory).toHaveLength(2)
      expect(response.body.data).toHaveProperty('draftCount')
      expect(response.body.data).toHaveProperty('capPercentage')
    })

    it('should return 404 for non-existent player', async () => {
      vi.mocked(db.player.findUnique).mockResolvedValue(null)

      const response = await request(app).get('/api/players/nonexistent')

      expect(response.status).toBe(404)
      expect(response.body.error.message).toContain('Player not found')
    })

    it('should calculate cap percentage correctly', async () => {
      vi.mocked(db.player.findUnique).mockResolvedValue({
        id: 'p1',
        name: 'Test Player',
      } as any)
      vi.mocked(db.playerSeasonStats.findByPlayer).mockResolvedValue([
        { seasonYear: 2025, hrsTotal: 34 }, // 34/172 = ~19.8%
      ] as any)
      vi.mocked(db.teamPlayer.findMany).mockResolvedValue([])

      const response = await request(app).get('/api/players/p1')

      expect(response.status).toBe(200)
      // 34/172 * 100 = 19.767... rounded to one decimal = 19.8
      expect(response.body.data.capPercentage).toBeCloseTo(19.8, 1)
    })
  })

  describe('GET /api/players/stats/summary', () => {
    it('should return player pool statistics', async () => {
      vi.mocked(db.playerSeasonStats.aggregate).mockResolvedValue({
        _count: 226,
        _avg: { hrsTotal: 25.5 },
        _max: { hrsTotal: 62 },
        _min: { hrsTotal: 10 },
      } as any)

      vi.mocked(db.playerSeasonStats.groupBy).mockResolvedValue([
        { teamAbbr: 'NYY', _count: 15 },
        { teamAbbr: 'LAD', _count: 12 },
      ] as any)

      const response = await request(app).get('/api/players/stats/summary')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.totalPlayers).toBe(226)
      expect(response.body.data.averageHRs).toBe(25.5)
      expect(response.body.data.maxHRs).toBe(62)
      expect(response.body.data.minHRs).toBe(10)
      expect(response.body.data.teamDistribution).toHaveLength(2)
    })
  })
})
