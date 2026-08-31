"""
La autorización de este backend se apoya en la cadena del email.

`_ADMIN_EMAILS` y `_FREE_ACCESS_EMAILS` se construyen en minúsculas y los
guardias comparan `user["email"].lower()`. Mientras el registro guardase el
email crudo y comprobase duplicados con igualdad exacta, `Owner@Example.com`
creaba una segunda cuenta que pasaba `require_admin`.

Estos tests fijan las dos mitades del arreglo:

  1. `normalize_email` es la forma canónica, y lo es de verdad.
  2. NINGÚN punto de entrada busca o escribe un email sin pasar por ella.

El segundo es un test sobre el CÓDIGO FUENTE a propósito. La vulnerabilidad no
estaba en una función que devolviera mal: estaba en un sitio que no llamaba a
la función. Un test de comportamiento sobre `normalize_email` habría pasado en
verde durante toda la vida del fallo.
"""
import os
import pathlib
import sys

import re

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402
from server import normalize_email  # noqa: E402

RAIZ = pathlib.Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------
# 1 · La forma canónica
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("entrada,esperado", [
    ("Owner@Example.com", "owner@example.com"),
    ("  spaced@example.com  ", "spaced@example.com"),
    ("ALL@CAPS.COM", "all@caps.com"),
    ("already@fine.com", "already@fine.com"),
    ("", ""),
    (None, ""),
])
def test_normalize_email(entrada, esperado):
    assert normalize_email(entrada) == esperado


def test_normalize_email_es_idempotente():
    for e in ("Owner@Example.com", " X@Y.Z ", "a@b.c"):
        una = normalize_email(e)
        assert normalize_email(una) == una


def test_las_variantes_de_caja_colapsan_en_la_misma_clave():
    """El corazón del fallo: estas cuatro TIENEN que ser la misma cuenta."""
    variantes = [
        "owner@example.com", "Owner@Example.com",
        "OWNER@EXAMPLE.COM", "  oWnEr@ExAmPlE.cOm  ",
    ]
    assert len({normalize_email(v) for v in variantes}) == 1


# ---------------------------------------------------------------------------
# 2 · Ningún punto de entrada se salta la normalización
# ---------------------------------------------------------------------------

def _fuente(nombre: str) -> str:
    return (RAIZ / nombre).read_text(encoding="utf-8")


# Un lookup por email es canónico si el valor pasa por normalize_email, si ya
# viene de una variable normalizada aguas arriba, o si es la constante de demo.
_LOOKUP = re.compile(r'find_one\(\{"email":\s*([^,}]+)')
_ACEPTADOS = {
    "normalize_email", "DEMO_EMAIL", "email", "email_lc", "new_email",
}


@pytest.mark.parametrize("modulo", ["server.py", "referrals.py", "admin_routes.py"])
def test_ningun_lookup_por_email_usa_el_valor_crudo(modulo):
    crudos = []
    for m in _LOOKUP.finditer(_fuente(modulo)):
        expr = m.group(1).strip()
        if not any(tok in expr for tok in _ACEPTADOS):
            crudos.append(expr)
    assert not crudos, (
        f"{modulo}: estos lookups usan el email sin canonizar y reabren la "
        f"escalada de privilegios: {crudos}"
    )


def test_register_normaliza_antes_de_comprobar_duplicados():
    """El orden importa: canonizar DESPUÉS del find_one no arregla nada."""
    src = _fuente("server.py")
    cuerpo = src.split("async def register(")[1].split("\nasync def ")[0]
    pos_norm = cuerpo.find("normalize_email(")
    pos_lookup = cuerpo.find("find_one(")
    assert pos_norm != -1, "register ya no normaliza el email"
    assert pos_norm < pos_lookup, (
        "register comprueba duplicados antes de canonizar: "
        "Owner@Example.com volvería a colar como cuenta nueva"
    )


def test_register_guarda_el_email_canonico():
    src = _fuente("server.py")
    cuerpo = src.split("async def register(")[1].split("\nasync def ")[0]
    assert '"email": user_data.email' not in cuerpo, (
        "register vuelve a guardar el email crudo"
    )


# ---------------------------------------------------------------------------
# 3 · La cortesía no se reclama registrándose
# ---------------------------------------------------------------------------

def test_free_access_emails_no_lleva_ninguna_direccion_a_fuego():
    """Había `tradingcalculatorpro@gmail.com` y era premium gratis para quien lo
    registrase primero. Una cortesía se concede sobre un user_id existente."""
    src = _fuente("server.py")
    bloque = src.split("_FREE_ACCESS_EMAILS")[1].split("\n\n")[0]
    assert "@" not in bloque.split("os.environ")[0] + bloque.split(")")[-1], (
        "hay una dirección literal en _FREE_ACCESS_EMAILS"
    )


def test_free_access_emails_vacio_sin_variable_de_entorno(monkeypatch):
    """Sin FREE_ACCESS_EMAILS no hay ninguna cuenta con premium regalado."""
    import importlib
    monkeypatch.delenv("FREE_ACCESS_EMAILS", raising=False)
    recargado = importlib.reload(server)
    assert recargado._FREE_ACCESS_EMAILS == set()
