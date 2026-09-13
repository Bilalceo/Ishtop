"""Does resume-based matching rank the right jobs first?

It did not. On real production data a graphic designer's best match came back as
a waiting job at 85%, and a backend role at 5%; an AI engineer's top result was
also a waiting job. Three things caused it and each is asserted here:

  * substring matching, so the two-letter fragment "bo" (from splitting Uzbek
    words at their apostrophe) matched almost every requirement;
  * no stopwords, so "va", "mas'uliyatlilik", "muloqot" — words in most service
    postings — counted as skills;
  * coverage as the dominant signal, which rewards a vague posting with three
    broad lines and punishes a precise one with ten.

The fix makes the FIELD OF WORK the dominant signal, so these are ordering
assertions, not score assertions: the exact numbers may move, the ranking must
not.
"""
from __future__ import annotations

import types

import pytest

pytest.importorskip("sqlalchemy")

from app.services import job_matching as jm  # noqa: E402


def job(title, requirements=None, level="junior", category=None, description=""):
    return types.SimpleNamespace(
        title=title,
        description=description,
        requirements=requirements or [],
        experience_level=level,
        category=category,
        is_remote_allowed=False,
        job_type="full_time",
    )


DESIGNER = {
    "personal_info": {"name": "Test Testov"},
    "summary": "Grafik dizayner, brending va chop etish bo'yicha ish qidiryapman.",
    "skills": {"technical": ["Adobe Photoshop", "Adobe Illustrator", "CorelDRAW",
                             "3D modellashtirish", "AutoCAD"]},
    "experience": [{"position": "Grafik dizayner", "company": "Studio"}],
}

DEVELOPER = {
    "personal_info": {"name": "Test Testov"},
    "summary": "Backend dasturchi.",
    "skills": {"technical": ["Python", "Django", "PostgreSQL", "Docker"]},
    "experience": [{"position": "Backend dasturchi", "company": "IT firma"}],
}

WAITER_JOB = job(
    "Ofitsiant",
    ["Mas'uliyatlilik", "Halollik", "Muloqot", "Chaqqonlik"],
    category="food",
)
DESIGNER_JOB = job(
    "Grafik dizayner",
    ["Adobe Photoshop", "Illustrator", "Brending"],
    category="marketing",
)
BACKEND_JOB = job(
    "Backend dasturchi",
    ["Python", "Django", "PostgreSQL"],
    category="it",
)


def score(resume, j):
    return jm.calculate_match_score(
        resume_skills=jm.extract_skills_from_resume(resume),
        resume_experience=jm.extract_experience_level(resume),
        resume_keywords=jm.extract_keywords(resume),
        job=j,
        resume_category_id=jm.resume_category(resume),
    )[0]


class TestFieldOfWorkWins:
    def test_a_designer_ranks_design_above_waiting(self):
        assert score(DESIGNER, DESIGNER_JOB) > score(DESIGNER, WAITER_JOB)

    def test_a_developer_ranks_development_above_waiting(self):
        assert score(DEVELOPER, BACKEND_JOB) > score(DEVELOPER, WAITER_JOB)

    def test_a_designer_is_not_told_a_waiting_job_is_a_strong_match(self):
        # It was 85%.
        assert score(DESIGNER, WAITER_JOB) < 50

    def test_the_two_resumes_do_not_rank_the_same_job_alike(self):
        assert score(DESIGNER, DESIGNER_JOB) > score(DEVELOPER, DESIGNER_JOB)
        assert score(DEVELOPER, BACKEND_JOB) > score(DESIGNER, BACKEND_JOB)


class TestResumeCategory:
    def test_reads_the_stated_position(self):
        assert jm.resume_category(DESIGNER) == "marketing"
        assert jm.resume_category(DEVELOPER) == "it"

    def test_falls_back_to_skills_when_there_is_no_experience(self):
        # A student's first resume has an empty experience list — and that is
        # exactly the person this feature exists for.
        fresher = {"skills": {"technical": ["Adobe Photoshop", "Illustrator"]},
                   "experience": []}
        assert jm.resume_category(fresher) == "marketing"

    def test_says_nothing_rather_than_guessing(self):
        assert jm.resume_category({}) == ""
        assert jm.resume_category({"summary": "Ishga tayyorman"}) == ""


class TestTermQuality:
    def test_stopwords_are_not_skills(self):
        for word in ["va", "bilan", "uchun", "mas'uliyatlilik", "muloqot", "и", "the"]:
            assert not jm.is_meaningful(word), word

    def test_dates_and_years_are_not_skills(self):
        for token in ["2024", "07/2025", "10-2026"]:
            assert not jm.is_meaningful(token), token

    def test_real_short_names_survive(self):
        for token in ["1c", "qa", "hr", "sql", "php"]:
            assert jm.is_meaningful(token), token

    def test_apostrophes_do_not_split_uzbek_words(self):
        # "bo'lim" used to become "bo" + "lim", and "bo" then matched everything.
        assert "bo'lim" in jm.tokenize_text("bo'lim boshlig'i")
        assert "bo" not in jm.tokenize_text("bo'lim")

    def test_stem_matching_is_not_substring_matching(self):
        assert jm.terms_match("sotuv", "sotuvchi")     # agglutination, real
        assert jm.terms_match("dizayn", "dizayner")
        assert not jm.terms_match("bo", "boshqaruv")   # the old failure mode
        assert not jm.terms_match("ma", "marketing")


class TestNoRequirements:
    def test_an_unstated_requirement_is_not_evidence_of_fit(self):
        """Roughly half of aggregated listings state no requirements at all."""
        bare = job("Grafik dizayner", [], category="marketing")
        full = job("Grafik dizayner", ["Adobe Photoshop", "Illustrator"],
                   category="marketing")
        assert score(DESIGNER, full) > score(DESIGNER, bare)
