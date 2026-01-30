-- Migration: Add hrsDaily column to PlayerStats
-- Purpose: Track daily HR count for simpler monthly calculations and "yesterday's HR hitters" feature
--
-- Previously: Monthly HRs required 2 queries (end of month cumulative - previous month cumulative)
-- After: Monthly HRs = SUM(hrsDaily) in date range (1 simple query)

-- Step 1: Add hrsDaily column to track daily HR count
ALTER TABLE "PlayerStats" ADD COLUMN "hrsDaily" integer NOT NULL DEFAULT 0;

-- Step 2: Create index optimized for monthly aggregation queries
-- Using covering index to include hrsDaily so SUM queries can be index-only scans
CREATE INDEX idx_player_stats_monthly_sum
  ON "PlayerStats"("seasonYear", "date")
  INCLUDE ("hrsDaily", "playerId");

-- Step 3: (Optional) Backfill existing data
-- This calculates daily HRs from cumulative differences for historical data
-- Note: This is a one-time operation and may take a while on large datasets
--
-- WITH ordered_stats AS (
--   SELECT
--     id,
--     "playerId",
--     "seasonYear",
--     date,
--     "hrsTotal",
--     LAG("hrsTotal", 1, 0) OVER (
--       PARTITION BY "playerId", "seasonYear"
--       ORDER BY date
--     ) as prev_total
--   FROM "PlayerStats"
-- )
-- UPDATE "PlayerStats" ps
-- SET "hrsDaily" = GREATEST(0, os."hrsTotal" - os.prev_total)
-- FROM ordered_stats os
-- WHERE ps.id = os.id;

COMMENT ON COLUMN "PlayerStats"."hrsDaily" IS 'Home runs hit on this specific date (not cumulative)';
