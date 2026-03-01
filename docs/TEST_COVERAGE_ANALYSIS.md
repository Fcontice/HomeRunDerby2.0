# Test Coverage Analysis

**Date:** 2026-03-01
**Scope:** Full-stack (frontend + backend)

---

## Current State Summary

| Area | Source Files | Test Files | Estimated Coverage |
|------|-------------|------------|-------------------|
| **Backend Routes** | 6 | 4 | ~65% |
| **Backend Services** | 9 | 1 | ~10% |
| **Backend Controllers** | 8 | 0 | 0% (tested indirectly via routes) |
| **Backend Middleware** | 5 | 1 | ~20% |
| **Backend Utilities** | 5 | 2 | ~40% |
| **Frontend Pages** | 17 | 2 | ~12% |
| **Frontend Components** | 26+ | 0 | 0% |
| **Frontend Services** | 1 (1,290 lines) | 0 | 0% |
| **Frontend Contexts** | 2 | 1 | 50% |
| **Frontend Hooks** | 2 | 0 | 0% |

**Backend overall:** ~30% | **Frontend overall:** ~5%

---

## What's Currently Tested

### Backend (7 test files)

- **`authRoutes.test.ts`** — Registration, login, email verification, password reset flows. Good coverage of error cases and status codes.
- **`teamRoutes.test.ts`** — Team CRUD, HR cap validation (<=172), player count enforcement (exactly 8), authorization, and season phase guards.
- **`playerRoutes.test.ts`** — Player listing with pagination, search (case insensitivity), stats summary, cap percentage calculations.
- **`healthRoutes.test.ts`** — Basic health endpoint, timestamp format, uptime.
- **`scoringService.test.ts`** — Best 7-of-8 scoring, teams with <8 players, zero-stat players, batch scoring, rank calculations.
- **`seasonGuard.test.ts`** — Phase matching/blocking, multi-phase support, error messages, graceful DB error handling.
- **`statusTransitions.test.ts`** — Payment state machine (draft->pending->paid->refunded), entry transitions, terminal states, helper functions.

### Frontend (3 test files)

- **`AuthContext.test.tsx`** — Auth state management, login/register flows, CSRF handling, token refresh, session restoration.
- **`Dashboard.test.tsx`** — Page rendering, nav links, season phase-conditional UI, admin role-conditional UI, logout.
- **`Login.test.tsx`** — Form rendering, validation, submission (success/failure), error display, Google login button.

---

## Priority 1: Security-Critical Gaps

These are untested areas where bugs could lead to security vulnerabilities.

### 1. Authentication Middleware (`backend/src/middleware/auth.ts` — 306 lines)

**Risk:** This is the gatekeeper for every protected endpoint. A bug here means unauthorized access.

**What needs testing:**
- `authenticate()` — Token extraction priority (cookie vs Authorization header), JWT verification, expired token handling
- `requireAdmin()` — Role enforcement, what happens with missing/malformed role claims
- `requireOwnership()` — Resource ownership checks, IDOR prevention
- `requireEmailVerified()` — Unverified user blocking
- `optionalAuthenticate()` — Graceful fallback when no token present

**Example test cases:**
```typescript
it('should reject requests with expired tokens')
it('should prefer cookie token over Authorization header')
it('should block non-admin users from admin endpoints')
it('should prevent users from accessing other users resources')
it('should allow unauthenticated access with optionalAuthenticate')
```

### 2. CSRF Middleware (`backend/src/middleware/csrf.ts` — 248 lines)

**Risk:** CSRF bypass means attackers can perform actions on behalf of authenticated users.

**What needs testing:**
- `generateCSRFToken()` — Token generation uses crypto-safe randomness
- `validateCSRFToken()` — Timing-safe comparison prevents timing attacks
- `csrfProtection()` — Safe methods (GET/HEAD/OPTIONS) are skipped, unsafe methods require valid token
- Skip list logic — Webhooks and public endpoints correctly bypass CSRF
- Token rotation on successful validation

### 3. JWT Utilities (`backend/src/utils/jwt.ts` — 66 lines)

**Risk:** Token generation/verification bugs could allow token forgery or bypass.

