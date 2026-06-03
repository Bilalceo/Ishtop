"""
=============================================================================
FASTAPI DEPENDENCIES
=============================================================================

PURPOSE:
    Provides reusable dependencies for FastAPI route handlers.
    Dependencies are injected automatically by FastAPI.

=============================================================================
WHAT ARE DEPENDENCIES?
=============================================================================

Dependencies are functions that run before your route handler.
They can:
- Validate input (tokens, headers)
- Load data (database session, current user)
- Enforce permissions (admin-only routes)

FastAPI's dependency injection is powerful:
- Automatic parameter resolution
- Caching within a request
- Hierarchical dependencies

=============================================================================
USAGE EXAMPLES
=============================================================================

    from app.core.dependencies import get_current_user, get_db
    
    @app.get("/me")
    def get_profile(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        return current_user.to_dict()
    
    # Admin-only route
    @app.delete("/users/{user_id}")
    def delete_user(
        user_id: UUID,
        admin: User = Depends(get_current_admin),  # Enforces admin role
        db: Session = Depends(get_db)
    ):
        ...

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import logging
from typing import Callable, Generator, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# Local imports
from app.database import SessionLocal
from app.models import User, UserRole, AdminSubRole
from app.core.security import (
    verify_token,
    TokenType,
    TokenPayload,
    TokenError,
    TokenExpiredError,
    TokenBlacklistedError,
)
from app.config import settings
from app.core.redis_client import get_redis

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# SECURITY SCHEME
# =============================================================================

# HTTPBearer extracts token from "Authorization: Bearer <token>" header
# We handle missing/invalid tokens ourselves so the API returns consistent 401s.
oauth2_scheme = HTTPBearer(auto_error=False)

# For optional authentication (some routes work with or without auth)
oauth2_scheme_optional = HTTPBearer(auto_error=False)


# =============================================================================
# DATABASE DEPENDENCY
# =============================================================================

def get_db() -> Generator[Session, None, None]:
    """
    Get database session for request.
    
    Creates a new session for each request and ensures it's closed
    after the request completes (even on error).
    
    Yields:
        SQLAlchemy Session
        
    Usage:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# TOKEN EXTRACTION
# =============================================================================

def get_token_payload(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(oauth2_scheme)
) -> TokenPayload:
    """
    Extract and verify JWT token from Authorization header.
    
    Raises:
        HTTPException 401: If token is invalid, expired, or revoked
    """
    token: Optional[str] = credentials.credentials if credentials else None
    if not token:
        cookie_token = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
        if cookie_token:
            token = cookie_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = verify_token(token, expected_type=TokenType.ACCESS)
        return payload
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except TokenBlacklistedError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except TokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_optional_token_payload(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(oauth2_scheme_optional)
) -> Optional[TokenPayload]:
    """
    Optionally extract token payload.
    
    Returns None if no token provided (instead of raising error).
    Useful for routes that work with or without authentication.
    
    Returns:
        TokenPayload if valid token, None otherwise
    """
    token: Optional[str] = credentials.credentials if credentials else None
    if not token:
        token = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    if not token:
        return None
    
    try:
        return verify_token(token, expected_type=TokenType.ACCESS)
    except TokenError:
        return None


# =============================================================================
# USER DEPENDENCIES
# =============================================================================

def get_current_user(
    payload: TokenPayload = Depends(get_token_payload),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user.
    
    Loads user from database based on token subject.
    
    Raises:
        HTTPException 401: If token invalid or user not found
        
    Usage:
        @app.get("/me")
        def get_profile(user: User = Depends(get_current_user)):
            return user.to_dict()
    """
    user_id = payload.user_id
    
    try:
        user = db.query(User).filter(
            User.id == UUID(user_id),
            User.is_deleted == False  # Exclude soft-deleted users
        ).first()
    except ValueError:
        logger.warning(f"Invalid user ID in token: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user:
        logger.warning(f"User not found for token: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    """
    Get current user, ensuring they are active.
    
    Builds on get_current_user, adding active status check.
    
    Raises:
        HTTPException 403: If user is inactive
    """
    if not user.is_active_account:
        logger.warning(f"Inactive user attempted access: {user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )
    
    return user


def get_current_verified_user(
    user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current user, ensuring email is verified.
    
    Raises:
        HTTPException 403: If email not verified
    """
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to access this feature.",
        )
    
    return user


def get_optional_current_user(
    payload: Optional[TokenPayload] = Depends(get_optional_token_payload),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optionally get current user.
    
    Returns None if not authenticated (instead of raising error).
    Useful for routes that show different content for logged-in users.
    
    Usage:
        @app.get("/jobs")
        def list_jobs(user: Optional[User] = Depends(get_optional_current_user)):
            if user:
                # Show personalized recommendations
                pass
            else:
                # Show public listings
                pass
    """
    if not payload:
        return None
    
    try:
        user = db.query(User).filter(
            User.id == UUID(payload.user_id),
            User.is_deleted == False,
            User.is_active_account == True
        ).first()
        return user
    except (ValueError, Exception):
        return None


# =============================================================================
# ROLE-BASED DEPENDENCIES
# =============================================================================

def get_current_admin(
    user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current user, ensuring they are an admin.
    
    Raises:
        HTTPException 403: If user is not an admin
        
    Usage:
        @app.delete("/users/{user_id}")
        def delete_user(
            user_id: UUID,
            admin: User = Depends(get_current_admin)
        ):
            # Only admins can reach here
            ...
    """
    if user.role != UserRole.ADMIN:
        logger.warning(f"Non-admin user attempted admin action: {user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    
    return user


def get_current_super_admin(
    admin: User = Depends(get_current_admin),
) -> User:
    """
    Ensure the current admin has super_admin privileges.
    """
    if admin.effective_admin_role != AdminSubRole.SUPER_ADMIN:
        logger.warning(f"Non-super-admin attempted restricted action: {admin.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )

    return admin


def require_admin_permission(permission: str) -> Callable[..., User]:
    """
    Build a dependency that enforces admin sub-role permission checks.

    Backward compatibility:
    - legacy admins without admin_role are treated as super_admin.
    """

    def _require_permission(
        admin: User = Depends(get_current_admin),
    ) -> User:
        if not admin.has_admin_permission(permission):
            logger.warning(
                "Admin permission denied: user=%s permission=%s role=%s admin_role=%s",
                admin.id,
                permission,
                admin.role.value,
                admin.effective_admin_role.value if admin.effective_admin_role else None,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient admin permissions",
            )
        return admin

    return _require_permission


def get_current_company(
    user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current user, ensuring they are a company account.
    
    Raises:
        HTTPException 403: If user is not a company
        
    Usage:
        @app.post("/jobs")
        def create_job(
            job: JobCreate,
            company: User = Depends(get_current_company)
        ):
            # Only companies can post jobs
            ...
    """
    if user.role not in (UserRole.COMPANY, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company account required to post jobs",
        )
    
    return user


def get_current_student(
    user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current user, ensuring they are a student.
    
    Raises:
        HTTPException 403: If user is not a student
    """
    if user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student account required",
        )
    
    return user


# =============================================================================
# PAGINATION DEPENDENCY
# =============================================================================

class PaginationParams:
    """
    Pagination parameters for list endpoints.
    
    Usage:
        @app.get("/jobs")
        def list_jobs(
            pagination: PaginationParams = Depends()
        ):
            query = db.query(Job)
            query = query.offset(pagination.skip).limit(pagination.limit)
            return query.all()
    """
    
    def __init__(
        self,
        page: int = 1,
        page_size: int = 20,
        # Backward-compatible alias used by older clients/tests.
        limit: int | None = None,
    ):
        """
        Initialize pagination.
        
        Args:
            page: Page number (1-indexed)
            page_size: Items per page (max 100)
        """
        # Validate page
        if page < 1:
            page = 1
        
        # Backward compatibility: accept ?limit= as alias for page_size.
        if limit is not None:
            page_size = limit

        # Validate page_size
        if page_size < 1:
            page_size = 20
        if page_size > 100:
            page_size = 100
        
        self.page = page
        self.page_size = page_size
    
    @property
    def skip(self) -> int:
        """Calculate offset for database query."""
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        """Get limit for database query."""
        return self.page_size


# =============================================================================
# RATE LIMITING (Simple In-Memory Implementation)
# =============================================================================

from collections import defaultdict
from datetime import datetime
import asyncio

# Simple in-memory rate limiter
# In production, use Redis-based rate limiting
_rate_limit_store: dict = defaultdict(list)
_rate_limit_lock = asyncio.Lock()


async def check_rate_limit(
    key: str,
    max_requests: int = 100,
    window_seconds: int = 60
) -> bool:
    """
    Check if rate limit is exceeded.
    
    Simple sliding window implementation.
    In production, use Redis with proper TTL.
    
    Args:
        key: Identifier (e.g., IP address, user ID)
        max_requests: Maximum requests in window
        window_seconds: Time window in seconds
        
    Returns:
        True if allowed, False if rate limited
    """
    now = datetime.now()
    window_start = now - timedelta(seconds=window_seconds)
    
    async with _rate_limit_lock:
        # Clean old entries
        _rate_limit_store[key] = [
            ts for ts in _rate_limit_store[key]
            if ts > window_start
        ]
        
        # Check limit
        if len(_rate_limit_store[key]) >= max_requests:
            return False
        
        # Add current request
        _rate_limit_store[key].append(now)
        return True


from datetime import timedelta


def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """
    Rate limiting dependency factory.

    Usage:
        @app.post("/login")
        async def login(
            _: None = Depends(rate_limit(max_requests=5, window_seconds=60))
        ):
            ...

    Implementation (Stage 2 — R3 follow-up):
    - Identity is resolved from a Bearer token, the project's httpOnly
      access_token cookie, or — last resort — the client IP. This keeps
      cookie-authenticated browser sessions out of the "anonymous" bucket.
    - Buckets are scoped by request path so two endpoints with the same
      (max_requests, window_seconds) budget do not share counters.
    - When settings.RATE_LIMIT_USE_REDIS is true and Redis is healthy, the
      shared RedisRateLimiter is used so limits are consistent across
      gunicorn workers and replicas. Otherwise we fall back to the
      per-process sliding window; in production that fallback emits the
      alertable RATE_LIMIT_REDIS_UNAVAILABLE log (see R3).
    """

    async def rate_limit_dependency(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(oauth2_scheme_optional),
    ):
        # ---- 1. Resolve caller identity ------------------------------------
        identity: Optional[str] = None
        if credentials and credentials.credentials:
            try:
                payload = verify_token(credentials.credentials)
                identity = f"user:{payload.user_id}"
            except TokenError:
                identity = None

        if identity is None:
            # Cookie-only browser auth: the project uses an httpOnly
            # access_token cookie, not Authorization headers, for the web UI.
            cookie_name = getattr(settings, "AUTH_ACCESS_COOKIE_NAME", "access_token")
            cookie_token = request.cookies.get(cookie_name)
            if cookie_token:
                try:
                    payload = verify_token(cookie_token)
                    identity = f"user:{payload.user_id}"
                except TokenError:
                    identity = None

        if identity is None:
            client_ip = request.client.host if request.client else "unknown"
            # Per-IP key (not literal "anonymous") so attackers cannot starve
            # all other anonymous callers from one source.
            identity = f"ip:{client_ip}"

        # ---- 2. Per-route scope (avoid cross-endpoint bucket sharing) ------
        # request.url.path includes the api prefix, e.g. /api/v1/ai/match-job
        route_scope = request.url.path or "unscoped"
        composite_key = f"{route_scope}:{identity}"

        # ---- 3. Redis when available, in-memory otherwise -----------------
        retry_after: Optional[int] = None
        if settings.RATE_LIMIT_USE_REDIS and get_redis():
            from app.core.rate_limiter import redis_rate_limiter

            allowed, retry_after = redis_rate_limiter.check_rate_limit(
                identifier=composite_key,
                max_requests=max_requests,
                window_seconds=window_seconds,
                key_prefix="dep",
            )
        else:
            from app.core.rate_limiter import _warn_rate_limit_fallback

            _warn_rate_limit_fallback("dep")
            allowed = await check_rate_limit(
                composite_key, max_requests, window_seconds
            )

        if not allowed:
            headers = {}
            if retry_after and retry_after > 0:
                headers["Retry-After"] = str(retry_after)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {max_requests} requests per {window_seconds} seconds.",
                headers=headers or None,
            )

    return rate_limit_dependency






















