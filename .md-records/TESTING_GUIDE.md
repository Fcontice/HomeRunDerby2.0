# Phase 2 Testing Guide
## Complete Backend Testing Walkthrough

This guide will walk you through testing all Phase 2 functionality step-by-step.

---

## Prerequisites

### ✅ Check Environment Variables

**Backend `.env` file should have:**
```env
DATABASE_URL="postgresql://..."          # Supabase pooler URL
DIRECT_URL="postgresql://..."            # Supabase direct URL
REDIS_URL="rediss://..."                 # Upstash Redis
JWT_SECRET="your-secret"
RESEND_API_KEY="re_..."
FRONTEND_URL="http://localhost:5173"
GOOGLE_CLIENT_ID="..." (optional)
GOOGLE_CLIENT_SECRET="..." (optional)
```

### ✅ Verify Services Running
- ✅ Supabase database active (not paused)
- ✅ Upstash Redis active
- ✅ Resend account configured

---

## Step 1: Database Setup

### 1.1 Test Database Connection

```bash
cd backend
node test-db.js
```

**Expected Output:**
```
✅ Database connection successful!
Database: postgres
Server version: PostgreSQL 15.x
```

If connection fails, check:
- Supabase project is active (not paused)
- DATABASE_URL is correct
- Firewall/network allows connection

---

### 1.2 Run Prisma Migrations

```bash
npm run prisma:generate
npm run prisma:push
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client

🚀  Your database is now in sync with your Prisma schema.
✔ Tables created: User, Team, Player, TeamPlayer, PlayerStats, Leaderboard, Notification
```

Verify tables were created:
```bash
npm run prisma:studio
```

This opens Prisma Studio in your browser at http://localhost:5555.

**Check:**
- ✅ All 7 tables exist
- ✅ No data yet (empty tables)

---

## Step 2: Seed Player Data

### 2.1 Run the Scraper

```bash
npm run seed:players
```

**Expected Output:**
```
🎯 Seeding players for 2025 season...

🏟️  Starting Baseball Reference scraper for 2025 season...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Fetching data from Baseball Reference...
🔗 URL: https://www.baseball-reference.com/leagues/majors/2025-standard-batting.shtml

✅ Successfully scraped 145 eligible players (≥10 HRs)

💾 Saving 145 players to database...

📊 Database seeding complete:
   ✅ Created: 145
   🔄 Updated: 0
   ⚠️  Skipped: 0
   📈 Total: 145 players in database

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Scraping complete! 145 eligible players ready.
```

### 2.2 Verify Players in Database

Open Prisma Studio:
```bash
npm run prisma:studio
```

Navigate to **Player** table:
- ✅ Should see ~145 records
- ✅ Each player has: name, mlbId, teamAbbr, hrsPreviousSeason
- ✅ `seasonYear` = 2025
- ✅ `isEligible` = true
- ✅ `hrsPreviousSeason` ≥ 10

**Sample players to look for:**
- Aaron Judge (NYY) - should have high HR count
- Shohei Ohtani (LAD) - should have high HR count
- Kyle Schwarber (PHI) - consistent power hitter

---

## Step 3: Start Backend Server

```bash
npm run dev
```

**Expected Output:**
```
🚀 Server running on http://localhost:5000
📊 Environment: development
🌐 Frontend URL: http://localhost:5173
🔐 JWT Secret: ✓ Set
📧 Resend API: ✓ Configured
🔑 Google OAuth: ⚠ Not configured
```

**Keep this terminal running** for all subsequent tests.

---

## Step 4: Test Player API Endpoints

Open a new terminal window for testing.

### 4.1 Get All Players

