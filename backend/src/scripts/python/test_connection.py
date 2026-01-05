"""
Test database connectivity
"""
import os
import sys
from pathlib import Path

# Add parent directories to path
backend_dir = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(backend_dir))

# Load environment from backend/.env
from dotenv import load_dotenv
env_path = backend_dir / '.env'
load_dotenv(env_path)

print(f"Loading .env from: {env_path}")
print(f"SUPABASE_URL: {'OK' if os.getenv('SUPABASE_URL') else 'MISSING'}")
print(f"SUPABASE_SERVICE_ROLE_KEY: {'OK' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'MISSING'}")

# Test database connection
from db_utils import SupabaseDB

print("\nTesting database connection...")
db = SupabaseDB()

print("Fetching players from database...")
players = db.get_all_players()

print(f"\nSuccess! Found {len(players)} players in database")

if players:
    # Note: Prisma uses camelCase column names
    print(f"\nSample player: {players[0]['name']} ({players[0]['teamAbbr']}) - MLB ID: {players[0]['mlbId']}")

print("\nDatabase connectivity test passed!")
