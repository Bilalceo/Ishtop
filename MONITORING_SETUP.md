# 📊 MONITORING & LOGGING SETUP

**Know What's Happening in Production**  
**Generated:** 2026-01-19

---

## 🎯 WHY MONITORING?

**Without monitoring:**
- ❌ Don't know when errors happen
- ❌ Don't know when site is down
- ❌ Don't know performance issues
- ❌ Can't debug production problems

**With monitoring:**
- ✅ Get alerts immediately
- ✅ See all errors in one place
- ✅ Track performance metrics
- ✅ Debug production easily
- ✅ Sleep better at night 😴

---

## 🚨 ERROR TRACKING: SENTRY (REQUIRED!)

### Why Sentry?
- Free tier: 5,000 errors/month
- Real-time error alerts
- Stack traces with context
- User session replay
- Performance monitoring
- Easy setup: 10 minutes

### Step 1: Create Sentry Account

```bash
# 1. Go to: https://sentry.io
# 2. Sign up (Free plan)
# 3. Create new project
#    - Platform: Python (FastAPI)
#    - Name: IshTop Backend
# 4. Create project
```

### Step 2: Get DSN

```bash
# Sentry Dashboard → Settings → Client Keys (DSN)

# Copy DSN:
https://xxxxxxxxxxxxx@sentry.io/123456

# Add to backend/.env:
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/123456
SENTRY_ENVIRONMENT=production
```

### Step 3: Backend Integration (Already Done!)

```python
# backend/app/main.py - Already implemented!
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=0.1,  # 10% performance monitoring
        profiles_sample_rate=0.1,  # 10% profiling
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        # Send user context
        send_default_pii=False,  # Don't send passwords!
    )
```

### Step 4: Test Sentry

```python
# backend/test_sentry.py
import sentry_sdk

# Test error
try:
    1 / 0
except Exception as e:
    sentry_sdk.capture_exception(e)
    print("Error sent to Sentry! Check dashboard.")
```

```bash
cd backend
python test_sentry.py
# Check Sentry dashboard for error
```

### Step 5: Custom Error Context

```python
# Add context to errors
from sentry_sdk import set_context, set_user

# Add user info
set_user({
    "id": user.id,
    "email": user.email,
    "subscription": user.subscription_tier
})

# Add custom context
set_context("job_application", {
    "job_id": job.id,
    "company": job.company_name,
    "status": application.status
})

# Now errors will have this context!
```

### Step 6: Configure Alerts

```bash
# Sentry Dashboard → Alerts → New Alert Rule

# Alert on:
- Error frequency > 10 errors/hour
- New error types
- Critical errors (500 status)
- Performance degradation

# Notify via:
- Email ✅
- Slack (optional)
- Discord (optional)
```

---

## ⏱️ UPTIME MONITORING

### Option 1: UptimeRobot (Free & Easy)

```bash
# 1. Go to: https://uptimerobot.com
# 2. Sign up (Free: 50 monitors)
# 3. Add New Monitor:
#    - Type: HTTP(S)
#    - URL: https://yourdomain.com/health
#    - Interval: 5 minutes
#    - Alert: Email
# 4. Done!
```

**Features:**
- ✅ Free tier: 50 monitors
- ✅ Email alerts
- ✅ Public status page
- ✅ SSL expiration alerts

### Option 2: Better Uptime (Advanced)

```bash
# 1. Go to: https://betterstack.com/uptime
# 2. Free tier: 10 monitors
# 3. More features than UptimeRobot
```

**Features:**
- ✅ Response time tracking
- ✅ Multiple locations
- ✅ Incident management
- ✅ Beautiful status pages

### Health Check Endpoint (Already Done!)

```python
# backend/app/main.py - Enhanced health check
@app.get("/health")
async def health_check():
    try:
        # Check database
        db.execute("SELECT 1")
        db_status = "healthy"
    except:
        db_status = "unhealthy"
    
    # Check Redis (if using)
    try:
        redis_client.ping()
        redis_status = "healthy"
    except:
        redis_status = "unhealthy"
    
    return {
        "status": "healthy",
        "database": db_status,
        "redis": redis_status,
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }
```

---

## 📈 ANALYTICS: GOOGLE ANALYTICS 4

### Setup (Frontend):

```typescript
// frontend/src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Track Events:

```typescript
// frontend/src/lib/analytics.ts
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Usage:
trackEvent('apply_job', 'Jobs', job.title);
trackEvent('generate_resume', 'AI', 'success');
trackEvent('subscription', 'Payments', 'premium', 4);
```

---

## 📊 APPLICATION PERFORMANCE: RAILWAY METRICS

### Railway (Built-in):

```bash
# Railway automatically provides:
- CPU usage
- Memory usage
- Network traffic
- Response times
- Error rates

# Dashboard → Service → Metrics
```

**Alerts:**
- Set alerts for high CPU/memory
- Get notified via email/Slack

---

## 🔍 LOGGING BEST PRACTICES

### Structured Logging:

```python
# backend/app/core/logger.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add extra fields
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        
        return json.dumps(log_data)

# Use JSON logging
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger("ishtop")
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

### Good Logging:

```python
# GOOD - Useful logs
logger.info("User registered", extra={"user_id": user.id, "email": user.email})
logger.warning("Rate limit exceeded", extra={"user_id": user.id, "endpoint": "/api/ai"})
logger.error("Payment failed", extra={"payment_id": payment.id, "error": str(e)})

# BAD - Useless logs
logger.info("Function called")  # Too vague
logger.debug(f"Password: {password}")  # NEVER log passwords!
logger.info("Test")  # Meaningless
```

