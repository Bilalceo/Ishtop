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
    """Split on non-word characters; keeps tech tokens like 'c++', 'node.js'.

    Apostrophes are part of the word here: Uzbek writes mas'uliyat, bo'lim,
    ko'nikma. Splitting on them produced the fragments ("bo", "ma", "lish")
    that used to match everything against everything.
    """
    normalized = normalize_text(value)
    if not normalized:
        return []
    normalized = normalized.replace("\u2019", "'").replace("\u2018", "'").replace("`", "'")
    return [token for token in re.split(r"[^\w'+#./-]+", normalized) if len(token) > 1]


# Words that carry no signal about fitness for a job. Without this list, a
# requirement line like "Mas'uliyatlilik va halollik" — which appears in most
# service postings — matched every resume that contained the word "va", and a
# graphic designer's best match came out as a waiter at 85%.
STOPWORDS = {
    # uz
    "va", "bilan", "uchun", "ega", "har", "bir", "bu", "shu", "ham", "yoki",
    "kerak", "lozim", "bo'lish", "bo'lgan", "qilish", "berish", "olish",
    "ish", "ishlash", "ishchi", "xodim", "talab", "talablar", "vazifa",
    "vazifalar", "yosh", "yil", "yillik", "oy", "kun", "soat", "dan", "gacha",
    "ko'p", "kam", "yaxshi", "yangi", "katta", "kichik", "o'z", "biz", "siz",
    # generic soft skills — true of every candidate, so worthless as a signal
    "mas'uliyatlilik", "mas'uliyatli", "halollik", "halol", "intilish",
    "muloqot", "muloqotchanlik", "hushmuomalalik", "xushmuomala", "chaqqon",
    "tezkor", "tartibli", "punktual", "jamoa", "jamoada", "faol", "pozitiv",
    "quvnoq", "ishtiyoq", "o'rganish", "rivojlanish", "natija", "maqsad",
    # ru
    "и", "в", "на", "для", "с", "по", "от", "до", "или", "не", "быть",
    "работа", "работать", "опыт", "год", "года", "лет", "требования",
    "обязанности", "ответственность", "коммуникабельность", "пунктуальность",
    "стрессоустойчивость", "команда", "команде", "активность",
    # en
    "and", "or", "the", "for", "with", "from", "you", "your", "will", "must",
    "have", "has", "are", "job", "work", "working", "team", "good", "strong",
    "skills", "experience", "years", "responsibility", "communication",
}

# Short tokens are noise ("bo", "ma") EXCEPT where the industry really does use
# them as names.
SHORT_ALLOWED = {
    "1c", "go", "c", "r", "ai", "ml", "qa", "hr", "ui", "ux", "js", "db",
    "bi", "3d", "2d", "pm", "smm", "seo", "crm", "erp", "sql", "php", "css",
}


def is_meaningful(token: str) -> bool:
    """A token worth comparing: not a stopword, not a bare number, long enough."""
    t = token.strip("'-./")
    if not t or t in STOPWORDS:
        return False
    if t.isdigit() or re.fullmatch(r"[\d./-]+", t):
        return False          # dates and years are not skills
    if len(t) < 3 and t not in SHORT_ALLOWED:
        return False
    return True


def meaningful_terms(values: List[str]) -> set:
    """Comparable tokens from a list of phrases, noise removed."""
    out: set = set()
    for value in values:
        for token in tokenize_text(value):
            if is_meaningful(token):
                out.add(token.strip("'-./"))
    return out


def terms_match(a: str, b: str) -> bool:
    """Equal, or one is a stem of the other.

    Uzbek is agglutinative — "sotuv" / "sotuvchi" / "sotuvda" are the same idea.
    A prefix relation captures that, but only from five characters up: below
    that it degenerates into the substring matching this replaced, where "bo"
    matched "bo'lim", "bosqich" and "boshqaruv" alike.
    """
    if a == b:
        return True
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    return len(shorter) >= 5 and longer.startswith(shorter)


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


