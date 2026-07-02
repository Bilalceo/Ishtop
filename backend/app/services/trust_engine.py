"""Trust scoring and explainability helpers for jobs and recommendations."""

from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from typing import Any, Dict, List, Optional


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Coerce a naive datetime (stored as naive UTC in the DB) to aware UTC.

    Shared by analytics/trust code that compares stored datetimes against
    timezone-aware windows.
    """
    if not dt:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _bound_score(value: float) -> float:
    return max(0.0, min(100.0, round(value, 1)))


def _score_state(score_0_to_1: float) -> str:
    if score_0_to_1 >= 0.8:
        return "strong"
    if score_0_to_1 >= 0.55:
        return "medium"
    return "weak"


def calculate_job_trust(job: Any, company: Any) -> Dict[str, Any]:
    """Compute trust score, factors and badges for a job posting."""
    verification_state = str(getattr(company, "verification_state", "unverified") or "unverified")

    verification_factor = {
        "approved": 1.0,
        "pending": 0.6,
        "rejected": 0.25,
        "unverified": 0.2,
    }.get(verification_state, 0.2)

    salary_factor = 1.0 if (getattr(job, "is_salary_visible", False) and getattr(job, "salary_min", None) and getattr(job, "salary_max", None)) else 0.35

    created_at = to_aware(getattr(job, "created_at", None))
    if created_at:
        age_days = max(0, int((_utc_now() - created_at).total_seconds() // 86400))
    else:
        age_days = 999

    if age_days <= 7:
        freshness_factor = 1.0
    elif age_days <= 30:
        freshness_factor = 0.75
    elif age_days <= 90:
        freshness_factor = 0.5
    else:
        freshness_factor = 0.3

    response_rate = getattr(company, "employer_response_rate", None)
    avg_response_hours = getattr(company, "employer_avg_response_hours", None)
    if response_rate is not None:
        response_factor = max(0.0, min(1.0, float(response_rate) / 100.0))
    elif avg_response_hours is not None:
        hours = max(1.0, float(avg_response_hours))
        response_factor = max(0.2, min(1.0, 72.0 / hours))
    else:
        response_factor = 0.55

    scam_factor = 0.9
    if getattr(job, "external_apply_url", None) and not getattr(company, "company_website", None):
        scam_factor = 0.45
    if not getattr(job, "salary_min", None) and not getattr(job, "salary_max", None):
        scam_factor -= 0.1
    scam_factor = max(0.2, min(1.0, scam_factor))

    factors = [
        {
            "code": "verification",
            "label": "Employer verification",
            "score": round(verification_factor, 2),
            "weight": 0.32,
            "state": _score_state(verification_factor),
        },
        {
            "code": "salary_transparency",
            "label": "Salary transparency",
            "score": round(salary_factor, 2),
            "weight": 0.2,
            "state": _score_state(salary_factor),
        },
        {
            "code": "freshness",
            "label": "Vacancy freshness",
            "score": round(freshness_factor, 2),
            "weight": 0.16,
            "state": _score_state(freshness_factor),
        },
        {
            "code": "responsiveness",
            "label": "Employer responsiveness",
            "score": round(response_factor, 2),
            "weight": 0.18,
            "state": _score_state(response_factor),
        },
        {
            "code": "risk",
            "label": "Fraud risk heuristics",
            "score": round(scam_factor, 2),
            "weight": 0.14,
            "state": _score_state(scam_factor),
        },
    ]

    score = _bound_score(sum(float(item["score"]) * float(item["weight"]) for item in factors) * 100.0)

    badges: List[str] = []
    if verification_state == "approved":
        badges.append("verified_employer")
    if salary_factor >= 1.0:
        badges.append("transparent_salary")
    if freshness_factor >= 0.75:
        badges.append("fresh_listing")
    if response_factor >= 0.8:
        badges.append("fast_responder")
    if score >= 80:
        badges.append("high_trust")

    return {
        "trust_score": score,
        "trust_factors": factors,
        "trust_badges": badges,
        "verification_state": verification_state,
        "response_metrics": {
            "response_rate": response_rate,
            "avg_response_hours": avg_response_hours,
            "age_days": age_days,
        },
    }


def build_match_explainability(
    *,
    score: float,
    reasons: List[str],
    missing_skills: List[str],
) -> Dict[str, Any]:
    """Create explainable AI payload with 7/14/30-day improvement guidance."""
    missing = [str(item) for item in (missing_skills or []) if item]
    top_missing = missing[:5]

    d7_steps: List[str] = []
    d14_steps: List[str] = []
    d30_steps: List[str] = []

    if top_missing:
        d7_steps.append(f"Learn fundamentals of: {', '.join(top_missing[:2])}")
        d14_steps.append(f"Build a small project using: {', '.join(top_missing[:3])}")
        d30_steps.append(f"Publish portfolio proof for: {', '.join(top_missing[:4])}")

    d7_steps.append("Refine resume summary to align with target role keywords")
    d14_steps.append("Quantify two outcomes in recent experience bullets")
    d30_steps.append("Complete one mock interview and update resume with feedback")

    confidence = "high" if score >= 80 else "medium" if score >= 60 else "low"

    return {
        "confidence": confidence,
        "fit_reasons": reasons[:4],
        "missing_items": top_missing,
        "improvement_plan": {
            "d7": d7_steps[:3],
            "d14": d14_steps[:3],
            "d30": d30_steps[:3],
        },
    }


def is_rollout_enabled(*, subject_id: str, rollout_percent: int) -> bool:
    """Stable hash-based feature rollout gate."""
    pct = max(0, min(100, int(rollout_percent)))
    if pct >= 100:
        return True
    if pct <= 0:
        return False

    digest = sha256(subject_id.encode("utf-8")).hexdigest()
    bucket = int(digest[:8], 16) % 100
    return bucket < pct
