-- Migration: Add unique constraint to Team.stripePaymentId
-- Purpose: Prevent race conditions in webhook payment processing
-- Date: 2024-12-30

-- Add unique constraint to stripePaymentId column
ALTER TABLE "Team" ADD CONSTRAINT "Team_stripePaymentId_key" UNIQUE ("stripePaymentId");

-- Note: This migration assumes no duplicate stripePaymentId values exist
-- If duplicates exist, they must be cleaned up before running this migration
