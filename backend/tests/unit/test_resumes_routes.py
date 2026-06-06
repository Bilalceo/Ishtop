"""
=============================================================================
RESUME ROUTE UNIT TESTS
=============================================================================

Focused tests for resume route helper logic and the small behavior changes in
the AI generation, PDF download, and analytics flows.
"""

import asyncio
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.api.v1.routes.resumes import (
    AIResumeGenerateRequest,
    ResumeTemplate,
    _extract_resume_keywords,
    _generate_pdf,
    download_resume_pdf,
    generate_ai_resume,
    get_resume_analytics,
)
from app.models import ApplicationStatus, Resume


class QueryStub:
    """Minimal SQLAlchemy-like query stub for route tests."""

    def __init__(self, *, first_result=None, all_result=None):
        self._first_result = first_result
        self._all_result = all_result or []

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def first(self):
        return self._first_result

    def all(self):
        return self._all_result


class AnalyticsDBStub:
    """Database stub that can serve resume and application queries."""

    def __init__(self, resume, applications, last_application):
        self._resume = resume
        self._applications = applications
        self._last_application = last_application
        self.committed = False

    def query(self, model):
        if model is Resume:
            return QueryStub(first_result=self._resume)
        return QueryStub(first_result=self._last_application, all_result=self._applications)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        return None


class PdfDBStub:
    """Database stub for the PDF download route."""

    def __init__(self, resume):
        self._resume = resume
        self.committed = False

    def query(self, model):
        return QueryStub(first_result=self._resume)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        return None


def test_generate_ai_resume_generates_cover_letter():
    """The AI generation flow should call the real cover-letter service."""
    generated_content = {
        "personal_info": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+998901234567",
        },
        "professional_summary": {
            "text": "Backend engineer focused on Python APIs.",
            "keywords": ["Python", "FastAPI"],
        },
        "work_experience": [
            {
                "job_title": "Backend Developer",
                "company_name": "Acme",
                "start_date": "2022-01",
                "end_date": "Present",
                "technologies_used": ["Python", "FastAPI"],
            }
        ],
        "education": [
            {
                "degree_type": "Bachelor's",
                "field_of_study": "Computer Science",
                "institution_name": "MIT",
            }
        ],
        "skills": {
            "technical_skills": [{"category": "Languages", "skills": ["Python", "SQL"]}],
            "soft_skills": ["Communication"],
        },
    }

    stub_service = MagicMock()
    stub_service.generate_resume = AsyncMock(return_value=generated_content)
    stub_service.generate_cover_letter = AsyncMock(return_value="Generated cover letter")
    stub_service.get_usage_summary.return_value = {"total_tokens": 42}

    request = AIResumeGenerateRequest(
        user_data={
            "experience": [{"position": "Backend Developer"}],
            "skills": ["Python", "FastAPI"],
            "education": [{"degree": "Bachelor's", "field": "Computer Science"}],
            "projects": [],
            "certifications": [],
        },
        template=ResumeTemplate.MODERN,
        target_job_title="Senior Backend Engineer",
        target_company="Acme",
        job_description="Build APIs and services.",
        include_cover_letter=True,
    )
    current_user = SimpleNamespace(id=uuid4())
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()

    def refresh_resume(resume):
        if getattr(resume, "view_count", None) is None:
            resume.view_count = 0
        if getattr(resume, "created_at", None) is None:
            resume.created_at = datetime.now(timezone.utc)
        if getattr(resume, "updated_at", None) is None:
            resume.updated_at = resume.created_at

    db.refresh = MagicMock(side_effect=refresh_resume)

    with patch("app.services.ai_service.AIService", return_value=stub_service):
        response = asyncio.run(generate_ai_resume(request=request, current_user=current_user, db=db))

    assert response.success is True
    assert response.cover_letter == "Generated cover letter"
    assert response.pdf_url == f"/api/v1/resumes/{response.resume.id}/pdf"
    assert stub_service.generate_cover_letter.await_count == 1

    call_kwargs = stub_service.generate_cover_letter.call_args.kwargs
    assert "Backend engineer focused on Python APIs." in call_kwargs["resume_text"]
    assert call_kwargs["company_name"] == "Acme"
    assert call_kwargs["tone"] == "professional"


