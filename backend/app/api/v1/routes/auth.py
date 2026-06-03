"""
=============================================================================
AUTHENTICATION ENDPOINTS
=============================================================================

Handles user registration, login, logout, and password management.

ENDPOINTS:
    POST /register      - Create new account
    POST /login         - Authenticate and get tokens
    POST /refresh       - Get new access token
    POST /logout        - Invalidate tokens
    POST /forgot-password - Request password reset
    POST /reset-password  - Reset password with token
    GET  /me            - Get current user profile

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import logging
from datetime import datetime, timezone
from time import time
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

# Local imports
from app.core.dependencies import get_db, get_current_user, get_current_active_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_password_token,
    verify_token,
    verify_reset_password_token,
    blacklist_token,
    get_password_hash,
    TokenType,
    TokenError,
)
from app.models import User, UserRole
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefreshRequest,
    LogoutRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ChangePasswordRequest,
    UserResponse,
    MessageResponse,
)
from app.config import settings

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

_LOCAL_OAUTH_STATES: dict[str, tuple[float, Optional[str]]] = {}


def _resolve_cookie_secure(request: Request) -> bool:
    """
    Decide whether auth cookies should be marked Secure for this request.
    """
    if settings.AUTH_COOKIE_SECURE:
        return True
    forwarded_proto = (request.headers.get("x-forwarded-proto") or "").lower()
    return request.url.scheme == "https" or forwarded_proto == "https"


def _set_auth_cookies(response: Response, request: Request, token_response: TokenResponse) -> None:
    """
    Store access + refresh tokens in httpOnly cookies.
    """
    secure = _resolve_cookie_secure(request)
    domain = settings.AUTH_COOKIE_DOMAIN or None
    path = settings.AUTH_COOKIE_PATH or "/"
    common = {
        "domain": domain,
        "path": path,
        "secure": secure,
        "httponly": settings.AUTH_COOKIE_HTTPONLY,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
    }

    response.set_cookie(
        key=settings.AUTH_ACCESS_COOKIE_NAME,
        value=token_response.access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **common,
    )
    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=token_response.refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        **common,
    )


def _clear_auth_cookies(response: Response, request: Request) -> None:
    """
    Clear auth cookies during logout.
    """
    secure = _resolve_cookie_secure(request)
    domain = settings.AUTH_COOKIE_DOMAIN or None
    path = settings.AUTH_COOKIE_PATH or "/"
    response.delete_cookie(
        key=settings.AUTH_ACCESS_COOKIE_NAME,
        path=path,
        domain=domain,
        secure=secure,
        httponly=settings.AUTH_COOKIE_HTTPONLY,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        path=path,
        domain=domain,
        secure=secure,
        httponly=settings.AUTH_COOKIE_HTTPONLY,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )

# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def create_token_response(user: User) -> TokenResponse:
    """
    Create token response for a user.
    
    Args:
        user: Authenticated user
        
    Returns:
        TokenResponse with access and refresh tokens
    """
    # Create tokens
    access_token = create_access_token(
        subject=str(user.id),
        additional_claims={"role": user.role.value}
    )
    refresh_token = create_refresh_token(subject=str(user.id))
    
    # Build user response
    user_response = UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role.value,
        admin_role=user.effective_admin_role.value if user.effective_admin_role else None,
        is_verified=user.is_verified,
        avatar_url=user.avatar_url,
        bio=user.bio,
        location=user.location,
        company_name=user.company_name,
        company_website=user.company_website,
        company_cover_photo_url=user.company_cover_photo_url,
        company_gallery_images=user.company_gallery_images or [],
        company_culture=user.company_culture,
        company_linkedin_url=user.company_linkedin_url,
        company_telegram_url=user.company_telegram_url,
        company_instagram_url=user.company_instagram_url,
        company_facebook_url=user.company_facebook_url,
        company_founded_year=user.company_founded_year,
        company_video_url=user.company_video_url,
        verification_state=user.verification_state,
        subscription_tier=getattr(user, "subscription_tier", None),
        subscription_expires_at=getattr(user, "subscription_expires_at", None),
        created_at=user.created_at,
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_response,
    )


async def parse_login_credentials(request: Request) -> UserLogin:
    """
    Accept both JSON and form-encoded login payloads.
    """
    content_type = (request.headers.get("content-type") or "").lower()
    payload: dict = {}

    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
    else:
        try:
            form_data = await request.form()
            payload = dict(form_data)
        except Exception:
            payload = {}

    if "email" not in payload and "username" in payload:
        payload["email"] = payload["username"]

    return UserLogin.model_validate(payload)


def normalize_user_id(user_id: str) -> UUID | str:
    """
    Convert string UUIDs to UUID objects for SQLAlchemy UUID columns.
    """
    try:
        return UUID(str(user_id))
    except (ValueError, TypeError, AttributeError):
        return user_id


def _oauth_error(status_code: int, error_code: str, message: str) -> HTTPException:
    """Build a stable OAuth error payload."""
    return HTTPException(
        status_code=status_code,
        detail={
            "error": error_code,
            "message": message,
        },
    )


def _require_oauth_state_store(provider: str):
    """
    Require secure state storage for OAuth flows.

    OAuth state must be validated server-side. If Redis/state storage is not
    available, the flow must fail closed instead of silently bypassing CSRF
    protection.
    """
    from app.core.redis_client import get_redis

    provider_label = provider.title()
    redis_client = get_redis()
    if redis_client is None:
        raise _oauth_error(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "OAUTH_STATE_STORAGE_UNAVAILABLE",
            f"{provider_label} OAuth is temporarily unavailable because secure state storage is not available.",
        )
    return redis_client


def _local_oauth_state_enabled() -> bool:
    """
    Allow OAuth state fallback when Redis-backed state is intentionally disabled.

    Why:
    - Some local/dev environments set global DEBUG-like env values to production
      labels (e.g. DEBUG=release), which turns off the old DEBUG-only fallback.
    - If Redis is disabled, failing closed makes OAuth unusable even for single
      process development.

    Security note:
    - In production, prefer REDIS_ENABLED=true so state is shared across workers.
      Process-local fallback is best-effort and can break across replicas.
    """
    return bool(settings.DEBUG or not settings.REDIS_ENABLED)


def _oauth_state_key(provider: str, state: str) -> str:
    return f"oauth_state:{provider.lower()}:{state}"


def _cleanup_local_oauth_states(now: float) -> None:
    expired_keys = []
    for key, value in _LOCAL_OAUTH_STATES.items():
        # New entries are (expires_at, payload); legacy entries were a bare float.
        expires_at = value[0] if isinstance(value, tuple) else value
        if expires_at <= now:
            expired_keys.append(key)
    for key in expired_keys:
        _LOCAL_OAUTH_STATES.pop(key, None)


_VALID_OAUTH_ROLES = {"student", "company"}


def _serialize_oauth_state_payload(role: Optional[str]) -> str:
    """Encode optional metadata next to the state token. Default = student."""
    chosen = role if role in _VALID_OAUTH_ROLES else "student"
    return json.dumps({"role": chosen})


def _deserialize_oauth_state_payload(raw: Optional[str]) -> dict:
    """Best-effort parse; treats legacy presence-flag values as default."""
    if not raw or raw == "1":
        return {"role": "student"}
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            return {"role": "student"}
        role = parsed.get("role")
        if role not in _VALID_OAUTH_ROLES:
            parsed["role"] = "student"
        return parsed
    except (TypeError, ValueError):
        return {"role": "student"}


def _store_oauth_state(provider: str, state: str, role: Optional[str] = None) -> None:
    """Persist OAuth state + chosen role for later callback validation."""
    payload = _serialize_oauth_state_payload(role)
    if _local_oauth_state_enabled():
        from app.core.redis_client import get_redis

        redis_client = get_redis()
        if redis_client is not None:
            redis_client.set(
                _oauth_state_key(provider, state),
                payload,
                ex=settings.OAUTH_STATE_TTL_SECONDS,
            )
            return

        now = time()
        _cleanup_local_oauth_states(now)
        _LOCAL_OAUTH_STATES[_oauth_state_key(provider, state)] = (
            now + settings.OAUTH_STATE_TTL_SECONDS,
            payload,
        )
        logger.info("Using local in-memory OAuth state storage for development")
        return

    redis_client = _require_oauth_state_store(provider)
    redis_client.set(
        _oauth_state_key(provider, state),
        payload,
        ex=settings.OAUTH_STATE_TTL_SECONDS,
    )


def _consume_oauth_state(provider: str, state: str) -> dict:
    """Validate state token; returns the stored payload (e.g. {'role': 'company'})."""
    state_key = _oauth_state_key(provider, state)
    provider_label = provider.title()

    def _pop_state_from_store(store: object) -> Optional[str]:
        """
        Pop OAuth state payload from a key-value store.

        Supports:
        - Redis-like clients with get/delete
        - legacy/mock clients with exists/delete only
        """
        get_fn = getattr(store, "get", None)
        delete_fn = getattr(store, "delete", None)
        exists_fn = getattr(store, "exists", None)

        if callable(get_fn):
            raw_value = get_fn(state_key)
            if raw_value is None:
                return None
            if callable(delete_fn):
                delete_fn(state_key)
            return raw_value.decode() if isinstance(raw_value, bytes) else raw_value

        # Backward compatibility for tests/mocks that expose exists() only.
        if callable(exists_fn):
            present = bool(exists_fn(state_key))
            if not present:
                return None
            if callable(delete_fn):
                delete_fn(state_key)
            return "1"

        raise RuntimeError("OAuth state store must provide get() or exists()")

    if _local_oauth_state_enabled():
        from app.core.redis_client import get_redis

        redis_client = get_redis()
        if redis_client is not None:
            raw = _pop_state_from_store(redis_client)
            if raw is None:
                raise _oauth_error(
                    status.HTTP_400_BAD_REQUEST,
                    "INVALID_OAUTH_STATE",
                    f"Invalid or expired {provider_label} OAuth state.",
                )
            return _deserialize_oauth_state_payload(raw)

        now = time()
        _cleanup_local_oauth_states(now)
        entry = _LOCAL_OAUTH_STATES.pop(state_key, None)
        if entry is None:
            raise _oauth_error(
                status.HTTP_400_BAD_REQUEST,
                "INVALID_OAUTH_STATE",
                f"Invalid or expired {provider_label} OAuth state.",
            )
        # Backward-compat: old in-memory entries stored just an expiry float.
        if isinstance(entry, tuple):
            expires_at, raw_payload = entry
        else:
            expires_at, raw_payload = entry, None
        if expires_at <= now:
            raise _oauth_error(
                status.HTTP_400_BAD_REQUEST,
                "INVALID_OAUTH_STATE",
                f"Invalid or expired {provider_label} OAuth state.",
            )
        return _deserialize_oauth_state_payload(raw_payload)

    redis_client = _require_oauth_state_store(provider)

    try:
        raw = _pop_state_from_store(redis_client)
        if raw is None:
            raise _oauth_error(
                status.HTTP_400_BAD_REQUEST,
                "INVALID_OAUTH_STATE",
                f"Invalid or expired {provider_label} OAuth state.",
            )

        return _deserialize_oauth_state_payload(raw)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Failed to validate OAuth state ({provider}): {e}")
        raise _oauth_error(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "OAUTH_STATE_VALIDATION_FAILED",
            f"{provider_label} OAuth state validation is temporarily unavailable.",
        )


async def send_password_reset_email(email: str, user_name: str, token: str):
    """
    Send password reset email using email service.
    """
    try:
        from app.services.email_service import email_service
        await email_service.send_password_reset_email(
            to_email=email,
            user_name=user_name,
            reset_token=token,
            language="uz"  # Default language
        )
        logger.info(f"Password reset email sent to {email[:3]}***")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        # Don't raise - email failure shouldn't block the flow


def _is_email_delivery_available() -> bool:
    """
    Determine whether outbound email is configured for the current runtime.
    """
    mode = (settings.EMAIL_TRANSPORT or "auto").strip().lower()
    smtp_configured = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    sendgrid_configured = bool(settings.SENDGRID_API_KEY)

    if mode == "disabled":
        return False
    if mode == "smtp":
        return smtp_configured
    if mode == "sendgrid":
        return sendgrid_configured

    # auto
    return smtp_configured or sendgrid_configured


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="""
    Create a new user account.
    
    **Request body:**
    - `email`: Valid email address (must be unique)
    - `password`: Strong password (min 8 chars, uppercase, lowercase, digit)
    - `full_name`: User's full name
    - `phone`: Optional phone number in international format
    - `role`: Account type (student or company)
    - `company_name`: Required for company accounts
    
    **Returns:**
    - Access token and refresh token
    - User profile data
    
    **Errors:**
    - 400: Email already registered
    - 422: Validation error (weak password, invalid email, etc.)
    """
)
async def register(
    user_data: UserRegister,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    
    logger.info(f"Registration attempt for email: {user_data.email}")
    
    # Check if email already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email.lower()
    ).first()
    
    if existing_user:
        logger.warning(f"Registration failed: email exists - {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )
    
    # Create new user
    try:
        user = User(
            email=user_data.email.lower(),
            full_name=user_data.full_name,
            phone=user_data.phone,
            role=UserRole(user_data.role.value),
            company_name=user_data.company_name if user_data.role.value == "company" else None,
            company_website=user_data.company_website if user_data.role.value == "company" else None,
        )
        user.set_password(user_data.password)
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"User registered successfully: {user.id}")

        # Notify admins when a company registers
        if user.role == UserRole.COMPANY:
            try:
                from app.api.v1.routes.admin import create_admin_notification
                create_admin_notification(
                    db,
                    type_="company_pending_verification",
                    message=f"New company registered: {user.company_name or user.email}",
                    link="/admin/companies",
                )
            except Exception as e:
                logger.error(f"Failed to create admin notification for company registration: {e}")

        # Send welcome email (background)
        try:
            from app.services.email_service import email_service
            await email_service.send_welcome_email(
                to_email=user.email,
                user_name=user.full_name,
                language="uz"
            )
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
        
        # Return tokens + set secure cookies for browser clients
        token_response = create_token_response(user)
        _set_auth_cookies(response, request, token_response)
        return token_response
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Registration integrity error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please try again."
        )
    except ValueError as e:
        db.rollback()
        logger.error(f"Registration validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login user",
    description="""
    Authenticate with email and password.
    
    **Request body:**
    - `email`: Email address
    - `password`: Password
    
    **Returns:**
    - Access token (expires in 30 minutes)
    - Refresh token (expires in 7 days)
    - User profile data
    
    **Errors:**
    - 401: Invalid credentials
    - 403: Account inactive or locked
    - 429: Too many failed attempts
    
    **Security:**
    - Rate limited: 5 attempts per minute per IP
    - Account locked after 5 failed attempts for 15 minutes
    """
)
async def login(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Authenticate user and return tokens with brute-force protection."""
    
    from app.core.rate_limiter import (
        check_login_rate_limit,
        is_account_locked,
        record_failed_login,
        clear_failed_logins
    )
    
    credentials = await parse_login_credentials(request)

    # Check rate limit using IP + email to avoid cross-test/global contamination.
    check_login_rate_limit(request, credentials.email)
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    
    logger.info(f"Login attempt for: {credentials.email} from {client_ip}")
    
    # Check if account is locked due to failed attempts
    is_locked, unlock_after = is_account_locked(credentials.email)
    if is_locked:
        logger.warning(
            f"Login blocked: account locked - {credentials.email} "
            f"(unlock in {unlock_after}s)"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account temporarily locked due to multiple failed login attempts. "
                   f"Try again in {unlock_after // 60} minutes.",
        )
    
    # Find user by email
    user = db.query(User).filter(
        User.email == credentials.email.lower(),
        User.is_deleted == False
    ).first()
    
    # Check credentials
    if not user or not user.verify_password(credentials.password):
        # Record failed attempt
        is_locked, unlock_after, remaining = record_failed_login(
            credentials.email,
            client_ip
        )
        
        if is_locked:
            logger.critical(
                f"Account locked after failed attempts: {credentials.email} from {client_ip}"
            )
            
            # Log to error service
            try:
                from app.services.error_logging_service import error_logger, ErrorCategory, ErrorSeverity
                await error_logger.log_auth_error(
                    error="Account locked due to brute-force attempt",
                    error_type="brute_force_detected",
                    email=credentials.email,
                    ip_address=client_ip,
                    extra_data={"unlock_after_seconds": unlock_after}
                )
            except Exception:
                pass
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account locked due to multiple failed login attempts. "
                       f"Try again in {unlock_after // 60} minutes.",
            )
        
        logger.warning(
            f"Login failed: invalid credentials - {credentials.email} "
            f"({remaining} attempts remaining)"
        )
        
        # Log auth error
        try:
            from app.services.error_logging_service import error_logger, ErrorCategory, ErrorSeverity
            await error_logger.log_auth_error(
                error="Invalid login credentials",
                error_type="login_failed",
                email=credentials.email,
                ip_address=client_ip,
                extra_data={"remaining_attempts": remaining}
            )
        except Exception:
            pass
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is active
    if not user.is_active_account:
        logger.warning(f"Login failed: inactive account - {user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )
    
    # Clear failed login attempts on successful login
    clear_failed_logins(credentials.email)
    
    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    logger.info(f"Login successful: {user.id} from {client_ip}")
    
    # Send login notification email (optional, background)
    try:
        from app.services.email_service import email_service
        import asyncio
        asyncio.create_task(
            email_service.send_login_notification(
                to_email=user.email,
                user_name=user.full_name,
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent", "Unknown"),
                language="uz"
            )
        )
    except Exception as e:
        logger.error(f"Failed to send login notification: {e}")
    
    token_response = create_token_response(user)
    _set_auth_cookies(response, request, token_response)
    return token_response


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="""
    Get a new access token using a refresh token.
    
    **Request body:**
    - `refresh_token`: Valid refresh token from login
    
    **Returns:**
    - New access token
    - Same refresh token
    - User profile data
    
    **Errors:**
    - 401: Invalid or expired refresh token
    """
)
async def refresh_token(
    http_request: Request,
    response: Response,
    request: TokenRefreshRequest | None = None,
    db: Session = Depends(get_db)
):
    """Refresh access token."""
    
    try:
        refresh_token_value = (
            request.refresh_token if request and request.refresh_token else None
        ) or http_request.cookies.get(settings.AUTH_REFRESH_COOKIE_NAME)
        if not refresh_token_value:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token missing"
            )

        # Verify refresh token
        payload = verify_token(
            refresh_token_value,
            expected_type=TokenType.REFRESH
        )
        
        user_id = normalize_user_id(payload.user_id)

        # Get user
        user = db.query(User).filter(
            User.id == user_id,
            User.is_deleted == False,
            User.is_active_account == True
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        logger.info(f"Token refresh for user: {user.id}")
        
        token_response = create_token_response(user)
        _set_auth_cookies(response, http_request, token_response)
        return token_response
        
    except TokenError as e:
        logger.warning(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout user",
    description="""
    Invalidate the current access token.
    
    The token will be added to a blacklist and cannot be used again.
    
    **Requires:** Bearer token in Authorization header
    """
)
async def logout(
    request: Request,
    response: Response,
    body: LogoutRequest | None = None,
    current_user: User = Depends(get_current_user),
):
    """Logout user by blacklisting token."""

    auth_header = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    token = None
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    if token:
        try:
            blacklist_token(token)
        except Exception as e:
            logger.warning(f"Failed to blacklist access token: {e}")

    if body and body.refresh_token:
        try:
            blacklist_token(body.refresh_token)
        except Exception as e:
            logger.warning(f"Failed to blacklist refresh token: {e}")

    cookie_refresh = request.cookies.get(settings.AUTH_REFRESH_COOKIE_NAME)
    if cookie_refresh:
        try:
            blacklist_token(cookie_refresh)
        except Exception as e:
            logger.warning(f"Failed to blacklist cookie refresh token: {e}")

    logger.info(f"Logout for user: {current_user.id}")
    _clear_auth_cookies(response, request)

    return MessageResponse(message="Successfully logged out", success=True)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Request password reset",
    description="""
    Request a password reset email.
    
    If the email exists, a reset link will be sent.
    Always returns success to prevent email enumeration.
    
    **Request body:**
    - `email`: Email address
    """
)
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Send password reset email."""
    from app.core.rate_limiter import check_login_rate_limit
    check_login_rate_limit(http_request, request.email)

    logger.info(f"Password reset requested for: {request.email}")
    
    # Find user (but don't reveal if exists)
    user = db.query(User).filter(
        User.email == request.email.lower(),
        User.is_deleted == False
    ).first()
    
    debug_reset_url: str | None = None
    email_delivery_available = _is_email_delivery_available()

    if user:
        # Create reset token
        reset_token = create_reset_password_token(user.email)

        if email_delivery_available:
            # Send email in background
            background_tasks.add_task(
                send_password_reset_email,
                user.email,
                user.full_name,
                reset_token
            )
        else:
            logger.warning(
                "Password reset email not queued: EMAIL transport is unavailable (mode=%s)",
                settings.EMAIL_TRANSPORT,
            )

        # Safe debug fallback for local/staging.
        if settings.DEBUG and not email_delivery_available:
            debug_reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Always return success (prevent email enumeration)
    return ForgotPasswordResponse(
        message="If an account exists with this email, a reset link has been sent.",
        success=True,
        debug_reset_url=debug_reset_url,
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password",
    description="""
    Reset password using token from email.
    
    **Request body:**
    - `token`: Reset token from email
    - `new_password`: New password (must meet strength requirements)
    
    **Errors:**
    - 400: Invalid or expired token
    - 422: Weak password
    """
)
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password with token."""
    
    try:
        # Verify token and get email
        email = verify_reset_password_token(request.token)
        
        # Find user
        user = db.query(User).filter(
            User.email == email,
            User.is_deleted == False
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        # Update password
        user.set_password(request.new_password)
        db.commit()
        
        logger.info(f"Password reset successful for: {user.id}")
        
        return MessageResponse(
            message="Password has been reset successfully. You can now login.",
            success=True
        )
        
    except TokenError as e:
        logger.warning(f"Password reset failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password",
    description="""
    Change password for logged-in user.
    
    **Requires:** Bearer token in Authorization header
    
    **Request body:**
    - `current_password`: Current password
    - `new_password`: New password
    
    **Errors:**
    - 400: Current password incorrect
    - 422: New password too weak
    """
)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change password for authenticated user."""
    
    # Verify current password
    if not current_user.verify_password(request.current_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    try:
        current_user.set_password(request.new_password)
        db.commit()
        
        logger.info(f"Password changed for user: {current_user.id}")
        
        return MessageResponse(
            message="Password changed successfully",
            success=True
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="""
    Get the profile of the currently authenticated user.
    
    **Requires:** Bearer token in Authorization header
    """
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile."""
    
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        role=current_user.role.value,
        admin_role=current_user.effective_admin_role.value if current_user.effective_admin_role else None,
        is_verified=current_user.is_verified,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        location=current_user.location,
        company_name=current_user.company_name,
        company_website=current_user.company_website,
        company_cover_photo_url=current_user.company_cover_photo_url,
        company_gallery_images=current_user.company_gallery_images or [],
        company_culture=current_user.company_culture,
        company_linkedin_url=current_user.company_linkedin_url,
        company_telegram_url=current_user.company_telegram_url,
        company_instagram_url=current_user.company_instagram_url,
        company_facebook_url=current_user.company_facebook_url,
        company_founded_year=current_user.company_founded_year,
        company_video_url=current_user.company_video_url,
        verification_state=current_user.verification_state,
        created_at=current_user.created_at,
    )


