"""
=============================================================================
Pytest Configuration and Fixtures
=============================================================================

Global test fixtures for IshTop backend tests.

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import pytest
import asyncio
import inspect
from typing import Generator
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.models.base import Base
from app.models import User, UserRole, Job, Resume, Application
from app.core.dependencies import get_db
from app.core.security import create_access_token
from app.core.rate_limiter import rate_limiter
from app.config import settings


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """
    Run async tests under anyio when pytest-asyncio is unavailable.
    """
    for item in items:
        obj = getattr(item, "obj", None)
        is_async_test = obj is not None and inspect.iscoroutinefunction(obj)
        if ("asyncio" in item.keywords or is_async_test) and "anyio" not in item.keywords:
            item.add_marker(pytest.mark.anyio)


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem: pytest.Function):
    """
    Fallback async runner when pytest-asyncio isn't installed.
    """
    test_func = pyfuncitem.obj
    if inspect.iscoroutinefunction(test_func):
        kwargs = {
            arg: pyfuncitem.funcargs[arg]
            for arg in pyfuncitem._fixtureinfo.argnames
            if arg in pyfuncitem.funcargs
        }
        asyncio.run(test_func(**kwargs))
        return True
    return None

# =============================================================================
# DATABASE FIXTURES
# =============================================================================

@pytest.fixture(scope="function")
def test_db():
    """Create test database with in-memory SQLite."""
    
    # Create in-memory SQLite engine
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    TestingSessionLocal = sessionmaker(bind=engine)
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Create test client with test database."""
    
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


# =============================================================================
# GLOBAL STATE RESET FIXTURES
# =============================================================================

@pytest.fixture(autouse=True)
def _reset_rate_limiter_state():
    """
    Tests share a single in-memory RateLimiter instance.
    Reset between tests to avoid cross-test interference (e.g. login 429s).
    """
    rate_limiter._storage.clear()
    rate_limiter._failed_logins.clear()
    rate_limiter._locked_accounts.clear()
    yield
    rate_limiter._storage.clear()
    rate_limiter._failed_logins.clear()
    rate_limiter._locked_accounts.clear()


# =============================================================================
# USER FIXTURES
# =============================================================================

@pytest.fixture
def test_student(test_db) -> User:
    """Create test student user."""
    user = User(
        id=uuid4(),
        email="test.student@example.com",
        full_name="Test Student",
        phone="+998901234567",
        role=UserRole.STUDENT,
        is_active_account=True,
        is_verified=True,
    )
    user.set_password("TestPassword123!")
    
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    return user


@pytest.fixture
def test_company(test_db) -> User:
    """Create test company user."""
    user = User(
        id=uuid4(),
        email="test.company@example.com",
        full_name="Test Company HR",
        phone="+998901234568",
        role=UserRole.COMPANY,
        company_name="Test Company",
        company_website="https://test.com",
        is_active_account=True,
        is_verified=True,
    )
    user.set_password("TestPassword123!")
    
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    return user


@pytest.fixture
def test_admin(test_db) -> User:
    """Create test admin user."""
    user = User(
        id=uuid4(),
        email="test.admin@example.com",
        full_name="Test Admin",
        phone="+998901234569",
        role=UserRole.ADMIN,
        is_active_account=True,
        is_verified=True,
    )
    user.set_password("AdminPassword123!")
    
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    return user


# =============================================================================
# TOKEN FIXTURES
# =============================================================================

@pytest.fixture
def student_token(test_student: User) -> str:
    """Create access token for test student."""
    return create_access_token(
        subject=str(test_student.id),
        additional_claims={"role": test_student.role.value}
    )


@pytest.fixture
def company_token(test_company: User) -> str:
    """Create access token for test company."""
    return create_access_token(
        subject=str(test_company.id),
        additional_claims={"role": test_company.role.value}
    )


@pytest.fixture
def admin_token(test_admin: User) -> str:
    """Create access token for test admin."""
    return create_access_token(
        subject=str(test_admin.id),
        additional_claims={"role": test_admin.role.value}
    )


