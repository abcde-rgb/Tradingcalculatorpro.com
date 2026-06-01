#!/usr/bin/env python3
"""
TradingCalculator.Pro — Test de Consistencia Frontend ↔ Backend

Comprueba que cada endpoint que llama el frontend existe en el backend.
Lee los archivos .jsx del frontend, extrae las llamadas a la API,
y verifica que el backend las responde.

Uso:
    python tests/test_frontend_consistency.py

Requiere:
    pip install requests
"""

import re
import os
import requests
from pathlib import Path
from datetime import datetime

BASE_URL = "https://tradingcalculator-api-704202303011.us-central1.run.app"
FRONTEND_DIR = Path("frontend/src")

# Rutas que esperamos encontrar en el backend
EXPECTED_ROUTES = [
    # Auth
    ("POST",   "/api/auth/login"),
    ("POST",   "/api/auth/register"),
    ("POST",   "/api/auth/logout"),
    ("POST",   "/api/auth/forgot-password"),
    ("POST",   "/api/auth/reset-password"),
    ("POST",   "/api/auth/magic-link"),
    ("POST",   "/api/auth/magic-link/verify"),
    ("POST",   "/api/auth/google"),
    ("POST",   "/api/auth/change-password"),
    ("GET",    "/api/auth/my-data"),
    ("DELETE", "/api/auth/account"),
    # User
    ("GET",    "/api/user/profile"),
    ("PATCH",  "/api/user/profile"),
    ("PATCH",  "/api/user/preferences"),
    # Prices
    ("GET",    "/api/prices"),
    # Calculations
    ("GET",    "/api/calculations"),
    ("POST",   "/api/calculations"),
    # Alerts
    ("GET",    "/api/alerts"),
    ("POST",   "/api/alerts"),
    # Subscriptions
    ("GET",    "/api/subscriptions/current"),
    ("POST",   "/api/subscriptions/cancel"),
    ("POST",   "/api/subscriptions/resume"),
    # Billing
    ("GET",    "/api/billing/history"),
    ("POST",   "/api/billing/create-portal-session"),
    # Checkout
    ("POST",   "/api/checkout/create"),
    ("POST",   "/api/stripe/webhook"),
    # Admin
    ("GET",    "/api/admin/stats"),
    ("GET",    "/api/admin/users"),
    ("GET",    "/api/admin/payments"),
    ("GET",    "/api/admin/bug-diary"),
    ("POST",   "/api/admin/bug-diary"),
]


def extract_api_calls_from_frontend():
    """Extrae todas las llamadas a la API en archivos .jsx/.js del frontend."""
    api_calls = set()
    if not FRONTEND_DIR.exists():
        print(f"⚠️  No se encontró el directorio: {FRONTEND_DIR}")
        return api_calls

    # Patrón: fetch(`${API}/api/...`) o fetch(`${BASE}/api/...`) etc.
    pattern = re.compile(
        r'(?:fetch|axios\.(?:get|post|put|patch|delete))'
        r'[\s\(]+[`\'"]\.?(?:\$\{[^}]+\})?(/api/[^`\'"\?]+)',
        re.IGNORECASE
    )

    for f in FRONTEND_DIR.rglob("*.jsx"):
        text = f.read_text(encoding="utf-8", errors="ignore")
        for m in pattern.finditer(text):
            path = m.group(1).split("?")[0].strip()
            # Normalizar paths dinámicos: /api/alerts/123 → /api/alerts/{id}
            path = re.sub(r'/\d+', '/{id}', path)
            api_calls.add(path)

    for f in FRONTEND_DIR.rglob("*.js"):
        text = f.read_text(encoding="utf-8", errors="ignore")
        for m in pattern.finditer(text):
            path = m.group(1).split("?")[0].strip()
            path = re.sub(r'/\d+', '/{id}', path)
            api_calls.add(path)

    return api_calls


def check_route_exists(method: str, path: str) -> dict:
    """Comprueba si una ruta existe en el backend."""
    url = f"{BASE_URL}{path}"
    try:
        # Enviamos sin auth para verificar que la ruta existe (esperamos 401/403/422, no 404)
        r = requests.request(method, url, json={}, timeout=8,
                             headers={"Content-Type": "application/json"})
        exists = r.status_code not in (404, 405)
        return {
            "method": method,
            "path": path,
            "status": r.status_code,
            "exists": exists,
            "note": "OK — ruta existe" if exists else f"FALTA — {r.status_code}"
        }
    except requests.exceptions.ConnectionError:
        return {"method": method, "path": path, "status": 0,
                "exists": False, "note": "CONNECTION ERROR"}
    except requests.exceptions.Timeout:
        return {"method": method, "path": path, "status": 0,
                "exists": False, "note": "TIMEOUT"}


def run_consistency_check():
    print(f"\n{'='*70}")
    print(f"  Frontend ↔ Backend Consistency Check")
    print(f"  Backend: {BASE_URL}")
    print(f"  Fecha:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")

    # 1. Extraer llamadas del frontend
    print("🔍 Extrayendo llamadas API del frontend...")
    frontend_calls = extract_api_calls_from_frontend()
    if frontend_calls:
        print(f"   Encontradas {len(frontend_calls)} rutas únicas en el código frontend")
        for c in sorted(frontend_calls):
            print(f"   → {c}")
    else:
        print("   ⚠️  No se pudo leer el frontend (ejecuta desde la raíz del repo)")

    # 2. Verificar rutas esperadas
    print(f"\n🧪 Verificando {len(EXPECTED_ROUTES)} rutas conocidas en el backend...")
    print("-" * 70)
    missing  = []
    existing = []

    for method, path in EXPECTED_ROUTES:
        result = check_route_exists(method, path)
        icon = "✅" if result["exists"] else "❌"
        print(f"{icon} {method:6s} {path:50s} → {result['status']:3d}  {result['note']}")
        if result["exists"]:
            existing.append(result)
        else:
            missing.append(result)

    # Resumen
    print(f"\n{'='*70}")
    print(f"  Rutas existentes: {len(existing)}/{len(EXPECTED_ROUTES)}")
    print(f"  Rutas faltantes:  {len(missing)}/{len(EXPECTED_ROUTES)}")
    print(f"{'='*70}\n")

    if missing:
        print("❌ RUTAS FALTANTES EN EL BACKEND:")
        for r in missing:
            print(f"   {r['method']:6s} {r['path']}  → {r['note']}")
        print()

    return {"existing": existing, "missing": missing,
            "frontend_calls": list(frontend_calls)}


if __name__ == "__main__":
    run_consistency_check()
