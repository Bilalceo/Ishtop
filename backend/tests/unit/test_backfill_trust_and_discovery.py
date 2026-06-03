from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from scripts.backfill_trust_and_discovery import (
    backfill_session,
    plan_company_updates,
    plan_job_updates,
)


class FakeJob(SimpleNamespace):
    def sync_discovery_slugs(self, *, company_name=None, company_full_name=None) -> None:
        from app.services.discovery import (
            city_slug_from_location,
            company_slug_from_name,
            profession_slug_from_title,
        )

        self.city_slug = city_slug_from_location(self.location)
        self.profession_slug = profession_slug_from_title(self.title)
        self.company_slug = company_slug_from_name(company_name, company_full_name)


def _company(**overrides):
    defaults = {
        "verification_state": "approved",
        "trust_badges": ["verified_employer"],
        "company_name": "Acme Labs",
        "full_name": "Acme HR",
        "company_website": "https://acme.example",
        "employer_response_rate": 90.0,
        "employer_avg_response_hours": None,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _job(**overrides):
    defaults = {
        "title": "Senior Python Engineer",
        "location": "Tashkent, Uzbekistan",
        "city_slug": None,
        "profession_slug": None,
        "company_slug": None,
        "trust_score": 0.0,
        "trust_factors": None,
        "trust_badges": None,
        "is_salary_visible": True,
        "salary_min": 10_000_000,
        "salary_max": 15_000_000,
        "created_at": datetime.now(timezone.utc),
        "external_apply_url": None,
    }
    defaults.update(overrides)
    return FakeJob(**defaults)


def test_plan_company_updates_only_missing_defaults() -> None:
    assert plan_company_updates(_company(verification_state=None, trust_badges=None)) == {
        "verification_state": "unverified",
        "trust_badges": [],
    }
    assert plan_company_updates(_company()) == {}


def test_plan_job_updates_is_idempotent_after_applying_missing_fields() -> None:
    company = _company()
    job = _job()

    updates = plan_job_updates(job, company)

    assert updates["city_slug"] == "tashkent"
    assert updates["profession_slug"] == "senior-python-engineer"
    assert updates["company_slug"] == "acme-labs"
    assert updates["trust_score"] > 0
    assert updates["trust_factors"]
    assert "verified_employer" in updates["trust_badges"]

    for field_name, value in updates.items():
        setattr(job, field_name, value)

    assert plan_job_updates(job, company) == {}


def test_backfill_session_dry_run_does_not_mutate_entities(monkeypatch) -> None:
    company = _company(verification_state=None, trust_badges=None)
    job = _job()
    job.company = company

    class FakeQuery:
        def __init__(self, values):
            self.values = values

        def filter(self, *args):
            return self

        def order_by(self, *args):
            return self

        def all(self):
            return self.values

    class FakeSession:
        def __init__(self):
            self.committed = False
            self.rolled_back = False

        def query(self, model):
            return FakeQuery([company] if model.__name__ == "User" else [job])

        def rollback(self):
            self.rolled_back = True

        def commit(self):
            self.committed = True

    monkeypatch.setattr(
        "scripts.backfill_trust_and_discovery._active_filter",
        lambda model: True,
    )

    db = FakeSession()
    summary = backfill_session(db, dry_run=True)

    assert summary.companies.scanned == 1
    assert summary.companies.updated == 1
    assert summary.jobs.scanned == 1
    assert summary.jobs.updated == 1
    assert company.verification_state is None
    assert job.city_slug is None
    assert db.rolled_back is True
    assert db.committed is False
