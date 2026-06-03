# IshTop — Production Deployment Guide

Authoritative deployment runbook for Railway (primary) and Render (fallback).
Pair this document with [SECURITY.md](../SECURITY.md) and run
`bash scripts/check-env-safety.sh` before any push.

## Architecture at a glance

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  Next.js 14     │───▶│  FastAPI         │───▶│  PostgreSQL  │
│  standalone     │    │  + gunicorn      │    └──────────────┘
│  (frontend)     │    │  + cookie auth   │           │
└─────────────────┘    └─────────────────┘    ┌──────────────┐
        ▲                       │              │  Redis       │
        │                       └─────────────▶│  (blacklist  │
        │  https only           │              │   + rate)    │
        └───────────────────────┘              └──────────────┘
```

Required services in production:

| Service | Purpose | Required |
|---|---|---|
| Frontend (Next.js standalone) | UI | yes |
| Backend (FastAPI / gunicorn) | API + cookie auth | yes |
| PostgreSQL | Application DB | yes |
| Redis | JWT blacklist + rate limiter cross-instance state | yes |
| Object storage (optional) | Uploads beyond `/uploads` ephemeral | recommended |

## A. Railway deployment (primary)

### A.1 One-time setup

1. Create a new Railway project for IshTop.
2. Provision **PostgreSQL** plugin → copy `${{ Postgres.DATABASE_URL }}` reference.
3. Provision **Redis** plugin → copy `${{ Redis.REDIS_URL }}` reference.
4. Create two Railway services from this repo:
   - **backend** — root `backend/`, Dockerfile build, port `8000`.
     Already configured via [backend/railway.json](../backend/railway.json):
     - `startCommand`: runs `alembic upgrade head` then gunicorn
     - `healthcheckPath: /health` (timeout 30s)
   - **frontend** — root `frontend/`, Dockerfile build, port `3000`.
     Configured via [frontend/railway.json](../frontend/railway.json).
5. In each service → **Settings → Networking** → enable a public domain.

### A.2 Backend environment variables (Railway → Variables)

| Variable | Value | Notes |
|---|---|---|
| `DEBUG` | `false` | enforces production validator |
| `SECRET_KEY` | 32+ char random — generate with `python -c "import secrets; print(secrets.token_hex(32))"` | rotates JWTs |
| `AUTH_COOKIE_SECURE` | `true` | also auto-forced when DEBUG=false |
| `AUTH_COOKIE_HTTPONLY` | `true` | default |
| `AUTH_COOKIE_SAMESITE` | `lax` | works for OAuth redirects |
| `AUTH_COOKIE_PATH` | `/` | default |
| `AUTH_COOKIE_DOMAIN` | `.ishtop.uz` if FE & BE share root domain; else leave blank for host-only cookies on `up.railway.app` | see §C |
| `RATE_LIMIT_ENABLED` | `true` | required by validator |
| `RATE_LIMIT_USE_REDIS` | `true` | required for multi-replica |
| `REDIS_ENABLED` | `true` | required by validator |
| `REDIS_URL` | `${{ Redis.REDIS_URL }}` | Railway service reference |
| `TOKEN_BLACKLIST_USE_REDIS` | `true` | logout token revocation |
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` | Railway service reference |
| `CORS_ORIGINS` | exact comma-separated frontend URLs, e.g. `https://ishtop.uz,https://www.ishtop.uz` or `https://<frontend>.up.railway.app` | **no wildcards** |
| `FRONTEND_URL` | exact frontend URL (used in emails + OG) | |
| `AI_PROVIDER` | `gemini` | or `openai` |
| `GEMINI_API_KEY` | production key — rotate from any local `.env` value | |
| `GEMINI_MODEL` | `gemini-2.5-flash` | |
| `OAUTH_ENABLED` | `true` if Google login used | |
| `GOOGLE_CLIENT_ID` | from Google Cloud | |
| `GOOGLE_CLIENT_SECRET` | **rotated** production secret | |
| `GOOGLE_REDIRECT_URI` | `https://<backend>/api/v1/auth/callback/google` | |
| `SUPPORT_EMAIL` | `support@ishtop.uz` | |
| `EMAIL_TRANSPORT` | `sendgrid` or `smtp` (default `disabled`) | |
| `SENDGRID_API_KEY` | provider key | optional |

### A.3 Frontend environment variables (Railway → Variables)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<backend>.up.railway.app/api/v1` |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://<frontend>.up.railway.app` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | optional, leave blank to disable push |

> Note — `NEXT_PUBLIC_*` are baked into the JS bundle at `next build`. Changing
> them later requires a redeploy. The frontend Dockerfile accepts these via
> `ARG` so Railway passes them as build args automatically.

### A.4 Deploy order

1. **Provision DB + Redis** first.
2. Set **backend env vars** (incl. DB + Redis references).
3. Deploy backend → wait for `/health` to return 200.
   Migrations run automatically as part of `startCommand`.
