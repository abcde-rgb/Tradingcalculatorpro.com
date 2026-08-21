#!/usr/bin/env python3
"""Traduce el bloque PURO del indicador de TradingView a Python ejecutable.

Por qué existe
--------------
`tradingview/tcp_structure_scanner.pine` afirma calcular exactamente lo mismo que
`backend/price_action.py`. Esa afirmación no se puede comprobar leyendo: Pine sólo
corre dentro de TradingView, y "lo he repasado y coincide" es justo el tipo de
verificación que este repositorio no acepta.

Así que se traduce. Este script parsea el `.pine` DE VERDAD (gramática, con
`pynescript`) y genera un módulo Python que ejecuta las mismas funciones puras
—§0 a §10 del indicador— con la misma aritmética y el mismo flujo de control.
`backend/tests/test_pine_parity_unit.py` corre ese módulo y el del backend sobre
las mismas velas y exige que devuelvan lo mismo, cifra a cifra.

Lo que esto SÍ prueba: que el algoritmo escrito en Pine produce los números del
escáner de la web. Lo que NO prueba: que TradingView acepte el fichero (eso lo
cubre el parseo gramatical + `scripts/verificar-pine.py`) ni nada del bloque de
dibujo, que es específico de la plataforma y no se traduce.

Uso
---
    python scripts/gen-pine-twin.py            # regenera el gemelo
    python scripts/gen-pine-twin.py --check    # falla si el gemelo está desfasado

Requiere `pynescript` (pip install pynescript). El parseo tarda ~2 min: el árbol
se cachea por hash del fichero en el directorio temporal del sistema.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import pickle
import sys
import tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PINE = os.path.join(RAIZ, "tradingview", "tcp_structure_scanner.pine")
DESTINO = os.path.join(RAIZ, "tradingview", "pine_twin_generated.py")

# El bloque PURO del indicador, nombre por nombre. Se traduce esto y nada más:
# si mañana alguien renombra una función, el script falla en vez de generar un
# gemelo silenciosamente incompleto que dejaría pasar la prueba de paridad.
TIPOS = ["Win", "Swing", "Ev", "Lv", "Fvg", "Brk", "Cluster", "Ctx", "Counts", "Scan"]
CONSTANTES = ["MAX_ANALYSED_LEVELS", "SESSION_GAP_FACTOR", "DAY_SECONDS", "VOL_WINDOW"]
FUNCIONES = [
    "sideOf", "avgTrueRange", "avgVolume", "barSpacingSeconds",
    "detectSwings", "labelStructure", "detectEvents", "clusterRepeatedEvents",
    "detectSrLevels", "sortLevels", "annotateLevels", "annotateEvents",
    "detectFvgs", "detectBreakouts", "applyConfluence", "summariseContext",
    "autoTolerance", "scanLevels", "runScan",
]

# ---------------------------------------------------------------------------
# Traducción de identificadores integrados de Pine → el shim del gemelo
# ---------------------------------------------------------------------------
LLAMADAS = {
    "array.new": "_arr_new",
    "array.push": "_arr_push",
    "array.get": "_arr_get",
    "array.set": "_arr_set",
    "array.size": "_arr_size",
    "array.clear": "_arr_clear",
    "array.shift": "_arr_shift",
    "array.sort": "_arr_sort",
    "array.sort_indices": "_arr_sort_indices",
    "math.max": "_math_max",
    "math.min": "_math_min",
    "math.abs": "_math_abs",
    "math.round": "_math_round",
    "math.floor": "_math_floor",
    "na": "_is_na",
    "nz": "_nz",
}
VALORES = {
    "order.ascending": '"asc"',
    "order.descending": '"desc"',
    "na": "NA",
}
BINOP = {"Add": "+", "Sub": "-", "Mult": "*", "Div": "/", "Mod": "%"}
# Identificadores legales en Pine que en Python son palabras reservadas.
import keyword as _keyword


def ident(nombre: str) -> str:
    return nombre + "_" if _keyword.iskeyword(nombre) else nombre

COMPARE = {"Gt": ">", "GtE": ">=", "Lt": "<", "LtE": "<=", "Eq": "==", "NotEq": "!="}

# El shim: la semántica de Pine que Python no trae de serie.
#
# `na` se representa con NaN a propósito. En Pine v6 una comparación con `na`
# devuelve false, y en Python una comparación con NaN devuelve False: la misma
# regla, sin tener que emularla. Y NaN se propaga por la aritmética igual que
# `na`, que es lo que hace que `n - 1 - lastEnd` con `lastEnd` vacío salga vacío
# en vez de dar un número inventado.
SHIM = '''
import math as _math

NA = float("nan")


def _is_na(x):
    return x is None or (isinstance(x, float) and _math.isnan(x))


def _nz(x, repl=0):
    return repl if _is_na(x) else x


def _arr_new(size=None, init=NA):
    return [] if size is None else [init] * int(size)


def _arr_push(a, v):
    a.append(v)


def _arr_get(a, i):
    return a[i]


def _arr_set(a, i, v):
    a[i] = v


def _arr_size(a):
    return len(a)


def _arr_clear(a):
    a.clear()


def _arr_shift(a):
    return a.pop(0)


def _arr_sort(a, orden="asc"):
    a.sort(reverse=(orden == "desc"))


def _arr_sort_indices(a, orden="asc"):
    return sorted(range(len(a)), key=lambda i: a[i], reverse=(orden == "desc"))


def _math_max(*xs):
    return NA if any(_is_na(x) for x in xs) else max(xs)


def _math_min(*xs):
    return NA if any(_is_na(x) for x in xs) else min(xs)


def _math_abs(x):
    return NA if _is_na(x) else abs(x)


def _math_floor(x):
    return NA if _is_na(x) else int(_math.floor(x))


def _math_round(x, precision=None):
    """math.round de Pine: mitad ALEJÁNDOSE del cero.

    Python redondea al par ('banker\\'s rounding'), Pine no. La diferencia sólo
    aparece en el empate exacto, pero se emula igual: un gemelo que redondea
    distinto que el original deja de ser un gemelo.
    """
    if _is_na(x):
        return NA
    if precision is None:
        return int(_math.floor(x + 0.5)) if x >= 0 else int(_math.ceil(x - 0.5))
    f = 10.0 ** precision
    y = x * f
    y = _math.floor(y + 0.5) if y >= 0 else _math.ceil(y - 0.5)
    return y / f


def _rango(desde, hasta):
    """`for i = a to b` de Pine: si b < a, el bucle cuenta HACIA ATRÁS."""
    desde, hasta = int(desde), int(hasta)
    return range(desde, hasta + 1) if hasta >= desde else range(desde, hasta - 1, -1)
'''


class ErrorTraduccion(Exception):
    pass


class Traductor:
    def __init__(self, ast_mod):
        self.ast = ast_mod
        self.lineas: list[str] = []
        self.nivel = 0

    # -- emisión ------------------------------------------------------------
    def emitir(self, texto: str = "") -> None:
        self.lineas.append(("    " * self.nivel + texto) if texto else "")

    # -- expresiones --------------------------------------------------------
    def nombre_puntuado(self, nodo) -> str | None:
        """`math.round` → 'math.round'; None si no es un acceso con punto simple."""
        a = self.ast
        if isinstance(nodo, a.Attribute) and isinstance(nodo.value, a.Name):
            return f"{nodo.value.id}.{nodo.attr}"
        return None

    def expr(self, nodo) -> str:
        a = self.ast
        if isinstance(nodo, a.Constant):
            v = nodo.value
            if isinstance(v, str):
                return repr(v)
            if isinstance(v, bool):
                return "True" if v else "False"
            return repr(v)
        if isinstance(nodo, a.Name):
            if nodo.id in VALORES:
                return VALORES[nodo.id]
            return ident(nodo.id)
        if isinstance(nodo, a.Attribute):
            punteado = self.nombre_puntuado(nodo)
            if punteado in VALORES:
                return VALORES[punteado]
            if punteado and punteado.split(".")[0] in ("math", "array", "str", "order", "ta"):
                raise ErrorTraduccion(f"integrado de Pine sin traducir: {punteado}")
            return f"{self.expr(nodo.value)}.{nodo.attr}"
        if isinstance(nodo, a.Specialize):
            # array.new<float> → la parte genérica no viaja a Python
            return self.expr(nodo.value)
        if isinstance(nodo, a.Call):
            return self.llamada(nodo)
        if isinstance(nodo, a.BinOp):
            op = BINOP.get(type(nodo.op).__name__)
            if op is None:
                raise ErrorTraduccion(f"operador binario no soportado: {type(nodo.op).__name__}")
            return f"({self.expr(nodo.left)} {op} {self.expr(nodo.right)})"
        if isinstance(nodo, a.UnaryOp):
            nombre = type(nodo.op).__name__
            if nombre == "Not":
                return f"(not {self.expr(nodo.operand)})"
            if nombre == "USub":
                return f"(-{self.expr(nodo.operand)})"
            if nombre == "UAdd":
                return f"(+{self.expr(nodo.operand)})"
            raise ErrorTraduccion(f"operador unario no soportado: {nombre}")
        if isinstance(nodo, a.Compare):
            partes = [self.expr(nodo.left)]
            for op, comp in zip(nodo.ops, nodo.comparators):
                simbolo = COMPARE.get(type(op).__name__)
                if simbolo is None:
                    raise ErrorTraduccion(f"comparador no soportado: {type(op).__name__}")
                partes.append(simbolo)
                partes.append(self.expr(comp))
            return "(" + " ".join(partes) + ")"
        if isinstance(nodo, a.BoolOp):
            op = " and " if type(nodo.op).__name__ == "And" else " or "
            return "(" + op.join(self.expr(v) for v in nodo.values) + ")"
        if isinstance(nodo, a.Conditional):
            return f"(({self.expr(nodo.body)}) if ({self.expr(nodo.test)}) else ({self.expr(nodo.orelse)}))"
        raise ErrorTraduccion(f"expresión no soportada: {type(nodo).__name__}")

    def llamada(self, nodo) -> str:
        a = self.ast
        func = nodo.func
        if isinstance(func, a.Specialize):
            func = func.value
        punteado = self.nombre_puntuado(func)
        args = []
        for arg in nodo.args:
            texto = self.expr(arg.value)
            args.append(f"{arg.name}={texto}" if getattr(arg, "name", None) else texto)
        unidos = ", ".join(args)

        if punteado in LLAMADAS:
            return f"{LLAMADAS[punteado]}({unidos})"
        # Tipo.new(...) → constructor del dataclass
        if punteado and punteado.endswith(".new") and punteado.split(".")[0] in TIPOS:
            return f"{punteado.split('.')[0]}({unidos})"
        if isinstance(func, a.Name):
            if func.id in LLAMADAS:
                return f"{LLAMADAS[func.id]}({unidos})"
            if func.id in FUNCIONES:
                return f"{func.id}({unidos})"
            raise ErrorTraduccion(f"llamada a función desconocida: {func.id}")
        raise ErrorTraduccion(f"llamada no soportada: {punteado or type(func).__name__}")

    # -- sentencias ---------------------------------------------------------
    def cuerpo(self, sentencias, devolver_ultima: bool) -> None:
        if not sentencias:
            self.emitir("pass")
            return
        for i, s in enumerate(sentencias):
            ultima = devolver_ultima and i == len(sentencias) - 1
            self.sentencia(s, ultima)

    def sentencia(self, nodo, devolver: bool = False) -> None:
        a = self.ast
        if isinstance(nodo, a.Assign):
            self.emitir(f"{self.expr(nodo.target)} = {self.expr(nodo.value)}")
            if devolver:
                self.emitir(f"return {self.expr(nodo.target)}")
            return
        if isinstance(nodo, a.ReAssign):
            self.emitir(f"{self.expr(nodo.target)} = {self.expr(nodo.value)}")
            if devolver:
                self.emitir(f"return {self.expr(nodo.target)}")
            return
        if isinstance(nodo, a.AugAssign):
            op = BINOP.get(type(nodo.op).__name__)
            self.emitir(f"{self.expr(nodo.target)} {op}= {self.expr(nodo.value)}")
            return
        if isinstance(nodo, a.Break):
            self.emitir("break")
            return
        if isinstance(nodo, a.Continue):
            self.emitir("continue")
            return
        if isinstance(nodo, a.Expr):
            interno = nodo.value
            if isinstance(interno, a.If):
                self.sentencia_if(interno)
                return
            if isinstance(interno, a.ForTo):
                self.emitir(f"for {ident(interno.target.id)} in _rango({self.expr(interno.start)}, {self.expr(interno.end)}):")
                self.nivel += 1
                self.cuerpo(interno.body, False)
                self.nivel -= 1
                return
            if isinstance(interno, a.While):
                self.emitir(f"while {self.expr(interno.test)}:")
                self.nivel += 1
                self.cuerpo(interno.body, False)
                self.nivel -= 1
                return
            texto = self.expr(interno)
            self.emitir(f"return {texto}" if devolver else texto)
            return
        raise ErrorTraduccion(f"sentencia no soportada: {type(nodo).__name__}")

    def sentencia_if(self, nodo) -> None:
        self.emitir(f"if {self.expr(nodo.test)}:")
        self.nivel += 1
        self.cuerpo(nodo.body, False)
        self.nivel -= 1
        if nodo.orelse:
            a = self.ast
            # `else if` llega como un único If dentro de orelse
            if len(nodo.orelse) == 1 and isinstance(nodo.orelse[0], a.Expr) and isinstance(nodo.orelse[0].value, a.If):
                self.emitir("else:")
                self.nivel += 1
                self.sentencia_if(nodo.orelse[0].value)
                self.nivel -= 1
            else:
                self.emitir("else:")
                self.nivel += 1
                self.cuerpo(nodo.orelse, False)
                self.nivel -= 1


def valor_por_defecto(tipo_texto: str) -> str:
    if tipo_texto == "bool":
        return "False"
    if tipo_texto == "string":
        return '""'
    if tipo_texto.startswith("array"):
        return "None"
    return "NA"


def generar(ast_mod, arbol) -> str:
    a = ast_mod
    tr = Traductor(a)
    salida: list[str] = []
    salida.append('"""GENERADO POR scripts/gen-pine-twin.py — NO EDITAR A MANO.')
    salida.append("")
    salida.append("Traducción mecánica del bloque puro de")
    salida.append("`tradingview/tcp_structure_scanner.pine` (Pine Script v6) a Python, para")
    salida.append("poder ejecutarlo fuera de TradingView y compararlo con `backend/price_action.py`.")
    salida.append("")
    salida.append("Si esto y el backend discrepan, el que está mal es el indicador.")
    salida.append('"""')
    salida.append("# flake8: noqa")
    salida.append(SHIM.strip("\n"))
    salida.append("")

    vistos_tipos, vistos_func, vistas_const = set(), set(), set()

    for nodo in arbol.body:
        if isinstance(nodo, a.TypeDef) and nodo.name in TIPOS:
            vistos_tipos.add(nodo.name)
            campos = []
            for campo in nodo.body:
                nombre = campo.target.id
                tipo_texto = tr.expr(campo.type) if not isinstance(campo.type, a.Specialize) else "array"
                por_defecto = tr.expr(campo.value) if campo.value is not None else valor_por_defecto(tipo_texto)
                campos.append((nombre, por_defecto))
            salida.append("")
            salida.append(f"class {nodo.name}:")
            salida.append(f"    __slots__ = ({', '.join(repr(c[0]) for c in campos)},)")
            firma = ", ".join(f"{n}={d}" for n, d in campos)
            salida.append(f"    def __init__(self, {firma}):")
            for n, _ in campos:
                salida.append(f"        self.{n} = {n}")
            salida.append("")

        elif isinstance(nodo, a.Assign) and isinstance(nodo.target, a.Name) and nodo.target.id in CONSTANTES:
            vistas_const.add(nodo.target.id)
            salida.append(f"{nodo.target.id} = {tr.expr(nodo.value)}")

        elif isinstance(nodo, a.FunctionDef) and nodo.name in FUNCIONES:
            vistos_func.add(nodo.name)
            tr.lineas = []
            tr.nivel = 1
            tr.cuerpo(nodo.body, True)
            salida.append("")
            salida.append("")
            salida.append(f"def {nodo.name}({', '.join(ident(p.name) for p in nodo.args)}):")
            salida.extend(tr.lineas)

    faltan = (set(TIPOS) - vistos_tipos) | (set(FUNCIONES) - vistos_func) | (set(CONSTANTES) - vistas_const)
    if faltan:
        raise ErrorTraduccion(
            "el .pine ya no declara: " + ", ".join(sorted(faltan)) +
            " — actualiza las listas de gen-pine-twin.py o arregla el indicador")
    return "\n".join(salida) + "\n"


def arbol_pine(ruta: str):
    try:
        from pynescript import ast as pine_ast
    except ImportError:
        print("✗ falta `pynescript` (pip install pynescript): no se puede parsear el .pine",
              file=sys.stderr)
        raise SystemExit(2)
    fuente = open(ruta, encoding="utf-8").read()
    firma = hashlib.sha256(fuente.encode("utf-8")).hexdigest()[:16]
    cache = os.path.join(tempfile.gettempdir(), f"pine-ast-{firma}.pkl")
    if os.path.exists(cache):
        with open(cache, "rb") as fh:
            return pine_ast, pickle.load(fh)
    arbol = pine_ast.parse(fuente)
    try:
        with open(cache, "wb") as fh:
            pickle.dump(arbol, fh)
    except Exception:      # noqa: BLE001 — la caché es un lujo, no un requisito
        pass
    return pine_ast, arbol


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="falla si el gemelo está desfasado")
    args = ap.parse_args()

    pine_ast, arbol = arbol_pine(PINE)
    try:
        codigo = generar(pine_ast, arbol)
    except ErrorTraduccion as e:
        print(f"✗ no se pudo traducir el indicador: {e}", file=sys.stderr)
        return 1

    if args.check:
        actual = open(DESTINO, encoding="utf-8").read() if os.path.exists(DESTINO) else ""
        if actual != codigo:
            print("✗ tradingview/pine_twin_generated.py no corresponde al .pine actual.",
                  file=sys.stderr)
            print("  Ejecuta: python scripts/gen-pine-twin.py", file=sys.stderr)
            return 1
        print("✓ el gemelo Python corresponde al indicador Pine")
        return 0

    with open(DESTINO, "w", encoding="utf-8") as fh:
        fh.write(codigo)
    print(f"✓ generado {os.path.relpath(DESTINO, RAIZ)} ({len(codigo.splitlines())} líneas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
