"""
=============================================================================
RATE LIMITER
=============================================================================

Rate limiting implementation for API endpoints.

Features:
- In-memory rate limiting (production: Redis)
- Per-IP and per-user limits
- Configurable windows and limits
- Brute-force protection for login

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import time
import logging
import threading
from typing import Dict, Tuple, Optional
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status

from app.config import settings
from app.core.redis_client import get_redis

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)


# Throttle the fallback alarm so a sustained Redis outage doesn't flood logs.
_LAST_FALLBACK_WARN_TS: Dict[str, float] = {}
_FALLBACK_WARN_INTERVAL_SECONDS = 60.0


def _warn_rate_limit_fallback(scope: str) -> None:
    """
    Emit an alertable log line when the rate limiter falls back from Redis
    to per-process memory while Redis was expected. Per-worker memory means
    the effective budget is multiplied by gunicorn worker count and is not
    consistent across replicas — SRE should know.

    No-op when RATE_LIMIT_USE_REDIS=false or in DEBUG (legitimate dev mode).
    """
    if not settings.RATE_LIMIT_USE_REDIS or settings.DEBUG:
        return
    now = time.time()
    last = _LAST_FALLBACK_WARN_TS.get(scope, 0.0)
    if now - last < _FALLBACK_WARN_INTERVAL_SECONDS:
        return
    _LAST_FALLBACK_WARN_TS[scope] = now
    logger.error(
        "RATE_LIMIT_REDIS_UNAVAILABLE: scope=%s — using per-worker in-memory "
        "limiter; effective budget is multiplied by worker count and not "
        "consistent across replicas",
        scope,
    )


# =============================================================================
# RATE LIMITER CLASS
# =============================================================================

class RateLimiter:
    """
    In-memory rate limiter.
    
    For production, use Redis-based rate limiting.
    """
    
    def __init__(self):
        """Initialize rate limiter."""
        # Storage: {key: [(timestamp, count), ...]}
        self._storage: Dict[str, list] = defaultdict(list)

        # Failed login attempts: {identifier: [(timestamp, ip), ...]}
        self._failed_logins: Dict[str, list] = defaultdict(list)

        # Locked accounts: {identifier: unlock_time}
        self._locked_accounts: Dict[str, datetime] = {}

        self._lock = threading.Lock()
        self._last_cleanup = time.time()

        logger.info("RateLimiter initialized (in-memory mode)")

    def _maybe_cleanup(self):
        """Prune completely-stale keys every 5 minutes to prevent unbounded growth.
        Must be called while holding self._lock."""
        now = time.time()
        if now - self._last_cleanup < 300:
            return
        self._last_cleanup = now
        cutoff = now - 3600
        stale = [k for k, entries in self._storage.items()
                 if not entries or all(ts < cutoff for ts, _ in entries)]
        for k in stale:
            del self._storage[k]
    
    def check_rate_limit(
        self,
        identifier: str,
        max_requests: int,
        window_seconds: int
    ) -> Tuple[bool, Optional[int]]:
        """
        Check if request is within rate limit.
        
        Args:
            identifier: Unique identifier (IP, user ID, etc.)
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        with self._lock:
            now = time.time()
            window_start = now - window_seconds

            # Clean old entries for this key
            if identifier in self._storage:
                self._storage[identifier] = [
                    (ts, count) for ts, count in self._storage[identifier]
                    if ts > window_start
                ]

            current_count = sum(count for ts, count in self._storage[identifier])

            if current_count >= max_requests:
                oldest_ts = min(ts for ts, _ in self._storage[identifier])
                retry_after = int(window_seconds - (now - oldest_ts)) + 1
                logger.warning(
                    f"Rate limit exceeded for {identifier[:20]}... "
                    f"({current_count}/{max_requests} in {window_seconds}s)"
                )
                return False, retry_after

            self._storage[identifier].append((now, 1))
            self._maybe_cleanup()
            return True, None
    
    def record_failed_login(
        self,
        identifier: str,
        ip_address: str,
        max_attempts: int = 5,
        lockout_minutes: int = 15
    ) -> Tuple[bool, Optional[int], int]:
        """
        Record a failed login attempt.
        
        Args:
            identifier: Email or username
            ip_address: IP address
            max_attempts: Maximum failed attempts before lockout
            lockout_minutes: Lockout duration in minutes
            
        Returns:
            Tuple of (is_locked, unlock_after_seconds, remaining_attempts)
        """
        with self._lock:
            now = datetime.now(timezone.utc)

            # Check if already locked
            if identifier in self._locked_accounts:
                unlock_time = self._locked_accounts[identifier]
                if now < unlock_time:
                    seconds_left = int((unlock_time - now).total_seconds())
                    logger.warning(f"Account locked: {identifier[:20]}... ({seconds_left}s remaining)")
                    return True, seconds_left, 0
                else:
                    del self._locked_accounts[identifier]
                    self._failed_logins[identifier] = []

            # Record failed attempt
            self._failed_logins[identifier].append((now, ip_address))

            # Clean old attempts outside the lockout window
            window_start = now - timedelta(minutes=lockout_minutes)
            self._failed_logins[identifier] = [
                (ts, ip) for ts, ip in self._failed_logins[identifier]
                if ts > window_start
            ]

            recent_attempts = len(self._failed_logins[identifier])
            remaining = max(0, max_attempts - recent_attempts)

            if recent_attempts >= max_attempts:
                unlock_time = now + timedelta(minutes=lockout_minutes)
                self._locked_accounts[identifier] = unlock_time
                seconds_left = lockout_minutes * 60
                logger.critical(
                    f"Account locked due to {recent_attempts} failed attempts: "
                    f"{identifier[:20]}... from IPs: {[ip for _, ip in self._failed_logins[identifier]]}"
                )
                return True, seconds_left, 0

            logger.info(f"Failed login recorded: {identifier[:20]}... ({remaining} attempts remaining)")
            return False, None, remaining
    
    def clear_failed_logins(self, identifier: str):
        """Clear failed login attempts after successful login."""
        with self._lock:
            if identifier in self._failed_logins:
                del self._failed_logins[identifier]
            if identifier in self._locked_accounts:
                del self._locked_accounts[identifier]
        logger.info(f"Failed login attempts cleared: {identifier[:20]}...")
    
    def is_account_locked(self, identifier: str) -> Tuple[bool, Optional[int]]:
        """
        Check if account is currently locked.
        
        Returns:
            Tuple of (is_locked, unlock_after_seconds)
        """
        with self._lock:
            if identifier not in self._locked_accounts:
                return False, None

            now = datetime.now(timezone.utc)
            unlock_time = self._locked_accounts[identifier]

            if now >= unlock_time:
                del self._locked_accounts[identifier]
                return False, None

            seconds_left = int((unlock_time - now).total_seconds())
            return True, seconds_left


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

