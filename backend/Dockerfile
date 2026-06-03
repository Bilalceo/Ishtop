# =============================================================================
# CareerUZ - Backend Dockerfile (PRODUCTION)
# =============================================================================
# Multi-stage, non-root user, gunicorn production server

# --- Stage 1: Builder ---
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# --- Stage 2: Runtime ---
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads/avatars && \
    chown -R appuser:appuser /app

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production command: run migrations, then start gunicorn + uvicorn workers
CMD ["/bin/sh", "-lc", "alembic upgrade head && exec gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker --workers 4 --bind 0.0.0.0:8000 --timeout 120 --keep-alive 5 --access-logfile - --error-logfile - --log-level info"]
