# =============================================================================
# SmartCareer AI - Automated Setup Script (Windows PowerShell)
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Blue
Write-Host "🚀 SmartCareer AI - Setup Script" -ForegroundColor Blue
Write-Host "================================================================================" -ForegroundColor Blue
Write-Host ""

function Print-Step {
    param($Message)
    Write-Host "▶ $Message" -ForegroundColor Cyan
}

function Print-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Print-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check prerequisites
Print-Step "Checking prerequisites..."

try {
    $pythonVersion = python --version 2>&1
    Print-Success "Python found: $pythonVersion"
} catch {
    Print-Error "Python not found. Please install Python 3.10+"
    exit 1
}

try {
    $nodeVersion = node --version
    Print-Success "Node.js found: $nodeVersion"
} catch {
    Print-Error "Node.js not found. Please install Node.js 18+"
    exit 1
}

try {
    $npmVersion = npm --version
    Print-Success "npm found: v$npmVersion"
} catch {
    Print-Error "npm not found. Please install npm"
    exit 1
}

Write-Host ""

# Backend setup
Print-Step "Setting up backend..."

Set-Location backend

# Create virtual environment
if (-not (Test-Path "venv")) {
    python -m venv venv
    Print-Success "Virtual environment created"
} else {
    Print-Warning "Virtual environment already exists"
}

# Activate virtual environment
& .\venv\Scripts\Activate.ps1

# Install dependencies
Print-Step "Installing Python dependencies..."
python -m pip install --upgrade pip | Out-Null
pip install -r requirements.txt | Out-Null
Print-Success "Python dependencies installed"

# Setup .env
if (-not (Test-Path ".env")) {
    Print-Step "Setting up .env file..."
    python setup_env.py
} else {
    Print-Warning ".env file already exists"
}

# Check database
if (-not (Test-Path "smartcareer.db")) {
    Print-Step "Running database migrations..."
    alembic upgrade head
    Print-Success "Database migrations completed"
    
    Print-Step "Seeding database with test data..."
    python seed_data.py
    Print-Success "Database seeded"
} else {
    Print-Warning "Database already exists. Run 'python seed_data.py' manually if needed"
}

Set-Location ..

Write-Host ""

# Frontend setup
Print-Step "Setting up frontend..."

Set-Location frontend

# Install dependencies
Print-Step "Installing Node.js dependencies..."
npm install 2>&1 | Out-Null
Print-Success "Node.js dependencies installed"

# Setup .env.local
if (-not (Test-Path ".env.local")) {
    Print-Step "Setting up .env.local file..."
    "NEXT_PUBLIC_API_URL=http://localhost:8000" | Out-File -FilePath ".env.local" -Encoding UTF8
    Print-Success ".env.local file created"
} else {
    Print-Warning ".env.local file already exists"
}

Set-Location ..

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:"
Write-Host ""
Write-Host "1️⃣  Configure AI provider (required):"
Write-Host "    - Edit backend\.env"
Write-Host "    - Add GEMINI_API_KEY (free from https://ai.google.dev/)"
Write-Host "    - Or add OPENAI_API_KEY (paid)"
Write-Host ""
Write-Host "2️⃣  Start the backend:"
Write-Host "    cd backend"
Write-Host "    .\venv\Scripts\Activate.ps1"
Write-Host "    uvicorn app.main:app --reload"
Write-Host ""
Write-Host "3️⃣  Start the frontend (in a new terminal):"
Write-Host "    cd frontend"
Write-Host "    npm run dev"
Write-Host ""
Write-Host "4️⃣  Access the application:"
Write-Host "    Frontend: http://localhost:3000"
Write-Host "    Backend:  http://localhost:8000"
Write-Host "    API Docs: http://localhost:8000/docs"
Write-Host ""
Write-Host "🔑 Test Accounts:"
Write-Host "    Admin:    admin@smartcareer.uz / Admin123!"
Write-Host "    Company:  hr@epam.com / Company123!"
Write-Host "    Student:  john@example.com / Student123!"
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Blue
Write-Host ""