rate_limiter = RateLimiter()


# =============================================================================
# REDIS RATE LIMITER (PRODUCTION)
# =============================================================================

class RedisRateLimiter:
    """
    Redis-backed rate limiter + login lockout.

    Implementation details:
    - Per-window counters using INCR + EXPIRE
    - Lockout key with TTL
    """

    def __init__(self):
        self.redis = get_redis()
        mode = "redis" if self.redis else "disabled"
        logger.info(f"RedisRateLimiter initialized ({mode})")

    def _window_key(self, prefix: str, identifier: str, window_seconds: int) -> str:
        now = int(time.time())
        bucket = now // window_seconds
        return f"rl:{prefix}:{identifier}:{bucket}"

    def check_rate_limit(
        self,
        identifier: str,
        max_requests: int,
        window_seconds: int,
        key_prefix: str = "api",
    ) -> Tuple[bool, Optional[int]]:
        if not self.redis:
            return True, None

        key = self._window_key(key_prefix, identifier, window_seconds)
        try:
            count = int(self.redis.incr(key))
            # ensure TTL exists (only set on first hit)
            if count == 1:
                self.redis.expire(key, window_seconds + 2)

            if count > max_requests:
                ttl = int(self.redis.ttl(key))
                retry_after = ttl if ttl > 0 else window_seconds
                return False, retry_after

            return True, None
        except Exception as e:
            logger.warning(f"Redis rate limit failed (fallback allow): {e}")
            return True, None

    def record_failed_login(
        self,
        identifier: str,
        ip_address: str,
        max_attempts: int = 5,
        lockout_minutes: int = 15,
    ) -> Tuple[bool, Optional[int], int]:
        if not self.redis:
            return False, None, max_attempts

        email = identifier.lower()
        lock_key = f"lock:login:{email}"
        fail_key = f"fail:login:{email}"
        lock_seconds = lockout_minutes * 60

        try:
            # already locked?
            if self.redis.exists(lock_key):
                ttl = int(self.redis.ttl(lock_key))
                return True, ttl if ttl > 0 else lock_seconds, 0

            # increment fail count with TTL window
            fails = int(self.redis.incr(fail_key))
            if fails == 1:
                self.redis.expire(fail_key, lock_seconds)

            remaining = max(0, max_attempts - fails)

            if fails >= max_attempts:
                # lock account
                self.redis.set(lock_key, ip_address, ex=lock_seconds)
                # optional: delete fail counter so it resets after lock
                self.redis.delete(fail_key)
                return True, lock_seconds, 0

            return False, None, remaining
        except Exception as e:
            logger.warning(f"Redis failed-login tracking failed (fallback): {e}")
            return False, None, max_attempts

    def clear_failed_logins(self, identifier: str) -> None:
        if not self.redis:
            return
        email = identifier.lower()
        try:
            self.redis.delete(f"fail:login:{email}")
            self.redis.delete(f"lock:login:{email}")
        except Exception as e:
            logger.warning(f"Redis clear_failed_logins failed: {e}")

    def is_account_locked(self, identifier: str) -> Tuple[bool, Optional[int]]:
        if not self.redis:
            return False, None
        email = identifier.lower()
        lock_key = f"lock:login:{email}"
        try:
            if not self.redis.exists(lock_key):
                return False, None
            ttl = int(self.redis.ttl(lock_key))
            return True, ttl if ttl > 0 else None
        except Exception as e:
            logger.warning(f"Redis is_account_locked failed (fallback): {e}")
            return False, None


