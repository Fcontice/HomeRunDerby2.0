-- Add phoneNumber column to User table
-- Nullable to support existing users, but required for new registrations via validation
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(20);
