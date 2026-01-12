-- Migration: Add SeasonConfig table for off-season mode
-- Date: 2026-01-12
-- Description: Creates SeasonConfig table to track season phases and enable off-season mode

-- Create SeasonConfig table
CREATE TABLE "SeasonConfig" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "seasonYear" INTEGER NOT NULL UNIQUE,
  "phase" TEXT NOT NULL DEFAULT 'off_season',

  -- Phase dates for reference
  "registrationOpenDate" DATE,
  "registrationCloseDate" DATE,
  "seasonStartDate" DATE,
  "seasonEndDate" DATE,

  -- Current season flag
  "isCurrentSeason" BOOLEAN DEFAULT false,

  -- Audit trail
  "lastPhaseChange" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "changedBy" TEXT REFERENCES "User"("id"),

  "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SeasonConfig_phase_check"
  CHECK ("phase" IN ('off_season', 'registration', 'active', 'completed'))
);

-- Ensure only one current season at a time
CREATE UNIQUE INDEX "SeasonConfig_isCurrentSeason_unique"
ON "SeasonConfig"("isCurrentSeason")
WHERE "isCurrentSeason" = true;

-- Index for quick lookups by season year
CREATE INDEX "SeasonConfig_seasonYear_idx" ON "SeasonConfig"("seasonYear");

-- Grant permissions
GRANT SELECT ON "SeasonConfig" TO anon;
GRANT SELECT ON "SeasonConfig" TO authenticated;
GRANT ALL ON "SeasonConfig" TO service_role;

-- Insert initial season config for 2026 (current contest year)
INSERT INTO "SeasonConfig" (
  "seasonYear",
  "phase",
  "isCurrentSeason",
  "registrationOpenDate",
  "registrationCloseDate",
  "seasonStartDate",
  "seasonEndDate"
) VALUES (
  2026,
  'registration',
  true,
  '2026-03-15',
  '2026-03-25',
  '2026-03-28',
  '2026-10-30'
);
