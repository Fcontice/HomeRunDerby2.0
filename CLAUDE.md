# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Home Run Derby 2.0 - MLB fantasy sports pool where users draft 8-player teams and compete based on real-world home runs. Full-stack TypeScript monorepo with React frontend and Express backend.

## Development Commands

### Frontend (from `/frontend`)
```bash
npm run dev          # Start dev server on port 5173
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run format       # Prettier
```

### Backend (from `/backend`)
```bash
npm run dev                  # Start with hot reload (tsx watch)
npm run build                # Compile to dist/
npm start                    # Run compiled code
npm run prisma:generate      # Generate Prisma types
npm run prisma:push          # Push schema to database
npm run prisma:studio        # Open database GUI
npm run import:season        # Import full season stats for eligibility (yearly)
npm run update:stats:python  # Update daily stats (during contest)
npm run test:phase3          # Test stats/scoring/leaderboard pipeline
```

## Architecture Essentials

### Database Pattern (Critical)

**Hybrid Prisma/Supabase setup** - The codebase uses Prisma schema for type definitions but Supabase client for actual queries:

- Schema defined in `backend/prisma/schema.prisma`
- Database abstraction layer in `backend/src/services/db.ts` wraps Supabase client
- The `db` service mimics Prisma API (`findUnique`, `findMany`, `create`, `update`, etc.)
- **Never use Prisma client directly** - always use `db.user`, `db.team`, `db.player`, etc.

Supabase configuration is in `backend/src/config/supabase.ts` with separate admin and anon clients.

### Authentication Flow (Secure httpOnly Cookies)

JWT-based auth with email/password and Google OAuth via Passport.js, using httpOnly cookies for XSS protection.

#### Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. LOGIN                           2. SUBSEQUENT REQUESTS                  │
│   ──────                             ────────────────────                    │
│   Frontend POST /api/auth/login      Frontend makes API request              │
│          ↓                                    ↓                              │
│   Backend validates credentials      Browser auto-sends httpOnly cookies     │
│          ↓                           (withCredentials: true)                 │
│   Backend sets three cookies:                 ↓                              │
│   • access_token (httpOnly)          Frontend reads XSRF-TOKEN cookie        │
│   • refresh_token (httpOnly)         and adds X-CSRF-Token header            │
│   • XSRF-TOKEN (readable)                     ↓                              │
│          ↓                           Backend validates:                      │
│   Response: { user, csrfToken }      • JWT from access_token cookie          │
│                                      • CSRF header matches cookie            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why httpOnly Cookies (Not localStorage)

| Storage Method | XSS Vulnerable? | Why |
|---------------|-----------------|-----|
| localStorage | YES | Any JavaScript on page can read `localStorage.getItem('token')` |
| httpOnly cookie | NO | JavaScript cannot access httpOnly cookies - browser restriction |

If an attacker injects malicious JavaScript (XSS), they can steal tokens from localStorage. httpOnly cookies are immune because JavaScript physically cannot read them.

#### Cookie Configuration (`backend/src/config/cookies.ts`)

| Cookie Name | Purpose | httpOnly | Expiry | Why This Config |
|-------------|---------|----------|--------|-----------------|
| `access_token` | API authorization | YES | 15 min | Short-lived limits damage if compromised |
| `refresh_token` | Get new access tokens | YES | 7 days | Long-lived for user convenience; httpOnly protects from XSS |
| `XSRF-TOKEN` | CSRF protection | NO | 1 hour | Frontend MUST read this to set header |

All cookies use:
- `secure: true` in production (HTTPS only)
- `sameSite: 'strict'` (only sent to same site)
- `path: '/'` (available for all routes)
- `domain: '.hrderbyus.com'` in production (allows api ↔ www sharing)

#### CSRF Protection (Double-Submit Cookie Pattern)

**How it works:**
1. Server generates random CSRF token (32 bytes, hex-encoded = 64 characters)
2. Token stored in `XSRF-TOKEN` cookie (NOT httpOnly - frontend can read)
3. Frontend reads cookie, puts value in `X-CSRF-Token` header
4. Backend validates header value matches cookie value

**Why this prevents CSRF attacks:**
- Attacker on `evil.com` can trigger requests to our API (browser sends cookies)
- But attacker CANNOT read our cookies (Same-Origin Policy blocks cross-origin cookie access)
- So attacker cannot set the correct `X-CSRF-Token` header
- Request fails validation, attack is blocked