def test_extract_resume_keywords_deduplicates_across_sections():
    """ATS keyword extraction should count unique, normalized terms."""
    content = {
        "professional_summary": {"keywords": ["Python", "FastAPI"]},
        "skills": {
            "technical": ["Python", "Docker"],
            "soft": ["Communication"],
        },
        "experience": [
            {
                "position": "Backend Developer",
                "company": "Acme",
                "technologies_used": ["AWS"],
            }
        ],
    }

    keywords = _extract_resume_keywords(content)

    assert keywords == [
        "python",
        "fastapi",
        "docker",
        "communication",
        "backend developer",
        "acme",
        "aws",
    ]


def test_generate_pdf_returns_real_pdf_bytes():
    """The PDF helper should emit a real PDF payload, not a placeholder URL."""
    resume = SimpleNamespace(
        id=uuid4(),
        title="Senior Backend Engineer",
        status="draft",
        content={
            "personal_info": {"name": "John Doe", "email": "john@example.com"},
            "summary": "Experienced backend engineer.",
        },
    )

    pdf_bytes = _generate_pdf(resume)

    assert pdf_bytes.startswith(b"%PDF")
    assert b"Senior Backend Engineer" in pdf_bytes


def test_resolve_pdf_fonts_prefers_bundled_unicode_font():
    """A bundled DejaVu font ships in-repo, so we must never silently fall back
    to Latin-only Helvetica (which would break Cyrillic / Uzbek output)."""
    from app.api.v1.routes import resumes as resumes_module

    # Reset the process-wide cache so the resolver actually probes the fonts.
    resumes_module._UNICODE_FONTS_RESOLVED = None
    regular, bold = resumes_module._resolve_pdf_fonts()

    assert regular == "IshTop-Regular"
    assert bold == "IshTop-Bold"
    assert "Helvetica" not in (regular, bold)


def test_generate_pdf_renders_cyrillic_and_uzbek_unicode():
    """Russian Cyrillic and Uzbek special letters must embed a Unicode font
    (DejaVu) rather than the Latin-only built-in Helvetica."""
    resume = SimpleNamespace(
        id=uuid4(),
        title="Rezyume",
        status="draft",
        content={
            "_metadata": {"language": "ru"},
            "personal_info": {
                "name": "Жасур Каримов",
                "professional_title": "Дизайнер",
                "email": "jasur@example.com",
                "location": "Toshkent, Oʻzbekiston",
            },
            "summary": "Тажрибали дизайнер. Oʻzbek tili: oʻqish, gʻalaba, shahar, choy.",
            "skills": {"technical": ["Photoshop", "Дизайн"], "soft": ["Jamoaviy ish"]},
        },
    )

    pdf_bytes = _generate_pdf(resume)

    assert pdf_bytes.startswith(b"%PDF")
    # ReportLab embeds (a subset of) the DejaVu font when Unicode text is used;
    # its presence proves we did not degrade to Latin-only Helvetica.
    assert b"DejaVu" in pdf_bytes
    # Sanity: this is the real ReportLab document, not the tiny text fallback.
    assert len(pdf_bytes) > 2000


def test_sanitize_skill_verifications_filters_invalid_entries():
    from app.api.v1.routes.resumes import _sanitize_skill_verifications

    cleaned = _sanitize_skill_verifications(
        {
            "Python": "verified",
            "Excel": "learning",
            "CRM": "unverified",
            "Bogus": "totally-wrong-status",  # dropped: unknown status
            "  ": "verified",                  # dropped: blank skill
            "React": 123,                       # dropped: non-string status
        }
    )

    assert cleaned == {"Python": "verified", "Excel": "learning", "CRM": "unverified"}
    # Non-dict input is tolerated (old resumes / bad payloads).
    assert _sanitize_skill_verifications(None) == {}
    assert _sanitize_skill_verifications("nope") == {}


