# 🚀 IshTop - Production Deployment Guide

Complete guide to deploy IshTop to production with Railway (Backend) and Vercel (Frontend).

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Phase 1: Preparation (15 min)](#phase-1-preparation)
- [Phase 2: Deploy Backend (Railway)](#phase-2-deploy-backend-railway)
- [Phase 3: Deploy Frontend (Vercel)](#phase-3-deploy-frontend-vercel)
- [Phase 4: Post-Deployment](#phase-4-post-deployment)
- [Troubleshooting](#troubleshooting)
- [Cost Breakdown](#cost-breakdown)

---

## Prerequisites

### Required Accounts
- ✅ GitHub account (to host your code)
- ✅ Railway account: https://railway.app (FREE tier available!)
- ✅ Vercel account: https://vercel.com (FREE tier available!)
- ✅ Gmail account (for SMTP email sending)
- ✅ Google AI Studio: https://ai.google.dev (FREE Gemini API)

### Optional but Recommended
- ✅ Sentry account: https://sentry.io (FREE tier for error monitoring)
- ✅ Custom domain (optional, ~$10-15/year)

---

## Phase 1: Preparation (15 min)

### Step 1: Generate Production Secrets

#### 1.1 Generate SECRET_KEY
```bash
# Run this command:
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Save the output - you'll need it!
# Example output: 6kZ3wRx7... (very long string)
```

#### 1.2 Get Gemini API Key (FREE!)
1. Go to https://ai.google.dev
2. Click "Get API key"
3. Create new API key
4. Copy the key (starts with `AIza...`)

#### 1.3 Get Gmail App Password
1. Go to Google Account: https://myaccount.google.com
2. Security > 2-Step Verification (turn on if not enabled)
3. App passwords (at bottom of page)
4. Select "Mail" and your device
5. Copy the 16-character password

#### 1.4 Get Sentry DSN (Optional but Recommended)
1. Go to https://sentry.io
2. Create new project
3. Select "FastAPI" as framework
4. Copy the DSN (looks like: `https://abc123@o456.ingest.sentry.io/789`)

### Step 2: Push Code to GitHub

```bash
# Make sure you're on the correct branch
git checkout main

# Or create a production branch
git checkout -b production

# Add all files
git add .

# Commit
git commit -m "Production deployment setup"

# Push to GitHub
git push origin main
# or: git push origin production
```

---

## Phase 2: Deploy Backend (Railway)

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize GitHub and select your repository
5. Railway will detect the project

### Step 2: Configure Root Directory

1. In Railway dashboard, click on your service
2. Go to **Settings**
3. Under **Build**, set:
   - **Root Directory**: `backend`
   - **Builder**: Nixpacks (auto-detected)

### Step 3: Add PostgreSQL Database

1. In Railway project dashboard, click **"New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway will auto-provision and link it
5. `DATABASE_URL` environment variable is automatically set!

### Step 4: Add Redis (Optional but Recommended)

1. Click **"New"** again
2. Select **"Database"**
3. Choose **"Redis"**
4. Railway will auto-provision and link it
5. `REDIS_URL` environment variable is automatically set!

### Step 5: Configure Environment Variables

1. In your service, go to **Variables** tab
2. Click **"Add Variable"** and add these:

```env
# Security (REQUIRED)
DEBUG=false
SECRET_KEY=<paste-your-generated-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI Service (REQUIRED)
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-1.5-flash
AI_PROVIDER=gemini

# Email (REQUIRED for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASSWORD=<your-gmail-app-password>
SMTP_FROM_EMAIL=noreply@ishtop.uz
SMTP_FROM_NAME=IshTop
SMTP_USE_TLS=true
FRONTEND_URL=<will-update-after-vercel-deploy>

# Error Monitoring (OPTIONAL)
SENTRY_DSN=<your-sentry-dsn>

# Redis (auto-set, but enable it)
REDIS_ENABLED=true

# CORS (will update after Vercel deploy)
CORS_ORIGINS=<will-update-after-vercel-deploy>

# Application
APP_NAME=IshTop
APP_VERSION=1.0.0
```

### Step 6: Deploy!

1. Click **"Deploy"** or it will auto-deploy
2. Wait for build (3-5 minutes)
3. Railway will show your URL: `https://your-app.up.railway.app`

### Step 7: Run Database Migrations

**Option A: Via Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run alembic upgrade head

# Seed universities data
railway run python seed_universities.py

# Seed test data (optional)
railway run python seed_data.py
```

**Option B: Via Railway Dashboard**
1. Go to your service
2. Click **"Deploy Logs"**
3. Check if migrations ran automatically (via `railway.json`)

### Step 8: Test Backend

1. Visit: `https://your-app.up.railway.app/health`
   - Should return: `{"status": "healthy", ...}`

2. Visit: `https://your-app.up.railway.app/docs`
   - Should show: "Not Found" (docs disabled in production - this is correct!)

3. Test API directly:
```bash
curl https://your-app.up.railway.app/api/v1/universities?limit=5
```

---

## Phase 3: Deploy Frontend (Vercel)

### Step 1: Create Vercel Project

1. Go to https://vercel.com
2. Click **"New Project"**
3. Import from GitHub
4. Select your repository

### Step 2: Configure Build Settings

1. **Root Directory**: `frontend`
2. **Framework Preset**: Next.js (auto-detected)
3. **Build Command**: `npm run build` (auto-set)
4. **Output Directory**: `.next` (auto-set)

### Step 3: Add Environment Variables

Add this SINGLE environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

**⚠️ IMPORTANT**: Use your ACTUAL Railway backend URL!

### Step 4: Deploy!

1. Click **"Deploy"**
2. Wait for build (2-3 minutes)
3. Vercel will show your URL: `https://your-app.vercel.app`

### Step 5: Update Backend CORS

1. Go back to Railway dashboard
2. Update these environment variables:

```env
CORS_ORIGINS=https://your-app.vercel.app,https://www.your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
```

3. Railway will auto-redeploy with new CORS settings

---

## Phase 4: Post-Deployment

### Step 1: Verify Everything Works

#### Test Backend:
```bash
# Health check
curl https://your-backend.railway.app/health

# Universities API
curl https://your-backend.railway.app/api/v1/universities?limit=3

# Should return JSON with universities
```

#### Test Frontend:
1. Open: `https://your-app.vercel.app`
2. Register new account
3. Login
4. Check universities page
5. Try AI search
6. Generate motivation letter

### Step 2: Create Admin User (Optional)

```bash
# Via Railway CLI
railway run python -c "
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
db = SessionLocal()
admin = User(
    email='admin@ishtop.uz',
    full_name='Admin User',
    hashed_password=get_password_hash('AdminPassword123!'),
    role=UserRole.ADMIN,
    is_active=True
)
db.add(admin)
db.commit()
print('Admin user created!')
"
```

### Step 3: Monitor Errors (Sentry)

1. Go to https://sentry.io
2. Open your project
3. Check for any errors from production
4. Setup alerts for critical errors

### Step 4: Setup Custom Domain (Optional)

#### For Backend (Railway):
1. Railway dashboard > Settings > Domains
2. Click "Add Domain"
3. Enter your domain: `api.yourdomain.com`
4. Add CNAME record in your DNS:
   ```
   Type: CNAME
   Name: api
   Value: <your-railway-url>
   ```

#### For Frontend (Vercel):
1. Vercel dashboard > Settings > Domains
2. Add domain: `yourdomain.com`
3. Add DNS records as shown by Vercel

### Step 5: Enable HTTPS (Free!)

Both Railway and Vercel provide FREE SSL certificates automatically! 🎉

---

## Troubleshooting

### Backend won't start

**Check Railway logs:**
1. Railway dashboard > Deployments > View Logs

**Common issues:**
- ❌ Missing environment variables
  - Solution: Double-check all required variables are set
- ❌ Database connection failed
  - Solution: Verify PostgreSQL is provisioned and linked
- ❌ Module not found errors
  - Solution: Check `requirements.txt` is complete

### Frontend can't connect to backend

**Check CORS settings:**
1. Verify `CORS_ORIGINS` in Railway includes your Vercel URL
2. Verify `NEXT_PUBLIC_API_URL` in Vercel is correct
3. Make sure both URLs use `https://` (not `http://`)

**Test API directly:**
```bash
curl https://your-backend.railway.app/api/v1/universities
```

### Database migration failed

**Run migrations manually:**
```bash
railway run alembic upgrade head
```

**If that fails:**
```bash
# Reset alembic version
railway run python -c "from app.database import SessionLocal; db = SessionLocal(); db.execute('DELETE FROM alembic_version'); db.commit()"

# Stamp current version
railway run alembic stamp head

# Try upgrade again
railway run alembic upgrade head
```

### Email sending fails

**Check Gmail settings:**
1. 2-Step Verification is enabled
2. App password is correct (no spaces!)
3. "Less secure app access" is NOT enabled (use app passwords instead)

**Test email:**
```python
railway run python -c "
from app.services.email_service import email_service
import asyncio
asyncio.run(email_service.send_test_email('test@example.com'))
"
```

### AI features not working

**Check API keys:**
1. Verify `GEMINI_API_KEY` is set correctly
2. Check Gemini API quotas: https://ai.google.dev
3. View Railway logs for AI errors

**Test Gemini API:**
```bash
railway run python -c "
from app.services.gemini_service import gemini_service
import asyncio
result = asyncio.run(gemini_service.generate_resume({}, 'Test job'))
print(result)
"
```

---

## Cost Breakdown

### FREE Tier (Recommended for MVP/Demo)

| Service | FREE Tier | Limits |
|---------|-----------|--------|
| **Railway** | $5 credit/month | ~500 hours, enough for 1 service |
| **Vercel** | Hobby Plan | Unlimited bandwidth, 100GB bandwidth |
| **PostgreSQL** | Included with Railway | 1GB storage |
| **Redis** | Included with Railway | 256MB storage |
| **Gemini API** | FREE | 60 requests/minute |
| **Sentry** | FREE | 5K errors/month, 10K transactions |
| **Gmail SMTP** | FREE | 500 emails/day |
| **SSL Certificate** | FREE | Auto-provided by Railway & Vercel |
| **TOTAL** | **$0/month** | Perfect for MVP! |

### Paid Plans (For Production with Users)

| Service | Cost | What You Get |
|---------|------|--------------|
| **Railway Pro** | $20/month | Increased limits, better performance |
| **Vercel Pro** | $20/month | Team features, analytics |
| **Custom Domain** | $10-15/year | Professional branding |
| **Sentry Team** | $26/month | More errors/transactions |
| **TOTAL** | **~$40-50/month** | Production-ready! |

---

## Success Checklist ✅

After deployment, verify:

### Backend:
- [ ] Health check returns 200: `/health`
- [ ] Universities API works: `/api/v1/universities`
- [ ] Can register new user
- [ ] Can login and get JWT token
- [ ] AI university search works
- [ ] Motivation letter generation works
- [ ] Email sending works (password reset)
- [ ] No errors in Railway logs
- [ ] No errors in Sentry (if configured)

### Frontend:
- [ ] Site loads: `https://your-app.vercel.app`
- [ ] Can register
- [ ] Can login
- [ ] Dashboard shows correctly
- [ ] Universities page loads
- [ ] AI search returns results
- [ ] Can generate motivation letter
- [ ] No console errors
- [ ] Mobile responsive

### Security:
- [ ] `DEBUG=false` in production
- [ ] Strong `SECRET_KEY` generated
- [ ] HTTPS enabled (auto by Railway/Vercel)
- [ ] CORS properly configured
- [ ] Security headers active (check with: https://securityheaders.com)
- [ ] Sentry error monitoring active

---

## 🎉 Congratulations!

Your IshTop platform is now LIVE in production!

**Your URLs:**
- 🌐 **Frontend**: `https://your-app.vercel.app`
- 🔧 **Backend**: `https://your-backend.railway.app`
- 🐛 **Monitoring**: `https://sentry.io/your-project`

**Next Steps:**
1. Share with users and get feedback
2. Monitor Sentry for errors
3. Track Railway/Vercel usage
4. Consider upgrading to paid plans when you get users
5. Add analytics (Google Analytics, Plausible)
6. Setup backups for database

---

## 📞 Support

**Documentation:**
- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- FastAPI: https://fastapi.tiangolo.com
- Next.js: https://nextjs.org/docs

**Issues:**
- Check Railway logs
- Check Vercel logs
- Check Sentry errors
- Review this guide

**Good luck!** 🚀


---

## 🚂 Railway Deploy Flow (CI/CD)

### Avtomatik deploy jarayoni

```
git push main
     │
     ▼
GitHub Actions: CI/CD Pipeline
     │
     ├─ backend-tests  (Python 3.10 + 3.11)
     ├─ backend-lint   (flake8, black, isort)
     ├─ frontend-tests (TypeScript, ESLint, build)
     ├─ e2e-tests      (Playwright)
     ├─ security-scan  (Trivy)
     └─ build-check    (Docker build)
          │
          ▼ (barcha testlar o'tsa)
     deploy job (environment: production)
          │
          ├─ Railway Backend → serviceInstanceRedeploy
          └─ Railway Frontend → serviceInstanceRedeploy
```

### Kerakli GitHub Secrets

| Secret nomi                    | Qayerdan olish                                      |
|-------------------------------|-----------------------------------------------------|
| `RAILWAY_TOKEN`               | railway.app → Account Settings → Tokens             |
| `RAILWAY_PROJECT_ID`          | Railway dashboard → Project → Settings → Project ID |
| `RAILWAY_BACKEND_SERVICE_ID`  | Railway → Project → Backend service → Settings      |
| `RAILWAY_FRONTEND_SERVICE_ID` | Railway → Project → Frontend service → Settings     |

### Secrets qo'shish qadamlari

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** tugmasini bosing
3. Yuqoridagi 4 ta secretni birma-bir qo'shing

### Rollback qadamlari

**Variant 1 — Railway dashboard orqali:**
1. [railway.app](https://railway.app) → Loyihangizga kiring
2. Tegishli service → **Deployments** tabiga o'ting
3. Oldingi muvaffaqiyatli deploy yonidagi **"Redeploy"** tugmasini bosing

**Variant 2 — Git revert orqali:**
```bash
# Oxirgi commitni revert qiling
git revert HEAD --no-edit
git push origin main
# Bu yangi CI/CD run ishga tushiradi va oldingi versiyani deploy qiladi
```

**Variant 3 — Railway CLI orqali:**
```bash
npm install -g @railway/cli
railway login
railway link <PROJECT_ID>
railway rollback  # Interaktiv tanlash
```

### Deploy monitoring

- **Railway dashboard**: https://railway.app/project/${RAILWAY_PROJECT_ID}
- **GitHub Actions logs**: https://github.com/Bilolceo/IshTop/actions
- **Job summary**: har bir deploy run'da `$GITHUB_STEP_SUMMARY` da link ko'rsatiladi
