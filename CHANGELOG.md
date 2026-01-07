# CHANGELOG

All notable changes to Home Run Derby 2.0 project.

## [Unreleased]

### Phase 3 Refactor: MLB-StatsAPI Migration - December 31, 2025

#### Changed
- **Migrated player stats data source from Baseball Savant CSV to MLB-StatsAPI (Official MLB API)**

**Motivation:**
- Required game-by-game tracking for accurate daily and monthly leaderboards
- Needed to separate regular season from postseason stats per contest rules
- Baseball Savant provides only season totals, not granular game-by-game data
- MLB-StatsAPI is official, reliable, and provides real-time game-level data

**Architecture Changes:**
- **Previous**: TypeScript scraper fetching Baseball Savant CSV (season totals only, postseason mixed in)
- **Current**: Python script using MLB-StatsAPI library (game-by-game, regular season filtered, postseason excluded)

**Implementation:**
- Created `backend/src/scripts/python/update_stats.py` - Main stats updater using MLB-StatsAPI
- Created `backend/src/scripts/python/db_utils.py` - Supabase database utilities for Python
- Created `backend/src/scripts/python/test_connection.py` - Database connectivity test
- Created `backend/src/scripts/python/requirements.txt` - Python dependencies (MLB-StatsAPI==1.9.0, supabase==2.10.0)
- Created `backend/src/scripts/python/README.md` - Complete documentation (270+ lines)
- Refactored `backend/src/services/statsService.ts` - Now calls Python script via `child_process.exec()`
- Updated `backend/src/scripts/testPhase3.ts` - Added --date flag, updated for Python implementation
- Updated `backend/package.json` - Added npm scripts: `update:stats:python`, `update:stats:install`

**Data Flow:**
```
MLB-StatsAPI → Python Script → Supabase PlayerStats → TypeScript API (read-only)
```

1. Python script fetches schedule for target date from MLB API
2. Filters for regular season games only (`game_type='R'`)
3. Parses box scores to extract HR counts per player per game
4. Aggregates daily totals (sum HRs across all games played on date)
5. Calculates cumulative season totals (previous total + daily HRs)
6. Writes directly to Supabase PlayerStats table (upsert by playerId, seasonYear, date)
7. TypeScript services read from PlayerStats for scoring/leaderboards

**Key Features:**
- ✅ Game-by-game home run tracking (not just season totals)
- ✅ Regular season filtering (excludes spring training, all-star, postseason)
- ✅ Direct Supabase writes from Python (no TypeScript intermediary)
- ✅ Player metadata updates (team, name) from MLB API
- ✅ Idempotent operations (safe to re-run for same date)
- ✅ Tracks 2026 season forward (no historical backfill)

**Usage:**
```bash
# Install Python dependencies (one-time)
npm run update:stats:install

# Update yesterday's stats (default)
npm run update:stats:python

# Update specific date
npm run update:stats:python -- --date 2026-04-15

# Test full pipeline
npm run test:phase3

# Test with specific date
npm run test:phase3 -- --date 2026-04-15
```

**Improvements Over Baseball Savant:**
| Feature | Baseball Savant | MLB-StatsAPI |
|---------|----------------|--------------|
| Data Source | CSV export | Official MLB API |
| Granularity | Season totals only | Game-by-game |
| Postseason | Mixed with regular | Filtered out |
| Player Metadata | Limited | Full team/position |
| Reliability | Depends on CSV format | Official API |
| Rate Limiting | None needed | Built-in |

**Breaking Changes:**
- **None for API consumers** - All endpoints remain unchanged
- **Internal only**: `statsService.fetchCurrentSeasonStats()` deprecated with clear error message
- `statsService.updatePlayerStats()` now calls Python script instead of scraping

**Scheduling:**
- Recommended: Daily at 3:00 AM Eastern Time (after all games conclude)
- Options: Cron (Linux/Mac), Windows Task Scheduler, or BullMQ (future)
- See `backend/src/scripts/python/README.md` for complete scheduling guide

