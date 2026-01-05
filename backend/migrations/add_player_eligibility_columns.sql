-- ============================================================
-- Add Player Eligibility Columns for 2025 Season
-- ============================================================
-- Adds missing columns to Player table for 2025 eligibility tracking
-- Run this via Supabase SQL Editor or psql
-- ============================================================

BEGIN;

-- Add seasonYear column
ALTER TABLE "Player"
ADD COLUMN IF NOT EXISTS "seasonYear" INTEGER;

-- Add hrsPreviousSeason column
ALTER TABLE "Player"
ADD COLUMN IF NOT EXISTS "hrsPreviousSeason" INTEGER DEFAULT 0;

-- Add isEligible column
ALTER TABLE "Player"
ADD COLUMN IF NOT EXISTS "isEligible" BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Player_seasonYear_idx" ON "Player"("seasonYear");
CREATE INDEX IF NOT EXISTS "Player_isEligible_idx" ON "Player"("isEligible");

-- Verify columns added
DO $$
DECLARE
  season_year_exists BOOLEAN;
  hrs_previous_exists BOOLEAN;
  is_eligible_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Player' AND column_name = 'seasonYear'
  ) INTO season_year_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Player' AND column_name = 'hrsPreviousSeason'
  ) INTO hrs_previous_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Player' AND column_name = 'isEligible'
  ) INTO is_eligible_exists;

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'COLUMN VERIFICATION:';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'seasonYear exists: %', season_year_exists;
  RAISE NOTICE 'hrsPreviousSeason exists: %', hrs_previous_exists;
  RAISE NOTICE 'isEligible exists: %', is_eligible_exists;
  RAISE NOTICE '============================================================';

  IF NOT (season_year_exists AND hrs_previous_exists AND is_eligible_exists) THEN
    RAISE EXCEPTION 'Column addition failed!';
  END IF;

  RAISE NOTICE '✅ All columns successfully added!';
END $$;

COMMIT;
