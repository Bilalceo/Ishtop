"""
=============================================================================
Users & RBAC Tests
=============================================================================

Tests for user management and role-based access control.

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from uuid import uuid4

from app.models import User, UserRole


def _error_message(payload: dict) -> str:
    """Extract a user-facing error message from legacy and envelope formats."""
    detail = payload.get("detail")
    if isinstance(detail, str):
        return detail
    if isinstance(detail, dict):
        return str(detail.get("message") or detail.get("error") or detail)

    error = payload.get("error")
    if isinstance(error, dict):
        return str(error.get("message") or error.get("code") or "")

    return ""


# =============================================================================
# USER PROFILE TESTS
# =============================================================================

@pytest.mark.unit
def test_get_my_profile(client: TestClient, test_student: User, student_headers: dict):
    """Test getting own profile."""
    response = client.get(
        "/api/v1/users/me",
        headers=student_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_student.email
    assert data["full_name"] == test_student.full_name
    assert "resume_count" in data
    assert "application_count" in data


@pytest.mark.unit
def test_update_my_profile(client: TestClient, test_student: User, student_headers: dict):
    """Test updating own profile."""
    response = client.put(
        "/api/v1/users/me",
        headers=student_headers,
        json={
            "full_name": "Updated Name",
            "bio": "Updated bio",
            "location": "Samarkand, Uzbekistan",
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["bio"] == "Updated bio"
    assert data["location"] == "Samarkand, Uzbekistan"


@pytest.mark.unit
def test_change_password_success(client: TestClient, test_student: User, student_headers: dict):
    """Test successful password change."""
    response = client.post(
        "/api/v1/users/me/change-password",
        headers=student_headers,
        json={
            "current_password": "TestPassword123!",
            "new_password": "NewPassword123!",
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True
    
    # Verify new password works
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_student.email,
            "password": "NewPassword123!",
        }
    )
    assert login_response.status_code == status.HTTP_200_OK


@pytest.mark.unit
def test_change_password_wrong_current(client: TestClient, student_headers: dict):
    """Test password change with wrong current password."""
    response = client.post(
        "/api/v1/users/me/change-password",
        headers=student_headers,
        json={
            "current_password": "WrongPassword!",
            "new_password": "NewPassword123!",
        }
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "incorrect" in _error_message(response.json()).lower()


@pytest.mark.unit
def test_delete_my_account(client: TestClient, test_student: User, student_headers: dict):
    """Test soft deleting own account."""
    response = client.delete(
        "/api/v1/users/me",
        headers=student_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True


# =============================================================================
# RBAC TESTS - STUDENT ACCESS
# =============================================================================

@pytest.mark.integration
def test_student_cannot_create_job(client: TestClient, student_headers: dict, sample_job_data: dict):
    """Test that students cannot create jobs."""
    response = client.post(
        "/api/v1/jobs",
        headers=student_headers,
        json=sample_job_data
    )
    
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.integration
def test_student_can_apply_to_job(client: TestClient, test_student: User, test_job, test_resume, student_headers: dict):
    """Test that students can apply to jobs."""
    response = client.post(
        "/api/v1/applications/apply",
        headers=student_headers,
        json={
            "job_id": str(test_job.id),
            "resume_id": str(test_resume.id),
            "cover_letter": "I am interested in this position",
        }
    )
    
    assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.integration
def test_student_cannot_access_admin_endpoints(client: TestClient, student_headers: dict):
    """Test that students cannot access admin endpoints."""
    response = client.get(
        "/api/v1/admin/dashboard",
        headers=student_headers
    )
    
    assert response.status_code == status.HTTP_403_FORBIDDEN


# =============================================================================
# RBAC TESTS - COMPANY ACCESS
# =============================================================================

@pytest.mark.integration
def test_company_can_create_job(client: TestClient, company_headers: dict, sample_job_data: dict):
    """Test that companies can create jobs."""
    response = client.post(
        "/api/v1/jobs",
        headers=company_headers,
        json=sample_job_data
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == sample_job_data["title"]


@pytest.mark.integration
def test_company_cannot_apply_to_job(client: TestClient, test_job, company_headers: dict):
    """Test that companies cannot apply to jobs."""
    response = client.post(
        "/api/v1/applications/apply",
        headers=company_headers,
        json={
            "job_id": str(test_job.id),
            "resume_id": "some-resume-id",
            "cover_letter": "Test",
        }
    )
    
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.integration
def test_company_can_view_job_applications(client: TestClient, test_job, test_application, company_headers: dict):
    """Test that companies can view applications for their jobs."""
    response = client.get(
        f"/api/v1/jobs/{test_job.id}/applications",
        headers=company_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["applications"]) > 0


@pytest.mark.integration
def test_company_cannot_view_other_company_applications(
    client: TestClient,
    test_db,
    test_job,
    company_headers: dict
):
    """Test that companies cannot view other companies' applications."""
    # Create another company
    other_company = User(
        email="other@company.com",
        full_name="Other Company",
        role="company",
        company_name="Other Corp",
    )
    other_company.set_password("Password123!")
    test_db.add(other_company)
    test_db.commit()
    
    # Login as other company
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "other@company.com",
            "password": "Password123!",
        }
    )
    other_company_token = login_response.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_company_token}"}
    
    # Try to access first company's job applications
    response = client.get(
        f"/api/v1/jobs/{test_job.id}/applications",
        headers=other_headers
    )
    
    assert response.status_code == status.HTTP_403_FORBIDDEN


