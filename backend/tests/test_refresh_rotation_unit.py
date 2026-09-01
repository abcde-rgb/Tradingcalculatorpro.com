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
import re
import textwrap
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


# ─────────────────────────────────────────────────────────────────────────────
# La cookie del refresco tiene que LLEGAR a quien la revoca.
#
# El test de arriba (`test_cerrar_sesion_revoca_tambien_el_refresh`) lee el
# código fuente: encuentra `request.cookies.get("refresh_token")`, cuenta los dos
# `motivo="logout"` y da el visto bueno. Todo eso era cierto y la revocación NO
# ocurría nunca, porque el navegador no entregaba la cookie: se emite con
# `path=/api/auth/refresh` y se pedía en `/api/auth/logout`, que no cuelga de
# ella. Leer el cuerpo de la función no puede ver eso; hay que comprobar la regla
# de rutas del navegador.
# ─────────────────────────────────────────────────────────────────────────────

def _casa_la_ruta(ruta_peticion: str, ruta_cookie: str) -> bool:
    """RFC 6265 §5.1.4 — ¿manda el navegador esta cookie a esta petición?"""
    if ruta_cookie == ruta_peticion:
        return True
    if not ruta_peticion.startswith(ruta_cookie):
        return False
    return ruta_cookie.endswith("/") or ruta_peticion[len(ruta_cookie)] == "/"


def test_la_regla_de_rutas_de_cookie_es_la_del_navegador():
    """Primero, que el metro mida: sin esto lo de abajo no prueba nada."""
    assert _casa_la_ruta("/api/auth/refresh", "/api/auth/refresh")
    assert _casa_la_ruta("/api/auth/refresh/logout", "/api/auth/refresh")
    assert _casa_la_ruta("/api/auth/logout", "/api")
    # El caso que se coló en producción.
    assert not _casa_la_ruta("/api/auth/logout", "/api/auth/refresh")
    # Prefijo de texto que NO es prefijo de ruta.
    assert not _casa_la_ruta("/api/auth/refreshing", "/api/auth/refresh")


def _ruta_cookie_refresh() -> str:
    """El `path=` con el que se emite la cookie del refresco."""
    src = _fuente("_set_auth_cookies")
    assert src is not None, "_set_auth_cookies no encontrado"
    arbol = ast.parse(textwrap.dedent(src))
    for llamada in ast.walk(arbol):
        if not isinstance(llamada, ast.Call):
            continue
        claves = {kw.arg: kw.value for kw in llamada.keywords}
        clave = claves.get("key")
        if isinstance(clave, ast.Constant) and clave.value == "refresh_token":
            ruta = claves.get("path")
            assert isinstance(ruta, ast.Constant), "el path del refresh no es literal"
            return ruta.value
    raise AssertionError("no se encontró el set_cookie del refresh_token")


def _rutas_de(nombre_funcion: str) -> list:
    """Las rutas con las que está registrada una función de la API."""
    arbol = ast.parse(_SRC)
    for nodo in ast.walk(arbol):
        if not isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if nodo.name != nombre_funcion:
            continue
        rutas = []
        for dec in nodo.decorator_list:
            if isinstance(dec, ast.Call) and dec.args and isinstance(dec.args[0], ast.Constant):
                rutas.append(dec.args[0].value)
        return rutas
    return []


def test_el_cierre_de_sesion_recibe_de_verdad_la_cookie_del_refresco():
    """Sin una ruta que la reciba, «cerrar sesión» no revoca nada."""
    ruta_cookie = _ruta_cookie_refresh()
    rutas = [f"/api{r}" for r in _rutas_de("logout")]
    assert rutas, "logout no está registrado en ninguna ruta"
    alcanzables = [r for r in rutas if _casa_la_ruta(r, ruta_cookie)]
    assert alcanzables, (
        f"la cookie del refresco vive en {ruta_cookie!r} y ninguna ruta de cierre "
        f"de sesión {rutas} cuelga de ahí: el navegador no la manda, así que el "
        f"token de refresco sobrevive al botón de cerrar sesión durante 7 días"
    )


def test_el_frontend_cierra_sesion_por_la_ruta_que_si_recibe_la_cookie():
    """Tener la ruta buena no sirve si el navegador llama a la otra."""
    store = (Path(__file__).resolve().parents[2]
             / "frontend/src/lib/store.js").read_text(encoding="utf-8")
    inicio = store.find("logout: async ()")
    fin = store.find("silentRefresh:", inicio)
    assert -1 < inicio < fin, "no se encontró el logout del store"
    cuerpo = store[inicio:fin]
    llamadas = re.findall(r"\$\{API\}(/auth/[A-Za-z0-9/_-]+)", cuerpo)
    assert llamadas, "el logout del store no llama a ninguna ruta de auth"
    ruta_cookie = _ruta_cookie_refresh()
    buenas = [r for r in llamadas if _casa_la_ruta(f"/api{r}", ruta_cookie)]
    assert buenas, (
        f"el store cierra sesión contra {llamadas}, y a ninguna llega la cookie "
        f"del refresco ({ruta_cookie}): el token no se revoca"
    )
    # Y esa ruta tiene que EXISTIR: llamar a una que el backend no registra
    # devuelve 404 y deja la sesión abierta igual de silenciosamente.
    registradas = _rutas_de("logout")
    assert set(buenas) & set(registradas), (
        f"el store cierra sesión contra {buenas}, que el backend no registra "
        f"(tiene {registradas}): la llamada se va en un 404"
    )


def test_las_respuestas_de_cierre_no_se_cachean():
    """Una respuesta de auth cacheada por un proxy es la sesión de otro."""
    rutas = [f"/api{r}" for r in _rutas_de("logout")]
    for ruta in rutas:
        assert f'"{ruta}"' in _SRC, f"{ruta} no está en _AUTH_PATHS (Cache-Control)"
