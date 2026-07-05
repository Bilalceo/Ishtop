"""
=============================================================================
SMARTCAREER AI - MAIN APPLICATION
=============================================================================

FastAPI application entry point.

FEATURES:
    - API versioning (v1)
    - CORS configuration
    - Health checks
    - Exception handlers
    - Startup/shutdown events

RUN WITH:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

DOCS:
    - Swagger UI: http://localhost:8000/docs
    - ReDoc: http://localhost:8000/redoc
    - OpenAPI JSON: http://localhost:8000/openapi.json

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""
# deploy-trigger: backend runtime touched to force full release pipeline.

# =============================================================================
# IMPORTS
# =============================================================================

import logging
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List
from uuid import uuid4

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from sqlalchemy.orm import Session

# Local imports
from app.config import settings, print_config_summary
from app.api.v1 import api_router
from app.database import (
    SessionLocal,
    check_database_connection,
    get_db,
    normalize_legacy_user_role_values,
)
from app.models import User, UserRole, AdminSubRole
from app.services.startup_seed import run_startup_auto_seed
from app.services.company_weekly_digest import send_due_company_weekly_digests

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

logger = logging.getLogger(__name__)


def _bootstrap_admin_user() -> None:
    """
    Create or promote an admin account from environment variables.

    Triggered only when both BOOTSTRAP_ADMIN_EMAIL and
    BOOTSTRAP_ADMIN_PASSWORD are provided.
    """
    email = (settings.BOOTSTRAP_ADMIN_EMAIL or "").strip().lower()
    password = (settings.BOOTSTRAP_ADMIN_PASSWORD or "").strip()

    if not email or not password:
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            if user.role == UserRole.ADMIN:
                # Already an admin — skip to avoid overwriting password on every restart.
                logger.info("Bootstrap admin already exists and is admin: %s — skipping", email)
                return
            # Promote existing non-admin user without resetting their password.
            user.role = UserRole.ADMIN
            if settings.BOOTSTRAP_ADMIN_FORCE_SUPER_ADMIN:
                user.admin_role = AdminSubRole.SUPER_ADMIN.value
            user.full_name = settings.BOOTSTRAP_ADMIN_FULL_NAME or user.full_name
            user.is_active_account = True
            user.is_verified = True
            action = "promoted"
        else:
            user = User(
                email=email,
                full_name=settings.BOOTSTRAP_ADMIN_FULL_NAME or "Admin",
                phone=settings.BOOTSTRAP_ADMIN_PHONE,
                role=UserRole.ADMIN,
                admin_role=AdminSubRole.SUPER_ADMIN.value if settings.BOOTSTRAP_ADMIN_FORCE_SUPER_ADMIN else None,
                is_active_account=True,
                is_verified=True,
            )
            user.set_password(password)
            db.add(user)
            action = "created"

        db.commit()
        logger.info("Bootstrap admin %s: %s", action, email)
    except Exception as exc:
        db.rollback()
        logger.error("Failed to bootstrap admin user: %s", exc)
    finally:
        db.close()

# =============================================================================
# SENTRY INTEGRATION (Error Monitoring)
# =============================================================================

# Initialize Sentry for production error tracking
if settings.SENTRY_DSN and not settings.DEBUG:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.sentry_environment,
            traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
            profiles_sample_rate=0.1,  # 10% of profiles
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            send_default_pii=False,  # Don't send personally identifiable information
            attach_stacktrace=True,
            before_send=lambda event, hint: event if not settings.DEBUG else None,
        )
        logger.info("Sentry error monitoring initialized")
    except ImportError:
        logger.warning("Sentry SDK not installed. Run: pip install sentry-sdk[fastapi]")
    except Exception as e:
        logger.warning(f"Failed to initialize Sentry: {e}")


# =============================================================================
# ERROR RESPONSE HELPERS
# =============================================================================

def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        return str(request_id)
    incoming = (request.headers.get("X-Request-ID") or "").strip()
    if incoming and len(incoming) <= 128:
        return incoming
    return str(uuid4())


def _error_envelope(
    *,
    request: Request,
    code: str,
    message: str,
    details: Any = None,
) -> Dict[str, Any]:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
        "request_id": _get_request_id(request),
        "timestamp": _utc_timestamp(),
    }


def _http_error_details(detail: Any) -> tuple[str, str, Any]:
    code = "HTTP_ERROR"
    message = "Request failed"
    details = None

    if isinstance(detail, dict):
        code = str(detail.get("code") or detail.get("error") or code)
        message = str(detail.get("message") or detail.get("detail") or detail.get("error") or message)
        if "details" in detail:
            details = detail.get("details")
        else:
            remaining = {
                key: value
                for key, value in detail.items()
                if key not in {"code", "error", "message", "detail", "details"}
            }
            details = remaining or None
    elif isinstance(detail, list):
        details = detail
        message = "Request failed"
    elif detail is not None:
        message = str(detail)

    return code, message, details


# =============================================================================
# LIFESPAN EVENTS
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle application startup and shutdown events.
    
    Startup:
        - Log configuration
        - Check database connection
        - Initialize services
    
    Shutdown:
        - Close connections
        - Cleanup resources
    """
    # =========================================================================
    # STARTUP
    # =========================================================================
    
    logger.info("=" * 60)
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("=" * 60)
    
    # Print configuration summary
    if settings.DEBUG:
        print_config_summary()
    
    digest_task: asyncio.Task | None = None

    async def _weekly_digest_loop() -> None:
        """Periodic loop that sends due Monday digests."""
        interval = max(300, int(settings.COMPANY_WEEKLY_DIGEST_POLL_SECONDS))
        while True:
            db: Session | None = None
            try:
                db = SessionLocal()
                result = await send_due_company_weekly_digests(db=db)
                if result.get("sent", 0) > 0:
                    logger.info(
                        "Weekly digest sent=%s skipped=%s failed=%s",
                        result.get("sent", 0),
                        result.get("skipped", 0),
                        result.get("failed", 0),
                    )
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.exception("Weekly digest scheduler iteration failed: %s", exc)
            finally:
                if db is not None:
                    db.close()

            await asyncio.sleep(interval)

    # Check database connection
    if check_database_connection():
        logger.info("✅ Database connection successful")
        normalize_legacy_user_role_values()
        _bootstrap_admin_user()
        run_startup_auto_seed()
        if settings.COMPANY_WEEKLY_DIGEST_ENABLED:
            digest_task = asyncio.create_task(_weekly_digest_loop())
            logger.info("📬 Company weekly digest scheduler started")
    else:
        logger.error("❌ Database connection failed!")

    # Log API info
    logger.info(f"📚 API Documentation: http://localhost:8000/docs")
    logger.info(f"🔧 Debug Mode: {settings.DEBUG}")
    logger.info("=" * 60)
    
    yield  # Application runs here
    
    # =========================================================================
    # SHUTDOWN
    # =========================================================================
    
    if digest_task:
        digest_task.cancel()
        try:
            await digest_task
        except asyncio.CancelledError:
            pass

    logger.info("=" * 60)
    logger.info(f"👋 Shutting down {settings.APP_NAME}...")
    logger.info("=" * 60)