**What needs testing:**
- `generateAccessToken()` / `generateRefreshToken()` — Correct expiry, payload contents
- `verifyToken()` — Invalid signatures rejected, expired tokens rejected, malformed tokens handled
- `generateRandomToken()` — Sufficient entropy for email verification tokens

### 4. Password Utilities (`backend/src/utils/password.ts` — 55 lines)

**What needs testing:**
- `hashPassword()` — Produces valid bcrypt hashes with appropriate salt rounds
- `comparePassword()` — Correct passwords match, incorrect passwords reject
- `validatePasswordStrength()` — Enforces uppercase, lowercase, number, minimum length rules

### 5. Frontend API Interceptors (`frontend/src/services/api.ts` — interceptor section)

**Risk:** Broken token refresh or CSRF recovery means users get silently logged out or requests fail.

**What needs testing:**
- Request interceptor CSRF token injection
- Response interceptor 401 handling — automatic token refresh
- Subscriber pattern for concurrent 401s (prevent multiple refresh calls)
- 403 CSRF recovery — automatic token re-fetch and retry

---

## Priority 2: Core Business Logic Gaps

These are untested areas where bugs would directly break the product for users.

### 6. Leaderboard Service (`backend/src/services/leaderboardService.ts` — 746 lines)

**Impact:** Incorrect leaderboards are the most visible bug possible in a fantasy sports app.

**What needs testing:**
- `calculateOverallLeaderboard()` — Score aggregation, ranking with ties, sorting
- `calculateMonthlyLeaderboard()` — Month filtering, partial-month edge cases
- Batch query optimization — Correct data joining across users, teams, players
- `addTeamToLeaderboard()` / `removeTeamFromLeaderboard()` — Recalculation triggers

### 7. Email Service (`backend/src/services/emailService.ts` — 515 lines)

**Impact:** Failed emails mean users can't verify accounts, reset passwords, or get payment reminders.

**What needs testing:**
- `sendVerificationEmail()` — Correct link generation, template rendering
- `sendPasswordResetEmail()` — Token URL generation, expiry messaging
- `sendPaymentReminderEmail()` / `sendLockDeadlineReminderEmail()` — Content accuracy
- Error handling — Resend API failures don't crash the server
- Rate limiting / abuse prevention

### 8. CreateTeam Page (`frontend/src/pages/CreateTeam.tsx` — 467 lines)

**Impact:** This is the core user action — creating a fantasy team.

**What needs testing:**
- Salary cap enforcement (MAX_HRS = 172) — adding a player that would exceed the cap
- Exactly 8 players required — can't submit with fewer
- Duplicate player prevention
- Season phase guard — blocked outside registration
- Email verification requirement check
- Form submission success and error handling

### 9. Admin Controller (`backend/src/controllers/adminController.ts` — 200+ lines)

**Impact:** Admin actions affect all users. Bugs here have blast radius across the entire platform.

**What needs testing:**
- `updateTeamStatus()` — Payment/entry status transitions follow state machine
- `lockTeams()` — All eligible teams locked, ineligible teams handled
- `deleteUser()` — Cascading soft deletes
- `sendNotifications()` — Correct recipient targeting
- `verifyUserEmail()` — Manual email verification for admin

---

## Priority 3: User-Facing Feature Gaps

### 10. User Routes & Controller (`backend/src/routes/userRoutes.ts`, `backend/src/controllers/userController.ts`)

**What needs testing:**
- `checkUsername()` — Uniqueness check, character validation
- `completeProfile()` — OAuth user profile completion flow
- `updateProfile()` — Field validation, conflict detection
- `deleteAccount()` — Soft delete, session cleanup

### 11. Season Controller (`backend/src/controllers/seasonController.ts`)

**What needs testing:**
- `getCurrentSeason()` — Returns active season, handles no-season state
- `createSeason()` / `updateSeason()` — Validation, constraint enforcement
- `updatePhase()` — Phase transitions follow valid sequence (off_season -> registration -> active -> completed)

### 12. Leaderboard Routes (`backend/src/routes/leaderboardRoutes.ts`)

