"""
=============================================================================
RATE_LIMIT DEPENDENCY TESTS (R3 follow-up)
=============================================================================

The dependencies.py rate_limit() factory is the single dependency used by
every Depends(rate_limit(...)) call site (10 AI endpoints + 2 application
endpoints). These tests cover the contract:

1. In-memory path: 429 fires after N requests for the same user/path.
2. Different paths do not share a bucket.
3. Different users do not share a bucket.
4. Anonymous callers are keyed by IP (no global "anonymous" collision).
5. Redis path is selected when configured + healthy and delegates to the
   shared RedisRateLimiter.
6. Production Redis fallback emits the R3 RATE_LIMIT_REDIS_UNAVAILABLE log.
"""

from __future__ import annotations

import asyncio
import logging
from unittest.mock import MagicMock

import pytest
from fastapi import Depends, FastAPI, Request
from fastapi.testclient import TestClient

from app.config import settings
from app.core import dependencies as deps_module
from app.core import rate_limiter as rl_module


def _fresh_app(window_seconds: int = 60) -> FastAPI:
    """Build a tiny app whose routes are protected by the real rate_limit dep.

    We expose two distinct paths so we can assert per-route bucket isolation.
    """
    app = FastAPI()

    @app.get("/route-a")
    async def route_a(_: None = Depends(deps_module.rate_limit(2, window_seconds))):
        return {"ok": "a"}

    @app.get("/route-b")
    async def route_b(_: None = Depends(deps_module.rate_limit(2, window_seconds))):
        return {"ok": "b"}

    return app


@pytest.fixture(autouse=True)
def _reset_inmemory_store():
    """Each test starts with a clean in-memory bucket."""
    deps_module._rate_limit_store.clear()
    yield
    deps_module._rate_limit_store.clear()


# -----------------------------------------------------------------------------
# In-memory path
# -----------------------------------------------------------------------------


def test_in_memory_rate_limit_returns_429_after_quota(monkeypatch):
    """Same caller, same route, 3rd request → 429 with a Retry-After-free body."""
    monkeypatch.setattr(settings, "RATE_LIMIT_USE_REDIS", False)
    client = TestClient(_fresh_app())

    r1 = client.get("/route-a")
    r2 = client.get("/route-a")
    r3 = client.get("/route-a")

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 429
    body = r3.json()
    assert "rate limit exceeded" in (body.get("detail") or "").lower()


def test_different_routes_have_independent_buckets(monkeypatch):
    """Per-route scope: exhausting /route-a must not 429 /route-b."""
    monkeypatch.setattr(settings, "RATE_LIMIT_USE_REDIS", False)
    client = TestClient(_fresh_app())

    assert client.get("/route-a").status_code == 200
    assert client.get("/route-a").status_code == 200
    assert client.get("/route-a").status_code == 429  # bucket A exhausted
    # bucket B must still be fresh
    assert client.get("/route-b").status_code == 200
    assert client.get("/route-b").status_code == 200
    assert client.get("/route-b").status_code == 429


def test_anonymous_callers_keyed_by_ip(monkeypatch):
    """No global 'anonymous' bucket: a different client IP gets its own quota."""
    monkeypatch.setattr(settings, "RATE_LIMIT_USE_REDIS", False)
    app = _fresh_app()

    # TestClient lets us spoof the source via the X-Forwarded-For header only
    # if we wire a middleware — instead, hit the dep with two TestClients (each
    # of which represents the same loopback IP). To get distinct IPs we patch
    # request.client.host through a tiny middleware.
    @app.middleware("http")
    async def force_client_ip(request, call_next):
        spoofed = request.headers.get("x-test-client-ip")
        if spoofed:
            # Starlette's Request.client is read-only; mutate the underlying scope.
            request.scope["client"] = (spoofed, 0)
        return await call_next(request)

    client = TestClient(app)

    # Caller 1 (IP 10.0.0.1) exhausts /route-a
    assert client.get("/route-a", headers={"x-test-client-ip": "10.0.0.1"}).status_code == 200
    assert client.get("/route-a", headers={"x-test-client-ip": "10.0.0.1"}).status_code == 200
    assert client.get("/route-a", headers={"x-test-client-ip": "10.0.0.1"}).status_code == 429

    # Caller 2 (IP 10.0.0.2) is unaffected
    assert client.get("/route-a", headers={"x-test-client-ip": "10.0.0.2"}).status_code == 200


# -----------------------------------------------------------------------------
# Redis path
# -----------------------------------------------------------------------------


def test_redis_path_is_used_when_enabled_and_healthy(monkeypatch):
    """When RATE_LIMIT_USE_REDIS=true and get_redis() returns a client, the
    dep must call redis_rate_limiter.check_rate_limit, not the in-memory path."""
    monkeypatch.setattr(settings, "RATE_LIMIT_USE_REDIS", True)

    fake_redis_client = MagicMock(name="fake_redis_client")
    monkeypatch.setattr(deps_module, "get_redis", lambda: fake_redis_client)

    calls = []

    def fake_check(identifier, max_requests, window_seconds, key_prefix="dep"):
        calls.append({"id": identifier, "max": max_requests, "prefix": key_prefix})
        return True, None

    monkeypatch.setattr(rl_module.redis_rate_limiter, "check_rate_limit", fake_check)

    client = TestClient(_fresh_app())
    r = client.get("/route-a")

    assert r.status_code == 200
    assert len(calls) == 1, "Redis limiter should have been called exactly once"
    assert calls[0]["prefix"] == "dep"
    assert calls[0]["max"] == 2
    # Composite key carries the route scope, not just the identity.
    assert "/route-a" in calls[0]["id"]
    # In-memory store should NOT have been used.
    assert not deps_module._rate_limit_store, (
        "In-memory store was populated; the Redis path was not taken"
    )


def test_redis_path_returns_429_with_retry_after(monkeypatch):
    """When RedisRateLimiter returns (False, retry_after), the dep must
    raise 429 and surface Retry-After in the response headers."""
    monkeypatch.setattr(settings, "RATE_LIMIT_USE_REDIS", True)
    monkeypatch.setattr(deps_module, "get_redis", lambda: MagicMock())

    def fake_check(identifier, max_requests, window_seconds, key_prefix="dep"):
        return False, 42

    monkeypatch.setattr(rl_module.redis_rate_limiter, "check_rate_limit", fake_check)

    client = TestClient(_fresh_app())
    r = client.get("/route-a")

    assert r.status_code == 429
    assert r.headers.get("retry-after") == "42"


# -----------------------------------------------------------------------------
# Production fallback warning
# -----------------------------------------------------------------------------


def test_production_fallback_emits_alertable_log(monkeypatch, caplog):
    """When RATE_LIMIT_USE_REDIS=true but get_redis() is None in production,
    the dep must fall back to in-memory AND emit the R3 stable log line."""
    monkeypatch.setattr(settings, "DEBUG", False)
    monkeypatch.setattr(settings, "RATE_LIMIT_USE_REDIS", True)
    monkeypatch.setattr(deps_module, "get_redis", lambda: None)
    # Reset the per-scope throttle so the test deterministically logs.
    rl_module._LAST_FALLBACK_WARN_TS.clear()

    client = TestClient(_fresh_app())

    with caplog.at_level(logging.ERROR, logger="app.core.rate_limiter"):
        r = client.get("/route-a")

    assert r.status_code == 200  # still served (fail-open)
    assert any(
        "RATE_LIMIT_REDIS_UNAVAILABLE" in rec.message for rec in caplog.records
    ), f"Expected R3 alert log; got: {[r.message for r in caplog.records]}"
