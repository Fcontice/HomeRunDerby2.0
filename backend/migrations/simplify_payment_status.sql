-- Migration: Simplify Payment Status Flow
-- Remove pending and rejected statuses, keeping only: draft, paid, refunded
-- Date: 2026-02-06

-- Step 1: Drop the default constraint first
ALTER TABLE "Team" ALTER COLUMN "paymentStatus" DROP DEFAULT;

-- Step 2: Convert any existing pending/rejected teams to draft
UPDATE "Team"
SET "paymentStatus" = 'draft'
WHERE "paymentStatus" IN ('pending', 'rejected');

-- Step 3: Recreate the enum type
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
CREATE TYPE "PaymentStatus" AS ENUM ('draft', 'paid', 'refunded');
ALTER TABLE "Team" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus" USING "paymentStatus"::text::"PaymentStatus";
DROP TYPE "PaymentStatus_old";

-- Step 4: Re-add the default
ALTER TABLE "Team" ALTER COLUMN "paymentStatus" SET DEFAULT 'draft'::"PaymentStatus";
