-- Add seasonYear column to Leaderboard table
-- Required for filtering leaderboards by season

ALTER TABLE "Leaderboard" ADD COLUMN IF NOT EXISTS "seasonYear" integer NOT NULL DEFAULT 2025;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "Leaderboard_seasonYear_idx" ON "Leaderboard" ("seasonYear");

-- Update composite index for better query performance
CREATE INDEX IF NOT EXISTS "Leaderboard_type_season_idx" ON "Leaderboard" ("leaderboardType", "seasonYear");
