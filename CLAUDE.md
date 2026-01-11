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

### Authentication Flow

JWT-based auth with email/password and Google OAuth via Passport.js:

1. **Frontend**: Tokens stored in localStorage, managed by `AuthContext`
2. **API requests**: Axios interceptor adds `Authorization: Bearer <token>` header
3. **Backend**: `authenticate` middleware validates JWT and attaches `req.user`
4. **Email verification**: Required before users can create teams

Key middleware in `backend/src/middleware/auth.ts`:
- `authenticate` / `requireAuth` - Standard auth check
- `requireAdmin` - Role-based access
- `requireOwnership` - User owns the resource
- `optionalAuth` - Attach user if token exists, don't fail if missing

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
- `components/ui/` - Reusable Radix UI components (button, card, input, etc.)
- `components/team/` - Team-specific components
- `contexts/AuthContext.tsx` - Global auth state
- `services/api.ts` - Axios instance with all API endpoints organized as `authApi`, `teamsApi`, `playersApi`

**Backend** (`/backend/src`):
- `routes/` - Route definitions (auth, teams, players, payments, leaderboards)
- `controllers/` - Request handlers with business logic
- `services/` - Core business logic services:
  - `db.ts` - Database abstraction layer (Supabase wrapper)
  - `emailService.ts` - Resend email integration
  - `statsService.ts` - TypeScript wrapper that calls Python MLB-StatsAPI script
  - `scoringService.ts` - Team scoring calculator ("best 7 of 8" logic)
  - `leaderboardService.ts` - Leaderboard generation & caching
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

### Background Jobs
BullMQ + Redis configured but not fully implemented. Job queues defined for player stats sync and leaderboard calculation.

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
- **Update Schedule**: Daily at 3am ET (recommended via cron/Task Scheduler)

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

2. **Active Contest (Daily)**: `update:stats:python`
   - Updates current season's game-by-game data (e.g., 2026 daily HRs)
   - Populates `PlayerStats` table with daily tracking
   - Runs daily during contest for live leaderboard updates
   - Tracks regular season vs postseason HRs separately
   - Should be scheduled via cron/Task Scheduler at 3am ET

**Python Script Documentation:**
See `backend/src/scripts/python/README.md` for complete implementation details, scheduling options, and troubleshooting.

## Important Notes

- **LocalStorage security**: Tokens currently stored in localStorage (XSS vulnerable). Consider httpOnly cookies for production.
- **Token refresh**: No rotation implemented yet.
- **Rate limiting**: Applied globally at 100 req/15min per IP.
- **Email service**: Uses Resend API configured in `emailService.ts`.
  - Throws errors in production for failed sends
  - Throws in development unless `DISABLE_EMAIL_ERRORS=true`
  - Detailed error logging for debugging
- **Payments**: Stripe integration with webhook processing fully functional.
- **Python stats updater**: Robust retry logic with exponential backoff (3 attempts, 5min timeout)
- **Health monitoring**: `/health` and `/health/python` endpoints for system checks
- **Current status**: Phases 1-3 complete, Phase 4 ~40% (~70% overall). Next: Admin dashboard, email notifications.

## Testing

Vitest configured but test coverage is minimal. Run tests with:
```bash
npm run test        # (frontend or backend)
```

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

**Add a new page:**
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Use `ProtectedRoute` wrapper if auth required

**Work with stats/leaderboards:**
1. Check Python health: `curl http://localhost:5000/health/python`
2. Update stats: `statsService.updatePlayerStats(2025)` (includes retry logic)
3. Calculate team score: `scoringService.calculateTeamScore(teamId, 2025, true)`
4. Generate leaderboard: `leaderboardService.calculateOverallLeaderboard(2025)`
5. Retrieve cached: `leaderboardService.getOverallLeaderboard(2025)`
6. Test pipeline: `npm run test:phase3`

## Deployment

### Architecture
- **Frontend**: Vercel (static site) - configured in `vercel.json`
- **Backend**: Railway/Render (Express + BullMQ) - `https://hrderbyus.com`
- **API Proxy**: Vercel rewrites `/api/*` → backend domain

### Quick Deploy

**Frontend to Vercel:**
```bash
vercel                    # Deploy to preview
vercel --prod            # Deploy to production
vercel env add           # Add environment variables
```

**Backend to Railway:**
1. Connect GitHub repo at railway.app
2. Set root directory: `backend`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Add environment variables (see `VERCEL_DEPLOYMENT.md`)

**Environment Variables:**
- Frontend (Vercel): `VITE_API_URL`, `VITE_STRIPE_PUBLIC_KEY`
- Backend (Railway): See `PROJECT_CONTEXT.md` → Environment Variables → Production

**Complete Guide:** See `VERCEL_DEPLOYMENT.md` for full deployment instructions, troubleshooting, and security checklist.
