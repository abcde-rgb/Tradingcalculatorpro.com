"""
La caja de búsqueda de usuarios del panel admin (`GET /api/admin/users?q=`)
pasaba lo tecleado DIRECTAMENTE a los operadores `~` / `~*` de PostgreSQL.

Lo que teclea una persona en un buscador es texto, no una expresión regular.
Con un solo paréntesis —buscar a "Rodríguez (padre)", o teclear `(` a medias—
PostgreSQL abortaba la consulta con *invalid regular expression: parentheses
() not balanced*, el manejador genérico lo convertía en un 500 y el panel se
quedaba sin lista de usuarios.

Verificado contra PostgreSQL real antes de arreglarlo:
    InvalidRegularExpressionError: invalid regular expression:
    parentheses () not balanced

`_literal_regex` escapa los metacaracteres para que la búsqueda haga lo que se
espera de un buscador: subcadena literal, sin sintaxis oculta.

Si este test falla, alguien volvió a pasar `q` sin escapar.
"""
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Modo dev antes de importar server: genera JWT_SECRET solo, sin red ni BD.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

from server import _literal_regex  # noqa: E402


# Entradas realistas de un buscador que ANTES rompían la consulta.
ROMPIAN_ANTES = ["(", "user(", "Rodríguez (padre)", "a{2", "x[", "*", "+", "?", "a|b"]


class TestNoRompeElRegex:
    def test_los_metacaracteres_quedan_neutralizados(self):
        for q in ROMPIAN_ANTES:
            patron = _literal_regex(q)
            # Si sigue siendo un regex válido en Python, PostgreSQL tampoco
            # se atraganta: ninguno de estos metacaracteres queda "vivo".
            re.compile(patron)

    def test_el_texto_se_busca_tal_cual(self):
        # Un paréntesis debe encontrar un paréntesis, no agrupar.
        assert re.search(_literal_regex("(padre)"), "Ana Rodríguez (padre)")
        # Y no debe encontrar el texto sin los paréntesis.
        assert not re.search(_literal_regex("(padre)"), "Ana Rodriguez padre")

    def test_el_punto_deja_de_ser_comodin(self):
        # "a.com" no puede hacer match con "axcom": el punto es un punto.
        assert not re.search(_literal_regex("a.com"), "axcom")
        assert re.search(_literal_regex("a.com"), "ana@a.com")

    def test_la_busqueda_normal_sigue_intacta(self):
        for q, texto in [("ana", "Ana Rodríguez"), ("bob@x.com", "bob@x.com")]:
            assert re.search(_literal_regex(q), texto, re.IGNORECASE)

    def test_vacio_y_none_no_explotan(self):
        assert _literal_regex("") == ""
        assert _literal_regex(None) == ""