# =============================================================================
# RBAC TESTS - ADMIN ACCESS
# =============================================================================

@pytest.mark.integration
def test_admin_can_access_admin_endpoints(client: TestClient, admin_headers: dict):
    """Test that admins can access admin endpoints."""
    response = client.get(
        "/api/v1/admin/dashboard",
        headers=admin_headers
    )
    
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.integration
def test_admin_can_list_all_users(client: TestClient, admin_headers: dict):
    """Test that admins can list all users."""
    response = client.get(
        "/api/v1/users",
        headers=admin_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "users" in data
    assert data["total"] > 0


@pytest.mark.integration
def test_admin_can_view_errors(client: TestClient, admin_headers: dict):
    """Test that admins can view error logs."""
    response = client.get(
        "/api/v1/admin/errors",
        headers=admin_headers
    )
    
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.integration
def test_admin_can_view_admin_role_matrix(client: TestClient, admin_headers: dict):
    """Test admin access to role-permission matrix."""
    response = client.get(
        "/api/v1/admin/access/roles-matrix",
        headers=admin_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["success"] is True
    assert "roles" in payload
    assert "super_admin" in payload["roles"]


@pytest.mark.integration
def test_admin_can_list_admin_access_users(client: TestClient, admin_headers: dict):
    """Test admin can list admin users and effective permissions."""
    response = client.get(
        "/api/v1/admin/access/admin-users",
        headers=admin_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["success"] is True
    assert payload["total"] >= 1
    assert isinstance(payload["users"], list)


@pytest.mark.integration
def test_super_admin_can_update_admin_role(
    client: TestClient, test_db, test_admin: User, admin_headers: dict
):
    """Test super_admin can update another admin's sub-role."""
    another_admin = User(
        id=uuid4(),
        email="second.admin@example.com",
        full_name="Second Admin",
        role=UserRole.ADMIN,
        is_active_account=True,
        is_verified=True,
    )
    another_admin.set_password("AdminPassword123!")
    test_db.add(another_admin)
    test_db.commit()
    test_db.refresh(another_admin)

    response = client.patch(
        f"/api/v1/admin/access/admin-users/{another_admin.id}/role",
        headers=admin_headers,
        json={"admin_role": "support_agent"},
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["user_id"] == str(another_admin.id)
    assert payload["data"]["admin_role"] == "support_agent"


@pytest.mark.integration
def test_super_admin_cannot_demote_last_super_admin(
    client: TestClient, test_admin: User, admin_headers: dict
):
    """Test guard that prevents removing the last super_admin."""
    response = client.patch(
        f"/api/v1/admin/access/admin-users/{test_admin.id}/role",
        headers=admin_headers,
        json={"admin_role": "support_agent"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "at least one super_admin" in _error_message(response.json()).lower()


# =============================================================================
# PUBLIC ACCESS TESTS
# =============================================================================

@pytest.mark.unit
def test_get_user_public_profile(client: TestClient, test_student: User):
    """Test getting public user profile."""
    response = client.get(f"/api/v1/users/{test_student.id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_student.email
    assert data["phone"] is None  # Phone should be hidden
    assert data["last_login"] is None  # Last login should be hidden


@pytest.mark.unit
def test_cannot_access_protected_endpoint_without_token(client: TestClient):
    """Test that protected endpoints require authentication."""
    response = client.get("/api/v1/users/me")
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED









