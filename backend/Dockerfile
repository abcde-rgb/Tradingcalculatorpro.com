# ============================================================
# TradingCalculator.pro — Dockerfile para Google Cloud Run
# Multi-stage: build tools quedan fuera de la imagen final.
# ============================================================

# ── Stage 1: build (instala deps con gcc/libpq) ────────────
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime (sin gcc ni libpq-dev) ────────────────
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Solo libpq5 (runtime de PostgreSQL, ~500KB) — no el -dev
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar paquetes Python compilados desde el stage builder
COPY --from=builder /install /usr/local

# Copiar código fuente
COPY . .

# Usuario no privilegiado
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

CMD exec uvicorn server:app --host 0.0.0.0 --port ${PORT} --workers 2 --log-level info
