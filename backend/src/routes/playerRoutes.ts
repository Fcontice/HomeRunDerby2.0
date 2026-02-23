/**
 * Player Routes
 * API endpoints for player data
 */

import express from 'express';
import {
  getPlayers,
  getPlayerById,
  searchPlayers,
  getPlayerStats,
  getRecentHRs,
} from '../controllers/playerController.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

/**
 * Public Routes
 * All player routes are public - no authentication required
 * Users need to see players before creating teams
 */

// GET /api/players - Get all eligible players (with filters)
router.get('/', cache('medium'), getPlayers);

// GET /api/players/recent-hrs - Get yesterday's home runs (Dinger Jumbotron)
router.get('/recent-hrs', cache('medium'), getRecentHRs);

// GET /api/players/search - Search players by name
router.get('/search', cache('short'), searchPlayers);

// GET /api/players/stats/summary - Get player pool statistics
router.get('/stats/summary', cache('medium'), getPlayerStats);

// GET /api/players/:id - Get single player by ID
router.get('/:id', cache('medium'), getPlayerById);

export default router;
