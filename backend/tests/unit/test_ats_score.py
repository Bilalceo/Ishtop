"""The ATS score must read the resume shape production actually stores.

Every resume in the database scored exactly 50 out of 100 — verified against
prod on 2026-09-16 — because _calculate_ats_score looked for
"professional_summary" and "work_experience" while AI-generated resumes are
stored with "summary" and "experience". The score was a constant wearing the
clothes of a judgement, and the suggestions told students with a perfectly good
summary to write a summary.

See memory: the real JSONB shape is summary / experience[].position /
skills.technical.
"""

import pytest

from app.api.v1.routes.resumes import (
    _ats_breakdown,
    _calculate_ats_score,
    _get_ats_suggestions,
)

# The exact shape of a production resume, as returned by the database.
PROD = {
    "summary": "Backend developer focused on Python APIs.",
    "experience": [
        {
            "position": "Backend Developer",
            "company": "Acme",
            "achievements": ["Cut response time by 40%"],
        }
    ],
    "education": {"degree": "BSc", "institution": "TATU"},
    "skills": {"technical": ["Python", "FastAPI"], "soft": ["Communication"]},
    "personal_info": {"email": "a@b.c", "phone": "+998901234567"},
    "languages": [],
    "certifications": [],
    "projects": [],
}

# The same resume expressed in the Pydantic schema's names.
SCHEMA = {
    "professional_summary": {"text": "Backend developer focused on Python APIs."},
    "work_experience": [{"job_title": "Backend Developer", "achievements": ["x"]}],
    "education": {"degree_type": "BSc"},
    "technical_skills": [{"category": "Languages", "skills": ["Python"]}],
    "personal_info": {"email": "a@b.c", "phone": "+998901234567"},
}


def test_a_complete_production_resume_scores_full_marks():
    assert _calculate_ats_score(PROD) == 100


def test_both_stored_shapes_score_the_same():
    assert _calculate_ats_score(PROD) == _calculate_ats_score(SCHEMA)


def test_an_empty_resume_scores_nothing():
    assert _calculate_ats_score({}) == 0


def test_the_score_is_not_a_constant():
    """The bug's signature: different resumes, identical score."""
    scores = {
        _calculate_ats_score({}),
        _calculate_ats_score({"summary": "x"}),
        _calculate_ats_score({**PROD, "summary": None}),
        _calculate_ats_score(PROD),
    }
    assert len(scores) == 4


def test_the_summary_and_experience_are_actually_worth_their_points():
    """These three were the points every production resume silently lost."""
    assert _calculate_ats_score(PROD) - _calculate_ats_score({**PROD, "summary": None}) == 20
    assert _calculate_ats_score(PROD) - _calculate_ats_score({**PROD, "experience": []}) == 30


def test_the_breakdown_sums_to_the_score():
    breakdown = _ats_breakdown(PROD)
    assert sum(i["points"] for i in breakdown if i["earned"]) == _calculate_ats_score(PROD)
    assert sum(i["points"] for i in breakdown) == 100


def test_every_component_can_be_shown_to_the_user():
    for item in _ats_breakdown(PROD):
        assert item["label_uz"] and item["label_ru"]
        assert item["fix_uz"] and item["fix_ru"]
        assert isinstance(item["earned"], bool)


def test_suggestions_never_ask_for_something_already_there():
    assert _get_ats_suggestions(PROD, None) == []
    partial = {**PROD, "summary": None, "skills": None}
    fixes = _get_ats_suggestions(partial, None)
    assert len(fixes) == 2
    assert not any("tajriba" in f.lower() for f in fixes)


def test_suggestions_lead_with_the_most_valuable_fix():
    thin = {"personal_info": {"email": "a@b.c", "phone": "1"}}
    fixes = _get_ats_suggestions(thin, None)
    assert len(fixes) == 3
    # 20-point items come before the 10-point one.
    assert "raqam bilan" not in fixes[0]


@pytest.mark.parametrize("value", [None, {}, {"experience": "not a list"}])
def test_malformed_content_does_not_raise(value):
    assert 0 <= _calculate_ats_score(value or {}) <= 100


# =============================================================================
# EXPERIENCE CONFLICTS
# =============================================================================

from app.api.v1.routes.resumes import _experience_conflict  # noqa: E402


def test_an_overstated_summary_is_flagged():
    w = _experience_conflict(
        {"summary": "8 yil tajribaga ega", "experience": [{"start_date": "09/2021"}]}
    )
    assert w and w["overstated"] is True
    assert w["claimed_years"] == 8
    assert w["earliest_year"] == 2021


def test_an_understated_summary_is_flagged_too():
    w = _experience_conflict(
        {"summary": "2 yil tajriba", "experience": [{"start_date": "05/2022"}]}
    )
    assert w and w["overstated"] is False


def test_a_year_of_slack_is_allowed():
    """A resume written mid-year rounds either way; that is not a conflict."""
    assert _experience_conflict(
        {"summary": "4 yil tajriba", "experience": [{"start_date": "01/2022"}]}
    ) is None


def test_no_claim_means_nothing_to_contradict():
    assert _experience_conflict(
        {"summary": "Tajribali mutaxassis", "experience": [{"start_date": "01/2019"}]}
    ) is None


def test_no_dates_means_we_cannot_judge():
    assert _experience_conflict({"summary": "10 yil tajriba", "experience": []}) is None


def test_the_schema_shape_is_understood_as_well():
    w = _experience_conflict(
        {
            "professional_summary": {"text": "9 лет опыта"},
            "work_experience": [{"start_date": "2023-01-01"}],
        }
    )
    assert w and w["claimed_years"] == 9


def test_the_earliest_entry_decides():
    w = _experience_conflict(
        {
            "summary": "2 yil tajriba",
            "experience": [{"start_date": "01/2024"}, {"start_date": "06/2019"}],
        }
    )
    assert w["earliest_year"] == 2019
