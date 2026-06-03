"""
=============================================================================
APPLICATION API INTEGRATION TESTS
=============================================================================

Test cases for job application API endpoints.
"""

import pytest
from fastapi import status
from httpx import AsyncClient

from tests.fixtures.sample_data import get_valid_application_data


def as_str(value):
    return str(value)


def response_data(response):
    body = response.json()
    return body.get("data", body)


# =============================================================================
# GET APPLICATIONS TESTS
# =============================================================================

class TestGetApplications:
    """Tests for getting user applications."""

    @pytest.mark.asyncio
    async def test_get_my_applications(
        self, async_client: AsyncClient, auth_headers, test_application
    ):
        """Test getting user's own applications."""
        response = await async_client.get(
            "/api/v1/applications/my-applications",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response_data(response)

        assert "applications" in data
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_applications_unauthenticated(self, async_client: AsyncClient):
        """Test getting applications without authentication."""
        response = await async_client.get("/api/v1/applications/my-applications")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_get_applications_with_pagination(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test getting applications with pagination."""
        response = await async_client.get(
            "/api/v1/applications/my-applications",
            headers=auth_headers,
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_get_applications_filter_by_status(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test filtering applications by status."""
        statuses = ["pending", "reviewing", "interview", "accepted", "rejected"]
        
        for app_status in statuses:
            response = await async_client.get(
                "/api/v1/applications/my-applications",
                headers=auth_headers,
                params={"status": app_status}
            )
            
            assert response.status_code == status.HTTP_200_OK


# =============================================================================
# GET SINGLE APPLICATION TESTS
# =============================================================================

class TestGetApplication:
    """Tests for getting single application."""

    @pytest.mark.asyncio
    async def test_get_application_success(
        self, async_client: AsyncClient, auth_headers, test_application
    ):
        """Test getting a single application."""
        response = await async_client.get(
            f"/api/v1/applications/{test_application.id}",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response_data(response)

        assert data["id"] == as_str(test_application.id)
        assert "status" in data
        assert "job_id" in data

    @pytest.mark.asyncio
    async def test_get_application_not_found(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test getting non-existent application."""
        response = await async_client.get(
            "/api/v1/applications/non-existent-id",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_get_application_not_owner(
        self, async_client: AsyncClient, test_application
    ):
        """Test getting application by different user."""
        from app.core.security import create_access_token
        other_user_token = create_access_token(data={"sub": "different-user-id"})
        other_headers = {"Authorization": f"Bearer {other_user_token}"}
        
        response = await async_client.get(
            f"/api/v1/applications/{test_application.id}",
            headers=other_headers
        )
        
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND
        ]


# =============================================================================
# CREATE APPLICATION TESTS
# =============================================================================

class TestCreateApplication:
    """Tests for creating job applications."""

    @pytest.mark.asyncio
    async def test_apply_success(
        self, async_client: AsyncClient, auth_headers, test_job, test_resume
    ):
        """Test successful job application."""
        application_data = {
            "job_id": as_str(test_job.id),
            "resume_id": as_str(test_resume.id),
            "cover_letter": "I am excited to apply for this position..."
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=auth_headers,
            json=application_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response_data(response)

        assert "id" in data
        assert data["job_id"] == as_str(test_job.id)
        assert data["resume_id"] == as_str(test_resume.id)
        assert data["status"] == "pending"

    @pytest.mark.asyncio
    async def test_apply_without_cover_letter(
        self, async_client: AsyncClient, auth_headers, test_job, test_resume
    ):
        """Test application without cover letter."""
        application_data = {
            "job_id": as_str(test_job.id),
            "resume_id": as_str(test_resume.id)
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=auth_headers,
            json=application_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED

    @pytest.mark.asyncio
    async def test_apply_unauthenticated(
        self, async_client: AsyncClient, test_job, test_resume
    ):
        """Test applying without authentication."""
        application_data = {
            "job_id": as_str(test_job.id),
            "resume_id": as_str(test_resume.id)
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            json=application_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_apply_job_not_found(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test applying to non-existent job."""
        application_data = {
            "job_id": "non-existent-job-id",
            "resume_id": as_str(test_resume.id)
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=auth_headers,
            json=application_data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_apply_resume_not_found(
        self, async_client: AsyncClient, auth_headers, test_job
    ):
        """Test applying with non-existent resume."""
        application_data = {
            "job_id": as_str(test_job.id),
            "resume_id": "non-existent-resume-id"
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=auth_headers,
            json=application_data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_apply_duplicate_application(
        self, async_client: AsyncClient, auth_headers, test_job, test_resume, test_application
    ):
        """Test applying to same job twice."""
        application_data = {
            "job_id": as_str(test_application.job_id),
            "resume_id": as_str(test_resume.id)
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=auth_headers,
            json=application_data
        )
        
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT
        ]

    @pytest.mark.asyncio
    async def test_apply_race_returns_409_via_integrity_error(
        self,
        async_client: AsyncClient,
        auth_headers,
        test_job,
        test_resume,
        monkeypatch,
    ):
        """Regression for R6.

        Simulates the race window between the duplicate pre-check and the
        commit by forcing the very next Session.commit() to raise
        IntegrityError as if a concurrent INSERT won the uq_user_job
        constraint. The route must convert that to a clean 409, never a 500.
        """
        from sqlalchemy.exc import IntegrityError
        from sqlalchemy.orm import Session

        original_commit = Session.commit
        state = {"raised": False}

        def commit_once_raises_integrity_error(self):
            if not state["raised"]:
                state["raised"] = True
                raise IntegrityError(
                    statement="INSERT INTO applications ...",
                    params={},
                    orig=Exception("UNIQUE constraint failed: uq_user_job"),
                )
            return original_commit(self)

        monkeypatch.setattr(Session, "commit", commit_once_raises_integrity_error)

        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=auth_headers,
            json={
                "job_id": as_str(test_job.id),
                "resume_id": as_str(test_resume.id),
            },
        )

        assert state["raised"], "Patched commit was never called — test did not exercise the race path"
        assert response.status_code == status.HTTP_409_CONFLICT, (
            f"Expected 409 from IntegrityError handler, got {response.status_code}: "
            f"{response.text}"
        )
        # The project wraps HTTPException in its own envelope, so search the
        # whole serialized response rather than guessing the exact key.
        body_text = response.text.lower()
        assert "already applied" in body_text, (
            f"Expected duplicate-apply message in response, got: {response.text!r}"
        )

    @pytest.mark.asyncio
    async def test_apply_closed_job(
        self, async_client: AsyncClient, auth_headers, test_resume, async_session, test_company
    ):
        """Test applying to closed job."""
        # Create a closed job
        from app.models.job import Job
        from uuid import uuid4
        
        closed_job = Job(
            id=uuid4(),
            company_id=test_company.id,
            title="Closed Position",
            description="This job is closed",
            location="Remote",
            job_type="full_time",
            status="closed"
        )
        async_session.add(closed_job)
        await async_session.commit()
        
        application_data = {
            "job_id": as_str(closed_job.id),
            "resume_id": as_str(test_resume.id)
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=auth_headers,
            json=application_data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# =============================================================================
# WITHDRAW APPLICATION TESTS
# =============================================================================

class TestWithdrawApplication:
    """Tests for withdrawing applications."""

    @pytest.mark.asyncio
    async def test_withdraw_success(
        self, async_client: AsyncClient, auth_headers, test_application
    ):
        """Test successful application withdrawal."""
        response = await async_client.post(
            f"/api/v1/applications/{test_application.id}/withdraw",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify application is withdrawn
        get_response = await async_client.get(
            f"/api/v1/applications/{test_application.id}",
            headers=auth_headers
        )
        
        if get_response.status_code == status.HTTP_200_OK:
            assert response_data(get_response)["status"] == "withdrawn"

    @pytest.mark.asyncio
    async def test_withdraw_not_found(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test withdrawing non-existent application."""
        response = await async_client.post(
            "/api/v1/applications/non-existent-id/withdraw",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_withdraw_not_owner(
        self, async_client: AsyncClient, test_application
    ):
        """Test withdrawing application by different user."""
        from app.core.security import create_access_token
        other_user_token = create_access_token(data={"sub": "different-user-id"})
        other_headers = {"Authorization": f"Bearer {other_user_token}"}
        
        response = await async_client.post(
            f"/api/v1/applications/{test_application.id}/withdraw",
            headers=other_headers
        )
        
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND
        ]

    @pytest.mark.asyncio
    async def test_withdraw_already_accepted(
        self, async_client: AsyncClient, auth_headers, test_application, async_session
    ):
        """Test withdrawing an accepted application."""
        # Update application status to accepted
        test_application.status = "accepted"
        await async_session.commit()
        
        response = await async_client.post(
            f"/api/v1/applications/{test_application.id}/withdraw",
            headers=auth_headers
        )
        
        # Should fail or succeed based on business logic
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST
        ]


# =============================================================================
# UPDATE APPLICATION STATUS TESTS (Company)
# =============================================================================

class TestUpdateApplicationStatus:
    """Tests for updating application status (by company)."""

    @pytest.mark.asyncio
    async def test_update_status_to_reviewing(
        self, async_client: AsyncClient, company_auth_headers, test_application
    ):
        """Test updating application status to reviewing."""
        response = await async_client.put(
            f"/api/v1/applications/{test_application.id}/status",
            headers=company_auth_headers,
            json={"status": "reviewing"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response_data(response)["status"] == "reviewing"

    @pytest.mark.asyncio
    async def test_update_status_to_interview(
        self, async_client: AsyncClient, company_auth_headers, test_application
    ):
        """Test updating application status to interview."""
        response = await async_client.put(
            f"/api/v1/applications/{test_application.id}/status",
            headers=company_auth_headers,
            json={
                "status": "interview",
                "interview_at": "2026-04-05T10:00:00Z",
                "interview_type": "video"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_update_status_student_forbidden(
        self, async_client: AsyncClient, auth_headers, test_application
    ):
        """Test that students cannot update application status."""
        response = await async_client.put(
            f"/api/v1/applications/{test_application.id}/status",
            headers=auth_headers,  # Student headers
            json={"status": "accepted"}
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_update_status_invalid_status(
        self, async_client: AsyncClient, company_auth_headers, test_application
    ):
        """Test updating with invalid status value."""
        response = await async_client.put(
            f"/api/v1/applications/{test_application.id}/status",
            headers=company_auth_headers,
            json={"status": "invalid_status"}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# =============================================================================
# AUTO-APPLY TESTS
# =============================================================================

class TestAutoApply:
    """Tests for auto-apply feature."""

    @pytest.mark.asyncio
    async def test_auto_apply_success(
        self, async_client: AsyncClient, auth_headers, premium_student, test_resume, multiple_jobs, mock_openai
    ):
        """Test successful auto-apply."""
        auto_apply_data = {
            "criteria": {
                "job_types": ["full_time"],
                "locations": ["Tashkent"],
                "max_applications": 5
            },
            "resume_id": as_str(test_resume.id)
        }
        
        response = await async_client.post(
            "/api/v1/applications/auto-apply",
            headers=auth_headers,
            json=auto_apply_data
        )
        
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED
        ]
        data = response_data(response)

        assert "results" in data
        assert "applications_submitted" in data

    @pytest.mark.asyncio
    async def test_auto_apply_limit(
        self, async_client: AsyncClient, auth_headers, premium_student, test_resume, multiple_jobs, mock_openai
    ):
        """Test auto-apply respects max limit."""
        max_apps = 2
        
        auto_apply_data = {
            "criteria": {
                "max_applications": max_apps
            },
            "resume_id": as_str(test_resume.id)
        }
        
        response = await async_client.post(
            "/api/v1/applications/auto-apply",
            headers=auth_headers,
            json=auto_apply_data
        )
        
        if response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]:
            data = response_data(response)
            assert data["applications_submitted"] <= max_apps

    @pytest.mark.asyncio
    async def test_auto_apply_unauthenticated(self, async_client: AsyncClient):
        """Test auto-apply without authentication."""
        auto_apply_data = {
            "criteria": {},
            "resume_id": "some-resume-id"
        }
        
        response = await async_client.post(
            "/api/v1/applications/auto-apply",
            json=auto_apply_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# APPLICATION ANALYTICS TESTS
# =============================================================================

class TestApplicationAnalytics:
    """Tests for application analytics."""

    @pytest.mark.asyncio
    async def test_get_application_stats(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test getting application statistics."""
        response = await async_client.get(
            "/api/v1/applications/stats",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response_data(response)

        expected_fields = ["total", "pending", "reviewing", "accepted", "rejected"]
        for field in expected_fields:
            assert field in data or field in data.get("counts", {})

    @pytest.mark.asyncio
    async def test_stats_unauthenticated(self, async_client: AsyncClient):
        """Test getting stats without authentication."""
        response = await async_client.get("/api/v1/applications/stats")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


















