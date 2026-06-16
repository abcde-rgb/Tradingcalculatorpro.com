#!/usr/bin/env python3
"""
⚠️  OBSOLETO — NO EJECUTAR

Este test fue escrito para la arquitectura antigua (MongoDB + Motor).
La BD es ahora Google Cloud SQL (PostgreSQL) via asyncpg.

Problemas que lo hacen 100% inoperativo:
  1. Importa motor.motor_asyncio (MongoDB) — no instalado en el backend actual.
  2. DEMO_PASSWORD hardcodeado como "1234" — la real es mínimo 8 chars.
  3. BACKEND_URL apunta a localhost:8001 — el backend corre en :8080.
  4. Al ejecutarse desde el root, `import requests` carga requests.py local
     (reemplazo stdlib), NO la librería HTTP real con sesiones/SSL completo.

Para tests actualizados usa: backend/tests/ (pytest + FastAPI TestClient).
"""
import sys
print("OBSOLETO: backend_test_security.py no es compatible con el backend PostgreSQL actual.", file=sys.stderr)
print("Usa: cd backend && pytest tests/ -v", file=sys.stderr)
sys.exit(1)

# ── CÓDIGO ORIGINAL PRESERVADO ABAJO (referencia histórica) ──────────────────
import requests  # noqa
import time  # noqa
import os  # noqa
from datetime import datetime  # noqa
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: MongoDB — obsoleto
import asyncio  # noqa

# Backend URL - use localhost to avoid Cloudflare blocking
BACKEND_URL = "http://localhost:8001/api"

# Test credentials
DEMO_EMAIL = "demo@btccalc.pro"
DEMO_PASSWORD = "1234"  # INCORRECTO: contraseña real es mínimo 8 chars

# MongoDB connection for TTL index check
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'trading_calculator_pro')

# Test results
results = {
    "A_logout": {"status": "PENDING", "details": []},
    "B_password_reset": {"status": "PENDING", "details": []},
    "C_rate_limiting": {"status": "PENDING", "details": []},
    "D_alerts_security": {"status": "PENDING", "details": []},
    "E_audit_log": {"status": "PENDING", "details": []},
    "F_ttl_indexes": {"status": "PENDING", "details": []},
}

def log_test(section, message, is_error=False):
    """Log test result"""
    prefix = "❌" if is_error else "✅"
    print(f"{prefix} [{section}] {message}")
    results[section]["details"].append({"message": message, "error": is_error})

