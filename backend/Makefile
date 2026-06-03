# =============================================================================
# CareerUZ - Makefile
# =============================================================================
# Common development commands

.PHONY: help install test test-cov test-unit test-integration lint format clean

# Default target
help:
	@echo "CareerUZ - Available Commands"
	@echo "===================================="
	@echo ""
	@echo "Setup:"
	@echo "  install        Install all dependencies"
	@echo "  install-dev    Install dev dependencies"
	@echo ""
	@echo "Testing:"
	@echo "  test           Run all tests"
	@echo "  test-cov       Run tests with coverage report"
	@echo "  test-unit      Run unit tests only"
	@echo "  test-int       Run integration tests only"
	@echo "  test-fast      Run tests in parallel"
	@echo "  test-watch     Run tests on file changes"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint           Run linters (flake8, mypy)"
	@echo "  format         Format code (black, isort)"
	@echo "  check          Run all checks"
	@echo ""
	@echo "Development:"
	@echo "  run            Start development server"
	@echo "  shell          Open Python shell"
	@echo "  clean          Remove cache files"
	@echo ""
	@echo "Database:"
	@echo "  db-migrate     Run database migrations"
	@echo "  db-revision    Create new migration"
	@echo ""

# =============================================================================
# Setup
# =============================================================================

install:
	pip install -r requirements.txt

install-dev: install
	pip install -r requirements.txt
	pre-commit install

# =============================================================================
# Testing
# =============================================================================

test:
	pytest

test-cov:
	pytest --cov=app --cov-report=html --cov-report=term-missing
	@echo ""
	@echo "Coverage report generated in htmlcov/index.html"

test-unit:
	pytest tests/unit -v

test-int:
	pytest tests/integration -v

test-fast:
	pytest -n auto

test-auth:
	pytest -k "auth" -v

test-resume:
	pytest -k "resume" -v

test-job:
	pytest -k "job" -v

test-ai:
	pytest -k "ai" -v

test-watch:
	pytest-watch

# =============================================================================
# Code Quality
# =============================================================================

lint:
	flake8 app tests
	mypy app

format:
	black app tests
	isort app tests

check: lint
	@echo "All checks passed!"

# =============================================================================
# Development
# =============================================================================

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

shell:
	python -c "from app.main import app; import code; code.interact(local=locals())"

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	@echo "Cleaned up cache files"

# =============================================================================
# Database
# =============================================================================

db-migrate:
	alembic upgrade head

db-revision:
	@read -p "Migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"

db-downgrade:
	alembic downgrade -1

db-history:
	alembic history
















