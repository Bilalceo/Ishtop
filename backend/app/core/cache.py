"""
Redis Caching Layer
Provides caching functionality for expensive operations
"""

import json
import logging
from typing import Any, Optional, Callable
from functools import wraps
import hashlib

try:
    import redis
    from redis import Redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from app.config import settings

logger = logging.getLogger(__name__)


class CacheClient:
    """
    Redis cache client with fallback to no-op if Redis is not available.
    """
    
    def __init__(self):
        self.redis: Optional[Redis] = None
        self.enabled = False
        
        if not REDIS_AVAILABLE:
            logger.warning("Redis not installed. Caching disabled. Install: pip install redis")
            return
        
        if not settings.REDIS_URL:
            logger.info("REDIS_URL not configured. Caching disabled.")
            return
        
        try:
            self.redis = Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Test connection
            self.redis.ping()
            self.enabled = True
            logger.info(f"Redis cache connected: {settings.REDIS_URL}")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Caching disabled.")
            self.redis = None
            self.enabled = False
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled:
            return None
        
        try:
            value = self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL (default 5 minutes)"""
        if not self.enabled:
            return False
        
        try:
            serialized = json.dumps(value, default=str)
            self.redis.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str):
        """Delete key from cache"""
        if not self.enabled:
            return False
        
        try:
            self.redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    def clear_pattern(self, pattern: str):
        """Clear all keys matching pattern using non-blocking SCAN."""
        if not self.enabled:
            return False

        try:
            cursor = 0
            deleted = 0
            while True:
                cursor, keys = self.redis.scan(cursor, match=pattern, count=100)
                if keys:
                    self.redis.delete(*keys)
                    deleted += len(keys)
                if cursor == 0:
                    break
            if deleted:
                logger.debug(f"Cache clear_pattern deleted {deleted} keys matching '{pattern}'")
            return True
        except Exception as e:
            logger.error(f"Cache clear pattern error: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.enabled:
            return False
        
        try:
            return self.redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Cache exists error: {e}")
            return False


# Global cache instance
cache = CacheClient()


def cache_key(*args, **kwargs) -> str:
    """Generate cache key from arguments"""
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
    key_string = ":".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def cached(ttl: int = 300, prefix: str = "cache"):
    """
    Decorator to cache function results.
    
    Args:
        ttl: Time to live in seconds (default 5 minutes)
        prefix: Cache key prefix
    
    Example:
        @cached(ttl=3600, prefix="jobs")
        def get_jobs(location: str):
            return expensive_db_query(location)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            key = f"{prefix}:{func.__name__}:{cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = cache.get(key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {key}")
                return cached_value
            
            # Execute function
            logger.debug(f"Cache miss: {key}")
            result = await func(*args, **kwargs)
            
            # Store in cache
            cache.set(key, result, ttl=ttl)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            key = f"{prefix}:{func.__name__}:{cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = cache.get(key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {key}")
                return cached_value
            
            # Execute function
            logger.debug(f"Cache miss: {key}")
            result = func(*args, **kwargs)
            
            # Store in cache
            cache.set(key, result, ttl=ttl)
            
            return result
        
        # Return appropriate wrapper based on function type
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# =============================================================================
# CACHE UTILITIES
# =============================================================================

def invalidate_user_cache(user_id: str):
    """Invalidate all cache entries for a user"""
    cache.clear_pattern(f"*:user:{user_id}:*")
    logger.debug(f"Invalidated cache for user: {user_id}")


def invalidate_job_cache(job_id: str):
    """Invalidate cache for a specific job"""
    cache.clear_pattern(f"*:job:{job_id}:*")
    logger.debug(f"Invalidated cache for job: {job_id}")


# =============================================================================
# COMMON CACHE KEYS
# =============================================================================

class CacheKeys:
    """Common cache key patterns"""
    
    # User caches
    USER_PROFILE = "user:profile:{user_id}"
    USER_RESUMES = "user:resumes:{user_id}"
    USER_APPLICATIONS = "user:applications:{user_id}"
    
    # Job caches
    JOB_LIST = "jobs:list:{skip}:{limit}:{filters}"
    JOB_DETAIL = "job:detail:{job_id}"
    JOB_SEARCH = "jobs:search:{query}"
    
    # AI caches (longer TTL)
    AI_RESUME = "ai:resume:{user_id}"
    AI_COVER_LETTER = "ai:cover_letter:{user_id}:{job_id}"


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

"""
# In your route or service:

from app.core.cache import cached, cache

# Cache with decorator
@cached(ttl=3600, prefix="jobs")
async def get_jobs_by_location(location: str):
    # Expensive database query
    return db.query(Job).filter_by(location=location).all()

# Manual caching
def get_user_applications(user_id: str):
    key = f"user:applications:{user_id}"
    
    # Try cache first
    cached_data = cache.get(key)
    if cached_data:
        return cached_data
    
    # Fetch from database
    data = db.query(Application).filter_by(user_id=user_id).all()
    
    # Cache for 5 minutes
    cache.set(key, data, ttl=300)
    
    return data

# Invalidate cache when data changes
def update_user_profile(user_id: str, data: dict):
    db.update_user(user_id, data)
    
    # Clear user cache
    cache.delete(f"user:profile:{user_id}")
    # or
    invalidate_user_cache(user_id)
"""