---

### Bug Fixes - December, 2025

#### Fixed
- **Payment Routes Import Error**
  - Fixed incorrect import path for `asyncHandler` in `paymentRoutes.ts`
  - Changed from `../utils/errors.js` to `../middleware/errorHandler.js`
  - Resolved: `SyntaxError: The requested module '../utils/errors.js' does not provide an export named 'asyncHandler'`

- **Missing TeamPlayer Database Service**
  - Added `teamPlayerDb` service to `backend/src/services/db.ts` with full CRUD operations
  - Implemented `findMany`, `findUnique`, `create`, `delete`, and `count` methods
  - Added `teamPlayer` property to exported `db` object
  - Resolved: `TypeError: Cannot read properties of undefined (reading 'findMany')` when validating team player count

- **User Email Field in Team Queries**
  - Updated `teamDb.findUnique` to include `email` field in user selection
  - Required for payment controller to access user email for checkout sessions
  - Affects both single user and combined user+teamPlayers queries

  - **UUID Generation Bug in Database Inserts**
  - Fixed "null value in column 'id' violates not-null constraint" error preventing user registration
  - Updated all `create()` methods in `backend/src/services/db.ts` to filter out null/undefined `id` values before insert
  - Affected methods: `userDb.create()`, `playerDb.create()`, `teamDb.create()`, `playerSeasonStatsDb.create()`
  - **Database fix required**: SQL migration needed to add `DEFAULT gen_random_uuid()` to all `id` columns (User, Team, Player, TeamPlayer, PlayerSeasonStats)
  - Resolved: User registration, team creation, and all database insert operations now work correctly

---

### Phase 2.5: Payment System Integration - December 30, 2025

#### Added
- **Payment Service Layer** (`backend/src/services/paymentService.ts`)
  - Provider abstraction interface (`IPaymentProvider`) for payment system flexibility
  - Stripe implementation with checkout session creation
  - Webhook signature verification
  - Payment status retrieval
  - Factory pattern for easy provider swapping (1-2 day swap time)
  - Entry fee constant: $100.00 USD

- **Webhook Processing** (`backend/src/services/webhookHandlers.ts`)
  - `handlePaymentSuccess()` - Updates team to paid/entered status
  - `handlePaymentFailure()` - Marks team as rejected
  - Email confirmation on successful payment
  - Idempotency protection with database-level unique constraint

- **Payment Controller** (`backend/src/controllers/paymentController.ts`)
  - `POST /api/payments/checkout` - Create Stripe checkout session
  - `POST /api/payments/webhook` - Process Stripe webhook events
  - Ownership validation (users can only pay for their own teams)
  - Player count validation (exactly 8 players required)
  - Payment status validation (prevents duplicate payments)
  - Payment amount validation (rejects incorrect amounts)

- **Payment Routes** (`backend/src/routes/paymentRoutes.ts`)
  - Checkout endpoint with authentication and rate limiting
  - Webhook endpoint with signature verification (no auth required)

- **Payment Rate Limiters** (`backend/src/middleware/paymentRateLimits.ts`)
  - Checkout: 10 requests per 15 minutes per user
  - Webhook: 100 requests per minute (bypassed for valid Stripe signatures)

- **Frontend Payment Page** (`frontend/src/pages/PaymentPage.tsx`)
  - Team summary display with HR totals
  - Stripe Checkout redirect button
  - Payment cancellation handling
  - Success/failure state management

- **Database Migration** (`backend/migrations/add_unique_stripe_payment_id.sql`)
  - Unique constraint on `Team.stripePaymentId` for idempotency
  - Migration instructions in `backend/migrations/README.md`

- **API Integration** (`frontend/src/services/api.ts`)
  - `paymentsApi.createCheckout()` method
  - `teamsApi.getTeam()` alias for team retrieval

