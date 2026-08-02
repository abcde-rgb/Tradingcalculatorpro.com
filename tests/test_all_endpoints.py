#!/usr/bin/env python3
"""
TradingCalculator.Pro — Test Suite Completo
Prueba cada endpoint del backend en producción y reporta errores.

Uso:
    python tests/test_all_endpoints.py
    python tests/test_all_endpoints.py --url https://<servicio>-<numero>.europe-west1.run.app

Requiere:
    pip install requests
"""

import requests
import json
import time
import os
import sys
import argparse
from datetime import datetime
from typing import Optional

# ─────────────────────────────────────────────
# Se toma del entorno. El literal anterior apuntaba a us-central1 mientras el
# despliegue real vive en europe-west1, así que este smoke medía un host que no
# existe. Sin BACKEND_URL no hay valor por defecto que inventar.
BASE_URL = os.environ.get("BACKEND_URL", "").rstrip("/")
TIMEOUT  = 10
# ─────────────────────────────────────────────

results = []

def test(name: str, method: str, path: str,
         json_body=None, headers=None,
         expected_status: int = 200,
         check_keys: list = None,
         token: str = None,
         description: str = ""):
    """Ejecuta un test y registra el resultado."""
    url = f"{BASE_URL}{path}"
    hdrs = {"Content-Type": "application/json"}
    if token:
        hdrs["Authorization"] = f"Bearer {token}"
    if headers:
        hdrs.update(headers)

    start = time.time()
    try:
        resp = requests.request(method, url, json=json_body,
                                headers=hdrs, timeout=TIMEOUT)
        elapsed = round((time.time() - start) * 1000)
        status_ok = resp.status_code == expected_status

        keys_ok = True
        missing_keys = []
        if check_keys and status_ok:
            try:
                body = resp.json()
                for key in check_keys:
                    if key not in body:
                        keys_ok = False
                        missing_keys.append(key)
            except Exception:
                keys_ok = False

        passed = status_ok and keys_ok
        icon   = "✅" if passed else "❌"
        reason = ""
        if not status_ok:
            reason = f"esperado {expected_status}, recibido {resp.status_code}"
        elif not keys_ok:
            reason = f"faltan claves en respuesta: {missing_keys}"

        results.append({
            "name": name,
            "method": method,
            "path": path,
            "status": resp.status_code,
            "expected": expected_status,
            "elapsed_ms": elapsed,
            "passed": passed,
            "reason": reason,
            "description": description,
        })
        print(f"{icon} [{elapsed:4d}ms] {method:6s} {path:55s} → {resp.status_code}  {reason}")
        return resp

    except requests.exceptions.ConnectionError:
        results.append({"name": name, "method": method, "path": path,
                        "status": 0, "expected": expected_status,
                        "elapsed_ms": 9999, "passed": False,
                        "reason": "CONNECTION ERROR — backend no responde",
                        "description": description})
        print(f"❌ [ERR ] {method:6s} {path:55s} → CONNECTION ERROR")
        return None
    except requests.exceptions.Timeout:
        results.append({"name": name, "method": method, "path": path,
                        "status": 0, "expected": expected_status,
                        "elapsed_ms": TIMEOUT * 1000, "passed": False,
                        "reason": "TIMEOUT — tardó más de 10s",
                        "description": description})
        print(f"❌ [TOUT] {method:6s} {path:55s} → TIMEOUT")
        return None