# =============================================================================
# APPLICATION FACTORY
# =============================================================================

def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        Configured FastAPI instance
    """
    
    application = FastAPI(
        title=settings.APP_NAME,
        description="""
        ## IshTop API
        
        AI-powered career platform API for resume generation and job matching.
        
        ### Features
        - 👤 **Authentication**: Register, login, JWT tokens
        - 📄 **Resumes**: Create, edit, AI-generate resumes
        - 💼 **Jobs**: Browse, search, post job listings
        - 📨 **Applications**: Apply to jobs, track status
        
        ### Authentication
        Most endpoints require a Bearer token in the Authorization header:
        ```
        Authorization: Bearer <your_access_token>
        ```
        
        Get a token by calling `POST /api/v1/auth/login`.
        """,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    
    # =========================================================================
    # CORS MIDDLEWARE
    # =========================================================================
    
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["authorization", "content-type", "x-request-id", "x-csrf-token"],
    )
    
    # =========================================================================
    # GZIP COMPRESSION MIDDLEWARE (Performance)
    # =========================================================================
    
    from fastapi.middleware.gzip import GZipMiddleware
    application.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses > 1KB
    logger.info("GZip compression enabled (minimum_size=1KB)")

    # =========================================================================
    # REQUEST ID + SECURITY HEADERS MIDDLEWARE (Production)
    # =========================================================================
    
    @application.middleware("http")
    async def add_request_id_and_security_headers(request: Request, call_next):
        """
        Add a correlation id to every request and security headers to responses.

        Headers:
        - X-Request-ID: Correlation id for logs and client debugging
        - X-Content-Type-Options: Prevent MIME type sniffing
        - X-Frame-Options: Prevent clickjacking
        - X-XSS-Protection: Enable XSS filter
        - Strict-Transport-Security: Force HTTPS
        - Referrer-Policy: Control referrer information
        """
        incoming_request_id = (request.headers.get("X-Request-ID") or "").strip()
        if not incoming_request_id or len(incoming_request_id) > 128:
            incoming_request_id = str(uuid4())
        request.state.request_id = incoming_request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = incoming_request_id

        # Baseline security headers for all environments.
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

        if request.url.path.startswith("/api/v1/auth"):
            response.headers["Cache-Control"] = "no-store, max-age=0"
            response.headers["Pragma"] = "no-cache"

        if not settings.DEBUG:
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Content-Security-Policy"] = "default-src 'self'"
            if request.url.scheme == "https" or (request.headers.get("x-forwarded-proto") or "").lower() == "https":
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response
    
    # =========================================================================
    # INCLUDE ROUTERS
    # =========================================================================
    
    # API v1
    application.include_router(
        api_router,
        prefix="/api/v1"
    )

    # Public Telegram bot webhook (no auth; guarded by a secret path segment)
    from app.routers.telegram_bot import router as telegram_bot_router
    application.include_router(telegram_bot_router)

    return application


# =============================================================================
# CREATE APP INSTANCE
# =============================================================================

app = create_application()


# =============================================================================
# EXCEPTION HANDLERS
# =============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
) -> JSONResponse:
    """
    Handle Pydantic validation errors.
    
    Returns user-friendly error messages.
    """
    errors = []
    for error in exc.errors():
        loc = error.get("loc", ())
        if loc and loc[0] in {"body", "query", "path", "header"}:
            field = ".".join(str(part) for part in loc[1:])
        else:
            field = ".".join(str(part) for part in loc)
        errors.append({
            "field": field,
            "message": error.get("msg", "Invalid value"),
            "type": error.get("type", "validation_error"),
        })

    request_id = _get_request_id(request)
    logger.warning("[%s] Validation error: %s", request_id, errors)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_envelope(
            request=request,
            code="VALIDATION_ERROR",
            message="Request validation failed",
            details=errors,
        ),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException
) -> JSONResponse:
    """
    Normalize FastAPI HTTPException responses into the global error envelope.
    """
    code, message, details = _http_error_details(exc.detail)
    request_id = _get_request_id(request)
    logger.warning("[%s] HTTP %s error: %s", request_id, exc.status_code, message)

    return JSONResponse(
        status_code=exc.status_code,
        content=_error_envelope(
            request=request,
            code=code or f"HTTP_{exc.status_code}",
            message=message or "Request failed",
            details=details,
        ),
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(
    request: Request,
    exc: SQLAlchemyError
) -> JSONResponse:
    """
    Handle database errors.
    
    Logs the actual error but returns generic message to user.
    """
    request_id = _get_request_id(request)
    logger.exception("[%s] Database error", request_id)
    
    # Log to error service
    try:
        from app.services.error_logging_service import error_logger
        await error_logger.log_database_error(
            error=exc,
            operation="query",
            extra_data={
                "endpoint": request.url.path,
                "method": request.method,
                "request_id": request_id,
            }
        )
    except Exception as log_error:
        logger.error("[%s] Failed to log database error: %s", request_id, log_error)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_envelope(
            request=request,
            code="DATABASE_ERROR",
            message="A database error occurred. Please try again later.",
        ),
    )


@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request,
    exc: Exception
) -> JSONResponse:
    """
    Handle unexpected errors.
    
    Logs the error and returns a generic message.
    """
    request_id = _get_request_id(request)
    logger.exception("[%s] Unexpected error", request_id)
    
    # Log to error service
    try:
        from app.services.error_logging_service import error_logger
        await error_logger.log_api_error(
            error=exc,
            endpoint=request.url.path,
            method=request.method,
            status_code=500,
            ip_address=request.client.host if request.client else None,
            request_id=request_id,
        )
    except Exception as log_error:
        logger.error("[%s] Failed to log unexpected error: %s", request_id, log_error)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_envelope(
            request=request,
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred. Please try again later.",
        ),
    )


# =============================================================================
# ROOT ENDPOINTS
# =============================================================================

@app.get(
    "/",
    tags=["Health"],
    summary="Root endpoint",
    response_model=Dict[str, Any]
)
async def root():
    """
    Root endpoint - returns API info.
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "api": "/api/v1"
    }


