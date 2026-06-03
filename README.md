# IshTop

AI-powered career platform for students/juniors (job seekers) and employers (HR).

Note: The extra module for university/grant search and motivation letters is intentionally removed/unsupported in this repo.

## Features

### Students / Juniors
- Auth: register/login, email verification, forgot-password
- Resume: manual resume CRUD + AI resume builder
- Jobs: browse/search/detail, AI matching
- Apply: manual apply + AI cover letter + auto-apply
- Track: applications status, interview info, notifications, settings

### Companies / HR
- Post jobs (create/edit/list)
- Manage applications (reviewing/shortlisted/interview/accepted/rejected)
- Candidate filtering (basic + AI-assisted)

### Admin
- Dashboard (overview/health/users/errors)
- Protected by admin role

## Tech Stack
- Backend: FastAPI, SQLAlchemy, Alembic, JWT auth (python-jose), PostgreSQL/SQLite
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand
- E2E: Playwright

## Local Development

### Prerequisites
- Python 3.11
- Node.js 18+

### Backend (FastAPI)
```powershell
cd backend

# Create venv (Python 3.11)
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Env
copy env.example .env

# DB migrations
alembic upgrade head

# Optional demo seed (creates admin/company/student accounts)
python seed_data.py

# Run
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backfill existing trust/discovery fields after running migrations:
```powershell
cd backend
python scripts/backfill_trust_and_discovery.py --dry-run
python scripts/backfill_trust_and_discovery.py
```

Backend:
- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`

### Frontend (Next.js)
```powershell
cd frontend
npm install

# IMPORTANT: must include /api/v1
$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000/api/v1"

npm run dev
```

Frontend:
- App: `http://127.0.0.1:3000`

## Admin Panel
- URL: `http://127.0.0.1:3000/admin`
- Requires admin role (seeded via `python seed_data.py`):
  - Email: `admin@ishtop.uz`
  - Password: `Admin123!`

## Tests

### Backend
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing --cov-fail-under=50
```

### Frontend
```powershell
cd frontend
$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000/api/v1"
npm run type-check
npm run build
```

### E2E (Playwright)
```powershell
cd frontend
$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000/api/v1"
npm run test:e2e
```

## CI
GitHub Actions workflow: `.github/workflows/ci.yml` runs:
- Backend tests (Python 3.10/3.11)
- Frontend build
- Playwright E2E
