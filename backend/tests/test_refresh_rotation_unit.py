"""Recargar una pestaña no puede cerrar la sesión, y cerrar sesión sí.

`/auth/refresh` ROTA el token: revoca el que le llega y emite uno nuevo. El
frontend lo llama al arrancar, porque el token de acceso vive sólo en memoria.
Con la revocación instantánea, un segundo canje del mismo token —una pestaña que
arranca detrás, una petición reintentada, una respuesta cuyo `Set-Cookie` no
llegó a guardarse— recibía 401, y el store trataba el 401 como «el servidor dice
que esta sesión no vale» y la cerraba. Recargar te echaba.

La ventana `REFRESH_ROTATION_GRACE_SECONDS` distingue las dos razones por las
que un token está revocado. Estas pruebas fijan que siga distinguiéndolas: si el
motivo dejara de mirarse, un token revocado por LOGOUT volvería a valer.

Se leen con `ast`, como el resto de pruebas de seguridad offline, para no
necesitar fastapi ni asyncpg.
"""
import ast
from pathlib import Path

_SERVER = Path(__file__).resolve().parent.parent / "server.py"
_SRC = _SERVER.read_text(encoding="utf-8")


def _fuente(nombre):
    tree = ast.parse(_SRC)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == nombre:
            return ast.get_source_segment(_SRC, node)
    return None


def test_la_rotacion_se_marca_como_rotacion():
    """Sin el motivo no hay forma de separar una rotación de un cierre."""
    src = _fuente("refresh_access_token")
    assert src is not None
    assert 'motivo="rotation"' in src, (
        "la rotación tiene que quedar marcada como tal, o la ventana de "
        "tolerancia no puede distinguirla de un logout"
    )


def test_la_ventana_solo_perdona_rotaciones():
    """Un token revocado al cerrar sesión no puede colarse por la ventana."""
    src = _fuente("_rotado_hace_nada")
    assert src is not None, "falta el ayudante de la ventana"
    assert '!= "rotation"' in src or '== "rotation"' in src, (
        "la ventana tiene que mirar el motivo"
    )
    # Cualquier duda cae del lado seguro.
    assert src.count("return False") >= 4, (
        "sin jti, sin registro, con otro motivo o con fecha ilegible: False"
    )


def test_la_ventana_se_puede_cerrar_del_todo():
    src = _fuente("_rotado_hace_nada")
    assert "REFRESH_ROTATION_GRACE_SECONDS <= 0" in src
    idx_guarda = src.find("REFRESH_ROTATION_GRACE_SECONDS <= 0")
    idx_consulta = src.find("find_one")
    assert -1 < idx_guarda < idx_consulta, "a 0 no se consulta ni la base"


def test_el_401_sigue_ahi_para_lo_que_no_es_una_rotacion():
    src = _fuente("refresh_access_token")
    assert "_is_token_revoked(payload) and not await _rotado_hace_nada(payload)" in src, (
        "la excepción tiene que ir DENTRO de la guarda de revocación, no sustituirla"
    )
    idx = src.find("_rotado_hace_nada")
    assert "401" in src[idx:idx + 300]


def test_cerrar_sesion_revoca_tambien_el_refresh():
    """Borrar la cookie limpia UN navegador; no invalida el token.

    El de acceso caduca en una hora, el de refresco dura siete días y es el que
    abre la puerta: era justo el que sobrevivía al botón de cerrar sesión.
    """
    src = _fuente("logout")
    assert src is not None, "logout no encontrado"
    assert 'request.cookies.get("refresh_token")' in src, (
        "el refresh sólo viaja por cookie: si no se lee de ahí, no se revoca"
    )
    assert src.count('motivo="logout"') >= 2, (
        "los dos tokens, acceso y refresco, tienen que revocarse como logout"
    )
    assert '"rotation"' not in src, (
        "revocar el cierre como rotación lo metería en la ventana de tolerancia: "
        "la sesión cerrada se podría resucitar durante 30 segundos"
    )


def test_el_logout_no_se_cae_con_una_cookie_basura():
    """Una cookie caducada o falsa no puede tumbar el cierre de sesión."""
    src = _fuente("logout")
    assert "jwt.InvalidTokenError" in src


def test_el_store_solo_cierra_la_sesion_con_un_401():
    """Un 429 o un arranque en frío no son «tu sesión ha caducado»."""
    store = (Path(__file__).resolve().parents[2]
             / "frontend/src/lib/store.js").read_text(encoding="utf-8")
    inicio = store.find("silentRefresh:")
    fin = store.find("refreshUser:", inicio)
    assert -1 < inicio < fin
    cuerpo = store[inicio:fin]
    assert "res.status === 401" in cuerpo, (
        "la sesión sólo se cierra cuando el servidor dice explícitamente que no vale"
    )
    # Y el `!res.ok` a secas ya no puede ser lo que la cierre.
    idx_ok = cuerpo.find("if (!res.ok)")
    assert idx_ok > -1
    tras = cuerpo[idx_ok:idx_ok + 260]
    assert "isAuthenticated: false" not in tras, (
        "cualquier respuesta no-OK volvía a cerrar la sesión: un 502 del arranque "
        "en frío de Cloud Run echaba a quien recargaba la pestaña"
    )
    assert "intento" in cuerpo, "el refresco tiene que reintentar antes de rendirse"
