# Python Stats Scripts

MLB player statistics scripts using the official MLB Stats API.

## Overview

This directory contains two Python scripts for managing player statistics:

1. **`import_season_stats.py`** - Yearly import of player eligibility (run once before each contest)
2. **`update_stats.py`** - Daily updates of game-by-game home runs (run during contest)

---

## Script 1: Season Import (`import_season_stats.py`)

Imports entire season's home run totals to populate the `PlayerSeasonStats` table. This determines which players are eligible for team creation in the next contest.

### Key Features

- ✅ **Paginated API fetching** - Uses offset pagination to get all players (bypasses API result limits)
- ✅ **Automatic deduplication** - Handles traded players who appear multiple times
- ✅ **Configurable threshold** - Default ≥10 HRs, adjustable via `--min-hrs`
- ✅ **Team data included** - Fetches team abbreviations via API hydration
- ✅ **Idempotent** - Safe to re-run (upserts records)

### Usage

```bash
# From backend directory (via npm)
npm run import:season                     # Import 2025 season (default, >=10 HRs)
npm run import:season -- --season 2024    # Import specific season
npm run import:season -- --min-hrs 20     # Custom HR threshold

# Direct Python execution
cd backend/src/scripts/python
python import_season_stats.py
python import_season_stats.py --season 2024
python import_season_stats.py --min-hrs 20
```

### How It Works

```
MLB Stats API (leaderboard) → Pagination → Dedupe → Filter → Supabase
```

1. **Fetch leaderboard pages**: Calls `/api/v1/stats/leaders` with offset pagination (0, 100, 200, etc.)
2. **Hydrate team data**: Includes `hydrate=team` to get team abbreviations
3. **Dedupe players**: Traded players may appear multiple times; keeps first (highest HR) entry
4. **Filter by threshold**: Only includes players with ≥ min_hrs home runs
5. **Upsert to database**: Creates/updates `Player` and `PlayerSeasonStats` records

### Database Tables

**Player** - Basic player info:
```sql
Player (
  id UUID PRIMARY KEY,
  mlbId TEXT UNIQUE,      -- MLB player ID (e.g., "660271")
  name TEXT,              -- Full name
  teamAbbr TEXT,          -- Team abbreviation (e.g., "LAD")
  ...
)
```

**PlayerSeasonStats** - Season totals for eligibility:
```sql
PlayerSeasonStats (
  id UUID PRIMARY KEY,
  playerId UUID REFERENCES Player(id),
  seasonYear INTEGER,
  hrsTotal INTEGER,       -- Total home runs for the season
  teamAbbr TEXT,
  ...
)
```

### When to Run

- **Once per year** before the contest opens for team creation
- Example: Before 2026 contest, run `npm run import:season -- --season 2025` to import 2025 stats

---

## Script 2: Daily Stats Update (`update_stats.py`)

Fetches **game-by-game home run statistics** from the MLB Stats API and updates the Supabase database with daily aggregated totals for live leaderboard tracking.

### Key Features

- ✅ **Game-by-game tracking** - Processes individual games, not just season totals
- ✅ **Regular season only** - Excludes spring training, all-star, and postseason games
- ✅ **Daily aggregation** - Sums home runs across all games played on a given date
- ✅ **Direct database writes** - No TypeScript intermediary, writes directly to Supabase
- ✅ **Idempotent** - Safe to re-run for the same date (upserts records)
- ✅ **Player metadata updates** - Updates team abbreviations and names from MLB API

### Usage

```bash
# From backend directory (via npm)
npm run update:stats:python                        # Update yesterday's stats
npm run update:stats:python -- --date 2026-04-15   # Update specific date
npm run update:stats:python -- --season-year 2027  # Different season

# Direct Python execution
cd backend/src/scripts/python
python update_stats.py
python update_stats.py --date 2026-04-15
python update_stats.py --season-year 2027 --date 2026-10-01
```

### Via TypeScript Service

```typescript
import { updatePlayerStats } from './services/statsService.js'

const result = await updatePlayerStats(2026)              // Update yesterday
const result = await updatePlayerStats(2026, '2026-04-15') // Specific date
```

### How It Works

```
MLB-StatsAPI → Python Script → Supabase PlayerStats Table → TypeScript API (read-only)
```