### Log Levels:

```python
# Production log levels:
DEBUG: False  # Disable in production
INFO: Important events (user login, job created)
WARNING: Unexpected but handled (rate limit, validation error)
ERROR: Actual errors (payment failed, API error)
CRITICAL: System-level failures (database down, out of memory)
```

---

## 📧 EMAIL ALERTS

### Critical Alerts:

```python
# backend/app/core/alerts.py
import asyncio
from app.services.email_service import email_service

async def send_critical_alert(
    subject: str,
    message: str,
    error: Exception = None
):
    """Send email for critical issues"""
    admin_email = settings.ADMIN_EMAIL
    
    body = f"""
    <h2>CRITICAL ALERT</h2>
    <p><strong>{subject}</strong></p>
    <p>{message}</p>
    """
    
    if error:
        body += f"""
        <h3>Error Details:</h3>
        <pre>{str(error)}</pre>
        """
    
    await email_service.send_email(
        to_email=admin_email,
        subject=f"🚨 CRITICAL: {subject}",
        html_content=body
    )
    
    # Also send to Sentry
    if error:
        sentry_sdk.capture_exception(error)
```

### Usage:

```python
# Alert on critical errors
try:
    process_payment(payment_id)
except Exception as e:
    await send_critical_alert(
        "Payment Processing Failed",
        f"Payment {payment_id} failed",
        error=e
    )
```

---

## 🎯 MONITORING CHECKLIST

### Must Have:
- [ ] Sentry error tracking configured
- [ ] Sentry DSN in production .env
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Health check endpoint (/health)
- [ ] Email alerts for critical errors
- [ ] Log level set to WARNING/ERROR
- [ ] No sensitive data in logs

### Nice to Have:
- [ ] Google Analytics tracking
- [ ] Custom event tracking
- [ ] Performance monitoring
- [ ] User session replay (Sentry)
- [ ] Database query monitoring
- [ ] API response time tracking
- [ ] Resource usage alerts

### For Growth:
- [ ] Advanced APM (New Relic/Datadog)
- [ ] Custom dashboards
- [ ] Business metrics
- [ ] A/B testing
- [ ] Funnel tracking

---

## 📊 MONITORING DASHBOARD

### What to Monitor:

**Health:**
- ✅ Uptime (target: 99.9%)
- ✅ Response time (<200ms)
- ✅ Error rate (<1%)
- ✅ Database connections

**Usage:**
- ✅ Active users
- ✅ API requests/minute
- ✅ AI generations/day
- ✅ Storage usage

**Business:**
- ✅ New registrations
- ✅ Job applications
- ✅ Subscriptions
- ✅ Revenue

**Costs:**
- ✅ Gemini API usage ($)
- ✅ Database size (MB)
- ✅ Bandwidth (GB)
- ✅ Total monthly cost

---

## 🚨 ALERT RULES

### Critical (Immediate):
- ❌ Site down (>1 min)
- ❌ Error rate >5%
- ❌ Database down
- ❌ Payment processing failed

### High (15 min delay):
- ⚠️ Error rate >2%
- ⚠️ Response time >1s
- ⚠️ Memory usage >80%
- ⚠️ CPU usage >90%

### Medium (1 hour delay):
- ⚠️ Slow queries (>1s)
- ⚠️ High disk usage (>80%)
- ⚠️ Rate limit hits

### Low (Daily summary):
- ℹ️ New users
- ℹ️ API usage
- ℹ️ Cost summary

---

## 🎯 QUICK START (30 MIN)

### Minimum Viable Monitoring:

```bash
# 1. Setup Sentry (10 min)
- Create account
- Add DSN to .env
- Test error tracking

# 2. Setup UptimeRobot (5 min)
- Create account
- Add health check monitor
- Enable email alerts

# 3. Test (5 min)
- Trigger test error (Sentry)
- Check uptime monitoring
- Verify email alerts

# 4. Document (10 min)
- Save Sentry login
- Document alert emails
- Add to DEPLOYMENT_CHECKLIST.md
```

**Done!** You now have production monitoring. 🎉

---

## 💰 COSTS

### Free Tier (Sufficient for launch):

| Service | Free Tier | Cost After |
|---------|-----------|------------|
| Sentry | 5,000 errors/mo | $26/mo |
| UptimeRobot | 50 monitors | $7/mo |
| Google Analytics | Unlimited | Free |
| Railway Metrics | Included | Included |

**Total for launch:** $0/month ✅

**Scale pricing:**
- Small (1K users): $0-10/month
- Medium (10K users): $50-100/month
- Large (100K users): $200-500/month

---

## ✅ COMPLETION CHECKLIST

### Day 2 Monitoring:
- [ ] Sentry account created
- [ ] SENTRY_DSN added to .env
- [ ] Error tracking tested
- [ ] UptimeRobot configured
- [ ] Health check endpoint verified
- [ ] Alert rules configured
- [ ] Email alerts tested
- [ ] Logging configured
- [ ] Documentation updated

---

**Status:** 📊 Monitoring Guide Ready  
**Time:** 30-45 minutes  
**Priority:** 🔴 CRITICAL

**BU JUDA MUHIM!** Don't skip! 🚨

**TAYYOR!** 🚀
