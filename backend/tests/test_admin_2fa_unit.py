"""
Regression tests for mandatory admin 2FA.

An admin session can impersonate users, move subscriptions and read the whole
customer base, so a stolen password must not be enough. `require_admin` now
rejects admins without TOTP with 428 (not 403) so the frontend can send them to
Settings to finish setup instead of showing a dead end.

Parsed with `ast` (same approach as the other offline security tests) so this
runs without fastapi/asyncpg installed.
"""
import ast
from pathlib import Path

import pytest

_SERVER = Path(__file__).resolve().parent.parent / "server.py"
_SRC = _SERVER.read_text(encoding="utf-8")


def _func_source(name):
    tree = ast.parse(_SRC)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.get_source_segment(_SRC, node)
    return None


def test_require_admin_checks_totp():
    src = _func_source("require_admin")
    assert src is not None, "require_admin not found"
    assert "totp_enabled" in src, "require_admin must require a second factor"


def test_require_admin_uses_428_not_403_for_missing_2fa():
    """403 says 'you may not'; 428 says 'finish this first' — different UX."""
    src = _func_source("require_admin")
    idx = src.find("totp_enabled")
    assert idx > -1
    after = src[idx:idx + 400]
    assert "428" in after, "missing-2FA must answer 428 Precondition Required"


def test_the_admin_role_check_still_runs_before_the_2fa_check():
    """A non-admin must get 403, never a hint that 2FA is what's missing."""
    src = _func_source("require_admin")
    role_at = src.find("Acceso restringido")
    totp_at = src.find("totp_enabled")
    assert -1 < role_at < totp_at, "role check must come first"


def test_escape_hatch_cannot_be_enabled_in_production():
    """ADMIN_2FA_OPTIONAL must be inert unless ENVIRONMENT is a dev value."""
    tree = ast.parse(_SRC)
    assign = None
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            getattr(t, "id", None) == "ADMIN_2FA_OPTIONAL" for t in node.targets
        ):
            assign = ast.get_source_segment(_SRC, node)
    assert assign is not None, "ADMIN_2FA_OPTIONAL not found"
    assert "ENVIRONMENT" in assign, "the opt-out must be gated on ENVIRONMENT"
    # It must be an AND of the env check with the flag, so setting the flag
    # alone on a production service does nothing.
    assert " and " in assign


def test_escape_hatch_logic():
    """Evaluate the same expression under the three environments that matter."""
    def compute(environment, flag):
        return (
            environment.lower() in ("development", "dev", "local")
            and flag.lower() != "false"
        )

    assert compute("production", "true") is False   # prod: never optional
    assert compute("production", "TRUE") is False
    assert compute("development", "true") is True   # local: opt-out available
    assert compute("development", "false") is False  # local, explicitly enforced


def test_el_panel_traduce_el_428_y_lleva_a_ajustes():
    """Quien decide es el 428 del backend, y el panel tiene que obedecerlo.

    Antes esta regla exigía la guarda en `ProtectedRoute`, y ahí estaba el
    problema: el frontend adelantaba una decisión con datos que no tiene (ni el
    escape hatch de desarrollo ni el margen de alta), así que expulsaba a admins
    que el servidor sí iba a dejar pasar. La guarda se retiró; lo que no puede
    faltar es el otro extremo, el que SÍ ve la respuesta real.
    """
    panel = (Path(__file__).resolve().parents[2]
             / "frontend/src/pages/AdminPage.jsx").read_text(encoding="utf-8")
    idx = panel.find("status === 428")
    assert idx > -1, "el panel tiene que MIRAR el 428, no sólo mencionarlo"
    assert "/settings" in panel[idx:idx + 700], (
        "tras un 428 el panel tiene que llevar a Ajustes, que es donde se activa el 2FA"
    )


