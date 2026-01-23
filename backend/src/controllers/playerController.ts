/**
 * Player Controller
 * Handles all player-related API requests
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { db } from '../services/db.js';
import { supabaseAdmin } from '../config/supabase.js';
import { playerCache } from '../services/playerCache.js';
// Entity types imported for reference, actual types inferred from db methods

/**
 * GET /api/players
 * Get all eligible players with optional filters
 * Query params:
 *   - seasonYear: number (default: 2025)
 *   - minHrs: number (default: 10)
 *   - maxHrs: number (optional)
 *   - team: string (team abbreviation, optional)
 *   - search: string (search player name, optional)
 *   - sortBy: 'name' | 'hrs' | 'team' (default: 'hrs')
 *   - sortOrder: 'asc' | 'desc' (default: 'desc')
 *   - limit: number (default: 500)
 *   - offset: number (default: 0)
 */
export async function getPlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      seasonYear = '2025',
      minHrs = '10',
      maxHrs,
      team,
      search,
      sortBy = 'hrs',
      sortOrder = 'desc',
      limit = '500',
      offset = '0',
    } = req.query;

    // Generate cache key from query params
    const cacheKey = playerCache.generateKey({
      seasonYear,
      minHrs,
      maxHrs: maxHrs || '',
      team: team || '',
      search: search || '',
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    // Check cache first
    const cached = playerCache.get<{
      players: unknown[];
      pagination: { total: number; limit: number; offset: number; hasMore: boolean };
    }>(cacheKey);

    if (cached) {
      res.json({
        success: true,
        data: cached,
      });
      return;
    }

    // Build where clause for PlayerSeasonStats
    const where: Record<string, unknown> = {
      seasonYear: parseInt(seasonYear as string),
      hrsTotal: {
        gte: parseInt(minHrs as string),
      },
    };

    if (maxHrs) {
      (where.hrsTotal as Record<string, number>).lte = parseInt(maxHrs as string);
    }

    if (team) {
      where.teamAbbr = (team as string).toUpperCase();
    }

    // Build orderBy clause
    let orderBy: Record<string, unknown> = {};
    if (sortBy === 'name') {
      orderBy = { player: { name: sortOrder } };
    } else if (sortBy === 'team') {
      orderBy = { teamAbbr: sortOrder };
    } else {
      orderBy = { hrsTotal: sortOrder };
    }

    // Fetch player season stats
    let playerSeasonStats = await db.playerSeasonStats.findMany(where, {
      orderBy,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Apply name search filter if provided (post-query since we need to search on joined player)
    if (search) {
      const searchLower = (search as string).toLowerCase();
      playerSeasonStats = playerSeasonStats.filter((stat) =>
        stat.player?.name?.toLowerCase().includes(searchLower)
      );
    }

    const totalCount = await db.playerSeasonStats.count(where);

    // Transform data to match expected response format
    const players = playerSeasonStats.map((stat) => ({
      id: stat.player?.id,
      mlbId: stat.player?.mlbId,
      name: stat.player?.name,
      teamAbbr: stat.teamAbbr,
      photoUrl: stat.player?.photoUrl,
      seasonYear: stat.seasonYear,
      hrsTotal: stat.hrsTotal,
      createdAt: stat.createdAt,
      updatedAt: stat.updatedAt,
    }));

    const responseData = {
      players,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + players.length < totalCount,
      },
    };

    // Cache the result for 5 minutes
    playerCache.set(cacheKey, responseData);

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/players/:id
 * Get a single player by ID with season history and draft context
 */
export async function getPlayerById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Check cache first (2-minute TTL since draftCount can change)
    const cacheKey = `player:${id}`;
    const cached = playerCache.get<object>(cacheKey);
    if (cached) {
      res.json({
        success: true,
        data: cached,
      });
      return;
    }

    const player = await db.player.findUnique(
      { id },
      { teamPlayers: true }
    );

    if (!player) {
      throw new NotFoundError('Player not found');
    }

    // Get player's season history
    const seasonHistory = await db.playerSeasonStats.findByPlayer(id);

    // Get latest season stats for eligibility display
    const latestSeasonStats = seasonHistory.length > 0
      ? seasonHistory.sort((a, b) => b.seasonYear - a.seasonYear)[0]
      : null;

    // Count how many teams (paid or locked) have drafted this player
    const teamPlayers = await db.teamPlayer.findMany({ playerId: id });

    let draftCount = 0;
    if (teamPlayers.length > 0) {
      const teamIds = teamPlayers.map((tp) => tp.teamId);

      // Use Supabase client directly since teamDb.findMany doesn't support these filters
      const { data: teams, error: teamsError } = await supabaseAdmin
        .from('Team')
        .select('id')
        .in('id', teamIds)
        .in('paymentStatus', ['paid'])
        .in('entryStatus', ['entered', 'locked'])
        .is('deletedAt', null);

      if (teamsError) throw teamsError;
      draftCount = teams?.length || 0;
    }

    // Calculate cap percentage (based on latest season HRs)
    const hrsTotal = latestSeasonStats?.hrsTotal || 0;
    const capPercentage = Math.round((hrsTotal / 172) * 1000) / 10; // One decimal place

    const responseData = {
      ...player,
      seasonHistory,
      draftCount,
      latestSeasonStats: latestSeasonStats ? {
        seasonYear: latestSeasonStats.seasonYear,
        hrsTotal: latestSeasonStats.hrsTotal,
        isEligible: latestSeasonStats.hrsTotal >= 10
      } : null,
      capPercentage
    };

    // Cache for 2 minutes (shorter TTL since draftCount can change with new teams)
    playerCache.set(cacheKey, responseData, 2 * 60 * 1000);

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/players/search
 * Search players by name
 * Query params:
 *   - q: string (search query, required)
 *   - seasonYear: number (default: 2025)
 *   - limit: number (default: 20)
 */
export async function searchPlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, seasonYear = '2025', limit = '20' } = req.query;

    if (!q || (q as string).trim().length === 0) {
      throw new ValidationError('Search query (q) is required');
    }

    // Get player season stats for the specified year
    let playerSeasonStats = await db.playerSeasonStats.findMany(
      {
        seasonYear: parseInt(seasonYear as string),
        hrsTotal: { gte: 10 },
      },
      {
        orderBy: { hrsTotal: 'desc' },
        take: parseInt(limit as string) * 3, // Get more to filter by name
      }
    );

    // Filter by player name (post-query since we need to search on joined player)
    const searchLower = (q as string).toLowerCase();
    const filteredStats = playerSeasonStats
      .filter((stat) => stat.player?.name?.toLowerCase().includes(searchLower))
      .slice(0, parseInt(limit as string));

    // Transform to expected format
    const players = filteredStats.map((stat) => ({
      id: stat.player?.id,
      mlbId: stat.player?.mlbId,
      name: stat.player?.name,
      teamAbbr: stat.teamAbbr,
      photoUrl: stat.player?.photoUrl,
      seasonYear: stat.seasonYear,
      hrsTotal: stat.hrsTotal,
    }));

    res.json({
      success: true,
      data: players,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/players/stats/summary
 * Get player pool summary statistics
 * Query params:
 *   - seasonYear: number (default: 2025)
 */
export async function getPlayerStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { seasonYear = '2025' } = req.query;

    const stats = await db.playerSeasonStats.aggregate({
      where: {
        seasonYear: parseInt(seasonYear as string),
        hrsTotal: { gte: 10 },
      },
      _count: true,
      _avg: {
        hrsTotal: true,
      },
      _max: {
        hrsTotal: true,
      },
      _min: {
        hrsTotal: true,
      },
    });

    // Get team distribution
    const teamDistribution = await db.playerSeasonStats.groupBy({
      by: ['teamAbbr'],
      where: {
        seasonYear: parseInt(seasonYear as string),
        hrsTotal: { gte: 10 },
      },
      _count: true,
      orderBy: {
        _count: {
          teamAbbr: 'desc',
        },
      },
    });

    res.json({
      success: true,
      data: {
        totalPlayers: stats._count,
        averageHRs: Math.round((stats._avg?.hrsTotal || 0) * 10) / 10,
        maxHRs: stats._max?.hrsTotal,
        minHRs: stats._min?.hrsTotal,
        teamDistribution: teamDistribution.map((t) => ({
          team: t.teamAbbr,
          count: t._count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
