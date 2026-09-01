"""El segundo factor se pide en TRES vías, y sólo una sabía leerlo.

`/auth/login`, `/auth/google` y `/auth/magic-link/verify` responden lo mismo
cuando la cuenta tiene TOTP activo: **HTTP 200**, `{"totp_required": true,
"pending_token": ...}` y **sin** `token`. No es un error, es un paso intermedio.

El frontend sólo lo interpretaba en el formulario de contraseña. Las otras dos
llegaban a un `if (!data.token) throw`, así que quien tenía el 2FA activo veía
«Error con Google» en cada intento y «enlace inválido» sobre un enlace
perfectamente válido — sin ninguna pista de que le faltaba meter el código.
Y le pasa justo a quien MÁS lo va a sufrir: el 2FA es obligatorio para los
administradores.

Estas pruebas recorren el backend con `ast` en vez de fijar una lista de rutas:
una vía nueva que responda `totp_required` y no se lea en el frontend sale sola.
"""
import ast
import re
from functools import lru_cache
from pathlib import Path

_RAIZ = Path(__file__).resolve().parents[2]
_SERVER = _RAIZ / "backend/server.py"
_SRC = _SERVER.read_text(encoding="utf-8")
_FRONT = _RAIZ / "frontend/src"

# Cuánto texto detrás de la llamada cuenta como «el bloque que lee la respuesta».
# Generoso a propósito: si `totp_required` no aparece ni en 1.500 caracteres, no
# se está leyendo.
_VENTANA = 1500


@lru_cache(maxsize=1)
def _rutas_que_pueden_pedir_2fa():
    """Rutas cuya función responde `totp_required`, sacadas del propio código."""
    arbol = ast.parse(_SRC)
    lineas = _SRC.splitlines()
    rutas = []
    for nodo in ast.walk(arbol):
        if not isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        # Por rango de líneas y no con `get_source_segment`: éste vuelve a
        # trocear las 9.000 líneas del monolito en CADA función, y la prueba
        # tardaba 50 segundos en leer un fichero.
        cuerpo = "\n".join(lineas[nodo.lineno - 1:nodo.end_lineno])
        if '"totp_required"' not in cuerpo:
            continue
        for dec in nodo.decorator_list:
            if isinstance(dec, ast.Call) and dec.args and isinstance(dec.args[0], ast.Constant):
                ruta = dec.args[0].value
                if isinstance(ruta, str) and ruta.startswith("/"):
                    rutas.append(ruta)
    return tuple(sorted(set(rutas)))


def _ficheros_frontend():
    # Los diccionarios de idioma son el 90 % del peso de `src` y no llaman a
    # nada; leerlos convertía esta prueba en 50 segundos de nada.
    for ext in ("*.js", "*.jsx"):
        for f in _FRONT.rglob(ext):
            if "i18n" in f.parts:
                continue
            yield f


def test_hay_varias_vias_que_pueden_pedir_el_segundo_factor():
    """Si esto se queda a cero, la prueba de abajo pasa por vacío."""
    rutas = _rutas_que_pueden_pedir_2fa()
    assert len(rutas) >= 3, f"esperaba al menos 3 vías con 2FA, encontradas: {rutas}"
    assert "/auth/google" in rutas
    assert "/auth/login" in rutas


def test_toda_via_que_pide_2fa_se_lee_en_el_frontend():
    """Una respuesta `totp_required` que nadie lee es un login que no entra."""
    fuentes = {f: f.read_text(encoding="utf-8") for f in _ficheros_frontend()}
    for ruta in _rutas_que_pueden_pedir_2fa():
        # `${API}/auth/magic-link` NO puede casar con `/auth/magic-link/verify`:
        # de ahí el delimitador detrás de la ruta.
        patron = re.compile(r"\$\{API\}" + re.escape(ruta) + r"(?=[`?'\"])")
        llamadas = [(f, m.start()) for f, s in fuentes.items() for m in patron.finditer(s)]
        assert llamadas, (
            f"{ruta} puede responder `totp_required` y ningún fichero del "
            f"frontend la llama: o sobra la ruta, o falta la pantalla"
        )
        for fichero, pos in llamadas:
            bloque = fuentes[fichero][pos:pos + _VENTANA]
            assert "totp_required" in bloque, (
                f"{fichero.relative_to(_RAIZ)} llama a {ruta} y no mira "
                f"`totp_required`: con el 2FA activo el usuario recibe un error "
                f"genérico en vez del campo del código"
            )


def test_el_reto_de_2fa_es_uno_solo_y_esta_en_las_tres_pantallas():
    """Tres copias del formulario son dos que se quedarán atrás."""
    reto = _FRONT / "components/auth/TwoFactorChallenge.jsx"
    assert reto.exists(), "falta el componente compartido del segundo factor"
    # Se exige el IMPORT y el USO, no que el nombre aparezca por ahí: la primera
    # versión de esta prueba buscaba la cadena suelta, y un sabotaje que quitaba
    # el import y cambiaba `<TwoFactorChallenge` por `<div` seguía pasando —
    # el nombre sobrevivía en un comentario del propio fichero.
    usuarios = [f for f, s in
                ((f, f.read_text(encoding="utf-8")) for f in _ficheros_frontend())
                if f != reto
                and "components/auth/TwoFactorChallenge'" in s
                and "<TwoFactorChallenge" in s]
    nombres = {f.name for f in usuarios}
    assert "AuthPages.jsx" in nombres, "el login y el enlace mágico no piden el código"
    assert "GoogleSignInButton.jsx" in nombres, "entrar con Google no pide el código"


def test_google_no_trata_el_segundo_factor_como_un_fallo():
    """El orden importa: si el `throw` va antes, la rama nueva no se alcanza."""
    store = (_FRONT / "lib/store.js").read_text(encoding="utf-8")
    inicio = store.find("loginWithGoogle:")
    fin = store.find("setSession:", inicio)
    assert -1 < inicio < fin
    cuerpo = store[inicio:fin]
    idx_2fa = cuerpo.find("totp_required")
    idx_throw = cuerpo.find("if (!data.token")
    assert idx_2fa != -1, "loginWithGoogle no mira `totp_required`"
    assert idx_2fa < idx_throw, (
        "la comprobación del 2FA tiene que ir ANTES del `!data.token`: si no, "
        "una respuesta legítima sin token se convierte en «Error con Google»"
    )