@app.get(
    "/health",
    tags=["Health"],
    summary="Production health check",
    response_model=Dict[str, Any]
)
async def health_check(db: Session = Depends(get_db)):
    """
    Comprehensive health check endpoint for production monitoring.
    
    Checks:
    - Database connection
    - AI service configuration
    - Redis connection (if enabled)
    - Application status
    
    Returns:
        - status: "healthy" or "unhealthy"
        - database: connection status
        - ai_service: configuration status
        - redis: connection status
        - version: app version
        - timestamp: current server time
        - environment: production/development
    
    Status Codes:
        - 200: All systems healthy
        - 503: Service unavailable (database down)
    """
    health_status = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.sentry_environment,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    # Check database connection
    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        logger.error(f"Health check - Database error: {e}")
        health_status["database"] = "disconnected"
        health_status["status"] = "unhealthy"
    
    # Check AI service configuration
    ai_configured = bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY)
    health_status["ai_service"] = {
        "provider": settings.AI_PROVIDER,
        "configured": ai_configured,
        "model": settings.GEMINI_MODEL if settings.AI_PROVIDER == "gemini" else settings.OPENAI_MODEL
    }
    
    # Check Redis (if enabled). Use a live probe so a flapping Redis is
    # actually visible — get_redis() is lru_cached and can hide outages.
    if settings.REDIS_ENABLED:
        from app.core.redis_client import ping_redis

        if ping_redis():
            health_status["redis"] = "connected"
        else:
            health_status["redis"] = "unavailable"
            # In production, Redis-backed security features (token blacklist,
            # cross-worker rate limiting) silently degrade to per-process
            # in-memory state when Redis is down. Demote /health so monitoring
            # pages instead of returning 200 with a buried "redis: unavailable".
            if not settings.DEBUG:
                degraded: List[str] = []
                if settings.TOKEN_BLACKLIST_USE_REDIS:
                    degraded.append("token_blacklist")
                if settings.RATE_LIMIT_USE_REDIS:
                    degraded.append("rate_limit")
                health_status["status"] = "degraded"
                health_status["degraded_features"] = degraded
                logger.error(
                    "HEALTH_REDIS_UNAVAILABLE: Redis enabled but unreachable; "
                    "degraded features=%s",
                    degraded,
                )
    else:
        health_status["redis"] = "disabled"
    
    # Return 503 for either fully-unhealthy (DB down) or degraded
    # (Redis-backed security features unavailable in production). Monitoring
    # treats any non-200 from /health as a page-able event.
    if health_status["status"] in ("unhealthy", "degraded"):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_status
        )

    return health_status