@pytest.fixture
def super_admin_token(test_admin: User) -> str:
    """Create access token for test super admin (alias for admin_token)."""
    return create_access_token(
        subject=str(test_admin.id),
        additional_claims={"role": test_admin.role.value}
    )


# =============================================================================
# AUTH HEADERS FIXTURES
# =============================================================================

@pytest.fixture
def student_headers(student_token: str) -> dict:
    """Create auth headers for student."""
    return {"Authorization": f"Bearer {student_token}"}


@pytest.fixture
def company_headers(company_token: str) -> dict:
    """Create auth headers for company."""
    return {"Authorization": f"Bearer {company_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    """Create auth headers for admin."""
    return {"Authorization": f"Bearer {admin_token}"}


# =============================================================================
# DATA FIXTURES
# =============================================================================

@pytest.fixture
def test_resume(test_db, test_student: User) -> Resume:
    """Create test resume."""
    resume = Resume(
        id=uuid4(),
        user_id=test_student.id,
        title="Test Resume",
        status="published",
        content={
            "personal_info": {
                "name": test_student.full_name,
                "email": test_student.email,
                "phone": test_student.phone,
            },
            "summary": "Test summary",
            "skills": {
                "technical": ["Python", "FastAPI", "PostgreSQL"],
                "soft": ["Communication"],
            },
        },
        ats_score=85,
    )
    
    test_db.add(resume)
    test_db.commit()
    test_db.refresh(resume)
    
    return resume


@pytest.fixture
def test_job(test_db, test_company: User) -> Job:
    """Create test job."""
    job = Job(
        id=uuid4(),
        company_id=test_company.id,
        title="Test Job",
        description="Test job description",
        requirements={"skills": ["Python", "FastAPI"]},
        salary_min=1000,
        salary_max=2000,
        salary_currency="USD",
        location="Tashkent",
        is_remote_allowed=True,
        job_type="full_time",
        experience_level="mid",
        status="active",
    )
    
    test_db.add(job)
    test_db.commit()
    test_db.refresh(job)
    
    return job


@pytest.fixture
def test_application(test_db, test_student: User, test_job: Job, test_resume: Resume) -> Application:
    """Create test application."""
    application = Application(
        id=uuid4(),
        job_id=test_job.id,
        user_id=test_student.id,
        resume_id=test_resume.id,
        status="pending",
        cover_letter="Test cover letter",
    )
    
    test_db.add(application)
    test_db.commit()
    test_db.refresh(application)
    
    return application


# =============================================================================
# MOCK DATA FIXTURES
# =============================================================================

@pytest.fixture
def sample_resume_data() -> dict:
    """Sample resume data for testing."""
    return {
        "title": "Software Developer Resume",
        "template": "professional",
        "personal_info": {
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone": "+998901234567",
            "location": "Tashkent, Uzbekistan",
        },
        "summary": "Experienced software developer with 5+ years in backend development.",
        "experience": [
            {
                "company": "Tech Corp",
                "position": "Senior Developer",
                "start_date": "2020-01-01",
                "end_date": None,
                "is_current": True,
                "description": "Leading backend team",
            }
        ],
        "education": [
            {
                "institution": "TUIT",
                "degree": "Bachelor",
                "field": "Computer Science",
                "start_date": "2014-09-01",
                "end_date": "2018-06-01",
            }
        ],
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
    }


@pytest.fixture
def sample_job_data() -> dict:
    """Sample job data for testing."""
    return {
        "title": "Backend Developer",
        "description": "We are looking for a backend developer to build reliable APIs and services.",
        "requirements": ["Python", "FastAPI", "PostgreSQL"],
        "responsibilities": ["Develop APIs", "Write tests"],
        "salary_min": 2000,
        "salary_max": 4000,
        "currency": "USD",
        "location": "Tashkent",
        "location_type": "hybrid",
        "employment_type": "full_time",
        "experience_level": "mid",
        "skills_required": ["Python", "FastAPI"],
        "benefits": ["Health insurance", "Remote work"],
    }


# =============================================================================
# ASYNC FIXTURES
# =============================================================================

@pytest.fixture
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
