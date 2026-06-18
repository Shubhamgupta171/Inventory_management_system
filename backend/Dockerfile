# syntax=docker/dockerfile:1

# --------------------------------------------------------------------------- #
# Production image for the FastAPI backend.
# Uses a slim base, installs only runtime deps, and runs as a non-root user.
# --------------------------------------------------------------------------- #
FROM python:3.12-slim AS base

# - PYTHONDONTWRITEBYTECODE: no .pyc files
# - PYTHONUNBUFFERED: stream logs straight to stdout (Docker-friendly)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# psycopg2-binary ships wheels, so no compiler is required; we still install
# libpq for completeness/health of the driver at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first to leverage Docker layer caching.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application code.
COPY app ./app

# Create and switch to a non-root user.
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000

# Container-level health check hitting the API's /health route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
