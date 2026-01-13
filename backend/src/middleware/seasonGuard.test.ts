import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'

// Mock the db service
vi.mock('../services/db.js', () => ({
  db: {
    seasonConfig: {
      findCurrent: vi.fn(),
    },
  },
}))

import { requirePhase, attachSeason } from './seasonGuard.js'
import { db } from '../services/db.js'

// Helper to create mock request
function createMockRequest(): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
  }
}

// Helper to create mock response
function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('Season Guard Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requirePhase', () => {
    it('should allow request when phase matches', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
        id: 'season-123',
        seasonYear: 2026,
        phase: 'registration',
        isCurrentSeason: true,
      } as any)

      const middleware = requirePhase(['registration'])
      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect((req as any).season).toBeDefined()
      expect((req as any).season.phase).toBe('registration')
    })

    it('should allow request when phase is in multiple allowed phases', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
        id: 'season-123',
        seasonYear: 2026,
        phase: 'active',
        isCurrentSeason: true,
      } as any)

      const middleware = requirePhase(['registration', 'active'])
      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
    })

    it('should block request when phase does not match', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
        id: 'season-123',
        seasonYear: 2026,
        phase: 'off_season',
        isCurrentSeason: true,
      } as any)

      const middleware = requirePhase(['registration'])
      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'PHASE_RESTRICTED',
            currentPhase: 'off_season',
          }),
        })
      )
    })

    it('should return 503 when no season config exists', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue(null)

      const middleware = requirePhase(['registration'])
      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(503)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NO_SEASON',
          }),
        })
      )
    })

    it('should show off_season specific message', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
        id: 'season-123',
        seasonYear: 2026,
        phase: 'off_season',
      } as any)

      const middleware = requirePhase(['registration'])
      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('off-season'),
          }),
        })
      )
    })

    it('should show active phase specific message', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
        id: 'season-123',
        seasonYear: 2026,
        phase: 'active',
      } as any)

      const middleware = requirePhase(['registration'])
      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('Teams are locked'),
          }),
        })
      )
    })

    it('should show completed phase specific message', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
        id: 'season-123',
        seasonYear: 2026,
        phase: 'completed',
      } as any)

      const middleware = requirePhase(['registration'])
      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('season has ended'),
          }),
        })
      )
    })

    it('should call next with error when database fails', async () => {
      const dbError = new Error('Database connection failed')
      vi.mocked(db.seasonConfig.findCurrent).mockRejectedValue(dbError)

      const middleware = requirePhase(['registration'])
      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(dbError)
    })

    it('should include allowedPhases in error response', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
        id: 'season-123',
        phase: 'off_season',
      } as any)

      const allowedPhases = ['registration', 'active']
      const middleware = requirePhase(allowedPhases)
      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            allowedPhases,
          }),
        })
      )
    })
  })

  describe('attachSeason', () => {
    it('should attach season to request without blocking', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue({
        id: 'season-123',
        seasonYear: 2026,
        phase: 'registration',
      } as any)

      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await attachSeason(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect((req as any).season).toBeDefined()
      expect((req as any).season.seasonYear).toBe(2026)
    })

    it('should continue even if no season exists', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockResolvedValue(null)

      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await attachSeason(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect((req as any).season).toBeUndefined()
    })

    it('should continue even if database fails (graceful degradation)', async () => {
      vi.mocked(db.seasonConfig.findCurrent).mockRejectedValue(new Error('DB error'))

      const req = createMockRequest()
      const res = createMockResponse()
      const next = vi.fn()

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await attachSeason(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalledWith(expect.any(Error))

      consoleSpy.mockRestore()
    })
  })
})
