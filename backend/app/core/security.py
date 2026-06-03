"""
=============================================================================
SECURITY MODULE
=============================================================================

PURPOSE:
    Handles all security-related operations:
    - JWT token creation and verification
    - Password hashing and verification
    - Token blacklisting for logout

=============================================================================
JWT TOKENS EXPLAINED
=============================================================================

WHAT IS JWT?
    JSON Web Token - a compact, URL-safe way to transmit claims.
    Structure: header.payload.signature
    
    Example decoded:
    {
        "sub": "user-uuid-here",       # Subject (user ID)
        "exp": 1701234567,              # Expiration timestamp
        "type": "access",               # Token type
        "iat": 1701234267               # Issued at
    }

TWO TOKEN TYPES:
    1. Access Token:
       - Short-lived (30 minutes)
       - Sent with every API request
       - Contains user ID
       
    2. Refresh Token:
       - Long-lived (7 days)
       - Used only to get new access tokens
       - Stored securely by client

WHY TWO TOKENS?
    - If access token is stolen, it expires quickly
    - Refresh tokens can be revoked (logout)
    - Better security without constant re-login

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import logging
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional, Dict, Union
from uuid import UUID, uuid4

# JWT handling
from jose import jwt, JWTError, ExpiredSignatureError

# Password hashing - use bcrypt directly (passlib 1.7.4 is incompatible with bcrypt 4.x)
import bcrypt as _bcrypt

# Redis for token blacklist (optional, can use in-memory for dev)
from app.core.redis_client import get_redis

# Local imports
from app.config import settings

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# PASSWORD HASHING
# =============================================================================

# NOTE: passlib 1.7.4 is incompatible with bcrypt 4.x (truncate_error bug).
# We bypass passlib entirely and call bcrypt directly for hashing/verification.
# This ensures correct behavior regardless of bcrypt version.

_BCRYPT_ROUNDS = 12


def _truncate_password(password: str) -> bytes:
    """Encode and truncate password to 72 bytes for bcrypt."""
    encoded = password.encode('utf-8')
    return encoded[:72]


def get_password_hash(password: str) -> str:
    """
    Hash a plain text password using bcrypt.
    
    Args:
        password: Plain text password (max 72 bytes used)
        
    Returns:
        Hashed password string (bcrypt format)
    """
    password_bytes = _truncate_password(password)
    salt = _bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    return _bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its bcrypt hash.
    
    Args:
        plain_password: Password to verify
        hashed_password: Stored bcrypt hash
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        plain_bytes = _truncate_password(plain_password)
        hash_bytes = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
        return _bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception:
        return False


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength with simple policy checks.
    """
    if len(password) < 8:
        return False, "Password length must be at least 8 characters"
    if not any(ch.isupper() for ch in password):
        return False, "Password must include an uppercase letter"
    if not any(ch.islower() for ch in password):
        return False, "Password must include a lowercase letter"
    if not any(ch.isdigit() for ch in password):
        return False, "Password must include a number"
    if not any(not ch.isalnum() for ch in password):
        return False, "Password must include a special character"
    return True, None


# =============================================================================
# TOKEN TYPES
# =============================================================================

class TokenType(str, Enum):
    """Token types for JWT."""
    ACCESS = "access"
    REFRESH = "refresh"
    RESET_PASSWORD = "reset_password"
    EMAIL_VERIFICATION = "email_verification"


# =============================================================================
# TOKEN BLACKLIST (In-Memory fallback)
# =============================================================================

# In production, use Redis or database for token blacklist
# This allows proper logout by invalidating tokens

_token_blacklist_jti: set = set()


def _get_token_exp_seconds(token: str) -> int:
    """
    Best-effort TTL extraction from JWT (seconds until exp).
    Returns 0 if missing/invalid.
    """
    try:
        claims = jwt.get_unverified_claims(token)
        exp = claims.get("exp")
        if not exp:
            return 0
        now = int(datetime.now(timezone.utc).timestamp())
        return max(0, int(exp) - now)
    except Exception:
        return 0


