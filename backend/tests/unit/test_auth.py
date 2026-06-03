"""
=============================================================================
AUTHENTICATION UNIT TESTS
=============================================================================

Test cases for authentication logic, password hashing, and token operations.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from jose import jwt, JWTError

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    validate_password_strength
)
from app.core.config import settings


# =============================================================================
# PASSWORD HASHING TESTS
# =============================================================================

class TestPasswordHashing:
    """Tests for password hashing and verification."""

    def test_password_hash_creates_hash(self):
        """Test that password hashing creates a hash."""
        password = "SecurePassword123!"
        hashed = get_password_hash(password)
        
        assert hashed is not None
        assert hashed != password
        assert len(hashed) > 20

    def test_password_hash_is_different_each_time(self):
        """Test that same password produces different hashes (salt)."""
        password = "SamePassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        assert hash1 != hash2  # Different salts

    def test_verify_password_correct(self):
        """Test that correct password is verified."""
        password = "CorrectPassword123!"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test that incorrect password fails verification."""
        password = "CorrectPassword123!"
        wrong_password = "WrongPassword456!"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False

    def test_verify_password_empty(self):
        """Test verification with empty password."""
        hashed = get_password_hash("SomePassword123!")
        
        assert verify_password("", hashed) is False

    def test_verify_password_unicode(self):
        """Test verification with unicode characters."""
        password = "пароль123!日本語"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
        assert verify_password("different", hashed) is False


# =============================================================================
# PASSWORD STRENGTH TESTS
# =============================================================================

class TestPasswordStrength:
    """Tests for password strength validation."""

    def test_strong_password_passes(self):
        """Test that strong password passes validation."""
        strong_passwords = [
            "SecureP@ssw0rd123",
            "MyStr0ng!Pass",
            "Complex#Password1",
            "Ab1!cdefghij"
        ]
        
        for password in strong_passwords:
            is_valid, _ = validate_password_strength(password)
            assert is_valid is True, f"Password {password} should be valid"

    def test_weak_password_fails(self):
        """Test that weak passwords fail validation."""
        weak_passwords = [
            "123",              # Too short
            "password",         # No uppercase, numbers, special chars
            "PASSWORD",         # No lowercase, numbers, special chars
            "Password1",        # No special chars
            "Pass@word",        # No numbers
        ]
        
        for password in weak_passwords:
            is_valid, message = validate_password_strength(password)
            assert is_valid is False, f"Password {password} should be invalid"
            assert message is not None

    def test_password_minimum_length(self):
        """Test password minimum length requirement."""
        short_password = "Ab1!"
        is_valid, message = validate_password_strength(short_password)
        
        assert is_valid is False
        assert "length" in message.lower() or "short" in message.lower()

    def test_password_requires_uppercase(self):
        """Test that password requires uppercase letter."""
        no_upper = "password123!"
        is_valid, message = validate_password_strength(no_upper)
        
        assert is_valid is False

    def test_password_requires_lowercase(self):
        """Test that password requires lowercase letter."""
        no_lower = "PASSWORD123!"
        is_valid, message = validate_password_strength(no_lower)
        
        assert is_valid is False

    def test_password_requires_number(self):
        """Test that password requires a number."""
        no_number = "PasswordStrong!"
        is_valid, message = validate_password_strength(no_number)
        
        assert is_valid is False

    def test_password_requires_special_char(self):
        """Test that password requires special character."""
        no_special = "Password123"
        is_valid, message = validate_password_strength(no_special)
        
        assert is_valid is False


# =============================================================================
# ACCESS TOKEN TESTS
# =============================================================================

class TestAccessToken:
    """Tests for access token creation and validation."""

    def test_create_access_token_returns_string(self):
        """Test that access token creation returns a string."""
        token = create_access_token(data={"sub": "user-123"})
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 50

    def test_access_token_contains_user_id(self):
        """Test that access token contains user ID."""
        user_id = "user-123"
        token = create_access_token(data={"sub": user_id})
        
        payload = decode_token(token)
        
        assert payload is not None
        assert payload.get("sub") == user_id

    def test_access_token_has_expiration(self):
        """Test that access token has expiration time."""
        token = create_access_token(data={"sub": "user-123"})
        payload = decode_token(token)
        
        assert "exp" in payload
        exp_time = datetime.utcfromtimestamp(payload["exp"])
        assert exp_time > datetime.utcnow()

    def test_access_token_custom_expiration(self):
        """Test access token with custom expiration."""
        custom_delta = timedelta(hours=1)
        token = create_access_token(
            data={"sub": "user-123"},
            expires_delta=custom_delta
        )
        
        payload = decode_token(token)
        exp_time = datetime.utcfromtimestamp(payload["exp"])
        expected_exp = datetime.utcnow() + custom_delta
        
        # Allow 10 second tolerance
        assert abs((exp_time - expected_exp).total_seconds()) < 10

    def test_access_token_with_additional_data(self):
        """Test access token with additional claims."""
        token = create_access_token(data={
            "sub": "user-123",
            "role": "admin",
            "permissions": ["read", "write"]
        })
        
        payload = decode_token(token)
        
        assert payload.get("role") == "admin"
        assert payload.get("permissions") == ["read", "write"]


# =============================================================================
# REFRESH TOKEN TESTS
# =============================================================================