4. Note the backend public URL → set `NEXT_PUBLIC_API_URL` on frontend.
5. Set backend `CORS_ORIGINS` to the frontend URL.
6. Deploy frontend.

## B. Render deployment (fallback)

The repo ships [render.yaml](../render.yaml) — a single-file blueprint that
provisions backend, frontend, and PostgreSQL. Redis must be added manually:

1. Create a **Render Redis** instance, copy `REDIS_URL`.
2. From dashboard, paste it into `ishtop-backend` env vars + set
   `REDIS_ENABLED=true`.
3. Click **New → Blueprint** → connect repo → Render reads `render.yaml` and
   creates the services. `SECRET_KEY` is auto-generated by Render.
4. Fill any `sync: false` vars in the dashboard (Gemini key, Google OAuth,
   `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_FRONTEND_URL`, Stripe, SMTP).
5. Set backend env `DEBUG=false` (default), `RATE_LIMIT_ENABLED=true` (default
   in render.yaml), `AUTH_COOKIE_SECURE` will be auto-forced.

## C. Cookie domain & CORS — pick the right combo

The auth flow uses httpOnly cookies, so frontend and backend must share a
cookie scope or use the same browsing context.

### Option 1 — Same root domain (recommended for production)

```
frontend: https://ishtop.uz
backend:  https://api.ishtop.uz
```

- `AUTH_COOKIE_DOMAIN=.ishtop.uz`
- `CORS_ORIGINS=https://ishtop.uz,https://www.ishtop.uz`
- Browser sends cookie on cross-origin XHR because cookie domain matches.
- Best UX, no SameSite=None needed.

### Option 2 — Different Railway/Render subdomains (cross-site)

```
frontend: https://ishtop-frontend.up.railway.app
backend:  https://ishtop-backend.up.railway.app
```

`up.railway.app` and `onrender.com` are on the [Public Suffix List](https://publicsuffix.org/),
so each subdomain is a separate **site**. A browser XHR from
`ishtop-frontend.up.railway.app` to `ishtop-backend.up.railway.app` is a
cross-site request — the backend's auth cookie will only be attached if it is
issued with `SameSite=None; Secure`.

Required env (backend):

- `AUTH_COOKIE_DOMAIN=` (leave blank — host-only cookies on the backend host)
- `AUTH_COOKIE_SAMESITE=none`
- `AUTH_COOKIE_SECURE=true` (already auto-forced when `DEBUG=false`)
- `CORS_ORIGINS=https://ishtop-frontend.up.railway.app`

Frontend axios already uses `withCredentials: true`, and the backend CORS
middleware sets `allow_credentials=True`. The combination is what makes the
cookie flow on cross-site fetches.

**Why not SameSite=Lax here?** Lax cookies are only sent on same-site requests
and top-level navigations. A cross-site `fetch`/`XMLHttpRequest` from the
frontend won't carry a Lax cookie — login will appear to succeed (Set-Cookie
returns) but every follow-up request will be unauthenticated.

For a long-running product, prefer Option 1 (same root domain) to avoid the
SameSite=None tax (third-party cookie restrictions, future browser changes).

## D. Google OAuth — production checklist

1. Google Cloud Console → **APIs & Services → Credentials**.
2. Create or open the production OAuth 2.0 Client.
3. **Authorized JavaScript origins** — add the exact frontend URL(s):
   - `https://ishtop.uz`
   - `https://www.ishtop.uz`
   - or `https://<frontend>.up.railway.app`
4. **Authorized redirect URIs** — add the backend callback exactly:
   - `https://api.ishtop.uz/api/v1/auth/callback/google`
   - or `https://<backend>.up.railway.app/api/v1/auth/callback/google`
5. **Reset secret** — if the secret ever lived in a local `.env`, click
   *Reset client secret* and update `GOOGLE_CLIENT_SECRET` in Railway/Render.

## E. Database & migrations

Alembic is wired. Backend `startCommand` runs `alembic upgrade head` before
gunicorn boots, so each deploy is automatically migrated.

Manual operations:

```bash
# View current revision
railway run --service backend alembic current

# Generate a new migration after editing models
cd backend && alembic revision --autogenerate -m "describe change"

# Rollback last migration
railway run --service backend alembic downgrade -1

# Backup before risky migrations
railway run --service postgres pg_dump > backup-$(date +%F).sql
```

Seed / demo data:

- No standalone seed script exists. To create a first admin in production,
  set `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` env vars
  temporarily; the backend creates/promotes that user on next start.
- **Remove these env vars from the dashboard immediately after the admin is
  created** — otherwise every restart re-applies them.

## F. Health checks

