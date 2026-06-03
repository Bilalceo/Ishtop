"""
=============================================================================
Authentication Tests
=============================================================================

Tests for authentication endpoints:
- Registration
- Login
- Token refresh
- Password reset
- Rate limiting

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.models import User


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
# REGISTRATION TESTS
# =============================================================================

@pytest.mark.auth
def test_register_student_success(client: TestClient):
    """Test successful student registration."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newstudent@example.com",
            "password": "SecurePass123!",
            "full_name": "New Student",
            "phone": "+998901111111",
            "role": "student",
        }
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data.get("token_type") == "bearer"
    assert data["user"]["email"] == "newstudent@example.com"
    assert data["user"]["role"] == "student"


@pytest.mark.auth
def test_register_company_success(client: TestClient):
    """Test successful company registration."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newcompany@example.com",
            "password": "SecurePass123!",
            "full_name": "New Company HR",
            "phone": "+998902222222",
            "role": "company",
            "company_name": "New Company",
            "company_website": "https://newcompany.com",
        }
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["user"]["role"] == "company"
    assert data["user"]["company_name"] == "New Company"


@pytest.mark.auth
def test_register_duplicate_email(client: TestClient, test_student: User):
    """Test registration with existing email fails."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_student.email,
            "password": "SecurePass123!",
            "full_name": "Duplicate User",
            "role": "student",
        }
    )
    
    assert response.status_code == status.HTTP_409_CONFLICT
    assert "already exists" in _error_message(response.json()).lower()


@pytest.mark.auth
def test_register_weak_password(client: TestClient):
    """Test registration with weak password fails."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "weak",
            "full_name": "New User",
            "role": "student",
        }
    )
    
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.auth
def test_register_invalid_email(client: TestClient):
    """Test registration with invalid email fails."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "notanemail",
            "password": "SecurePass123!",
            "full_name": "New User",
            "role": "student",
        }
    )
    
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# =============================================================================
# LOGIN TESTS
# =============================================================================

@pytest.mark.auth
def test_login_success(client: TestClient, test_student: User):
    """Test successful login."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_student.email,
            "password": "TestPassword123!",
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == test_student.email


@pytest.mark.auth
def test_login_invalid_password(client: TestClient, test_student: User):
    """Test login with wrong password fails."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_student.email,
            "password": "WrongPassword123!",
        }
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "invalid" in _error_message(response.json()).lower()


@pytest.mark.auth
def test_login_nonexistent_user(client: TestClient):
    """Test login with non-existent email fails."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "SomePassword123!",
        }
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.auth
@pytest.mark.slow
def test_login_rate_limiting(client: TestClient, test_student: User):
    """Test brute-force protection / lockout after failed login attempts."""
    # Make 6 failed login attempts (account locks after 5)
    for i in range(6):
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_student.email,
                "password": "WrongPassword!",
            }
        )
        
        if i < 4:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        elif i == 4:
            # 5th failed attempt locks the account (brute-force protection)
            assert response.status_code == status.HTTP_403_FORBIDDEN
        else:
            # Additional attempts are rate limited
            assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


# =============================================================================
# TOKEN REFRESH TESTS
# =============================================================================

@pytest.mark.auth
def test_refresh_token_success(client: TestClient, test_student: User):
    """Test successful token refresh."""
    # Login first
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_student.email,
            "password": "TestPassword123!",
        }
    )
    refresh_token = login_response.json()["refresh_token"]
    
    # Refresh token
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.auth
def test_refresh_token_invalid(client: TestClient):
    """Test refresh with invalid token fails."""
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid_token"}
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# LOGOUT TESTS
# =============================================================================

@pytest.mark.auth
def test_logout_success(client: TestClient, test_student: User, student_headers: dict):
    """Test successful logout."""
    response = client.post(
        "/api/v1/auth/logout",
        headers=student_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True


@pytest.mark.auth
def test_logout_without_token(client: TestClient):
    """Test logout without token fails."""
    response = client.post("/api/v1/auth/logout")
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# PASSWORD RESET TESTS
# =============================================================================

@pytest.mark.auth
def test_forgot_password_success(client: TestClient, test_student: User):
    """Test forgot password request."""
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": test_student.email}
    )
    
    # Always returns success to prevent email enumeration
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True


@pytest.mark.auth
def test_forgot_password_nonexistent_email(client: TestClient):
    """Test forgot password with non-existent email."""
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent@example.com"}
    )
    
    # Still returns success to prevent email enumeration
    assert response.status_code == status.HTTP_200_OK


# =============================================================================
# ME ENDPOINT TESTS
# =============================================================================

@pytest.mark.auth
def test_get_current_user(client: TestClient, test_student: User, student_headers: dict):
    """Test getting current user info."""
    response = client.get(
        "/api/v1/auth/me",
        headers=student_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_student.email
    assert data["role"] == test_student.role.value


@pytest.mark.auth
def test_get_current_user_without_token(client: TestClient):
    """Test getting current user without token fails."""
    response = client.get("/api/v1/auth/me")
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED









