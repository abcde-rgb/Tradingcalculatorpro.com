"""
El export del RGPD entregaba la semilla del segundo factor.

`/auth/my-data` construía el perfil con una lista NEGRA de una sola clave
(`if k not in ("password",)`), así que cada campo nuevo del documento de usuario
se exportaba solo. Salían `totp_secret` y `totp_pending_secret`: la credencial
del 2FA, en un JSON que acaba en la carpeta de Descargas y que sobrevive al
cambio de contraseña y a `_revoke_all_tokens_for_user`.

Contradecía además la política que el propio módulo tiene escrita para las
colecciones: los artefactos de seguridad se borran con la cuenta y no se
exportan nunca.

El arreglo es la lista BLANCA `_EXPORTABLE_PROFILE_FIELDS`. Estos tests fijan
las dos direcciones: que los secretos no salen, y que el campo útil sí sale
(un export vacío tampoco cumple el Art. 20).
"""
import os
import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402
from server import _EXPORTABLE_PROFILE_FIELDS  # noqa: E402

RAIZ = pathlib.Path(__file__).resolve().parent.parent


# Un documento de usuario con todo lo que la aplicación llega a guardar,
# incluido lo que NO debe salir.
USUARIO = {
    "id": "u-1", "email": "a@b.c", "name": "Ana", "picture": None,
    "created_at": "2026-01-01T00:00:00+00:00",
    "auth_provider": "password", "email_verified": True,
    "subscription_plan": "annual", "subscription_end": "2027-01-01",
    "is_premium": True, "is_admin": False,
    "referral_code": "ABC123", "referral_wallet": 12.0,
    "totp_enabled": True,
    # --- nada de lo que sigue puede salir ---
    "password": "$2b$12$hash",
    "totp_secret": "JBSWY3DPEHPK3PXP",
    "totp_pending_secret": "PENDINGSEED1234",
    "stripe_customer_id": "cus_123",
    "passkey_challenge": "reto-en-curso",
    "reset_token_hash": "deadbeef",
}

SECRETOS = (
    "password", "totp_secret", "totp_pending_secret",
    "passkey_challenge", "reset_token_hash",
)


def _perfil(doc):
    """Reproduce exactamente la construcción del perfil en export_my_data."""
    return {k: v for k, v in doc.items() if k in _EXPORTABLE_PROFILE_FIELDS}


@pytest.mark.parametrize("clave", SECRETOS)
def test_ningun_secreto_sale_en_el_perfil(clave):
    assert clave not in _perfil(USUARIO)


def test_la_semilla_totp_no_sale_ni_en_pendiente_ni_en_activa():
    """El fallo concreto que se cerró, nombrado para que no vuelva en silencio."""
    perfil = _perfil(USUARIO)
    valores = {str(v) for v in perfil.values()}
    assert "JBSWY3DPEHPK3PXP" not in valores
    assert "PENDINGSEED1234" not in valores


def test_el_export_sigue_siendo_util():
    """Una lista blanca demasiado corta incumple el Art. 20 por el otro lado."""
    perfil = _perfil(USUARIO)
    for imprescindible in ("id", "email", "name", "created_at",
                           "subscription_plan", "is_premium"):
        assert imprescindible in perfil


def test_saber_que_tienes_2fa_si_es_un_dato_tuyo():
    assert _perfil(USUARIO)["totp_enabled"] is True


def test_es_lista_blanca_y_no_lista_negra():
    """Un campo NUEVO no debe exportarse por el hecho de existir.

    Es la propiedad que faltaba: con la lista negra, cualquier campo añadido al
    usuario salía por defecto, y así salió la semilla del TOTP.
    """
    con_campo_nuevo = dict(USUARIO, secreto_del_futuro="no-deberia-salir")
    assert "secreto_del_futuro" not in _perfil(con_campo_nuevo)


def test_el_codigo_usa_la_lista_blanca_y_no_el_filtro_viejo():
    """Guarda de regresión sobre la fuente: el filtro viejo no puede volver."""
    src = (RAIZ / "server.py").read_text(encoding="utf-8")
    # Sólo líneas de CÓDIGO: el porqué del arreglo cita el filtro viejo en un
    # comentario, y un grep a secas se dispararía con su propia explicación.
    codigo = [
        l for l in src.splitlines()
        if l.strip() and not l.lstrip().startswith("#")
    ]
    assert not [l for l in codigo if 'if k not in ("password",)' in l], (
        "vuelve a filtrar el perfil con una lista negra de una sola clave"
    )
    assert any("k in _EXPORTABLE_PROFILE_FIELDS" in l for l in codigo)


# ---------------------------------------------------------------------------
# El segundo factor, en TODAS las vías que emiten sesión
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("funcion", [
    "async def login(",
    "async def verify_magic_link(",
    "async def google_auth(",
])
def test_toda_via_de_sesion_comprueba_el_totp(funcion):
    """El 2FA se exigía sólo en /auth/login.

    Con TOTP activo, pedir un enlace mágico a tu propio correo —o entrar con
    Google— emitía sesión completa sin segundo factor, que es exactamente el
    escenario contra el que el usuario activó el 2FA.
    """
    src = (RAIZ / "server.py").read_text(encoding="utf-8")
    cuerpo = src.split(funcion)[1].split("\n@api_router")[0]
    assert 'user.get("totp_enabled")' in cuerpo, (
        f"{funcion.strip('async def (')} emite sesión sin mirar el segundo factor"
    )
    assert "_create_2fa_pending_token" in cuerpo
