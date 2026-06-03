"""
Job matching service.

Shared scoring logic used by:
- POST /jobs/match          — explicit resume_id matching
- GET  /jobs/recommended    — auto-pick the user's latest resume
- POST /applications/apply  — snapshot the score at application time

Keeping the logic in one place ensures the candidate and the recruiter see
identical numbers, and lets us evolve the algorithm without duplicating edits.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple


# =============================================================================
# TEXT NORMALIZATION
# =============================================================================


def normalize_text(value: Any) -> str:
    """Lowercase + collapse whitespace; returns empty string for None."""
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip().lower()


def tokenize_text(value: Any) -> List[str]:
    """Split on non-word characters; keeps tech tokens like 'c++', 'node.js'."""
    normalized = normalize_text(value)
    if not normalized:
        return []
    return [token for token in re.split(r"[^\w+#./-]+", normalized) if len(token) > 1]


def flatten_to_strings(value: Any) -> List[str]:
    """Recursively flatten nested JSON to a list of normalized text fragments."""
    fragments: List[str] = []
    if value is None:
        return fragments
    if isinstance(value, str):
        cleaned = normalize_text(value)
        if cleaned:
            fragments.append(cleaned)
        return fragments
    if isinstance(value, (int, float, bool)):
        fragments.append(normalize_text(value))
        return fragments
    if isinstance(value, list):
        for item in value:
            fragments.extend(flatten_to_strings(item))
        return fragments
    if isinstance(value, dict):
        for item in value.values():
            fragments.extend(flatten_to_strings(item))
        return fragments
    return fragments


def normalize_terms(values: List[str]) -> List[str]:
    """Deduplicate + tokenize a list of phrases. Order is stable (sorted)."""
    terms: set[str] = set()
    for value in values:
        cleaned = normalize_text(value)
        if not cleaned:
            continue
        terms.add(cleaned)
        for token in tokenize_text(cleaned):
            terms.add(token)
    return sorted(terms)


# =============================================================================
# RESUME / JOB EXTRACTION
# =============================================================================


def extract_job_requirement_terms(requirements: Any) -> List[str]:
    """Pull comparable terms out of the Job.requirements JSON column."""
    requirement_values: List[str] = []
    if isinstance(requirements, dict):
        for key in (
            "skills",
            "required_skills",
            "must_have",
            "nice_to_have",
            "technologies",
            "tools",
            "experience",
            "education",
            "certifications",
            "keywords",
            "requirements",
            "responsibilities",
            "domain",
            "industry",
        ):
            requirement_values.extend(flatten_to_strings(requirements.get(key)))
        # Include any other nested data so unusual schemas still contribute.
        requirement_values.extend(flatten_to_strings(requirements))
    else:
        requirement_values.extend(flatten_to_strings(requirements))
    return normalize_terms(requirement_values)


def extract_skills_from_resume(content: Dict[str, Any]) -> List[str]:
    """Collect comparable terms from both current and legacy resume schemas."""
    collected: List[str] = []
    collected.extend(flatten_to_strings(content.get("skills")))
    collected.extend(flatten_to_strings(content.get("experience")))
    collected.extend(flatten_to_strings(content.get("work_experience")))
    for key in ("education", "certifications", "projects", "summary", "professional_summary"):
        collected.extend(flatten_to_strings(content.get(key)))
    return normalize_terms(collected)


def extract_experience_level(content: Dict[str, Any]) -> str:
    """Heuristic: derive seniority from number of work-experience entries."""
    work_exp = content.get("experience") or content.get("work_experience") or []
    if not work_exp:
        return "junior"
    n = len(work_exp)
    if n >= 5:
        return "senior"
    if n >= 3:
        return "mid"
    if n >= 1:
        return "junior"
    return "intern"


def extract_keywords(content: Dict[str, Any]) -> List[str]:
    """Extract role/title/domain keywords for title-overlap scoring."""
    keywords: List[str] = []
    keywords.extend(flatten_to_strings(content.get("professional_summary")))
    keywords.extend(flatten_to_strings(content.get("summary")))
    keywords.extend(flatten_to_strings(content.get("target_position")))
    keywords.extend(flatten_to_strings(content.get("job_title")))
    keywords.extend(flatten_to_strings(content.get("specialization")))

    for exp in content.get("experience") or content.get("work_experience") or []:
        if isinstance(exp, dict):
            keywords.extend(
                flatten_to_strings(
                    [exp.get("position"), exp.get("job_title"), exp.get("role"), exp.get("title")]
                )
            )

    for edu in content.get("education") or []:
        if isinstance(edu, dict):
            keywords.extend(
                flatten_to_strings([edu.get("field_of_study"), edu.get("specialization"), edu.get("degree")])
            )

    return normalize_terms(keywords)


# =============================================================================
# SCORING
# =============================================================================


EXPERIENCE_LEVELS = {
    "intern": 0,
    "junior": 1,
    "mid": 2,
    "senior": 3,
    "lead": 4,
    "executive": 5,
}


def calculate_match_score(
    resume_skills: List[str],
    resume_experience: str,
    resume_keywords: List[str],
    job: Any,
) -> Tuple[float, List[str], List[str], List[str]]:
    """
    Score a candidate against a job.

    Returns (score [0..100], matched_skills, missing_skills, human-readable reasons).

    Algorithm:
    - 60 pts max from requirement coverage (matched / total job terms)
    - 20 pts max from experience-level alignment
    - 15 pts max from title/domain token overlap
    -  5 pts bonus for remote-friendly roles
    """
    score = 0.0
    reasons: List[str] = []

    resume_terms = set(normalize_terms(resume_skills + resume_keywords))
    job_requirements = extract_job_requirement_terms(job.requirements)
    job_requirement_set = set(job_requirements)

    skill_matches = sorted(
        {
            req
            for req in job_requirement_set
            if any(req == r or req in r or r in req for r in resume_terms)
        }
    )
    missing_skills = sorted(job_requirement_set - set(skill_matches))

    if job_requirement_set:
        coverage = len(skill_matches) / len(job_requirement_set)
        score += coverage * 60
        reasons.append(
            f"Matched {len(skill_matches)}/{len(job_requirement_set)} requirement terms"
        )
    else:
        score += 30
        reasons.append("Job requirements are broad, using title/experience matching")

    resume_level = EXPERIENCE_LEVELS.get(resume_experience, 1)
    job_level = EXPERIENCE_LEVELS.get(job.experience_level, 2)
    level_diff = resume_level - job_level
    if level_diff == 0:
        score += 20
        reasons.append("Experience level matches perfectly")
    elif level_diff == 1:
        score += 15
        reasons.append("Slightly over-qualified (good!)")
    elif level_diff == -1:
        score += 10
        reasons.append("Slightly under-qualified, but close")
    elif level_diff > 1:
        score += 5
        reasons.append("May be over-qualified for this role")

    title_tokens = set(tokenize_text(job.title))
    keyword_tokens: set[str] = set()
    for keyword in resume_keywords:
        keyword_tokens.update(tokenize_text(keyword))
    overlap = title_tokens & keyword_tokens
    if overlap:
        score += 15
        reasons.append(
            f"Title/domain overlap detected: {', '.join(sorted(list(overlap))[:3])}"
        )

    if getattr(job, "is_remote_allowed", False) or getattr(job, "job_type", None) == "remote":
        score += 5
        reasons.append("Remote/hybrid flexibility is available")

    return min(score, 100.0), skill_matches, missing_skills, reasons


def score_resume_against_job(resume_content: Dict[str, Any], job: Any) -> Dict[str, Any]:
    """
    One-shot convenience: returns the breakdown dict ready to persist on Application.match_breakdown.

    Shape: {"score": float, "matched_skills": [...], "missing_skills": [...], "reasons": [...]}
    """
    resume_skills = extract_skills_from_resume(resume_content)
    resume_experience = extract_experience_level(resume_content)
    resume_keywords = extract_keywords(resume_content)
    score, matched, missing, reasons = calculate_match_score(
        resume_skills=resume_skills,
        resume_experience=resume_experience,
        resume_keywords=resume_keywords,
        job=job,
    )
    from app.services.trust_engine import build_match_explainability

    explainability = build_match_explainability(
        score=round(score, 1),
        reasons=reasons,
        missing_skills=missing,
    )

    return {
        "score": round(score, 1),
        "matched_skills": matched,
        "missing_skills": missing,
        "reasons": reasons,
        "explainability": explainability,
    }
