import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'
import {
  checkUsername,
  completeProfile,
  updateProfile,
  deleteAccount,
} from '../controllers/userController.js'

const router = Router()

/**
 * GET /api/users/check-username/:username
 * Check if a username is available
 * Protected - requires authentication
 */
router.get('/check-username/:username', authenticate, asyncHandler(checkUsername))

/**
 * POST /api/users/complete-profile
 * Complete profile for new Google OAuth users
 * Protected - requires authentication
 */
router.post('/complete-profile', authenticate, asyncHandler(completeProfile))

/**
 * PATCH /api/users/me
 * Update current user's profile
 * Protected - requires authentication
 */
router.patch('/me', authenticate, asyncHandler(updateProfile))

/**
 * DELETE /api/users/me
 * Delete current user's account (soft delete)
 * Protected - requires authentication
 */
router.delete('/me', authenticate, asyncHandler(deleteAccount))

export default router
