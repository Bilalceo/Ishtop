# ⚡ PERFORMANCE OPTIMIZATION GUIDE

**Make IshTop Fast & Scalable**  
**Generated:** 2026-01-19

---

## 🎯 PERFORMANCE TARGETS

### Response Times:
- ✅ API endpoints: <200ms (average)
- ✅ Database queries: <100ms
- ✅ Page load: <3 seconds
- ✅ AI responses: <5 seconds

### Scalability:
- ✅ 100 concurrent users
- ✅ 1000 requests/minute
- ✅ 10GB database

---

## 🚀 BACKEND OPTIMIZATIONS

### 1. Database Performance

#### Connection Pooling:
```python
# backend/app/config.py - Add these:
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
DB_ECHO=False  # Disable SQL logging in production

# backend/app/database.py - Update:
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    echo=settings.DB_ECHO,
)
```

#### Database Indexes:
```python
# Add indexes to frequently queried fields:

# backend/app/models/user.py
class User(Base):
    __tablename__ = "users"
    
    email = Column(String, unique=True, index=True)  # Already indexed
    is_active = Column(Boolean, default=True, index=True)  # Add index
    
    __table_args__ = (
        Index('ix_users_email_active', 'email', 'is_active'),
    )

# backend/app/models/job.py
class Job(Base):
    __tablename__ = "jobs"
    
    __table_args__ = (
        Index('ix_jobs_title_company', 'title', 'company_name'),
        Index('ix_jobs_location_type', 'location', 'job_type'),
        Index('ix_jobs_created', 'created_at'),
    )

# backend/app/models/university.py
class University(Base):
    __tablename__ = "universities"
    
    __table_args__ = (
        Index('ix_universities_country_ranking', 'country', 'world_ranking'),
        Index('ix_universities_search', 'name', 'country'),
    )
```

#### Query Optimization:
```python
# BAD - N+1 queries:
users = session.query(User).all()
for user in users:
    print(user.resumes)  # Separate query for each!

# GOOD - Eager loading:
users = session.query(User).options(
    joinedload(User.resumes)
).all()

# GOOD - Pagination:
def get_jobs_paginated(
    skip: int = 0,
    limit: int = 20
):
    return session.query(Job)\
        .offset(skip)\
        .limit(limit)\
        .all()
```

#### Database Caching:
```python
# Cache expensive queries
from functools import lru_cache

@lru_cache(maxsize=100)
def get_popular_universities():
    # Cached for repeated calls
    return session.query(University)\
        .order_by(University.applications_count.desc())\
        .limit(10)\
        .all()
```

---

### 2. Redis Caching

#### Setup Redis:
```bash
# Install Redis
# Railway: Add Redis service (free)
# Render: Add Redis (paid)

# Or use Upstash (free tier):
# https://upstash.com
```

#### Redis Configuration:
```python
# backend/app/core/redis_client.py - Already exists!
from redis import Redis
from typing import Optional
import json

class RedisCache:
    def __init__(self):
        self.redis = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
    
    def get(self, key: str) -> Optional[dict]:
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    def set(self, key: str, value: dict, ttl: int = 300):
        self.redis.setex(
            key,
            ttl,
            json.dumps(value)
        )
    
    def delete(self, key: str):
        self.redis.delete(key)

cache = RedisCache()
```

#### Use Caching:
```python
# backend/app/api/v1/routes/universities.py
@router.get("/universities")
async def list_universities(
    country: Optional[str] = None,
    cache: RedisCache = Depends(get_cache)
):
    # Check cache first
    cache_key = f"universities:{country}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # Fetch from database
    universities = get_universities_from_db(country)
    
    # Cache for 1 hour
    await cache.set(cache_key, universities, ttl=3600)
    
    return universities
```

---

### 3. API Response Optimization

#### Pagination:
```python
# backend/app/api/v1/routes/jobs.py
@router.get("/jobs")
async def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    skip = (page - 1) * per_page
    
    jobs = db.query(Job)\
        .offset(skip)\
        .limit(per_page)\
        .all()
    
    total = db.query(Job).count()
    
    return {
        "jobs": jobs,
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": (total + per_page - 1) // per_page
    }
```

#### Field Selection:
```python
# Allow clients to request only needed fields
@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    fields: Optional[str] = Query(None)  # ?fields=name,email
):
    user = get_user_by_id(user_id)
    
    if fields:
        requested_fields = fields.split(',')
        return {
            field: getattr(user, field)
            for field in requested_fields
            if hasattr(user, field)
        }
    
    return user
```

#### Response Compression:
```python
# backend/app/main.py
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

---

### 4. AI Performance

#### Batch Processing:
```python
# backend/app/services/gemini_service.py
async def generate_multiple_resumes(users: List[User]):
    # Process in batches of 5
    batch_size = 5
    results = []
    
    for i in range(0, len(users), batch_size):
        batch = users[i:i + batch_size]
        tasks = [generate_resume(user) for user in batch]
        batch_results = await asyncio.gather(*tasks)
        results.extend(batch_results)
    
    return results
```

#### Caching AI Responses:
```python
# Cache expensive AI calls
@router.post("/ai-search")
async def ai_search(
    query: str,
    cache: RedisCache = Depends(get_cache)
):
    # Check cache
    cache_key = f"ai_search:{hash(query)}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # Generate with AI
    result = await gemini_service.search(query)
    
    # Cache for 24 hours
    await cache.set(cache_key, result, ttl=86400)
    
    return result
```

#### Rate Limiting AI:
```python
# Prevent expensive AI abuse
from app.core.rate_limiter import RateLimiter