def _get_token_jti(token: str) -> Optional[str]:
    try:
        claims = jwt.get_unverified_claims(token)
        jti = claims.get("jti")
        return str(jti) if jti else None
    except Exception:
        return None


def blacklist_token(token: str) -> None:
    """
    Add token to blacklist (for logout).
    
    In production, use Redis with expiration matching token expiry.
    
    Args:
        token: JWT token to blacklist
    """
    jti = _get_token_jti(token)
    if not jti:
        # fallback: nothing to do, but log
        logger.warning("Cannot blacklist token without jti")
        return

    ttl_seconds = _get_token_exp_seconds(token)

    # Prefer Redis in production
    redis_expected = bool(settings.TOKEN_BLACKLIST_USE_REDIS)
    redis_failed = False
    if redis_expected:
        redis_client = get_redis()
        if redis_client:
            try:
                key = f"bl:jti:{jti}"
                if ttl_seconds > 0:
                    redis_client.set(key, "1", ex=ttl_seconds)
                else:
                    redis_client.set(key, "1")
                logger.info("Token blacklisted (redis)")
                return
            except Exception as e:
                redis_failed = True
                logger.warning(f"Redis blacklist failed (fallback to memory): {e}")
        else:
            redis_failed = True

    _token_blacklist_jti.add(jti)
    # In production, falling back to per-worker in-memory means logout does
    # not actually revoke the token across replicas — surface a stable,
    # alertable log line so SRE can wire an alarm without parsing text.
    if redis_expected and redis_failed and not settings.DEBUG:
        logger.error(
            "BLACKLIST_REDIS_UNAVAILABLE: token blacklist fell back to "
            "per-worker memory; logout does not propagate across replicas "
            "(blacklist size on this worker: %d)",
            len(_token_blacklist_jti),
        )
    else:
        logger.info(f"Token blacklisted (memory). Blacklist size: {len(_token_blacklist_jti)}")


def is_token_blacklisted(token: str) -> bool:
    """
    Check if token is blacklisted.
    
    Args:
        token: JWT token to check
        
    Returns:
        True if blacklisted, False otherwise
    """
    jti = _get_token_jti(token)
    if not jti:
        return False

    if settings.TOKEN_BLACKLIST_USE_REDIS:
        redis_client = get_redis()
        if redis_client:
            try:
                return bool(redis_client.exists(f"bl:jti:{jti}"))
            except Exception as e:
                if not settings.DEBUG:
                    logger.error(
                        "BLACKLIST_REDIS_UNAVAILABLE: blacklist check fell "
                        "back to per-worker memory; tokens revoked on other "
                        "workers will be accepted here: %s",
                        e,
                    )
                else:
                    logger.warning(f"Redis blacklist check failed (fallback): {e}")

    return jti in _token_blacklist_jti


def clear_expired_from_blacklist() -> None:
    """
    Clean up expired tokens from blacklist.
    
    Should be run periodically (e.g., by a background task).
    In production, Redis TTL handles this automatically.
    """
    # In-memory implementation doesn't track expiry
    # For production, implement with Redis or database
    pass


# =============================================================================
# JWT TOKEN CREATION
# =============================================================================

def create_access_token(
    subject: Union[str, UUID, None] = None,
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Create a new access token.
    
    Access tokens are short-lived and used for API authentication.
    
    Args:
        subject: User ID (typically UUID as string)
        expires_delta: Custom expiration time
        additional_claims: Extra data to include in token
        
    Returns:
        Encoded JWT token string
        
    Example:
        token = create_access_token(
            subject=str(user.id),
            additional_claims={"role": "admin"}
        )
    """
    # Backward compatibility: accept create_access_token(data={"sub": ...})
    claims_from_data: Dict[str, Any] = {}
    if data is not None:
        claims_from_data = {k: v for k, v in data.items() if k != "sub"}
        if subject is None:
            subject = data.get("sub")

    if subject is None:
        raise ValueError("subject is required")

    merged_claims: Dict[str, Any] = {}
    if claims_from_data:
        merged_claims.update(claims_from_data)
    if additional_claims:
        merged_claims.update(additional_claims)

    # Set expiration
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    # Build payload
    to_encode = {
        "sub": str(subject),           # Subject (user ID)
        "exp": expire,                  # Expiration
        "iat": datetime.now(timezone.utc),  # Issued at
        "type": TokenType.ACCESS.value,     # Token type
        "jti": uuid4().hex,                 # Unique token id (for blacklist/logout)
    }
    
    # Add any additional claims
    if merged_claims:
        to_encode.update(merged_claims)
    
    # Encode token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    logger.debug(f"Created access token for subject: {subject}")
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, UUID, None] = None,
    expires_delta: Optional[timedelta] = None,
    data: Optional[Dict[str, Any]] = None,
    additional_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Create a new refresh token.
    
    Refresh tokens are long-lived and used only to get new access tokens.
    
    Args:
        subject: User ID
        expires_delta: Custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    # Backward compatibility: accept create_refresh_token(data={"sub": ...})
    claims_from_data: Dict[str, Any] = {}
    if data is not None:
        claims_from_data = {k: v for k, v in data.items() if k != "sub"}
        if subject is None:
            subject = data.get("sub")

    if subject is None:
        raise ValueError("subject is required")

    merged_claims: Dict[str, Any] = {}
    if claims_from_data:
        merged_claims.update(claims_from_data)
    if additional_claims:
        merged_claims.update(additional_claims)

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": TokenType.REFRESH.value,
        "jti": uuid4().hex,
    }

    if merged_claims:
        to_encode.update(merged_claims)
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    logger.debug(f"Created refresh token for subject: {subject}")
    return encoded_jwt


def create_reset_password_token(email: str) -> str:
    """
    Create a password reset token.
    
    Short-lived (1 hour) and contains email for verification.
    
    Args:
        email: User's email address
        
    Returns:
        Encoded JWT token
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    
    to_encode = {
        "sub": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": TokenType.RESET_PASSWORD.value,
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    logger.info(f"Created password reset token for: {email[:3]}***")
    return encoded_jwt


def create_email_verification_token(email: str) -> str:
    """
    Create an email verification token.
    
    Valid for 24 hours.
    
    Args:
        email: Email to verify
        
    Returns:
        Encoded JWT token
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    
    to_encode = {
        "sub": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": TokenType.EMAIL_VERIFICATION.value,
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    logger.info(f"Created email verification token for: {email[:3]}***")
    return encoded_jwt


# =============================================================================
# JWT TOKEN VERIFICATION
# =============================================================================

class TokenPayload:
    """
    Decoded token payload.
    
    Provides structured access to token claims.
    """
    
    def __init__(
        self,
        sub: str,
        exp: datetime,
        iat: datetime,
        token_type: TokenType,
        **additional_claims
    ):
        self.sub = sub                  # Subject (user ID or email)
        self.exp = exp                  # Expiration
        self.iat = iat                  # Issued at
        self.token_type = token_type    # Token type
        self.additional_claims = additional_claims
    
    @property
    def user_id(self) -> str:
        """Get user ID from subject."""
        return self.sub
    
    @property
    def is_expired(self) -> bool:
        """Check if token is expired."""
        return datetime.now(timezone.utc) > self.exp


class TokenError(Exception):
    """Base exception for token errors."""
    pass


class TokenExpiredError(TokenError):
    """Token has expired."""
    pass


class TokenInvalidError(TokenError):
    """Token is invalid or malformed."""
    pass


class TokenBlacklistedError(TokenError):
    """Token has been revoked."""
    pass


class TokenTypeMismatchError(TokenError):
    """Wrong token type for operation."""
    pass


def verify_token(
    token: str,
    expected_type: Optional[TokenType] = None,
    check_blacklist: bool = True
) -> TokenPayload:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
        expected_type: Expected token type (optional)
        check_blacklist: Whether to check token blacklist
        
    Returns:
        TokenPayload with decoded claims
        
    Raises:
        TokenExpiredError: If token has expired
        TokenInvalidError: If token is malformed
        TokenBlacklistedError: If token was revoked
        TokenTypeMismatchError: If token type doesn't match
        
    Example:
        try:
            payload = verify_token(token, TokenType.ACCESS)
            user_id = payload.user_id
        except TokenExpiredError:
            # Handle expired token
            pass
    """
    try:
        # Decode token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        # Extract claims
        sub = payload.get("sub")
        exp = payload.get("exp")
        iat = payload.get("iat")
        token_type = payload.get("type")
        jti = payload.get("jti")
        
        if not sub:
            raise TokenInvalidError("Token missing subject")
        
        # Convert timestamps
        exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None
        iat_dt = datetime.fromtimestamp(iat, tz=timezone.utc) if iat else None
        
        # Convert token type
        try:
            token_type_enum = TokenType(token_type) if token_type else TokenType.ACCESS
        except ValueError:
            raise TokenInvalidError(f"Invalid token type: {token_type}")
        
        # Verify token type if specified
        if expected_type and token_type_enum != expected_type:
            raise TokenTypeMismatchError(
                f"Expected {expected_type.value} token, got {token_type_enum.value}"
            )

        # Check blacklist after signature verification (avoid trusting unverified claims)
        if check_blacklist:
            # If token has jti, check by jti; else fallback to legacy behavior
            if jti:
                if settings.TOKEN_BLACKLIST_USE_REDIS:
                    redis_client = get_redis()
                    if redis_client:
                        try:
                            if redis_client.exists(f"bl:jti:{jti}"):
                                raise TokenBlacklistedError("Token has been revoked")
                        except TokenBlacklistedError:
                            raise
                        except Exception as e:
                            logger.warning(f"Redis blacklist check failed: {e}")
                if jti in _token_blacklist_jti:
                    raise TokenBlacklistedError("Token has been revoked")
            else:
                if is_token_blacklisted(token):
                    raise TokenBlacklistedError("Token has been revoked")
        
        # Build payload object
        return TokenPayload(
            sub=sub,
            exp=exp_dt,
            iat=iat_dt,
            token_type=token_type_enum,
            **{k: v for k, v in payload.items() 
               if k not in ["sub", "exp", "iat", "type"]}
        )
        
    except ExpiredSignatureError:
        logger.debug("Token verification failed: expired")
        raise TokenExpiredError("Token has expired")
    except JWTError as e:
        logger.warning(f"Token verification failed: {e}")
        raise TokenInvalidError(f"Invalid token: {e}")


def verify_reset_password_token(token: str) -> str:
    """
    Verify password reset token and return email.
    
    Args:
        token: Reset token
        
    Returns:
        Email address from token
        
    Raises:
        TokenError: If token is invalid
    """
    payload = verify_token(
        token,
        expected_type=TokenType.RESET_PASSWORD,
        check_blacklist=False
    )
    return payload.sub


def verify_email_verification_token(token: str) -> str:
    """
    Verify email verification token and return email.
    
    Args:
        token: Verification token
        
    Returns:
        Email address from token
        
    Raises:
        TokenError: If token is invalid
    """
    payload = verify_token(
        token,
        expected_type=TokenType.EMAIL_VERIFICATION,
        check_blacklist=False
    )
    return payload.sub


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode JWT payload and return raw claims.

    Compatibility helper for legacy tests and call sites that expect
    jose.JWTError exceptions to bubble up on invalid/expired tokens.
    """
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    # Numeric exp/iat claims are already UTC Unix timestamps — no offset needed.
    if isinstance(payload.get("exp"), (int, float)):
        payload["exp"] = int(payload["exp"])
    if isinstance(payload.get("iat"), (int, float)):
        payload["iat"] = int(payload["iat"])
    return payload





















