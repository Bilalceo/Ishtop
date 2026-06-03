#!/usr/bin/env python3
"""
Create (or promote) an admin account.

This script is intentionally non-interactive so it can be used in local dev,
CI, and one-off ops. It will:
- create tables (SQLAlchemy create_all) if missing (SQLite-friendly dev path)
- create the admin user if not present
- promote existing user to admin if email already exists

Usage:
  python scripts/create_admin.py --email admin@ishtop.uz --password 'Admin123!'
"""

from __future__ import annotations

import argparse
import secrets
import sys
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Allow running as a script from repo root or backend/ directory.
sys.path.insert(0, ".")

from app.config import settings
from app.models import User, UserRole
from app.models.base import Base


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or promote an admin user")
    parser.add_argument("--email", default="admin@ishtop.uz")
    parser.add_argument("--full-name", default="System Admin")
    parser.add_argument("--phone", default="+998901111111")
    parser.add_argument(
        "--password",
        default="",
        help="Admin password. If omitted, a random password is generated and printed.",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()

    password = (args.password or "").strip()
    if not password:
        # 24 chars ~= 144 bits entropy; good enough for dev/ops output.
        password = secrets.token_urlsafe(18)

    engine = create_engine(str(settings.DATABASE_URL), echo=False)
    SessionLocal = sessionmaker(bind=engine)

    # Dev-friendly: create schema if missing (works for SQLite/local quickstart).
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if user:
            user.role = UserRole.ADMIN
            user.full_name = args.full_name or user.full_name
            user.phone = args.phone or user.phone
            user.is_active_account = True
            user.is_verified = True
            user.set_password(password)
            action = "promoted"
        else:
            user = User(
                id=uuid4(),
                email=args.email,
                full_name=args.full_name,
                phone=args.phone,
                role=UserRole.ADMIN,
                is_active_account=True,
                is_verified=True,
            )
            user.set_password(password)
            db.add(user)
            action = "created"

        db.commit()
        print(f"[OK] Admin {action}: {args.email}")
        print(f"[OK] Password: {password}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

