#!/usr/bin/env python3
"""
Import Full Season Stats for Player Eligibility
================================================
Imports entire season's home run totals to populate PlayerSeasonStats table.
This determines which players are eligible for the next contest.

Usage:
    python import_season_stats.py                    # Import 2025 season (default)
    python import_season_stats.py --season 2024      # Import specific season
    python import_season_stats.py --min-hrs 25       # Custom HR threshold

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

def fetch_season_leaders(season_year: int, min_home_runs: int = 20) -> list:
    """
    Fetch all players with >= min_home_runs for the specified season.

    Args:
        season_year: MLB season year (e.g., 2025)
        min_home_runs: Minimum HRs required for eligibility (default: 20)

    Returns:
        List of player data dictionaries with HR totals
    """
    print(f"Fetching season leaders for {season_year}...")
    print(f"   Minimum threshold: {min_home_runs} home runs")

    try:
        # Use MLB Stats API leaderboard endpoint directly via HTTP
        # Regular season only (R), sorted by home runs
        base_url = "https://statsapi.mlb.com/api/v1/stats/leaders"
        params = {
            'leaderCategories': 'homeRuns',
            'season': season_year,
            'limit': 500,  # Get top 500 players
            'leaderGameTypes': 'R',  # Regular season only
            'statGroup': 'hitting'
        }

        print(f"   Calling MLB API: {base_url}")
        response = requests.get(base_url, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()
        eligible_players = []

        # Navigate the response structure
        if 'leagueLeaders' not in data:
            print("ERROR: Unexpected API response format")
            print(f"Response keys: {data.keys()}")
            return []

        for league_leader in data['leagueLeaders']:
            if 'leaders' not in league_leader:
                continue

            for leader in league_leader['leaders']:
                hr_total = int(leader.get('value', 0))

                if hr_total >= min_home_runs:
                    player_data = leader.get('person', {})
                    team_data = leader.get('team', {})

                    player_id = str(player_data.get('id', ''))
                    player_name = player_data.get('fullName', 'Unknown')
                    team_abbr = team_data.get('abbreviation', 'FA')

                    eligible_players.append({
                        'mlbId': player_id,
                        'name': player_name,
                        'teamAbbr': team_abbr,
                        'hrsTotal': hr_total,
                        'seasonYear': season_year
                    })

                    print(f"   OK {player_name} ({team_abbr}): {hr_total} HRs")

        print(f"\nFound {len(eligible_players)} eligible players")
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
                    # Determine if we created or updated based on whether the player existed before
                    # This is a simplification - in practice, the upsert doesn't tell us directly
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
        default=20,
        help='Minimum home runs for eligibility (default: 20)'
    )

    args = parser.parse_args()

    print("=" * 60)
    print("Season Stats Import for Player Eligibility")
    print("=" * 60)
    print(f"Season: {args.season}")
    print(f"Minimum HRs: {args.min_hrs}")
    print("=" * 60)
    print()

    # Step 1: Fetch eligible players from MLB API
    players_data = fetch_season_leaders(args.season, args.min_hrs)

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
