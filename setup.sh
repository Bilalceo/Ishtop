#!/bin/bash
# =============================================================================
# CareerUZ - Automated Setup Script
# =============================================================================
# This script sets up the entire development environment

set -e  # Exit on error

echo ""
echo "================================================================================"
echo "🚀 CareerUZ - Setup Script"
echo "================================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
print_step "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    print_error "Python 3 not found. Please install Python 3.10+"
    exit 1
fi
print_success "Python found: $(python3 --version)"

if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi
print_success "Node.js found: $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm"
    exit 1
fi
print_success "npm found: $(npm --version)"

echo ""

# Backend setup
print_step "Setting up backend..."

cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_warning "Virtual environment already exists"
fi

# Activate virtual environment
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null

# Install dependencies
print_step "Installing Python dependencies..."
pip install --upgrade pip > /dev/null
pip install -r requirements.txt > /dev/null
print_success "Python dependencies installed"

# Setup .env
if [ ! -f ".env" ]; then
    print_step "Setting up .env file..."
    python setup_env.py
else
    print_warning ".env file already exists"
fi

# Check database
if [ ! -f "careeruz.db" ]; then
    print_step "Running database migrations..."
    alembic upgrade head
    print_success "Database migrations completed"
    
    print_step "Seeding database with test data..."
    python seed_data.py
    print_success "Database seeded"
else
    print_warning "Database already exists. Run 'python seed_data.py' manually if needed"
fi

cd ..

echo ""

# Frontend setup
print_step "Setting up frontend..."

cd frontend

# Install dependencies
print_step "Installing Node.js dependencies..."
npm install > /dev/null 2>&1
print_success "Node.js dependencies installed"

# Setup .env.local
if [ ! -f ".env.local" ]; then
    print_step "Setting up .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
    print_success ".env.local file created"
else
    print_warning ".env.local file already exists"
fi

cd ..

echo ""
echo "================================================================================"
echo "✅ SETUP COMPLETED SUCCESSFULLY!"
echo "================================================================================"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1️⃣  Configure AI provider (required):"
echo "    - Edit backend/.env"
echo "    - Add GEMINI_API_KEY (free from https://ai.google.dev/)"
echo "    - Or add OPENAI_API_KEY (paid)"
echo ""
echo "2️⃣  Start the backend:"
echo "    cd backend"
echo "    source venv/bin/activate  # or: . venv/Scripts/activate (Windows)"
echo "    uvicorn app.main:app --reload"
echo ""
echo "3️⃣  Start the frontend (in a new terminal):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "4️⃣  Access the application:"
echo "    Frontend: http://localhost:3000"
echo "    Backend:  http://localhost:8000"
echo "    API Docs: http://localhost:8000/docs"
echo ""
echo "🔑 Test Accounts:"
echo "    Admin:    admin@careeruz.uz / Admin123!"
echo "    Company:  hr@epam.com / Company123!"
echo "    Student:  john@example.com / Student123!"
echo ""
echo "================================================================================"
echo ""









