#!/usr/bin/env python3
"""Backfill derived trust and discovery fields for existing data.

Usage:
  python scripts/backfill_trust_and_discovery.py --dry-run
  python scripts/backfill_trust_and_discovery.py
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Allow running from either repo root (`python backend/scripts/...`) or backend/.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.models import Job, User, UserRole
from app.services.trust_engine import calculate_job_trust


VALID_VERIFICATION_STATES = {"unverified", "pending", "approved", "rejected"}


@dataclass
class EntitySummary:
    scanned: int = 0
    updated: int = 0
    fields: Dict[str, int] = field(default_factory=dict)

    def mark_field(self, name: str) -> None:
        self.fields[name] = self.fields.get(name, 0) + 1


@dataclass
class BackfillSummary:
    companies: EntitySummary = field(default_factory=EntitySummary)
    jobs: EntitySummary = field(default_factory=EntitySummary)


def _is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _is_missing_list(value: Any) -> bool:
    return value is None


def _is_missing_trust_score(value: Any) -> bool:
    if value is None:
        return True
    try:
        return float(value) <= 0.0
    except (TypeError, ValueError):
        return True


def plan_company_updates(company: User) -> Dict[str, Any]:
    """Return missing company trust defaults without mutating the company."""
    updates: Dict[str, Any] = {}

    verification_state = getattr(company, "verification_state", None)
    if _is_blank(verification_state) or str(verification_state).strip().lower() not in VALID_VERIFICATION_STATES:
        updates["verification_state"] = "unverified"

    if _is_missing_list(getattr(company, "trust_badges", None)):
        updates["trust_badges"] = []

    return updates


def plan_job_updates(job: Job, company: User | None) -> Dict[str, Any]:
    """Return missing job discovery/trust fields without mutating the job."""
    updates: Dict[str, Any] = {}

    current_city_slug = getattr(job, "city_slug", None)
    current_profession_slug = getattr(job, "profession_slug", None)
    current_company_slug = getattr(job, "company_slug", None)

    needs_city = _is_blank(current_city_slug)
    needs_profession = _is_blank(current_profession_slug)
    needs_company = _is_blank(current_company_slug)
    if needs_city or needs_profession or needs_company:
        original_slugs = (current_city_slug, current_profession_slug, current_company_slug)
        job.sync_discovery_slugs(
            company_name=getattr(company, "company_name", None),
            company_full_name=getattr(company, "full_name", None),
        )
        if needs_city and not _is_blank(job.city_slug):
            updates["city_slug"] = job.city_slug
        if needs_profession and not _is_blank(job.profession_slug):
            updates["profession_slug"] = job.profession_slug
        if needs_company and not _is_blank(job.company_slug):
            updates["company_slug"] = job.company_slug
        job.city_slug, job.profession_slug, job.company_slug = original_slugs

    needs_score = _is_missing_trust_score(getattr(job, "trust_score", None))
    needs_factors = not getattr(job, "trust_factors", None)
    needs_badges = _is_missing_list(getattr(job, "trust_badges", None))
    if needs_score or needs_factors or needs_badges:
        trust_payload = calculate_job_trust(job, company)
        if needs_score:
            updates["trust_score"] = float(trust_payload["trust_score"])
        if needs_factors:
            updates["trust_factors"] = trust_payload["trust_factors"]
        if needs_badges:
            updates["trust_badges"] = trust_payload["trust_badges"]

    return updates


def _apply_updates(entity: Any, updates: Dict[str, Any]) -> None:
    for field_name, value in updates.items():
        setattr(entity, field_name, value)


def _active_filter(model: Any) -> Any:
    return model.is_deleted == False  # noqa: E712 - SQLAlchemy expression


def _query_company_users(db: Session) -> List[User]:
    return (
        db.query(User)
        .filter(User.role == UserRole.COMPANY, _active_filter(User))
        .order_by(User.created_at.asc())
        .all()
    )


def _query_jobs(db: Session) -> List[Job]:
    return db.query(Job).filter(_active_filter(Job)).order_by(Job.created_at.asc()).all()


def backfill_session(db: Session, *, dry_run: bool = False) -> BackfillSummary:
    """Backfill one database session and return scanned/updated counts."""
    summary = BackfillSummary()

    for company in _query_company_users(db):
        summary.companies.scanned += 1
        updates = plan_company_updates(company)
        if not updates:
            continue
        summary.companies.updated += 1
        for field_name in updates:
            summary.companies.mark_field(field_name)
        if not dry_run:
            _apply_updates(company, updates)

    for job in _query_jobs(db):
        summary.jobs.scanned += 1
        updates = plan_job_updates(job, job.company)
        if not updates:
            continue
        summary.jobs.updated += 1
        for field_name in updates:
            summary.jobs.mark_field(field_name)
        if not dry_run:
            _apply_updates(job, updates)

    if dry_run:
        db.rollback()
    else:
        db.commit()

    return summary


def _format_fields(fields: Dict[str, int]) -> str:
    if not fields:
        return "none"
    return ", ".join(f"{name}={count}" for name, count in sorted(fields.items()))


def format_summary(summary: BackfillSummary, *, dry_run: bool) -> str:
    action = "would update" if dry_run else "updated"
    return "\n".join(
        [
            "Trust/discovery backfill summary",
            f"Mode: {'dry-run' if dry_run else 'write'}",
            f"Companies: scanned={summary.companies.scanned}, {action}={summary.companies.updated}",
            f"Company fields: {_format_fields(summary.companies.fields)}",
            f"Jobs: scanned={summary.jobs.scanned}, {action}={summary.jobs.updated}",
            f"Job fields: {_format_fields(summary.jobs.fields)}",
        ]
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill missing trust and discovery fields for existing companies/jobs."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan and print what would change without committing updates.",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    engine = create_engine(str(settings.DATABASE_URL), echo=False)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    db = SessionLocal()
    try:
        summary = backfill_session(db, dry_run=args.dry_run)
        print(format_summary(summary, dry_run=args.dry_run))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