```bash
curl http://localhost:5000/api/players | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "players": [
      {
        "id": "uuid-here",
        "mlbId": "judgeaa01",
        "name": "Aaron Judge",
        "teamAbbr": "NYY",
        "seasonYear": 2025,
        "hrsPreviousSeason": 58,
        "isEligible": true,
        "photoUrl": null,
        "createdAt": "2025-12-23T...",
        "updatedAt": "2025-12-23T..."
      },
      // ... more players
    ],
    "pagination": {
      "total": 145,
      "limit": 500,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

**Verify:**
- ✅ `success: true`
- ✅ Players array has ~145 items
- ✅ Players sorted by `hrsPreviousSeason` (desc)

---

### 4.2 Search for Specific Player

```bash
curl "http://localhost:5000/api/players/search?q=Judge" | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Aaron Judge",
      "teamAbbr": "NYY",
      "hrsPreviousSeason": 58,
      ...
    }
  ]
}
```

**Try different searches:**
```bash
# Search for Ohtani
curl "http://localhost:5000/api/players/search?q=Ohtani" | jq

# Search for Schwarber
curl "http://localhost:5000/api/players/search?q=Schwarber" | jq
```

---

### 4.3 Filter by Team

```bash
# Get all Yankees players
curl "http://localhost:5000/api/players?team=NYY" | jq

# Get all Dodgers players
curl "http://localhost:5000/api/players?team=LAD" | jq
```

---

### 4.4 Filter by HR Range

```bash
# Players with 30-50 HRs
curl "http://localhost:5000/api/players?minHrs=30&maxHrs=50" | jq

# Players with 50+ HRs (elite power hitters)
curl "http://localhost:5000/api/players?minHrs=50" | jq
```

---

### 4.5 Get Player Statistics

```bash
curl http://localhost:5000/api/players/stats/summary | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalPlayers": 145,
    "averageHRs": 18.5,
    "maxHRs": 58,
    "minHRs": 10,
    "teamDistribution": [
      { "team": "NYY", "count": 8 },
      { "team": "LAD", "count": 7 },
      ...
    ]
  }
}
```

---

### 4.6 Test Pagination

```bash
# First 10 players
curl "http://localhost:5000/api/players?limit=10&offset=0" | jq

# Next 10 players
curl "http://localhost:5000/api/players?limit=10&offset=10" | jq
```

**Verify:**
- ✅ `pagination.hasMore` changes correctly
- ✅ Different players in each page

---

## Step 5: Test Team Creation API

### 5.1 Create Test User Account

First, create a user to test with:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "username": "testuser",
    "password": "Test1234"
  }' | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "testuser@example.com",
      "username": "testuser",
      "emailVerified": false,
      ...
    }
  },
  "message": "Registration successful! Please check your email to verify your account."
}
```

---

### 5.2 Verify Email

Check your email inbox for verification link, OR manually verify in database:

**Option A: Click email link** (recommended)

**Option B: Manually verify via Prisma Studio:**
1. Open http://localhost:5555
2. Go to **User** table
3. Find your test user
4. Set `emailVerified` = `true`
5. Save

---

### 5.3 Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test1234"
  }' | jq > login.json

# Extract token
cat login.json | jq -r '.data.accessToken' > token.txt
```

**Save the access token** - you'll need it for all authenticated requests.

Set as environment variable for easier testing:
```bash
# Windows CMD
set TOKEN=<paste-token-here>

# Windows PowerShell
$env:TOKEN = "<paste-token-here>"

