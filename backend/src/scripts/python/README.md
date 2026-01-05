# Python Stats Updater

MLB player statistics updater using the official MLB-StatsAPI.

## Overview

This Python script fetches **game-by-game home run statistics** from the MLB Stats API and updates the Supabase database with daily aggregated totals for the Home Run Derby contest.

### Key Features

- ✅ **Game-by-game tracking** - Processes individual games, not just season totals
- ✅ **Regular season only** - Excludes spring training, all-star, and postseason games
- ✅ **Daily aggregation** - Sums home runs across all games played on a given date
- ✅ **Direct database writes** - No TypeScript intermediary, writes directly to Supabase
- ✅ **Idempotent** - Safe to re-run for the same date (upserts records)
- ✅ **Player metadata updates** - Updates team abbreviations and names from MLB API

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

The script uses the same Supabase credentials as the Node.js backend. Ensure these are set in `backend/.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SEASON_YEAR=2026
```

## Usage

### From Backend Directory (via npm)

```bash
# Update stats for yesterday (default)
npm run update:stats:python

# Update stats for a specific date
npm run update:stats:python -- --date 2026-04-15

# Update stats for a different season
npm run update:stats:python -- --season-year 2027
```

### Direct Python Execution

```bash
cd backend/src/scripts/python

# Update yesterday's stats
python update_stats.py

# Update specific date
python update_stats.py --date 2026-04-15

# Update with custom season year
python update_stats.py --season-year 2027 --date 2026-10-01
```

### Via TypeScript Service

The TypeScript `statsService.updatePlayerStats()` function automatically calls this Python script:

```typescript
import { updatePlayerStats } from './services/statsService.js'

// Update yesterday's stats
const result = await updatePlayerStats(2026)

// Update specific date
const result = await updatePlayerStats(2026, '2026-04-15')
```

## How It Works

### Data Flow

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

The script writes to the `PlayerStats` table:

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

### Player Matching

Players are matched via their MLB ID:
- Database format: `mlb-{playerId}` (e.g., `mlb-660271`)
- MLB API format: `{playerId}` (e.g., `660271`)

The script automatically converts between formats.

## Scheduling for Production

### Recommended Schedule

**Daily at 3:00 AM Eastern Time** (after all games have concluded and stats are finalized)

### Option 1: Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line (adjust path to your project)
0 3 * * * cd /path/to/HRD2.0/backend && npm run update:stats:python >> /var/log/hrd-stats.log 2>&1
```

### Option 2: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Name: "HRD Stats Update"
4. Trigger: Daily at 3:00 AM
5. Action: Start a program
   - Program: `cmd.exe`
   - Arguments: `/c cd /d C:\path\to\HRD2.0\backend && npm run update:stats:python`
6. Enable "Run whether user is logged on or not"

### Option 3: BullMQ Background Job (Future Implementation)

The codebase already has BullMQ configured. A future enhancement could add:

```typescript
// In backend/src/jobs/statsJob.ts
import { Queue, Worker } from 'bullmq'

const statsQueue = new Queue('player-stats-sync', {
  connection: redisConnection
})

// Schedule daily at 3am ET
await statsQueue.add('update-stats', {}, {
  repeat: {
    pattern: '0 3 * * *',
    tz: 'America/New_York'
  }
})
```

## Troubleshooting

### "No module named 'statsapi'"

Run: `npm run update:stats:install`

### "Missing required environment variables"

Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `backend/.env`

### "No games found for date"

This is normal if:
- MLB season hasn't started yet
- It's an off-day (no games scheduled)
- Date is in the future

### "Player not found in database"

The player doesn't meet eligibility criteria (≥10 HRs in previous season). This is expected and not an error.

### Testing Database Connectivity

```bash
cd backend/src/scripts/python
python -c "from db_utils import SupabaseDB; db = SupabaseDB(); print('✅ Connected to Supabase')"
```

## Development

### Enable Debug Logging

Set environment variable:

```bash
export LOG_LEVEL=DEBUG
python update_stats.py --date 2026-04-15
```

### Test with Specific Date

Use a date when you know games were played:

```bash
# Example: Opening Day 2024
python update_stats.py --date 2024-03-28 --season-year 2024
```

## File Structure

```
backend/src/scripts/python/
├── README.md              # This file
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variable template
├── update_stats.py        # Main stats updater script
└── db_utils.py            # Supabase database utilities
```

## Migration from Baseball Savant

This implementation replaces the previous Baseball Savant CSV scraper with the official MLB-StatsAPI.

### Improvements

| Feature | Baseball Savant (Old) | MLB-StatsAPI (New) |
|---------|----------------------|-------------------|
| Data Source | CSV export | Official MLB API |
| Granularity | Season totals only | Game-by-game |
| Postseason | Mixed with regular | Filtered out |
| Player Metadata | Limited | Full team/position |
| Reliability | Depends on CSV format | Official API |
| Rate Limiting | None needed | Built-in |

### Backward Compatibility

The TypeScript API remains unchanged. All existing endpoints and services continue to work:
- `GET /api/leaderboards/overall`
- `GET /api/leaderboards/monthly/:month`
- Team scoring and leaderboard calculation

Only the **data source** changed, not the **data schema** or **API contracts**.

## Support

For issues or questions about the Python stats updater, check:
1. This README
2. Script output logs (`npm run update:stats:python`)
3. `CLAUDE.md` for architecture overview
4. `changelog.md` for recent changes