**Exempt routes** (don't require CSRF token):
```typescript
// backend/src/middleware/csrf.ts - skipPaths
'/api/auth/login'           // User doesn't have CSRF token yet
'/api/auth/register'        // User doesn't have CSRF token yet
'/api/auth/verify-email'    // Public endpoint, no session
'/api/auth/forgot-password' // Public endpoint, no session
'/api/auth/reset-password'  // Public endpoint, no session
'/api/auth/refresh'         // Protected by httpOnly refresh token instead
'/api/auth/google'          // OAuth state parameter provides protection
'/api/auth/google/callback' // OAuth state parameter provides protection
'/api/payments/webhook'     // Stripe signature verification instead
```

**Token rotation:**
- New CSRF token generated after each successful state-changing request
- Provides forward secrecy (leaked token becomes invalid quickly)
- Frontend always reads fresh token from cookie before requests

**Timing-safe comparison:**
```typescript
// Prevents timing attacks that could leak token character-by-character
crypto.timingSafeEqual(
  Buffer.from(headerToken, 'utf8'),
  Buffer.from(cookieToken, 'utf8')
)
```

#### Token Refresh Mechanism

**Backend endpoint:** `POST /api/auth/refresh`
- Reads `refresh_token` from httpOnly cookie
- Verifies token is valid and user exists
- Issues new `access_token` cookie (15 min expiry)
- Returns success/failure (new token is in cookie, not response body)

**Frontend auto-refresh** (`frontend/src/contexts/AuthContext.tsx`):
```typescript
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes

// Proactive refresh runs every 10 minutes
// Access tokens expire at 15 minutes, so we refresh 5 minutes early
// Prevents session interruption during active use
setInterval(() => authApi.refreshToken(), TOKEN_REFRESH_INTERVAL)
```

**On-demand refresh** (`frontend/src/services/api.ts` response interceptor):
- Catches 401 errors from API responses
- Attempts `POST /api/auth/refresh` to get new access token
- Retries original request with new token

**Subscriber pattern for concurrent 401s:**
```typescript
// Problem: 3 concurrent requests all get 401 → 3 refresh attempts → race condition
// Solution: First 401 triggers refresh, others wait for it to complete

let isRefreshing = false
let refreshSubscribers: ((success: boolean) => void)[] = []

// First 401: isRefreshing=false → start refresh → isRefreshing=true
// Subsequent 401s: isRefreshing=true → subscribe to refreshSubscribers
// Refresh completes: notify all subscribers → they retry their requests
```

**Skip list** (endpoints that don't trigger automatic refresh):
```typescript
// frontend/src/services/api.ts - skipRefreshPaths
'/api/auth/me'       // Initial auth check - expected to 401 if not logged in
'/api/auth/refresh'  // The refresh endpoint itself - would cause infinite loop
'/api/auth/login'    // Login - user isn't authenticated yet
'/api/auth/register' // Register - user isn't authenticated yet
```

#### Frontend Security Implementation (`frontend/src/services/api.ts`)

**Axios configuration:**
```typescript
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // CRITICAL: Required for cookies to be sent
})
```

**Request interceptor (CSRF token injection):**
```typescript
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase()
  // Only add CSRF token for state-changing requests
  if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = getCSRFToken() // Reads from memory or parses XSRF-TOKEN cookie
    if (token) {
      config.headers['X-CSRF-Token'] = token
    }
  }
  return config
})
```

**CSRF token storage:**
- Cached in memory (`csrfToken` variable) for fast access
- Fallback: parse from `XSRF-TOKEN` cookie if memory cache empty
- Set via `setCSRFToken()` after login (from response) or from cookie

**Response interceptor (error recovery):**
- 401 errors → attempt token refresh (with subscriber pattern)
- 403 with `CSRF_TOKEN_INVALID` → fetch new CSRF token and retry once

#### Auth Middleware (`backend/src/middleware/auth.ts`)

| Middleware | Purpose |
|------------|---------|
| `authenticate` | Extract and verify JWT, attach `req.user` (from cookie or Authorization header) |
| `requireAuth` | Same as authenticate but fails if no valid token |
| `requireAdmin` | Requires `req.user.role === 'admin'` |
| `requireOwnership(paramName)` | Requires `req.user.id === req.params[paramName]` |
| `optionalAuth` | Attach user if token valid, continue anyway if not |

#### CSRF Middleware (`backend/src/middleware/csrf.ts`)

| Export | Purpose |
|--------|---------|
| `csrfProtection` | Validates X-CSRF-Token header matches XSRF-TOKEN cookie for POST/PUT/PATCH/DELETE |
| `csrfTokenEndpoint` | GET /api/csrf-token handler - returns fresh token in response and cookie |
| `ensureCSRFToken` | Sets initial CSRF token cookie if not present (fallback for edge cases) |
| `generateCSRFToken()` | Creates 64-character hex string (32 bytes of entropy) |

#### Season Guard Middleware (`backend/src/middleware/seasonGuard.ts`)

- `requirePhase(['registration'])` - Restrict routes to specific season phases
- Attaches `req.season` with current SeasonConfig for downstream use

### API Response Format

All endpoints return consistent JSON:
```typescript
{
  success: boolean
  message?: string
  data?: T
  error?: { code: string, message: string }
}
```

### Error Handling Pattern

Custom error classes (`AuthenticationError`, `ValidationError`, `NotFoundError`, `ConflictError`) are caught by centralized error handler in `backend/src/middleware/errorHandler.ts`. Use `asyncHandler` wrapper for automatic error catching.

### Health Check Endpoints

Monitor system health and dependencies:

**`GET /health`** - General API health check
```json
{
  "success": true,
  "timestamp": "2025-12-31T12:00:00.000Z",
  "uptime": 3600.5,
  "environment": "development"
}
```

**`GET /health/python`** - Python environment and database connectivity
```json
{
  "success": true,
  "message": "Python environment healthy",
  "details": {
    "pythonAvailable": true,
    "supabaseConnection": true
  }
}
```

Use these endpoints to verify:
- Python runtime is installed and accessible
- Required Python packages (MLB-StatsAPI, supabase) are installed
- Database connectivity from Python scripts
- API server is running and responsive

### File Organization

**Frontend** (`/frontend/src`):
- `pages/` - Route components (Login, Register, Dashboard, CreateTeam, VerifyEmail, Players, PlayerProfile, Leaderboard)
- `pages/admin/` - Admin dashboard pages (AdminLayout, AdminDashboard, AdminTeams, AdminUsers, AdminNotifications)
- `components/ui/` - Reusable Radix UI components (button, card, input, dialog, table, dropdown-menu, badge, textarea, etc.)
- `components/admin/` - Admin-specific components (ReAuthModal, StatsCard, SeasonCard)
- `components/team/` - Team-specific components
- `components/SeasonBanner.tsx` - Global banner showing season status
- `contexts/AuthContext.tsx` - Global auth state
- `contexts/SeasonContext.tsx` - Global season state and phase info
- `hooks/usePhaseCheck.ts` - Hook for checking allowed phases
- `services/api.ts` - Axios instance with all API endpoints organized as `authApi`, `teamsApi`, `playersApi`, `adminApi`, `seasonApi`

**Backend** (`/backend/src`):
- `routes/` - Route definitions (auth, teams, players, payments, leaderboards, admin, season, jobs)
- `controllers/` - Request handlers with business logic (includes adminController.ts, seasonController.ts)
- `services/` - Core business logic services:
  - `db.ts` - Database abstraction layer (Supabase wrapper)
  - `emailService.ts` - Resend email integration
  - `statsService.ts` - TypeScript wrapper that calls Python MLB-StatsAPI script
  - `scoringService.ts` - Team scoring calculator ("best 7 of 8" logic)
  - `leaderboardService.ts` - Leaderboard generation & caching
  - `scheduledJobs.ts` - node-cron job scheduling (daily stats, leaderboard)
  - `alertService.ts` - Job execution logging and admin failure alerts
- `scripts/python/` - Python stats updater using MLB-StatsAPI:
  - `import_season_stats.py` - Yearly bulk import: full season stats for eligibility (≥20 HRs)
  - `update_stats.py` - Daily updates: fetches game-by-game HRs from MLB API (during contest)
  - `db_utils.py` - Supabase database utilities for Python
  - `test_connection.py` - Database connectivity test
  - `requirements.txt` - Python dependencies (MLB-StatsAPI, supabase)
  - `README.md` - Complete Python implementation documentation
- `middleware/` - Auth, error handling, validation
- `types/validation.ts` - Zod schemas for request validation
- `utils/` - JWT, password hashing, custom errors
- `config/` - Supabase, Passport strategies
- `scripts/` - One-off scripts (migrations, imports, testing)

### Environment Setup

Backend requires Supabase credentials validated in `backend/src/env.ts` (loaded first):
- `SUPABASE_URL` - Supabase project URL (required)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access key (required)
- `SUPABASE_ANON_KEY` - Public access key (required)
- `JWT_SECRET` - Secret for token signing (required)
- `RESEND_API_KEY` - Email service API key (required in production, warns in dev)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials (optional, warns if incomplete)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Payment processing (required)
- `DISABLE_EMAIL_ERRORS` - Set to `"true"` to suppress email errors in development (optional)
- `SEASON_YEAR` - Override current season year for scheduled jobs (default: 2026)
- `ADMIN_ALERT_EMAIL` - Email address for job failure alerts (default: FROM_EMAIL or admin@hrderbyus.com)
- `DISABLE_SCHEDULED_JOBS` - Set to `"true"` to disable automated job scheduling (optional)

**Environment Validation:**
- Production: Fails fast if critical services are missing (email, Stripe)
- Development: Warns about missing services but continues
- Google OAuth: Detects partial configuration and disables if incomplete

Frontend dev server proxies `/api/*` to backend at port 5000 (configured in `vite.config.ts`).

## Key Patterns

### Soft Deletes
All major entities support soft deletes via `deletedAt` field. Database queries automatically filter `deletedAt IS NULL`.

### Validation
Use Zod schemas from `types/validation.ts` at controller entry points. Parse requests early to get type-safe payloads.

### Background Jobs / Scheduled Tasks
Automated scheduling implemented via `node-cron` (no Redis required). Daily stats update runs at 3am ET. See "Scheduled Jobs" section for full details. BullMQ + Redis available for future queue-based jobs if needed.

### Team Constraints
- Exactly 8 players required
- Combined 2024 HR total ≤ 172
- Best 7 of 8 players count toward score
- Teams lock 3 days before season, no modifications after

### Database Indexes

**Team Model:**
- `userId` - User's teams lookup
- `entryStatus` - Filter by draft/locked/active
- `seasonYear` - Season filtering
- `paymentStatus` - Admin dashboard queries (pending/paid/rejected)

**PlayerStats Model:**
- `playerId` - Player's stats lookup
- `seasonYear` - Season filtering
- `date` - Date-range queries (monthly leaderboards)

**PlayerSeasonStats Model:**
- `playerId` - Player's historical stats
- `seasonYear` - Season filtering
- `hrsTotal` - Eligibility calculations (previous season HRs >= 10)

### Phase 3: Stats & Leaderboards (Implemented - REFACTORED)

**Two-Table Stats Architecture:**
- `PlayerSeasonStats` - Historical archive (e.g., 2024 HRs determine 2025 eligibility)
  - Columns: `playerId`, `seasonYear`, `hrsTotal`, `teamAbbr`
- `PlayerStats` - Live daily tracking with postseason separation
  - Columns: `playerId`, `seasonYear`, `date`, `hrsTotal`, `hrsRegularSeason`, `hrsPostseason`
  - `hrsTotal` = cumulative season total (regular + postseason)
  - `hrsRegularSeason` = regular season only (for eligibility calculations)
  - `hrsPostseason` = postseason only (tracked separately)

**Data Pipeline (Refactored with MLB-StatsAPI):**
1. `statsService.updatePlayerStats()` calls Python script via child_process
2. Python script fetches game-by-game data from MLB-StatsAPI (official API)
3. Filters for regular season games only (game_type='R'), excludes postseason
4. Aggregates daily HR totals across all games played on date
5. Calculates cumulative season totals and writes directly to Supabase
6. TypeScript services read from PlayerStats for scoring/leaderboards
7. `scoringService.calculateTeamScore()` implements "best 7 of 8" algorithm
8. `leaderboardService.calculateOverallLeaderboard()` generates rankings
9. Results cached in Leaderboard table for fast retrieval

**Key Services:**
- `statsService.ts` - TypeScript wrapper with retry logic:
  - Calls Python MLB-StatsAPI script via `child_process`
  - 3 retry attempts with exponential backoff (2s, 4s, 8s delays)
  - 5-minute timeout per attempt
  - Non-retryable error detection (Python not found, syntax errors, missing modules)
  - Detailed logging for each attempt
- `scripts/python/update_stats.py` - Python: fetches game-by-game HRs, writes to DB
- `scripts/python/db_utils.py` - Python database layer (Supabase client wrapper)
- `scripts/python/test_connection.py` - Database connectivity test (used by health checks)
- `scoringService.ts` - Calculate team scores (best 7 of 8 players)
- `leaderboardService.ts` - Generate and cache leaderboard rankings
- `db.playerStats` - TypeScript database operations (read-only for Python-written data)
- `db.leaderboard` - Database operations for Leaderboard table

**Data Source Details:**
- **Previous**: Baseball Savant CSV (season totals only, postseason mixed in)
- **Current**: MLB-StatsAPI (game-by-game, regular season filtered, official data)
- **Season**: Tracks 2026 season forward (no historical backfill)
- **Update Schedule**: Daily at 3am ET via built-in node-cron scheduler (see "Scheduled Jobs" section)

**Leaderboard Types:**
- Overall: Full season (regular + postseason), cached in database
- Monthly: Single month (regular season only), date-range filtered
- All-Star: Future feature (snapshot at All-Star break)

**Testing & Usage:**
```bash
# Install Python dependencies (one-time)
npm run update:stats:install

# ===== YEARLY SETUP (Run ONCE before each contest) =====
# Import entire previous season for player eligibility (≥10 HRs)
npm run import:season                     # Import 2025 season (default)
npm run import:season -- --season 2024    # Import specific season
npm run import:season -- --min-hrs 20     # Custom HR threshold

# ===== DAILY UPDATES (During contest) =====
# Update stats for yesterday (default)
npm run update:stats:python

# Update stats for specific date
npm run update:stats:python -- --date 2026-04-15

# ===== TESTING =====
# Test full pipeline (stats → scoring → leaderboards)
npm run test:phase3

# Test with specific date
npm run test:phase3 -- --date 2026-04-15
```

**Two Distinct Use Cases:**

1. **Pre-Contest Setup (Yearly)**: `import:season`
   - Imports entire previous season's data (e.g., 2025 stats for 2026 contest)
   - Populates `Player` and `PlayerSeasonStats` tables
   - Uses MLB Stats API leaderboard with **offset pagination** (bypasses 100-result API limit)
   - Includes `hydrate=team` for team abbreviations
   - **Dedupes traded players** (keeps first/highest HR entry)
   - Filters for players with ≥10 home runs (eligibility threshold)
   - Run ONCE per year before contest starts
   - Example: Before 2026 contest, run `npm run import:season -- --season 2025`

2. **Active Contest (Daily)**: Automated via scheduled jobs
   - Updates current season's game-by-game data (e.g., 2026 daily HRs)
   - Populates `PlayerStats` table with daily tracking
   - Runs automatically at 3am ET via node-cron scheduler
   - Tracks regular season vs postseason HRs separately
   - Can also be triggered manually via admin API or CLI (`npm run update:stats:python`)

**Python Script Documentation:**
See `backend/src/scripts/python/README.md` for complete implementation details, scheduling options, and troubleshooting.

### Phase 4: Admin Dashboard (Implemented)

**Overview:**
Full admin dashboard for managing teams, users, and sending notifications. Accessible at `/admin/*` routes with dedicated sidebar layout.

**Admin Routes:**
- `/admin` - Dashboard with stats overview, teams by status, quick actions
- `/admin/teams` - Team management with filters and status actions
- `/admin/users` - User management with search and actions
- `/admin/notifications` - Send email notifications to user groups

**Backend API Endpoints** (`/api/admin/*`):
- `GET /stats` - Dashboard statistics (total teams, pending approvals, revenue, active users)
- `GET /teams` - List teams with optional filters (paymentStatus, entryStatus, search)
- `GET /teams/:id` - Get team details with players
- `PATCH /teams/:id/status` - Update team payment status
- `GET /users` - List users with optional search
- `PATCH /users/:id/verify-email` - Manually verify user email
- `POST /users/:id/password-reset` - Send password reset email
- `DELETE /users/:id` - Soft delete user
- `POST /notifications` - Send email notifications
- `GET /recipient-counts` - Get counts for recipient groups
- `GET /reminders/status` - Get last sent time for each reminder type
- `POST /reminders/payment` - Send payment reminders to users with unpaid teams
- `POST /reminders/lock-deadline` - Send personalized lock deadline reminders to all users
- `POST /season/end` - End the current season (locks all teams)
- `POST /verify-password` - Re-authenticate for destructive actions

**Security Features:**
- All admin routes require `requireAdmin` middleware (checks `user.role === 'admin'`)
- Destructive actions require re-authentication:
  - Email/password users: Must enter password
  - OAuth users (Google): Auto-verified (authenticated via trusted provider)
  - Actions requiring re-auth: Reject team, delete user, send notifications, send reminders, end season

**Frontend Components:**
- `AdminLayout.tsx` - Sidebar navigation with role check, redirects non-admins
- `AdminDashboard.tsx` - Stats cards, teams by status, quick actions, end season modal
- `AdminTeams.tsx` - Team table with filters, status badges, approve/reject actions
- `AdminUsers.tsx` - User table with verify email, password reset, delete actions
- `AdminNotifications.tsx` - Quick reminders (payment/lock deadline) and custom email composer
- `ReAuthModal.tsx` - Password verification modal for destructive actions
- `StatsCard.tsx` - Reusable stats display card with variants

**Quick Reminders System:**
The admin notifications page includes pre-configured reminder emails with tracking:

- **Payment Reminders**: Send to users with unpaid teams
  - Customizable targeting: Select draft and/or pending payment status
  - Email lists user's unpaid teams with "Pay Now" button
  - Tracks last sent timestamp and recipient count

- **Lock Deadline Reminders**: Personalized emails to all verified users
  - Requires specifying the lock date
  - Three email variants based on user's team status:
    - `no_teams`: Encourages creating a team before deadline
    - `has_unpaid`: Reminds to pay before teams lock
    - `all_paid`: Confirms they're ready for the season
  - Tracks last sent timestamp and recipient count

- **ReminderLog Table**: Tracks all sent reminders
  - `reminderType`: 'payment' | 'lock_deadline'
  - `sentAt`: Timestamp when sent
  - `sentById`: Admin who sent it
  - `recipientCount`: Number of emails sent
  - `metadata`: Optional JSON for additional context

**Admin Link:**
- Visible only to admin users in main Dashboard navigation (purple "Admin" link)

**Testing Admin Access:**
1. Update user role in Supabase: `UPDATE "User" SET role = 'admin' WHERE email = 'your@email.com';`
2. Log out and log back in to get a new JWT token with admin role
3. Navigate to `/admin` or click the "Admin" link in navigation

### Scheduled Jobs (Implemented)

**Overview:**
Automated task scheduling using node-cron for daily stats updates and leaderboard recalculations. Includes job execution logging, admin API endpoints for monitoring/manual triggers, and email alerts on failure.

**Architecture:**
- Uses `node-cron` for scheduling (runs in server process)
- Jobs execute at 3:00 AM Eastern Time daily
- Integrates with existing stats pipeline (`statsService` -> Python -> Supabase)
- Failure alerts sent via Resend email to admin

**Key Services:**
- `scheduledJobs.ts` - Job scheduling, execution, and manual triggers
- `alertService.ts` - Job logging, admin notifications, execution history

**Database Table (`JobExecutionLog`):**
```sql
id: UUID (PK, auto-generated)
jobName: TEXT ('update_stats' | 'import_season' | 'calculate_leaderboard' | 'recalculate_all')
status: TEXT ('success' | 'failed' | 'running' | 'partial')
startTime: TIMESTAMP WITH TIME ZONE
endTime: TIMESTAMP WITH TIME ZONE
durationMs: INTEGER
errorMessage: TEXT
errorStack: TEXT
context: JSONB (seasonYear, date, updated count, etc.)
adminNotified: BOOLEAN (default false)
notifiedAt: TIMESTAMP WITH TIME ZONE
createdAt: TIMESTAMP WITH TIME ZONE
```

**Indexes:**
- `jobName` - Filter by job type
- `status` - Filter by status
- `startTime DESC` - Recent executions
- `jobName, status` - Combined filtering

**Admin API Endpoints** (`/api/admin/jobs/*`):
- `GET /status` - Scheduler status, job configuration, latest execution for each job type
- `GET /history` - Recent job execution history (supports `?limit=N&jobName=update_stats`)
- `GET /stats` - Job execution statistics (success rate, avg duration) for last N days
- `POST /trigger` - Manually trigger any job (`{ jobName, seasonYear?, date? }`)
- `POST /update-stats` - Shortcut to trigger stats update (`{ seasonYear?, date? }`)

**Scheduled Jobs:**
1. **Daily Stats Update** (3:00 AM ET)
   - Runs `runStatsUpdateJob()` which:
   - Calls Python script to fetch yesterday's game data from MLB-StatsAPI
   - Updates PlayerStats table with new HR data
   - Recalculates overall leaderboard if stats changed
   - Logs execution to JobExecutionLog
   - Alerts admin on failure via email

2. **Hourly Heartbeat** (every hour at :00)
   - Logs timestamp to console for monitoring
   - Confirms scheduler is running

**Environment Variables:**
- `SEASON_YEAR` - Override current season year (default: 2026)
- `ADMIN_ALERT_EMAIL` - Email for failure alerts (default: FROM_EMAIL or admin@hrderbyus.com)
- `DISABLE_SCHEDULED_JOBS` - Set to `"true"` to disable all scheduled jobs (useful in development)

**Manual Triggers via CLI:**
```bash
# Trigger stats update for yesterday (default)
npm run job:stats

# Trigger stats update for specific date
npm run job:stats:date 2026-04-15
```

**Manual Triggers via API:**
```bash
# Trigger stats update
curl -X POST http://localhost:5000/api/admin/jobs/update-stats \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"seasonYear": 2026, "date": "2026-04-15"}'

# Trigger any job
curl -X POST http://localhost:5000/api/admin/jobs/trigger \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"jobName": "calculate_leaderboard", "seasonYear": 2026}'
```

**Error Alerting:**
- On job failure, `alertAdminJobFailure()` sends HTML email with:
  - Job name and timestamp (in ET)
  - Error message and stack trace
  - Attempt/retry count if applicable
  - Context data (seasonYear, date)
  - Recommended actions checklist
  - Link to admin dashboard
- Email sent via Resend API
- Job marked as `adminNotified: true` after alert sent

**Integration with Stats Pipeline:**
1. `initializeScheduledJobs()` called at server startup
2. node-cron triggers `runStatsUpdateJob()` at 3am ET
3. Job logs start to JobExecutionLog (status: 'running')
4. Calls `updatePlayerStats()` which spawns Python process
5. Python fetches MLB data, writes to Supabase
6. If stats changed, calls `calculateOverallLeaderboard()`
7. Job logs completion (status: 'success' or 'failed')
8. On failure: alerts admin, logs error details

**Disabling Jobs:**
Set `DISABLE_SCHEDULED_JOBS=true` in environment to prevent jobs from running. Useful for:
- Local development (avoid duplicate updates)
- Maintenance windows
- Testing without side effects

### Season Management / Off-Season Mode (Implemented)

**Overview:**
Season phase management system that controls what users can do based on the current season phase. Enables off-season mode where users can view data but cannot create teams or make payments.

**Season Phases:**
- `off_season` - View only mode, no team creation or payments
- `registration` - Team creation and payments enabled
- `active` - Season in progress, teams locked
- `completed` - Season ended, view final results

**Database Table (`SeasonConfig`):**
```sql
id: TEXT (PK)
seasonYear: INTEGER (unique)
phase: TEXT ('off_season' | 'registration' | 'active' | 'completed')
registrationOpenDate: DATE
registrationCloseDate: DATE
seasonStartDate: DATE
seasonEndDate: DATE
isCurrentSeason: BOOLEAN (partial unique index - only one true)
lastPhaseChange: TIMESTAMP
changedBy: TEXT (FK → User.id)
createdAt: TIMESTAMP
updatedAt: TIMESTAMP
```

**Backend API Endpoints:**
- `GET /api/season/current` - Get current season (public)
- `GET /api/admin/seasons` - List all seasons (admin)
- `POST /api/admin/seasons` - Create new season (admin)
- `PATCH /api/admin/seasons/:seasonYear/phase` - Update phase (admin)
- `PATCH /api/admin/seasons/:seasonYear` - Update season details (admin)
- `PATCH /api/admin/seasons/:seasonYear/set-current` - Set as current season (admin)

**Phase-Protected Routes:**
- `POST /api/teams` - Requires `registration` phase
- `PATCH /api/teams/:id` - Requires `registration` phase
- `DELETE /api/teams/:id` - Requires `registration` phase
- `POST /api/payments/checkout` - Requires `registration` phase

**Frontend Components:**
- `SeasonContext` - Global provider for season state
- `usePhaseCheck(phases)` - Hook returns `{ isAllowed, currentPhase, season, loading }`
- `SeasonBanner` - Global banner showing registration/active/completed status
- `SeasonCard` - Admin component for managing seasons and phases
- Dashboard nav - "Create Team" link disabled with "Closed" badge when not in registration
- CreateTeam page - Shows phase-appropriate message when registration closed

**Usage:**
```typescript
// Check if action is allowed
const { isAllowed, currentPhase } = usePhaseCheck(['registration'])
if (!isAllowed) {
  return <OffSeasonMessage />
}

// Access season data
const { season, loading } = useSeason()
```

## Important Notes

- **Security hardened**: Tokens stored in httpOnly cookies (XSS protected), CSRF protection via double-submit pattern with timing-safe comparison.
- **Token refresh**: Implemented with 15-minute access tokens and 7-day refresh tokens. Frontend auto-refreshes every 10 minutes via interval + on-demand via 401 interceptor with subscriber pattern for race condition prevention.
- **Rate limiting**: Applied globally at 100 req/15min per IP.
- **Email service**: Uses Resend API configured in `emailService.ts`.
  - Throws errors in production for failed sends
  - Throws in development unless `DISABLE_EMAIL_ERRORS=true`
  - Detailed error logging for debugging
- **Payments**: Stripe integration with webhook processing fully functional.
- **Python stats updater**: Robust retry logic with exponential backoff (3 attempts, 5min timeout)
- **Health monitoring**: `/health` and `/health/python` endpoints for system checks
- **Scheduled jobs**: Automated daily stats update at 3am ET using node-cron. Job execution logged to `JobExecutionLog` table. Admin alerts on failure via Resend email. Admin API for monitoring/manual triggers at `/api/admin/jobs/*`.
- **Current status**: Phases 1-4 complete (~98% overall). Automated stats scheduling fully implemented with logging and alerting. Next: polish & testing.

## Testing

Both frontend and backend use Vitest. For comprehensive testing documentation, see **[docs/TESTING.md](docs/TESTING.md)**.

### Quick Commands

```bash
# Frontend tests
cd frontend && npm test              # Run all tests
cd frontend && npm run test:watch    # Watch mode
cd frontend && npm run test:coverage # Coverage report

# Backend tests
cd backend && npm test               # Run all tests
cd backend && npm run test:watch     # Watch mode
cd backend && npm run test:coverage  # Coverage report
```

### Test Files

**Frontend** (`frontend/src/`):
- `contexts/AuthContext.test.tsx` - Auth state management
- `pages/Login.test.tsx` - Login form and validation
- `pages/Dashboard.test.tsx` - Dashboard rendering

**Backend** (`backend/src/`):
- `routes/healthRoutes.test.ts` - Health endpoints
- `routes/authRoutes.test.ts` - Auth endpoints
- `routes/playerRoutes.test.ts` - Player API
- `routes/teamRoutes.test.ts` - Team CRUD
- `services/scoringService.test.ts` - Best 7 of 8 scoring
- `middleware/seasonGuard.test.ts` - Phase protection

### Test Utilities

- **Frontend**: `src/test/testUtils.tsx` - Custom render, test fixtures
- **Frontend**: `src/test/mocks/api.ts` - API mock implementations
- **Backend**: `src/test/testUtils.ts` - JWT generation, mock req/res
- **Backend**: `src/test/mocks/db.ts` - Database mock implementations

## Quick Reference

**Add a new API endpoint:**
1. Define route in `backend/src/routes/*.ts`
2. Create controller in `backend/src/controllers/*.ts`
3. Add Zod schema in `backend/src/types/validation.ts` if needed
4. Add API function in `frontend/src/services/api.ts`

**Database changes:**
1. Update `backend/prisma/schema.prisma`
2. Create SQL migration in `backend/migrations/` directory
3. Execute migration in Supabase SQL Editor
4. Run `npx prisma db pull && npx prisma generate` to sync schema
5. The `db.ts` service will handle the Supabase queries

**Available migrations:**
- `add_payment_status_index.sql` - Adds index on Team.paymentStatus for admin queries
- `add_reminder_log.sql` - Creates ReminderLog table for tracking sent reminders
- `add_season_config.sql` - Creates SeasonConfig table for season phase management
- `add_job_execution_log.sql` - Creates JobExecutionLog table for tracking scheduled jobs

**Add a new page:**
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Use `ProtectedRoute` wrapper if auth required

**Work with scheduled jobs:**
1. Jobs run automatically at 3am ET (daily stats update + leaderboard recalculation)
2. Manually trigger: `npm run job:stats` or `npm run job:stats:date 2026-04-15`
3. Check job status: `GET /api/admin/jobs/status` (admin)
4. View job history: `GET /api/admin/jobs/history` (admin)
5. Trigger via API: `POST /api/admin/jobs/update-stats` (admin)
6. Disable scheduling: Set `DISABLE_SCHEDULED_JOBS=true` in environment
7. Configure alerts: Set `ADMIN_ALERT_EMAIL` for failure notifications

**Work with stats/leaderboards:**
1. Stats update runs automatically at 3am ET (see "Work with scheduled jobs" above)
2. Check Python health: `curl http://localhost:5000/health/python`
3. Update stats manually: `statsService.updatePlayerStats(2026)` or via admin API
4. Calculate team score: `scoringService.calculateTeamScore(teamId, 2026, true)`
5. Generate leaderboard: `leaderboardService.calculateOverallLeaderboard(2026)`
6. Retrieve cached: `leaderboardService.getOverallLeaderboard(2026)`
7. Test pipeline: `npm run test:phase3`

**Work with admin dashboard:**
1. Make user admin: `UPDATE "User" SET role = 'admin' WHERE email = 'user@example.com';`
2. Access admin panel: Navigate to `/admin` (requires admin role)
3. Admin API calls require valid JWT with `role: 'admin'`
4. Re-auth required for: reject team, delete user, send notifications, send reminders, end season

**Work with reminders:**
1. Navigate to `/admin/notifications` for Quick Reminders UI
2. Payment reminders: Select draft/pending statuses, click "Send Payment Reminder"
3. Lock deadline reminders: Enter lock date, click "Send Lock Reminder"
4. Check reminder history: `GET /api/admin/reminders/status`
5. Both actions require re-authentication before sending

**Work with season phases:**
1. Get current season: `GET /api/season/current` (public endpoint)
2. Admin season management: Navigate to `/admin` → Season Management card
3. Change phase: Select from dropdown, confirm in dialog
4. Create new season: Click "New Season" button in admin dashboard
5. Phase-protected routes use `requirePhase(['registration'])` middleware
6. Frontend uses `usePhaseCheck(['registration'])` hook for UI state

**Work with tests:**
1. Run frontend tests: `cd frontend && npm test`
2. Run backend tests: `cd backend && npm test`
3. Watch mode: `npm run test:watch` (in either directory)
4. Coverage: `npm run test:coverage` (generates HTML report in `coverage/`)
5. Frontend test utils: `src/test/testUtils.tsx` for custom render and fixtures
6. Backend test utils: `src/test/testUtils.ts` for JWT generation and mock helpers
7. Mock API calls: Use `vi.hoisted()` for proper mock hoisting with `vi.mock()`
8. Full documentation: See `docs/TESTING.md`

## Deployment

### Architecture
- **Frontend**: Vercel (static site) - `https://www.hrderbyus.com`
- **Backend**: Railway (Express) - `https://api.hrderbyus.com`
- **Database**: Supabase PostgreSQL

**Important**: Frontend calls API directly via `VITE_API_URL` (no Vercel rewrites).

### Project Structure
- Vercel root directory: `frontend/`
- Railway root directory: `backend/`
- Config file: `frontend/vercel.json` (handles SPA routing)

### Quick Deploy

**Frontend to Vercel:**
1. Root directory: `frontend`
2. Framework: Vite
3. Build: `npm run build`
4. Output: `dist`
5. Environment variables:
   - `VITE_API_URL=https://api.hrderbyus.com`
   - `VITE_STRIPE_PUBLIC_KEY=pk_live_...`

**Backend to Railway:**
1. Root directory: `backend`
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Key environment variables:
   - `FRONTEND_URL=https://www.hrderbyus.com`
   - `BACKEND_URL=https://api.hrderbyus.com`
   - See `VERCEL_DEPLOYMENT.md` for full list

### DNS Configuration
```
www  → CNAME → (Vercel provided value)
api  → CNAME → (Railway provided value)
```

### Key Files
- `frontend/vercel.json` - SPA routing (prevents 404 on refresh)
- `frontend/src/services/api.ts` - API URL configuration
- `backend/src/server.ts` - CORS configuration

**Complete Guide:** See `VERCEL_DEPLOYMENT.md` for full deployment instructions, troubleshooting, and security checklist.
