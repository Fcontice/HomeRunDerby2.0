# Admin Dashboard Design

**Date:** January 10, 2026
**Status:** Approved

## Overview

Full admin dashboard for Home Run Derby 2.0 with team management, user management, email notifications, and season controls.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Style | Separate admin area (`/admin/*`) | Better security audit surface, clearer code separation |
| Auth | Re-auth for destructive actions | Extra protection for payments, deletions, notifications |
| Metrics | Essential only | Total teams, pending approvals, revenue, active users |
| Team Filters | Core filters | Payment status, entry status, season, search |
| Notifications | Email only via Resend | Already configured, simpler than in-app |
| Recipients | Preset groups + individual search | Balance of simplicity and flexibility |
| Overrides | End season only | No need for adding teams past deadline |
| User Management | View + basic actions | Verify email, reset password, soft delete |

---

## Architecture

### Backend Structure

```
backend/src/
├── routes/adminRoutes.ts           # All admin endpoints
├── controllers/adminController.ts  # Business logic
└── middleware/auth.ts              # Existing requireAdmin (already done)
```

### API Endpoints

```
GET    /api/admin/stats                     # Dashboard metrics
GET    /api/admin/teams                     # List teams with filters
GET    /api/admin/teams/:id                 # Team details
PATCH  /api/admin/teams/:id/status          # Update payment/entry status (re-auth)
GET    /api/admin/users                     # List users
PATCH  /api/admin/users/:id/verify          # Manually verify email
POST   /api/admin/users/:id/reset-password  # Send reset link
DELETE /api/admin/users/:id                 # Soft delete (re-auth)
POST   /api/admin/notifications             # Send bulk email (re-auth)
POST   /api/admin/season/end                # End season early (re-auth)
POST   /api/admin/verify-password           # Verify admin password for re-auth
```

### Frontend Structure

```
frontend/src/
├── pages/admin/
│   ├── AdminLayout.tsx         # Sidebar + header wrapper
│   ├── AdminDashboard.tsx      # Stats overview
│   ├── AdminTeams.tsx          # Team management table
│   ├── AdminUsers.tsx          # User management table
│   └── AdminNotifications.tsx  # Email sending
├── components/admin/
│   ├── ReAuthModal.tsx         # Password confirmation modal
│   ├── TeamStatusBadge.tsx     # Payment/entry status chips
│   └── StatsCard.tsx           # Metric display cards
```

---

## Dashboard Overview

**Route:** `/admin`

### Metrics Cards (4)

| Metric | Source | Display |
|--------|--------|---------|
| Total Teams | Count all non-deleted teams | "124 Teams" |
| Pending Approvals | Teams with `paymentStatus: 'pending'` | "8 Pending" (yellow if >0) |
| Total Revenue | Count of `paymentStatus: 'paid'` × $100 | "$11,200" |
| Active Users | Users with `emailVerified: true` | "89 Users" |

### Teams by Status

Visual chart (bar or donut) showing: Draft, Pending, Paid, Locked, Rejected, Refunded

### Quick Actions

- "View Pending Teams" → `/admin/teams?paymentStatus=pending`
- "Send Notification" → `/admin/notifications`
- "End Season" → Re-auth modal + typed confirmation

### Layout

```
┌─────────────────────────────────────────────────────┐
│  [Sidebar]  │  Admin Dashboard                      │
│             │                                        │
│  Dashboard  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  Teams      │  │ Teams  │ │Pending │ │Revenue │ │ Users  │
│  Users      │  │  124   │ │   8    │ │$11,200 │ │   89   │
│  Notify     │  └────────┘ └────────┘ └────────┘ └────────┘
│             │                                        │
│             │  [Teams by Status Chart]              │
│             │                                        │
│             │  Quick Actions: [Pending] [Notify] [End Season]
└─────────────────────────────────────────────────────┘
```

---

## Team Management

**Route:** `/admin/teams`

### Filters

- Payment Status: All, Draft, Pending, Paid, Rejected, Refunded
- Entry Status: All, Draft, Entered, Locked
- Season: Dropdown of available years
- Search: Team name or username (debounced)

### Table Columns

| Team Name | Owner | Players | HR Cap | Payment | Entry | Created | Actions |

### Status Badges

- Draft: Gray
- Pending: Yellow
- Paid: Green
- Rejected: Red
- Refunded: Blue
- Locked: Purple outline

### Actions (for pending teams)

- ✓ Approve → sets `paymentStatus: 'paid'`, `entryStatus: 'entered'`
- ✗ Reject → sets `paymentStatus: 'rejected'` (re-auth required)
- 💰 Mark Refunded → sets `paymentStatus: 'refunded'` (re-auth required)

