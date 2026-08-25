"""Regresión de BUG-064: la revocación de sesión mataba el token recién emitido.

`change-password` y `reset-password` escriben `revoked_after = now().isoformat()`
con precisión de MICROSEGUNDOS, y `_is_user_session_revoked` comparaba
`iat_dt < revoked_after`. Pero el `iat` de un JWT es un NumericDate en SEGUNDOS
enteros: al codificar se pierde la fracción. Un token emitido en el MISMO segundo
que el cambio de contraseña (que es justo lo que hace un cliente que "vuelve a
iniciar sesión" al instante, como le pide la respuesta) tenía iat = X.000000, que
es < X.234567 → sesión muerta. El E2E `api/autorizacion.py` lo destapó: su propia
guarda "la sesión nueva sirve para releer el usuario" salía en 401.

El arreglo compara a granularidad de segundo: un token del segundo X sobrevive a
una revocación sellada en el segundo X; los de segundos anteriores siguen muriendo.

Corre offline (sufijo _unit.py): importa server en modo dev (sin red ni BD real)
y le pone un doble de `user_revocations` en memoria.
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server


class _RevColl:
    """Doble mínimo de db.user_revocations: sólo el find_one que usa la función."""
    def __init__(self, revoked_after):
        self._revoked_after = revoked_after

    async def find_one(self, flt, proj=None):
        if self._revoked_after is None:
            return None
        return {"revoked_after": self._revoked_after}


class _DB:
    def __init__(self, revoked_after):
        self.user_revocations = _RevColl(revoked_after)


def _revoked(iat_dt, revoked_after):
    """Ejecuta la función REAL con el doble de BD inyectado."""
    original = server.db
    server.db = _DB(revoked_after)
    try:
        # iat como lo entrega PyJWT: segundos enteros (NumericDate).
        payload = {"user_id": "u1", "iat": int(iat_dt.timestamp())}
        return asyncio.run(server._is_user_session_revoked(payload))
    finally:
        server.db = original


def test_token_del_mismo_segundo_sobrevive():
    # El cambio de contraseña ocurre a X.234567; el re-login mina un token en X.
    cambio = datetime(2026, 8, 22, 18, 53, 35, 234567, tzinfo=timezone.utc)
    login = cambio.replace(microsecond=0)                 # iat floored a X.000000
    # Antes del arreglo esto era True (sesión muerta). Ahora debe sobrevivir.
    assert _revoked(login, cambio.isoformat()) is False


def test_token_de_segundo_anterior_muere():
    # La propiedad de seguridad se mantiene: un token de ANTES del cambio muere.
    cambio = datetime(2026, 8, 22, 18, 53, 35, 234567, tzinfo=timezone.utc)
    viejo = cambio - timedelta(seconds=5)
    assert _revoked(viejo.replace(microsecond=0), cambio.isoformat()) is True


def test_revoked_after_como_datetime_tambien():
    # El campo puede llegar como datetime (no sólo str). Mismo invariante.
    cambio = datetime(2026, 8, 22, 18, 53, 35, 900000, tzinfo=timezone.utc)
    login = cambio.replace(microsecond=0)
    assert _revoked(login, cambio) is False
    viejo = (cambio - timedelta(seconds=1)).replace(microsecond=0)
    assert _revoked(viejo, cambio) is True


def test_sin_revocacion_no_revoca():
    login = datetime(2026, 8, 22, 18, 53, 35, tzinfo=timezone.utc)
    assert _revoked(login, None) is False