| Service | Path | Expected |
|---|---|---|
| Backend | `GET /health` | `200 { "status": "healthy", "database": "connected", ... }` |
| Frontend | `GET /` | `200` HTML |
| Backend (deep) | `GET /api/v1/auth/me` | `401` unauthenticated, `200` after cookie login |

Railway uses backend `healthcheckPath: /health` (configured in
[backend/railway.json](../backend/railway.json)). Render uses the same path
via `healthCheckPath` in [render.yaml](../render.yaml).

## G. Post-deploy QA checklist

Run this against the production URLs immediately after deploy:

1. `curl https://<backend>/health` → 200, `database: connected`.
2. `curl -I https://<frontend>` → 200, `Content-Security-Policy` header present.
3. Register a throwaway account → backend sets `access_token` + `refresh_token`
   cookies with `HttpOnly`, `Secure`, `SameSite=Lax`.
4. Refresh the dashboard page → session persists.
5. Open DevTools → Application → Local Storage. Confirm `auth-storage` value
   has `user` + `isAuthenticated` only, **no access_token field**.
6. Open DevTools → Network → any API call → confirm `Cookie` header present,
   no `Authorization: Bearer`.
7. Logout → cookies cleared, `/student` redirects to `/login`.
8. Try `/admin` as student → blocked.
9. Mobile (375 wide) → bottom nav present on `/student`, `/company`, `/admin`.
10. Hard-refresh `/student/jobs` → 1 `<h1>`, no horizontal overflow.

## H. Rollback plan

Railway and Render both retain prior deployments:

1. Railway → service → **Deployments** tab → **Rollback** on the last
   known-good build.
2. Render → service → **Manual Deploy → Deploy from previous commit**.
3. If a migration introduced the regression, also `alembic downgrade -1`.
4. Notify users via banner if downtime exceeded 5 minutes.

## I. Manual operations still required before first prod deploy

Run these **before** flipping DNS:

- [ ] Rotate `GOOGLE_CLIENT_SECRET` (Cloud Console)
- [ ] Generate new `SECRET_KEY` and set in Railway/Render dashboard
- [ ] Rotate `GEMINI_API_KEY` if any local `.env` value was ever shared
- [ ] Set all backend env vars listed in §A.2
- [ ] Set all frontend env vars listed in §A.3
- [ ] Provision Redis, set `REDIS_URL`, flip `REDIS_ENABLED=true`
- [ ] Provision Postgres, set `DATABASE_URL`
- [ ] Configure Google OAuth authorized origins + redirect URI
- [ ] `bash scripts/check-env-safety.sh` → all green
- [ ] First deploy with `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD`,
      then immediately remove those env vars
- [ ] Walk through Post-deploy QA checklist (§G)

## H. Redis failure semantics (R3)

When `REDIS_ENABLED=true` and Redis becomes unreachable at runtime:

- **`/health`** returns **HTTP 503** with `{"status": "degraded", "redis":
  "unavailable", "degraded_features": [...]}`. Wire alerting to any non-200
  on `/health`.
- **`/readyz`** returns **HTTP 503** so the orchestrator stops sending traffic
  until Redis recovers.
- **Token blacklist** (logout): silently falls back to per-worker in-memory
  state to keep logout UX working. This is fail-open by design — a stable
  log line `BLACKLIST_REDIS_UNAVAILABLE: ...` is emitted on every fallback.
  **Wire an SRE alarm on that string.** Mitigation: short access-token TTL
  (`ACCESS_TOKEN_EXPIRE_MINUTES` ≤ 10) so the unrevoked window is small.
- **Rate limiter**: silently falls back to per-worker in-memory limiter.
  Stable log line `RATE_LIMIT_REDIS_UNAVAILABLE: scope=...` is emitted at
  most once per minute per scope. Effective budget is multiplied by gunicorn
  worker count during the outage.
- **OAuth state** (Google sign-in): fails **closed** with HTTP 503. New OAuth
  sign-ins are blocked during an outage; existing sessions continue.

The startup validator (`backend/app/config.py`) already refuses to boot in
production if `REDIS_ENABLED=false` but any consumer expects Redis, so the
only way to hit these runtime degradations is an actual Redis outage —
treat any `*_REDIS_UNAVAILABLE` log line as a real incident.

### Access-token TTL (production hard cap)

`ACCESS_TOKEN_EXPIRE_MINUTES` is **enforced ≤ 10 in production** by the
startup validator. The local dev default of 30 is fine; deployments with
`DEBUG=false` and a longer value refuse to boot.

Why: token blacklist falls back to per-worker memory during a Redis outage
(see fail-open trade-off above). A 10-minute access-token TTL bounds the
window where a token revoked on one worker is still accepted on another to
at most 10 minutes — instead of the previous 30. Refresh tokens
(7 days) are unchanged: refresh exchange goes through the same blacklist
check, so a stolen refresh token has the same outage-window exposure as
an access token plus its own normal TTL.