def test_generate_pdf_renders_with_skill_verifications():
    """A resume carrying skillVerifications must still produce a valid PDF
    (the verified/learning rows are rendered with the Unicode font)."""
    resume = SimpleNamespace(
        id=uuid4(),
        title="Rezyume",
        status="draft",
        content={
            "_metadata": {"language": "uz"},
            "personal_info": {"name": "Aziz Karimov", "email": "aziz@example.com"},
            "skills": {"technical": ["Python", "Excel", "CRM"], "soft": []},
            "skillVerifications": {
                "Python": "verified",
                "Excel": "learning",
                "CRM": "unverified",
            },
        },
    )

    pdf_bytes = _generate_pdf(resume)

    assert pdf_bytes.startswith(b"%PDF")
    assert b"DejaVu" in pdf_bytes
    assert len(pdf_bytes) > 2000


def test_download_resume_pdf_points_to_real_endpoint():
    """The download response should point to the real streaming PDF endpoint."""
    resume = SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        title="Senior Backend Engineer",
        content={"personal_info": {"name": "John Doe"}},
        status="draft",
        pdf_url=None,
        is_deleted=False,
    )
    db = PdfDBStub(resume)
    current_user = SimpleNamespace(id=resume.user_id)

    response = asyncio.run(
        download_resume_pdf(
            resume_id=resume.id,
            current_user=current_user,
            db=db,
        )
    )

    assert response.success is True
    assert response.pdf_url == f"/api/v1/resumes/{resume.id}/pdf"
    assert resume.pdf_url == response.pdf_url
    assert db.committed is True


def test_resume_analytics_includes_keyword_count():
    """Analytics should populate ats_keywords_matched instead of returning None."""
    resume = SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        title="Senior Backend Engineer",
        content={
            "professional_summary": {"keywords": ["Python", "FastAPI"]},
            "skills": {
                "technical": ["Python", "Docker"],
                "soft": ["Communication"],
            },
            "experience": [
                {
                    "position": "Backend Developer",
                    "company": "Acme",
                    "technologies_used": ["AWS"],
                }
            ],
        },
        status="published",
        view_count=20,
        ats_score=88,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
        is_deleted=False,
    )
    applications = [
        SimpleNamespace(
            status=ApplicationStatus.PENDING.value,
            applied_at=datetime(2026, 1, 3, tzinfo=timezone.utc),
            is_deleted=False,
        ),
        SimpleNamespace(
            status=ApplicationStatus.INTERVIEW.value,
            applied_at=datetime(2026, 1, 4, tzinfo=timezone.utc),
            is_deleted=False,
        ),
        SimpleNamespace(
            status=ApplicationStatus.ACCEPTED.value,
            applied_at=datetime(2026, 1, 5, tzinfo=timezone.utc),
            is_deleted=False,
        ),
        SimpleNamespace(
            status=ApplicationStatus.REJECTED.value,
            applied_at=datetime(2026, 1, 6, tzinfo=timezone.utc),
            is_deleted=False,
        ),
    ]
    db = AnalyticsDBStub(resume, applications, applications[-1])
    current_user = SimpleNamespace(id=resume.user_id)

    response = asyncio.run(
        get_resume_analytics(
            resume_id=resume.id,
            current_user=current_user,
            db=db,
        )
    )

    assert response.ats_keywords_matched == 7
    assert response.total_applications == 4
    assert response.pending_applications == 1
    assert response.interview_applications == 1
    assert response.accepted_applications == 1
    assert response.rejected_applications == 1
    assert response.interview_rate == 50.0
    assert response.success_rate == 25.0
    assert response.last_used_in_application == applications[-1].applied_at