# =============================================================================
# OAUTH2 ENDPOINTS
# =============================================================================

@router.get(
    "/oauth/google",
    summary="Google OAuth - Get authorization URL",
    description="Get Google OAuth authorization URL for frontend redirect"
)
async def google_oauth_authorize(
    redirect: bool = False,
    role: Optional[str] = Query(None, description="Role for new sign-ups: 'student' or 'company'"),
):
    """
    Get Google OAuth authorization URL.

    If redirect=true, this endpoint will directly redirect the browser to Google.
    The optional `role` query param ('student' | 'company') controls the role
    assigned to brand-new users created via this flow. It's ignored for users
    that already exist.
    """
    from app.services.oauth_service import oauth_service
    import secrets

    if not oauth_service.is_configured()["google"]:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env"
        )

    # Generate CSRF state token
    state = secrets.token_urlsafe(32)

    # Store state + chosen role for the callback to read back.
    _store_oauth_state("google", state, role=role)
    
    # Get authorization URL
    auth_url = oauth_service.get_google_auth_url(state)

    if redirect:
        return RedirectResponse(url=auth_url)
    
    return {
        "auth_url": auth_url,
    }


@router.get(
    "/callback/google",
    summary="Google OAuth callback",
    description="Handle Google OAuth callback and create/login user"
)
async def google_oauth_callback(
    request: Request,
    code: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback."""
    from app.services.oauth_service import oauth_service
    
    try:
        # Validate CSRF state and recover the role the user picked at sign-up.
        state_payload = _consume_oauth_state("google", state)
        chosen_role_value = state_payload.get("role", "student")
        chosen_role = (
            UserRole.COMPANY if chosen_role_value == "company" else UserRole.STUDENT
        )

        # Get user info from Google
        user_info = await oauth_service.get_google_user_info(code)

        email = user_info.get("email")
        if not email:
            raise ValueError("No email in Google response")

        # Check if user exists
        user = db.query(User).filter(
            User.email == email.lower(),
            User.is_deleted == False
        ).first()

        if user:
            # Existing user - login (existing role is preserved; the `role`
            # query param only affects new signups).
            logger.info(f"Google OAuth login for existing user: {user.id} (role={user.role})")
        else:
            # New user - create account with the role selected on the register page.
            user = User(
                email=email.lower(),
                full_name=user_info.get("name", "User"),
                role=chosen_role,
                is_active_account=True,
                is_verified=True,  # Email verified by Google
                avatar_url=user_info.get("picture"),
            )
            # Set random password (won't be used)
            import secrets
            user.set_password(secrets.token_urlsafe(32))
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            logger.info(f"New user created via Google OAuth: {user.id}")
            
            # Send welcome email
            try:
                from app.services.email_service import email_service
                await email_service.send_welcome_email(
                    to_email=user.email,
                    user_name=user.full_name,
                    language="uz"
                )
            except Exception as e:
                logger.error(f"Failed to send welcome email: {e}")
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.commit()

        # Redirect to frontend after setting secure auth cookies.
        token_response = create_token_response(user)
        redirect_response = RedirectResponse(
            url=f"{settings.FRONTEND_URL}/oauth/callback#oauth=success"
        )
        _set_auth_cookies(redirect_response, request, token_response)
        return redirect_response
        
    except ValueError as e:
        logger.warning(f"Google OAuth callback validation error: {e}")
        raise _oauth_error(
            status.HTTP_400_BAD_REQUEST,
            "GOOGLE_OAUTH_INVALID_REQUEST",
            str(e),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Google OAuth callback error: {e}")
        raise _oauth_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="GOOGLE_OAUTH_AUTHENTICATION_FAILED",
            message="OAuth authentication failed",
        )


@router.get(
    "/oauth/linkedin",
    summary="LinkedIn OAuth - Get authorization URL",
    description="Get LinkedIn OAuth authorization URL for frontend redirect"
)
async def linkedin_oauth_authorize(
    redirect: bool = False,
    role: Optional[str] = Query(None, description="Role for new sign-ups: 'student' or 'company'"),
):
    """
    Get LinkedIn OAuth authorization URL.

    If redirect=true, this endpoint will directly redirect the browser to LinkedIn.
    """
    from app.services.oauth_service import oauth_service
    import secrets

    if not oauth_service.is_configured()["linkedin"]:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="LinkedIn OAuth not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to .env"
        )

    # Generate CSRF state token
    state = secrets.token_urlsafe(32)

    # Store state + chosen role for the callback.
    _store_oauth_state("linkedin", state, role=role)
    
    # Get authorization URL
    auth_url = oauth_service.get_linkedin_auth_url(state)

    if redirect:
        return RedirectResponse(url=auth_url)
    
    return {
        "auth_url": auth_url,
    }


@router.get(
    "/callback/linkedin",
    summary="LinkedIn OAuth callback",
    description="Handle LinkedIn OAuth callback and create/login user"
)
async def linkedin_oauth_callback(
    request: Request,
    code: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    """Handle LinkedIn OAuth callback."""
    from app.services.oauth_service import oauth_service
    
    try:
        # Validate CSRF state and recover the role the user picked at sign-up.
        state_payload = _consume_oauth_state("linkedin", state)
        chosen_role_value = state_payload.get("role", "student")
        chosen_role = (
            UserRole.COMPANY if chosen_role_value == "company" else UserRole.STUDENT
        )

        # Get user info from LinkedIn
        user_info = await oauth_service.get_linkedin_user_info(code)

        email = user_info.get("email")
        if not email:
            raise ValueError("No email in LinkedIn response")

        # Check if user exists
        user = db.query(User).filter(
            User.email == email.lower(),
            User.is_deleted == False
        ).first()

        if user:
            # Existing user - login (existing role preserved)
            logger.info(f"LinkedIn OAuth login for existing user: {user.id} (role={user.role})")
        else:
            # New user - create account with the role selected on the register page.
            user = User(
                email=email.lower(),
                full_name=user_info.get("name", "User"),
                role=chosen_role,
                is_active_account=True,
                is_verified=True,  # Email verified by LinkedIn
                avatar_url=user_info.get("picture"),
            )
            # Set random password (won't be used)
            import secrets
            user.set_password(secrets.token_urlsafe(32))
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            logger.info(f"New user created via LinkedIn OAuth: {user.id}")
            
            # Send welcome email
            try:
                from app.services.email_service import email_service
                await email_service.send_welcome_email(
                    to_email=user.email,
                    user_name=user.full_name,
                    language="uz"
                )
            except Exception as e:
                logger.error(f"Failed to send welcome email: {e}")
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.commit()

        token_response = create_token_response(user)
        redirect_response = RedirectResponse(
            url=f"{settings.FRONTEND_URL}/oauth/callback#oauth=success"
        )
        _set_auth_cookies(redirect_response, request, token_response)
        return redirect_response
        
    except ValueError as e:
        logger.warning(f"LinkedIn OAuth callback validation error: {e}")
        raise _oauth_error(
            status.HTTP_400_BAD_REQUEST,
            "LINKEDIN_OAUTH_INVALID_REQUEST",
            str(e),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LinkedIn OAuth callback error: {e}")
        raise _oauth_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="LINKEDIN_OAUTH_AUTHENTICATION_FAILED",
            message="OAuth authentication failed",
        )
