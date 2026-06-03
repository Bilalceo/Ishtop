"""
=============================================================================
APPLICATION INTERVIEW SCHEDULER TESTS
=============================================================================

Focused tests for interview scheduling side effects on application status
updates.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import status

from app.api.v1.routes import applications as applications_route
from app.core.security import create_access_token
from app.models import Application, ApplicationStatus, Job, JobStatus, Resume, ResumeStatus, User, UserRole


def _create_user(test_db, *, role: UserRole, full_name: str, email: str, company_name: str | None = None):
    """Create an active verified user and return auth headers."""
    user = User(
        id=uuid4(),
        email=email,
        full_name=full_name,
        phone="+998901234567" if role == UserRole.STUDENT else "+998901234568",
        role=role,
        company_name=company_name,
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


def _create_job(test_db, company: User) -> Job:
    job = Job(
        id=uuid4(),
        company_id=company.id,
        title="Backend Developer",
        description="Backend role for interview scheduling test",
        requirements=["Python", "FastAPI"],
        salary_min=1000000,
        salary_max=2000000,
        salary_currency="USD",
        is_salary_visible=True,
        location="Tashkent",
        is_remote_allowed=False,
        job_type="full_time",
        experience_level="mid",
        status=JobStatus.ACTIVE.value,
    )
    test_db.add(job)
    test_db.commit()
    test_db.refresh(job)
    return job


def _create_resume(test_db, student: User) -> Resume:
    resume = Resume(
        id=uuid4(),
        user_id=student.id,
        title="Backend Resume",
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
        ats_score=88,
    )
    test_db.add(resume)
    test_db.commit()
    test_db.refresh(resume)
    return resume


def _create_application(test_db, student: User, job: Job, resume: Resume) -> Application:
    application = Application(
        id=uuid4(),
        job_id=job.id,
        user_id=student.id,
        resume_id=resume.id,
        status=ApplicationStatus.PENDING.value,
        cover_letter="Test cover letter",
    )
    test_db.add(application)
    test_db.commit()
    test_db.refresh(application)
    return application


def _interview_payload(
    interview_at: datetime,
    *,
    interview_type: str | None = None,
    meeting_link: str | None = None,
) -> dict:
    return {
        "status": "interview",
        "notes": "Schedule technical interview",
        "interview_at": interview_at.isoformat(),
        **({"interview_type": interview_type} if interview_type is not None else {}),
        **({"meeting_link": meeting_link} if meeting_link is not None else {}),
    }


def _get_response_data(response):
    body = response.json()
    assert body["success"] is True
    assert "data" in body
    return body["data"]


class TestInterviewSchedulerAutomation:
    """Tests for interview email automation on status update."""

    def test_interview_status_triggers_email_and_persists_metadata(
        self,
        client,
        test_db,
        monkeypatch,
    ):
        """Scheduling an interview should trigger the email and persist metadata."""
        student, _ = _create_user(
            test_db,
            role=UserRole.STUDENT,
            full_name="Test Student",
            email="student@example.com",
        )
        company, company_headers = _create_user(
            test_db,
            role=UserRole.COMPANY,
            full_name="Test Company HR",
            email="hr@example.com",
            company_name="Test Company",
        )
        job = _create_job(test_db, company)
        resume = _create_resume(test_db, student)
        application = _create_application(test_db, student, job, resume)

        send_email = AsyncMock(return_value=True)
        monkeypatch.setattr(
            applications_route.email_service,
            "send_interview_scheduled_email",
            send_email,
        )

        interview_at = datetime(2026, 1, 15, 10, 30, tzinfo=timezone.utc)
        meeting_link = "https://meet.google.com/abc-defg-hij"
        response = client.put(
            f"/api/v1/applications/{application.id}/status",
            headers=company_headers,
            json=_interview_payload(
                interview_at,
                interview_type="video",
                meeting_link=meeting_link,
            ),
        )

        assert response.status_code == status.HTTP_200_OK
        data = _get_response_data(response)
        assert data["status"] == "interview"
        assert data["interview_at"].startswith("2026-01-15T10:30:00")
        assert data["interview_type"] == "video"
        assert data["meeting_link"] == meeting_link

        refreshed = test_db.query(Application).filter(Application.id == application.id).first()
        assert refreshed is not None
        assert refreshed.status == ApplicationStatus.INTERVIEW.value
        assert refreshed.interview_at is not None
        assert refreshed.interview_at.isoformat().startswith("2026-01-15T10:30:00")
        assert refreshed.interview_type == "video"
        assert refreshed.meeting_link == meeting_link

        send_email.assert_awaited_once()
        kwargs = send_email.await_args.kwargs
        assert kwargs["to_email"] == student.email
        assert kwargs["user_name"] == student.full_name
        assert kwargs["job_title"] == job.title
        assert kwargs["company_name"] == company.company_name
        assert kwargs["interview_date"] == "2026-01-15"
        assert kwargs["interview_time"] == "10:30"
        assert kwargs["interview_type"] == "video"
        assert kwargs["meeting_link"] == meeting_link

    def test_interview_status_defaults_video_when_meeting_link_present(
        self,
        client,
        test_db,
        monkeypatch,
    ):
        """Meeting links should infer a video interview type when none is provided."""
        student, _ = _create_user(
            test_db,
            role=UserRole.STUDENT,
            full_name="Test Student",
            email="student@example.com",
        )
        company, company_headers = _create_user(
            test_db,
            role=UserRole.COMPANY,
            full_name="Test Company HR",
            email="hr@example.com",
            company_name="Test Company",
        )
        job = _create_job(test_db, company)
        resume = _create_resume(test_db, student)
        application = _create_application(test_db, student, job, resume)

        send_email = AsyncMock(return_value=True)
        monkeypatch.setattr(
            applications_route.email_service,
            "send_interview_scheduled_email",
            send_email,
        )

        interview_at = datetime(2026, 1, 16, 11, 0, tzinfo=timezone.utc)
        meeting_link = "https://zoom.us/j/123456789"
        response = client.put(
            f"/api/v1/applications/{application.id}/status",
            headers=company_headers,
            json=_interview_payload(
                interview_at,
                meeting_link=meeting_link,
            ),
        )

        assert response.status_code == status.HTTP_200_OK
        data = _get_response_data(response)
        assert data["interview_type"] == "video"
        assert data["meeting_link"] == meeting_link

        refreshed = test_db.query(Application).filter(Application.id == application.id).first()
        assert refreshed is not None
        assert refreshed.interview_type == "video"
        assert refreshed.meeting_link == meeting_link

        kwargs = send_email.await_args.kwargs
        assert kwargs["interview_type"] == "video"
        assert kwargs["meeting_link"] == meeting_link

    def test_interview_email_failure_does_not_break_response(
        self,
        client,
        test_db,
        monkeypatch,
    ):
        """Email failures must not block a successful status update."""
        student, _ = _create_user(
            test_db,
            role=UserRole.STUDENT,
            full_name="Test Student",
            email="student@example.com",
        )
        company, company_headers = _create_user(
            test_db,
            role=UserRole.COMPANY,
            full_name="Test Company HR",
            email="hr@example.com",
            company_name="Test Company",
        )
        job = _create_job(test_db, company)
        resume = _create_resume(test_db, student)
        application = _create_application(test_db, student, job, resume)

        async def _fail(*args, **kwargs):
            raise RuntimeError("SMTP unavailable")

        monkeypatch.setattr(
            applications_route.email_service,
            "send_interview_scheduled_email",
            _fail,
        )

        interview_at = datetime(2026, 1, 15, 11, 0, tzinfo=timezone.utc)
        response = client.put(
            f"/api/v1/applications/{application.id}/status",
            headers=company_headers,
            json=_interview_payload(
                interview_at,
                interview_type="phone",
                meeting_link=None,
            ),
        )

        assert response.status_code == status.HTTP_200_OK
        data = _get_response_data(response)
        assert data["status"] == "interview"
        assert data["interview_at"].startswith("2026-01-15T11:00:00")
        assert data["interview_type"] == "phone"
        assert data["meeting_link"] is None

        refreshed = test_db.query(Application).filter(Application.id == application.id).first()
        assert refreshed is not None
        assert refreshed.status == ApplicationStatus.INTERVIEW.value
        assert refreshed.interview_at is not None
        assert refreshed.interview_type == "phone"
        assert refreshed.meeting_link is None
