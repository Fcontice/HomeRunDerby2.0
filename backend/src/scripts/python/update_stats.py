"""
MLB Player Stats Updater
Fetches game-by-game home run statistics using MLB-StatsAPI
Updates Supabase database with daily aggregated totals

Usage:
    python update_stats.py [--date YYYY-MM-DD] [--season-year YYYY]

If no date provided, uses yesterday's date
If no season-year provided, uses current year
"""

import os
import sys
import logging
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from collections import defaultdict
import pytz

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import statsapi
from dotenv import load_dotenv
from db_utils import SupabaseDB

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class MLBStatsUpdater:
    """Handles fetching and updating MLB player statistics"""

    def __init__(self, season_year: int):
        """
        Initialize stats updater

        Args:
            season_year: MLB season year (e.g., 2026)
        """
        self.season_year = season_year
        self.db = SupabaseDB()
        logger.info(f"🏟️  MLB Stats Updater initialized for {season_year} season")

    def get_games_for_date(self, date_str: str) -> List[Dict]:
        """
        Get all MLB games for a specific date

        Args:
            date_str: Date in YYYY-MM-DD format

        Returns:
            List of game dictionaries
        """
        try:
            logger.info(f"📅 Fetching games for {date_str}...")

            # Get schedule for the date
            schedule = statsapi.schedule(date=date_str)

            if not schedule:
                logger.info(f"   No games found for {date_str}")
                return []

            # Filter for regular season games only (exclude spring training, all-star, postseason)
            regular_season_games = [
                game for game in schedule
                if game.get('game_type') == 'R'  # R = Regular Season
            ]

            logger.info(f"   Found {len(regular_season_games)} regular season games")
            return regular_season_games

        except Exception as e:
            logger.error(f"❌ Error fetching games for {date_str}: {e}")
            return []

    def get_player_hrs_from_game(self, game_id: int) -> Dict[int, int]:
        """
        Extract home run counts for each player from a single game

        Args:
            game_id: MLB game ID

        Returns:
            Dictionary mapping MLB player ID to HR count in that game
        """
        player_hrs = defaultdict(int)

        try:
            # Get box score for game
            boxscore = statsapi.boxscore_data(game_id)

            # Process both away and home teams
            for team_type in ['away', 'home']:
                team_stats = boxscore.get(team_type, {})
                batters = team_stats.get('batters', [])

                for batter_id in batters:
                    # Get batter stats
                    batter_stats = team_stats.get('players', {}).get(f'ID{batter_id}', {})
                    stats = batter_stats.get('stats', {}).get('batting', {})

                    # Extract home runs
                    hrs = stats.get('homeRuns', 0)

                    if hrs > 0:
                        player_hrs[batter_id] = hrs
                        player_name = batter_stats.get('person', {}).get('fullName', 'Unknown')
                        logger.debug(f"      {player_name}: {hrs} HR(s)")

        except Exception as e:
            logger.error(f"   ⚠️  Error processing game {game_id}: {e}")

        return dict(player_hrs)

    def get_daily_hr_totals(self, date_str: str) -> Dict[int, int]:
        """
        Aggregate home runs for all players across all games on a specific date

        Args:
            date_str: Date in YYYY-MM-DD format

        Returns:
            Dictionary mapping MLB player ID to total HRs for that day
        """
        daily_totals = defaultdict(int)

        # Get all games for the date
        games = self.get_games_for_date(date_str)

        if not games:
            return dict(daily_totals)

        logger.info(f"🔍 Processing {len(games)} games for home run data...")

        # Process each game
        for game in games:
            game_id = game.get('game_id')
            game_desc = f"{game.get('away_name')} @ {game.get('home_name')}"

            logger.debug(f"   Processing: {game_desc} (ID: {game_id})")

            # Get HRs from this game
            game_hrs = self.get_player_hrs_from_game(game_id)

            # Aggregate into daily totals
            for player_id, hrs in game_hrs.items():
                daily_totals[player_id] += hrs

        total_hrs = sum(daily_totals.values())
        logger.info(f"✅ Found {total_hrs} home runs across {len(daily_totals)} players")

        return dict(daily_totals)

    def update_player_stats_for_date(self, date_str: str) -> Tuple[int, int, int]:
        """
        Update database with player stats for a specific date

        Args:
            date_str: Date in YYYY-MM-DD format

        Returns:
            Tuple of (updated_count, created_count, skipped_count)
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"🔄 Updating player stats for {date_str}")
        logger.info(f"{'='*60}\n")

        # Get daily HR totals from MLB API
        daily_hrs = self.get_daily_hr_totals(date_str)

        if not daily_hrs:
            logger.warning("⚠️  No home runs found for this date. Games may not have been played or completed.")
            return 0, 0, 0

        # Get all players from database
        logger.info("📋 Loading player records from database...")
        all_players = self.db.get_all_players()
        logger.info(f"   Found {len(all_players)} players in database")

        # Create MLB ID to Player mapping
        mlb_id_to_player = {}
        for player in all_players:
            mlb_id = player.get('mlbId', '')
            if mlb_id:
                # Handle both formats: "656941" or "mlb-656941"
                if mlb_id.startswith('mlb-'):
                    mlb_player_id = int(mlb_id.replace('mlb-', ''))
                elif mlb_id.isdigit():
                    mlb_player_id = int(mlb_id)
                else:
                    continue
                mlb_id_to_player[mlb_player_id] = player

        logger.info(f"   Mapped {len(mlb_id_to_player)} players with valid MLB IDs")

        # Process each player who hit HRs
        updated_count = 0
        created_count = 0
        skipped_count = 0

        logger.info(f"\n💾 Updating database records...\n")

        for mlb_player_id, daily_hr_count in daily_hrs.items():
            player = mlb_id_to_player.get(mlb_player_id)

            if not player:
                # Player not in our database (doesn't meet eligibility criteria)
                logger.debug(f"   Skipped MLB player {mlb_player_id} (not in database)")
                skipped_count += 1
                continue

            player_id = player['id']
            player_name = player['name']

            # Get current season total (most recent stats record)
            current_total = self.db.get_player_season_total(player_id, self.season_year)

            # Calculate new cumulative total
            new_total = current_total + daily_hr_count

            # Upsert stats for this date
            success = self.db.upsert_player_stats(
                player_id=player_id,
                season_year=self.season_year,
                date=date_str,
                hrs_total=new_total,
                hrs_regular_season=new_total,  # Only regular season games included
                hrs_postseason=0  # Always 0 for our contest
            )

            if success:
                if current_total > 0:
                    updated_count += 1
                    logger.info(f"   ✓ {player_name}: {current_total} → {new_total} HRs (+{daily_hr_count})")
                else:
                    created_count += 1
                    logger.info(f"   ➕ {player_name}: First HR(s) of season! ({new_total} total)")
            else:
                logger.error(f"   ✗ Failed to update {player_name}")
                skipped_count += 1

        return updated_count, created_count, skipped_count

    def run(self, date_str: str = None) -> bool:
        """
        Main execution function

        Args:
            date_str: Date to process (YYYY-MM-DD). If None, uses yesterday

        Returns:
            True if successful, False otherwise
        """
        try:
            # Default to yesterday if no date provided
            if not date_str:
                et_tz = pytz.timezone('America/New_York')
                yesterday = datetime.now(et_tz) - timedelta(days=1)
                date_str = yesterday.strftime('%Y-%m-%d')
                logger.info(f"📆 No date provided, using yesterday: {date_str}")

            # Update stats for the date
            updated, created, skipped = self.update_player_stats_for_date(date_str)

            # Print summary
            logger.info(f"\n{'='*60}")
            logger.info(f"📊 UPDATE SUMMARY")
            logger.info(f"{'='*60}")
            logger.info(f"   Date: {date_str}")
            logger.info(f"   Season: {self.season_year}")
            logger.info(f"   ✅ Updated: {updated}")
            logger.info(f"   ➕ Created: {created}")
            logger.info(f"   ⏭️  Skipped: {skipped}")
            logger.info(f"{'='*60}\n")

            return True

        except Exception as e:
            logger.error(f"\n❌ Stats update failed: {e}", exc_info=True)
            return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Update MLB player stats from MLB-StatsAPI')
    parser.add_argument('--date', type=str, help='Date to process (YYYY-MM-DD). Defaults to yesterday.')
    parser.add_argument('--season-year', type=int, help='Season year (e.g., 2026). Defaults to env var or current year.')

    args = parser.parse_args()

    # Get season year from args, env, or default to current year
    season_year = args.season_year or int(os.getenv('SEASON_YEAR', datetime.now().year))

    # Create updater and run
    updater = MLBStatsUpdater(season_year=season_year)
    success = updater.run(date_str=args.date)

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
