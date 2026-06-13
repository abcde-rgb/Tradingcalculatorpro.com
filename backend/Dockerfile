# ============================================================
# TradingCalculator.pro — Dockerfile para Google Cloud Run
# Proyecto: tradingcalculator-495806
# ============================================================
FROM python:3.11-slim

# Variables de entorno del sistema
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Instalar dependencias del sistema (necesarias para psycopg2, etc.)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar e instalar dependencias Python primero (caching de capas)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente del backend
COPY . .

# Usuario no privilegiado — no ejecutar como root
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

# Cloud Run expone el puerto 8080
EXPOSE 8080

# Healthcheck para Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Arrancar con uvicorn — Cloud Run gestiona el escalado
CMD exec uvicorn server:app --host 0.0.0.0 --port ${PORT} --workers 1 --log-level info
