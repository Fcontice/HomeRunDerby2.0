# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Home Run Derby 2.0 - MLB fantasy sports pool where users draft 8-player teams and compete based on real-world home runs. Full-stack TypeScript monorepo with React frontend and Express backend.

## Development Commands

### Frontend (from `/frontend`)
```bash
npm run dev          # Start dev server on port 5173
npm run build        # TypeScript check + Vite build
npm test             # Run tests
```

### Backend (from `/backend`)
```bash
npm run dev                  # Start with hot reload (tsx watch)
npm run build                # Compile to dist/
npm start                    # Run compiled code
npm run prisma:generate      # Generate Prisma types
npm run import:season        # Import full season stats for eligibility (yearly)
npm run update:stats:python  # Update daily stats (during contest)
npm test                     # Run tests
```

## Architecture Essentials

### Database Pattern (Critical)

**Hybrid Prisma/Supabase setup** - Prisma schema for types, Supabase client for queries:
- Schema: `backend/prisma/schema.prisma`
- DB layer: `backend/src/services/db.ts` wraps Supabase, mimics Prisma API
- **Never use Prisma client directly** - always use `db.user`, `db.team`, `db.player`, etc.

### Authentication

JWT-based auth with httpOnly cookies for XSS protection:
- `access_token` (httpOnly, 15min) - API authorization
- `refresh_token` (httpOnly, 7 days) - Token refresh
- `XSRF-TOKEN` (readable, 1hr) - CSRF protection via double-submit pattern

Key files: `backend/src/middleware/auth.ts`, `backend/src/middleware/csrf.ts`, `frontend/src/services/api.ts`

### API Response Format

All endpoints return: `{ success: boolean, message?: string, data?: T, error?: { code, message } }`

### Key Patterns

- **Soft Deletes**: All entities use `deletedAt` field, queries auto-filter
- **Validation**: Zod schemas in `backend/src/types/validation.ts`
- **Team Constraints**: 8 players, ≤172 combined HRs, best 7 of 8 scoring
- **Season Phases**: `off_season` → `registration` → `active` → `completed`

## File Organization

**Frontend** (`/frontend/src`):
- `pages/` - Route components (includes `admin/` for admin dashboard)
- `components/ui/` - Radix UI components
- `contexts/` - AuthContext, SeasonContext
- `services/api.ts` - Axios instance with `authApi`, `teamsApi`, `playersApi`, `adminApi`, `seasonApi`

**Backend** (`/backend/src`):
- `routes/` - Route definitions
- `controllers/` - Request handlers
- `services/` - Core logic: `db.ts`, `statsService.ts`, `scoringService.ts`, `leaderboardService.ts`, `scheduledJobs.ts`
- `scripts/python/` - MLB-StatsAPI stats updater
- `middleware/` - Auth, CSRF, error handling, season guards

## Environment Variables

Backend (`backend/src/env.ts`):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` - Database (required)
- `JWT_SECRET` - Token signing (required)
- `RESEND_API_KEY` - Email service (required in production)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Payments (required)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth (optional)
- `DISABLE_SCHEDULED_JOBS` - Set `"true"` to disable cron jobs
- `ADMIN_ALERT_EMAIL` - Job failure alerts

Frontend: `VITE_API_URL`, `VITE_STRIPE_PUBLIC_KEY`

## Stats & Scheduled Jobs

- **Yearly setup**: `npm run import:season` - Import previous season for eligibility
- **Daily updates**: Automated at 3am ET via node-cron, or `npm run update:stats:python`
- **Admin API**: `/api/admin/jobs/*` for monitoring and manual triggers
- **Health check**: `GET /health/python` verifies Python environment

## Quick Reference

**Add API endpoint:**
1. Route in `backend/src/routes/*.ts`
2. Controller in `backend/src/controllers/*.ts`
3. Zod schema in `backend/src/types/validation.ts` if needed
4. API function in `frontend/src/services/api.ts`

**Database changes:**
1. Update `backend/prisma/schema.prisma`
2. Create migration in `backend/migrations/`
3. Execute in Supabase SQL Editor
4. Run `npx prisma db pull && npx prisma generate`

**Add page:**
1. Component in `frontend/src/pages/`
2. Route in `frontend/src/App.tsx`
3. Use `ProtectedRoute` if auth required

**Make user admin:**
```sql
UPDATE "User" SET role = 'admin' WHERE email = 'user@example.com';
```

## Deployment

- **Frontend**: Vercel at `https://www.hrderbyus.com` (root: `frontend/`)
- **Backend**: Railway at `https://api.hrderbyus.com` (root: `backend/`)
- **Database**: Supabase PostgreSQL

See `VERCEL_DEPLOYMENT.md` for full deployment guide.

## Testing

Both frontend and backend use Vitest. See `docs/TESTING.md` for details.

```bash
cd frontend && npm test    # Frontend tests
cd backend && npm test     # Backend tests
```
