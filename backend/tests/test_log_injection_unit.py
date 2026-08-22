"""Que un símbolo de fuera no pueda escribir líneas de log por su cuenta.

CodeQL lo cazó en `GET /education/level-odds/{symbol}`: el símbolo llega por la
ruta y va tal cual a `logging.error`. Con un salto de línea dentro, lo que se
escribe no es una línea con un salto — son dos, y la segunda la redacta quien
hizo la petición. Con eso se fabrican entradas falsas que nadie puede distinguir
de las de verdad al leer el log después.

Estas pruebas fijan las dos mitades:

  · `log_safe` neutraliza los caracteres de control (la unidad);
  · y NINGUNA línea de log del fichero mete un símbolo crudo (la regla), que es
    lo que impide que el siguiente endpoint reintroduzca el agujero sin que
    nadie se entere hasta el próximo escaneo.
"""
import os
import pathlib
import re
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Antes de importar `server`: en producción exige JWT_SECRET y lanza si falta.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

from server import log_safe  # noqa: E402


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


# ══════════════════════════════════════════════════════════════════════════
# La regla — para que el agujero no vuelva por otra ruta
# ══════════════════════════════════════════════════════════════════════════
SERVER = pathlib.Path(__file__).resolve().parent.parent / "server.py"

# LA REGLA: en un f-string de logging, todo `{...}` tiene que ser `log_safe(...)`.
#
# ⚠️ La he corregido TRES veces, y lo que enseña es el patrón, no cada fallo.
# Las tres veces la encontró CodeQL, no yo, y las tres veces mi regla dio verde:
#
#   v1  miraba `sym|symbol|interval`
#       → yo saneaba el símbolo y dejaba `{e}` crudo al lado. Un mensaje de
#         excepción es dato externo por definición: lo redacta una librería o la
#         respuesta de un proveedor y arrastra dentro el valor que le pasaste.
#         Comprobado: la línea salía partida en dos, y la segunda era una
#         entrada de log falsa.
#   v2  añadió los nombres típicos de excepción
#       → se le escapó `{cand}`, un símbolo candidato que no estaba en la lista.
#   v3  cualquier IDENTIFICADOR suelto, sin lista
#       → se le escapó `{user['id']}` y `{request.url.path}`, porque no son
#         identificadores sueltos sino un subíndice y una cadena de atributos.
#
# Las tres versiones describían una FORMA («qué nombres», «qué sintaxis») y las
# tres tenían un hueco fuera de esa forma. Ésta describe la propiedad que de
# verdad importa —que el valor pase por el saneador— y no deja hueco: da igual
# si dentro hay un nombre, un atributo, un subíndice o una llamada.
DENTRO = re.compile(r"\{([^{}]+)\}")
ES_LOG = re.compile(r'logging\.\w+\(\s*f["\']')


def interpolaciones_crudas(linea):
    """Los `{...}` de esta línea que NO pasan por log_safe(). Vacío si es sana."""
    if not ES_LOG.search(linea):
        return []
    fuera = []
    for m in DENTRO.finditer(linea):
        nucleo = m.group(1).split("!")[0].split(":")[0].strip()
        if not nucleo.startswith("log_safe("):
            fuera.append(m.group(0))
    return fuera


def test_ninguna_linea_de_log_mete_un_simbolo_crudo():
    """La regla de verdad, sobre el fichero entero.

    CodeQL sólo mira lo que cambia en la PR, así que marcó la ruta nueva y no
    las once hermanas que llevaban el mismo patrón desde antes. Esto las mira
    todas, y sobre todo mira las que aún no existen.
    """
    ofensores = [
        f"server.py:{n}: {crudas} en  {linea.strip()}"
        for n, linea in enumerate(SERVER.read_text().splitlines(), 1)
        for crudas in [interpolaciones_crudas(linea)]
        if crudas
    ]
    assert not ofensores, (
        "estas líneas dejan que un valor de fuera escriba en el log; "
        "envuélvelo en log_safe(...):\n  " + "\n  ".join(ofensores))


@pytest.mark.parametrize("linea, motivo", [
    ('logging.error(f"Level odds error for {sym}: {e}")',
     "el caso original: identificador suelto"),
    ('logging.warning(f"x {symbol} y")', "identificador en medio del texto"),
    ('logging.info(f"{interval}")', "la línea entera es una interpolación"),
    # v1 → el símbolo saneado y la excepción cruda al lado. Media línea limpia
    # no sirve de nada: el salto entra igual por `{e}`.
    ('logging.error(f"Level odds error for {log_safe(sym)}: {e}")',
     "v1: símbolo saneado, excepción cruda"),
    # v2 → un nombre que no estaba en ninguna lista.
    ('logging.warning(f"yfinance OHLC for {cand}: {log_safe(e)}")',
     "v2: nombre fuera de la lista"),
    ('logging.warning(f"{cualquier_nombre_que_no_existia_ayer}")',
     "v2: un nombre que aún no se ha inventado"),
    # v3 → ni un subíndice ni una cadena de atributos son identificadores.
    ('logging.info(f"user={user[\'id\']}")', "v3: subíndice"),
    ('logging.exception(f"on {request.method} {request.url.path}")',
     "v3: cadena de atributos"),
    ('logging.warning(f"skipping {pos.get(\'id\')}")', "v3: llamada a método"),
    # Y una que ninguna versión anterior habría mirado: saneado a medias dentro
    # de una especificación de formato.
    ('logging.info(f"{valor:>10}")', "con especificación de formato"),
])
def test_la_regla_caza_todo_lo_que_se_le_escapo_alguna_vez(linea, motivo):
    """El control, con los cuatro casos que me pillaron, uno por versión.

    Sin esto, una regla que no case con nada pasaría el test de arriba para
    siempre y en verde. Este repositorio ya ha tenido varias guardas así — y
    esta regla concreta ya dio verde tres veces con el agujero abierto.
    """
    assert interpolaciones_crudas(linea), motivo


@pytest.mark.parametrize("linea", [
    'logging.error(f"Level odds error for {log_safe(sym)}: {log_safe(e)}")',
    'logging.info(f"user={log_safe(user[\'id\'])}")',
    'logging.exception(f"on {log_safe(request.method)} {log_safe(request.url.path)}")',
    'logging.info(f"{log_safe(valor):>10}")',
    'logging.error(f"algo sin variables")',
    'print(f"esto no es logging {sym}")',
])
def test_la_regla_no_grita_con_lo_que_esta_bien(linea):
    """La otra mitad: una regla que salta con todo tampoco verifica nada.

    Se desactiva a la semana y deja de proteger, que es la misma nada por otro
    camino. Lo saneado entero —y lo que ni siquiera es un log— tiene que pasar.
    """
    assert not interpolaciones_crudas(linea)


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
