/**
 * Season Guard Middleware
 * Restricts actions based on the current season phase
 */

import { Request, Response, NextFunction } from 'express'
import { db } from '../services/db.js'

// Extend Express Request to include season
declare global {
  namespace Express {
    interface Request {
      season?: {
        id: string
        seasonYear: number
        phase: string
        registrationOpenDate: string | null
        registrationCloseDate: string | null
        seasonStartDate: string | null
        seasonEndDate: string | null
        isCurrentSeason: boolean
        lastPhaseChange: string
        changedBy: string | null
        createdAt: string
        updatedAt: string
      }
    }
  }
}

/**
 * Middleware factory that checks if the current season phase is allowed
 * @param allowedPhases - Array of phases that are allowed for this action
 * @returns Express middleware function
 */
export function requirePhase(allowedPhases: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const season = await db.seasonConfig.findCurrent()

      if (!season) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'NO_SEASON',
            message: 'No active season configured. Please contact support.',
          },
        })
      }

      if (!allowedPhases.includes(season.phase)) {
        // Customize message based on current phase
        let message: string
        switch (season.phase) {
          case 'off_season':
            message =
              'This action is not available during the off-season. Registration will open soon!'
            break
          case 'active':
            message =
              'This action is not available while the season is active. Teams are locked.'
            break
          case 'completed':
            message =
              'This action is not available. The season has ended. Stay tuned for next year!'
            break
          default:
            message = `This action is not available during the ${season.phase} phase.`
        }

        return res.status(403).json({
          success: false,
          error: {
            code: 'PHASE_RESTRICTED',
            message,
            currentPhase: season.phase,
            allowedPhases,
          },
        })
      }

      // Attach season to request for downstream use
      req.season = season
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware that attaches current season to request without blocking
 * Useful for routes that need season info but don't require a specific phase
 */
export async function attachSeason(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const season = await db.seasonConfig.findCurrent()
    if (season) {
      req.season = season
    }
    next()
  } catch (error) {
    // Don't fail the request if we can't get season info
    console.error('Failed to attach season:', error)
    next()
  }
}
