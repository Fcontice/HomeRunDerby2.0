# Feature Development Roadmap - Home Run Derby 2.0

**Document Purpose:** Prioritized feature list for completing a functional MVP prototype
**Last Updated:** December 30, 2025
**Current Progress:** Phase 2 (Team Creation) at 60%

---

## Executive Summary

**MVP Critical Path:**
User registers → verifies email → creates team → **PAYS $100** → stats update daily → **scoring runs** → **leaderboard displays** → winners announced

**Current Blockers:**
1. ❌ No payment system = teams cannot officially enter contest
2. ❌ No player stats = no scoring possible
3. ❌ No scoring engine = no competition results
4. ❌ No leaderboard = users can't see rankings

**Recommended Implementation Order:**
Complete Tier 1 features sequentially (1→2→3→4→5) for functional prototype, then Tier 2 for production-ready MVP.

---

## TIER 1: CRITICAL BLOCKERS (Must Have for Functional Prototype)

### 1. Stripe Payment Integration ⚡ HIGHEST PRIORITY
**Priority:** P0 - CRITICAL BLOCKER
**Status:** 40% (API keys configured, not connected to team flow)

**Reasoning:**
- Blocks entire user journey - teams cannot officially enter without payment
- Without this: App is demo-only, cannot generate revenue or have real competition
- Already configured (Stripe keys exist), just needs integration
- Relatively quick win with massive impact

**Dependencies:**
- ✅ Team creation API (complete)
- ✅ Stripe account configured
- ✅ Payment status fields in Team model

**Implementation Scope:**
- Connect Stripe Checkout to team creation flow
- Webhook endpoint for `checkout.session.completed` event
- Update team `payment_status` from `draft` → `paid`
- Frontend: Redirect to Stripe, handle success/cancel callbacks
- Store `stripe_payment_id` on team record

**Estimated Complexity:** Medium (2-3 days)
**Impact:** 🔴 BLOCKING - Nothing works without this

---

### 2. Player Stats Scraper (Baseball Reference) ⚡
**Priority:** P0 - CRITICAL BLOCKER
**Status:** 30% (scraper service exists, 253 players imported, needs stats polling)

**Reasoning:**
- No live stats = no scoring possible = no game
- Must run automatically to update HR counts during season
- Scraping logic partially exists in `scraperService.ts`
- Without this: Manual database updates (not scalable)

**Dependencies:**
- ✅ Players table populated (253 records)
- ✅ PlayerStats table schema defined
- ✅ Cheerio + Axios installed

**Implementation Scope:**
- Complete scraper to fetch daily HR totals from Baseball Reference
- Parse player pages for current season HR count
- Store in `player_stats` table (date, hrs_total, hrs_regular_season, hrs_postseason)
- Error handling: retry logic, alert on 3+ failures
- Initial implementation: manual trigger via script
- Later: BullMQ background job (Tier 2)

**Estimated Complexity:** Medium-High (3-4 days)
**Impact:** 🔴 BLOCKING - Scoring depends on this

---

### 3. Scoring Calculator (Best 7 of 8 Logic) ⚡
**Priority:** P0 - CRITICAL BLOCKER
**Status:** 0% (not started)

**Reasoning:**
- Core business logic of the entire game
- Must calculate: For each team, sum HRs of best 7 players (drop worst)
- Required for any leaderboard or winner determination
- Relatively straightforward algorithm once stats exist

