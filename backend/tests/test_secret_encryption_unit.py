"""
Sin `SECRET_ENCRYPTION_KEY`, `_encrypt_setting` guardaba las claves de Stripe,
SendGrid, PayPal y Google en texto plano en Postgres — **en silencio**: ni un
log, ni una señal en el panel. Un admin podía teclear la clave secreta de
Stripe creyendo que quedaba cifrada y no había forma de saberlo.

Estos tests fijan que `cifrado_activo()` refleja la realidad (con clave válida,
sin ella, y con una clave rota) y que `GET /admin/settings` la expone como
`encryption_active`, que es lo que el panel pinta.
"""
import os
import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402

VALID_KEY = "orvcl6wN-BY22a2JpSAE5a_kjEmZB3uExeDagFo2C7w="  # Fernet de 32 bytes en base64, sólo para tests


@pytest.fixture(autouse=True)
def _limpia_env(monkeypatch):
    monkeypatch.delenv("SECRET_ENCRYPTION_KEY", raising=False)
    yield


def test_cifrado_inactivo_sin_variable():
    assert server.cifrado_activo() is False


def test_cifrado_activo_con_clave_valida(monkeypatch):
    monkeypatch.setenv("SECRET_ENCRYPTION_KEY", VALID_KEY)
    assert server.cifrado_activo() is True


def test_cifrado_inactivo_con_clave_invalida(monkeypatch):
    """Una clave con la forma equivocada no debe hacer creer que cifra."""
    monkeypatch.setenv("SECRET_ENCRYPTION_KEY", "esto-no-es-una-clave-fernet")
    assert server.cifrado_activo() is False


def test_sin_clave_encrypt_devuelve_el_valor_tal_cual():
    """Documenta el fallback actual: funcional, pero NO es un fallo silencioso
    nuevo — lo nuevo es que ahora se puede saber que está pasando."""
    assert server._encrypt_setting("sk_live_ejemplo") == "sk_live_ejemplo"


def test_con_clave_encrypt_decrypt_hace_ida_y_vuelta(monkeypatch):
    monkeypatch.setenv("SECRET_ENCRYPTION_KEY", VALID_KEY)
    cifrado = server._encrypt_setting("sk_live_ejemplo")
    assert cifrado != "sk_live_ejemplo"
    assert cifrado.startswith("fernet:")
    assert server._decrypt_setting(cifrado) == "sk_live_ejemplo"


def test_decrypt_no_toca_un_valor_sin_prefijo(monkeypatch):
    """Idempotente a propósito: un valor guardado antes de tener clave (texto
    plano) no debe romperse al leer una vez que la clave ya está puesta."""
    monkeypatch.setenv("SECRET_ENCRYPTION_KEY", VALID_KEY)
    assert server._decrypt_setting("valor-guardado-en-claro") == "valor-guardado-en-claro"


def test_get_admin_settings_expone_encryption_active():
    """`admin_get_settings` es la respuesta que consume el panel: si no lleva
    `encryption_active`, el aviso del frontend no tiene qué leer."""
    src = pathlib.Path(server.__file__).read_text(encoding="utf-8")
    cuerpo = src.split("async def admin_get_settings(")[1].split("\n@api_router.")[0]
    assert '"encryption_active"' in cuerpo, (
        "admin_get_settings ya no expone encryption_active: el panel se quedaría sin la señal"
    )
    assert "cifrado_activo()" in cuerpo, "encryption_active no viene de cifrado_activo()"