@app.get(
    "/livez",
    tags=["Health"],
    summary="Liveness probe",
    response_model=Dict[str, Any]
)
async def livez():
    """
    Lightweight liveness probe for container orchestration.
    """
    return {
        "status": "alive",
        "version": settings.APP_VERSION,
        "timestamp": _utc_timestamp(),
    }


@app.get(
    "/readyz",
    tags=["Health"],
    summary="Readiness probe",
    response_model=Dict[str, Any]
)
async def readyz():
    """
    Readiness probe that fails if the database is unavailable.
    """
    ready_status = {
        "status": "ready",
        "version": settings.APP_VERSION,
        "timestamp": _utc_timestamp(),
        "database": "connected",
        "redis": "disabled",
    }

    if not check_database_connection():
        ready_status["status"] = "unready"
        ready_status["database"] = "disconnected"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ready_status,
        )

    if settings.REDIS_ENABLED:
        from app.core.redis_client import ping_redis

        if ping_redis():
            ready_status["redis"] = "connected"
        else:
            ready_status["redis"] = "unavailable"
            ready_status["status"] = "unready"
            logger.error("READYZ_REDIS_UNAVAILABLE: Redis enabled but unreachable")
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content=ready_status,
            )

    return ready_status


@app.get(
    "/api",
    tags=["Health"],
    summary="API info",
    response_model=Dict[str, Any]
)
async def api_info():
    """
    API information endpoint.
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "endpoints": {
            "auth": "/api/v1/auth",
            "users": "/api/v1/users",
            "resumes": "/api/v1/resumes",
            "jobs": "/api/v1/jobs",
            "applications": "/api/v1/applications",
        }
    }


# =============================================================================
# RUN DIRECTLY (for development)
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="debug" if settings.DEBUG else "info"
    )