**Dependencies:**
- ❌ Player stats scraper (Feature #2)
- ✅ Teams with 8 players locked
- ✅ TeamPlayers junction table

**Implementation Scope:**
- Service function: `calculateTeamScore(teamId, seasonYear, leaderboardType)`
- For each team:
  1. Get all 8 players' current HR totals
  2. Sort descending
  3. Sum top 7 (exclude lowest)
  4. Return total + breakdown
- Handle edge cases: player injured, traded, stats correction
- Different calculations: overall (regular + playoff) vs monthly (regular only)

**Estimated Complexity:** Medium (2 days)
**Impact:** 🔴 BLOCKING - This IS the game

---

### 4. Leaderboard Calculation Engine ⚡
**Priority:** P0 - CRITICAL BLOCKER
**Status:** 0% (infrastructure ready: BullMQ, Redis, Leaderboards table)

**Reasoning:**
- Ranks all teams by calculated scores
- Updates `leaderboards` table for fast queries
- Determines monthly winners, all-star break snapshot, overall season winner
- Without this: Users can't see standings or know who's winning

**Dependencies:**
- ❌ Scoring calculator (Feature #3)
- ✅ Leaderboards table schema
- ✅ Redis configured (Upstash)

**Implementation Scope:**
- Service function: `calculateLeaderboard(type, month?)`
- Leaderboard types:
  - `overall` - Regular + playoff HRs, lock date → World Series end
  - `monthly` - Regular season HRs only, resets each month
  - `allstar` - One-time snapshot at All-Star break
- For each type:
  1. Calculate all team scores
  2. Rank by total HRs (ties allowed)
  3. Write to `leaderboards` table
  4. Cache in Redis (TTL: 5 minutes)
- Handle ties: split prize money equally

**Estimated Complexity:** Medium (2-3 days)
**Impact:** 🔴 BLOCKING - Users need rankings

---

### 5. Leaderboard UI Pages ⚡
**Priority:** P0 - CRITICAL BLOCKER
**Status:** 0% (no frontend pages)

**Reasoning:**
- Primary user engagement - users MUST see if they're winning
- Shows: rank, team name, total HRs, owner, best 7 players highlighted
- Public page (all users see full leaderboard)
- Without this: No visibility into competition results

**Dependencies:**
- ❌ Leaderboard calculation engine (Feature #4)
- ✅ shadcn/ui components
- ✅ React Router

**Implementation Scope:**
- **Pages:**
  - `/leaderboard` - Overall season leaderboard (default)
  - `/leaderboard/monthly/:month` - Monthly leaderboards (March-September)
  - `/leaderboard/allstar` - All-Star break snapshot
- **Features:**
  - Table: rank, team name, owner username, total HRs, change indicator
  - Click team → see full roster (8 players, best 7 highlighted)
  - Auto-refresh every 60 seconds (polling)
  - League stats: most popular players, average team score
  - Filter: show only my teams
- **API Endpoints:**
  - `GET /api/leaderboards/overall`
  - `GET /api/leaderboards/monthly/:month`
  - `GET /api/leaderboards/allstar`
  - `GET /api/leaderboards/stats`

**Estimated Complexity:** Medium (3 days)
**Impact:** 🔴 BLOCKING - Core user experience

---

## TIER 2: IMPORTANT (Should Have for Production MVP)

### 6. Background Jobs - Stats Sync Automation
**Priority:** P1 - IMPORTANT
**Status:** 20% (BullMQ configured, not utilized)

**Reasoning:**
- Automates player stats updates (every 10 min during games, hourly off-hours)
- Without this: Manual script execution (not scalable)
- BullMQ + Redis infrastructure already configured
- Enables automatic leaderboard recalculation

**Dependencies:**
- ❌ Player stats scraper (Feature #2)
- ❌ Leaderboard calculation engine (Feature #4)
- ✅ BullMQ installed
- ✅ Redis (Upstash) configured

**Implementation Scope:**
- **Job Queues:**
  - `player-stats-sync` - Poll Baseball Reference every 10/60 min
  - `leaderboard-calculation` - Recalculate after stats update
  - `email-notifications` - Send daily/monthly/season emails
- **Scheduling:**
  - Use BullMQ repeat options for cron-like scheduling
  - Active season: Every 10 min during game hours (12pm-11pm ET)
  - Off-hours: Every 60 min
  - Off-season: Disabled
- **Error Handling:**
  - Retry with exponential backoff (3 attempts)
  - Alert admin if scraping fails 3+ times
  - Dead letter queue for failed jobs

**Estimated Complexity:** Medium (2-3 days)
**Impact:** 🟡 HIGH - Automation is essential for production

---

### 7. Admin Approval System (Backend)
**Priority:** P1 - IMPORTANT
**Status:** 0% (not started)

**Reasoning:**
- Quality control for team entries (prevent profanity, abuse)
- Admin can approve/reject teams, issue refunds
- Can approve all automatically initially, add manual review later
- Backend-only at first (UI in Feature #8)

**Dependencies:**
- ✅ Team model with `entry_status` field
- ✅ Admin role in User model
- ✅ Stripe refund capability

**Implementation Scope:**
- **API Endpoints:**
  - `GET /api/admin/teams` - List all teams with filters (pending, paid, rejected)
  - `PATCH /api/admin/teams/:id/status` - Approve or reject team
  - `POST /api/admin/teams/:id/refund` - Issue Stripe refund
  - `POST /api/admin/teams/:id/override` - Add team past deadline
- **Middleware:**
  - `requireAdmin` - Check `req.user.role === 'admin'`
- **Logic:**
  - Approve: `entry_status = 'entered'`
  - Reject: `entry_status = 'rejected'`, trigger Stripe refund, send email
  - Override: Allow team creation past lock date (admin only)

**Estimated Complexity:** Low-Medium (1-2 days)
**Impact:** 🟡 MEDIUM - Quality control, can work manually initially

---

### 8. Admin Dashboard (Basic UI)
**Priority:** P1 - IMPORTANT
**Status:** 0% (not started)

**Reasoning:**
- Operational necessity: manage teams, payments, stats
- View all teams, payment status, approve/reject
- Manual stats override for corrections
- Without this: Direct database access (workable but inefficient)

**Dependencies:**
- ❌ Admin approval system backend (Feature #7)
- ✅ Admin role and `requireAdmin` middleware

**Implementation Scope:**
- **Page:** `/admin` (protected, admin-only)
- **Sections:**
  - **Teams Tab:**
    - Table: team name, owner, payment status, entry status, created date
    - Actions: approve, reject, refund, delete
    - Filters: pending, paid, rejected, all
  - **Players Tab:**
    - Table: player name, team, 2024 HRs, current HRs, last updated
    - Action: manual stats override (if scraper fails)
  - **Settings Tab:**
    - Season controls: lock all teams, end season early
    - Email notifications: send announcement to all users
    - System status: last stats sync, job queue status
- **API Integration:**
  - Use admin endpoints from Feature #7
  - Add: `PATCH /api/admin/players/:id/stats` - Manual override
  - Add: `POST /api/admin/season/lock` - Lock all teams
  - Add: `POST /api/admin/season/end` - End season

**Estimated Complexity:** Medium (3-4 days)
**Impact:** 🟡 MEDIUM - Operational efficiency

---

### 9. Redis Caching Layer
**Priority:** P1 - IMPORTANT
**Status:** 20% (Upstash configured, not utilized)

**Reasoning:**
- Performance optimization for leaderboards (high read frequency)
- Target: <2 second page load for 5,000 concurrent users
- Upstash Redis already configured
- Without this: DB queries work but slower at scale

**Dependencies:**
- ❌ Leaderboard calculation engine (Feature #4)
- ✅ Redis (Upstash) credentials configured

**Implementation Scope:**
- **Cached Data:**
  - Leaderboard rankings (TTL: 5 minutes)
  - Player pool list (TTL: 1 hour)
  - User profile data (TTL: 15 minutes)
  - League-wide stats (TTL: 10 minutes)
- **Cache Strategy:**
  - Cache-aside pattern: check cache → if miss, query DB → store in cache
  - Invalidate on updates: team score changes, stats sync
  - Redis keys: `leaderboard:overall`, `leaderboard:monthly:{month}`, `players:eligible:{year}`
- **Implementation:**
  - Use existing Redis client in `backend/src/config/redis.ts` (create if missing)
  - Wrap leaderboard queries with caching logic
  - Set appropriate TTLs based on update frequency

**Estimated Complexity:** Low-Medium (1-2 days)
**Impact:** 🟡 MEDIUM - Performance boost, not blocking

---

## TIER 3: NICE TO HAVE (Polish & Engagement)

### 10. Player Profile/Stats Pages
**Priority:** P2 - NICE TO HAVE
**Status:** 0% (not started)

**Reasoning:**
- Enhanced UX: users browse individual player details
- Shows: player name, MLB team, photo, current HRs, HR history graph
- Useful for research when creating teams
- Without this: Player browser shows basic info (sufficient for MVP)

**Dependencies:**
- ❌ Player stats scraper (Feature #2)
- ✅ Players table with basic info

**Implementation Scope:**
- **Page:** `/players/:id`
- **Content:**
  - Player info: name, MLB team, 2024 HR total, photo
  - Current season stats: HR total, regular vs playoff breakdown
  - HR history graph (by date)
  - Teams using this player (public list)
- **API Endpoint:**
  - `GET /api/players/:id` (already exists, enhance with stats)

**Estimated Complexity:** Low-Medium (2 days)
**Impact:** 🟢 LOW-MEDIUM - Enhances UX

---

### 11. Email Notification System
**Priority:** P2 - NICE TO HAVE
**Status:** 30% (Resend configured, transactional emails work, notifications not built)

**Reasoning:**
- User engagement: daily scores, monthly winners, season results
- Resend API already working (verification emails sent)
- Without this: Users check leaderboard manually (acceptable for MVP)

**Dependencies:**
- ❌ Leaderboard calculation engine (Feature #4)
- ✅ Resend API configured and working
- ✅ Email templates for verification/reset

**Implementation Scope:**
- **Email Types:**
  - Lock reminder (3 days before season) - one-time
  - Daily score update (optional, user can opt-out)
  - Monthly leaderboard winners - after month ends
  - Season leaderboard winners - after World Series
- **Implementation:**
  - Create HTML email templates in `emailService.ts`
  - Add notification preferences to User model (opt-in/opt-out)
  - BullMQ job: `email-notifications` queue
  - Store sent emails in `notifications` table
- **API Endpoints:**
  - `PATCH /api/users/me/notifications` - Update preferences
  - `POST /api/admin/notifications` - Send announcement (admin)

**Estimated Complexity:** Low-Medium (2 days)
**Impact:** 🟢 LOW-MEDIUM - Engagement tool

---

### 12. Off-Season Mode
**Priority:** P2 - NICE TO HAVE
**Status:** 0% (not started)

**Reasoning:**
- Display previous season leaderboard and winners
- Allow users to browse next year's player pool
- Prevent team creation until next draft opens
- Only needed after first season completes (November-March)

**Dependencies:**
- ✅ All core features complete
- ❌ At least one completed season

**Implementation Scope:**
- **Frontend Changes:**
  - Detect season state: `pre-season`, `active`, `post-season`, `off-season`
  - Off-season homepage: show previous winners, leaderboard link
  - Disable team creation button (show "Draft opens March 2026")
  - Allow viewing previous season data
- **Backend:**
  - Season status endpoint: `GET /api/season/status`
  - Returns: current phase, lock date, season end date
  - Admin can manually toggle season state
- **Data Retention:**
  - Keep previous season (1 year)
  - Purge data older than 1 year (except payment records)

**Estimated Complexity:** Low (1-2 days)
**Impact:** 🟢 LOW - Future seasons only

---

## TIER 4: PRE-LAUNCH (Quality Assurance & Deployment)

### 13. End-to-End Testing
**Priority:** P2 - PRE-LAUNCH
**Status:** 0% (Vitest configured, no tests written)

**Reasoning:**
- Ensure entire user journey works: register → pay → score → leaderboard
- Catch integration bugs before production
- Vitest already configured in both frontend/backend
- Best practice before real money transactions go live

**Dependencies:**
- ✅ All Tier 1 features implemented
- ✅ Vitest installed and configured

**Implementation Scope:**
- **Test Coverage:**
  - Auth flow: register, verify, login, logout
  - Team creation: validation, payment, lock
  - Scoring: best 7 of 8 calculation
  - Leaderboard: ranking, ties, monthly vs overall
  - Admin: approve, reject, refund
- **Tools:**
  - Vitest for unit/integration tests
  - Mock Stripe API calls
  - Seed test database with fixture data
- **Target:**
  - 80%+ coverage on critical paths
  - All business logic tested

**Estimated Complexity:** Medium (3-4 days)
**Impact:** 🟡 MEDIUM - Quality assurance

---

### 14. Load Testing
**Priority:** P2 - PRE-LAUNCH
**Status:** 0% (not started)

**Reasoning:**
- Requirement: Support 5,000 concurrent users
- Test leaderboard queries, stats updates, payment processing
- Identify bottlenecks before production traffic
- Validate Redis caching effectiveness

**Dependencies:**
- ✅ All features implemented
- ❌ Redis caching (Feature #9) for optimal performance

**Implementation Scope:**
- **Tools:**
  - Artillery or k6 for load testing
  - Test scenarios: 5,000 concurrent users viewing leaderboard
- **Metrics:**
  - Response times (p50, p95, p99)
  - Error rates
  - Database connection pool usage
  - Redis hit rates
- **Optimization:**
  - Add database indexes if slow queries found
  - Tune Redis TTLs
  - Consider read replicas if needed

**Estimated Complexity:** Medium (2-3 days)
**Impact:** 🟡 MEDIUM - Prevent production crashes

---

### 15. Production Deployment Configuration
**Priority:** P2 - PRE-LAUNCH
**Status:** 0% (not started)

**Reasoning:**
- Deploy frontend to Vercel (free tier)
- Deploy backend to Railway ($5-20/month)
- Configure production environment variables
- Set up CI/CD pipeline with GitHub Actions
- Final step before going live

**Dependencies:**
- ✅ All features implemented and tested
- ✅ GitHub repository

**Implementation Scope:**
- **Frontend (Vercel):**
  - Connect GitHub repo
  - Set `VITE_API_URL` to Railway backend URL
  - Set `VITE_STRIPE_PUBLIC_KEY` to production key
  - Configure build command: `npm run build`
- **Backend (Railway):**
  - Deploy from GitHub
  - Set all production env vars (Supabase, Stripe, Resend, Redis)
  - Configure health check endpoint: `GET /health`
  - Enable auto-deploy on push to main
- **CI/CD:**
  - GitHub Actions: run tests on PR
  - Auto-deploy to staging on merge to `develop`
  - Manual deploy to production on merge to `main`
- **Monitoring:**
  - Set up Sentry error tracking
  - Configure Uptime Robot for health checks

**Estimated Complexity:** Low-Medium (1-2 days)
**Impact:** 🟡 MEDIUM - Going live

---

## Implementation Order & Timeline

### Sprint 1: Critical User Flow (2 weeks)
**Goal:** User can create team, pay, and see basic leaderboard

1. **Feature #1: Stripe Payment Integration** (2-3 days)
2. **Feature #2: Player Stats Scraper** (3-4 days)
3. **Feature #3: Scoring Calculator** (2 days)
4. **Feature #4: Leaderboard Calculation** (2-3 days)
5. **Feature #5: Leaderboard UI** (3 days)

**Milestone:** Functional prototype complete ✅

---

### Sprint 2: Production Readiness (1.5 weeks)
**Goal:** Automate processes and add admin controls

6. **Feature #6: Background Jobs** (2-3 days)
7. **Feature #7: Admin Approval Backend** (1-2 days)
8. **Feature #8: Admin Dashboard** (3-4 days)
9. **Feature #9: Redis Caching** (1-2 days)

**Milestone:** Production-ready MVP ✅

---

### Sprint 3: Polish & Launch Prep (1 week)
**Goal:** Quality assurance and deployment

10. **Feature #13: End-to-End Testing** (3-4 days)
11. **Feature #14: Load Testing** (2-3 days)
12. **Feature #15: Production Deployment** (1-2 days)

**Milestone:** Ready for production launch 🚀

---

### Sprint 4+: Enhancements (Future)
**Goal:** User engagement and polish

- Feature #10: Player Profile Pages
- Feature #11: Email Notifications
- Feature #12: Off-Season Mode

---

## Decision Framework

**When prioritizing your next task, ask:**

1. **Is it blocking the critical user flow?** → Tier 1 (P0)
2. **Is it required for production operation?** → Tier 2 (P1)
3. **Is it user engagement/polish?** → Tier 3 (P2)
4. **Is it launch preparation?** → Tier 4 (P2)

**For MVP Prototype:** Complete all Tier 1 features (Features #1-5)
**For Production MVP:** Complete Tier 1 + Tier 2 (Features #1-9)
**For Polished Launch:** Add Tier 3 + Tier 4 as needed

---

## Success Metrics

**Functional Prototype Complete When:**
- ✅ Users can pay $100 and enter teams
- ✅ Player stats update (manually triggered initially)
- ✅ Scores calculate (best 7 of 8)
- ✅ Leaderboard displays rankings
- ✅ Users can see their rank and team details

**Production MVP Complete When:**
- ✅ All above +
- ✅ Stats sync automatically every 10 minutes
- ✅ Admin can approve/reject teams
- ✅ Admin dashboard operational
- ✅ Performance optimized with caching

**Ready for Launch When:**
- ✅ All above +
- ✅ End-to-end tests passing
- ✅ Load testing successful (5,000 users)
- ✅ Deployed to production with monitoring

---

**Next Immediate Action:**
Implement **Feature #1: Stripe Payment Integration** to unblock the critical user flow.
