"""
=============================================================================
CONFIGURATION TESTS
=============================================================================

Focused tests for backend settings parsing and startup stability.

Tests must NEVER load the real `backend/.env` — doing so leaks production
secrets into pytest output on any failure and makes the test non-hermetic.
Use `_env_file=None` so Pydantic ignores the dotenv file entirely.
"""

import pytest


def _build_settings(**env):
    """Construct a fresh Settings instance with .env disabled."""
    from app.config import Settings

    return Settings(_env_file=None, **env)


def test_settings_normalize_loose_bool_env_values(monkeypatch):
    """Settings should tolerate non-boolean env strings without crashing."""
    monkeypatch.setenv("DEBUG", "release")
    monkeypatch.setenv("REDIS_ENABLED", "yes")
    monkeypatch.setenv("SMTP_USE_TLS", "0")
    monkeypatch.setenv("EMAIL_TRANSPORT", "disabled")
    # Strong SECRET_KEY required when DEBUG=False survives normalization.
    monkeypatch.setenv(
        "SECRET_KEY", "test-strong-secret-key-0123456789abcdef0123456789"
    )
    # Avoid tripping the production env validator on CORS/REDIS/DB rules.
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("RATE_LIMIT_USE_REDIS", "false")
    monkeypatch.setenv("TOKEN_BLACKLIST_USE_REDIS", "false")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/db")

    settings = _build_settings()

    assert settings.DEBUG is False
    assert settings.REDIS_ENABLED is True
    assert settings.SMTP_USE_TLS is False
    assert settings.EMAIL_TRANSPORT == "disabled"


# -----------------------------------------------------------------------------
# Access-token TTL — production hard cap (R3 follow-up)
# -----------------------------------------------------------------------------


def _set_prod_env(monkeypatch, **overrides):
    """Minimal env that passes every existing production validator clause.

    Pinning DEBUG=false flips the validator on; the rest satisfies the
    REDIS_ENABLED / SECRET_KEY / DATABASE_URL / CORS rules so the TTL check
    is isolated.
    """
    # The prod validator (_validate_production_environment) short-circuits
    # when PYTEST_CURRENT_TEST is set OR when pytest is in sys.modules OR
    # when SKIP_PROD_VALIDATOR=1, so the rest of the suite can keep using
    # relaxed envs. Disable every bypass here so the validator actually runs.
    import sys as _sys
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.delenv("SKIP_PROD_VALIDATOR", raising=False)
    monkeypatch.delitem(_sys.modules, "pytest", raising=False)
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("SECRET_KEY", "prod-strong-secret-0123456789abcdef0123456789")
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@localhost/db")
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("REDIS_ENABLED", "true")
    monkeypatch.setenv("RATE_LIMIT_USE_REDIS", "true")
    monkeypatch.setenv("TOKEN_BLACKLIST_USE_REDIS", "true")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.com")
    for key, value in overrides.items():
        monkeypatch.setenv(key, value)


def test_production_rejects_access_token_ttl_above_10_minutes(monkeypatch):
    """A 30-minute access TTL in prod must refuse to boot."""
    import pytest

    _set_prod_env(monkeypatch, ACCESS_TOKEN_EXPIRE_MINUTES="30")
    with pytest.raises(ValueError) as excinfo:
        _build_settings()
    msg = str(excinfo.value)
    assert "ACCESS_TOKEN_EXPIRE_MINUTES" in msg
    assert "<= 10" in msg


def test_production_accepts_access_token_ttl_at_cap(monkeypatch):
    """Exactly 10 minutes is the documented cap and must boot."""
    _set_prod_env(monkeypatch, ACCESS_TOKEN_EXPIRE_MINUTES="10")
    settings = _build_settings()
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 10
    assert settings.DEBUG is False


def test_production_rejects_zero_or_negative_access_token_ttl(monkeypatch):
    """Bad config (e.g. operator typo "0") must not silently disable auth."""
    import pytest

    _set_prod_env(monkeypatch, ACCESS_TOKEN_EXPIRE_MINUTES="0")
    with pytest.raises(ValueError) as excinfo:
        _build_settings()
    assert "ACCESS_TOKEN_EXPIRE_MINUTES" in str(excinfo.value)


def test_development_still_allows_30_minute_access_token_ttl(monkeypatch):
    """Local dev must not be tightened — 30 minutes (the existing default)
    must remain valid when DEBUG=true."""
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    settings = _build_settings()
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 30
    assert settings.DEBUG is True