redis_rate_limiter = RedisRateLimiter()


# =============================================================================
# FASTAPI DEPENDENCIES
# =============================================================================

def check_rate_limit_dependency(
    max_requests: int = 60,
    window_seconds: int = 60
):
    """
    FastAPI dependency for rate limiting.
    
    Usage:
        @router.get("/endpoint", dependencies=[Depends(check_rate_limit_dependency(max_requests=10, window_seconds=60))])
    """
    async def dependency(request: Request):
        if not settings.RATE_LIMIT_ENABLED:
            return

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Prefer Redis in production
        if settings.RATE_LIMIT_USE_REDIS and get_redis():
            is_allowed, retry_after = redis_rate_limiter.check_rate_limit(
                identifier=client_ip,
                max_requests=max_requests,
                window_seconds=window_seconds,
                key_prefix="api_ip",
            )
        else:
            _warn_rate_limit_fallback("api_ip")
            is_allowed, retry_after = rate_limiter.check_rate_limit(
                identifier=client_ip,
                max_requests=max_requests,
                window_seconds=window_seconds
            )
        
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
    
    return dependency


def check_login_rate_limit(request: Request, identifier: Optional[str] = None):
    """
    Specific rate limiter for login endpoint.
    
    Stricter limits to prevent brute-force attacks.
    """
    if not settings.RATE_LIMIT_ENABLED:
        return

    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"login:{client_ip}"
    if identifier:
        rate_key = f"login:{client_ip}:{identifier.lower()}"

    # 5 login attempts per minute per IP
    if settings.RATE_LIMIT_USE_REDIS and get_redis():
        is_allowed, retry_after = redis_rate_limiter.check_rate_limit(
            identifier=rate_key,
            max_requests=5,
            window_seconds=60,
            key_prefix="login_ip",
        )
    else:
        _warn_rate_limit_fallback("login_ip")
        is_allowed, retry_after = rate_limiter.check_rate_limit(
            identifier=rate_key,
            max_requests=5,
            window_seconds=60
        )
    
    if not is_allowed:
        logger.warning(f"Login rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def record_failed_login(email: str, ip_address: str) -> Tuple[bool, Optional[int], int]:
    """
    Record a failed login attempt.
    
    Returns:
        Tuple of (is_locked, unlock_after_seconds, remaining_attempts)
    """
    if not settings.RATE_LIMIT_ENABLED:
        return False, None, 5

    if settings.RATE_LIMIT_USE_REDIS and get_redis():
        return redis_rate_limiter.record_failed_login(
            identifier=email.lower(),
            ip_address=ip_address,
            max_attempts=5,
            lockout_minutes=15,
        )
    return rate_limiter.record_failed_login(
        identifier=email.lower(),
        ip_address=ip_address,
        max_attempts=5,  # 5 failed attempts
        lockout_minutes=15  # 15 minute lockout
    )


def clear_failed_logins(email: str):
    """Clear failed login attempts after successful login."""
    if not settings.RATE_LIMIT_ENABLED:
        return

    if settings.RATE_LIMIT_USE_REDIS and get_redis():
        redis_rate_limiter.clear_failed_logins(email.lower())
        return
    rate_limiter.clear_failed_logins(email.lower())


def is_account_locked(email: str) -> Tuple[bool, Optional[int]]:
    """Check if account is locked due to failed login attempts."""
    if not settings.RATE_LIMIT_ENABLED:
        return False, None

    if settings.RATE_LIMIT_USE_REDIS and get_redis():
        return redis_rate_limiter.is_account_locked(email.lower())
    return rate_limiter.is_account_locked(email.lower())







