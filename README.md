# Home Run Derby 2.0

A web-based MLB fantasy sports pooling application where users create teams of 8 MLB players and compete based on real-world home run performance throughout the MLB season. Users pay $100 per team entry, and prizes are awarded monthly and at season end.

**Live at:** [hrderbyus.com](https://www.hrderbyus.com)

## Project Structure

```
HRD2.0/
├── frontend/          # React + Vite + TypeScript frontend
├── backend/           # Express + TypeScript backend API
├── PROJECT_CONTEXT.md # Complete project requirements and specifications
├── CLAUDE.md          # Architecture patterns and development commands
└── CHANGELOG.md       # Detailed changelog organized by development phases
```

## Tech Stack

### Frontend
- React 18.3 with Vite 5
- TypeScript 5.3
- Tailwind CSS 3.4
- TanStack Query v5
- React Hook Form + Zod validation
- React Router v6 with lazy loading
- Radix UI (shadcn/ui) components
- Framer Motion animations

### Backend
- Node.js 20 LTS
- Express 4.19
- TypeScript 5.3
- Hybrid Prisma/Supabase (Prisma schema for types, Supabase client for queries)
- PostgreSQL 15+ (Supabase)
- Passport.js (Local + Google OAuth)
- JWT httpOnly cookie authentication with CSRF protection
- node-cron scheduled jobs
- Stripe payments
- Resend email service
- Twilio SMS notifications

### Deployment
- **Frontend**: Vercel at `https://www.hrderbyus.com`
- **Backend**: Railway at `https://api.hrderbyus.com`
- **Database**: Supabase PostgreSQL

## Features

- **Team Creation** - Draft 8 MLB players under a 172 HR salary cap
- **Scoring** - Best 7 of 8 players count toward team score
- **Leaderboards** - Overall season + monthly rankings
- **Payments** - $100/team via Stripe Checkout
- **Authentication** - Email/password + Google OAuth with httpOnly cookies
- **Regional Agents** - Agent assignment with SMS/email notifications
- **Admin Dashboard** - Team management, user management, notifications, season controls
- **Season Phases** - off_season → registration → active → completed
- **Automated Stats** - Daily MLB stats update at 3am ET via Python MLB-StatsAPI script

## Prerequisites

- **Node.js** 20.x LTS or higher
- **npm**
- **Python 3.8+** (for stats updater)
- **Git**

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd HRD2.0
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:5000
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase, JWT, Stripe, Resend credentials

npm run prisma:generate
npm run dev
```

The backend API will be available at `http://localhost:5000`

### 4. Python Stats Setup (Optional)

```bash
cd backend
npm run update:stats:install   # Install Python dependencies
npm run update:stats:python    # Run stats update for yesterday
```

## Environment Variables

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
```

### Backend (.env)

```env
# Database (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Authentication (required)
JWT_SECRET=your-secret-key-min-32-chars

# Payments (required)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (required in production)
RESEND_API_KEY=re_xxx

# Google OAuth (optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Twilio SMS (optional)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# App Configuration
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=5000
DISABLE_SCHEDULED_JOBS=true
ADMIN_ALERT_EMAIL=admin@example.com
```

## Available Scripts

### Frontend (from `/frontend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | TypeScript check + Vite build |
| `npm test` | Run tests (Vitest) |
| `npm run lint` | Run ESLint |

### Backend (from `/backend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run build` | Compile to dist/ |
| `npm start` | Run compiled code |
| `npm test` | Run tests (Vitest) |
| `npm run prisma:generate` | Generate Prisma types |
| `npm run import:season` | Import season stats for eligibility (yearly) |
| `npm run update:stats:python` | Update daily stats (during contest) |
| `npm run job:stats` | Run stats update job |

## Development Workflow

1. Start the backend server:
   ```bash
   cd backend && npm run dev
   ```

2. Start the frontend dev server:
   ```bash
   cd frontend && npm run dev
   ```

3. Open `http://localhost:5173`

## Database

Uses **Supabase PostgreSQL** with a hybrid Prisma/Supabase pattern:
- Prisma schema (`backend/prisma/schema.prisma`) defines types and structure
- Supabase JS client handles queries via `backend/src/services/db.ts`
- **Never use Prisma client directly** - always use `db.user`, `db.team`, `db.player`, etc.

### Migrations

SQL migration files live in `backend/migrations/`. Apply via Supabase SQL Editor, then:
```bash
cd backend && npx prisma db pull && npx prisma generate
```

## Production Deployment

**Frontend → Vercel** | **Backend → Railway** | **Database → Supabase**

See `VERCEL_DEPLOYMENT.md` for full deployment guide, and `docs/deployment-checklist.md` for pre/post deployment checklist.

## Development Phases

1. **Phase 1: Foundation** - Database, auth, email verification
2. **Phase 2: Team Creation & Payments** - Player drafting, Stripe integration
3. **Phase 3: Scoring & Leaderboards** - MLB-StatsAPI, best 7 of 8, rankings
4. **Phase 4: User Experience & Admin** - UI, admin dashboard, season management
5. **Phase 5: Testing & Launch** - Unit tests, load tests, deployment

**All phases complete.** See `CHANGELOG.md` for detailed implementation history.

## Third-Party Services

| Service | Purpose | Tier |
|---------|---------|------|
| [Supabase](https://supabase.com) | PostgreSQL database | Free |
| [Stripe](https://stripe.com) | Payment processing | Free (test mode) |
| [Resend](https://resend.com) | Email delivery | Free |
| [Twilio](https://twilio.com) | SMS notifications | Pay-as-you-go |
| [Google Cloud](https://console.cloud.google.com) | OAuth credentials | Free |
| [Vercel](https://vercel.com) | Frontend hosting | Free |
| [Railway](https://railway.app) | Backend hosting | ~$5-20/month |

## Testing

Both frontend and backend use **Vitest**. See `docs/TESTING.md` for details.

```bash
cd frontend && npm test
cd backend && npm test
```

## License

All rights reserved.
