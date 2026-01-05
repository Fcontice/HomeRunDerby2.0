-- ============================================================
-- Database Cleanup for 2025 Eligibility Import
-- ============================================================
-- This script deletes all player and team data to prepare for
-- fresh import of 2024 season stats (for 2025 eligibility)
--
-- CRITICAL: Backup database BEFORE running this script
-- ============================================================

-- Start transaction for safety
BEGIN;

-- ============================================================
-- STEP 1: Delete Leaderboards (no dependencies)
-- ============================================================
DELETE FROM "Leaderboard";
-- Expected: ~0-100 records deleted (if any leaderboards exist)

-- ============================================================
-- STEP 2: Delete PlayerStats (references Player)
-- ============================================================
DELETE FROM "PlayerStats";
-- Expected: ~0-5000 records deleted (daily tracking data)

-- ============================================================
-- STEP 3: Delete PlayerSeasonStats (references Player)
-- ============================================================
DELETE FROM "PlayerSeasonStats";
-- Expected: ~173 records deleted (2024/2025 eligibility data)

-- ============================================================
-- STEP 4: Delete TeamPlayer (junction table)
-- ============================================================
DELETE FROM "TeamPlayer";
-- Expected: ~0-800 records deleted (8 players per team)

-- ============================================================
-- STEP 5: Delete Teams (references User)
-- ============================================================
DELETE FROM "Team";
-- Expected: ~0-100 records deleted

-- ============================================================
-- STEP 6: Delete Players (no remaining dependencies)
-- ============================================================
DELETE FROM "Player";
-- Expected: ~173 records deleted (all players)

-- ============================================================
-- VERIFICATION: Confirm all tables empty except User
-- ============================================================
DO $$
DECLARE
  player_count INT;
  team_count INT;
  team_player_count INT;
  player_stats_count INT;
  player_season_stats_count INT;
  leaderboard_count INT;
BEGIN
  SELECT COUNT(*) INTO player_count FROM "Player";
  SELECT COUNT(*) INTO team_count FROM "Team";
  SELECT COUNT(*) INTO team_player_count FROM "TeamPlayer";
  SELECT COUNT(*) INTO player_stats_count FROM "PlayerStats";
  SELECT COUNT(*) INTO player_season_stats_count FROM "PlayerSeasonStats";
  SELECT COUNT(*) INTO leaderboard_count FROM "Leaderboard";

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'CLEANUP VERIFICATION:';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Player: % records', player_count;
  RAISE NOTICE 'Team: % records', team_count;
  RAISE NOTICE 'TeamPlayer: % records', team_player_count;
  RAISE NOTICE 'PlayerStats: % records', player_stats_count;
  RAISE NOTICE 'PlayerSeasonStats: % records', player_season_stats_count;
  RAISE NOTICE 'Leaderboard: % records', leaderboard_count;
  RAISE NOTICE '============================================================';

  -- Assert all are zero
  IF player_count > 0 OR team_count > 0 OR team_player_count > 0
     OR player_stats_count > 0 OR player_season_stats_count > 0
     OR leaderboard_count > 0 THEN
    RAISE EXCEPTION 'Cleanup incomplete! Some tables still have data.';
  END IF;

  RAISE NOTICE '✅ All tables successfully cleaned!';
END $$;

-- ============================================================
-- RESET SEQUENCES (if using SERIAL/BIGSERIAL)
-- ============================================================
-- Note: This project uses UUIDs, so no sequence resets needed

-- ============================================================
-- COMMIT TRANSACTION
-- ============================================================
-- Review output above before committing
-- If verification passed, transaction will commit automatically
COMMIT;

-- ============================================================
-- POST-CLEANUP VERIFICATION
-- ============================================================
-- Run this after COMMIT to confirm:
SELECT
  'User' as table_name, COUNT(*) as remaining_count FROM "User"
UNION ALL
SELECT 'Team', COUNT(*) FROM "Team"
UNION ALL
SELECT 'Player', COUNT(*) FROM "Player"
UNION ALL
SELECT 'TeamPlayer', COUNT(*) FROM "TeamPlayer"
UNION ALL
SELECT 'PlayerStats', COUNT(*) FROM "PlayerStats"
UNION ALL
SELECT 'PlayerSeasonStats', COUNT(*) FROM "PlayerSeasonStats"
UNION ALL
SELECT 'Leaderboard', COUNT(*) FROM "Leaderboard";

-- Expected output:
-- User: (varies, unchanged)
-- Team: 0
-- Player: 0
-- TeamPlayer: 0
-- PlayerStats: 0
-- PlayerSeasonStats: 0
-- Leaderboard: 0