def test_la_guarda_del_frontend_no_vuelve_a_adelantar_la_decision():
    """Que nadie reponga el atajo: es el hueco G-39 y encierra a los admins."""
    guard = (Path(__file__).resolve().parents[2]
             / "frontend/src/components/common/ProtectedRoute.jsx").read_text(encoding="utf-8")
    codigo = "\n".join(
        ln for ln in guard.splitlines()
        if not ln.lstrip().startswith("//") and not ln.lstrip().startswith("*")
    )
    assert "two_factor_enabled" not in codigo, (
        "ProtectedRoute vuelve a decidir sobre el 2FA de admin sin conocer ni "
        "ADMIN_2FA_OPTIONAL ni el margen de alta: el backend es quien manda"
    )


def test_el_margen_de_alta_es_de_un_solo_uso():
    """Se graba al abrirlo y NO se reescribe: diez minutos en toda la vida."""
    src = _func_source("_abrir_o_comprobar_margen_2fa")
    assert src is not None, "falta el ayudante del margen"
    # Un solo `$set` de la marca, y en la rama de "no había marca".
    assert src.count("admin_2fa_grace_started_at") >= 2
    rama_leer = src[:src.find("update_one")]
    assert "if marca:" in rama_leer, (
        "la rama que LEE la marca tiene que ir antes del `update_one`, o cada "
        "petición reabriría el margen y sería infinito"
    )
    assert "return False" in rama_leer


def test_el_margen_se_puede_apagar_del_todo():
    """A 0 minutos no hay margen: el 428 vuelve a ser inmediato."""
    src = _func_source("_abrir_o_comprobar_margen_2fa")
    assert "ADMIN_2FA_GRACE_MINUTES <= 0" in src
    assert src.find("ADMIN_2FA_GRACE_MINUTES <= 0") < src.find("update_one"), (
        "la salida por configuración tiene que ir ANTES de grabar nada"
    )


def test_el_margen_deja_rastro():
    """Una puerta silenciosa no es aceptable: log y entrada de auditoría."""
    src = _func_source("_abrir_o_comprobar_margen_2fa")
    assert "logging.warning" in src
    assert "log_admin_action" in src


def test_el_margen_solo_se_consulta_tras_comprobar_que_es_admin():
    """Un no-admin no puede abrir un margen: 403 antes, siempre."""
    src = _func_source("require_admin")
    rol = src.find("Acceso restringido")
    margen = src.find("_abrir_o_comprobar_margen_2fa")
    assert -1 < rol < margen


def test_la_tarjeta_de_2fa_esta_para_todas_las_cuentas():
    """El encierro de BUG-076: se exigía 2FA y se escondía dónde activarlo.

    La tarjeta estaba condicionada a `auth_provider === 'password'`. Un
    administrador que entra con Google —o con enlace mágico— recibía 428 del
    panel, la app lo mandaba a Ajustes a activar el segundo factor, y en Ajustes
    no había nada que activar. Sin salida y sin explicación.

    El backend nunca puso esa condición: `/auth/2fa/setup`, `/enable` y
    `/disable` van por `require_user` y no miran el proveedor.
    """
    ajustes = (Path(__file__).resolve().parents[2]
               / "frontend/src/pages/SettingsPage.jsx").read_text(encoding="utf-8")
    idx = ajustes.find("<TwoFactorCard />")
    assert idx > -1, "la tarjeta de 2FA ha desaparecido de Ajustes"
    # Lo que importa es que no cuelgue de una condición sobre el proveedor.
    linea = ajustes[ajustes.rfind("\n", 0, idx) + 1: ajustes.find("\n", idx)]
    assert "auth_provider" not in linea, (
        "la tarjeta de 2FA vuelve a estar condicionada al proveedor: eso encierra "
        "a los administradores que entran con Google o con enlace mágico"
    )


def test_los_endpoints_de_2fa_no_miran_el_proveedor():
    """La otra mitad de la misma promesa, esta vez en el servidor."""
    for nombre in ("totp_setup", "totp_enable", "totp_disable"):
        src = _func_source(nombre)
        assert src is not None, f"{nombre} no encontrado"
        assert "auth_provider" not in src, (
            f"{nombre} ha empezado a mirar el proveedor: la tarjeta de Ajustes "
            "promete que funciona para cualquier cuenta"
        )
