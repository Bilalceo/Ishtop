"""
=============================================================================
Configuration Settings for IshTop
=============================================================================

This file manages all application settings using Pydantic.
Settings are automatically loaded from environment variables or .env file.

USAGE:
    from app.config import settings
    
    # Access any setting
    api_key = settings.OPENAI_API_KEY
    model = settings.OPENAI_MODEL

HOW IT WORKS:
    1. Pydantic looks for a .env file in the project root
    2. Each setting maps to an environment variable
    3. If not found, the default value is used
    4. Type validation is automatic
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
import os
import sys
from pathlib import Path

from pydantic import AliasChoices, Field, ValidationInfo, field_validator, model_validator
from functools import lru_cache
from typing import Any, List


_BOOL_TRUE_VALUES = {"1", "true", "t", "yes", "y", "on", "enabled", "enable"}
_BOOL_FALSE_VALUES = {"0", "false", "f", "no", "n", "off", "disabled", "disable"}
_DEBUG_TRUE_VALUES = {"dev", "development", "debug", "local"}
_DEBUG_FALSE_VALUES = {"prod", "production", "release", "live"}
BACKEND_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_ROOT / ".env"


def _normalize_bool_value(value: Any, *, field_name: str, default: bool) -> bool:
    """
    Coerce loose environment values into booleans without raising validation errors.

    This accepts common boolean strings plus a few environment labels used in
    deployment setups (for example, DEBUG=release -> False).
    """
    if isinstance(value, bool):
        return value

    if isinstance(value, int) and not isinstance(value, bool):
        if value in (0, 1):
            return bool(value)

    if isinstance(value, str):
        normalized = value.strip().lower()

        if normalized in _BOOL_TRUE_VALUES:
            return True
        if normalized in _BOOL_FALSE_VALUES:
            return False

        if field_name == "DEBUG":
            if normalized in _DEBUG_TRUE_VALUES:
                return True
            if normalized in _DEBUG_FALSE_VALUES:
                return False

    return default


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All settings have default values for easy development,
    but you should set proper values in production.
    """
    
    # =========================================================================
    # 🔑 OPENAI API CONFIGURATION
    # =========================================================================
    
    # Your OpenAI API key (required for AI features)
    # Get it from: https://platform.openai.com/api-keys
    OPENAI_API_KEY: str = ""
    
    # Which GPT model to use
    # Options: "gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo"
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # Maximum tokens for AI responses
    # Higher = longer responses but more cost
    # Resume generation typically needs 1500-2000 tokens
    OPENAI_MAX_TOKENS: int = 2000
    
    # Temperature controls randomness (0.0 to 1.0)
    # Lower = more consistent, Higher = more creative
    OPENAI_TEMPERATURE: float = 0.7
    
    # Number of retry attempts if API call fails
    OPENAI_MAX_RETRIES: int = 3
    
    # Timeout for API calls in seconds
    OPENAI_TIMEOUT: int = 60
    
    # =========================================================================
    # 🌟 GOOGLE GEMINI API CONFIGURATION (BEPUL!)
    # =========================================================================
    
    # Gemini API kaliti - BEPUL!
    # Olish: https://ai.google.dev/
    GEMINI_API_KEY: str = ""
    
    # Gemini model tanlash
    # "gemini-2.5-flash" - Tavsiya etiladi (tez va zamonaviy)
    # "gemini-2.5-pro" - Kuchliroq
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Gemini transient error retry configuration
    GEMINI_MAX_RETRIES: int = 3
    GEMINI_RETRY_BASE_DELAY_SECONDS: float = 1
    GEMINI_RETRY_MAX_DELAY_SECONDS: float = 8
    
    # AI provider tanlash: "gemini" yoki "openai"
    AI_PROVIDER: str = "gemini"
    
    # =========================================================================
    # 🗄️ DATABASE CONFIGURATION
    # =========================================================================
    
    # Database connection string
    # Development: SQLite
    # Production: postgresql://user:password@host:port/database
    DATABASE_URL: str = "sqlite:///./ishtop.db"

    # =========================================================================
    # 🧠 REDIS (Rate limiting, token blacklist, OAuth state)
    # =========================================================================

    # Enable Redis-backed features in production
    REDIS_ENABLED: bool = False
    REDIS_URL: str = "redis://localhost:6379/0"

    # Master toggle for API rate limiting.
    # CI and E2E runs disable this to avoid flaky test lockouts.
    RATE_LIMIT_ENABLED: bool = True

    # If True and Redis is available, use Redis for rate limiting
    RATE_LIMIT_USE_REDIS: bool = True

    # If True and Redis is available, use Redis for token blacklist (logout)
    TOKEN_BLACKLIST_USE_REDIS: bool = True

    # OAuth state TTL (CSRF protection) in seconds
    OAUTH_STATE_TTL_SECONDS: int = 10 * 60
    
    # =========================================================================
    # 🔐 JWT AUTHENTICATION
    # =========================================================================
    
    # Secret key for signing JWT tokens
    # IMPORTANT: Generate a unique random key for production!
    # Generate with: openssl rand -hex 32
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    
    # JWT algorithm (HS256 is standard and secure)
    ALGORITHM: str = "HS256"
    
    # Access token lifetime in minutes (short for security)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Refresh token lifetime in days (longer, for convenience)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Cookie-based auth settings (recommended for browser clients).
    AUTH_ACCESS_COOKIE_NAME: str = "access_token"
    AUTH_REFRESH_COOKIE_NAME: str = "refresh_token"
    AUTH_COOKIE_DOMAIN: str = ""
    AUTH_COOKIE_PATH: str = "/"
    AUTH_COOKIE_SECURE: bool = True
    AUTH_COOKIE_HTTPONLY: bool = True
    AUTH_COOKIE_SAMESITE: str = "lax"  # lax | strict | none
    
    # =========================================================================
    # 🌐 APPLICATION SETTINGS
    # =========================================================================
    
    # Application name (shown in API docs and responses)
    APP_NAME: str = "IshTop"
    
    # Version number
    APP_VERSION: str = "1.0.0"

    # Progressive rollout flags (Trust / Explainability / Discovery)
    FEATURE_TRUST_ENGINE_ENABLED: bool = True
    FEATURE_EXPLAINABLE_MATCH_ENABLED: bool = True
    FEATURE_DISCOVERY_SEO_ENABLED: bool = True
    FEATURE_TRUST_ROLLOUT_PERCENT: int = 100
    FEATURE_EXPLAINABILITY_ROLLOUT_PERCENT: int = 100
    FEATURE_DISCOVERY_ROLLOUT_PERCENT: int = 100
    
    # Debug mode
    # True: Shows detailed errors, enables /docs endpoint
    # False: Hides errors, disables /docs (use in production)
    DEBUG: bool = Field(
        default=False,
        validation_alias=AliasChoices("SMARTCAREER_DEBUG", "DEBUG"),
    )
    
    # =========================================================================
    # 📁 FILE UPLOAD SETTINGS
    # =========================================================================
    
    # Directory for storing uploaded files
    UPLOAD_DIR: str = "uploads"
    
    # Maximum file size in bytes (default: 10MB)
    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    
    # Allowed file extensions for resume uploads
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".doc", ".txt"]
    
    # =========================================================================
    # 📧 EMAIL SETTINGS (SMTP)
    # =========================================================================
    
    # SMTP server settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@ishtop.uz"
    SMTP_FROM_NAME: str = "IshTop"
    SMTP_USE_TLS: bool = True
    
    # SendGrid (optional - for production)
    SENDGRID_API_KEY: str = ""

    # Email delivery mode.
    # auto: use SendGrid if configured, otherwise SMTP if credentials exist, otherwise no-op.
    # smtp: force SMTP transport.
    # sendgrid: force SendGrid transport.
    # disabled: skip outbound email delivery.
    EMAIL_TRANSPORT: str = "auto"

    # SMTP request timeout used by the fallback stdlib client.
    EMAIL_SMTP_TIMEOUT_SECONDS: int = 30
    
    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Support email
    SUPPORT_EMAIL: str = "support@ishtop.uz"

    # =========================================================================
    # 📲 TELEGRAM NOTIFICATIONS
    # =========================================================================

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_API_BASE_URL: str = "https://api.telegram.org"

    # Aggregated (Telegram-import) job applications are relayed to an internal
    # admin group via this bot, since those jobs have no real company account.
    TELEGRAM_APPS_BOT_TOKEN: str = ""
    TELEGRAM_APPS_CHAT_ID: str = ""

    # =========================================================================
    # 📬 COMPANY WEEKLY DIGEST
    # =========================================================================

    COMPANY_WEEKLY_DIGEST_ENABLED: bool = True
    COMPANY_WEEKLY_DIGEST_TIMEZONE: str = "Asia/Tashkent"
    COMPANY_WEEKLY_DIGEST_SEND_HOUR_LOCAL: int = 9
    COMPANY_WEEKLY_DIGEST_POLL_SECONDS: int = 900
    
    # =========================================================================
    # 🔐 OAUTH2 SETTINGS (Google, LinkedIn)
    # =========================================================================
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/callback/google"
    
    # LinkedIn OAuth
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    LINKEDIN_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/callback/linkedin"
    
    # OAuth enabled
    OAUTH_ENABLED: bool = False

    # =========================================================================
    # 👑 ADMIN BOOTSTRAP (Ops helper)
    # =========================================================================

    # If both email and password are provided, backend will create/promote
    # this account to admin on startup.
    BOOTSTRAP_ADMIN_EMAIL: str = ""
    BOOTSTRAP_ADMIN_PASSWORD: str = ""
    BOOTSTRAP_ADMIN_FULL_NAME: str = "System Admin"
    BOOTSTRAP_ADMIN_PHONE: str = "+998901111111"
    BOOTSTRAP_ADMIN_FORCE_SUPER_ADMIN: bool = True
    ADMIN_ENFORCE_SUBROLES: bool = False

    # =========================================================================
    # 🌱 STARTUP AUTO SEED (Production-safe)
    # =========================================================================

    # Enable controlled startup seed. Disabled by default.
    AUTO_SEED_ENABLED: bool = False

    # Ensure at least this many active jobs exist.
    # No destructive operations are performed; missing jobs are appended.
    AUTO_SEED_MIN_ACTIVE_JOBS: int = 10

    # Fallback company for seed jobs (created only if no company users exist).
    AUTO_SEED_COMPANY_EMAIL: str = "seed-company@ishtop.uz"
    AUTO_SEED_COMPANY_PASSWORD: str = "Company123!"
    AUTO_SEED_COMPANY_MANAGER_NAME: str = "IshTop HR Team"
    AUTO_SEED_COMPANY_NAME: str = "IshTop Hiring"
    AUTO_SEED_COMPANY_WEBSITE: str = "https://ishtop.uz"

    # =========================================================================
    # 🐛 ERROR MONITORING & LOGGING
    # =========================================================================
    
    # Sentry DSN for error tracking and performance monitoring
    # Get your DSN from: https://sentry.io (FREE tier available!)
    # Example: https://abc123@o123456.ingest.sentry.io/123456
    SENTRY_DSN: str = ""
    
    # Sentry environment (auto-detected from DEBUG)
    @property
    def sentry_environment(self) -> str:
        """Get Sentry environment based on DEBUG flag."""
        return "development" if self.DEBUG else "production"

    # =========================================================================
    # 💳 PAYMENTS (Stripe)
    # =========================================================================

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # If True, webhook signature MUST be configured (recommended for production)
    PAYMENTS_REQUIRE_WEBHOOK_SECRET: bool = True
    
    # =========================================================================
    # 🔗 CORS SETTINGS
    # =========================================================================
    
    # Allowed origins for CORS (frontend URLs)
    # Add your frontend URL for production
    # Can be comma-separated string or JSON list
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS_ORIGINS as a list."""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS
    
    # =========================================================================
    # PYDANTIC CONFIGURATION
    # =========================================================================
    
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator(
        "DEBUG",
        "REDIS_ENABLED",
        "RATE_LIMIT_ENABLED",
        "RATE_LIMIT_USE_REDIS",
        "TOKEN_BLACKLIST_USE_REDIS",
        "SMTP_USE_TLS",
        "OAUTH_ENABLED",
        "BOOTSTRAP_ADMIN_FORCE_SUPER_ADMIN",
        "ADMIN_ENFORCE_SUBROLES",
        "AUTO_SEED_ENABLED",
        "PAYMENTS_REQUIRE_WEBHOOK_SECRET",
        "AUTH_COOKIE_SECURE",
        "AUTH_COOKIE_HTTPONLY",
        "FEATURE_TRUST_ENGINE_ENABLED",
        "FEATURE_EXPLAINABLE_MATCH_ENABLED",
        "FEATURE_DISCOVERY_SEO_ENABLED",
        mode="before",
    )
    @classmethod
    def _normalize_bool_fields(cls, value: Any, info: ValidationInfo) -> bool:
        """Normalize loose env values before Pydantic's bool parsing runs."""
        default = bool(cls.model_fields[info.field_name].default)
        return _normalize_bool_value(value, field_name=info.field_name, default=default)

    @model_validator(mode="after")
    def _apply_dev_defaults(self) -> "Settings":
        """
        Apply safe developer defaults unless explicitly overridden.

        We disable rate limiting by default in DEBUG to avoid local lockouts when
        QA/testing repeatedly hits auth endpoints. Production environments should
        set RATE_LIMIT_ENABLED=true explicitly.
        """
        if self.DEBUG and "RATE_LIMIT_ENABLED" not in os.environ:
            self.RATE_LIMIT_ENABLED = False
        self.FEATURE_TRUST_ROLLOUT_PERCENT = max(0, min(100, int(self.FEATURE_TRUST_ROLLOUT_PERCENT)))
        self.FEATURE_EXPLAINABILITY_ROLLOUT_PERCENT = max(0, min(100, int(self.FEATURE_EXPLAINABILITY_ROLLOUT_PERCENT)))
        self.FEATURE_DISCOVERY_ROLLOUT_PERCENT = max(0, min(100, int(self.FEATURE_DISCOVERY_ROLLOUT_PERCENT)))
        return self

    @model_validator(mode="after")
    def _normalize_sqlite_database_url(self) -> "Settings":
        """
        Resolve relative SQLite URLs against backend root for stable local runs.

        This avoids accidental creation of multiple DB files when the server is
        started from different working directories.
        """
        prefix = "sqlite:///./"
        if self.DATABASE_URL.startswith(prefix):
            relative_path = self.DATABASE_URL[len(prefix):]
            absolute_path = (BACKEND_ROOT / relative_path).resolve()
            self.DATABASE_URL = f"sqlite:///{absolute_path.as_posix()}"
        return self

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        """
        Fail fast in production if the JWT signing secret is unsafe.

        When DEBUG is disabled we require a strong, non-default SECRET_KEY so
        deployments do not accidentally boot with a predictable token signer.
        """
        weak_secrets = {
            "",
            "your-super-secret-key-change-in-production",
            "CHANGE-THIS-TO-RANDOM-32-CHAR-STRING-USE-COMMAND-BELOW",
            "generate-a-secure-random-key-here",
            "secret",
            "changeme",
            "change-me",
            "test-secret",
            "test-secret-key-for-ci",
        }

        if not self.DEBUG:
            secret = (self.SECRET_KEY or "").strip()
            if len(secret) < 32 or secret in weak_secrets:
                raise ValueError(
                    "SECRET_KEY must be set to a strong unique value when DEBUG=False"
                )

        return self

    @model_validator(mode="after")
    def _validate_auth_cookie_settings(self) -> "Settings":
        """Validate cookie security knobs and normalize samesite value."""
        normalized_samesite = (self.AUTH_COOKIE_SAMESITE or "lax").strip().lower()
        if normalized_samesite not in {"lax", "strict", "none"}:
            normalized_samesite = "lax"
        self.AUTH_COOKIE_SAMESITE = normalized_samesite

        # Browsers reject SameSite=None without Secure.
        if self.AUTH_COOKIE_SAMESITE == "none" and not self.AUTH_COOKIE_SECURE:
            self.AUTH_COOKIE_SECURE = True

        # In production, strongly enforce Secure cookies.
        if not self.DEBUG:
            self.AUTH_COOKIE_SECURE = True

        return self

    @model_validator(mode="after")
    def _validate_production_environment(self) -> "Settings":
        """
        Block boot if production-critical safety settings are misconfigured.

        Only runs when DEBUG is False — local dev keeps relaxed defaults. The
        intent is to fail fast at startup instead of letting an unsafe instance
        accept real traffic. Skipped entirely under pytest (CI env where DEBUG
        may be flipped intentionally) by checking the PYTEST_CURRENT_TEST hint.
        """
        # Bypass when running tests. PYTEST_CURRENT_TEST is set per-test (not
        # at conftest-import time), so also check for the pytest module being
        # already imported, plus an explicit override for ad-hoc scripts
        # (e2e global-setup spawns a fresh python that doesn't import pytest).
        if (
            self.DEBUG
            or os.environ.get("PYTEST_CURRENT_TEST")
            or "pytest" in sys.modules
            or os.environ.get("SKIP_PROD_VALIDATOR") == "1"
        ):
            return self

        errors: List[str] = []

        # Rate limiting must be on to keep brute-force off the auth surface.
        if not self.RATE_LIMIT_ENABLED:
            errors.append(
                "RATE_LIMIT_ENABLED must be true in production (currently false)."
            )

        # CORS wildcards permit credentialed cross-origin requests to any site.
        for origin in self.cors_origins_list:
            if origin.strip() in {"*", "null"}:
                errors.append(
                    f"CORS_ORIGINS must list exact origins; wildcard {origin!r} is not allowed."
                )
                break

        # Local SQLite cannot survive container restarts and offers no concurrency.
        db_url = (self.DATABASE_URL or "").strip().lower()
        if db_url.startswith("sqlite:"):
            errors.append(
                "DATABASE_URL points to SQLite in production. Use Postgres (postgresql://...)."
            )

        # JWT blacklist + rate limiting both rely on Redis for cross-instance state.
        if not self.REDIS_ENABLED and (
            self.TOKEN_BLACKLIST_USE_REDIS or self.RATE_LIMIT_USE_REDIS
        ):
            errors.append(
                "REDIS_ENABLED must be true in production (TOKEN_BLACKLIST_USE_REDIS / "
                "RATE_LIMIT_USE_REDIS depend on it). Set REDIS_URL and flip REDIS_ENABLED."
            )

        # SECRET_KEY: belt-and-braces re-check on top of _validate_production_secrets.
        if len((self.SECRET_KEY or "").strip()) < 32:
            errors.append("SECRET_KEY must be at least 32 characters long in production.")

        # Cookie Secure: validator above forces this, but assert anyway.
        if not self.AUTH_COOKIE_SECURE:
            errors.append("AUTH_COOKIE_SECURE must be true in production.")

        # Access-token TTL: bounds the unrevoked window when the Redis-backed
        # blacklist is degraded (logout fails open by design — see R3 docs).
        # Hard cap at 10 minutes in production.
        if self.ACCESS_TOKEN_EXPIRE_MINUTES > 10:
            errors.append(
                "ACCESS_TOKEN_EXPIRE_MINUTES must be <= 10 in production "
                f"(currently {self.ACCESS_TOKEN_EXPIRE_MINUTES}). Long-lived "
                "access tokens widen the window during a Redis outage when "
                "token revocation cannot propagate across workers."
            )
        if self.ACCESS_TOKEN_EXPIRE_MINUTES < 1:
            errors.append(
                "ACCESS_TOKEN_EXPIRE_MINUTES must be >= 1 in production "
                f"(currently {self.ACCESS_TOKEN_EXPIRE_MINUTES})."
            )

        if errors:
            joined = "\n  - ".join(errors)
            raise ValueError(
                "Unsafe production configuration — refusing to boot:\n  - " + joined
            )

        return self


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Using @lru_cache ensures settings are only loaded once,
    which improves performance.
    
    Returns:
        Settings instance with all configuration values
    """
    return Settings()


# Create a global settings instance for easy importing
# Usage: from app.config import settings
settings = get_settings()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def validate_openai_config() -> dict:
    """
    Validate OpenAI configuration and return status.
    
    Use this to check if the AI service is properly configured
    before attempting to use it.
    
    Returns:
        Dictionary with validation results
        
    Example:
        status = validate_openai_config()
        if not status["valid"]:
            print(f"Error: {status['message']}")
    """
    if not settings.OPENAI_API_KEY:
        return {
            "valid": False,
            "message": "OPENAI_API_KEY is not set",
            "help": "Get your API key from https://platform.openai.com/api-keys"
        }
    
    if not settings.OPENAI_API_KEY.startswith("sk-"):
        return {
            "valid": False,
            "message": "OPENAI_API_KEY appears to be invalid (should start with 'sk-')",
            "help": "Check that you copied the full API key"
        }
    
    valid_models = ["gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"]
    if settings.OPENAI_MODEL not in valid_models:
        return {
            "valid": False,
            "message": f"OPENAI_MODEL '{settings.OPENAI_MODEL}' is not recognized",
            "help": f"Valid models: {', '.join(valid_models)}"
        }
    
    return {
        "valid": True,
        "message": "OpenAI configuration is valid",
        "model": settings.OPENAI_MODEL,
        "max_tokens": settings.OPENAI_MAX_TOKENS
    }


def log_config_summary():
    """
    Log a summary of current configuration.
    
    Useful for debugging and verifying settings on startup.
    Masks sensitive values like API keys.
    Uses logging instead of print for production compatibility.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    def mask_key(key: str) -> str:
        """Mask API key, showing only first and last 4 characters."""
        if not key or len(key) < 10:
            return "NOT SET"
        return f"{key[:4]}...{key[-4:]}"
    
    logger.info("=" * 60)
    logger.info("SMARTCAREER AI - CONFIGURATION SUMMARY")
    logger.info("=" * 60)
    
    logger.info("OpenAI Configuration:")
    logger.info(f"   API Key:     {mask_key(settings.OPENAI_API_KEY)}")
    logger.info(f"   Model:       {settings.OPENAI_MODEL}")
    logger.info(f"   Max Tokens:  {settings.OPENAI_MAX_TOKENS}")
    logger.info(f"   Temperature: {settings.OPENAI_TEMPERATURE}")
    
    logger.info("Database:")
    # Mask password in database URL
    db_url = settings.DATABASE_URL
    if "@" in db_url:
        parts = db_url.split("@")
        masked_url = parts[0].rsplit(":", 1)[0] + ":****@" + parts[1]
    else:
        masked_url = db_url
    logger.info(f"   URL: {masked_url}")
    
    logger.info("Application:")
    logger.info(f"   Name:    {settings.APP_NAME}")
    logger.info(f"   Version: {settings.APP_VERSION}")
    logger.info(f"   Debug:   {settings.DEBUG}")
    
    logger.info("CORS Origins:")
    for origin in settings.cors_origins_list:
        logger.info(f"   - {origin}")
    
    logger.info("=" * 60)


# Legacy function name for backward compatibility
print_config_summary = log_config_summary


# =============================================================================
# STARTUP VALIDATION
# =============================================================================

# Uncomment to print config summary on import (useful for debugging)
# print_config_summary()
