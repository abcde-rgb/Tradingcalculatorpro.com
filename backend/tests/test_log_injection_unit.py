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

# Un f-string de logging que interpola CUALQUIER identificador a pelo.
# `{log_safe(sym)}` no casa, que es justo la diferencia que se persigue.
#
# ⚠️ Esta regla la he tenido que corregir DOS veces, y la lección está en el
# patrón de los dos fallos, no en cada uno:
#
#   v1 — miraba `sym|symbol|interval`. Verde con el agujero abierto: yo saneaba
#        el símbolo y dejaba `{e}` al lado. Un mensaje de excepción es dato
#        externo por definición —lo redacta una librería o la respuesta de un
#        proveedor, y arrastra dentro el valor que le pasaste—, así que el salto
#        de línea entraba igual. Comprobado: la línea salía partida en dos y la
#        segunda era una entrada de log falsa.
#   v2 — añadí los nombres de excepción. Verde otra vez, y CodeQL encontró
#        `{cand}` (un símbolo candidato) en la línea 3218: no estaba en la lista.
#
# El fallo no era la lista: era TENER una lista. Una lista negra siempre tiene
# un punto ciego y lo descubre otro. Así que la regla se invierte: ninguna
# interpolación suelta en un log, sea cual sea el nombre. Envolver un entero en
# `log_safe()` no cuesta nada; olvidarse de uno que venía de fuera cuesta una
# entrada de log falsificada.
CRUDO = re.compile(
    r'logging\.\w+\(\s*f["\'][^"\']*\{\s*[A-Za-z_][A-Za-z0-9_]*\s*[}!:]')


def test_ninguna_linea_de_log_mete_un_simbolo_crudo():
    """La regla de verdad, sobre el fichero entero.

    CodeQL sólo mira lo que cambia en la PR, así que marcó la ruta nueva y no
    las once hermanas que llevaban el mismo patrón desde antes. Esto las mira
    todas, y sobre todo mira las que aún no existen.
    """
    ofensores = [
        f"server.py:{n}: {linea.strip()}"
        for n, linea in enumerate(SERVER.read_text().splitlines(), 1)
        if CRUDO.search(linea)
    ]
    assert not ofensores, (
        "estas líneas dejan que un valor de fuera escriba en el log; "
        "envuélvelo en log_safe(...):\n  " + "\n  ".join(ofensores))


def test_la_regla_no_es_decorativa():
    """El control: la expresión TIENE que cazar el patrón malo.

    Sin esto, un regex que no case con nada pasaría el test de arriba para
    siempre y en verde. Este repositorio ya ha tenido varias guardas así.
    """
    assert CRUDO.search('        logging.error(f"Level odds error for {sym}: {e}")')
    assert CRUDO.search('logging.warning(f"x {symbol} y")')
    assert CRUDO.search('logging.info(f"{interval}")')

    # El caso que de verdad importa, y con el que este control me pilló: el
    # SÍMBOLO saneado y la EXCEPCIÓN cruda al lado. Media línea limpia no sirve
    # de nada — el salto de línea entra igual por `{e}` — y la regla tiene que
    # seguir cazándolo.
    assert CRUDO.search('logging.error(f"Level odds error for {log_safe(sym)}: {e}")')

    # Y el que se le escapó a la v2: un nombre que no está en ninguna lista.
    # Este es el que justifica haber tirado la lista entera.
    assert CRUDO.search('logging.warning(f"yfinance OHLC for {cand}: {log_safe(e)}")')
    assert CRUDO.search('logging.warning(f"{cualquier_nombre_nuevo}")')

    # Y lo que NO debe cazar: la versión saneada ENTERA.
    assert not CRUDO.search(
        'logging.error(f"Level odds error for {log_safe(sym)}: {log_safe(e)}")')
    assert not CRUDO.search('logging.error(f"algo sin variables")')


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