class TestRefreshToken:
    """Tests for refresh token creation and validation."""

    def test_create_refresh_token_returns_string(self):
        """Test that refresh token creation returns a string."""
        token = create_refresh_token(data={"sub": "user-123"})
        
        assert token is not None
        assert isinstance(token, str)

    def test_refresh_token_longer_expiration(self):
        """Test that refresh token has longer expiration than access token."""
        access_token = create_access_token(data={"sub": "user-123"})
        refresh_token = create_refresh_token(data={"sub": "user-123"})
        
        access_payload = decode_token(access_token)
        refresh_payload = decode_token(refresh_token)
        
        access_exp = access_payload.get("exp")
        refresh_exp = refresh_payload.get("exp")
        
        assert refresh_exp > access_exp

    def test_refresh_token_contains_user_id(self):
        """Test that refresh token contains user ID."""
        user_id = "user-456"
        token = create_refresh_token(data={"sub": user_id})
        payload = decode_token(token)
        
        assert payload.get("sub") == user_id


# =============================================================================
# TOKEN DECODING TESTS
# =============================================================================

class TestTokenDecoding:
    """Tests for token decoding and validation."""

    def test_decode_valid_token(self):
        """Test decoding a valid token."""
        token = create_access_token(data={"sub": "user-123"})
        payload = decode_token(token)
        
        assert payload is not None
        assert payload.get("sub") == "user-123"

    def test_decode_expired_token(self):
        """Test decoding an expired token."""
        # Create token that expired in the past
        expired_token = create_access_token(
            data={"sub": "user-123"},
            expires_delta=timedelta(seconds=-1)
        )
        
        with pytest.raises(JWTError):
            decode_token(expired_token)

    def test_decode_invalid_token(self):
        """Test decoding an invalid token."""
        invalid_token = "invalid.token.here"
        
        with pytest.raises(JWTError):
            decode_token(invalid_token)

    def test_decode_malformed_token(self):
        """Test decoding a malformed token."""
        malformed_token = "not-even-a-jwt"
        
        with pytest.raises(JWTError):
            decode_token(malformed_token)

    def test_decode_token_wrong_secret(self):
        """Test decoding token signed with wrong secret."""
        # Create token with different secret
        wrong_secret_token = jwt.encode(
            {"sub": "user-123", "exp": datetime.utcnow() + timedelta(hours=1)},
            "wrong-secret-key",
            algorithm="HS256"
        )
        
        with pytest.raises(JWTError):
            decode_token(wrong_secret_token)

    def test_decode_empty_token(self):
        """Test decoding empty token."""
        with pytest.raises((JWTError, ValueError)):
            decode_token("")

    def test_decode_none_token(self):
        """Test decoding None token."""
        with pytest.raises((JWTError, TypeError, AttributeError)):
            decode_token(None)


# =============================================================================
# TOKEN TYPE TESTS
# =============================================================================

class TestTokenTypes:
    """Tests for distinguishing token types."""

    def test_access_token_type_claim(self):
        """Test that access token has correct type claim."""
        token = create_access_token(data={"sub": "user-123"})
        payload = decode_token(token)
        
        # If type is included in token
        if "type" in payload:
            assert payload.get("type") == "access"

    def test_refresh_token_type_claim(self):
        """Test that refresh token has correct type claim."""
        token = create_refresh_token(data={"sub": "user-123"})
        payload = decode_token(token)
        
        # If type is included in token
        if "type" in payload:
            assert payload.get("type") == "refresh"


# =============================================================================
# EDGE CASES
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_very_long_user_id(self):
        """Test token with very long user ID."""
        long_id = "user-" + "a" * 1000
        token = create_access_token(data={"sub": long_id})
        payload = decode_token(token)
        
        assert payload.get("sub") == long_id

    def test_special_characters_in_user_id(self):
        """Test token with special characters in user ID."""
        special_id = "user+test@example.com"
        token = create_access_token(data={"sub": special_id})
        payload = decode_token(token)
        
        assert payload.get("sub") == special_id

    def test_unicode_in_payload(self):
        """Test token with unicode characters in payload."""
        token = create_access_token(data={
            "sub": "user-123",
            "name": "Тест Юзер 日本語"
        })
        payload = decode_token(token)
        
        assert "Тест" in payload.get("name", "")

    def test_nested_data_in_payload(self):
        """Test token with nested data in payload."""
        token = create_access_token(data={
            "sub": "user-123",
            "metadata": {
                "level": 1,
                "permissions": ["read", "write"]
            }
        })
        payload = decode_token(token)
        
        assert payload.get("metadata", {}).get("level") == 1

    def test_null_values_in_payload(self):
        """Test token with null values in payload."""
        token = create_access_token(data={
            "sub": "user-123",
            "optional_field": None
        })
        payload = decode_token(token)
        
        assert payload.get("optional_field") is None


# =============================================================================
# SECURITY TESTS
# =============================================================================

class TestSecurityMeasures:
    """Tests for security-related functionality."""

    def test_tokens_are_different_for_same_user(self):
        """Test that tokens generated for same user are different."""
        token1 = create_access_token(data={"sub": "user-123"})
        token2 = create_access_token(data={"sub": "user-123"})
        
        # Tokens should differ due to timestamp/jti
        assert token1 != token2

    def test_password_not_in_token(self):
        """Test that password is never included in token."""
        token = create_access_token(data={
            "sub": "user-123",
            "email": "test@example.com"
        })
        
        # Token should not contain password
        assert "password" not in token.lower()
        
        payload = decode_token(token)
        assert "password" not in payload

    def test_hash_not_reversible(self):
        """Test that password hash is not reversible."""
        password = "SecretPassword123!"
        hashed = get_password_hash(password)
        
        # Hash should not contain original password
        assert password not in hashed

    def test_timing_safe_comparison(self):
        """Test that password verification uses timing-safe comparison."""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        # Both should complete in similar time (basic check)
        import time
        
        start1 = time.time()
        verify_password(password, hashed)
        time1 = time.time() - start1
        
        start2 = time.time()
        verify_password("x" * len(password), hashed)
        time2 = time.time() - start2
        
        # Times should be roughly similar (within 10x)
        assert time1 < time2 * 10 and time2 < time1 * 10
















