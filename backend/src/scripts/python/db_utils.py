"""
Database Utilities for Supabase
Handles all database interactions for player stats updates
"""

import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from supabase import create_client, Client

logger = logging.getLogger(__name__)


class SupabaseDB:
    """Supabase database connection and operations"""

    def __init__(self):
        """Initialize Supabase client"""
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        if not self.url or not self.key:
            raise ValueError("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")

        self.client: Client = create_client(self.url, self.key)
        logger.info("✅ Supabase client initialized")

    def get_player_by_mlb_id(self, mlb_id: str) -> Optional[Dict[str, Any]]:
        """
        Find player by MLB ID

        Args:
            mlb_id: MLB ID in format 'mlb-{playerId}'

        Returns:
            Player record or None if not found
        """
        try:
            # Prisma uses camelCase column names (no @map directives in schema)
            response = self.client.table('Player').select('*').eq('mlbId', mlb_id).execute()

            if response.data and len(response.data) > 0:
                return response.data[0]
            return None

        except Exception as e:
            logger.error(f"Error fetching player {mlb_id}: {e}")
            return None

    def get_all_players(self) -> List[Dict[str, Any]]:
        """
        Get all non-deleted players

        Returns:
            List of player records
        """
        try:
            # Prisma uses camelCase column names (Player model has no deletedAt field)
            response = self.client.table('Player').select('*').execute()
            return response.data if response.data else []

        except Exception as e:
            logger.error(f"Error fetching all players: {e}")
            return []

    def update_player_metadata(
        self,
        player_id: str,
        team_abbr: Optional[str] = None,
        name: Optional[str] = None,
    ) -> bool:
        """
        Update player metadata (team, name)

        Args:
            player_id: Player UUID
            team_abbr: Team abbreviation (e.g., 'NYY')
            name: Player full name

        Returns:
            True if successful, False otherwise
        """
        try:
            # Prisma uses camelCase column names
            update_data = {'updatedAt': datetime.utcnow().isoformat()}

            if team_abbr:
                update_data['teamAbbr'] = team_abbr
            if name:
                update_data['name'] = name

            self.client.table('Player').update(update_data).eq('id', player_id).execute()
            return True

        except Exception as e:
            logger.error(f"Error updating player {player_id} metadata: {e}")
            return False

    def upsert_player_stats(
        self,
        player_id: str,
        season_year: int,
        date: str,
        hrs_daily: int,
        hrs_total: int,
        hrs_regular_season: int,
        hrs_postseason: int = 0
    ) -> bool:
        """
        Upsert player stats for a specific date using atomic upsert
        Uses composite key: (playerId, seasonYear, date)

        This method uses Supabase's native upsert with on_conflict to handle
        race conditions atomically, preventing UNIQUE constraint violations
        when concurrent calls occur.

        Args:
            player_id: Player UUID
            season_year: Season year (e.g., 2026)
            date: Date in YYYY-MM-DD format
            hrs_daily: Home runs hit on this specific date (not cumulative)
            hrs_total: Cumulative home runs for season
            hrs_regular_season: Regular season home runs only
            hrs_postseason: Postseason home runs (always 0 for our contest)

        Returns:
            True if successful, False otherwise
        """
        try:
            # Use Supabase's native upsert with on_conflict for atomic operation
            # This prevents race conditions that can cause UNIQUE constraint violations
            stats_data = {
                'playerId': player_id,
                'seasonYear': season_year,
                'date': date,
                'hrsDaily': hrs_daily,
                'hrsTotal': hrs_total,
                'hrsRegularSeason': hrs_regular_season,
                'hrsPostseason': hrs_postseason,
                'lastUpdated': datetime.utcnow().isoformat()
            }

            # Atomic upsert - if record exists (based on unique constraint), update it
            # The unique constraint is on (playerId, seasonYear, date)
            self.client.table('PlayerStats').upsert(
                stats_data,
                on_conflict='playerId,seasonYear,date'
            ).execute()

            return True

        except Exception as e:
            logger.error(f"Error upserting stats for player {player_id} on {date}: {e}")
            return False

    def get_latest_stats_date(self, season_year: int) -> Optional[str]:
        """
        Get the most recent date that has stats recorded

        Args:
            season_year: Season year to check

        Returns:
            Date string in YYYY-MM-DD format or None
        """
        try:
            # Prisma uses camelCase column names
            response = self.client.table('PlayerStats').select('date').eq(
                'seasonYear', season_year
            ).order('date', desc=True).limit(1).execute()

            if response.data and len(response.data) > 0:
                return response.data[0]['date']
            return None

        except Exception as e:
            logger.error(f"Error fetching latest stats date: {e}")
            return None

    def get_player_season_total(self, player_id: str, season_year: int) -> int:
        """
        Get player's current season total home runs

        Args:
            player_id: Player UUID
            season_year: Season year

        Returns:
            Total home runs or 0 if no stats found
        """
        try:
            # Prisma uses camelCase column names
            response = self.client.table('PlayerStats').select('hrsTotal').eq(
                'playerId', player_id
            ).eq('seasonYear', season_year).order('date', desc=True).limit(1).execute()

            if response.data and len(response.data) > 0:
                return response.data[0]['hrsTotal']
            return 0

        except Exception as e:
            logger.error(f"Error fetching season total for player {player_id}: {e}")
            return 0

    def bulk_upsert_player_stats(self, stats_records: List[Dict[str, Any]]) -> tuple[int, int]:
        """
        Bulk upsert multiple player stats records

        Args:
            stats_records: List of stats dictionaries with Python-friendly keys:
                           player_id, season_year, date, hrs_daily, hrs_total, hrs_regular_season, hrs_postseason

        Returns:
            Tuple of (successful_count, error_count)
        """
        success_count = 0
        error_count = 0

        for record in stats_records:
            result = self.upsert_player_stats(
                player_id=record['player_id'],
                season_year=record['season_year'],
                date=record['date'],
                hrs_daily=record.get('hrs_daily', 0),
                hrs_total=record['hrs_total'],
                hrs_regular_season=record['hrs_regular_season'],
                hrs_postseason=record.get('hrs_postseason', 0)
            )

            if result:
                success_count += 1
            else:
                error_count += 1

        return success_count, error_count
