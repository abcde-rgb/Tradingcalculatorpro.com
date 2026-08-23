"""Que un valor de fuera no pueda escribir líneas de log por su cuenta.

CodeQL lo cazó en `GET /education/level-odds/{symbol}`: el símbolo llega por la
ruta y va tal cual a `logging.error`. Con un salto de línea dentro, lo que se
escribe no es una línea con un salto — son dos, y la segunda la redacta quien
hizo la petición. Con eso se fabrican entradas falsas que nadie puede distinguir
de las de verdad al leer el log después.

Estas pruebas fijan las dos mitades:

  · `log_safe` neutraliza los caracteres de control (la unidad);
  · y NINGUNA llamada a logging del backend mete un valor crudo (la regla), que
    es lo que impide que el siguiente endpoint reintroduzca el agujero sin que
    nadie se entere hasta el próximo escaneo.
"""
import ast
import os
import pathlib
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Antes de importar `server`: en producción exige JWT_SECRET y lanza si falta.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

from log_seguro import log_safe  # noqa: E402


# ══════════════════════════════════════════════════════════════════════════
# La unidad
# ══════════════════════════════════════════════════════════════════════════
@pytest.mark.parametrize("veneno", [
    "AAPL\nERROR:root:login fallido de admin",
    "AAPL\r\nWARNING:root:pago rechazado",
    "AAPL\rborrado",
    "AAPL\x1b[31mrojo",       # secuencia ANSI: pinta el terminal de quien lee
    "AAPL\x00nulo",
    "AAPL separador",    # separador de línea Unicode, que muchos visores parten
])
def test_ningun_caracter_de_control_sobrevive(veneno):
    salida = log_safe(veneno)
    assert "\n" not in salida and "\r" not in salida, repr(salida)
    assert "\x1b" not in salida and "\x00" not in salida, repr(salida)
    assert " " not in salida, repr(salida)
    assert salida.startswith("AAPL")


def test_un_simbolo_normal_no_se_toca():
    """Sanear no puede volver el log inútil: lo legítimo pasa igual."""
    for bueno in ("AAPL", "BTC-USD", "GC=F", "^GSPC", "BRK.B", "EURUSD=X"):
        assert log_safe(bueno) == bueno


def test_strip_no_habria_bastado():
    """La razón por la que existe esto, escrita como prueba.

    Era `symbol.strip().upper()`, y `.strip()` quita los saltos de los EXTREMOS
    dejando intactos los de en medio — que son justamente los que parten la
    línea. Si alguien vuelve a «arreglarlo» con un strip, esto lo dice.
    """
    veneno = "AAPL\nERROR:root:falso"
    assert "\n" in veneno.strip(), "premisa de la prueba rota"
    assert "\n" not in log_safe(veneno)


def test_lo_muy_largo_se_recorta_y_se_nota():
    salida = log_safe("A" * 500)
    assert len(salida) <= 201, len(salida)
    assert salida.endswith("…")


def test_el_recorte_no_muerde_lo_que_cabe():
    """Un símbolo de largo normal no puede salir con puntos suspensivos."""
    assert log_safe("A" * 200) == "A" * 200
    assert not log_safe("A" * 200).endswith("…")


def test_los_replace_explicitos_no_cambian_nada_de_lo_que_sale():
    """Los `.replace()` de `\\r` y `\\n` son para que CodeQL vea el saneador.

    Están porque su análisis de taint modela `str.replace` y no modela un
    `isprintable()` dentro de un generador. Esta prueba fija que sean lo que
    dicen ser —redundantes— comparando contra el barrido a secas: si alguien
    los convirtiera en la ÚNICA defensa, `\\x1b` y U+2028 pasarían y esto lo
    diría.
    """
    def solo_barrido(v):
        return "".join(c if c.isprintable() else "?" for c in str(v))

    for caso in ("AAPL", "a\nb", "a\r\nb", "a\x1bb", "a\x00b", "a b", "€", ""):
        assert log_safe(caso) == solo_barrido(caso), repr(caso)


# ══════════════════════════════════════════════════════════════════════════
# La regla — para que el agujero no vuelva por otra ruta
# ══════════════════════════════════════════════════════════════════════════
BACKEND = pathlib.Path(__file__).resolve().parent.parent

_NIVELES = {"debug", "info", "warning", "error", "exception", "critical"}
_NOMBRES_LOGGER = {"logging", "logger", "log", "_log", "LOG", "LOGGER"}