def run_all_tests():
    print(f"\n{'='*80}")
    print(f"  TradingCalculator.Pro — Test Suite")
    print(f"  Backend: {BASE_URL}")
    print(f"  Fecha:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}\n")

    # ── 1. HEALTH & ROOT ──────────────────────────────────────────────────────
    print("\n📡 SECCIÓN 1: HEALTH & ROOT")
    print("-" * 60)
    test("root", "GET", "/", expected_status=200, description="Endpoint raíz activo")
    test("health", "GET", "/health", expected_status=200,
         check_keys=["status"], description="Health check del servidor")
    test("docs", "GET", "/docs", expected_status=200, description="Swagger UI activo")
    test("openapi", "GET", "/openapi.json", expected_status=200, description="OpenAPI schema")

    # ── 2. AUTENTICACIÓN ──────────────────────────────────────────────────────
    print("\n🔐 SECCIÓN 2: AUTENTICACIÓN")
    print("-" * 60)
    token = None
    TEST_EMAIL = f"test_auto_{int(time.time())}@test.com"
    TEST_PASS  = "TestPass123!"

    # Registro
    resp = test("register", "POST", "/api/auth/register",
                json_body={"email": TEST_EMAIL, "password": TEST_PASS, "name": "Test Auto"},
                expected_status=200,
                check_keys=["token"],
                description="Registrar nuevo usuario")
    if resp and resp.status_code == 200:
        try:
            token = resp.json().get("token")
            print(f"   → Token obtenido para tests autenticados")
        except Exception:
            pass

    # Login con credenciales correctas
    resp2 = test("login_ok", "POST", "/api/auth/login",
                 json_body={"email": TEST_EMAIL, "password": TEST_PASS},
                 expected_status=200,
                 check_keys=["token", "user"],
                 description="Login con credenciales válidas")
    if resp2 and resp2.status_code == 200 and not token:
        try:
            token = resp2.json().get("token")
        except Exception:
            pass

    # Login con credenciales incorrectas
    test("login_bad", "POST", "/api/auth/login",
         json_body={"email": TEST_EMAIL, "password": "WrongPass999"},
         expected_status=401,
         description="Login con contraseña incorrecta debe dar 401")

    # Login sin body
    test("login_empty", "POST", "/api/auth/login",
         json_body={},
         expected_status=422,
         description="Login sin datos debe dar 422")

    # Forgot password
    test("forgot_password", "POST", "/api/auth/forgot-password",
         json_body={"email": TEST_EMAIL},
         expected_status=200,
         description="Solicitar reset de contraseña")

    # Magic link
    test("magic_link", "POST", "/api/auth/magic-link",
         json_body={"email": TEST_EMAIL},
         expected_status=200,
         description="Solicitar magic link")

    # Google OAuth (sin credential válido → debe dar 422 o 400, NO 500)
    test("google_oauth_invalid", "POST", "/api/auth/google",
         json_body={"credential": "invalid_token"},
         expected_status=400,
         description="Google OAuth con token inválido → no debe dar 500")

    # ── 3. USUARIO AUTENTICADO ────────────────────────────────────────────────
    print("\n👤 SECCIÓN 3: USUARIO AUTENTICADO")
    print("-" * 60)
    if token:
        test("get_profile", "GET", "/api/user/profile",
             token=token, expected_status=200,
             check_keys=["id", "email"],
             description="Obtener perfil del usuario autenticado")

        test("update_profile", "PATCH", "/api/user/profile",
             token=token,
             json_body={"name": "Test Actualizado"},
             expected_status=200,
             description="Actualizar nombre del perfil")

        test("get_my_data", "GET", "/api/auth/my-data",
             token=token, expected_status=200,
             description="Descargar datos personales (RGPD)")

        test("change_password", "POST", "/api/auth/change-password",
             token=token,
             json_body={"current_password": TEST_PASS,
                        "new_password": "NewPass456!"},
             expected_status=200,
             description="Cambiar contraseña")

        test("user_preferences", "PATCH", "/api/user/preferences",
             token=token,
             json_body={"emailNotifications": True, "compactMode": False},
             expected_status=200,
             description="Guardar preferencias de usuario")
    else:
        print("   ⚠️  Sin token — saltando tests autenticados")

    # ── 4. SIN AUTENTICACIÓN → 401 ────────────────────────────────────────────
    print("\n🔒 SECCIÓN 4: ENDPOINTS PROTEGIDOS SIN TOKEN → deben dar 401")
    print("-" * 60)
    test("profile_no_auth", "GET", "/api/user/profile",
         expected_status=401, description="Perfil sin token → 401")
    test("my_data_no_auth", "GET", "/api/auth/my-data",
         expected_status=401, description="Datos sin token → 401")
    test("admin_no_auth", "GET", "/api/admin/stats",
         expected_status=401, description="Admin sin token → 401")
    test("sub_no_auth", "GET", "/api/subscriptions/current",
         expected_status=401, description="Suscripción sin token → 401")

    # ── 5. PRECIOS DE MERCADO ─────────────────────────────────────────────────
    print("\n📈 SECCIÓN 5: PRECIOS DE MERCADO")
    print("-" * 60)
    test("prices_btc", "GET", "/api/prices?symbols=BTC",
         expected_status=200,
         description="Precio de BTC")
    test("prices_multi", "GET", "/api/prices?symbols=BTC,ETH,SPY",
         expected_status=200,
         description="Precios múltiples")
    test("prices_forex", "GET", "/api/prices/forex",
         expected_status=200,
         description="Tipos de cambio forex")

    # ── 6. CÁLCULOS (requiere token) ──────────────────────────────────────────
    print("\n🧮 SECCIÓN 6: CÁLCULOS")
    print("-" * 60)
    if token:
        test("save_calc", "POST", "/api/calculations",
             token=token,
             json_body={"calculator_type": "leverage",
                        "inputs": {"capital": 1000, "leverage": 10},
                        "results": {"position_size": 10000}},
             expected_status=200,
             description="Guardar cálculo de apalancamiento")

        test("get_calc_history", "GET", "/api/calculations",
             token=token, expected_status=200,
             description="Obtener historial de cálculos")
    else:
        print("   ⚠️  Sin token — saltando tests de cálculos")

    # ── 7. ALERTAS ────────────────────────────────────────────────────────────
    print("\n🔔 SECCIÓN 7: ALERTAS DE PRECIO")
    print("-" * 60)
    if token:
        resp_alert = test("create_alert", "POST", "/api/alerts",
             token=token,
             json_body={"symbol": "BTC", "target_price": 100000,
                        "condition": "above", "notification_type": "email"},
             expected_status=200,
             check_keys=["id"],
             description="Crear alerta de precio")

        test("get_alerts", "GET", "/api/alerts",
             token=token, expected_status=200,
             description="Listar alertas del usuario")

        if resp_alert and resp_alert.status_code == 200:
            try:
                alert_id = resp_alert.json().get("id")
                if alert_id:
                    test("delete_alert", "DELETE", f"/api/alerts/{alert_id}",
                         token=token, expected_status=200,
                         description="Eliminar alerta")
            except Exception:
                pass
    else:
        print("   ⚠️  Sin token — saltando tests de alertas")

    # ── 8. PAGOS & SUSCRIPCIONES ──────────────────────────────────────────────
    print("\n💳 SECCIÓN 8: PAGOS & SUSCRIPCIONES")
    print("-" * 60)
    if token:
        test("current_subscription", "GET", "/api/subscriptions/current",
             token=token, expected_status=200,
             description="Suscripción actual del usuario")

        test("billing_history", "GET", "/api/billing/history",
             token=token, expected_status=200,
             description="Historial de facturas")

        test("checkout_missing_plan", "POST", "/api/checkout/create",
             token=token,
             json_body={},
             expected_status=422,
             description="Checkout sin plan → 422 (no 500)")

        test("checkout_invalid_plan", "POST", "/api/checkout/create",
             token=token,
             json_body={"plan_id": "plan_inexistente"},
             expected_status=400,
             description="Checkout con plan inválido → 400 (no 500)")
    else:
        print("   ⚠️  Sin token — saltando tests de pagos")

    # ── 9. ADMIN (token no-admin → debe dar 403) ──────────────────────────────
    print("\n👑 SECCIÓN 9: PANEL ADMIN — usuario normal debe recibir 403")
    print("-" * 60)
    if token:
        test("admin_stats_forbidden", "GET", "/api/admin/stats",
             token=token, expected_status=403,
             description="Admin stats con usuario normal → 403")
        test("admin_users_forbidden", "GET", "/api/admin/users",
             token=token, expected_status=403,
             description="Admin users con usuario normal → 403")
        test("admin_diary_forbidden", "GET", "/api/admin/bug-diary",
             token=token, expected_status=403,
             description="Diario de bugs con usuario normal → 403")
    else:
        print("   ⚠️  Sin token — saltando tests de admin")

    # ── 10. LIMPIEZA ──────────────────────────────────────────────────────────
    print("\n🗑️  SECCIÓN 10: LIMPIEZA — eliminar usuario de test")
    print("-" * 60)
    if token:
        test("delete_test_account", "DELETE", "/api/auth/account",
             token=token, expected_status=200,
             description="Eliminar cuenta de test (limpieza)")

    # ── RESUMEN FINAL ─────────────────────────────────────────────────────────
    print(f"\n{'='*80}")
    total   = len(results)
    passed  = sum(1 for r in results if r["passed"])
    failed  = total - passed
    pct     = round(passed / total * 100) if total > 0 else 0

    print(f"  RESULTADO FINAL: {passed}/{total} tests pasados ({pct}%)")
    print(f"  ✅ Pasados: {passed}")
    print(f"  ❌ Fallidos: {failed}")
    print(f"{'='*80}\n")

    if failed > 0:
        print("TESTS FALLIDOS:")
        for r in results:
            if not r["passed"]:
                print(f"  ❌ {r['name']:40s} → {r['reason']}")
        print()

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=BASE_URL, help="URL base del backend")
    args = parser.parse_args()
    BASE_URL = args.url.rstrip("/")
    run_all_tests()