@router.post("/generate-resume")
@RateLimiter(max_calls=5, period=3600)  # 5 per hour
async def generate_resume(user: User):
    return await gemini_service.generate_resume(user)
```

---

### 5. Background Tasks

#### Use Celery:
```python
# backend/celery_app.py
from celery import Celery

celery = Celery(
    'ishtop',
    broker='redis://localhost:6379/1',
    backend='redis://localhost:6379/2'
)

@celery.task
def send_email_async(to_email: str, subject: str, body: str):
    # Send email in background
    email_service.send_email(to_email, subject, body)

@celery.task
def generate_resume_async(user_id: str):
    # Generate resume in background
    user = get_user(user_id)
    resume = gemini_service.generate_resume(user)
    save_resume(user_id, resume)
```

#### Or use FastAPI BackgroundTasks:
```python
from fastapi import BackgroundTasks

@router.post("/apply-job")
async def apply_job(
    job_id: str,
    background_tasks: BackgroundTasks
):
    # Create application immediately
    application = create_application(job_id)
    
    # Send email in background
    background_tasks.add_task(
        send_application_email,
        application.id
    )
    
    return application
```

---

## 🎨 FRONTEND OPTIMIZATIONS

### 1. Code Splitting

```typescript
// frontend/src/app/layout.tsx
import dynamic from 'next/dynamic';

// Load heavy components only when needed
const Dashboard = dynamic(() => import('./dashboard/page'), {
  loading: () => <LoadingSkeleton />,
  ssr: false  // Client-side only
});

const AIChat = dynamic(() => import('@/components/AIChat'), {
  loading: () => <p>Loading AI...</p>
});
```

### 2. Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="IshTop"
  width={200}
  height={50}
  priority  // For above-fold images
  loading="lazy"  // For below-fold images
  quality={85}  // Compress images
/>
```

### 3. API Call Optimization

#### Debouncing:
```typescript
// frontend/src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage:
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebounce(searchQuery, 500);

useEffect(() => {
  if (debouncedQuery) {
    api.search(debouncedQuery);
  }
}, [debouncedQuery]);
```

#### Request Caching:
```typescript
// frontend/src/lib/api.ts
import axios from 'axios';
import { setupCache } from 'axios-cache-interceptor';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

const cachedApi = setupCache(instance, {
  ttl: 5 * 60 * 1000,  // 5 minutes
  methods: ['get'],
});

export default cachedApi;
```

### 4. State Management

```typescript
// Use React Query for server state
import { useQuery } from '@tanstack/react-query';

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.jobs.list(),
    staleTime: 5 * 60 * 1000,  // 5 min
    cacheTime: 10 * 60 * 1000,  // 10 min
  });
}

// Usage:
const { data: jobs, isLoading } = useJobs();
```

---

## 📊 MONITORING PERFORMANCE

### 1. Backend Metrics

```python
# backend/app/main.py
import time
from fastapi import Request

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log slow requests
    if process_time > 1.0:
        logger.warning(
            f"Slow request: {request.url.path} took {process_time:.2f}s"
        )
    
    return response
```

### 2. Database Query Logging

```python
# Log slow queries
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Or use database-specific tools:
# PostgreSQL: pg_stat_statements
# MySQL: slow_query_log
```

### 3. Frontend Performance

```typescript
// Log Web Vitals
export function reportWebVitals(metric: any) {
  // Send to analytics
  if (metric.label === 'web-vital') {
    console.log(metric);
    // gtag('event', metric.name, { value: metric.value });
  }
}
```

---

## ⚡ PRODUCTION CONFIGURATION

### Gunicorn (Production Server):

```python
# Procfile
web: gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:$PORT \
  --timeout 120 \
  --keep-alive 5 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --access-logfile - \
  --error-logfile -
```

**Workers:** `(2 x CPU cores) + 1`  
For 2 CPUs: 4-5 workers

---

## 🎯 PERFORMANCE CHECKLIST

### Backend:
- [ ] Database connection pooling
- [ ] Database indexes on key fields
- [ ] Query optimization (no N+1)
- [ ] Redis caching for expensive queries
- [ ] API pagination
- [ ] Response compression (GZip)
- [ ] Background tasks for slow operations
- [ ] AI response caching
- [ ] Rate limiting

### Frontend:
- [ ] Code splitting
- [ ] Image optimization
- [ ] API request debouncing
- [ ] Request caching
- [ ] React Query for server state
- [ ] Lazy loading components
- [ ] Bundle size optimization
- [ ] CDN for static assets

### Monitoring:
- [ ] Response time logging
- [ ] Slow query logging
- [ ] Error rate monitoring
- [ ] Resource usage tracking
- [ ] Performance alerts

---

## 📈 EXPECTED RESULTS

**Before Optimization:**
- API response: 500ms-1s
- Page load: 5-10s
- Database queries: 200-500ms
- Concurrent users: 10-20

**After Optimization:**
- API response: 100-200ms ✅ (5x faster)
- Page load: 2-3s ✅ (3x faster)
- Database queries: 50-100ms ✅ (4x faster)
- Concurrent users: 100+ ✅ (5x more)

---

## 🚀 QUICK WINS (30 minutes):

1. Add database indexes (10 min)
2. Enable GZip compression (5 min)
3. Add API pagination (10 min)
4. Optimize Next.js images (5 min)

**Impact:** 2-3x performance improvement!

---

**Status:** ⚡ Performance Guide Ready  
**Time to Implement:** 3-4 hours  
**Priority:** 🟡 HIGH

**TAYYOR!** 🚀
