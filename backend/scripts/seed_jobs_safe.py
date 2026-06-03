#!/usr/bin/env python3
"""
Append-only seed for production/local databases.

Usage:
  python scripts/seed_jobs_safe.py
  python scripts/seed_jobs_safe.py --min-active 10
"""

from __future__ import annotations

import argparse
import sys

sys.path.insert(0, ".")

from app.database import SessionLocal
from app.services.startup_seed import ensure_minimum_active_jobs


def main() -> None:
    parser = argparse.ArgumentParser(description="Safe append-only job seed")
    parser.add_argument("--min-active", type=int, default=10, help="Minimum active jobs to ensure")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        created = ensure_minimum_active_jobs(db, args.min_active)
        print(f"created_jobs={created}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