# Mac/Linux
export TOKEN="<paste-token-here>"
```

---

### 5.4 Get Player IDs for Team

First, get 8 player IDs to create a team:

```bash
curl "http://localhost:5000/api/players?limit=8" | jq -r '.data.players[].id' > player_ids.txt
```

Create a test file `create_team.json`:

```json
{
  "name": "My Test Team",
  "seasonYear": 2025,
  "playerIds": [
    "player-id-1",
    "player-id-2",
    "player-id-3",
    "player-id-4",
    "player-id-5",
    "player-id-6",
    "player-id-7",
    "player-id-8"
  ]
}
```

**Replace the player-id-X values** with actual UUIDs from the previous step.

---

### 5.5 Create Team (Success Case)

```bash
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @create_team.json | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "team-uuid",
    "userId": "user-uuid",
    "name": "My Test Team",
    "seasonYear": 2025,
    "paymentStatus": "draft",
    "entryStatus": "draft",
    "totalHrs2024": 142,
    "teamPlayers": [
      {
        "id": "...",
        "position": 1,
        "player": {
          "name": "Aaron Judge",
          "hrsPreviousSeason": 58,
          ...
        }
      },
      // ... 7 more players
    ],
    ...
  },
  "message": "Team created successfully. Proceed to payment to enter the contest."
}
```

**Verify:**
- ✅ Team created with `paymentStatus: "draft"`
- ✅ Team created with `entryStatus: "draft"`
- ✅ `totalHrs2024` calculated correctly
- ✅ 8 players in `teamPlayers` array
- ✅ Players ordered by position (1-8)

---

### 5.6 Get My Teams

```bash
curl http://localhost:5000/api/teams/my-teams \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "team-uuid",
      "name": "My Test Team",
      "seasonYear": 2025,
      "totalHrs2024": 142,
      "paymentStatus": "draft",
      "entryStatus": "draft",
      "teamPlayers": [...],
      ...
    }
  ]
}
```

---

## Step 6: Test Team Validation

### 6.1 Test: Less Than 8 Players

Create `team_7_players.json`:
```json
{
  "name": "Invalid Team",
  "seasonYear": 2025,
  "playerIds": [
    "player-id-1",
    "player-id-2",
    "player-id-3",
    "player-id-4",
    "player-id-5",
    "player-id-6",
    "player-id-7"
  ]
}
```

```bash
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @team_7_players.json | jq
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Team must have exactly 8 players. You selected 7."
  }
}
```

✅ **Pass** if you get validation error

---

### 6.2 Test: Duplicate Players

Create `team_duplicates.json`:
```json
{
  "name": "Duplicate Team",
  "seasonYear": 2025,
  "playerIds": [
    "same-player-id",
    "same-player-id",
    "player-id-3",
    "player-id-4",
    "player-id-5",
    "player-id-6",
    "player-id-7",
    "player-id-8"
  ]
}
```

```bash
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @team_duplicates.json | jq
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Team cannot have duplicate players"
  }
}
```

✅ **Pass** if you get validation error

---

### 6.3 Test: HR Limit Exceeded (>172)

To test this, you need to select players with combined HRs > 172.

Get top HR hitters:
```bash
curl "http://localhost:5000/api/players?sortBy=hrs&sortOrder=desc&limit=8" | jq
```

Copy their IDs and create `team_hr_exceed.json`.

If the top 8 players have >172 total HRs:

```bash
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @team_hr_exceed.json | jq
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Team exceeds HR limit. Total: 185 HRs (max: 172)"
  }
}
```

✅ **Pass** if you get validation error

---

### 6.4 Test: Email Not Verified

Create a new user WITHOUT verifying email:

```bash
# Register new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@example.com",
    "username": "unverified",
    "password": "Test1234"
  }' | jq

# Login (should work even without verification)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@example.com",
    "password": "Test1234"
  }' | jq > unverified_login.json

# Extract token
UNVERIFIED_TOKEN=$(cat unverified_login.json | jq -r '.data.accessToken')

# Try to create team
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $UNVERIFIED_TOKEN" \
  -d @create_team.json | jq
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Email must be verified before creating a team"
  }
}
```

✅ **Pass** if you get forbidden error

---

## Step 7: Test Team Update/Delete

### 7.1 Update Team Name

Get your team ID first:
```bash
TEAM_ID=$(curl -s http://localhost:5000/api/teams/my-teams \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')

echo $TEAM_ID
```

Update team name:
```bash
curl -X PATCH http://localhost:5000/api/teams/$TEAM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Updated Team Name"
  }' | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "team-uuid",
    "name": "Updated Team Name",
    ...
  },
  "message": "Team updated successfully"
}
```

---

### 7.2 Update Team Players

Get 8 different player IDs and update:

```bash
curl -X PATCH http://localhost:5000/api/teams/$TEAM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "playerIds": ["id1", "id2", "id3", "id4", "id5", "id6", "id7", "id8"]
  }' | jq
