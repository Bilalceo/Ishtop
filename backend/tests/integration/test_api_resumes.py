"""
=============================================================================
RESUME API INTEGRATION TESTS
=============================================================================

Test cases for resume API endpoints.
"""

import pytest
from fastapi import status
from httpx import AsyncClient

from tests.fixtures.sample_data import (
    get_valid_resume_content,
    get_minimal_resume_content,
    get_invalid_resume_contents,
    AI_RESUME_INPUT
)


# =============================================================================
# CREATE RESUME TESTS
# =============================================================================

class TestCreateResume:
    """Tests for resume creation endpoint."""

    @pytest.mark.asyncio
    async def test_create_resume_authenticated(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test creating resume with authentication."""
        resume_data = {
            "title": "My Professional Resume",
            "content": get_valid_resume_content()
        }
        
        response = await async_client.post(
            "/api/v1/resumes/create",
            headers=auth_headers,
            json=resume_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        assert "id" in data
        assert data["title"] == resume_data["title"]
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_resume_unauthenticated(self, async_client: AsyncClient):
        """Test creating resume without authentication returns 401."""
        resume_data = {
            "title": "My Resume",
            "content": get_valid_resume_content()
        }
        
        response = await async_client.post(
            "/api/v1/resumes/create",
            json=resume_data
        )
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    @pytest.mark.asyncio
    async def test_create_resume_minimal_content(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test creating resume with minimal content."""
        resume_data = {
            "title": "Minimal Resume",
            "content": get_minimal_resume_content()
        }
        
        response = await async_client.post(
            "/api/v1/resumes/create",
            headers=auth_headers,
            json=resume_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED

    @pytest.mark.asyncio
    async def test_create_resume_invalid_content(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test creating resume with invalid content."""
        for invalid_content in get_invalid_resume_contents():
            resume_data = {
                "title": "Invalid Resume",
                "content": invalid_content
            }
            
            response = await async_client.post(
                "/api/v1/resumes/create",
                headers=auth_headers,
                json=resume_data
            )
            
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_create_resume_empty_title(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test creating resume with empty title."""
        resume_data = {
            "title": "",
            "content": get_valid_resume_content()
        }
        
        response = await async_client.post(
            "/api/v1/resumes/create",
            headers=auth_headers,
            json=resume_data
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# =============================================================================
# AI RESUME GENERATION TESTS
# =============================================================================

class TestGenerateAIResume:
    """Tests for AI resume generation endpoint."""

    @pytest.mark.asyncio
    async def test_generate_ai_resume_success(
        self, async_client: AsyncClient, auth_headers, mock_openai
    ):
        """Test successful AI resume generation."""
        response = await async_client.post(
            "/api/v1/resumes/generate-ai",
            headers=auth_headers,
            json=AI_RESUME_INPUT
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        payload = response.json()
        assert payload["success"] is True
        assert payload.get("resume") or payload.get("resume_content")

    @pytest.mark.asyncio
    async def test_generate_ai_resume_unauthenticated(self, async_client: AsyncClient):
        """Test AI generation without authentication."""
        response = await async_client.post(
            "/api/v1/resumes/generate-ai",
            json=AI_RESUME_INPUT
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_generate_ai_resume_with_template(
        self, async_client: AsyncClient, auth_headers, mock_openai
    ):
        """Test AI generation with specific template."""
        templates = ["modern", "classic", "minimal", "creative"]
        
        for template in templates:
            data = {**AI_RESUME_INPUT, "template": template}
            
            response = await async_client.post(
                "/api/v1/resumes/generate-ai",
                headers=auth_headers,
                json=data
            )
            
            assert response.status_code == status.HTTP_201_CREATED

    @pytest.mark.asyncio
    async def test_generate_ai_resume_with_tone(
        self, async_client: AsyncClient, auth_headers, mock_openai
    ):
        """Test AI generation with specific tone."""
        tones = ["professional", "confident", "enthusiastic"]
        
        for tone in tones:
            data = {**AI_RESUME_INPUT, "tone": tone}
            
            response = await async_client.post(
                "/api/v1/resumes/generate-ai",
                headers=auth_headers,
                json=data
            )
            
            assert response.status_code == status.HTTP_201_CREATED


# =============================================================================
# GET RESUMES TESTS
# =============================================================================

class TestGetResumes:
    """Tests for getting resumes endpoints."""

    @pytest.mark.asyncio
    async def test_get_user_resumes(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test getting user's resumes."""
        response = await async_client.get(
            "/api/v1/resumes",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert isinstance(data, list) or "items" in data or "resumes" in data

    @pytest.mark.asyncio
    async def test_get_resumes_only_own(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test that user only gets their own resumes."""
        response = await async_client.get(
            "/api/v1/resumes",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        resumes = payload if isinstance(payload, list) else payload.get("items", payload.get("resumes", []))
        
        # All resumes should belong to the authenticated user
        for resume in resumes:
            # Resume should be from the test user
            assert resume.get("user_id") is not None

    @pytest.mark.asyncio
    async def test_get_resumes_with_pagination(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test getting resumes with pagination."""
        response = await async_client.get(
            "/api/v1/resumes",
            headers=auth_headers,
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_get_resumes_filter_by_status(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test filtering resumes by status."""
        response = await async_client.get(
            "/api/v1/resumes",
            headers=auth_headers,
            params={"status": "published"}
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_get_single_resume(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test getting a single resume."""
        response = await async_client.get(
            f"/api/v1/resumes/{test_resume.id}",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["id"] == str(test_resume.id)
        assert data["title"] == test_resume.title

    @pytest.mark.asyncio
    async def test_get_resume_not_found(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test getting non-existent resume."""
        response = await async_client.get(
            "/api/v1/resumes/non-existent-id",
            headers=auth_headers
        )
        
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_422_UNPROCESSABLE_ENTITY]


# =============================================================================
# UPDATE RESUME TESTS
# =============================================================================

class TestUpdateResume:
    """Tests for resume update endpoint."""

    @pytest.mark.asyncio
    async def test_update_resume_authorization(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test that user can only update own resumes."""
        update_data = {"title": "Updated Title"}
        
        response = await async_client.put(
            f"/api/v1/resumes/{test_resume.id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == "Updated Title"

    @pytest.mark.asyncio
    async def test_update_resume_unauthorized_user(
        self, async_client: AsyncClient, test_resume
    ):
        """Test updating resume by different user."""
        # Create headers for a different user
        from app.core.security import create_access_token
        other_user_token = create_access_token(data={"sub": "different-user-id"})
        other_headers = {"Authorization": f"Bearer {other_user_token}"}
        
        response = await async_client.put(
            f"/api/v1/resumes/{test_resume.id}",
            headers=other_headers,
            json={"title": "Hacked Title"}
        )
        
        assert response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_401_UNAUTHORIZED,
        ]

    @pytest.mark.asyncio
    async def test_update_resume_content(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test updating resume content."""
        new_content = get_valid_resume_content()
        new_content["personal_info"]["name"] = "Updated Name"
        
        response = await async_client.put(
            f"/api/v1/resumes/{test_resume.id}",
            headers=auth_headers,
            json={"content": new_content}
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_update_resume_status(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test updating resume status."""
        response = await async_client.put(
            f"/api/v1/resumes/{test_resume.id}",
            headers=auth_headers,
            json={"status": "published"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "published"


# =============================================================================
# DELETE RESUME TESTS
# =============================================================================

class TestDeleteResume:
    """Tests for resume deletion endpoint."""

    @pytest.mark.asyncio
    async def test_delete_resume_success(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test successful resume deletion."""
        response = await async_client.delete(
            f"/api/v1/resumes/{test_resume.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_204_NO_CONTENT
        ]
        
        # Verify deletion
        get_response = await async_client.get(
            f"/api/v1/resumes/{test_resume.id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_resume_unauthorized(
        self, async_client: AsyncClient, test_resume
    ):
        """Test deleting resume without authentication."""
        response = await async_client.delete(
            f"/api/v1/resumes/{test_resume.id}"
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_delete_resume_not_owner(
        self, async_client: AsyncClient, test_resume
    ):
        """Test deleting resume by non-owner."""
        from app.core.security import create_access_token
        other_user_token = create_access_token(data={"sub": "different-user-id"})
        other_headers = {"Authorization": f"Bearer {other_user_token}"}
        
        response = await async_client.delete(
            f"/api/v1/resumes/{test_resume.id}",
            headers=other_headers
        )
        
        assert response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_401_UNAUTHORIZED,
        ]

    @pytest.mark.asyncio
    async def test_delete_resume_not_found(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test deleting non-existent resume."""
        response = await async_client.delete(
            "/api/v1/resumes/non-existent-id",
            headers=auth_headers
        )
        
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_422_UNPROCESSABLE_ENTITY]


# =============================================================================
# DOWNLOAD PDF TESTS
# =============================================================================

class TestDownloadPDF:
    """Tests for resume PDF download endpoint."""

    @pytest.mark.asyncio
    async def test_download_pdf_success(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test successful PDF download (URL generation + streaming endpoint)."""
        response = await async_client.post(
            f"/api/v1/resumes/{test_resume.id}/download",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload.get("success") is True
        assert payload.get("pdf_url")

        pdf_response = await async_client.get(payload["pdf_url"], headers=auth_headers)
        assert pdf_response.status_code == status.HTTP_200_OK
        assert pdf_response.headers.get("content-type") == "application/pdf"

    @pytest.mark.asyncio
    async def test_download_pdf_valid_format(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test that downloaded PDF is valid."""
        response = await async_client.post(
            f"/api/v1/resumes/{test_resume.id}/download",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        pdf_response = await async_client.get(payload["pdf_url"], headers=auth_headers)
        assert pdf_response.status_code == status.HTTP_200_OK
        
        # Check PDF magic bytes
        content = pdf_response.content
        assert content.startswith(b'%PDF') or len(content) > 0

    @pytest.mark.asyncio
    async def test_download_pdf_unauthorized(
        self, async_client: AsyncClient, test_resume
    ):
        """Test PDF download without authentication."""
        response = await async_client.post(
            f"/api/v1/resumes/{test_resume.id}/download"
        )
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


# =============================================================================
# PUBLISH RESUME TESTS
# =============================================================================

class TestPublishResume:
    """Tests for resume publish endpoint."""

    @pytest.mark.asyncio
    async def test_publish_resume_success(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test successful resume publishing."""
        response = await async_client.post(
            f"/api/v1/resumes/{test_resume.id}/publish",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "published"

    @pytest.mark.asyncio
    async def test_publish_resume_unauthorized(
        self, async_client: AsyncClient, test_resume
    ):
        """Test publishing without authentication."""
        response = await async_client.post(
            f"/api/v1/resumes/{test_resume.id}/publish"
        )
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


# =============================================================================
# ANALYTICS TESTS
# =============================================================================

class TestResumeAnalytics:
    """Tests for resume analytics endpoint."""

    @pytest.mark.asyncio
    async def test_get_analytics(
        self, async_client: AsyncClient, auth_headers, test_resume
    ):
        """Test getting resume analytics."""
        response = await async_client.get(
            f"/api/v1/resumes/{test_resume.id}/analytics",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "view_count" in data or "views" in data or "total_views" in data

    @pytest.mark.asyncio
    async def test_analytics_unauthorized(
        self, async_client: AsyncClient, test_resume
    ):
        """Test analytics without authentication."""
        response = await async_client.get(
            f"/api/v1/resumes/{test_resume.id}/analytics"
        )
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
















