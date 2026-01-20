/**
 * Season Routes
 * Handles season configuration and phase management endpoints
 */

import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { cache } from '../middleware/cache.js'
import {
  getCurrentSeason,
  getAllSeasons,
  createSeason,
  updateSeasonPhase,
  updateSeason,
  setCurrentSeason,
} from '../controllers/seasonController.js'

const router = Router()

// ==================== PUBLIC ROUTES ====================

// Get current season (public - needed for frontend to check phase)
router.get('/current', cache('long'), asyncHandler(getCurrentSeason))

// ==================== ADMIN ROUTES ====================

// Get all seasons (admin only)
router.get('/', authenticate, requireAdmin, asyncHandler(getAllSeasons))

// Create a new season (admin only)
router.post('/', authenticate, requireAdmin, asyncHandler(createSeason))

// Update season phase (admin only)
router.patch(
  '/:seasonYear/phase',
  authenticate,
  requireAdmin,
  asyncHandler(updateSeasonPhase)
)

// Update season dates/config (admin only)
router.patch(
  '/:seasonYear',
  authenticate,
  requireAdmin,
  asyncHandler(updateSeason)
)

// Set season as current (admin only)
router.patch(
  '/:seasonYear/set-current',
  authenticate,
  requireAdmin,
  asyncHandler(setCurrentSeason)
)

export default router
