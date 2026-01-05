"""
Import 2025 Eligibility Data from MLB-StatsAPI
Fetches 2024 season statistics to determine 2025 contest eligibility
Populates Player and PlayerSeasonStats tables

Usage:
    python import_2025_eligibility.py [--min-hrs 10] [--season-year 2025]
"""

import os
import sys
import logging
import argparse
from typing import Dict, List, Tuple
from pathlib import Path

# Add parent directories to path
backend_dir = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(backend_dir))

# Load environment from backend/.env
from dotenv import load_dotenv
env_path = backend_dir / '.env'
load_dotenv(env_path)

import statsapi
from db_utils import SupabaseDB

# Configure logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class EligibilityImporter:
    """Handles import of 2024 season stats for 2025 eligibility"""

