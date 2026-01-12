-- Add ReminderLog table for tracking when reminders were sent
-- This tracks payment reminders and lock deadline reminders sent by admins

-- Create ReminderType enum
DO $$ BEGIN
    CREATE TYPE "ReminderType" AS ENUM ('payment', 'lock_deadline');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ReminderLog table
CREATE TABLE IF NOT EXISTS "ReminderLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "reminderType" "ReminderType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "ReminderLog_reminderType_idx" ON "ReminderLog"("reminderType");
CREATE INDEX IF NOT EXISTS "ReminderLog_sentAt_idx" ON "ReminderLog"("sentAt");

-- Add foreign key constraint
ALTER TABLE "ReminderLog"
ADD CONSTRAINT "ReminderLog_sentById_fkey"
FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "ReminderLog" ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to ReminderLog"
ON "ReminderLog"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON "ReminderLog" TO service_role;
GRANT SELECT, INSERT ON "ReminderLog" TO authenticated;
GRANT USAGE ON TYPE "ReminderType" TO authenticated;
GRANT USAGE ON TYPE "ReminderType" TO service_role;