def test_section_a_logout():
    """A. Logout / token revocation"""
    section = "A_logout"
    print("\n" + "="*80)
    print("SECTION A: LOGOUT / TOKEN REVOCATION")
    print("="*80)
    
    try:
        # 1. Login as demo → get token T1
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if resp.status_code != 200:
            log_test(section, f"Login failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        
        token_t1 = resp.json()["token"]
        log_test(section, "Step 1: Login successful, got token T1")
        
        # 2. GET /auth/me with T1 → 200
        resp = requests.get(f"{BACKEND_URL}/auth/me", headers={"Authorization": f"Bearer {token_t1}"})
        if resp.status_code != 200:
            log_test(section, f"GET /auth/me with T1 failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 2: GET /auth/me with T1 → 200 ✓")
        
        # 3. POST /auth/logout with T1 → 200, {"revoked": true}
        resp = requests.post(f"{BACKEND_URL}/auth/logout", headers={"Authorization": f"Bearer {token_t1}"})
        if resp.status_code != 200:
            log_test(section, f"POST /auth/logout failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        
        logout_data = resp.json()
        if not logout_data.get("revoked"):
            log_test(section, f"Logout response missing 'revoked: true': {logout_data}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 3: POST /auth/logout → 200, revoked=true ✓")
        
        # 4. GET /auth/me with T1 → 401 with detail mentioning "logout" / "revocada"
        resp = requests.get(f"{BACKEND_URL}/auth/me", headers={"Authorization": f"Bearer {token_t1}"})
        if resp.status_code != 401:
            log_test(section, f"GET /auth/me with revoked T1 should be 401, got {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        detail = resp.json().get("detail", "").lower()
        if "logout" not in detail and "revocada" not in detail:
            log_test(section, f"401 detail should mention 'logout' or 'revocada', got: {detail}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, f"Step 4: GET /auth/me with T1 → 401 with detail: '{detail}' ✓")
        
        # 5. Login again → new token T2 → GET /auth/me with T2 → 200
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if resp.status_code != 200:
            log_test(section, f"Second login failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        token_t2 = resp.json()["token"]
        log_test(section, "Step 5a: Second login successful, got token T2")
        
        resp = requests.get(f"{BACKEND_URL}/auth/me", headers={"Authorization": f"Bearer {token_t2}"})
        if resp.status_code != 200:
            log_test(section, f"GET /auth/me with T2 failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 5b: GET /auth/me with T2 → 200 ✓")
        
        results[section]["status"] = "PASS"
        log_test(section, "✅ ALL LOGOUT TESTS PASSED")
        
    except Exception as e:
        log_test(section, f"Exception: {str(e)}", True)
        results[section]["status"] = "FAIL"


def test_section_b_password_reset():
    """B. Password-reset revokes prior sessions"""
    section = "B_password_reset"
    print("\n" + "="*80)
    print("SECTION B: PASSWORD-RESET REVOKES PRIOR SESSIONS")
    print("="*80)
    
    try:
        # Get demo admin token
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if resp.status_code != 200:
            log_test(section, f"Demo login failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        admin_token = resp.json()["token"]
        
        # 1. Create a test user
        test_email = f"reset.test+{int(time.time())}@test.com"
        resp = requests.post(f"{BACKEND_URL}/admin/users", 
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": test_email,
                "password": "pw1234",
                "name": "Reset Test User",
                "subscription_plan": "monthly",
                "is_premium": True
            }
        )
        if resp.status_code != 200:
            log_test(section, f"Create user failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        
        user_data = resp.json()["user"]
        user_id = user_data["id"]
        log_test(section, f"Step 1: Created test user {test_email}")
        
        # 2. Login as that user → token U1
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": test_email,
            "password": "pw1234"
        })
        if resp.status_code != 200:
            log_test(section, f"User login failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        
        token_u1 = resp.json()["token"]
        log_test(section, "Step 2: User login successful, got token U1")
        
        # 3. GET /auth/me with U1 → 200
        resp = requests.get(f"{BACKEND_URL}/auth/me", headers={"Authorization": f"Bearer {token_u1}"})
        if resp.status_code != 200:
            log_test(section, f"GET /auth/me with U1 failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 3: GET /auth/me with U1 → 200 ✓")
        
        # 4. As demo, reset password
        resp = requests.post(f"{BACKEND_URL}/admin/users/{user_id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"new_password": "pw9999"}
        )
        if resp.status_code != 200:
            log_test(section, f"Reset password failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 4: Password reset to 'pw9999' successful")
        
        # 5. GET /auth/me with U1 → expect 401 with detail mentioning "contraseña" / "expirada"
        resp = requests.get(f"{BACKEND_URL}/auth/me", headers={"Authorization": f"Bearer {token_u1}"})
        if resp.status_code != 401:
            log_test(section, f"GET /auth/me with old U1 should be 401, got {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        detail = resp.json().get("detail", "").lower()
        if "contraseña" not in detail and "expirada" not in detail and "password" not in detail:
            log_test(section, f"401 detail should mention password/contraseña/expirada, got: {detail}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, f"Step 5: GET /auth/me with U1 → 401 with detail: '{detail}' ✓")
        
        # 6. Login with NEW password → 200
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": test_email,
            "password": "pw9999"
        })
        if resp.status_code != 200:
            log_test(section, f"Login with new password failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 6: Login with new password 'pw9999' → 200 ✓")
        
        # 7. Cleanup: DELETE user
        resp = requests.delete(f"{BACKEND_URL}/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            log_test(section, f"Delete user failed: {resp.status_code}", True)
        else:
            log_test(section, "Step 7: User deleted successfully")
        
        results[section]["status"] = "PASS"
        log_test(section, "✅ ALL PASSWORD-RESET TESTS PASSED")
        
    except Exception as e:
        log_test(section, f"Exception: {str(e)}", True)
        results[section]["status"] = "FAIL"


def test_section_d_alerts_security():
    """D. /alerts/send-email security"""
    section = "D_alerts_security"
    print("\n" + "="*80)
    print("SECTION D: /ALERTS/SEND-EMAIL SECURITY")
    print("="*80)
    
    try:
        # Get demo token
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if resp.status_code != 200:
            log_test(section, f"Demo login failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        demo_token = resp.json()["token"]
        
        # 1. Without auth: POST /api/alerts/send-email → expect 401
        resp = requests.post(f"{BACKEND_URL}/alerts/send-email", json={
            "email": "stranger@evil.com",
            "symbol": "BTC",
            "currentPrice": 50000,
            "targetPrice": 51000,
            "condition": "above"
        })
        if resp.status_code != 401:
            log_test(section, f"POST /alerts/send-email without auth should be 401, got {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 1: POST /alerts/send-email without auth → 401 ✓")
        
        # 2. With demo's token, body with stranger email → expect 403
        resp = requests.post(f"{BACKEND_URL}/alerts/send-email",
            headers={"Authorization": f"Bearer {demo_token}"},
            json={
                "email": "stranger@evil.com",
                "symbol": "BTC",
                "currentPrice": 50000,
                "targetPrice": 51000,
                "condition": "above"
            }
        )
        if resp.status_code != 403:
            log_test(section, f"POST /alerts/send-email with stranger email should be 403, got {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        detail = resp.json().get("detail", "")
        if "solo puedes enviarte" not in detail.lower() and "yourself" not in detail.lower():
            log_test(section, f"403 detail should mention 'solo puedes enviarte', got: {detail}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, f"Step 2: POST /alerts/send-email with stranger email → 403 with detail: '{detail}' ✓")
        
        # 3. With demo's token, body where email matches caller → expect 200 or 200 with status: "skipped"
        resp = requests.post(f"{BACKEND_URL}/alerts/send-email",
            headers={"Authorization": f"Bearer {demo_token}"},
            json={
                "email": DEMO_EMAIL,
                "symbol": "BTC",
                "currentPrice": 50000,
                "targetPrice": 51000,
                "condition": "above"
            }
        )
        if resp.status_code != 200:
            log_test(section, f"POST /alerts/send-email with matching email should be 200, got {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        resp_data = resp.json()
        status = resp_data.get("status", "")
        if status in ["sent", "skipped"]:
            log_test(section, f"Step 3: POST /alerts/send-email with matching email → 200 with status='{status}' ✓")
        else:
            log_test(section, f"Step 3: POST /alerts/send-email with matching email → 200 (status={status}) ✓")
        
        results[section]["status"] = "PASS"
        log_test(section, "✅ ALL ALERTS SECURITY TESTS PASSED")
        
    except Exception as e:
        log_test(section, f"Exception: {str(e)}", True)
        results[section]["status"] = "FAIL"


def test_section_e_audit_log():
    """E. Audit log"""
    section = "E_audit_log"
    print("\n" + "="*80)
    print("SECTION E: AUDIT LOG")
    print("="*80)
    
    try:
        # Get demo admin token
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if resp.status_code != 200:
            log_test(section, f"Demo login failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        admin_token = resp.json()["token"]
        
        # 1. Snapshot total
        resp = requests.get(f"{BACKEND_URL}/admin/audit-log",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            log_test(section, f"GET /admin/audit-log failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        initial_total = resp.json()["total"]
        log_test(section, f"Step 1: Initial audit log total: {initial_total}")
        
        # 2. Trigger 5 known actions
        test_email = f"audit.test+{int(time.time())}@test.com"
        
        # a. POST /admin/users → user.create
        resp = requests.post(f"{BACKEND_URL}/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": test_email,
                "password": "pw1234",
                "name": "Audit Test",
                "subscription_plan": "monthly",
                "is_premium": True
            }
        )
        if resp.status_code != 200:
            log_test(section, f"Create user failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        
        user_data = resp.json()["user"]
        user_id = user_data["id"]
        log_test(section, f"Step 2a: Created user {test_email} → expect user.create audit row")
        
        # b. PATCH /admin/users/{id} → user.update (using requests.request since patch not available)
        resp = requests.request("PATCH", f"{BACKEND_URL}/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "is_premium": True,
                "subscription_plan": "lifetime"
            }
        )
        if resp.status_code != 200:
            log_test(section, f"Update user failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 2b: Updated user → expect user.update audit row")
        
        # c. POST /admin/users/{id}/reset-password → user.reset_password
        resp = requests.post(f"{BACKEND_URL}/admin/users/{user_id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"new_password": "newpass99"}
        )
        if resp.status_code != 200:
            log_test(section, f"Reset password failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 2c: Reset password → expect user.reset_password audit row")
        
        # d. POST /admin/promote → user.promote
        resp = requests.post(f"{BACKEND_URL}/admin/promote",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"email": test_email, "is_admin": True}
        )
        if resp.status_code != 200:
            log_test(section, f"Promote user failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 2d: Promoted user → expect user.promote audit row")
        
        # e. PUT /admin/settings → settings.update
        resp = requests.put(f"{BACKEND_URL}/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"ga4_measurement_id": "G-AUDIT123"}
        )
        if resp.status_code != 200:
            log_test(section, f"Update settings failed: {resp.status_code} {resp.text}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 2e: Updated settings → expect settings.update audit row")
        
        # 3. GET /admin/audit-log?limit=10 → verify 5 most-recent rows
        resp = requests.get(f"{BACKEND_URL}/admin/audit-log?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            log_test(section, f"GET /admin/audit-log failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        audit_data = resp.json()
        rows = audit_data["rows"]
        
        # Verify we have at least 5 new rows
        if len(rows) < 5:
            log_test(section, f"Expected at least 5 audit rows, got {len(rows)}", True)
            results[section]["status"] = "FAIL"
            return
        
        # Check the 5 most recent rows match our actions (in reverse chronological order)
        expected_actions = ["settings.update", "user.promote", "user.reset_password", "user.update", "user.create"]
        actual_actions = [row["action"] for row in rows[:5]]
        
        if actual_actions != expected_actions:
            log_test(section, f"Expected actions {expected_actions}, got {actual_actions}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, f"Step 3: Verified 5 most-recent audit rows match expected actions ✓")
        
        # 4. Verify each row has required fields
        for i, row in enumerate(rows[:5]):
            if not all(k in row for k in ["id", "admin_email", "details", "ip", "timestamp"]):
                log_test(section, f"Row {i} missing required fields: {row.keys()}", True)
                results[section]["status"] = "FAIL"
                return
            
            if row["admin_email"] != DEMO_EMAIL:
                log_test(section, f"Row {i} admin_email should be {DEMO_EMAIL}, got {row['admin_email']}", True)
                results[section]["status"] = "FAIL"
                return
            
            if not row["details"]:
                log_test(section, f"Row {i} details should be non-empty", True)
                results[section]["status"] = "FAIL"
                return
        
        log_test(section, "Step 4: All rows have required fields (id, admin_email, details, ip, timestamp) ✓")
        
        # 5. Test filters
        # a. Filter by action=user.create
        resp = requests.get(f"{BACKEND_URL}/admin/audit-log?action=user.create",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            log_test(section, f"Filter by action failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        filtered_rows = resp.json()["rows"]
        if not all(row["action"] == "user.create" for row in filtered_rows):
            log_test(section, "Filter by action=user.create returned non-matching rows", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 5a: Filter by action=user.create → only user.create rows ✓")
        
        # b. Filter by target_email
        resp = requests.get(f"{BACKEND_URL}/admin/audit-log?target_email={test_email}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            log_test(section, f"Filter by target_email failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        filtered_rows = resp.json()["rows"]
        if not all(row.get("target_email", "").lower() == test_email.lower() for row in filtered_rows):
            log_test(section, f"Filter by target_email={test_email} returned non-matching rows", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, f"Step 5b: Filter by target_email={test_email} → only matching rows ✓")
        
        # c. Filter by admin_email
        resp = requests.get(f"{BACKEND_URL}/admin/audit-log?admin_email={DEMO_EMAIL}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            log_test(section, f"Filter by admin_email failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        filtered_rows = resp.json()["rows"]
        if len(filtered_rows) == 0:
            log_test(section, "Filter by admin_email returned no rows", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, f"Step 5c: Filter by admin_email={DEMO_EMAIL} → returns rows ✓")
        
        # 6. CRITICAL: Verify settings.update row doesn't leak secrets
        # Trigger one more PUT /admin/settings with stripe_secret_key
        resp = requests.put(f"{BACKEND_URL}/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"stripe_secret_key": "sk_test_NEVERLEAKME"}
        )
        if resp.status_code != 200:
            log_test(section, f"Update settings with secret failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        # Read audit log and verify the details show [redacted]
        resp = requests.get(f"{BACKEND_URL}/admin/audit-log?action=settings.update&limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            log_test(section, f"GET audit log for settings.update failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        settings_row = resp.json()["rows"][0]
        details = settings_row.get("details", {})
        changed_fields = details.get("changed_fields", {})
        
        if "stripe_secret_key" in changed_fields:
            secret_value = changed_fields["stripe_secret_key"]
            if "sk_test_NEVERLEAKME" in str(secret_value):
                log_test(section, f"CRITICAL: stripe_secret_key leaked in audit log: {secret_value}", True)
                results[section]["status"] = "FAIL"
                return
            
            if "[redacted]" not in str(secret_value).lower() and "[cleared]" not in str(secret_value).lower():
                log_test(section, f"stripe_secret_key should show [redacted] or [cleared], got: {secret_value}", True)
                results[section]["status"] = "FAIL"
                return
        
        log_test(section, "Step 6: settings.update row doesn't leak stripe_secret_key (shows [redacted]) ✓")
        
        # 7. Auth checks
        # a. GET /admin/audit-log without auth → 401
        resp = requests.get(f"{BACKEND_URL}/admin/audit-log")
        if resp.status_code != 401:
            log_test(section, f"GET /admin/audit-log without auth should be 401, got {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 7a: GET /admin/audit-log without auth → 401 ✓")
        
        # b. Create a non-admin user and try to access audit log
        non_admin_email = f"nonadmin.test+{int(time.time())}@test.com"
        resp = requests.post(f"{BACKEND_URL}/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": non_admin_email,
                "password": "pw1234",
                "name": "Non Admin",
                "is_admin": False
            }
        )
        if resp.status_code != 200:
            log_test(section, f"Create non-admin user failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        non_admin_id = resp.json()["user"]["id"]
        
        # Login as non-admin
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": non_admin_email,
            "password": "pw1234"
        })
        if resp.status_code != 200:
            log_test(section, f"Non-admin login failed: {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        non_admin_token = resp.json()["token"]
        
        # Try to access audit log with non-admin token → 403
        resp = requests.get(f"{BACKEND_URL}/admin/audit-log",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        if resp.status_code != 403:
            log_test(section, f"GET /admin/audit-log with non-admin should be 403, got {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        log_test(section, "Step 7b: GET /admin/audit-log with non-admin token → 403 ✓")
        
        # 8. Cleanup
        # Delete test users
        for uid in [user_id, non_admin_id]:
            resp = requests.delete(f"{BACKEND_URL}/admin/users/{uid}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            if resp.status_code != 200:
                log_test(section, f"Delete user {uid} failed: {resp.status_code}", True)
        
        # Reset settings
        resp = requests.put(f"{BACKEND_URL}/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"ga4_measurement_id": "", "stripe_secret_key": "__CLEAR__"}
        )
        if resp.status_code != 200:
            log_test(section, f"Reset settings failed: {resp.status_code}", True)
        else:
            log_test(section, "Step 8: Cleanup complete (users deleted, settings reset)")
        
        results[section]["status"] = "PASS"
        log_test(section, "✅ ALL AUDIT LOG TESTS PASSED")
        
    except Exception as e:
        log_test(section, f"Exception: {str(e)}", True)
        results[section]["status"] = "FAIL"


async def test_section_f_ttl_indexes():
    """F. TTL indexes exist (smoke check)"""
    section = "F_ttl_indexes"
    print("\n" + "="*80)
    print("SECTION F: TTL INDEXES")
    print("="*80)
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Check TTL indexes on these collections
        ttl_collections = {
            "stock_cache": "expires_at",
            "user_states": "expires_at",
            "revoked_tokens": "expires_at",
            "user_revocations": "expires_at",
            "admin_audit_log": "timestamp"
        }
        
        for coll_name, field_name in ttl_collections.items():
            indexes = await db[coll_name].index_information()
            
            # Look for TTL index
            ttl_found = False
            for idx_name, idx_info in indexes.items():
                key = idx_info.get("key", [])
                expire_after = idx_info.get("expireAfterSeconds")
                
                # Check if this index is on the expected field and has expireAfterSeconds
                if any(k[0] == field_name for k in key) and expire_after is not None:
                    ttl_found = True
                    log_test(section, f"✓ {coll_name}: TTL index on '{field_name}' with expireAfterSeconds={expire_after}")
                    break
            
            if not ttl_found:
                log_test(section, f"✗ {coll_name}: No TTL index found on '{field_name}'", True)
                results[section]["status"] = "FAIL"
                client.close()
                return
        
        client.close()
        results[section]["status"] = "PASS"
        log_test(section, "✅ ALL TTL INDEXES VERIFIED")
        
    except Exception as e:
        log_test(section, f"Exception: {str(e)}", True)
        results[section]["status"] = "FAIL"


def test_section_c_rate_limiting():
    """C. Rate limiting (run LAST to avoid blocking other tests)"""
    section = "C_rate_limiting"
    print("\n" + "="*80)
    print("SECTION C: RATE LIMITING (RUNNING LAST)")
    print("="*80)
    print("⚠️  WARNING: This test will trigger rate limits. Run at the end!")
    
    try:
        # 1. Spam POST /auth/login with bad creds 12 times
        log_test(section, "Step 1: Spamming POST /auth/login 12 times with bad credentials...")
        
        success_count = 0
        rate_limited_count = 0
        
        for i in range(12):
            resp = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": "fake@test.com",
                "password": "wrongpassword"
            })
            
            if resp.status_code == 401:
                success_count += 1
            elif resp.status_code == 429:
                rate_limited_count += 1
                detail = resp.json().get("detail", "")
                log_test(section, f"  Attempt {i+1}: 429 (rate limited) - {detail}")
            else:
                log_test(section, f"  Attempt {i+1}: Unexpected status {resp.status_code}", True)
        
        # Note: We may already be rate-limited from previous test runs
        if success_count < 1:  # Just verify we got at least 1 successful attempt
            log_test(section, f"Expected at least 1 successful 401, got {success_count}", True)
            results[section]["status"] = "FAIL"
            return
        
        if rate_limited_count < 1:  # Just verify rate limiting is working
            log_test(section, f"Expected at least 1 rate-limited 429, got {rate_limited_count}", True)
            results[section]["status"] = "FAIL"
            return
        
        log_test(section, f"Step 1: ✓ Got {success_count} successful 401s and {rate_limited_count} rate-limited 429s (rate limiting is working)")
        
        # 2. Verify 429 is returned consistently
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": "fake@test.com",
            "password": "wrongpassword"
        })
        if resp.status_code != 429:
            log_test(section, f"Expected 429 after rate limit, got {resp.status_code}", True)
            results[section]["status"] = "FAIL"
            return
        
        detail = resp.json().get("detail", "").lower()
        if "demasiados" not in detail and "límite" not in detail and "limit" not in detail:
            log_test(section, f"429 detail should mention rate limit, got: {detail}", True)
            results[section]["status"] = "FAIL"
            return
        
        log_test(section, f"Step 2: ✓ Subsequent attempts return 429 with detail: '{detail}'")
        
        # 3. Spam POST /auth/register 4 times
        log_test(section, "Step 3: Spamming POST /auth/register 4 times...")
        
        register_success = 0
        register_rate_limited = 0
        
        for i in range(4):
            test_email = f"ratelimit.test+{int(time.time())}+{i}@test.com"
            resp = requests.post(f"{BACKEND_URL}/auth/register", json={
                "email": test_email,
                "password": "pw1234",
                "name": "Rate Limit Test"
            })
            
            if resp.status_code in [200, 400]:  # 200 success, 400 email collision
                register_success += 1
            elif resp.status_code == 429:
                register_rate_limited += 1
                detail = resp.json().get("detail", "")
                log_test(section, f"  Attempt {i+1}: 429 (rate limited) - {detail}")
            else:
                log_test(section, f"  Attempt {i+1}: Unexpected status {resp.status_code}", True)
            
            time.sleep(0.5)  # Small delay between requests
        
        # Note: We may already be rate-limited from previous test runs
        if register_success < 1:  # Just verify we got at least 1 successful attempt
            log_test(section, f"Expected at least 1 successful register attempt, got {register_success}", True)
            results[section]["status"] = "FAIL"
            return
        
        if register_rate_limited < 1:  # Just verify rate limiting is working
            log_test(section, f"Expected at least 1 rate-limited 429, got {register_rate_limited}", True)
            results[section]["status"] = "FAIL"
            return
        
        log_test(section, f"Step 3: ✓ Got {register_success} successful attempts and {register_rate_limited} rate-limited 429s (rate limiting is working)")
        
        results[section]["status"] = "PASS"
        log_test(section, "✅ ALL RATE LIMITING TESTS PASSED")
        log_test(section, "⚠️  Note: Rate limits are now active. Wait 60s before running other tests.")
        
    except Exception as e:
        log_test(section, f"Exception: {str(e)}", True)
        results[section]["status"] = "FAIL"


def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for section, result in results.items():
        status = result["status"]
        emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⏸️"
        print(f"{emoji} {section}: {status}")
    
    print("\n" + "="*80)
    
    # Count results
    passed = sum(1 for r in results.values() if r["status"] == "PASS")
    failed = sum(1 for r in results.values() if r["status"] == "FAIL")
    
    print(f"TOTAL: {passed} PASSED, {failed} FAILED")
    print("="*80)


if __name__ == "__main__":
    print("="*80)
    print("SECURITY PACK REGRESSION TEST")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Demo credentials: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    print("="*80)
    
    # Run tests in order (rate limiting LAST)
    test_section_a_logout()
    test_section_b_password_reset()
    test_section_d_alerts_security()
    test_section_e_audit_log()
    
    # Run TTL index check (async)
    asyncio.run(test_section_f_ttl_indexes())
    
    # Run rate limiting tests LAST
    print("\n⚠️  RUNNING RATE LIMITING TESTS (LAST) - This will trigger rate limits!")
    time.sleep(2)
    test_section_c_rate_limiting()
    
    # Print summary
    print_summary()
