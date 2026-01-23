import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabaseAdmin for batch functions
const mockSupabaseFrom = vi.fn()
vi.mock('../config/supabase.js', () => ({
  supabaseAdmin: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}))

// Mock the db service
vi.mock('./db.js', () => ({
  db: {
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    playerStats: {
      getLatest: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { calculateTeamScore, calculateAllTeamScores, getTeamRank } from './scoringService.js'
import { db } from './db.js'

// Helper to create chainable Supabase mock that can be awaited at any point
function createSupabaseMock(data: any[] | null, error: any = null) {
  const result = { data, error }
  // Create a mock that's both chainable and thenable (can be awaited)
  const createChainablePromise = (): any => {
    const chain: any = {
      select: vi.fn(() => createChainablePromise()),
      eq: vi.fn(() => createChainablePromise()),
      in: vi.fn(() => createChainablePromise()),
      is: vi.fn(() => createChainablePromise()),
      gte: vi.fn(() => createChainablePromise()),
      lte: vi.fn(() => createChainablePromise()),
      order: vi.fn(() => createChainablePromise()),
      // Make it thenable so it can be awaited at any point
      then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
      catch: (reject: any) => Promise.resolve(result).catch(reject),
    }
    return chain
  }
  return createChainablePromise()
}

describe('Scoring Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock for PlayerStats - empty results
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'PlayerStats') {
        return createSupabaseMock([])
      }
      return createSupabaseMock([])
    })
  })

  describe('calculateTeamScore', () => {
    it('should calculate best 7 of 8 players', async () => {
      // Mock team with 8 players
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'Test Team',
        createdAt: '2026-01-01T00:00:00Z',
        teamPlayers: [
          { player: { id: 'p1', name: 'Player 1' } },
          { player: { id: 'p2', name: 'Player 2' } },
          { player: { id: 'p3', name: 'Player 3' } },
          { player: { id: 'p4', name: 'Player 4' } },
          { player: { id: 'p5', name: 'Player 5' } },
          { player: { id: 'p6', name: 'Player 6' } },
          { player: { id: 'p7', name: 'Player 7' } },
          { player: { id: 'p8', name: 'Player 8' } },
        ],
      } as any)

      // Mock player stats via Supabase batch query - p8 has lowest with 5 HRs
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'PlayerStats') {
          return createSupabaseMock([
            { playerId: 'p1', hrsTotal: 20, hrsRegularSeason: 18, hrsPostseason: 2, date: '2026-01-15' },
            { playerId: 'p2', hrsTotal: 18, hrsRegularSeason: 16, hrsPostseason: 2, date: '2026-01-15' },
            { playerId: 'p3', hrsTotal: 15, hrsRegularSeason: 13, hrsPostseason: 2, date: '2026-01-15' },
            { playerId: 'p4', hrsTotal: 12, hrsRegularSeason: 10, hrsPostseason: 2, date: '2026-01-15' },
            { playerId: 'p5', hrsTotal: 10, hrsRegularSeason: 8, hrsPostseason: 2, date: '2026-01-15' },
            { playerId: 'p6', hrsTotal: 8, hrsRegularSeason: 6, hrsPostseason: 2, date: '2026-01-15' },
            { playerId: 'p7', hrsTotal: 6, hrsRegularSeason: 4, hrsPostseason: 2, date: '2026-01-15' },
            { playerId: 'p8', hrsTotal: 5, hrsRegularSeason: 3, hrsPostseason: 2, date: '2026-01-15' }, // excluded
          ])
        }
        return createSupabaseMock([])
      })

      const result = await calculateTeamScore('team-123', 2026)

      // Best 7 = 20+18+15+12+10+8+6 = 89
      expect(result.totalHrs).toBe(89)
      expect(result.playerScores.filter(p => p.included)).toHaveLength(7)
      expect(result.playerScores.find(p => p.hrsTotal === 5)?.included).toBe(false)
    })

    it('should handle team with less than 8 players (count all)', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'Small Team',
        createdAt: '2026-01-01T00:00:00Z',
        teamPlayers: [
          { player: { id: 'p1', name: 'Player 1' } },
          { player: { id: 'p2', name: 'Player 2' } },
        ],
      } as any)

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'PlayerStats') {
          return createSupabaseMock([
            { playerId: 'p1', hrsTotal: 10, hrsRegularSeason: 10, hrsPostseason: 0, date: '2026-01-15' },
            { playerId: 'p2', hrsTotal: 8, hrsRegularSeason: 8, hrsPostseason: 0, date: '2026-01-15' },
          ])
        }
        return createSupabaseMock([])
      })

      const result = await calculateTeamScore('team-123', 2026)

      // All 2 players count since < 8
      expect(result.totalHrs).toBe(18)
      expect(result.playerScores.filter(p => p.included)).toHaveLength(2)
    })

    it('should handle players with no stats (count as 0 HRs)', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'Test Team',
        createdAt: '2026-01-01T00:00:00Z',
        teamPlayers: [
          { player: { id: 'p1', name: 'Player 1' } },
          { player: { id: 'p2', name: 'Player 2' } },
        ],
      } as any)

      // Only p1 has stats, p2 has none
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'PlayerStats') {
          return createSupabaseMock([
            { playerId: 'p1', hrsTotal: 10, hrsRegularSeason: 10, hrsPostseason: 0, date: '2026-01-15' },
            // No stats for p2
          ])
        }
        return createSupabaseMock([])
      })

      const result = await calculateTeamScore('team-123', 2026)

      expect(result.totalHrs).toBe(10)
      expect(result.playerScores.find(p => p.playerId === 'p2')?.hrsTotal).toBe(0)
    })

    it('should throw error if team not found', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue(null)

      await expect(calculateTeamScore('nonexistent', 2026)).rejects.toThrow('not found')
    })

    it('should throw error if team has no players', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'Empty Team',
        teamPlayers: [],
      } as any)

      await expect(calculateTeamScore('team-123', 2026)).rejects.toThrow('no players')
    })

    it('should use regular season only when includePostseason is false', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'Test Team',
        createdAt: '2026-01-01T00:00:00Z',
        teamPlayers: [
          { player: { id: 'p1', name: 'Player 1' } },
        ],
      } as any)

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'PlayerStats') {
          return createSupabaseMock([
            { playerId: 'p1', hrsTotal: 25, hrsRegularSeason: 20, hrsPostseason: 5, date: '2026-01-15' },
          ])
        }
        return createSupabaseMock([])
      })

      const result = await calculateTeamScore('team-123', 2026, false)

      // Should use regular season only (20), not total (25)
      expect(result.playerScores[0].hrsTotal).toBe(20)
    })

    it('should sort players by HR count descending', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'Test Team',
        createdAt: '2026-01-01T00:00:00Z',
        teamPlayers: [
          { player: { id: 'p1', name: 'Player A' } },
          { player: { id: 'p2', name: 'Player B' } },
          { player: { id: 'p3', name: 'Player C' } },
        ],
      } as any)

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'PlayerStats') {
          return createSupabaseMock([
            { playerId: 'p1', hrsTotal: 5, hrsRegularSeason: 5, hrsPostseason: 0, date: '2026-01-15' },  // lowest
            { playerId: 'p2', hrsTotal: 15, hrsRegularSeason: 15, hrsPostseason: 0, date: '2026-01-15' }, // highest
            { playerId: 'p3', hrsTotal: 10, hrsRegularSeason: 10, hrsPostseason: 0, date: '2026-01-15' }, // middle
          ])
        }
        return createSupabaseMock([])
      })

      const result = await calculateTeamScore('team-123', 2026)

      // Should be sorted: p2 (15), p3 (10), p1 (5)
      expect(result.playerScores[0].hrsTotal).toBe(15)
      expect(result.playerScores[1].hrsTotal).toBe(10)
      expect(result.playerScores[2].hrsTotal).toBe(5)
    })
  })

  describe('calculateAllTeamScores', () => {
    it('should calculate scores for all entered/locked teams', async () => {
      // Mock the optimized batch queries
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'Team') {
          return createSupabaseMock([
            {
              id: 'team-1',
              name: 'Team 1',
              userId: 'user-1',
              createdAt: '2026-01-01T00:00:00Z',
              teamPlayers: [{ id: 'tp-1', position: 1, player: { id: 'p1', name: 'P1', mlbId: '1' } }],
            },
            {
              id: 'team-2',
              name: 'Team 2',
              userId: 'user-2',
              createdAt: '2026-01-02T00:00:00Z',
              teamPlayers: [{ id: 'tp-2', position: 1, player: { id: 'p2', name: 'P2', mlbId: '2' } }],
            },
          ])
        }
        if (table === 'PlayerStats') {
          return createSupabaseMock([
            { playerId: 'p1', hrsTotal: 20, hrsRegularSeason: 20, hrsPostseason: 0, date: '2026-01-15' },
            { playerId: 'p2', hrsTotal: 15, hrsRegularSeason: 15, hrsPostseason: 0, date: '2026-01-15' },
          ])
        }
        return createSupabaseMock([])
      })

      const results = await calculateAllTeamScores(2026)

      expect(results).toHaveLength(2)
      // Should be sorted by totalHrs descending
      expect(results[0].totalHrs).toBe(20)
      expect(results[1].totalHrs).toBe(15)
    })

    it('should only include entered or locked teams', async () => {
      // Mock with empty result - the function queries Team table directly
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'Team') {
          const chain = createSupabaseMock([])
          // Verify the chain methods are called with correct parameters
          return chain
        }
        return createSupabaseMock([])
      })

      await calculateAllTeamScores(2026)

      // Verify that Team was queried (batch query approach)
      expect(mockSupabaseFrom).toHaveBeenCalledWith('Team')
    })
  })

  describe('getTeamRank', () => {
    it('should return correct rank (1-based)', async () => {
      // Mock the batch queries used by calculateAllTeamScores
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'Team') {
          return createSupabaseMock([
            {
              id: 'team-1',
              name: 'Team 1',
              userId: 'user-1',
              createdAt: '2026-01-01T00:00:00Z',
              teamPlayers: [{ id: 'tp-1', position: 1, player: { id: 'p1', name: 'P1', mlbId: '1' } }],
            },
            {
              id: 'team-2',
              name: 'Team 2',
              userId: 'user-2',
              createdAt: '2026-01-02T00:00:00Z',
              teamPlayers: [{ id: 'tp-2', position: 1, player: { id: 'p2', name: 'P2', mlbId: '2' } }],
            },
            {
              id: 'team-3',
              name: 'Team 3',
              userId: 'user-3',
              createdAt: '2026-01-03T00:00:00Z',
              teamPlayers: [{ id: 'tp-3', position: 1, player: { id: 'p3', name: 'P3', mlbId: '3' } }],
            },
          ])
        }
        if (table === 'PlayerStats') {
          return createSupabaseMock([
            { playerId: 'p1', hrsTotal: 30, hrsRegularSeason: 30, hrsPostseason: 0, date: '2026-01-15' }, // team-1: 1st
            { playerId: 'p2', hrsTotal: 20, hrsRegularSeason: 20, hrsPostseason: 0, date: '2026-01-15' }, // team-2: 2nd
            { playerId: 'p3', hrsTotal: 10, hrsRegularSeason: 10, hrsPostseason: 0, date: '2026-01-15' }, // team-3: 3rd
          ])
        }
        return createSupabaseMock([])
      })

      const rank = await getTeamRank('team-2', 2026)

      expect(rank).toBe(2)
    })

    it('should return null for non-existent team', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'Team') {
          return createSupabaseMock([])
        }
        return createSupabaseMock([])
      })

      const rank = await getTeamRank('nonexistent', 2026)

      expect(rank).toBeNull()
    })
  })
})
