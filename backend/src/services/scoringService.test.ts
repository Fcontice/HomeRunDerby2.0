import { describe, it, expect, vi, beforeEach } from 'vitest'

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

describe('Scoring Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateTeamScore', () => {
    it('should calculate best 7 of 8 players', async () => {
      // Mock team with 8 players
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'Test Team',
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

      // Mock player stats - p8 has lowest with 5 HRs
      vi.mocked(db.playerStats.getLatest)
        .mockResolvedValueOnce({ hrsTotal: 20, hrsRegularSeason: 18, hrsPostseason: 2 } as any) // p1
        .mockResolvedValueOnce({ hrsTotal: 18, hrsRegularSeason: 16, hrsPostseason: 2 } as any) // p2
        .mockResolvedValueOnce({ hrsTotal: 15, hrsRegularSeason: 13, hrsPostseason: 2 } as any) // p3
        .mockResolvedValueOnce({ hrsTotal: 12, hrsRegularSeason: 10, hrsPostseason: 2 } as any) // p4
        .mockResolvedValueOnce({ hrsTotal: 10, hrsRegularSeason: 8, hrsPostseason: 2 } as any)  // p5
        .mockResolvedValueOnce({ hrsTotal: 8, hrsRegularSeason: 6, hrsPostseason: 2 } as any)   // p6
        .mockResolvedValueOnce({ hrsTotal: 6, hrsRegularSeason: 4, hrsPostseason: 2 } as any)   // p7
        .mockResolvedValueOnce({ hrsTotal: 5, hrsRegularSeason: 3, hrsPostseason: 2 } as any)   // p8 - excluded

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
        teamPlayers: [
          { player: { id: 'p1', name: 'Player 1' } },
          { player: { id: 'p2', name: 'Player 2' } },
        ],
      } as any)

      vi.mocked(db.playerStats.getLatest)
        .mockResolvedValueOnce({ hrsTotal: 10, hrsRegularSeason: 10, hrsPostseason: 0 } as any)
        .mockResolvedValueOnce({ hrsTotal: 8, hrsRegularSeason: 8, hrsPostseason: 0 } as any)

      const result = await calculateTeamScore('team-123', 2026)

      // All 2 players count since < 8
      expect(result.totalHrs).toBe(18)
      expect(result.playerScores.filter(p => p.included)).toHaveLength(2)
    })

    it('should handle players with no stats (count as 0 HRs)', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'Test Team',
        teamPlayers: [
          { player: { id: 'p1', name: 'Player 1' } },
          { player: { id: 'p2', name: 'Player 2' } },
        ],
      } as any)

      vi.mocked(db.playerStats.getLatest)
        .mockResolvedValueOnce({ hrsTotal: 10, hrsRegularSeason: 10, hrsPostseason: 0 } as any)
        .mockResolvedValueOnce(null) // No stats for p2

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
        teamPlayers: [
          { player: { id: 'p1', name: 'Player 1' } },
        ],
      } as any)

      vi.mocked(db.playerStats.getLatest).mockResolvedValue({
        hrsTotal: 25,
        hrsRegularSeason: 20,
        hrsPostseason: 5,
      } as any)

      const result = await calculateTeamScore('team-123', 2026, false)

      // Should use regular season only (20), not total (25)
      expect(result.playerScores[0].hrsTotal).toBe(20)
    })

    it('should sort players by HR count descending', async () => {
      vi.mocked(db.team.findUnique).mockResolvedValue({
        id: 'team-123',
        name: 'Test Team',
        teamPlayers: [
          { player: { id: 'p1', name: 'Player A' } },
          { player: { id: 'p2', name: 'Player B' } },
          { player: { id: 'p3', name: 'Player C' } },
        ],
      } as any)

      vi.mocked(db.playerStats.getLatest)
        .mockResolvedValueOnce({ hrsTotal: 5, hrsRegularSeason: 5, hrsPostseason: 0 } as any)  // p1 - lowest
        .mockResolvedValueOnce({ hrsTotal: 15, hrsRegularSeason: 15, hrsPostseason: 0 } as any) // p2 - highest
        .mockResolvedValueOnce({ hrsTotal: 10, hrsRegularSeason: 10, hrsPostseason: 0 } as any) // p3 - middle

      const result = await calculateTeamScore('team-123', 2026)

      // Should be sorted: p2 (15), p3 (10), p1 (5)
      expect(result.playerScores[0].hrsTotal).toBe(15)
      expect(result.playerScores[1].hrsTotal).toBe(10)
      expect(result.playerScores[2].hrsTotal).toBe(5)
    })
  })

  describe('calculateAllTeamScores', () => {
    it('should calculate scores for all entered/locked teams', async () => {
      vi.mocked(db.team.findMany).mockResolvedValue([
        { id: 'team-1', name: 'Team 1' },
        { id: 'team-2', name: 'Team 2' },
      ] as any)

      // Mock team data for each team
      vi.mocked(db.team.findUnique)
        .mockResolvedValueOnce({
          id: 'team-1',
          name: 'Team 1',
          teamPlayers: [{ player: { id: 'p1', name: 'P1' } }],
        } as any)
        .mockResolvedValueOnce({
          id: 'team-2',
          name: 'Team 2',
          teamPlayers: [{ player: { id: 'p2', name: 'P2' } }],
        } as any)

      vi.mocked(db.playerStats.getLatest)
        .mockResolvedValueOnce({ hrsTotal: 20, hrsRegularSeason: 20, hrsPostseason: 0 } as any)
        .mockResolvedValueOnce({ hrsTotal: 15, hrsRegularSeason: 15, hrsPostseason: 0 } as any)

      const results = await calculateAllTeamScores(2026)

      expect(results).toHaveLength(2)
      // Should be sorted by totalHrs descending
      expect(results[0].totalHrs).toBe(20)
      expect(results[1].totalHrs).toBe(15)
    })

    it('should only include entered or locked teams', async () => {
      vi.mocked(db.team.findMany).mockResolvedValue([])

      await calculateAllTeamScores(2026)

      expect(db.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          entryStatus: { in: ['entered', 'locked'] },
          deletedAt: null,
        })
      )
    })
  })

  describe('getTeamRank', () => {
    it('should return correct rank (1-based)', async () => {
      vi.mocked(db.team.findMany).mockResolvedValue([
        { id: 'team-1', name: 'Team 1' },
        { id: 'team-2', name: 'Team 2' },
        { id: 'team-3', name: 'Team 3' },
      ] as any)

      // Mock for calculateAllTeamScores -> calculateTeamScore calls
      vi.mocked(db.team.findUnique)
        .mockResolvedValueOnce({
          id: 'team-1',
          name: 'Team 1',
          teamPlayers: [{ player: { id: 'p1', name: 'P1' } }],
        } as any)
        .mockResolvedValueOnce({
          id: 'team-2',
          name: 'Team 2',
          teamPlayers: [{ player: { id: 'p2', name: 'P2' } }],
        } as any)
        .mockResolvedValueOnce({
          id: 'team-3',
          name: 'Team 3',
          teamPlayers: [{ player: { id: 'p3', name: 'P3' } }],
        } as any)

      vi.mocked(db.playerStats.getLatest)
        .mockResolvedValueOnce({ hrsTotal: 30, hrsRegularSeason: 30, hrsPostseason: 0 } as any) // team-1: 1st
        .mockResolvedValueOnce({ hrsTotal: 20, hrsRegularSeason: 20, hrsPostseason: 0 } as any) // team-2: 2nd
        .mockResolvedValueOnce({ hrsTotal: 10, hrsRegularSeason: 10, hrsPostseason: 0 } as any) // team-3: 3rd

      const rank = await getTeamRank('team-2', 2026)

      expect(rank).toBe(2)
    })

    it('should return null for non-existent team', async () => {
      vi.mocked(db.team.findMany).mockResolvedValue([])

      const rank = await getTeamRank('nonexistent', 2026)

      expect(rank).toBeNull()
    })
  })
})
