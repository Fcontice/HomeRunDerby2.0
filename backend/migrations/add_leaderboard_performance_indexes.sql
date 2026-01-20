-- Migration: Add performance indexes for leaderboard queries
-- Run this in Supabase SQL Editor
-- After running: cd backend && npx prisma db pull && npx prisma generate
--
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) because Supabase SQL Editor
-- runs statements inside a transaction block. For large production tables,
-- consider running these via psql with CONCURRENTLY to avoid table locks.

-- Compound index for PlayerStats lookup (getLatest pattern)
-- This optimizes the query pattern: WHERE playerId = X AND seasonYear = Y ORDER BY date DESC
CREATE INDEX IF NOT EXISTS "idx_player_stats_player_season_date"
ON "PlayerStats" ("playerId", "seasonYear", "date" DESC);

-- Compound index for Leaderboard queries
-- This optimizes: WHERE leaderboardType = X AND seasonYear = Y ORDER BY rank
CREATE INDEX IF NOT EXISTS "idx_leaderboard_type_season_rank"
ON "Leaderboard" ("leaderboardType", "seasonYear", "rank");

-- Index for monthly leaderboard queries
-- This optimizes: WHERE leaderboardType = 'monthly' AND month = X AND seasonYear = Y
CREATE INDEX IF NOT EXISTS "idx_leaderboard_monthly"
ON "Leaderboard" ("leaderboardType", "month", "seasonYear", "rank")
WHERE "month" IS NOT NULL;

-- Index for Team deletedAt filter (soft deletes)
-- This helps with the .is('deletedAt', null) filter pattern
CREATE INDEX IF NOT EXISTS "idx_team_deleted_at"
ON "Team" ("deletedAt")
WHERE "deletedAt" IS NULL;

-- Index for TeamPlayer lookups by team
CREATE INDEX IF NOT EXISTS "idx_team_player_team_id"
ON "TeamPlayer" ("teamId");
