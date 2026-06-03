from __future__ import annotations

from datetime import datetime, timezone, timedelta
from types import SimpleNamespace

from app.services.trust_engine import (
    build_match_explainability,
    calculate_job_trust,
    is_rollout_enabled,
)


def test_calculate_job_trust_bounds_and_factors() -> None:
    company = SimpleNamespace(
        verification_state="approved",
        employer_response_rate=92.0,
        employer_avg_response_hours=8.0,
        company_website="https://example.com",
    )
    job = SimpleNamespace(
        is_salary_visible=True,
        salary_min=8_000_000,
        salary_max=12_000_000,
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
        external_apply_url=None,
    )

    payload = calculate_job_trust(job, company)
    repeat_payload = calculate_job_trust(job, company)

    assert 0.0 <= payload["trust_score"] <= 100.0
    assert payload["trust_score"] == repeat_payload["trust_score"]
    assert payload["verification_state"] == "approved"
    assert len(payload["trust_factors"]) == 5
    assert "verified_employer" in payload["trust_badges"]


def test_calculate_job_trust_handles_low_signal_jobs_with_bounds() -> None:
    company = SimpleNamespace(
        verification_state="unverified",
        employer_response_rate=None,
        employer_avg_response_hours=None,
        company_website=None,
    )
    job = SimpleNamespace(
        is_salary_visible=False,
        salary_min=None,
        salary_max=None,
        created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        external_apply_url="https://external.example/apply",
    )

    payload = calculate_job_trust(job, company)

    assert 0.0 <= payload["trust_score"] <= 100.0
    assert payload["verification_state"] == "unverified"
    assert payload["trust_badges"] == []


def test_explainability_payload_shape() -> None:
    result = build_match_explainability(
        score=71.4,
        reasons=["Matched 5/8 requirement terms", "Experience level matches"],
        missing_skills=["kubernetes", "redis", "sql"],
    )

    assert result["confidence"] in {"low", "medium", "high"}
    assert isinstance(result["fit_reasons"], list)
    assert isinstance(result["missing_items"], list)
    assert set(result["improvement_plan"].keys()) == {"d7", "d14", "d30"}


def test_rollout_gate_is_deterministic() -> None:
    first = is_rollout_enabled(subject_id="abc-user", rollout_percent=35)
    second = is_rollout_enabled(subject_id="abc-user", rollout_percent=35)
    assert first == second
