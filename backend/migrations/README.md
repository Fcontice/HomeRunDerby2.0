# Database Migrations

## Running the Payment Idempotency Migration

This migration adds a unique constraint to the `Team.stripePaymentId` field to prevent duplicate payment processing.

### Prerequisites
- Supabase project configured
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- No duplicate `stripePaymentId` values in database (or migration will fail)

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `add_unique_stripe_payment_id.sql`
4. Paste into the SQL editor
5. Click "Run" to execute

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migration
supabase db push
```

### Option 3: Using psql (Direct Connection)

```bash
# Get connection string from Supabase Dashboard → Settings → Database
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"

# Run migration file
\i backend/migrations/add_unique_stripe_payment_id.sql
```

### Verification

After running the migration, verify the constraint was added:

```sql
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'Team'::regclass
AND conname = 'Team_stripePaymentId_key';
```

Expected result:
```
         conname          | contype
--------------------------+---------
 Team_stripePaymentId_key | u
```

### Rollback (if needed)

If you need to remove the unique constraint:

```sql
ALTER TABLE "Team" DROP CONSTRAINT "Team_stripePaymentId_key";
```

⚠️ **Warning**: Removing this constraint will disable idempotency protection and allow duplicate payment processing.

### Troubleshooting

**Error: Duplicate key value violates unique constraint**

This means you have duplicate `stripePaymentId` values in your database. To fix:

1. Find duplicates:
```sql
SELECT "stripePaymentId", COUNT(*)
FROM "Team"
WHERE "stripePaymentId" IS NOT NULL
GROUP BY "stripePaymentId"
HAVING COUNT(*) > 1;
```

2. Manually resolve duplicates (keep the most recent payment):
```sql
-- Review duplicate records
SELECT id, name, "paymentStatus", "stripePaymentId", "createdAt"
FROM "Team"
WHERE "stripePaymentId" IN (
  SELECT "stripePaymentId"
  FROM "Team"
  WHERE "stripePaymentId" IS NOT NULL
  GROUP BY "stripePaymentId"
  HAVING COUNT(*) > 1
)
ORDER BY "stripePaymentId", "createdAt" DESC;

-- Set duplicates to NULL (keeping most recent)
-- Replace with actual IDs from query above
UPDATE "Team"
SET "stripePaymentId" = NULL
WHERE id IN ('uuid1', 'uuid2', ...);
```

3. Re-run migration after cleaning duplicates

---

**Created**: December 30, 2024
**Purpose**: Payment system idempotency protection
