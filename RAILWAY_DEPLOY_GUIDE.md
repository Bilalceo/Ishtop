# 🚂 RAILWAY DEPLOYMENT GUIDE

**IshTop - Step-by-Step Railway Deployment**

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before deploying, ensure:
- ✅ Database migrations are current (005_performance_indexes)
- ✅ All dependencies are in `requirements.txt`
- ✅ `Procfile` and `railway.json` are configured
- ✅ You have your API keys ready (Gemini, Stripe, etc.)

---

## 1️⃣ RAILWAY ACCOUNT SETUP

### Option A: Using CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# This will open browser - sign in with GitHub
```

### Option B: Using Web Dashboard

Go to: **https://railway.app**
- Sign up with GitHub
- Verify email

---

## 2️⃣ CREATE NEW PROJECT

### Via CLI:
```bash
cd C:\Users\user\Desktop\stratUP

# Initialize Railway project
railway init

# Link to a new project
railway link
```

### Via Web Dashboard:
1. Click **"New Project"**
2. Choose **"Deploy from GitHub repo"**
3. Select your `stratUP` repository
4. Railway will detect monorepo

---

## 3️⃣ DEPLOY BACKEND

### Setup Backend Service:

1. **In Railway Dashboard:**
   - Click **"New Service"**
   - Choose **"GitHub Repo"**
   - Select your repo
   - Railway will create a service

2. **Configure Service Settings:**
   - Go to **Settings** tab
   - Set **Root Directory:** `backend`
   - Set **Build Command:** Leave empty (Nixpacks auto-detects)
   - Set **Start Command:** 
     ```
     alembic upgrade head && gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
     ```

3. **Add Environment Variables:**

Go to **Variables** tab and add:

```bash
# Core Settings
DEBUG=False
SECRET_KEY=<generate-with-command-below>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database (Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# AI Services
GEMINI_API_KEY=<your-gemini-api-key>
OPENAI_API_KEY=<your-openai-key-if-you-have>
OPENAI_MODEL=gpt-4-turbo-preview

# Frontend URL (will add after frontend deploy)
FRONTEND_URL=<your-frontend-url-from-vercel>
CORS_ORIGINS=<your-frontend-url-from-vercel>

# Email Service (Choose one)
SENDGRID_API_KEY=<your-sendgrid-key>
EMAIL_FROM=noreply@ishtop.uz
EMAIL_FROM_NAME=IshTop

# Payment Gateways
STRIPE_SECRET_KEY=<your-stripe-key>
STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
PAYME_MERCHANT_ID=<your-payme-merchant-id>
PAYME_SECRET_KEY=<your-payme-secret-key>

# Error Tracking
SENTRY_DSN=<your-sentry-dsn>
SENTRY_ENVIRONMENT=production

# Optional: Redis (for caching)
REDIS_URL=${{Redis.REDIS_URL}}

# File Upload
MAX_FILE_SIZE=10485760
```

**Generate SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

4. **Add PostgreSQL Database:**
   - In your project, click **"New Service"**
   - Choose **"Database"**
   - Select **"PostgreSQL"**
   - Railway will auto-provision and link it
   - `DATABASE_URL` will be auto-available as `${{Postgres.DATABASE_URL}}`

5. **Add Redis (Optional but Recommended):**
   - Click **"New Service"**
   - Choose **"Database"**
   - Select **"Redis"**
   - Use `${{Redis.REDIS_URL}}` in variables

---

## 4️⃣ DEPLOY FRONTEND (VERCEL)

Backend Railway'da, Frontend Vercel'da:

### Vercel Deployment:

1. **Go to:** https://vercel.com
2. **Import Git Repository**
3. **Configure Project:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

4. **Environment Variables (Vercel):**

```bash
NEXT_PUBLIC_API_URL=<your-railway-backend-url>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
```

5. **Deploy!**

---

## 5️⃣ LINK FRONTEND & BACKEND

After both are deployed:

1. **Get your Vercel URL:** `https://your-app.vercel.app`
2. **Get your Railway URL:** `https://your-app.railway.app`

3. **Update Railway Backend Variables:**
   ```bash
   FRONTEND_URL=https://your-app.vercel.app
   CORS_ORIGINS=https://your-app.vercel.app,https://www.your-app.vercel.app
   ```

4. **Update Vercel Frontend Variables:**
   ```bash
   NEXT_PUBLIC_API_URL=https://your-app.railway.app
   ```

5. **Redeploy both** (Railway and Vercel auto-redeploy on changes)

---

## 6️⃣ POST-DEPLOYMENT CHECKS

### Test Backend:
```bash
curl https://your-app.railway.app/health
# Should return: {"status":"healthy","timestamp":"..."}

curl https://your-app.railway.app/api/v1/health
# Should return health check data
```

### Test Frontend:
- Open: `https://your-app.vercel.app`
- Test login/signup
- Test AI resume generation
- Test university search

### Check Database:
```bash
# Railway CLI
railway run python -c "from app.database import engine; print(engine.url)"

# Should show PostgreSQL URL
```

### Check Logs:
```bash
# Backend logs (Railway)
railway logs

# Or in Railway Dashboard → Deployments → View Logs
```

---

## 7️⃣ MONITORING & MAINTENANCE

### Railway Dashboard:
- **Metrics:** CPU, Memory, Network usage
- **Logs:** Real-time application logs
- **Deployments:** History and rollback

### Sentry (Error Tracking):
- View errors: https://sentry.io
- Set up alerts for critical errors

### Database Backups:
Railway PostgreSQL has automatic daily backups.

**Manual backup:**
```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

---

## 8️⃣ CUSTOM DOMAIN (OPTIONAL)

### Add Custom Domain:

1. **Railway:**
   - Settings → Domains
   - Click **"Generate Domain"** or **"Custom Domain"**
   - Add your domain: `api.yourdomain.com`
   - Add DNS records (Railway will show you)

2. **Vercel:**
   - Settings → Domains
   - Add: `yourdomain.com` and `www.yourdomain.com`
   - Configure DNS

3. **Update Environment Variables** with new domains

---

## 9️⃣ COST ESTIMATION

### Railway:
- **Free Tier:** $5/month credit
- **Hobby Plan:** $5/month (includes PostgreSQL + Redis)
- **Pro Plan:** $20/month (better resources)

### Vercel:
- **Free Tier:** Perfect for starting
- **Pro Plan:** $20/month (if needed)

### Total Monthly Cost:
- **Free Start:** $0 (using free tiers)
- **Recommended:** ~$5-10/month (Railway Hobby + Vercel Free)

---

## 🚨 TROUBLESHOOTING

### Build Fails:
```bash
# Check Railway logs
railway logs

# Common issues:
# - Missing dependencies in requirements.txt
# - Python version mismatch
# - Environment variables not set
```

### Database Connection Error:
```bash
# Verify DATABASE_URL is set
railway variables

# Check if PostgreSQL service is running
railway status
```

### Frontend Can't Connect to Backend:
```bash
# Check CORS settings in backend
# Verify NEXT_PUBLIC_API_URL in Vercel
# Ensure CORS_ORIGINS includes your Vercel domain
```

### Migrations Not Running:
```bash
# Manual migration (if needed)
railway run alembic upgrade head

# Check migration status
railway run alembic current
```

---

## ✅ DEPLOYMENT CHECKLIST

Backend (Railway):
- [ ] Project created on Railway
- [ ] GitHub repo connected
- [ ] Root directory set to `backend`
- [ ] PostgreSQL database added
- [ ] Redis added (optional)
- [ ] All environment variables set
- [ ] SECRET_KEY generated and set
- [ ] Start command configured
- [ ] First deployment successful
- [ ] Health check endpoint working
- [ ] Database migrations applied

Frontend (Vercel):
- [ ] Project created on Vercel
- [ ] GitHub repo connected
- [ ] Root directory set to `frontend`
- [ ] Environment variables set
- [ ] NEXT_PUBLIC_API_URL pointing to Railway
- [ ] First deployment successful
- [ ] Can access landing page
- [ ] Can login/signup

Integration:
- [ ] Backend CORS includes frontend URL
- [ ] Frontend can make API calls
- [ ] Authentication working
- [ ] AI features working (resume, jobs, universities)
- [ ] File uploads working
- [ ] Payments working (if configured)

Monitoring:
- [ ] Sentry configured
- [ ] Logs accessible
- [ ] Metrics visible
- [ ] Alerts set up

---

## 🎯 QUICK COMMANDS REFERENCE

```bash
# Railway CLI
railway login                    # Login
railway init                     # Initialize project
railway link                     # Link to existing project
railway up                       # Deploy
railway logs                     # View logs
railway run <command>            # Run command in Railway env
railway variables                # List environment variables
railway variables set KEY=value  # Set variable
railway open                     # Open dashboard
railway status                   # Check service status

# Testing
curl https://your-app.railway.app/health
curl https://your-app.railway.app/api/v1/health

# Database
railway run alembic upgrade head
railway run alembic current
railway run python check_data.py
```

---

## 📞 SUPPORT

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Vercel Docs:** https://vercel.com/docs

---

**Status:** 🚀 Ready to Deploy!  
**Estimated Time:** 30-45 minutes  
**Difficulty:** Intermediate

**TAYYOR! Let's deploy!** 🎉

   