1. **Fetch Schedule**: Gets all games for the target date from MLB-StatsAPI
2. **Filter Regular Season**: Excludes spring training (`S`), all-star (`A`), and postseason (`F`, `D`, `L`, `W`) games
3. **Parse Box Scores**: Extracts home run counts for each player from each game
4. **Aggregate Daily Totals**: Sums HRs across all games for each player
5. **Calculate Season Totals**: Adds daily HRs to previous cumulative total
6. **Upsert Database**: Creates or updates `PlayerStats` record for the date

### Database Schema

```sql
PlayerStats (
  id UUID PRIMARY KEY,
  playerId UUID REFERENCES Player(id),
  seasonYear INTEGER,
  date DATE,
  hrsTotal INTEGER,           -- Cumulative season total
  hrsRegularSeason INTEGER,   -- Regular season total (used for contest)
  hrsPostseason INTEGER,      -- Always 0 (we exclude postseason)
  lastUpdated TIMESTAMP
)
```

### When to Run

- **Daily at 3:00 AM ET** during the active contest (after all games conclude)
- Schedule via cron, Windows Task Scheduler, or BullMQ

---

## Installation

### 1. Install Python Dependencies

From the `backend` directory:

```bash
npm run update:stats:install
```

Or manually:

```bash
cd backend/src/scripts/python
pip install -r requirements.txt
```

### 2. Configure Environment Variables

The scripts use Supabase credentials from `backend/.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SEASON_YEAR=2026  # Optional, for update_stats.py
```

---

## Scheduling for Production

### Recommended Schedule

| Script | Frequency | Time | Purpose |
|--------|-----------|------|---------|
| `import_season_stats.py` | Once/year | Before contest | Player eligibility |
| `update_stats.py` | Daily | 3:00 AM ET | Live leaderboard |

### Option 1: Cron (Linux/Mac)

```bash
crontab -e

# Daily stats update at 3am ET
0 3 * * * cd /path/to/HRD2.0/backend && npm run update:stats:python >> /var/log/hrd-stats.log 2>&1
```

### Option 2: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task → Name: "HRD Stats Update"
3. Trigger: Daily at 3:00 AM
4. Action: Start a program
   - Program: `cmd.exe`
   - Arguments: `/c cd /d C:\path\to\HRD2.0\backend && npm run update:stats:python`
5. Enable "Run whether user is logged on or not"

### Option 3: BullMQ Background Job (Future)

```typescript
const statsQueue = new Queue('player-stats-sync', { connection: redisConnection })

await statsQueue.add('update-stats', {}, {
  repeat: { pattern: '0 3 * * *', tz: 'America/New_York' }
})
```

---

## Troubleshooting

### "No module named 'statsapi'" or "No module named 'requests'"

```bash
npm run update:stats:install
```

### "Missing required environment variables"

Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `backend/.env`

### "No games found for date"

Normal if: MLB season hasn't started, it's an off-day, or date is in the future.

### "Player not found in database"

The player doesn't meet eligibility criteria (≥10 HRs in previous season). Expected behavior.

### Testing Database Connectivity

```bash
cd backend/src/scripts/python
python -c "from db_utils import SupabaseDB; db = SupabaseDB(); print('✅ Connected to Supabase')"
```

---

## File Structure

```
backend/src/scripts/python/
├── README.md               # This file
├── requirements.txt        # Python dependencies
├── import_season_stats.py  # Yearly eligibility import
├── update_stats.py         # Daily stats updater
├── db_utils.py             # Supabase database utilities
└── test_connection.py      # Database connectivity test
```

---

## API Details

### Season Import API Endpoint

```
GET https://statsapi.mlb.com/api/v1/stats/leaders
  ?leaderCategories=homeRuns
  &season={year}
  &leaderGameTypes=R
  &statGroup=hitting
  &limit=100
  &offset={0,100,200,...}
  &hydrate=team
```

- Paginated with `offset` parameter
- Returns ~100 entries per page
- `hydrate=team` includes team abbreviation data

### Daily Update API Endpoint

```
GET https://statsapi.mlb.com/api/v1/schedule
  ?sportId=1
  &date={YYYY-MM-DD}
  &gameType=R
  &hydrate=linescore(person)
```

---

## Migration Notes

This implementation uses the official MLB Stats API, replacing the previous Baseball Savant CSV approach.

| Feature | Old (Baseball Savant) | New (MLB Stats API) |
|---------|----------------------|---------------------|
| Data Source | CSV export | Official MLB API |
| Granularity | Season totals only | Game-by-game |
| Postseason | Mixed with regular | Filtered out |
| Player Metadata | Limited | Full team/position |
| Reliability | CSV format dependent | Official API |
| Pagination | N/A | Offset-based |
