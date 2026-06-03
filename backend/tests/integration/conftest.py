"""
Integration test specific fixtures and compatibility helpers.
"""

from __future__ import annotations

import asyncio
import inspect
from typing import Any, Iterator
from uuid import UUID, uuid4
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_db
from app.core.security import create_access_token, create_refresh_token
from app.main import app
from app.models import Job, User, UserRole
from tests.fixtures.sample_data import SAMPLE_JOBS


class AsyncSessionAdapter:
    """
    Small async wrapper around sync SQLAlchemy session for legacy async tests.
    """

    def __init__(self, session: Any):
        self._session = session

    def add(self, instance: Any) -> None:
        # Legacy tests sometimes set string IDs for UUID fields.
        if instance.__class__.__name__ == "Job":
            company_id = getattr(instance, "company_id", None)
            if isinstance(company_id, str):
                try:
                    UUID(company_id)
                except ValueError:
                    instance.company_id = uuid4()
        self._session.add(instance)

    def delete(self, instance: Any) -> None:
        self._session.delete(instance)

    async def commit(self) -> None:
        self._session.commit()

    async def flush(self) -> None:
        self._session.flush()

    async def refresh(self, instance: Any) -> None:
        self._session.refresh(instance)

    async def execute(self, *args: Any, **kwargs: Any) -> Any:
        return self._session.execute(*args, **kwargs)

    def __getattr__(self, item: str) -> Any:
        return getattr(self._session, item)


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


@pytest.fixture(scope="function")
def async_client(test_db) -> AsyncClient:
    """
    Async HTTP client wired to FastAPI app with test DB override.
    """

    def override_get_db() -> Iterator[Any]:
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://testserver")
    yield client
    asyncio.run(client.aclose())
    app.dependency_overrides.clear()


@pytest.fixture
def async_session(test_db) -> AsyncSessionAdapter:
    return AsyncSessionAdapter(test_db)


@pytest.fixture
def auth_headers(student_headers: dict) -> dict:
    return student_headers


@pytest.fixture
def company_auth_headers(company_headers: dict) -> dict:
    return company_headers


@pytest.fixture
def test_user(test_student: User) -> User:
    return test_student


@pytest.fixture
def inactive_user(test_db) -> User:
    user = User(
        id=uuid4(),
        email="inactive.user@example.com",
        full_name="Inactive User",
        phone="+998901111222",
        role=UserRole.STUDENT,
        is_active_account=False,
        is_verified=True,
    )
    user.set_password("InactivePass123!")
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def auth_tokens(test_user: User) -> dict[str, str]:
    return {
        "access_token": create_access_token(
            subject=str(test_user.id),
            additional_claims={"role": test_user.role.value},
        ),
        "refresh_token": create_refresh_token(subject=str(test_user.id)),
    }


@pytest.fixture
def premium_student(test_db, test_student: User) -> User:
    """
    Activate a premium subscription for auto-apply integration tests.
    """
    test_student.subscription_tier = "premium"
    from datetime import datetime, timezone, timedelta

    test_student.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    test_db.commit()
    test_db.refresh(test_student)
    return test_student


@pytest.fixture
def multiple_jobs(test_db, test_company: User) -> list[Job]:
    jobs: list[Job] = []
    for idx, sample in enumerate(SAMPLE_JOBS[:3]):
        job = Job(
            id=uuid4(),
            company_id=test_company.id,
            title=sample.get("title", f"Sample Job {idx + 1}"),
            description=sample.get("description", "Sample job description"),
            requirements=sample.get("requirements", {"skills": []}),
            salary_min=sample.get("salary_min"),
            salary_max=sample.get("salary_max"),
            salary_currency="USD",
            location=sample.get("location", "Tashkent"),
            is_remote_allowed=True,
            job_type=sample.get("job_type", "full_time"),
            experience_level=sample.get("experience_level", "mid"),
            status="active",
        )
        test_db.add(job)
        jobs.append(job)

    test_db.commit()
    for job in jobs:
        test_db.refresh(job)
    return jobs


@pytest.fixture
def mock_openai(monkeypatch: pytest.MonkeyPatch):
    """
    Mock AI service methods used by AI endpoints.
    """
    from app.services import ai_service as ai_service_module

    def _fake_init(self, *args, **kwargs):
        self.client = object()

    async def _fake_generate_resume(*args, **kwargs):
        return {
            "personal_info": {"name": "Test User", "email": "test@example.com"},
            "summary": "AI generated summary",
            "skills": {"technical": ["Python", "FastAPI"], "soft": ["Communication"]},
            "work_experience": [],
            "education": [],
        }

    async def _fake_generate_cover_letter(*args, **kwargs):
        return "Mock cover letter"

    def _fake_usage_summary(*args, **kwargs):
        return {"total_tokens": 0}

    monkeypatch.setattr(ai_service_module.AIService, "__init__", _fake_init)
    monkeypatch.setattr(ai_service_module.AIService, "generate_resume", _fake_generate_resume)
    monkeypatch.setattr(ai_service_module.AIService, "generate_cover_letter", _fake_generate_cover_letter)
    monkeypatch.setattr(ai_service_module.AIService, "get_usage_summary", _fake_usage_summary)
    return {"mocked": True}


@pytest.fixture
def mock_email_service(monkeypatch: pytest.MonkeyPatch):
    """
    Prevent real email sends during auth integration tests.
    """
    from app.api.v1.routes import auth as auth_routes

    async def _noop_send(*args, **kwargs):
        return True

    monkeypatch.setattr(auth_routes, "send_password_reset_email", _noop_send)

    mock_service = type("MockEmailService", (), {})()
    mock_service.send_password_reset_email = AsyncMock(side_effect=_noop_send)
    return mock_service


@pytest.fixture(autouse=True)
def compat_create_access_token(monkeypatch: pytest.MonkeyPatch):
    """
    Backward-compatible create_access_token(data={...}) for legacy tests.
    """
    from app.core import security as security_module

    original = security_module.create_access_token

    def _compat(*args, **kwargs):
        if "data" not in kwargs:
            return original(*args, **kwargs)

        data = kwargs.pop("data") or {}
        subject = kwargs.pop("subject", data.get("sub"))
        additional_claims = kwargs.pop("additional_claims", {})
        payload_claims = {k: v for k, v in data.items() if k != "sub"}
        if additional_claims:
            payload_claims.update(additional_claims)
        return original(
            subject=subject,
            additional_claims=payload_claims or None,
            **kwargs,
        )

    monkeypatch.setattr(security_module, "create_access_token", _compat)
