-- Add profileCompleted column to User table
-- New email signups get true by default (they complete profile during registration)
-- Existing users get true (backward compatible)
-- Only new Google OAuth users get false (they need to complete profile)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileCompleted" BOOLEAN DEFAULT true;

-- Set profileCompleted to false for existing Google users who don't have a phone number
-- These users should be prompted to complete their profile
UPDATE "User" SET "profileCompleted" = false
WHERE "authProvider" = 'google' AND "phoneNumber" IS NULL;
