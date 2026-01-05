-- ============================================================
-- Add Payment Status Index for Admin Queries
-- ============================================================
-- Optimizes queries for admin dashboard (Phase 4)
-- ============================================================

BEGIN;

-- Add index on paymentStatus
CREATE INDEX IF NOT EXISTS "Team_paymentStatus_idx"
ON "Team"("paymentStatus");

-- Verify index created
DO $$
DECLARE
  index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'Team'
    AND indexname = 'Team_paymentStatus_idx'
  ) INTO index_exists;

  IF NOT index_exists THEN
    RAISE EXCEPTION 'Index creation failed!';
  END IF;

  RAISE NOTICE '✅ Payment status index created successfully';
END $$;

COMMIT;
