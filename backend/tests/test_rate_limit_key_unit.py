"""
Regression tests for the rate-limit / audit-log client IP (BUG-015).

Why this matters: slowapi's default ``get_remote_address`` returns
``request.client.host``. Behind Cloud Run that is *Google's front end*, the same
value for every visitor on earth, so `POST /auth/register` (3/hour) became
3 registrations per hour for the WHOLE SITE. `_real_client_ip` reads
X-Forwarded-For instead, counting from the RIGHT so a client cannot forge it by
prepending fake entries.

Extracted with `ast` (same trick as test_security_unit.py) so the test runs
without fastapi/asyncpg/stripe installed.
"""
import ast
from pathlib import Path
from typing import Optional

_SERVER = Path(__file__).resolve().parent.parent / "server.py"


def _load_real_client_ip(hops: int = 1):
    """Pull `_real_client_ip` out of server.py and bind it to `hops`."""
    tree = ast.parse(_SERVER.read_text(encoding="utf-8"))
    fn = next(
        (n for n in tree.body
         if isinstance(n, ast.FunctionDef) and n.name == "_real_client_ip"),
        None,
    )
    assert fn is not None, "_real_client_ip not found in server.py"

    ns = {"Optional": Optional, "Request": object, "TRUSTED_PROXY_HOPS": hops}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), "<server>", "exec"), ns)
    return ns["_real_client_ip"]


class _Req:
    """Minimal stand-in for starlette's Request."""

    def __init__(self, xff=None, peer="10.0.0.1"):
        self.headers = {"x-forwarded-for": xff} if xff else {}
        self.client = type("C", (), {"host": peer})() if peer else None


def test_no_header_falls_back_to_peer():
    ip = _load_real_client_ip()
    assert ip(_Req(peer="203.0.113.9")) == "203.0.113.9"


def test_single_entry_is_the_client():
    """Cloud Run direct, client sent no header of its own."""
    ip = _load_real_client_ip()
    assert ip(_Req(xff="203.0.113.9", peer="169.254.1.1")) == "203.0.113.9"


def test_spoofed_prefix_is_ignored():
    """A client prepending fake IPs must not be able to pick its own bucket."""
    ip = _load_real_client_ip()
    assert ip(_Req(xff="1.2.3.4, 203.0.113.9")) == "203.0.113.9"
    assert ip(_Req(xff="evil, 8.8.8.8, 203.0.113.9")) == "203.0.113.9"


def test_two_hops_when_a_load_balancer_is_added():
    """With an HTTPS LB in front, the client is second from the right."""
    ip = _load_real_client_ip(hops=2)
    assert ip(_Req(xff="203.0.113.9, 130.211.0.1")) == "203.0.113.9"
    assert ip(_Req(xff="spoof, 203.0.113.9, 130.211.0.1")) == "203.0.113.9"


def test_hops_greater_than_header_length_does_not_crash():
    ip = _load_real_client_ip(hops=3)
    assert ip(_Req(xff="203.0.113.9")) == "203.0.113.9"


def test_whitespace_and_empty_entries_are_cleaned():
    ip = _load_real_client_ip()
    assert ip(_Req(xff="  ,  203.0.113.9  ,")) == "203.0.113.9"


def test_no_request_returns_empty():
    ip = _load_real_client_ip()
    assert ip(None) == ""


def test_distinct_clients_get_distinct_keys():
    """The whole point: two visitors must not share one rate-limit bucket."""
    ip = _load_real_client_ip()
    a = ip(_Req(xff="203.0.113.9", peer="169.254.1.1"))
    b = ip(_Req(xff="198.51.100.7", peer="169.254.1.1"))
    assert a != b


def test_audit_log_helper_delegates_to_the_same_logic():
    """_client_ip must not keep its own (spoofable) parts[0] implementation."""
    src = _SERVER.read_text(encoding="utf-8")
    tree = ast.parse(src)
    fn = next(
        (n for n in tree.body
         if isinstance(n, ast.FunctionDef) and n.name == "_client_ip"),
        None,
    )
    assert fn is not None
    body = ast.get_source_segment(src, fn)
    assert "_real_client_ip" in body, "_client_ip should delegate, not re-parse XFF"


# ============================================================
#  Qué rutas llevan límite, y cuáles NO — decisión, no descuido
# ============================================================
#
# `POST /auth/register` se quedó SIN límite el 2026-09-01, a petición del dueño.
# El cubo es por IP, y detrás de un NAT compartido tres personas agotaban la
# cuota de todas las demás: la cuarta recibía un 429 sin haber hecho nada raro, y
# eso son altas perdidas que no aparecen en ningún log del servidor.
#
# Lo fija un test porque es exactamente el tipo de cambio que alguien «arregla»
# de vuelta al ver un endpoint público sin limitar. Y fija también la otra mitad:
# los tres `3/hora` que SÍ se quedan, que protegen al dueño de una cuenta de que
# le inunden el buzón o le borren los datos. Quitar los cuatro de una pasada es
# el error probable, y aquí salta.

def _decoradores_de(nombre: str):
    """Los `@limiter.limit(...)` que lleva puestos una función de ruta."""
    tree = ast.parse(_SERVER.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == nombre:
            limites = []
            for deco in node.decorator_list:
                if not isinstance(deco, ast.Call):
                    continue
                f = deco.func
                if isinstance(f, ast.Attribute) and f.attr == "limit":
                    for a in deco.args:
                        if isinstance(a, ast.Constant):
                            limites.append(a.value)
            return limites
    return None


def test_el_alta_no_lleva_limite_de_tasa():
    """Detrás de un NAT compartido, 3/hora echaba a usuarios legítimos."""
    limites = _decoradores_de("register")
    assert limites is not None, "no se encontró el endpoint de registro"
    assert limites == [], (
        f"`/auth/register` ha vuelto a llevar límite ({limites}). Es por IP: "
        "detrás de un NAT compartido bloquea altas de gente distinta, y el 429 "
        "sólo lo ve el usuario. Si hace falta frenar abuso, va en la capa de "
        "delante (Cloud Run / WAF) o en SendGrid, no aquí."
    )


def test_los_limites_que_protegen_al_dueno_de_una_cuenta_siguen_puestos():
    """Quitar los cuatro `3/hora` de una pasada es el error probable."""
    for nombre in ("request_magic_link", "forgot_password", "delete_account"):
        limites = _decoradores_de(nombre)
        assert limites, (
            f"`{nombre}` se ha quedado sin límite. Ahí el 3/hora no protege al "
            "servidor: protege al dueño de la cuenta de que le inunden el buzón "
            "o le borren los datos. No es el mismo caso que el alta."
        )


def test_el_login_sigue_limitado():
    """Sin esto, probar contraseñas a ciegas sale gratis."""
    limites = _decoradores_de("login")
    assert limites, "`/auth/login` sin límite deja la fuerza bruta gratis"
