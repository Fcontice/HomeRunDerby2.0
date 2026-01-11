/**
 * Admin Routes
 * API endpoints for admin functionality
 */

import express from 'express'
import {
  getStats,
  getTeams,
  getTeamDetails,
  updateTeamStatus,
  getUsers,
  verifyUserEmail,
  sendPasswordReset,
  deleteUser,
  sendNotifications,
  endSeason,
  verifyPassword,
  getRecipientCounts,
} from '../controllers/adminController.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// All admin routes require authentication and admin role
router.use(requireAuth)
router.use(requireAdmin)

// Dashboard stats
router.get('/stats', getStats)

// Team management
router.get('/teams', getTeams)
router.get('/teams/:id', getTeamDetails)
router.patch('/teams/:id/status', updateTeamStatus)

// User management
router.get('/users', getUsers)
router.patch('/users/:id/verify', verifyUserEmail)
router.post('/users/:id/reset-password', sendPasswordReset)
router.delete('/users/:id', deleteUser)

// Notifications
router.get('/recipient-counts', getRecipientCounts)
router.post('/notifications', sendNotifications)

// Season control
router.post('/season/end', endSeason)

// Re-auth verification
router.post('/verify-password', verifyPassword)

export default router