# LA REGLA: en una llamada a logging, TODO valor interpolado pasa por log_safe.
#
# ⚠️ La he corregido CUATRO veces, y lo que enseña es el patrón, no cada fallo.
# Las cuatro las encontró CodeQL, no yo, y las cuatro veces mi regla dio verde:
#
#   v1  miraba `sym|symbol|interval`
#       → yo saneaba el símbolo y dejaba `{e}` crudo al lado. Un mensaje de
#         excepción es dato externo por definición.
#   v2  añadió los nombres típicos de excepción
#       → se le escapó `{cand}`, un símbolo candidato fuera de la lista.
#   v3  cualquier IDENTIFICADOR suelto, sin lista
#       → se le escapó `{user['id']}` y `{request.url.path}`: un subíndice y una
#         cadena de atributos no son identificadores.
#   v4  cualquier `{...}` que no empiece por `log_safe(` — pero LÍNEA A LÍNEA y
#       sólo sobre `server.py`.
#       → se le escapó mi propia llamada nueva, partida en tres líneas: la
#         primera es `logging.info(` sin f-string, así que la regla no la miraba,
#         y las otras dos no dicen `logging`. Y además no veía NINGÚN otro
#         módulo ni el estilo `logging.info("%s", valor)`. Medido el 2026-08-22:
#         48 interpolaciones crudas y 88 argumentos `%` que la regla nunca miró.
#
# Las cuatro versiones describían una FORMA —qué nombres, qué sintaxis, qué
# fichero, qué línea— y las cuatro tenían un hueco fuera de esa forma. Ésta no
# mira texto: recorre el ÁRBOL SINTÁCTICO. Una llamada a logging es una llamada
# a logging esté en una línea o en seis, y sus valores interpolados son sus
# `FormattedValue` y sus argumentos de formato, se escriban como se escriban.


def _es_llamada_de_log(nodo: ast.AST) -> bool:
    f = getattr(nodo, "func", None)
    return (isinstance(nodo, ast.Call) and isinstance(f, ast.Attribute)
            and f.attr in _NIVELES and isinstance(f.value, ast.Name)
            and f.value.id in _NOMBRES_LOGGER)


def _es_saneado(nodo: ast.AST) -> bool:
    """¿Este valor pasa por el saneador?

    Se acepta `log_safe(x)` y también un literal constante: una cadena escrita
    en el propio código no es un dato de fuera.
    """
    if isinstance(nodo, ast.Constant):
        return True
    if isinstance(nodo, ast.Call):
        f = nodo.func
        nombre = getattr(f, "id", None) or getattr(f, "attr", None)
        return nombre == "log_safe"
    return False


def interpolaciones_crudas(codigo: str) -> list[str]:
    """Los valores de las llamadas a logging que NO pasan por log_safe().

    Acepta tanto un fichero entero como un fragmento de una línea, porque los
    controles de abajo pasan fragmentos y el test de verdad pasa el fichero: la
    misma función mirando lo mismo en los dos casos.
    """
    try:
        arbol = ast.parse(codigo)
    except SyntaxError:
        return []
    fuera = []
    for nodo in ast.walk(arbol):
        if not _es_llamada_de_log(nodo):
            continue
        # 1) f-strings: cada `{...}` es un FormattedValue.
        for arg in nodo.args:
            for hijo in ast.walk(arg):
                if isinstance(hijo, ast.FormattedValue) and not _es_saneado(hijo.value):
                    fuera.append(f"{{{ast.unparse(hijo.value)}}}")
        # 2) estilo `logging.info("algo %s", valor)`: el formateo lo hace la
        #    librería, pero el salto de línea del valor entra en el mensaje
        #    exactamente igual. La regla anterior no miraba esto en absoluto.
        if nodo.args and not isinstance(nodo.args[0], ast.JoinedStr):
            for extra in nodo.args[1:]:
                if not _es_saneado(extra):
                    fuera.append(f"%-arg {ast.unparse(extra)}")
    return fuera


def _modulos_del_backend():
    return [p for p in sorted(BACKEND.glob("*.py")) if p.name != "log_seguro.py"]