def resume_category(content: Dict[str, Any]) -> str:
    """Which field of work this resume is aimed at.

    The scorer's dominant signal. Before it existed, nothing stopped a graphic
    designer's best match from being a waiting job at 85% — the two share the
    soft-skill words that most service postings are made of, and nothing in the
    maths said they are different kinds of work.

    Reads the aim, not the whole document: target position, headline, job
    titles. A summary paragraph mentioning "restoran" should not turn a designer
    into a cook.
    """
    from app.core.job_categories import classify_job

    parts: List[str] = []
    for key in ("target_position", "job_title", "title", "specialization",
                "desired_position"):
        parts.extend(flatten_to_strings(content.get(key)))
    personal = content.get("personal_info")
    if isinstance(personal, dict):
        parts.extend(flatten_to_strings(personal.get("title")))
    for exp in (content.get("experience") or content.get("work_experience") or []):
        if isinstance(exp, dict):
            parts.extend(flatten_to_strings(
                [exp.get("position"), exp.get("job_title"), exp.get("role"), exp.get("title")]))

    skills_text = " ".join(flatten_to_strings(content.get("skills")))[:400]

    title = " ".join(p for p in parts if p)[:300]
    if title.strip():
        cid = classify_job(title, skills_text)
        if cid != "other":
            return cid

    # No stated position — a student's first resume has an empty experience
    # list, and that is exactly the person this feature is for. Fall back to
    # what they can do, then to what they have built or studied.
    for text in (
        skills_text,
        " ".join(flatten_to_strings(content.get("projects")))[:400],
        " ".join(flatten_to_strings(content.get("education")))[:400],
    ):
        if not text.strip():
            continue
        cid = classify_job(text)
        if cid != "other":
            return cid

    # Deliberately NOT the summary: it is prose, and a designer whose summary
    # mentions a restaurant project would come out a cook.
    return ""


def calculate_match_score(
    resume_skills: List[str],
    resume_experience: str,
    resume_keywords: List[str],
    job: Any,
    resume_category_id: str = "",
) -> Tuple[float, List[str], List[str], List[str]]:
    """
    Score a candidate against a job.

    Returns (score [0..100], matched_skills, missing_skills, human-readable reasons).

    Weights, and why:
    - 45  field of work. What someone is actually looking for is a KIND of job,
          and getting this wrong is the failure people notice.
    - 30  requirement coverage, counted over meaningful terms only.
    - 15  title overlap — the most direct evidence of all when it is there.
    - 10  experience level.

    The old split (60 coverage / 20 level / 15 title / 5 remote) rewarded vague
    postings: a service listing with three broad lines was trivially "covered"
    while a precise IT one never could be, so the ranking came out inverted.
    """
    score = 0.0
    reasons: List[str] = []

    resume_terms = meaningful_terms(list(resume_skills) + list(resume_keywords))
    job_requirements = [
        t for t in extract_job_requirement_terms(job.requirements) if " " not in t
    ]
    job_requirement_set = {t for t in job_requirements if is_meaningful(t)}

    skill_matches = sorted(
        req for req in job_requirement_set
        if any(terms_match(req, r) for r in resume_terms)
    )
    missing_skills = sorted(job_requirement_set - set(skill_matches))

    # ---- field of work (45) -------------------------------------------------
    job_category = getattr(job, "category", None) or ""
    if not job_category:
        from app.core.job_categories import classify_job

        job_category = classify_job(
            getattr(job, "title", "") or "",
            (getattr(job, "description", "") or "")[:200],
        )
    if resume_category_id and job_category and job_category != "other":
        if resume_category_id == job_category:
            score += 45
            reasons.append("Same field of work as your resume")
        else:
            reasons.append("A different field from your resume")
    else:
        # Nothing to compare on — don't reward or punish, just stay neutral.
        score += 20
        reasons.append("Field of work could not be compared")

    # ---- requirement coverage (30) -----------------------------------------
    if job_requirement_set:
        coverage = len(skill_matches) / len(job_requirement_set)
        score += coverage * 30
        reasons.append(
            f"Matched {len(skill_matches)}/{len(job_requirement_set)} stated requirements"
        )
    else:
        # Half credit rather than a flat bonus: an unstated requirement is not
        # evidence of fit, and roughly half of aggregated listings state none.
        score += 15
        reasons.append("This listing states no requirements")

    # ---- title overlap (15) -------------------------------------------------
    title_tokens = {t for t in tokenize_text(getattr(job, "title", "")) if is_meaningful(t)}
    keyword_tokens = meaningful_terms(list(resume_keywords))
    overlap = {t for t in title_tokens if any(terms_match(t, k) for k in keyword_tokens)}
    if overlap:
        score += 15
        reasons.append(f"Title matches your experience: {', '.join(sorted(overlap)[:3])}")

    # ---- experience level (10) ---------------------------------------------
    resume_level = EXPERIENCE_LEVELS.get(resume_experience, 1)
    job_level = EXPERIENCE_LEVELS.get(getattr(job, "experience_level", None), 2)
    diff = resume_level - job_level
    if diff == 0:
        score += 10
        reasons.append("Experience level matches")
    elif abs(diff) == 1:
        score += 6
        reasons.append("Experience level is close")
    elif diff > 1:
        score += 3
        reasons.append("You may be over-qualified")

    return min(round(score, 1), 100.0), skill_matches, missing_skills, reasons


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
        resume_category_id=resume_category(resume_content),
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
