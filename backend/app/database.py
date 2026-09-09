"""
=============================================================================
DATABASE CONFIGURATION
=============================================================================

PURPOSE:
    Configures the database connection and session management.
    Provides utilities for database operations.

FEATURES:
    - SQLAlchemy engine configuration
    - Session factory with proper cleanup
    - Dependency injection for FastAPI
    - Connection health checking

USAGE:
    from app.database import get_db, engine
    
    # In FastAPI route with dependency injection
    @app.get("/users")
    async def get_users(db: Session = Depends(get_db)):
        return db.query(User).all()

AUTHOR: IshTop Team
VERSION: 1.0.0
"""

# =============================================================================
# IMPORTS
# =============================================================================

from typing import Callable, Generator, TypeVar
import logging
import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from app.config import settings
from app.models.base import Base

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# ENGINE CONFIGURATION
# =============================================================================

# Create SQLAlchemy engine
# WHY these settings?
# - pool_size: Number of connections to keep open
# - max_overflow: Extra connections if pool is full
# - pool_timeout: Seconds to wait for available connection
# - pool_recycle: Recreate connections after this many seconds (prevents stale)
# - echo: Log all SQL queries (useful for debugging)

# Check if using SQLite (doesn't support connection pooling)
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=settings.DEBUG,
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,  # 30 minutes
        # Test a pooled connection with a lightweight ping before handing it out.
        # After the DB restarts (Railway maintenance / "the database system is
        # starting up"), the pool's old connections are dead; pre-ping discards
        # them and opens a fresh one instead of erroring the request.
        pool_pre_ping=True,
        echo=settings.DEBUG,  # Log SQL in debug mode
    )

# =============================================================================
# SESSION FACTORY
# =============================================================================

# Create session factory
# WHY a factory?
# - Creates new sessions with consistent configuration
# - Each request gets its own session
# - Proper isolation between requests

SessionLocal = sessionmaker(
    autocommit=False,   # Manual commit required
    autoflush=False,    # Don't auto-flush before queries
    bind=engine
)

# =============================================================================
# TRANSIENT-ERROR RETRY
# =============================================================================

_T = TypeVar("_T")


def run_with_db_retry(
    fn: Callable[[], _T],
    db: Session | None = None,
    *,
    attempts: int = 3,
    base_delay: float = 0.5,
) -> _T:
    """Run ``fn`` and retry briefly on transient DB connection failures.

    Covers the short window when Railway's Postgres is restarting and rejects
    connections with "the database system is starting up". Together with
    ``pool_pre_ping`` this makes that blip invisible to the user instead of a
    hard error. The session is rolled back between attempts so it isn't reused
    in a failed state. Non-transient errors are re-raised immediately.

    NOTE: this sleeps between attempts, so it is BLOCKING. From an ``async``
    endpoint call it via ``run_in_threadpool`` — sleeping inline would park the
    event loop and stall every other request.
    """
    last_exc: OperationalError | None = None
    attempts = max(1, attempts)  # never skip the call (and never hit the assert)
    for i in range(attempts):
        try:
            return fn()
        except OperationalError as exc:
            last_exc = exc
            if db is not None:
                try:
                    db.rollback()
                except Exception:  # noqa: BLE001 — best effort before retry
                    pass
            if i < attempts - 1:
                time.sleep(base_delay * (i + 1))  # 0.5s, then 1s
                logger = logging.getLogger(__name__)
                logger.warning("Transient DB error, retrying (%d/%d): %s", i + 1, attempts, exc)
    assert last_exc is not None
    raise last_exc


# =============================================================================
# DEPENDENCY INJECTION
# =============================================================================

def get_db() -> Generator[Session, None, None]:
    """
    Get database session for dependency injection.
    
    USAGE in FastAPI:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    
    WHY a generator?
    - Ensures session is closed after request
    - Works with FastAPI's dependency system
    - Automatic cleanup on errors
    
    Yields:
        SQLAlchemy Session object
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def create_tables() -> None:
    """
    Create all database tables.
    
    Uses SQLAlchemy's create_all which is idempotent
    (won't fail if tables exist).
    
    NOTE: In production, use Alembic migrations instead.
    """
    logger.info("Creating database tables...")

    # Ensure all models are imported so SQLAlchemy has them registered on Base.metadata.
    # Without this, create_all() can be a no-op if endpoints import models lazily,
    # which then leads to runtime "relation does not exist" errors in fresh DBs (CI/E2E).
    try:
        import app.models  # noqa: F401
    except Exception as e:
        logger.warning(f"Failed to import models before create_all: {e}")

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully!")


def drop_tables() -> None:
    """
    Drop all database tables.
    
    ⚠️ WARNING: This destroys all data!
    Only use in development/testing.
    """
    logger.warning("Dropping all database tables!")
    Base.metadata.drop_all(bind=engine)
    logger.info("All tables dropped.")


def check_database_connection() -> bool:
    """
    Check if database connection is working.
    
    Returns:
        True if connection successful, False otherwise
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        logger.info("Database connection successful!")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


def normalize_legacy_user_role_values() -> None:
    """
    Normalize legacy role/admin_role values that can break enum parsing.

    Older local databases may contain uppercase role values
    (STUDENT/COMPANY/ADMIN) that no longer match current enum values
    (student/company/admin). This causes SQLAlchemy LookupError when loading
    users during OAuth/login flows.
    """
    try:
        with engine.begin() as connection:
            is_postgres = connection.dialect.name == "postgresql"

            # Ensure admin rows remain valid with constraint:
            # role='admin' => admin_role must be non-null.
            connection.execute(
                text(
                    """
                    UPDATE users
                    SET admin_role = 'super_admin'
                    WHERE UPPER(CAST(role AS TEXT)) = 'ADMIN'
                      AND (admin_role IS NULL OR TRIM(admin_role) = '')
                    """
                )
            )

            connection.execute(
                text(
                    """
                    UPDATE users
                    SET admin_role = LOWER(admin_role)
                    WHERE admin_role IS NOT NULL
                    """
                )
            )

            if is_postgres:
                # PostgreSQL enum columns cannot be assigned raw text without
                # casting back to the enum type.
                connection.execute(
                    text(
                        """
                        UPDATE users
                        SET role = CASE CAST(role AS TEXT)
                            WHEN 'STUDENT' THEN 'student'::user_role_enum
                            WHEN 'COMPANY' THEN 'company'::user_role_enum
                            WHEN 'ADMIN' THEN 'admin'::user_role_enum
                            ELSE role
                        END
                        WHERE CAST(role AS TEXT) IN ('STUDENT', 'COMPANY', 'ADMIN')
                        """
                    )
                )
            else:
                connection.execute(
                    text(
                        """
                        UPDATE users
                        SET role = LOWER(CAST(role AS TEXT))
                        WHERE UPPER(CAST(role AS TEXT)) IN ('STUDENT', 'COMPANY', 'ADMIN')
                        """
                    )
                )
        logger.info("Legacy user role values normalized successfully")
    except Exception as e:
        # Non-fatal: app can still run, but we log explicitly for diagnostics.
        logger.warning(f"Failed to normalize legacy user roles: {e}")


def get_db_info() -> dict:
    """
    Get database information for debugging.
    
    Returns:
        Dictionary with database info
    """
    return {
        "url": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "hidden",
        "pool_size": engine.pool.size(),
        "checked_out": engine.pool.checkedout(),
        "overflow": engine.pool.overflow(),
        "checkedin": engine.pool.checkedin(),
    }