**What needs testing:**
- `GET /overall` — Returns sorted leaderboard
- `GET /monthly/:month` — Month parameter validation, correct data
- `GET /team/:teamId` — Team-specific ranking
- `POST /recalculate` — Admin-only access, triggers recalculation

### 13. Frontend Pages — MyTeams, Players, Leaderboard, Register

**What needs testing:**
- **MyTeams** — Team list loading, edit mode, delete confirmation dialog
- **Players** — Search with debouncing, team filter, pagination
- **Leaderboard** — Tab switching (overall/monthly), month selector, team highlighting
- **Register** — Multi-field Zod validation, success screen, Google signup

### 14. Frontend Hooks

- **`useDebounce`** — Debounce timing, value updates, cleanup on unmount
- **`usePhaseCheck`** — Phase matching for `useRegistrationOpen()`, `useSeasonActive()`, `useOffSeason()`

### 15. SeasonContext (`frontend/src/contexts/SeasonContext.tsx`)

**What needs testing:**
- Season data fetching on mount
- Error handling when API fails
- `useSeason()` hook returns correct data

---

## Priority 4: Infrastructure & Resilience

### 16. Error Handler Middleware (`backend/src/middleware/errorHandler.ts` — 171 lines)

**What needs testing:**
- AppError subclass handling (ValidationError, AuthenticationError, etc.)
- Zod validation error formatting for client consumption
- PostgreSQL error code mapping (unique constraint, foreign key violations)
- JWT error handling (JsonWebTokenError, TokenExpiredError)
- 404 handler for unknown routes

### 17. Scheduled Jobs (`backend/src/services/scheduledJobs.ts` — 463 lines)

**What needs testing:**
- Cron job scheduling and timezone handling (3am ET)
- Stats update job execution flow
- Error recovery — jobs don't crash the server
- Alert emails on job failures
- `DISABLE_SCHEDULED_JOBS` flag honored

### 18. Stats Service (`backend/src/services/statsService.ts` — 238 lines)

**What needs testing:**
- `execWithRetry()` — Retry logic with exponential backoff
- `updateCurrentSeasonStats()` — Python script invocation, output parsing
- `importSeasonStats()` — Season data import
- Error handling for Python environment failures

### 19. Database Layer (`backend/src/services/db.ts` — 1,718 lines)

**What needs testing:**
- Soft delete filtering — deleted records excluded from all queries
- Complex queries (aggregations, grouping, pagination)
- Error handling from Supabase failures
- Edge cases in query builders

### 20. Frontend ProtectedRoute Component

**What needs testing:**
- Redirects unauthenticated users to login
- Redirects unverified users to verification page
- Redirects incomplete profiles to profile completion
- Allows access when all checks pass

---

## Recommended Testing Strategy

### Quick Wins (high value, low effort)
1. **JWT utilities** — Pure functions, easy to test, security-critical
2. **Password utilities** — Pure functions, easy to test
3. **useDebounce / usePhaseCheck hooks** — Small, isolated, testable
4. **Error handler middleware** — Isolated, easily mocked
5. **SeasonContext** — Small context, straightforward mocking

### Medium Effort, High Value
6. **Auth middleware** — Requires mocking JWT verification but has huge security value
7. **CSRF middleware** — Security-critical, moderate setup
8. **Leaderboard service** — Complex business logic, needs thorough testing
9. **Email service** — Mock Resend API, verify templates and error handling
10. **CreateTeam page** — Core user flow, complex validation logic

### Integration Tests to Add
11. **Full auth flow** — Register -> verify email -> login -> refresh token -> logout
12. **Team lifecycle** — Create team -> edit roster -> lock team -> view on leaderboard
13. **Admin operations** — Manage users, update team statuses, trigger recalculations
14. **Season lifecycle** — Create season -> registration -> active -> completed

### Test Infrastructure Improvements
- Add **coverage thresholds** in vitest.config to prevent regression (start at current %, ratchet up)
- Add **test coverage reporting** to CI pipeline
- Consider **E2E tests** (Playwright) for critical user flows
- Add **API contract tests** to catch frontend/backend interface drift