def test_ninguna_llamada_de_log_mete_un_valor_crudo():
    """La regla de verdad, sobre TODOS los módulos del backend.

    CodeQL sólo mira lo que cambia en la PR, así que marcó la ruta nueva y no las
    hermanas que llevaban el mismo patrón desde antes. Esto las mira todas, en
    todos los ficheros, y sobre todo mira las que aún no existen.
    """
    ofensores = []
    for py in _modulos_del_backend():
        crudas = interpolaciones_crudas(py.read_text(errors="ignore"))
        if crudas:
            ofensores.append(f"{py.name}: {len(crudas)} → {', '.join(crudas[:4])}")
    assert not ofensores, (
        "estas llamadas dejan que un valor de fuera escriba en el log; "
        "envuélvelo en log_safe(...):\n  " + "\n  ".join(ofensores))


@pytest.mark.parametrize("codigo, motivo", [
    ('logging.error(f"Level odds error for {sym}: {e}")',
     "el caso original: identificador suelto"),
    ('logging.warning(f"x {symbol} y")', "identificador en medio del texto"),
    ('logging.info(f"{interval}")', "la línea entera es una interpolación"),
    # v1 → el símbolo saneado y la excepción cruda al lado.
    ('logging.error(f"Level odds error for {log_safe(sym)}: {e}")',
     "v1: símbolo saneado, excepción cruda"),
    # v2 → un nombre que no estaba en ninguna lista.
    ('logging.warning(f"yfinance OHLC for {cand}: {log_safe(e)}")',
     "v2: nombre fuera de la lista"),
    # v3 → ni un subíndice ni una cadena de atributos son identificadores.
    ('logging.info(f"user={user[\'id\']}")', "v3: subíndice"),
    ('logging.exception(f"on {request.method} {request.url.path}")',
     "v3: cadena de atributos"),
    ('logging.warning(f"skipping {pos.get(\'id\')}")', "v3: llamada a método"),
    ('logging.info(f"{valor:>10}")', "con especificación de formato"),
    # v4 → los dos huecos que destapó CodeQL sobre mi propio código nuevo.
    ('logging.info(\n    f"stock {log_safe(sym)} servido por "\n    f"{quote.get(\'source\')}")',
     "v4: llamada partida en varias líneas"),
    ('logging.info("[referrals] referrer %s es afiliado", referee["referred_by_id"])',
     "v4: estilo %-args, que la regla no miraba en absoluto"),
    ('logger.warning("provider %s failed: %s", provider, exc)',
     "v4: %-args a través de `logger`, no de `logging`"),
])
def test_la_regla_caza_todo_lo_que_se_le_escapo_alguna_vez(codigo, motivo):
    """El control, con los casos que me pillaron, uno por versión.

    Sin esto, una regla que no case con nada pasaría el test de arriba para
    siempre y en verde. Este repositorio ya ha tenido varias guardas así — y
    esta regla concreta ya dio verde CUATRO veces con el agujero abierto.
    """
    assert interpolaciones_crudas(codigo), motivo


@pytest.mark.parametrize("codigo", [
    'logging.error(f"Level odds error for {log_safe(sym)}: {log_safe(e)}")',
    'logging.info(f"user={log_safe(user[\'id\'])}")',
    'logging.exception(f"on {log_safe(request.method)} {log_safe(request.url.path)}")',
    'logging.info(f"{log_safe(valor):>10}")',
    'logging.error(f"algo sin variables")',
    'logging.info("mensaje sin argumentos")',
    'logging.info("[referrals] referrer %s", log_safe(rid))',
    'logging.info(\n    f"stock {log_safe(sym)} servido por "\n    f"{log_safe(fuente)}")',
    'print(f"esto no es logging {sym}")',
    'otra_cosa.info(f"tampoco es logging {sym}")',
])
def test_la_regla_no_grita_con_lo_que_esta_bien(codigo):
    """La otra mitad: una regla que salta con todo tampoco verifica nada.

    Se desactiva a la semana y deja de proteger, que es la misma nada por otro
    camino. Lo saneado entero —y lo que ni siquiera es un log— tiene que pasar.
    """
    assert not interpolaciones_crudas(codigo)


def test_la_regla_mira_de_verdad_todos_los_modulos():
    """Control del ALCANCE, que es por donde se escapó la v4.

    La versión anterior leía un solo fichero. Si ésta volviera a hacerlo, el
    test de arriba pasaría en verde con diez módulos sin mirar.
    """
    nombres = {p.name for p in _modulos_del_backend()}
    assert len(nombres) > 25, f"sólo {len(nombres)} módulos"
    for imprescindible in ("server.py", "stock_data.py", "referrals.py",
                           "missing_apis.py", "realtime_alerts.py"):
        assert imprescindible in nombres


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
