# IshTop — Security & Production Environment Guide

This document is the operational handbook for shipping IshTop to production
safely. It is intentionally short: the boring rules below are what stop
incidents.

## Required production environment variables

| Variable | Required | Production value |
|---|---|---|
| `DEBUG` (or `SMARTCAREER_DEBUG`) | yes | `false` / `production` |
| `SECRET_KEY` | yes | 32+ chars random — `python -c "import secrets; print(secrets.token_hex(32))"` |
| `AUTH_COOKIE_SECURE` | yes | `true` (auto-forced when `DEBUG=false`, set explicitly anyway) |
| `AUTH_COOKIE_HTTPONLY` | yes | `true` |
| `AUTH_COOKIE_SAMESITE` | yes | `lax` (or `strict` once we verify cross-tab OAuth) |
| `RATE_LIMIT_ENABLED` | yes | `true` |
| `REDIS_ENABLED` | yes | `true` |
| `REDIS_URL` | yes | `redis://...` reachable from the API container |
| `DATABASE_URL` | yes | `postgresql://...` — **not** SQLite |
| `CORS_ORIGINS` | yes | exact origins, comma-separated. No `*`. |
| `GOOGLE_CLIENT_SECRET` | if OAuth used | freshly rotated value |
| `GEMINI_API_KEY` | if AI used | provisioned via secret manager |

The backend `Settings` validator (`backend/app/config.py`) refuses to boot
if any of the above are misconfigured in production. Do not catch and ignore
that error; fix the env.

## Cookie security rules

Browser auth is **cookie-only**. Browser code never reads or writes tokens.

- `access_token` and `refresh_token` are `HttpOnly`, `SameSite=Lax`, `Secure`
  in production, `Path=/`.
- `document.cookie` must be empty for auth purposes (verified by E2E test).
- `localStorage["auth-storage"]` stores only `{user, isAuthenticated}` —
  never tokens. A `migrate()` in `frontend/src/store/authStore.ts` strips
  legacy fields from any pre-v3 payload returning visitors might have.
- No `Authorization: Bearer` header is sent from the browser by default.
  Mobile / API clients can still use Bearer; backend `get_current_user`
  accepts both, cookie first.

## Rate limiting

- Required `true` in production. Backend enforces this at startup.
- Backed by Redis when `RATE_LIMIT_USE_REDIS=true` (default). Without Redis
  the per-process token bucket is meaningless across replicas.

## Redis

- JWT blacklist (`/auth/logout` token revocation) and rate limiter both
  depend on Redis when running >1 instance. Multi-instance deploys without
  Redis silently lose revocation guarantees.
- Set `REDIS_ENABLED=true`, `REDIS_URL=redis://...`. Confirm reachability
  from API container with `redis-cli ping` during deploy.

## Secret rotation checklist

Run this list any time the laptop holding `.env` is shared, lost, or this
repo is cloned by a new contributor.

1. `SECRET_KEY` → generate a new value, deploy, invalidates all sessions.
2. `GOOGLE_CLIENT_SECRET` → Google Cloud Console → APIs & Services →
   Credentials → OAuth 2.0 Client → **Reset Secret**.
3. `GEMINI_API_KEY` → console.cloud.google.com → APIs & Services →
   Credentials → revoke + reissue.
4. `SENDGRID_API_KEY` / SMTP password → provider dashboard rotate.
5. `TELEGRAM_BOT_TOKEN` → BotFather `/revoke` then `/token`.
6. Database password → run `ALTER USER ... PASSWORD` + update env.

## Railway / Render deployment env checklist

Before promoting to production, paste this list into the deployment env
manager:

```
DEBUG=false
SECRET_KEY=<32+ char random>
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_DOMAIN=ishtop.uz           # or .ishtop.uz for subdomains
RATE_LIMIT_ENABLED=true
REDIS_ENABLED=true
REDIS_URL=redis://...
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://ishtop.uz,https://www.ishtop.uz
FRONTEND_URL=https://ishtop.uz
GOOGLE_CLIENT_SECRET=<rotated>
GEMINI_API_KEY=<production key>
SENDGRID_API_KEY=<production key>      # if email used
```

## How to verify no secrets are tracked

```bash
# 1. No .env tracked
git ls-files | grep -E "(^|/)\.env($|\\.[^/]+$)" | grep -v "\\.env\\.example$"
#    → must print nothing

# 2. No SQLite tracked
git ls-files | grep -E "\\.(db|sqlite|sqlite3)$"
#    → must print nothing

# 3. Run automated check
bash scripts/check-env-safety.sh
```

If any of those print output, do NOT push. Investigate, untrack, rotate.

## Threat model assumptions

- An attacker who compromises a build dependency (XSS via npm supply chain)
  cannot read tokens — they live in `HttpOnly` cookies only.
- An attacker with the production DB cannot impersonate a user — passwords
  are bcrypt-hashed, JWTs are signed with `SECRET_KEY` not stored in DB.
- CSRF for state-changing routes is mitigated by `SameSite=Lax`. For
  defense-in-depth, requiring `X-Requested-With: XMLHttpRequest` on
  unsafe-method authenticated endpoints is on the roadmap.

## Open follow-ups (not blocking demo)

- Refresh token rotation (issue new refresh JWT on every `/auth/refresh`).
- Double-submit CSRF token for unsafe methods.
- Sentry / Datadog wiring for production error tracking.
- Automated secret scanning (`gitleaks`) in CI.