- **Documentation**
  - `PAYMENT_IMPLEMENTATION.md` - Complete payment system documentation (270+ lines)
  - Architecture patterns, security audit, testing checklist, production deployment guide

#### Security Enhancements
- ✅ **CRITICAL**: Stripe credential validation at startup (prevents running with missing keys)
- ✅ **CRITICAL**: Database-level idempotency protection (unique constraint + error handling)
- ✅ **HIGH**: Webhook error response standardization (always returns 200 OK)
- ✅ **HIGH**: Payment amount validation in webhook (prevents price manipulation)
- ✅ **HIGH**: Payment-specific rate limiting (checkout + webhook)
- ✅ **MEDIUM**: Comprehensive payment status validation (handles all states)

#### Modified
- `backend/src/env.ts` - Added Stripe environment variable validation with fail-fast
- `backend/src/server.ts` - Added raw body parser for webhook signature verification
- `backend/prisma/schema.prisma` - Added unique constraint to `Team.stripePaymentId`
- `backend/src/types/validation.ts` - Added `createCheckoutSchema` for checkout validation
- `frontend/src/pages/CreateTeam.tsx` - Redirect to payment page after team creation
- `frontend/src/App.tsx` - Added protected route `/teams/:teamId/payment`

#### Technical Details
- **Payment Provider**: Stripe Checkout (hosted payment page)
- **Webhook Events**: `checkout.session.completed`, `payment_intent.payment_failed`
- **Idempotency**: Database unique constraint + application-level checks
- **Security**: HMAC-SHA256 signature verification, rate limiting, amount validation
- **Team Flow**: draft → pending → paid/rejected/refunded
- **Entry Status**: draft → entered (on successful payment)

---

### Phase 3: Scoring & Leaderboards - December 30, 2025

