#!/usr/bin/env python3
"""
Import Full Season Stats for Player Eligibility
================================================
Imports entire season's home run totals to populate PlayerSeasonStats table.
This determines which players are eligible for the next contest.

Usage:
    python import_season_stats.py                    # Import 2025 season (default, >=10 HRs)
    python import_season_stats.py --season 2024      # Import specific season
    python import_season_stats.py --min-hrs 20       # Custom HR threshold

This script should be run ONCE per year before the contest starts.
For daily updates during the contest, use update_stats.py instead.
"""

import os
import sys
import argparse
from datetime import datetime
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
# Look for .env in backend root directory (3 levels up from this script)
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
env_path = os.path.join(backend_root, '.env')
load_dotenv(env_path)

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_utils import SupabaseDB


def fetch_season_leaders_paginated(season_year: int, min_home_runs: int = 10) -> list:
    """
    Fetch all players with >= min_home_runs for the specified season using pagination.

    The MLB Stats API leaderboard endpoint caps at ~100 results per call, but supports
    offset pagination. This function fetches all pages and dedupes players who appear
    multiple times (e.g., traded mid-season).

    Args:
        season_year: MLB season year (e.g., 2025)
        min_home_runs: Minimum HRs required for eligibility (default: 10)

    Returns:
        List of player data dictionaries with HR totals (deduped, sorted by HRs desc)
    """
    print(f"Fetching season leaders for {season_year}...")
    print(f"   Minimum threshold: {min_home_runs} home runs")

    base_url = "https://statsapi.mlb.com/api/v1/stats/leaders"
    all_players = {}  # Dedupe by mlbId, sum HRs for traded players
    page_size = 100
    offset = 0
    total_fetched = 0

    try:
        while True:
            params = {
                'leaderCategories': 'homeRuns',
                'season': season_year,
                'limit': page_size,
                'offset': offset,
                'leaderGameTypes': 'R',  # Regular season only
                'statGroup': 'hitting',
                'hydrate': 'team'  # Include team data (abbreviation, name, etc.)
            }

            print(f"   Fetching offset {offset}...", end=' ')
            response = requests.get(base_url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            # Navigate the response structure
            if 'leagueLeaders' not in data:
                print("no data")
                break

            page_count = 0
            min_hr_on_page = float('inf')

            for league_leader in data['leagueLeaders']:
                if 'leaders' not in league_leader:
                    continue

                for leader in league_leader['leaders']:
                    hr_total = int(leader.get('value', 0))
                    min_hr_on_page = min(min_hr_on_page, hr_total)

                    player_data = leader.get('person', {})
                    team_data = leader.get('team', {})

                    player_id = str(player_data.get('id', ''))
                    player_name = player_data.get('fullName', 'Unknown')
                    team_abbr = team_data.get('abbreviation', 'FA')

                    if player_id:
                        if player_id not in all_players:
                            # New player - add them
                            all_players[player_id] = {
                                'mlbId': player_id,
                                'name': player_name,
                                'teamAbbr': team_abbr,
                                'hrsTotal': hr_total,
                                'seasonYear': season_year
                            }
                        # else: Player already seen (traded) - keep first entry since
                        # list is sorted by HRs desc and API shows total HRs per entry

                        page_count += 1

            total_fetched += page_count
            print(f"got {page_count} entries (min HR: {min_hr_on_page})")

            # Stop if we got fewer than page_size (no more data)
            # or if the minimum HR on this page is below our threshold
            if page_count < page_size:
                print(f"   Reached end of data")
                break

            if min_hr_on_page < min_home_runs:
                print(f"   Reached players below {min_home_runs} HR threshold")
                break

            offset += page_size

        # Filter by minimum home runs and sort
        eligible_players = [
            p for p in all_players.values()
            if p['hrsTotal'] >= min_home_runs
        ]
        eligible_players.sort(key=lambda x: x['hrsTotal'], reverse=True)

        print(f"\n   Total entries fetched: {total_fetched}")
        print(f"   Unique players: {len(all_players)}")
        print(f"   Players with >= {min_home_runs} HRs: {len(eligible_players)}")

        # Show top 5 and bottom 5
        if eligible_players:
            print(f"\n   Top 5:")
            for p in eligible_players[:5]:
                print(f"      {p['name']} ({p['teamAbbr']}): {p['hrsTotal']} HRs")
            print(f"   Bottom 5:")
            for p in eligible_players[-5:]:
                print(f"      {p['name']} ({p['teamAbbr']}): {p['hrsTotal']} HRs")

        return eligible_players

    except requests.exceptions.RequestException as e:
        print(f"ERROR: HTTP request failed: {e}")
        return []
    except Exception as e:
        print(f"ERROR: Error fetching season leaders: {e}")
        import traceback
        traceback.print_exc()
        return []


def upsert_player_season_stats(supabase, players_data: list) -> dict:
    """
    Insert or update players and their season stats in the database.

    Args:
        supabase: Supabase client instance
        players_data: List of player dictionaries with season stats

    Returns:
        Dictionary with success/failure counts
    """
    results = {
        'players_created': 0,
        'players_updated': 0,
        'stats_created': 0,
        'stats_updated': 0,
        'errors': 0
    }

    print(f"\nUpserting {len(players_data)} players to database...")

    for player in players_data:
        try:
            # 1. Upsert Player record
            player_response = supabase.table('Player').upsert(
                {
                    'mlbId': player['mlbId'],
                    'name': player['name'],
                    'teamAbbr': player['teamAbbr'],
                    'updatedAt': datetime.utcnow().isoformat()
                },
                on_conflict='mlbId'
            ).execute()

            if player_response.data:
                player_id = player_response.data[0]['id']

                # Check if this was an insert or update
                existing_check = supabase.table('Player').select('id').eq('mlbId', player['mlbId']).execute()
                if len(existing_check.data) == 1:
                    results['players_updated'] += 1
                else:
                    results['players_created'] += 1

                # 2. Upsert PlayerSeasonStats record
                stats_response = supabase.table('PlayerSeasonStats').upsert(
                    {
                        'playerId': player_id,
                        'seasonYear': player['seasonYear'],
                        'hrsTotal': player['hrsTotal'],
                        'teamAbbr': player['teamAbbr'],
                        'updatedAt': datetime.utcnow().isoformat()
                    },
                    on_conflict='playerId,seasonYear'
                ).execute()

                if stats_response.data:
                    results['stats_updated'] += 1
                else:
                    results['stats_created'] += 1

                print(f"   OK {player['name']}: {player['hrsTotal']} HRs")

        except Exception as e:
            results['errors'] += 1
            print(f"   ERROR: Error upserting {player['name']}: {e}")

    return results


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description='Import full season stats for player eligibility'
    )
    parser.add_argument(
        '--season',
        type=int,
        default=2025,
        help='MLB season year to import (default: 2025)'
    )
    parser.add_argument(
        '--min-hrs',
        type=int,
        default=10,
        help='Minimum home runs for eligibility (default: 10)'
    )

    args = parser.parse_args()

    print("=" * 60)
    print("Season Stats Import for Player Eligibility")
    print("=" * 60)
    print(f"Season: {args.season}")
    print(f"Minimum HRs: {args.min_hrs}")
    print("=" * 60)
    print()

    # Step 1: Fetch eligible players from MLB API with pagination
    players_data = fetch_season_leaders_paginated(args.season, args.min_hrs)

    if not players_data:
        print("\nWARNING: No eligible players found. Check the season year and threshold.")
        sys.exit(1)

    # Step 2: Get Supabase client
    try:
        db = SupabaseDB()
        supabase = db.client
    except Exception as e:
        print(f"\nERROR: Failed to connect to database: {e}")
        sys.exit(1)

    # Step 3: Upsert players and stats to database
    results = upsert_player_season_stats(supabase, players_data)

    # Step 4: Print summary
    print("\n" + "=" * 60)
    print("IMPORT SUMMARY")
    print("=" * 60)
    print(f"Players processed: {len(players_data)}")
    print(f"Players created/updated: {results['players_created'] + results['players_updated']}")
    print(f"Season stats created/updated: {results['stats_created'] + results['stats_updated']}")
    print(f"Errors: {results['errors']}")
    print("=" * 60)

    if results['errors'] > 0:
        print(f"\nWARNING: Completed with {results['errors']} error(s)")
        sys.exit(1)
    else:
        print(f"\nSUCCESS: Imported {args.season} season stats!")
        print(f"   {len(players_data)} players with >={args.min_hrs} HRs are now eligible\n")
        sys.exit(0)


if __name__ == '__main__':
    main()
