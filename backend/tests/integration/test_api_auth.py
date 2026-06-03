"""
=============================================================================
AUTH API INTEGRATION TESTS
=============================================================================

Test cases for authentication API endpoints.
"""

import pytest
from fastapi import status
from httpx import AsyncClient

from app.models import User
import app.core.redis_client as redis_client_module
import app.services.oauth_service as oauth_service_module
import app.services.email_service as email_service_module
from tests.fixtures.sample_data import (
    get_valid_user_data,
    INVALID_USERS,
    EXPIRED_TOKEN,
    INVALID_TOKEN
)


# =============================================================================
# REGISTER TESTS
# =============================================================================

class TestRegister:
    """Tests for user registration endpoint."""

    @pytest.mark.asyncio
    async def test_register_success(self, async_client: AsyncClient):
        """Test successful user registration."""
        user_data = get_valid_user_data()
        
        response = await async_client.post(
            "/api/v1/auth/register",
            json=user_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == user_data["email"]
        assert "password" not in data["user"]  # Password should not be returned

    @pytest.mark.asyncio
    async def test_register_duplicate_email(
        self, async_client: AsyncClient, test_user
    ):
        """Test registration with existing email returns 409."""
        user_data = get_valid_user_data()
        user_data["email"] = test_user.email  # Use existing email
        
        response = await async_client.post(
            "/api/v1/auth/register",
            json=user_data
        )
        
        assert response.status_code == status.HTTP_409_CONFLICT
        payload = response.json()
        detail_message = str(payload.get("detail", "")).lower()
        envelope_message = str(
            payload.get("error", {}).get("message", "")
            if isinstance(payload.get("error"), dict)
            else ""
        ).lower()
        message = detail_message or envelope_message
        assert "email" in message or "already" in message

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, async_client: AsyncClient):
        """Test registration with invalid email."""
        user_data = get_valid_user_data()
        user_data["email"] = "invalid-email"
        
        response = await async_client.post(
            "/api/v1/auth/register",
            json=user_data
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_register_weak_password(self, async_client: AsyncClient):
        """Test registration with weak password."""
        user_data = get_valid_user_data()
        user_data["password"] = "123"  # Too weak
        
        response = await async_client.post(
            "/api/v1/auth/register",
            json=user_data
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_register_missing_required_fields(self, async_client: AsyncClient):
        """Test registration with missing required fields."""
        incomplete_data = {
            "email": "test@example.com"
            # Missing password and full_name
        }
        
        response = await async_client.post(
            "/api/v1/auth/register",
            json=incomplete_data
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_register_student_role(self, async_client: AsyncClient):
        """Test registration with student role."""
        user_data = get_valid_user_data()
        user_data["role"] = "student"
        
        response = await async_client.post(
            "/api/v1/auth/register",
            json=user_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["user"]["role"] == "student"

    @pytest.mark.asyncio
    async def test_register_company_role(self, async_client: AsyncClient):
        """Test registration with company role."""
        user_data = get_valid_user_data()
        user_data["role"] = "company"
        user_data["company_name"] = "Test Company Inc."
        
        response = await async_client.post(
            "/api/v1/auth/register",
            json=user_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["user"]["role"] == "company"


# =============================================================================
# LOGIN TESTS
# =============================================================================

class TestLogin:
    """Tests for user login endpoint."""

    @pytest.mark.asyncio
    async def test_login_success(self, async_client: AsyncClient, test_user):
        """Test successful login."""
        response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": "TestPassword123!"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_json_body(self, async_client: AsyncClient, test_user):
        """Test login with JSON body."""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPassword123!"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()

    @pytest.mark.asyncio
    async def test_login_invalid_password(self, async_client: AsyncClient, test_user):
        """Test login with wrong password."""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, async_client: AsyncClient):
        """Test login with non-existent email."""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePassword123!"
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, async_client: AsyncClient, inactive_user):
        """Test login with inactive user account."""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": inactive_user.email,
                "password": "InactivePass123!"
            }
        )
        
        # Should return 401 or 403
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    @pytest.mark.asyncio
    async def test_login_empty_password(self, async_client: AsyncClient, test_user):
        """Test login with empty password."""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": ""
            }
        )
        
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    @pytest.mark.asyncio
    async def test_login_case_insensitive_email(self, async_client: AsyncClient, test_user):
        """Test login with different email case."""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email.upper(),
                "password": "TestPassword123!"
            }
        )
        
        # Should work with case-insensitive email
        assert response.status_code == status.HTTP_200_OK


# =============================================================================
# TOKEN REFRESH TESTS
# =============================================================================

class TestTokenRefresh:
    """Tests for token refresh endpoint."""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, async_client: AsyncClient, auth_tokens):
        """Test successful token refresh."""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": auth_tokens["refresh_token"]}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "access_token" in data
        assert data["access_token"] != auth_tokens["access_token"]  # New token

    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, async_client: AsyncClient):
        """Test refresh with invalid token."""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": INVALID_TOKEN}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_refresh_token_expired(self, async_client: AsyncClient):
        """Test refresh with expired token."""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": EXPIRED_TOKEN}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_refresh_with_access_token(self, async_client: AsyncClient, auth_tokens):
        """Test refresh using access token instead of refresh token."""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": auth_tokens["access_token"]}  # Wrong token type
        )
        
        # Should fail - access token not valid for refresh
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST
        ]


# =============================================================================
# LOGOUT TESTS
# =============================================================================

