"""
=============================================================================
AUTO-APPLY PREMIUM GATING AND QUOTA TESTS
=============================================================================

Focused tests for the auto-apply endpoint premium gate and monthly quota.
"""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import status

from app.core.security import create_access_token
from app.models import (
    Application,
    ApplicationStatus,
    Job,
    JobStatus,
    Resume,
    ResumeStatus,
    User,
    UserRole,
)


def _create_active_job(test_db, company_id, title: str) -> Job:
    """Create a minimal active job for auto-apply tests."""
    job = Job(
        id=uuid4(),
        company_id=company_id,
        title=title,
        description="Auto-apply quota test job",
        requirements=["Python", "FastAPI"],
        salary_min=100000,
        salary_max=200000,
        salary_currency="USD",
        is_salary_visible=True,
        location="Tashkent",
        is_remote_allowed=False,
        job_type="full_time",
        experience_level="mid",
        status=JobStatus.ACTIVE.value,
    )
    test_db.add(job)
    return job


def _create_student(test_db) -> tuple[User, dict]:
    """Create an active student user and auth headers."""
    user = User(
        id=uuid4(),
        email=f"student-{uuid4().hex[:8]}@example.com",
        full_name="Test Student",
        phone="+998901234567",
        role=UserRole.STUDENT,
        is_active_account=True,
        is_verified=True,
    )
    user.set_password("TestPassword123!")
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    token = create_access_token(
        subject=str(user.id),
        additional_claims={"role": user.role.value},
    )
    return user, {"Authorization": f"Bearer {token}"}


def _create_company(test_db) -> User:
    """Create an active company user for job seeding."""
    user = User(
        id=uuid4(),
        email=f"company-{uuid4().hex[:8]}@example.com",
        full_name="Test Company HR",
        phone="+998901234568",
        role=UserRole.COMPANY,
        company_name="Test Company",
        company_website="https://example.com",
        is_active_account=True,
        is_verified=True,
    )
    user.set_password("TestPassword123!")
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


def _create_published_resume(test_db, user: User) -> Resume:
    """Create a published resume for the test student."""
    resume = Resume(
        id=uuid4(),
        user_id=user.id,
        title="Test Resume",
        content={
            "skills": ["Python", "FastAPI", "PostgreSQL"],
            "work_experience": [
                {
                    "job_title": "Backend Developer",
                    "technologies_used": ["Python", "FastAPI"],
                }
            ],
        },
        status=ResumeStatus.PUBLISHED.value,
        ats_score=90,
    )
    test_db.add(resume)
    test_db.commit()
    test_db.refresh(resume)
    return resume


def _seed_auto_apply_usage(
    test_db,
    *,
    student_id,
    resume_id,
    company_id,
    count: int,
) -> None:
    """Seed historical auto-apply usage for the current month."""
    now = datetime.now(timezone.utc)
    for index in range(count):
        job = _create_active_job(test_db, company_id, f"Quota Job {index + 1}")
        application = Application(
            id=uuid4(),
            job_id=job.id,
            user_id=student_id,
            resume_id=resume_id,
            status=ApplicationStatus.PENDING.value,
            match_score="80%",
            applied_at=now,
        )
        test_db.add(application)

    test_db.commit()


def _activate_subscription(test_db, user, tier: str) -> None:
    """Mark the test user as an active subscriber."""
    user.subscription_tier = tier
    user.subscription_expires_at = None
    test_db.commit()
    test_db.refresh(user)


def _patch_active_subscription(monkeypatch) -> None:
    """Treat premium and enterprise tiers as active for these tests."""
    from app.core import premium as premium_module

    monkeypatch.setattr(
        premium_module,
        "is_subscription_active",
        lambda user: user.subscription_tier in ("premium", "enterprise"),
    )


def _auto_apply_payload(resume_id: str, max_applications: int = 3, dry_run: bool = False):
    return {
        "resume_id": str(resume_id),
        "criteria": {
            "max_applications": max_applications,
        },
        "dry_run": dry_run,
    }


class TestAutoApplyPremiumGateAndQuota:
    """Tests for premium gate and monthly quota enforcement."""

    def test_auto_apply_requires_active_premium_or_enterprise(
        self,
        client,
        test_db,
    ):
        """Free users should receive a 402 with a useful error envelope."""
        student, student_headers = _create_student(test_db)
        company = _create_company(test_db)
        resume = _create_published_resume(test_db, student)
        _create_active_job(test_db, company.id, "Premium Gate Job")
        test_db.commit()

        response = client.post(
            "/api/v1/applications/auto-apply",
            headers=student_headers,
            json=_auto_apply_payload(resume.id, dry_run=True),
        )

        assert response.status_code == status.HTTP_402_PAYMENT_REQUIRED
        data = response.json()
        assert data.get("success") is False
        assert isinstance(data.get("error"), dict)
        assert "premium subscription required" in str(data["error"].get("code", "")).lower()
        assert "active premium or enterprise subscription" in str(
            data["error"].get("message", "")
        ).lower()

    def test_auto_apply_premium_quota_blocks_additional_live_applications(
        self,
        client,
        test_db,
        monkeypatch,
    ):
        """Premium users should not exceed the monthly auto-apply quota."""
        _patch_active_subscription(monkeypatch)
        student, student_headers = _create_student(test_db)
        company = _create_company(test_db)
        resume = _create_published_resume(test_db, student)
        _activate_subscription(test_db, student, "premium")
        _seed_auto_apply_usage(
            test_db,
            student_id=student.id,
            resume_id=resume.id,
            company_id=company.id,
            count=50,
        )
        _create_active_job(test_db, company.id, "Extra Quota Job 1")
        _create_active_job(test_db, company.id, "Extra Quota Job 2")
        test_db.commit()

        response = client.post(
            "/api/v1/applications/auto-apply",
            headers=student_headers,
            json=_auto_apply_payload(resume.id, max_applications=2, dry_run=False),
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]

        assert data["applications_submitted"] == 0
        assert data["applications_skipped"] >= 1
        assert data["monthly_limit"] == 50
        assert data["monthly_used"] == 50
        assert data["monthly_remaining"] == 0
        assert all(not result["applied"] for result in data["results"])
        assert any("quota" in result["message"].lower() for result in data["results"])

        total_auto_applies = (
            test_db.query(Application)
            .filter(
                Application.user_id == student.id,
                Application.match_score.isnot(None),
            )
            .count()
        )
        assert total_auto_applies == 50

    def test_auto_apply_dry_run_does_not_consume_quota(
        self,
        client,
        test_db,
        monkeypatch,
    ):
        """Dry-run requests should preview jobs without consuming quota."""
        _patch_active_subscription(monkeypatch)
        student, student_headers = _create_student(test_db)
        company = _create_company(test_db)
        resume = _create_published_resume(test_db, student)
        _activate_subscription(test_db, student, "premium")
        _seed_auto_apply_usage(
            test_db,
            student_id=student.id,
            resume_id=resume.id,
            company_id=company.id,
            count=50,
        )
        _create_active_job(test_db, company.id, "Dry Run Job")
        test_db.commit()

        response = client.post(
            "/api/v1/applications/auto-apply",
            headers=student_headers,
            json=_auto_apply_payload(resume.id, max_applications=1, dry_run=True),
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]

        assert data["dry_run"] is True
        assert data["applications_submitted"] == 0
        assert data["monthly_limit"] == 50
        assert data["monthly_used"] == 50
        assert data["monthly_remaining"] == 0
        assert all(result["message"] == "Dry run - not applied" for result in data["results"])

        total_auto_applies = (
            test_db.query(Application)
            .filter(
                Application.user_id == student.id,
                Application.match_score.isnot(None),
            )
            .count()
        )
        assert total_auto_applies == 50

    def test_auto_apply_enterprise_is_unlimited(
        self,
        client,
        test_db,
        monkeypatch,
    ):
        """Enterprise users should bypass the monthly auto-apply quota."""
        _patch_active_subscription(monkeypatch)
        student, student_headers = _create_student(test_db)
        company = _create_company(test_db)
        resume = _create_published_resume(test_db, student)
        _activate_subscription(test_db, student, "enterprise")
        _seed_auto_apply_usage(
            test_db,
            student_id=student.id,
            resume_id=resume.id,
            company_id=company.id,
            count=55,
        )
        _create_active_job(test_db, company.id, "Enterprise Job")
        test_db.commit()

        response = client.post(
            "/api/v1/applications/auto-apply",
            headers=student_headers,
            json=_auto_apply_payload(resume.id, max_applications=1, dry_run=False),
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]

        assert data["applications_submitted"] == 1
        assert data["monthly_limit"] is None
        assert data["monthly_used"] == 56
        assert data["monthly_remaining"] is None
        assert data["results"][0]["applied"] is True

        total_auto_applies = (
            test_db.query(Application)
            .filter(
                Application.user_id == student.id,
                Application.match_score.isnot(None),
            )
            .count()
        )
        assert total_auto_applies == 56
