-- Migration: Add JobExecutionLog table for tracking scheduled job executions
-- Run this in Supabase SQL Editor

-- Create JobExecutionLog table
CREATE TABLE IF NOT EXISTS "JobExecutionLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobName" TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running', 'partial')),
    "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endTime" TIMESTAMP WITH TIME ZONE,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    context JSONB,
    "adminNotified" BOOLEAN DEFAULT false,
    "notifiedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_execution_log_job_name ON "JobExecutionLog"("jobName");
CREATE INDEX IF NOT EXISTS idx_job_execution_log_status ON "JobExecutionLog"(status);
CREATE INDEX IF NOT EXISTS idx_job_execution_log_start_time ON "JobExecutionLog"("startTime" DESC);
CREATE INDEX IF NOT EXISTS idx_job_execution_log_job_name_status ON "JobExecutionLog"("jobName", status);

-- Add comment for documentation
COMMENT ON TABLE "JobExecutionLog" IS 'Tracks scheduled job executions (stats updates, leaderboard calculations, etc.)';
COMMENT ON COLUMN "JobExecutionLog"."jobName" IS 'Name of the job: update_stats, import_season, calculate_leaderboard';
COMMENT ON COLUMN "JobExecutionLog".status IS 'Execution status: success, failed, running, partial';
COMMENT ON COLUMN "JobExecutionLog".context IS 'JSON context data: seasonYear, date, updated count, etc.';
COMMENT ON COLUMN "JobExecutionLog"."adminNotified" IS 'Whether admin was notified of failure';
