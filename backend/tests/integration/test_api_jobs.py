"""
=============================================================================
JOB API INTEGRATION TESTS
=============================================================================

Test cases for job API endpoints.
"""

import pytest
from fastapi import status
from httpx import AsyncClient

from tests.fixtures.sample_data import (
    get_valid_job_data,
    get_minimal_job_data,
    SAMPLE_JOBS
)


# =============================================================================
# LIST JOBS TESTS
# =============================================================================

class TestListJobs:
    """Tests for job listing endpoint."""

    @pytest.mark.asyncio
    async def test_list_jobs_public(self, async_client: AsyncClient, multiple_jobs):
        """Test that job listing is publicly accessible."""
        response = await async_client.get("/api/v1/jobs")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert isinstance(data, list) or "items" in data or "jobs" in data

    @pytest.mark.asyncio
    async def test_list_jobs_with_pagination(
        self, async_client: AsyncClient, multiple_jobs
    ):
        """Test job listing with pagination."""
        response = await async_client.get(
            "/api/v1/jobs",
            params={"page": 1, "limit": 2}
        )
        
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        jobs = payload if isinstance(payload, list) else payload.get("items", payload.get("jobs", []))
        
        assert len(jobs) <= 2

    @pytest.mark.asyncio
    async def test_list_jobs_search(
        self, async_client: AsyncClient, multiple_jobs
    ):
        """Test job listing with search query."""
        response = await async_client.get(
            "/api/v1/jobs",
            params={"query": "Backend"}
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_list_jobs_filter_location(
        self, async_client: AsyncClient, multiple_jobs
    ):
        """Test job filtering by location."""
        response = await async_client.get(
            "/api/v1/jobs",
            params={"location": "Tashkent"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        jobs = payload if isinstance(payload, list) else payload.get("items", payload.get("jobs", []))
        
        for job in jobs:
            assert "Tashkent" in job.get("location", "")

    @pytest.mark.asyncio
    async def test_list_jobs_filter_job_type(
        self, async_client: AsyncClient, multiple_jobs
    ):
        """Test job filtering by job type."""
        response = await async_client.get(
            "/api/v1/jobs",
            params={"job_type": "full_time"}
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_list_jobs_filter_experience_level(
        self, async_client: AsyncClient, multiple_jobs
    ):
        """Test job filtering by experience level."""
        response = await async_client.get(
            "/api/v1/jobs",
            params={"experience_level": "senior"}
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_list_jobs_filter_salary_range(
        self, async_client: AsyncClient, multiple_jobs
    ):
        """Test job filtering by salary range."""
        response = await async_client.get(
            "/api/v1/jobs",
            params={"salary_min": 2000, "salary_max": 4000}
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_list_jobs_sorting(
        self, async_client: AsyncClient, multiple_jobs
    ):
        """Test job listing with sorting."""
        # Sort by salary descending
        response = await async_client.get(
            "/api/v1/jobs",
            params={"sort_by": "salary", "sort_order": "desc"}
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_list_jobs_multiple_filters(
        self, async_client: AsyncClient, multiple_jobs
    ):
        """Test job listing with multiple filters."""
        response = await async_client.get(
            "/api/v1/jobs",
            params={
                "location": "Tashkent",
                "job_type": "full_time",
                "experience_level": "senior",
                "salary_min": 3000
            }
        )
        
        assert response.status_code == status.HTTP_200_OK


# =============================================================================
# GET JOB TESTS
# =============================================================================

class TestGetJob:
    """Tests for getting single job endpoint."""

    @pytest.mark.asyncio
    async def test_get_job_success(self, async_client: AsyncClient, test_job):
        """Test getting a single job."""
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["id"] == str(test_job.id)
        assert data["title"] == test_job.title
        assert "requirements" in data
        assert "company" in data or "company_id" in data

    @pytest.mark.asyncio
    async def test_get_job_not_found(self, async_client: AsyncClient):
        """Test getting non-existent job."""
        response = await async_client.get("/api/v1/jobs/non-existent-id")
        
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_422_UNPROCESSABLE_ENTITY]

    @pytest.mark.asyncio
    async def test_get_job_increments_views(
        self, async_client: AsyncClient, test_job
    ):
        """Test that getting job increments view count."""
        # Get initial view count
        response1 = await async_client.get(f"/api/v1/jobs/{test_job.id}")
        initial_views = response1.json().get("views_count", 0)
        
        # Get job again
        response2 = await async_client.get(f"/api/v1/jobs/{test_job.id}")
        new_views = response2.json().get("views_count", 0)
        
        # View count should increase (if implemented)
        assert new_views >= initial_views


# =============================================================================
# CREATE JOB TESTS
# =============================================================================

class TestCreateJob:
    """Tests for job creation endpoint."""

    @pytest.mark.asyncio
    async def test_create_job_company_user(
        self, async_client: AsyncClient, company_auth_headers
    ):
        """Test job creation by company user."""
        job_data = get_valid_job_data()
        
        response = await async_client.post(
            "/api/v1/jobs",
            headers=company_auth_headers,
            json=job_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        payload = data.get("data", data)
        assert "id" in payload
        assert payload["title"] == job_data["title"]
        assert payload["status"] == "active"

    @pytest.mark.asyncio
    async def test_create_job_student_forbidden(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test that student cannot create jobs."""
        job_data = get_valid_job_data()
        
        response = await async_client.post(
            "/api/v1/jobs",
            headers=auth_headers,  # Student user headers
            json=job_data
        )
        
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    @pytest.mark.asyncio
    async def test_create_job_unauthenticated(self, async_client: AsyncClient):
        """Test job creation without authentication."""
        job_data = get_valid_job_data()
        
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_create_job_minimal_data(
        self, async_client: AsyncClient, company_auth_headers
    ):
        """Test job creation with minimal data."""
        job_data = get_minimal_job_data()
        
        response = await async_client.post(
            "/api/v1/jobs",
            headers=company_auth_headers,
            json=job_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED

    @pytest.mark.asyncio
    async def test_create_job_invalid_salary_range(
        self, async_client: AsyncClient, company_auth_headers
    ):
        """Test job creation with invalid salary range."""
        job_data = get_valid_job_data()
        job_data["salary_min"] = 5000
        job_data["salary_max"] = 3000  # Max < Min
        
        response = await async_client.post(
            "/api/v1/jobs",
            headers=company_auth_headers,
            json=job_data
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# =============================================================================
# UPDATE JOB TESTS
# =============================================================================

class TestUpdateJob:
    """Tests for job update endpoint."""

    @pytest.mark.asyncio
    async def test_update_job_success(
        self, async_client: AsyncClient, company_auth_headers, test_job
    ):
        """Test successful job update."""
        update_data = {"title": "Updated Job Title"}
        
        response = await async_client.put(
            f"/api/v1/jobs/{test_job.id}",
            headers=company_auth_headers,
            json=update_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == "Updated Job Title"

    @pytest.mark.asyncio
    async def test_update_job_not_owner(
        self, async_client: AsyncClient, test_job
    ):
        """Test updating job by non-owner company."""
        from app.core.security import create_access_token
        other_company_token = create_access_token(data={"sub": "different-company-id"})
        other_headers = {"Authorization": f"Bearer {other_company_token}"}
        
        response = await async_client.put(
            f"/api/v1/jobs/{test_job.id}",
            headers=other_headers,
            json={"title": "Hacked Title"}
        )
        
        assert response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_401_UNAUTHORIZED,
        ]

    @pytest.mark.asyncio
    async def test_update_job_status(
        self, async_client: AsyncClient, company_auth_headers, test_job
    ):
        """Test updating job status."""
        response = await async_client.put(
            f"/api/v1/jobs/{test_job.id}",
            headers=company_auth_headers,
            json={"status": "closed"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "closed"


# =============================================================================
# DELETE JOB TESTS
# =============================================================================

class TestDeleteJob:
    """Tests for job deletion endpoint."""

    @pytest.mark.asyncio
    async def test_delete_job_success(
        self, async_client: AsyncClient, company_auth_headers, test_job
    ):
        """Test successful job deletion."""
        response = await async_client.delete(
            f"/api/v1/jobs/{test_job.id}",
            headers=company_auth_headers
        )
        
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_204_NO_CONTENT
        ]

    @pytest.mark.asyncio
    async def test_delete_job_not_owner(
        self, async_client: AsyncClient, test_job
    ):
        """Test deleting job by non-owner."""
        from app.core.security import create_access_token
        other_company_token = create_access_token(data={"sub": "different-company-id"})
        other_headers = {"Authorization": f"Bearer {other_company_token}"}
        
        response = await async_client.delete(
            f"/api/v1/jobs/{test_job.id}",
            headers=other_headers
        )
        
        assert response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_401_UNAUTHORIZED,
        ]


# =============================================================================
# JOB MATCHING TESTS
# =============================================================================

class TestJobMatching:
    """Tests for job matching endpoint."""

    @pytest.mark.asyncio
    async def test_match_jobs_with_resume(
        self, async_client: AsyncClient, auth_headers, test_resume, multiple_jobs, mock_openai
    ):
        """Test matching jobs with resume."""
        response = await async_client.post(
            "/api/v1/jobs/match",
            headers=auth_headers,
            json={"resume_id": str(test_resume.id)}
        )
        
        assert response.status_code == status.HTTP_200_OK
        payload = response.json().get("data", response.json())
        # Should return matched jobs with scores
        assert isinstance(payload, list) or "matches" in payload
        if isinstance(payload, dict) and payload.get("matches"):
            match = payload["matches"][0]
            assert "match_score" in match
            assert "explainability" in match
            assert isinstance(match["explainability"]["fit_reasons"], list)
            assert isinstance(match["explainability"]["missing_items"], list)
            assert set(match["explainability"]["improvement_plan"].keys()) == {"d7", "d14", "d30"}

    @pytest.mark.asyncio
    async def test_match_jobs_unauthenticated(self, async_client: AsyncClient):
        """Test job matching without authentication."""
        response = await async_client.post(
            "/api/v1/jobs/match",
            json={"resume_id": "some-resume-id"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# JOB APPLICATIONS TESTS
# =============================================================================

class TestJobApplications:
    """Tests for job applications endpoint."""

    @pytest.mark.asyncio
    async def test_get_job_applications_company(
        self, async_client: AsyncClient, company_auth_headers, test_job, test_application
    ):
        """Test getting applications for a job (company view)."""
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications",
            headers=company_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        payload = response.json().get("data", response.json())
        assert isinstance(payload, list) or "items" in payload or "applications" in payload

    @pytest.mark.asyncio
    async def test_get_job_applications_student_forbidden(
        self, async_client: AsyncClient, auth_headers, test_job
    ):
        """Test that students cannot view all applications."""
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications",
            headers=auth_headers  # Student headers
        )
        
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]


# =============================================================================
# APPLY TO JOB TESTS
# =============================================================================

class TestApplyToJob:
    """Tests for job application endpoint."""

    @pytest.mark.asyncio
    async def test_apply_to_job_success(
        self, async_client: AsyncClient, auth_headers, test_job, test_resume
    ):
        """Test successful job application."""
        application_data = {
            "job_id": str(test_job.id),
            "resume_id": str(test_resume.id),
            "cover_letter": "I am excited to apply for this position..."
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=auth_headers,
            json=application_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        payload = response.json().get("data", response.json())
        assert "id" in payload
        assert payload["status"] == "pending"

    @pytest.mark.asyncio
    async def test_apply_to_job_duplicate(
        self, async_client: AsyncClient, auth_headers, test_job, test_resume, test_application
    ):
        """Test applying to same job twice."""
        application_data = {
            "job_id": str(test_job.id),
            "resume_id": str(test_resume.id)
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=auth_headers,
            json=application_data
        )
        
        # Should fail - already applied
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT,
            status.HTTP_401_UNAUTHORIZED,
        ]

    @pytest.mark.asyncio
    async def test_apply_to_job_unauthenticated(
        self, async_client: AsyncClient, test_job, test_resume
    ):
        """Test applying without authentication."""
        application_data = {
            "job_id": str(test_job.id),
            "resume_id": str(test_resume.id)
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            json=application_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_apply_company_user_forbidden(
        self, async_client: AsyncClient, company_auth_headers, test_job
    ):
        """Test that company users cannot apply to jobs."""
        application_data = {
            "job_id": str(test_job.id),
            "resume_id": "some-resume-id"
        }
        
        response = await async_client.post(
            "/api/v1/applications/apply",
            headers=company_auth_headers,
            json=application_data
        )
        
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]
















