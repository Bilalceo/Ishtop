"""
=============================================================================
HEALTH + REDIS DEGRADATION TESTS (R3)
=============================================================================

Verifies that /health and the token blacklist behave safely when Redis is
expected but unavailable in production. These tests do not require a real
Redis — they monkey-patch the live probe.
"""

import logging
import re

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# -----------------------------------------------------------------------------
# /health
# -----------------------------------------------------------------------------


def test_health_reports_redis_disabled_when_not_enabled(client, monkeypatch):
    """Default dev posture: REDIS_ENABLED=false → health says disabled, 200."""
    monkeypatch.setattr(settings, "REDIS_ENABLED", False)
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["redis"] == "disabled"
    assert body["status"] == "healthy"


def test_health_reports_redis_connected_when_ping_succeeds(client, monkeypatch):
    monkeypatch.setattr(settings, "REDIS_ENABLED", True)
    monkeypatch.setattr("app.main.ping_redis", lambda: True, raising=False)
    # ping_redis is imported lazily inside the handler — patch its source too.
    import app.core.redis_client as rc
    monkeypatch.setattr(rc, "ping_redis", lambda: True)

    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["redis"] == "connected"
    assert body["status"] == "healthy"


def test_health_returns_503_degraded_when_redis_down_in_production(
    client, monkeypatch
):
    """
    Production posture: REDIS_ENABLED=true but Redis is unreachable. The
    /health endpoint must demote status to "degraded" and return 503 so
    monitoring pages, instead of returning 200 with a buried hint.
    """
    monkeypatch.setattr(settings, "DEBUG", False)
    monkeypatch.setattr(settings, "REDIS_ENABLED", True)
    monkeypatch.setattr(settings, "TOKEN_BLACKLIST_USE_REDIS", True)
    monkeypatch.setattr(settings, "RATE_LIMIT_USE_REDIS", True)
    import app.core.redis_client as rc
    monkeypatch.setattr(rc, "ping_redis", lambda: False)

    r = client.get("/health")
    assert r.status_code == 503, r.text
    body = r.json()
    assert body["status"] == "degraded"
    assert body["redis"] == "unavailable"
    assert set(body.get("degraded_features", [])) == {
        "token_blacklist",
        "rate_limit",
    }


def test_health_response_never_leaks_redis_url_or_password(client, monkeypatch):
    """
    Whatever the Redis state, /health must never include the REDIS_URL or
    any credential in its response body.
    """
    monkeypatch.setattr(settings, "REDIS_URL", "redis://hunter2-secret@example:6379/0")
    monkeypatch.setattr(settings, "REDIS_ENABLED", True)
    monkeypatch.setattr(settings, "DEBUG", False)
    import app.core.redis_client as rc
    monkeypatch.setattr(rc, "ping_redis", lambda: False)

    r = client.get("/health")
    text = r.text.lower()
    # Neither the secret nor any redis URL piece should leak.
    assert "hunter2-secret" not in text
    assert "redis://" not in text
    assert "@example:6379" not in text


# -----------------------------------------------------------------------------
# Token blacklist degraded-state log
# -----------------------------------------------------------------------------


def test_blacklist_emits_alertable_error_when_redis_unavailable_in_production(
    monkeypatch, caplog
):
    """
    In production, when TOKEN_BLACKLIST_USE_REDIS=true but Redis is missing,
    blacklist_token() must still write to in-memory (UX-preserving fail open)
    AND emit a stable, alertable error so SRE can wire an alarm.
    """
    from app.core import security

    monkeypatch.setattr(settings, "DEBUG", False)
    monkeypatch.setattr(settings, "TOKEN_BLACKLIST_USE_REDIS", True)
    # Force the get_redis() lookup to return None — the "Redis-was-down-at-boot"
    # case is what most often causes silent degradation in production.
    monkeypatch.setattr(security, "get_redis", lambda: None)

    # Build a real JWT so _get_token_jti finds a jti claim.
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": "user-r3-test", "user_id": "user-r3-test"})

    with caplog.at_level(logging.ERROR, logger="app.core.security"):
        security.blacklist_token(token)

    assert any(
        "BLACKLIST_REDIS_UNAVAILABLE" in rec.message for rec in caplog.records
    ), f"Expected alertable error; got: {[r.message for r in caplog.records]}"


def test_blacklist_silent_in_dev_when_redis_unavailable(monkeypatch, caplog):
    """Local dev: same outage must NOT escalate to ERROR (avoids log noise)."""
    from app.core import security

    monkeypatch.setattr(settings, "DEBUG", True)
    monkeypatch.setattr(settings, "TOKEN_BLACKLIST_USE_REDIS", True)
    monkeypatch.setattr(security, "get_redis", lambda: None)

    from app.core.security import create_access_token

    token = create_access_token(data={"sub": "user-r3-dev", "user_id": "user-r3-dev"})

    with caplog.at_level(logging.WARNING, logger="app.core.security"):
        security.blacklist_token(token)

    assert not any(
        "BLACKLIST_REDIS_UNAVAILABLE" in rec.message for rec in caplog.records
    ), "Dev mode must not emit the production-alert log line"
