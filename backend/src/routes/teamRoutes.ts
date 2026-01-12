/**
 * Team Routes
 * API endpoints for team management
 */

import express from 'express';
import {
  createTeam,
  getTeam,
  getMyTeams,
  updateTeam,
  deleteTeam,
} from '../controllers/teamController.js';
import { requireAuth, requireEmailVerified } from '../middleware/auth.js';
import { requirePhase } from '../middleware/seasonGuard.js';

const router = express.Router();

/**
 * Protected Routes
 * All team routes require authentication
 */

// POST /api/teams - Create a new team (registration phase only)
router.post('/', requireAuth, requireEmailVerified, requirePhase(['registration']), createTeam);

// GET /api/teams/my-teams - Get current user's teams
router.get('/my-teams', requireAuth, getMyTeams);

// GET /api/teams/:id - Get team by ID (public)
router.get('/:id', getTeam);

// PATCH /api/teams/:id - Update team (registration phase only, before lock)
router.patch('/:id', requireAuth, requirePhase(['registration']), updateTeam);

// DELETE /api/teams/:id - Delete team (registration phase only, before lock, soft delete)
router.delete('/:id', requireAuth, requirePhase(['registration']), deleteTeam);

export default router;
