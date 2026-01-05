# Authentication Fix Instructions

## Problem
User registration fails with: `"null value in column 'id' of relation 'User' violates not-null constraint"`

## Root Cause
The Supabase User table's `id` column doesn't have a DEFAULT value, so UUIDs aren't auto-generated.

---

## STEP 1: Fix Supabase Database (REQUIRED)

### Go to Supabase Dashboard:
1. Open https://app.supabase.com
2. Select your project: `whudbtjrqbpvypzidjhp`
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**

### Copy and Run This SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix User table
ALTER TABLE "User"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix Team table
ALTER TABLE "Team"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix Player table
ALTER TABLE "Player"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix TeamPlayer table
ALTER TABLE "TeamPlayer"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix PlayerSeasonStats table
ALTER TABLE "PlayerSeasonStats"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Verify it worked
SELECT
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'id'
  AND table_name IN ('User', 'Team', 'Player', 'TeamPlayer', 'PlayerSeasonStats')
ORDER BY table_name;
```

### Expected Output:
You should see `gen_random_uuid()` as the default for all `id` columns:

```
table_name          | column_name | column_default
--------------------|-------------|----------------
Player              | id          | gen_random_uuid()
PlayerSeasonStats   | id          | gen_random_uuid()
Team                | id          | gen_random_uuid()
TeamPlayer          | id          | gen_random_uuid()
User                | id          | gen_random_uuid()
```

---

## STEP 2: Code Changes (ALREADY DONE)

✅ Updated `backend/src/services/db.ts`:
- `userDb.create()` now filters out null/undefined `id` values
- `playerDb.create()` now filters out null/undefined `id` values
- `teamDb.create()` now filters out null/undefined `id` values
- `playerSeasonStatsDb.create()` now filters out null/undefined `id` values

---

## STEP 3: Test Authentication

### Start Backend Server:
```bash
cd backend
npm run dev
```

### Test 1: Register New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"contifrank4@gmail.com\",
    \"username\": \"xfrankus\",
    \"password\": \"Test1234!\"
  }"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "generated-uuid-here",
      "email": "contifrank4@gmail.com",
      "username": "xfrankus",
      "role": "user",
      "createdAt": "2025-12-29T..."
    }
  }
}
```

✅ **PASS**: User created with auto-generated UUID
❌ **FAIL**: Still getting null constraint error → Check you ran the SQL in Supabase

---

### Test 2: Verify Email

#### Option A: Use Token from Database
1. Go to Supabase Dashboard → Table Editor → User table
2. Find your user (contifrank4@gmail.com)
3. Copy the `verificationToken` value
4. Run:

```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"PASTE_TOKEN_HERE\"
  }"
```

#### Option B: Manually Set Verified
1. In Supabase Table Editor → User table
2. Find your user
3. Set `emailVerified` = `true`
4. Click Save

**Expected Response:**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in.",
  "data": {
    "user": {
      "id": "...",
      "email": "contifrank4@gmail.com",
      "emailVerified": true
    }
  }
}
```

---

### Test 3: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"contifrank4@gmail.com\",
    \"password\": \"Test1234!\"
  }"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "contifrank4@gmail.com",
      "username": "xfrankus",
      "emailVerified": true,
      "role": "user"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

✅ **PASS**: Login works, tokens returned
❌ **FAIL**: "Invalid credentials" → Check password or email verified

**Save the accessToken for next test!**

---

### Test 4: Get User Profile

```bash
# Replace YOUR_ACCESS_TOKEN with the token from login response
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "contifrank4@gmail.com",
      "username": "xfrankus",
      "emailVerified": true,
      "role": "user",
      "avatarUrl": null,
      "createdAt": "2025-12-29T..."
    }
  }
}
```

✅ **PASS**: Profile returned with all user data
❌ **FAIL**: "Authentication required" → Check token is valid

---

## STEP 4: Additional Tests

### Test Password Reset Flow:

```bash
# 1. Request password reset
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"contifrank4@gmail.com\"
  }"

# 2. Get reset token from database (Supabase → User table → resetToken)

# 3. Reset password
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"RESET_TOKEN_HERE\",
    \"newPassword\": \"NewPass1234!\"
  }"

# 4. Login with new password
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"contifrank4@gmail.com\",
    \"password\": \"NewPass1234!\"
  }"
```

---

## Troubleshooting

### Issue: "null value in column 'id'"
**Solution**: Run the SQL fix in Supabase SQL Editor (Step 1)

### Issue: "Email already registered"
**Solution**: User already exists. Try logging in instead, or use a different email.

### Issue: "Email must be verified"
**Solution**:
1. Get verification token from database
2. Call verify-email endpoint
3. OR manually set emailVerified=true in Supabase

### Issue: "Invalid credentials"
**Solution**:
- Check password is correct
- Check email is verified
- Check user exists in database

### Issue: "Authentication required"
**Solution**:
- Check you're passing the Bearer token in Authorization header
- Token might be expired (24 hour expiry) - login again

---

## Summary Checklist

After running all tests, verify:

- [ ] SQL fix applied in Supabase (all tables show gen_random_uuid())
- [ ] ✅ User registration works (creates user with auto UUID)
- [ ] ✅ Email verification works
- [ ] ✅ Login works (returns access + refresh tokens)
- [ ] ✅ Get profile works (returns user data)
- [ ] ✅ Password reset works (optional)

---

## Files Modified

1. **backend/FIX_UUID_DEFAULTS.sql** - SQL to run in Supabase
2. **backend/src/services/db.ts** - Updated all create() methods
3. **backend/AUTH_FIX_INSTRUCTIONS.md** - This file

---

**Status**: Ready to test after running SQL fix in Supabase! 🚀
