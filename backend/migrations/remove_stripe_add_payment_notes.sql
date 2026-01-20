-- Remove stripePaymentId, add paymentNotes for manual payment tracking
ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_stripePaymentId_key";
ALTER TABLE "Team" DROP COLUMN IF EXISTS "stripePaymentId";
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "paymentNotes" TEXT;
