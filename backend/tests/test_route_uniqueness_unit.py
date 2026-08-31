"""
Regression test: no two REGISTERED routes may share method + path.

Why this matters here: routes live in five modules (server.py, admin_routes.py,
missing_apis.py, affiliate_program.py, referrals.py) and FastAPI serves the
FIRST match. A duplicate is silent dead code — and the danger is not the wasted
lines, it is someone fixing a bug in the copy that never runs and believing it
is fixed.

That is exactly what had happened with /auth/forgot-password and
/auth/reset-password: declared in both server.py and missing_apis.py, writing to
two DIFFERENT collections (`password_resets` vs `password_reset_tokens`), with
only the server.py pair reachable — and only that pair rate-limited.

This inspects the ACTUAL registered routes rather than grepping decorators,
because the same decorator path can resolve to different URLs once router
prefixes are applied (`/plans` in admin_routes really serves `/api/admin/plans`).
A naive source scan reports those as duplicates when they are not.
"""
import os
from collections import defaultdict
from pathlib import Path

import pytest

# Dev mode before importing server: auto-generates JWT_SECRET, no network/DB.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402
from ayuda_rutas import caminar_rutas, caminos  # noqa: E402

BACKEND = Path(__file__).resolve().parent.parent


def registered():
    """(method, path) -> [modules that registered it].

    ⚠️ Recorría `server.app.routes` directamente y eso dejó de valer: desde
    FastAPI 0.141, `include_router` NO aplana los routers en la app —deja un
    `_IncludedRouter`—, así que `len(app.routes)` cae de 202 a 5.

    El peligro no era que fallara, sino que **pasara**: con 5 rutas, «no hay dos
    iguales» es cierto por vacío y el guardián de G-04 se convertía en un
    adorno. Lo salvó `test_some_routes_were_actually_found`, que existe
    exactamente para eso — no lo quites.

    `ayuda_rutas.caminar_rutas` baja por los routers anidados y acumula los
    prefijos, y da el MISMO conjunto de 206 pares en 0.115 y en 0.141
    (comprobado comparando los dos conjuntos, no los dos conteos: cuadrar el
    número sin cuadrar las rutas era el error fácil aquí, porque en 0.141 las
    rutas se guardan relativas y `/api/admin/plans` se lee `/plans`).
    """
    found = defaultdict(list)
    for path, route in caminar_rutas(server.app):
        methods = getattr(route, "methods", None)
        if not methods:
            continue
        module = getattr(getattr(route, "endpoint", None), "__module__", "?")
        for method in methods:
            found[(method, path)].append(module)
    return found


def test_no_duplicate_method_and_path():
    dupes = {k: v for k, v in registered().items() if len(v) > 1}
    assert not dupes, (
        "Rutas registradas más de una vez (solo la primera se ejecuta):\n"
        + "\n".join(f"  {m} {p}  →  {', '.join(mods)}" for (m, p), mods in dupes.items())
    )


def test_the_forgot_password_duplicate_stays_removed():
    """Specific guard for the pair this test was written after."""
    missing = (BACKEND / "missing_apis.py").read_text(encoding="utf-8")
    assert '@router.post("/auth/forgot-password")' not in missing
    assert '@router.post("/auth/reset-password")' not in missing


def test_password_reset_endpoints_still_exist():
    """Removing the dead copy must not have removed the working one."""
    paths = caminos(server.app)
    assert "/api/auth/forgot-password" in paths
    assert "/api/auth/reset-password" in paths


def test_the_surviving_password_reset_is_rate_limited():
    """The reachable one must keep the brute-force limit the dead one lacked."""
    src = (BACKEND / "server.py").read_text(encoding="utf-8")
    i = src.index('@api_router.post("/auth/forgot-password")')
    assert "@limiter.limit" in src[i:i + 200]


def test_some_routes_were_actually_found():
    """Guard the guard: an empty route table would make this vacuously pass."""
    assert len(registered()) > 100