### View Team Modal

- Team name, owner info (username, email)
- All 8 players with 2025 HRs and current season HRs
- Total HR cap usage
- Payment history (Stripe ID if exists)
- Entry status timeline

---

## User Management

**Route:** `/admin/users`

### Filters

- Verified: All, Yes, No
- Role: All, User, Admin
- Search: Username or email

### Table Columns

| Username | Email | Verified | Role | Teams | Joined | Actions |

### Actions

- 📧 Verify Email (if not verified) - no re-auth
- 🔑 Send Password Reset - no re-auth
- 🗑️ Delete User - re-auth required, disabled if user has paid teams

### Delete Protection

Users with `paymentStatus: 'paid'` teams cannot be deleted. Show tooltip explaining why.

---

## Email Notifications

**Route:** `/admin/notifications`

### Recipient Options

- All Users (count)
- Users with Unpaid Teams (count)
- Users with Paid/Locked Teams (count)
- Specific User (search by email/username)

### Form Fields

- Subject (text input)
- Message (textarea, supports markdown)
- Preview button

### Send Flow

1. Click "Send to X Recipients"
2. Re-auth modal (enter password)
3. Confirmation: "Send email to X users?"
4. Success toast with count

### Technical

- Uses existing `emailService.ts` with Resend
- Sends individually (not CC/BCC) for privacy
- Logs to Notification table

---

## Re-Auth Modal

### Triggers

- Reject team payment
- Mark team as refunded
- Delete user
- Send bulk notifications
- End season

### Flow

1. Action triggers modal
2. Admin enters password
3. `POST /api/admin/verify-password` validates
4. Original action proceeds

### Modal UI

```
┌─────────────────────────────────────────┐
│  Confirm Your Identity                  │
│                                         │
│  This action requires verification.     │
│                                         │
│  Password: [••••••••••]                 │
│                                         │
│  [Cancel]              [Confirm]        │
└─────────────────────────────────────────┘
```

---

## End Season

### Flow

1. Click "End Season" in dashboard
2. Re-auth modal
3. Typed confirmation ("END SEASON")
4. Backend locks all teams, stores end date

### Confirmation Dialog

```
┌─────────────────────────────────────────┐
│  ⚠️ End Season Early?                   │
│                                         │
│  This will:                             │
│  • Lock all team modifications          │
│  • Freeze the leaderboard               │
│  • Mark season 2026 as complete         │
│                                         │
│  This action cannot be undone.          │
│                                         │
│  Type "END SEASON" to confirm:          │
│  [________________]                     │
│                                         │
│  [Cancel]              [End Season]     │
└─────────────────────────────────────────┘
```

---

## Implementation Order

### Phase 1: Backend Foundation
1. Create `adminRoutes.ts` with all endpoints
2. Create `adminController.ts` with handlers
3. Add `POST /api/admin/verify-password` for re-auth
4. Wire up routes in `server.ts`

### Phase 2: Frontend Admin Layout
1. Create `AdminLayout.tsx` with sidebar navigation
2. Add admin routes to `App.tsx` (protected by role check)
3. Create `adminApi` functions in `api.ts`
4. Build `ReAuthModal.tsx` component

### Phase 3: Dashboard & Teams
1. Build `AdminDashboard.tsx` with stats cards
2. Build `AdminTeams.tsx` with filters and table
3. Add approve/reject actions with re-auth flow

### Phase 4: Users & Notifications
1. Build `AdminUsers.tsx` with actions
2. Build `AdminNotifications.tsx` with recipient picker
3. Integrate with existing `emailService.ts`

### Phase 5: End Season
1. Add end season endpoint
2. Add confirmation flow with typed confirmation

---

## File Changes Summary

**New Files (~12):**
- `backend/src/routes/adminRoutes.ts`
- `backend/src/controllers/adminController.ts`
- `frontend/src/pages/admin/AdminLayout.tsx`
- `frontend/src/pages/admin/AdminDashboard.tsx`
- `frontend/src/pages/admin/AdminTeams.tsx`
- `frontend/src/pages/admin/AdminUsers.tsx`
- `frontend/src/pages/admin/AdminNotifications.tsx`
- `frontend/src/components/admin/ReAuthModal.tsx`
- `frontend/src/components/admin/TeamStatusBadge.tsx`
- `frontend/src/components/admin/StatsCard.tsx`

**Modified Files (~4):**
- `backend/src/server.ts` - Add admin routes
- `frontend/src/App.tsx` - Add admin routes
- `frontend/src/services/api.ts` - Add adminApi
- `backend/src/types/validation.ts` - Add any new schemas