#### Added
- **Player Stats Service** (`backend/src/services/statsService.ts`)
  - `fetchCurrentSeasonStats()` - Scrapes Baseball Savant CSV for current season home run data
  - `updatePlayerStats()` - Creates/updates daily PlayerStats records for all players
  - `getLatestPlayerStats()` - Retrieves most recent stats for a player
  - `getPlayerStatsDateRange()` - Queries stats within a date range
  - Data source: Baseball Savant leaderboard CSV (https://baseballsavant.mlb.com)
  - Automatic player matching via MLB ID (mlb-{playerId} format)

- **Team Scoring Service** (`backend/src/services/scoringService.ts`)
  - **"Best 7 of 8" Algorithm** - Core fantasy scoring logic
    - Fetches latest stats for all 8 players on a team
    - Sorts players by home run total (descending)
    - Marks top 7 players as "included"
    - Sums only the top 7 for team score
  - `calculateTeamScore()` - Real-time score calculation for a single team
  - `calculateAllTeamScores()` - Scores all entered/locked teams, sorted by totalHrs
  - `getTeamRank()` - Finds team's ranking in overall leaderboard
  - `calculateMonthlyScores()` - Monthly leaderboard with date-range filtering (regular season only)
  - Separates regular season vs postseason home runs
  - Returns detailed player breakdown (included/excluded status)

- **Leaderboard Service** (`backend/src/services/leaderboardService.ts`)
  - **Database-Backed Caching** - Pre-calculated rankings stored in Leaderboard table
  - `calculateOverallLeaderboard()` - Generates overall season rankings (regular + postseason)
  - `calculateMonthlyLeaderboard()` - Generates monthly rankings (regular season only)
  - `getOverallLeaderboard()` - Fast retrieval of cached overall rankings
  - `getMonthlyLeaderboard()` - Fast retrieval of cached monthly rankings
  - `recalculateAllLeaderboards()` - Bulk recalculation (overall + March-September)
  - Automatic clearing of old leaderboard data before recalculation
  - Enriched entries with user info (username, avatarUrl)

- **Leaderboard Controller** (`backend/src/controllers/leaderboardController.ts`)
  - `GET /api/leaderboards/overall` - Retrieve cached overall leaderboard
  - `GET /api/leaderboards/monthly/:month` - Retrieve cached monthly leaderboard (1-12)
  - `GET /api/leaderboards/team/:teamId` - Real-time team score with rank
  - `GET /api/leaderboards/stats` - League-wide statistics (avg, high, low scores)
  - `POST /api/leaderboards/recalculate` - Manual recalculation trigger (admin only)
  - All endpoints support `?seasonYear=2025` query parameter
  - Consistent response format with metadata (totalTeams, leaderboardType, seasonYear)

- **Leaderboard Routes** (`backend/src/routes/leaderboardRoutes.ts`)
  - 5 public endpoints for leaderboard data
  - Admin-only recalculation endpoint with `requireAdmin` middleware
  - Registered in `backend/src/server.ts` at `/api/leaderboards`

- **Database Operations** (`backend/src/services/db.ts`)
  - **PlayerStats Database Service** (lines 883-994)
    - `findMany()` - Query with filters (playerId, seasonYear, date with gte/lte)
    - `findFirst()` - Get single record with ordering
    - `findUnique()` - Lookup by composite key (playerId, seasonYear, date)
    - `create()` - Insert new stats record
    - `update()` - Modify existing stats
    - `upsert()` - Insert or update (idempotent stats updates)
    - `getLatest()` - Helper to get most recent stats for a player
  - **Leaderboard Database Service** (lines 996-1107)
    - `findMany()` - Query with filters (teamId, leaderboardType, month, seasonYear)
    - `findUnique()` - Lookup by composite key (teamId, leaderboardType, month)
    - `create()` - Insert leaderboard entry
    - `delete()` - Remove specific entry
    - `deleteMany()` - Bulk deletion for recalculation

- **Phase 3 Test Script** (`backend/src/scripts/testPhase3.ts`)
  - Comprehensive 7-step pipeline test
  - Tests: scraping → stats update → scoring → leaderboard generation → caching → retrieval
  - Detailed console output with sample data verification
  - Shows top teams, player breakdowns, and league statistics
  - Run with: `npm run test:phase3`

- **NPM Script** (`backend/package.json`)
  - `npm run test:phase3` - Execute Phase 3 pipeline test

#### Technical Architecture

**Two-Table Stats Design:**
- `PlayerSeasonStats` - Historical archive (e.g., 2024 HRs for 2025 eligibility)
- `PlayerStats` - Live tracking with daily records (date, hrsTotal, hrsRegularSeason, hrsPostseason)

**Leaderboard Types:**
- **Overall** - Full season (regular + postseason), "best 7 of 8" scoring
- **Monthly** - Single month (regular season only), date-range filtered
- **All-Star** - Future feature (snapshot at All-Star break)

**Data Flow:**
1. Baseball Savant CSV scraped daily → `PlayerStats` table updated
2. Team scores calculated using "best 7 of 8" logic → sorted by totalHrs
3. Leaderboard entries generated with ranks → cached in `Leaderboard` table
4. API endpoints serve cached data for fast retrieval

**Performance Optimizations:**
- Database-backed caching eliminates expensive recalculations on every request
- Leaderboard table stores pre-computed ranks and totals
- Monthly leaderboards use date-range queries for precision
- Bulk operations for all-team calculations

#### Modified
- `backend/src/services/db.ts` - Added `playerStats` and `leaderboard` database operations to exported `db` object
- `backend/src/server.ts` - Registered leaderboard routes at `/api/leaderboards`
- `backend/package.json` - Added `test:phase3` script

#### API Endpoints
```
GET  /api/leaderboards/overall              - Overall season leaderboard
GET  /api/leaderboards/monthly/:month       - Monthly leaderboard (1-12)
GET  /api/leaderboards/team/:teamId         - Specific team ranking + score
GET  /api/leaderboards/stats                - League-wide statistics
POST /api/leaderboards/recalculate          - Manual recalc (admin only)
```

#### Interfaces & Types
```typescript
// Player score with inclusion status
interface PlayerScore {
  playerId: string
  playerName: string
  hrsTotal: number
  hrsRegularSeason: number
  hrsPostseason: number
  included: boolean  // Whether in best 7
}

// Team score with player breakdown
interface TeamScore {
  teamId: string
  teamName: string
  totalHrs: number           // Sum of best 7 players
  regularSeasonHrs: number
  postseasonHrs: number
  playerScores: PlayerScore[]
  calculatedAt: string
}

// Leaderboard entry with user info
interface LeaderboardEntry {
  rank: number
  teamId: string
  teamName: string
  totalHrs: number
  userId: string
  username: string
  avatarUrl: string | null
  playerScores?: any[]  // Optional detailed breakdown
}
```

#### Testing Phase 3
```bash
cd backend
npm run test:phase3
```

Test verifies:
- ✅ Stats scraping from Baseball Savant
- ✅ PlayerStats table updates (created/updated counts)
- ✅ Sample player verification (5 random players)
- ✅ Team scoring with "best 7 of 8" breakdown
- ✅ Overall leaderboard generation and caching
- ✅ Monthly leaderboard generation
- ✅ Cached leaderboard retrieval

---

### Phase 2: Team Creation UI - December 29, 2025

#### Added
- **Team Creation Components**
  - `PlayerCard.tsx` - Display individual players with name, team, and HR stats
  - `TeamRoster.tsx` - 8-slot roster with real-time validation and HR total counter
  - `PlayerBrowser.tsx` - Browse and search players with filters for season year
  - `CreateTeam.tsx` - Main team creation page with two-column layout

- **Team Creation Features**
  - Email verification check before team creation
  - Real-time validation for 8 players and ≤172 HRs constraint
  - Search and filter players by name
  - Visual feedback for selected/disabled players
  - Remove players from roster functionality
  - Team name input with validation

- **Dashboard Integration**
  - Added "Create Your First Team" button on Dashboard
  - Added protected route `/create-team` to App.tsx

#### Fixed
- Team creation 403 error - changed `req.user.id` to `req.user.userId` in teamController.ts:36
- Email verification flow now correctly recognizes verified users
- User lookup in team creation endpoint properly accesses user ID

---

## Phase 1: Foundation - December 23, 2025

### Added

#### Database Schema (Complete)
- **Prisma Schema** with 7 tables defined in `backend/prisma/schema.prisma`
  - `User` - Authentication with email verification and password reset tokens
  - `Team` - Fantasy teams with payment status tracking
  - `Player` - MLB player pool with eligibility flags
  - `TeamPlayer` - Junction table for team rosters (8 players per team)
  - `PlayerStats` - Daily/seasonal HR statistics
  - `Leaderboard` - Cached rankings (overall, monthly, all-star)
  - `Notification` - Email and in-app notification logs

- **Enums**
  - `AuthProvider` (email, google)
  - `UserRole` (user, admin)
  - `PaymentStatus` (draft, pending, paid, rejected, refunded)
  - `EntryStatus` (draft, entered, locked)
  - `LeaderboardType` (overall, monthly, allstar)
  - `NotificationType` (email, in_app)

- **Database Configuration**
  - Supabase PostgreSQL integration with pooler support
  - Migration system with SQL scripts in `backend/migrations/`
  - `001_cumulative_archive_schema.sql` - Initial database schema
  - UUID default generation fixes

#### Backend Authentication System

- **API Endpoints** (9 authentication routes)
  - `POST /api/auth/register` - Email/password registration
  - `POST /api/auth/verify-email` - Email verification with token
  - `POST /api/auth/login` - Login with JWT token generation
  - `POST /api/auth/forgot-password` - Password reset request
  - `POST /api/auth/reset-password` - Password reset with token
  - `POST /api/auth/logout` - Logout endpoint
  - `GET /api/auth/me` - Get current user profile
  - `GET /api/auth/google` - Google OAuth initiation
  - `GET /api/auth/google/callback` - OAuth callback handler

- **Authentication Infrastructure**
  - Passport.js configuration with Local, Google OAuth, and JWT strategies
  - JWT utilities for token generation and verification (24-hour expiry)
  - bcrypt password hashing with salt rounds of 10
  - Email verification flow with 24-hour token expiry
  - Password reset flow with token generation

- **Security Middleware**
  - `authenticate` / `requireAuth` - JWT validation
  - `requireAdmin` - Role-based access control
  - `requireOwnership` - Resource ownership verification
  - `optionalAuth` - Optional authentication for public endpoints
  - Helmet.js security headers
  - CORS configuration for frontend domain
  - Rate limiting (100 requests per 15 minutes per IP)

- **Error Handling**
  - Custom error classes: `AuthenticationError`, `ValidationError`, `NotFoundError`, `ConflictError`, `AuthorizationError`, `BadRequestError`, `PaymentError`, `TeamError`, `AppError`
  - Global error handling middleware with consistent JSON response format
  - `asyncHandler` wrapper for automatic async error catching
  - Centralized error responses with status codes

- **Validation**
  - Zod schemas for request validation in `backend/src/types/validation.ts`
  - Schemas: register, login, verifyEmail, forgotPassword, resetPassword, updateProfile

- **Email Service**
  - Resend API integration for transactional emails
  - HTML email templates:
    - Email verification with clickable link
    - Password reset with secure token
    - Payment confirmation
    - Team locked notification
  - Professional styling with responsive design

#### Backend Team & Player Routes

- **Team Routes** (`backend/src/routes/teamRoutes.ts`)
  - `POST /api/teams` - Create new team
  - `GET /api/teams/my-teams` - Get user's teams
  - `GET /api/teams/:id` - Get team details
  - `PATCH /api/teams/:id` - Update team
  - `DELETE /api/teams/:id` - Delete team

- **Player Routes** (`backend/src/routes/playerRoutes.ts`)
  - `GET /api/players` - Get eligible players with filters
  - `GET /api/players/search` - Search players by name
  - `GET /api/players/stats/summary` - Player statistics summary
  - `GET /api/players/:id` - Get player by ID

- **Backend Services**
  - Database service (`db.ts`) - Supabase wrapper mimicking Prisma API
  - Email service (`emailService.ts`) - Resend integration
  - Scraper service (`scraperService.ts`) - Baseball Reference scraping (partial)

#### Frontend Authentication System

- **Pages**
  - `Login.tsx` - Login form with Google OAuth button
  - `Register.tsx` - Registration with validation (username, email, password)
  - `VerifyEmail.tsx` - Email verification handler with token from URL
  - `Dashboard.tsx` - Protected dashboard showing user info and teams

- **Components**
  - `ProtectedRoute.tsx` - Route wrapper for authentication
  - shadcn/ui components:
    - `Button.tsx` - Multiple variants (default, destructive, outline, secondary, ghost, link)
    - `Input.tsx` - Form input with validation states
    - `Label.tsx` - Form labels
    - `Card.tsx` - Card layout components (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
    - `Alert.tsx` - Alert messages (default, destructive)

- **Context & API**
  - `AuthContext.tsx` - Global authentication state management
    - User state and loading state
    - Login, logout, register functions
    - Token persistence in localStorage
    - Auto-login on app mount
  - `api.ts` - Axios client with interceptors
    - Auto-attach JWT tokens to requests
    - Handle 401 errors with auto-logout
    - Organized API methods: `authApi`, `teamsApi`, `playersApi`

- **Features**
  - React Hook Form integration for all forms
  - Zod validation on frontend
  - Loading states and error handling
  - Tailwind CSS styling
  - Dark mode support via CSS variables

#### Configuration Files

- **Environment Variables**
  - `backend/.env.example` - Backend configuration template
  - `frontend/.env` - Frontend API URL and Stripe public key
  - Backend environment validated in `env.ts` with fail-fast on missing critical vars

- **Development Scripts**
  - Backend: `npm run dev` (tsx watch), `npm run build`, `npm run prisma:generate`
  - Frontend: `npm run dev` (Vite), `npm run build`, `npm run preview`
  - Database: `npm run prisma:push`, `npm run prisma:migrate`, `npm run prisma:studio`

#### Documentation

- `CLAUDE.md` - Guide for Claude Code instances with architecture patterns
- `PROJECT_CONTEXT.md` - Complete project requirements and specifications (642 lines)
- `README.md` - Getting started guide and tech stack overview
- `PHASE_1_SUMMARY.md` - Phase 1 implementation details
- `PHASE_1_COMPLETE.md` - Complete guide with setup and testing
- `FRONTEND_COMPLETE.md` - Frontend authentication system documentation

### Fixed

- Supabase connection pooler compatibility by adding `?pgbouncer=true` parameter
- Direct database connection (port 5432) accessibility issues - used SQL Editor for migrations
- Prisma migration errors with prepared statements on pooler connection
- TypeScript build errors in frontend (unused imports, type assertions)
- Frontend API URL import.meta.env type issues

### Technical Details

- **Build Status**: Frontend builds successfully with zero errors
- **Database**: All 7 tables created in Supabase with proper indexes and relationships
- **Servers**: Both backend (port 5000) and frontend (port 5173) running successfully
- **Testing**: Full authentication flow verified (register → verify → login → dashboard)

---

## Development Environment

### Services Configured
- **Supabase** - PostgreSQL database with pooler on port 6543
- **Upstash Redis** - Cache layer configured but not fully utilized
- **Resend** - Email service for verification and notifications
- **Google OAuth** - Credentials configured for social login

### Known Issues
- Background jobs (BullMQ) infrastructure ready but not automated
- Redis caching infrastructure ready but not utilized
- Admin routes not implemented
- Structured logging (Winston/Pino) not implemented (using console.log)
- Leaderboard UI page not yet built (API endpoints functional)

---

## Progress Summary

### Completed (Phase 1 - 100%)
✅ Database schema with 7 tables and relationships
✅ Complete authentication system (backend + frontend)
✅ Email verification flow with Resend
✅ Password reset functionality
✅ Protected routes with JWT
✅ Error handling and validation
✅ Security middleware (Helmet, CORS, rate limiting)
✅ User dashboard

### Completed (Phase 2 - 100%)
✅ Team creation UI with player selection
✅ Player browsing and search
✅ Real-time team validation (8 players, ≤172 HRs)
✅ Backend team and player routes
✅ Stripe payment integration with provider abstraction
✅ Payment webhook processing with security hardening
✅ Frontend payment page with Stripe Checkout
⏳ Admin approval system (deferred to Phase 4)

### Completed (Phase 3 - 100%) - Refactored December 31, 2025
✅ Player stats updater (MLB-StatsAPI Python script - replaced Baseball Savant)
✅ Game-by-game tracking with regular season filtering
✅ Team scoring calculator ("best 7 of 8" logic)
✅ Leaderboard calculation engine (overall + monthly)
✅ Database-backed leaderboard caching
✅ Leaderboard API endpoints (5 routes)
✅ Comprehensive test script (7-step pipeline verification)

### Pending (Phase 4-5)
❌ Leaderboard UI pages (frontend)
❌ Player profile/stats pages
❌ Admin dashboard with team approval workflow
❌ Email notification system for leaderboard updates
❌ Background jobs for automated stats syncing (BullMQ + Redis)
❌ Production deployment configuration

---

## Migration Notes

- Initial schema applied via Supabase SQL Editor due to pooler limitations
- UUID defaults set using `gen_random_uuid()` PostgreSQL function
- All tables use soft deletes via `deletedAt` timestamp field
- Connection pooler requires `?pgbouncer=true` parameter for compatibility
