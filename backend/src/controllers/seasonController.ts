/**
 * Season Controller
 * Handles season configuration and phase management
 */

import { Request, Response, NextFunction } from 'express'
import { ValidationError, NotFoundError } from '../utils/errors.js'
import {
  createSeasonSchema,
  updateSeasonPhaseSchema,
  updateSeasonSchema,
} from '../types/validation.js'
import { db } from '../services/db.js'

/**
 * GET /api/season/current
 * Get the current season configuration (public endpoint)
 */
export async function getCurrentSeason(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const season = await db.seasonConfig.findCurrent()

    if (!season) {
      res.json({
        success: true,
        data: null,
        message: 'No current season configured',
      })
      return
    }

    res.json({
      success: true,
      data: season,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/admin/seasons
 * Get all season configurations (admin only)
 */
export async function getAllSeasons(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const seasons = await db.seasonConfig.findMany()

    res.json({
      success: true,
      data: seasons,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/seasons
 * Create a new season configuration (admin only)
 */
export async function createSeason(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const validatedData = createSeasonSchema.parse(req.body)

    // Check if season already exists
    const existing = await db.seasonConfig.findByYear(validatedData.seasonYear)
    if (existing) {
      throw new ValidationError(
        `Season ${validatedData.seasonYear} already exists`
      )
    }

    // If setting as current, the setCurrent method will handle clearing others
    const season = await db.seasonConfig.create({
      ...validatedData,
      changedBy: req.user!.userId,
    })

    // If isCurrentSeason is true, ensure no other season is current
    if (validatedData.isCurrentSeason) {
      await db.seasonConfig.setCurrent(validatedData.seasonYear)
    }

    res.status(201).json({
      success: true,
      message: `Season ${validatedData.seasonYear} created successfully`,
      data: season,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/seasons/:seasonYear/phase
 * Update the phase of a season (admin only)
 */
export async function updateSeasonPhase(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const seasonYear = parseInt(req.params.seasonYear)
    if (isNaN(seasonYear)) {
      throw new ValidationError('Invalid season year')
    }

    const validatedData = updateSeasonPhaseSchema.parse(req.body)

    // Check if season exists
    const existing = await db.seasonConfig.findByYear(seasonYear)
    if (!existing) {
      throw new NotFoundError(`Season ${seasonYear} not found`)
    }

    // Update the phase
    const season = await db.seasonConfig.updatePhase(
      seasonYear,
      validatedData.phase,
      req.user!.userId
    )

    res.json({
      success: true,
      message: `Season ${seasonYear} phase updated to ${validatedData.phase}`,
      data: season,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/seasons/:seasonYear
 * Update season dates/config (admin only)
 */
export async function updateSeason(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const seasonYear = parseInt(req.params.seasonYear)
    if (isNaN(seasonYear)) {
      throw new ValidationError('Invalid season year')
    }

    const validatedData = updateSeasonSchema.parse(req.body)

    // Check if season exists
    const existing = await db.seasonConfig.findByYear(seasonYear)
    if (!existing) {
      throw new NotFoundError(`Season ${seasonYear} not found`)
    }

    // Update the season
    const season = await db.seasonConfig.update(seasonYear, validatedData)

    res.json({
      success: true,
      message: `Season ${seasonYear} updated successfully`,
      data: season,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/seasons/:seasonYear/set-current
 * Set a season as the current season (admin only)
 */
export async function setCurrentSeason(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const seasonYear = parseInt(req.params.seasonYear)
    if (isNaN(seasonYear)) {
      throw new ValidationError('Invalid season year')
    }

    // Check if season exists
    const existing = await db.seasonConfig.findByYear(seasonYear)
    if (!existing) {
      throw new NotFoundError(`Season ${seasonYear} not found`)
    }

    // Set as current (this will clear the flag from other seasons)
    const season = await db.seasonConfig.setCurrent(seasonYear)

    res.json({
      success: true,
      message: `Season ${seasonYear} is now the current season`,
      data: season,
    })
  } catch (error) {
    next(error)
  }
}