```

**Verify:**
- ✅ Team updated
- ✅ `totalHrs2024` recalculated
- ✅ Old players removed, new players added

---

### 7.3 Delete Team

```bash
curl -X DELETE http://localhost:5000/api/teams/$TEAM_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Team deleted successfully"
}
```

Verify team is soft-deleted:
```bash
curl http://localhost:5000/api/teams/my-teams \
  -H "Authorization: Bearer $TOKEN" | jq
```

Should return empty array (team soft-deleted).

---

## Step 8: Test Error Handling

### 8.1 Test: Get Non-Existent Team

```bash
curl http://localhost:5000/api/teams/00000000-0000-0000-0000-000000000000 | jq
```

**Expected:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Team not found"
  }
}
```

---

### 8.2 Test: Unauthorized Access

```bash
# Try to create team without token
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -d @create_team.json | jq
```

**Expected:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```

---

### 8.3 Test: Update Someone Else's Team

Create a second user and try to update first user's team:

```bash
# Register second user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@example.com",
    "username": "user2",
    "password": "Test1234"
  }' | jq

# Verify email in Prisma Studio

# Login as user2
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@example.com",
    "password": "Test1234"
  }' | jq > user2_login.json

USER2_TOKEN=$(cat user2_login.json | jq -r '.data.accessToken')

# Try to update user1's team
curl -X PATCH http://localhost:5000/api/teams/$TEAM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -d '{"name": "Hacked!"}' | jq
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only update your own teams"
  }
}
```

---

## Summary Checklist

### ✅ Database Setup
- [ ] Database connection works
- [ ] All 7 tables created
- [ ] Migrations successful

### ✅ Player Data
- [ ] Scraper runs successfully
- [ ] ~145 players in database
- [ ] All players have ≥10 HRs
- [ ] seasonYear = 2025

### ✅ Player API
- [ ] GET /api/players returns all players
- [ ] Search works
- [ ] Filters work (team, HR range)
- [ ] Stats endpoint works
- [ ] Pagination works

### ✅ Team API
- [ ] POST /api/teams creates team
- [ ] GET /api/teams/:id works
- [ ] GET /api/teams/my-teams works
- [ ] PATCH /api/teams/:id updates team
- [ ] DELETE /api/teams/:id deletes team

### ✅ Validation
- [ ] Exactly 8 players required
- [ ] No duplicate players
- [ ] HR limit enforced (≤172)
- [ ] Email verification required
- [ ] Ownership protection works

### ✅ Error Handling
- [ ] 404 for non-existent resources
- [ ] 401 for unauthorized requests
- [ ] 403 for forbidden actions
- [ ] Validation errors clear

---

## Troubleshooting

### Issue: Scraper fails

**Error:** "Failed to scrape Baseball Reference"

**Solutions:**
1. Check internet connection
2. Verify Baseball Reference URL is accessible
3. Try with different User-Agent
4. Check if site structure changed

---

### Issue: Database connection fails

**Error:** "Can't reach database server"

**Solutions:**
1. Check Supabase project is active (not paused)
2. Verify DATABASE_URL is correct
3. Test connection with `node test-db.js`
4. Check firewall/network

---

### Issue: Token expired

**Error:** "Invalid or expired token"

**Solutions:**
1. Re-login to get new token
2. Tokens expire after 24 hours
3. Save new token to environment variable

---

## Next Steps

Once all tests pass:
1. ✅ Backend infrastructure is solid
2. ✅ APIs working correctly
3. ✅ Validation rules enforced
4. ⏭️  Ready to build Team Creation UI
5. ⏭️  Ready to integrate Stripe payments

---

**All tests passing?** You're ready to move to Phase 2.3: Team Creation UI! 🚀
