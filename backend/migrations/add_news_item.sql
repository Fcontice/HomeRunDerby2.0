-- Migration: Add NewsItem table for daily news digest
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "NewsItem" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "dateKey" DATE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('hr', 'injury', 'trade')),
    headline TEXT NOT NULL,
    summary TEXT,
    "playerId" TEXT REFERENCES "Player"(id) ON DELETE SET NULL,
    "playerName" TEXT,
    "teamAbbr" TEXT,
    "sourceUrl" TEXT,
    "sourceName" TEXT,
    "externalId" TEXT NOT NULL,
    metadata JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_news_item_date_key ON "NewsItem"("dateKey" DESC);
CREATE INDEX IF NOT EXISTS idx_news_item_player_id ON "NewsItem"("playerId");
CREATE INDEX IF NOT EXISTS idx_news_item_date_category ON "NewsItem"("dateKey", category);

-- Prevent duplicate news items on re-runs
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_item_unique_external
    ON "NewsItem"("dateKey", category, "externalId");

COMMENT ON TABLE "NewsItem" IS 'Daily news digest items scoped to the contest player pool';
COMMENT ON COLUMN "NewsItem"."dateKey" IS 'The date this news item pertains to (YYYY-MM-DD)';
COMMENT ON COLUMN "NewsItem".category IS 'News category: hr (home run), injury (IL/return), trade (transactions)';
COMMENT ON COLUMN "NewsItem"."externalId" IS 'Unique identifier from source to prevent duplicates';
COMMENT ON COLUMN "NewsItem".metadata IS 'Category-specific data. HR: {hrsOnDate, hrsTotal}. Injury: {status}. Trade: {transactionType, fromTeam, toTeam}';
