#!/usr/bin/env bash
# =============================================================================
# IshTop — Environment safety guard
# =============================================================================
# Run before pushing or before promoting a deploy. Exits non-zero on any
# tracked secret-bearing file, unsafe sample value, or wildcard CORS in a
# production sample. Safe to run repeatedly; makes no changes.
# =============================================================================
set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PASS=0
FAIL=0
say_pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
say_fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }

echo "== IshTop env safety check =="

# ---- 1. No real .env tracked in git ----------------------------------------
tracked_env=$(git ls-files 2>/dev/null \
  | grep -E '(^|/)\.env($|\.[^/]+$)' \
  | grep -v '\.env\.example$' || true)
if [ -z "$tracked_env" ]; then
  say_pass "No real .env tracked in git"
else
  say_fail "Tracked env files (must be ignored + secrets rotated):"
  printf "      %s\n" $tracked_env
fi

# ---- 2. No SQLite tracked --------------------------------------------------
tracked_db=$(git ls-files 2>/dev/null | grep -E '\.(db|sqlite|sqlite3)$' || true)
if [ -z "$tracked_db" ]; then
  say_pass "No SQLite / database files tracked"
else
  say_fail "Tracked DB files:"
  printf "      %s\n" $tracked_db
fi

# ---- 3. .env.example files exist ------------------------------------------
for f in backend/.env.example frontend/.env.example; do
  [ -f "$f" ] && say_pass "$f present" || say_fail "$f missing"
done

# ---- 4. backend/.env.example has DEBUG=true, AUTH_COOKIE_SECURE=false ----
# These are the LOCAL DEV defaults. Production deploys override.
if [ -f backend/.env.example ]; then
  grep -qE '^DEBUG=true' backend/.env.example \
    && say_pass "backend/.env.example: DEBUG=true (dev default)" \
    || say_fail "backend/.env.example missing DEBUG=true"
  grep -qE '^AUTH_COOKIE_SECURE=false' backend/.env.example \
    && say_pass "backend/.env.example: AUTH_COOKIE_SECURE=false (dev default)" \
    || say_fail "backend/.env.example missing AUTH_COOKIE_SECURE"
  grep -qE '^RATE_LIMIT_ENABLED=false' backend/.env.example \
    && say_pass "backend/.env.example: RATE_LIMIT_ENABLED=false (dev default)" \
    || say_fail "backend/.env.example missing RATE_LIMIT_ENABLED"
  # SECRET_KEY in example must be a placeholder, never the real production value
  if grep -qE '^SECRET_KEY=.*change-me' backend/.env.example; then
    say_pass "backend/.env.example: SECRET_KEY is a placeholder"
  else
    say_fail "backend/.env.example SECRET_KEY does not look like a placeholder"
  fi
  # CORS — wildcard in example is a footgun even for dev
  if grep -qE '^CORS_ORIGINS=\*' backend/.env.example; then
    say_fail "backend/.env.example has wildcard CORS_ORIGINS"
  else
    say_pass "backend/.env.example: CORS_ORIGINS is exact origins"
  fi
fi

# ---- 5. Real .env not present in sensitive grep paths ---------------------
if [ -f backend/.env ]; then
  if grep -qE '^SECRET_KEY=change-me' backend/.env; then
    say_fail "backend/.env still uses the placeholder SECRET_KEY — generate one"
  fi
  if grep -qE '^DEBUG=false' backend/.env && grep -qE '^DATABASE_URL=sqlite' backend/.env; then
    say_fail "backend/.env: DEBUG=false but DATABASE_URL is SQLite — production must use Postgres"
  fi
fi

# ---- 6. .gitignore covers env + db -----------------------------------------
# Normalize CRLF on read so this works on Windows-checkout repos.
gitignore_clean="$(tr -d '\r' < .gitignore 2>/dev/null || cat .gitignore)"
for pat in '^\.env$' '^\*\.db$' '^backend/\.env$' '^frontend/\.env$'; do
  if printf '%s\n' "$gitignore_clean" | grep -qE "$pat"; then
    say_pass ".gitignore matches $pat"
  else
    say_fail ".gitignore missing pattern $pat"
  fi
done

echo
echo "== summary: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