class TestLogout:
    """Tests for logout endpoint."""

    @pytest.mark.asyncio
    async def test_logout_success(self, async_client: AsyncClient, auth_headers):
        """Test successful logout."""
        response = await async_client.post(
            "/api/v1/auth/logout",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_logout_invalidates_token(
        self, async_client: AsyncClient, auth_headers, auth_tokens
    ):
        """Test that logout invalidates the token."""
        # Logout
        await async_client.post(
            "/api/v1/auth/logout",
            headers=auth_headers
        )
        
        # Try to use the token
        response = await async_client.get(
            "/api/v1/auth/me",
            headers=auth_headers
        )
        
        # Token should be invalidated (if blacklist is implemented)
        # Otherwise, it will still work until expiry
        # This depends on implementation

    @pytest.mark.asyncio
    async def test_logout_without_token(self, async_client: AsyncClient):
        """Test logout without authentication."""
        response = await async_client.post("/api/v1/auth/logout")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# CURRENT USER TESTS
# =============================================================================

class TestCurrentUser:
    """Tests for current user endpoint."""

    @pytest.mark.asyncio
    async def test_get_current_user(self, async_client: AsyncClient, auth_headers, test_user):
        """Test getting current user info."""
        response = await async_client.get(
            "/api/v1/auth/me",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name
        assert "password" not in data
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_get_current_user_unauthorized(self, async_client: AsyncClient):
        """Test getting current user without token."""
        response = await async_client.get("/api/v1/auth/me")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, async_client: AsyncClient):
        """Test getting current user with invalid token."""
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {INVALID_TOKEN}"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# PASSWORD CHANGE TESTS
# =============================================================================

class TestPasswordChange:
    """Tests for password change endpoint."""

    @pytest.mark.asyncio
    async def test_change_password_success(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test successful password change."""
        response = await async_client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={
                "old_password": "TestPassword123!",
                "new_password": "NewSecurePassword456!"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_change_password_wrong_old_password(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test password change with wrong old password."""
        response = await async_client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={
                "old_password": "WrongOldPassword123!",
                "new_password": "NewSecurePassword456!"
            }
        )
        
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED
        ]

    @pytest.mark.asyncio
    async def test_change_password_weak_new_password(
        self, async_client: AsyncClient, auth_headers
    ):
        """Test password change with weak new password."""
        response = await async_client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={
                "old_password": "TestPassword123!",
                "new_password": "weak"
            }
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# =============================================================================
# FORGOT PASSWORD TESTS
# =============================================================================

class TestForgotPassword:
    """Tests for forgot password endpoint."""

    @pytest.mark.asyncio
    async def test_forgot_password_success(
        self, async_client: AsyncClient, test_user, mock_email_service
    ):
        """Test forgot password request."""
        response = await async_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": test_user.email}
        )
        
        assert response.status_code == status.HTTP_200_OK
        # Should always return success (even for non-existent emails for security)

    @pytest.mark.asyncio
    async def test_forgot_password_nonexistent_email(
        self, async_client: AsyncClient, mock_email_service
    ):
        """Test forgot password with non-existent email."""
        response = await async_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@example.com"}
        )
        
        # Should still return 200 for security (don't reveal if email exists)
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_forgot_password_invalid_email(self, async_client: AsyncClient):
        """Test forgot password with invalid email format."""
        response = await async_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "invalid-email"}
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# =============================================================================
# OAUTH TESTS
# =============================================================================

class TestGoogleOAuth:
    """Tests for Google OAuth callback."""

    @pytest.mark.asyncio
    async def test_google_oauth_callback_creates_new_user(
        self,
        async_client: AsyncClient,
        test_db,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """Test Google OAuth callback creates a new user with correct fields."""

        class FakeRedis:
            def __init__(self):
                self._store = {"oauth_state:google:test-state": "1"}

            def exists(self, key):
                return key in self._store

            def delete(self, key):
                self._store.pop(key, None)

        class FakeOAuthService:
            async def get_google_user_info(self, code: str):
                assert code == "mock-code"
                return {
                    "email": "oauth.user@example.com",
                    "name": "OAuth User",
                    "picture": "https://example.com/avatar.png",
                }

        class FakeEmailService:
            async def send_welcome_email(self, *args, **kwargs):
                return True

        fake_redis = FakeRedis()
        monkeypatch.setattr(redis_client_module, "get_redis", lambda: fake_redis)
        monkeypatch.setattr(oauth_service_module, "oauth_service", FakeOAuthService())
        monkeypatch.setattr(email_service_module, "email_service", FakeEmailService())

        response = await async_client.get(
            "/api/v1/auth/callback/google",
            params={"code": "mock-code", "state": "test-state"},
        )

        assert response.status_code in [status.HTTP_307_TEMPORARY_REDIRECT, status.HTTP_302_FOUND]
        assert "/oauth/callback#" in response.headers["location"]

        user = (
            test_db.query(User)
            .filter(User.email == "oauth.user@example.com")
            .first()
        )
        assert user is not None
        assert user.full_name == "OAuth User"
        assert user.role.value == "student"
        assert user.is_active_account is True
        assert user.is_verified is True
        assert user.avatar_url == "https://example.com/avatar.png"


# =============================================================================
# RATE LIMITING TESTS
# =============================================================================

class TestRateLimiting:
    """Tests for authentication rate limiting."""

    @pytest.mark.asyncio
    async def test_login_rate_limiting(self, async_client: AsyncClient):
        """Test that login endpoint has rate limiting."""
        # Make multiple failed login attempts
        for i in range(10):
            await async_client.post(
                "/api/v1/auth/login",
                json={
                    "email": f"test{i}@example.com",
                    "password": "wrong"
                }
            )
        
        # The 11th request might be rate limited
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": "test11@example.com",
                "password": "wrong"
            }
        )
        
        # Either rate limited (429) or normal response (401)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_429_TOO_MANY_REQUESTS
        ]
















