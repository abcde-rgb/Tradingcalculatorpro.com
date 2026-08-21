#!/usr/bin/env python3
"""Comprobaciones del indicador de TradingView que no necesitan TradingView.

Qué mira (y por qué cada cosa)
------------------------------
1. **Cabecera de versión.** Sin `//@version=6` en la primera línea, TradingView
   compila el fichero como v1 y falla en todo.
2. **Integrados inventados.** El fallo más probable al escribir Pine sin
   compilador es llamar a algo que no existe (`array.append`, `math.clamp`,
   `str.concat`). Se extrae cada `espacio.miembro` y se contrasta con la lista
   de integrados reales; lo que no esté, salta.
3. **Aridad de los constructores.** `Lv.new(...)` con un argumento de más o de
   menos compila mal o, peor, coloca los campos corridos. Se cuentan los campos
   de cada `type` y se comprueba cada `.new(`.
4. **Declaraciones de función en ámbito local.** Pine sólo admite declarar
   funciones en el global. Indentada, el error que da no señala la causa.
5. **`plot` y compañía fuera del global.** Misma regla, mismo despiste.
6. **Presupuesto de dibujos.** Si el script crea líneas/cajas/etiquetas y no
   declara `max_*_count`, TradingView aplica 50 y el usuario ve la mitad del
   análisis sin que nada avise.
7. **Sangría con tabuladores.** Pine acepta tabulador o espacios, pero mezclarlos
   en un mismo bloque es un error de compilación difícil de ver.

Lo que esto NO hace: parsear la gramática (eso es `scripts/gen-pine-twin.py`,
que usa un parser de Pine de verdad) ni comprobar los números (eso es
`backend/tests/test_pine_parity_unit.py`). Aquí no hay dependencias: corre
siempre, en cualquier entorno, en menos de un segundo.

Uso:  python scripts/verificar-pine.py
Sale 1 si algo falla.
"""
from __future__ import annotations

import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PINE = os.path.join(RAIZ, "tradingview", "tcp_structure_scanner.pine")

# Integrados de Pine Script v6 que este proyecto usa o podría usar. La lista es
# deliberadamente cerrada: si añades una llamada nueva al indicador, la añades
# aquí a conciencia, y de paso confirmas que existe de verdad.
INTEGRADOS: dict[str, set[str]] = {
    "math": {"abs", "acos", "asin", "atan", "avg", "ceil", "cos", "exp", "floor",
             "log", "log10", "max", "min", "pow", "random", "round", "round_to_mintick",
             "sign", "sin", "sqrt", "sum", "tan", "todegrees", "toradians", "e", "pi",
             "phi", "rphi"},
    "array": {"abs", "avg", "binary_search", "clear", "concat", "copy", "covariance",
              "every", "fill", "first", "from", "get", "includes", "indexof", "insert",
              "join", "last", "lastindexof", "max", "median", "min", "mode", "new",
              "new_bool", "new_box", "new_color", "new_float", "new_int", "new_label",
              "new_line", "new_string", "new_table", "percentile_linear_interpolation",
              "percentile_nearest_rank", "percentrank", "pop", "push", "range",
              "remove", "reverse", "set", "shift", "size", "slice", "some", "sort",
              "sort_indices", "standardize", "stdev", "sum", "unshift", "variance"},
    "str": {"contains", "endswith", "format", "format_time", "length", "lower",
            "match", "pos", "repeat", "replace", "replace_all", "split", "startswith",
            "substring", "tonumber", "tostring", "trim", "upper"},
    "ta": {"alma", "atr", "barssince", "bb", "bbw", "cci", "change", "cmo", "cog",
           "correlation", "cross", "crossover", "crossunder", "cum", "dev", "dmi",
           "ema", "falling", "highest", "highestbars", "hma", "kc", "kcw", "linreg",
           "lowest", "lowestbars", "macd", "max", "median", "mfi", "min", "mode",
           "mom", "percentile_linear_interpolation", "percentile_nearest_rank",
           "percentrank", "pivothigh", "pivotlow", "range", "rising", "rma", "roc",
           "rsi", "sar", "sma", "stdev", "stoch", "supertrend", "swma", "tr",
           "tsi", "valuewhen", "variance", "vwap", "vwma", "wma", "wpr"},
    "request": {"currency_rate", "dividends", "earnings", "economic", "financial",
                "quandl", "security", "security_lower_tf", "seed", "splits"},
    "timeframe": {"change", "from_seconds", "in_seconds", "isdaily", "isdwm",
                  "isintraday", "isminutes", "ismonthly", "isseconds", "isticks",
                  "isweekly", "main_period", "multiplier", "period"},
    "syminfo": {"basecurrency", "country", "currency", "description", "employees",
                "expiration_date", "industry", "mincontract", "mintick", "minmove",
                "pointvalue", "prefix", "pricescale", "root", "sector", "session",
                "shareholders", "ticker", "tickerid", "timezone", "type", "volumetype"},
    "barstate": {"isconfirmed", "isfirst", "ishistory", "islast", "islastconfirmedhistory",
                 "isnew", "isrealtime"},
    "line": {"all", "copy", "delete", "get_price", "get_x1", "get_x2", "get_y1",
             "get_y2", "new", "set_color", "set_extend", "set_style", "set_width",
             "set_x1", "set_x2", "set_xloc", "set_xy1", "set_xy2", "set_y1", "set_y2",
             "style_arrow_both", "style_arrow_left", "style_arrow_right", "style_dashed",
             "style_dotted", "style_solid"},
    "box": {"all", "copy", "delete", "get_bottom", "get_left", "get_right", "get_top",
            "new", "set_bgcolor", "set_border_color", "set_border_style",
            "set_border_width", "set_bottom", "set_extend", "set_left", "set_lefttop",
            "set_right", "set_rightbottom", "set_text", "set_text_color",
            "set_text_size", "set_top", "set_xloc"},
    "label": {"all", "copy", "delete", "get_text", "get_x", "get_y", "new",
              "set_color", "set_size", "set_style", "set_text", "set_textalign",
              "set_textcolor", "set_tooltip", "set_x", "set_xloc", "set_xy", "set_y",
              "set_yloc", "style_arrowdown", "style_arrowup", "style_circle",
              "style_cross", "style_diamond", "style_flag", "style_label_center",
              "style_label_down", "style_label_left", "style_label_lower_left",
              "style_label_lower_right", "style_label_right", "style_label_up",
              "style_label_upper_left", "style_label_upper_right", "style_none",
              "style_square", "style_text_outline", "style_triangledown",
              "style_triangleup", "style_xcross"},
    "table": {"cell", "cell_set_bgcolor", "cell_set_height", "cell_set_text",
              "cell_set_text_color", "cell_set_text_halign", "cell_set_text_size",
              "cell_set_text_valign", "cell_set_width", "clear", "delete", "merge_cells",
              "new", "set_bgcolor", "set_border_color", "set_border_width",
              "set_frame_color", "set_frame_width", "set_position"},
    "color": {"aqua", "black", "blue", "b", "fuchsia", "from_gradient", "g", "gray",
              "green", "lime", "maroon", "navy", "new", "olive", "orange", "purple",
              "r", "red", "rgb", "silver", "t", "teal", "white", "yellow"},
    "size": {"auto", "huge", "large", "normal", "small", "tiny"},
    "position": {"bottom_center", "bottom_left", "bottom_right", "middle_center",
                 "middle_left", "middle_right", "top_center", "top_left", "top_right"},
    "text": {"align_bottom", "align_center", "align_left", "align_right", "align_top",
             "format_bold", "format_italic", "format_none", "wrap_auto", "wrap_none"},
    "xloc": {"bar_index", "bar_time"},
    "yloc": {"abovebar", "belowbar", "price"},
    "extend": {"both", "left", "none", "right"},
    "display": {"all", "data_window", "none", "pane", "price_scale", "status_line"},
    "format": {"inherit", "mintick", "percent", "price", "volume"},
    "order": {"ascending", "descending"},
    "alert": {"freq_all", "freq_once_per_bar", "freq_once_per_bar_close"},
    "barmerge": {"gaps_off", "gaps_on", "lookahead_off", "lookahead_on"},
    "input": {"bool", "color", "enum", "float", "int", "price", "session", "source",
              "string", "symbol", "text_area", "time", "timeframe"},
    "chart": {"bg_color", "fg_color", "is_heikinashi", "is_kagi", "is_linebreak",
              "is_pnf", "is_range", "is_renko", "is_standard", "left_visible_bar_time",
              "right_visible_bar_time"},
    "session": {"extended", "isfirstbar", "isfirstbar_regular", "islastbar",
                "islastbar_regular", "ismarket", "ispostmarket", "ispremarket",
                "regular"},
    "plot": {"style_area", "style_areabr", "style_circles", "style_columns",
             "style_cross", "style_histogram", "style_line", "style_linebr",
             "style_stepline", "style_stepline_diamond", "style_steplinebr"},
    "hline": {"style_dashed", "style_dotted", "style_solid"},
    "currency": {"NONE", "USD", "EUR"},
    "dayofweek": {"friday", "monday", "saturday", "sunday", "thursday", "tuesday",
                  "wednesday"},
}

# Sólo pueden aparecer en el ámbito global (columna 0).
SOLO_GLOBAL = ("plot", "plotshape", "plotchar", "plotcandle", "plotbar",
               "plotarrow", "hline", "fill", "bgcolor", "barcolor",
               "alertcondition", "indicator", "strategy", "library")


def fallo(problemas: list[str], linea: int, texto: str) -> None:
    problemas.append(f"  línea {linea}: {texto}")


def comprobar(ruta: str) -> list[str]:
    fuente = open(ruta, encoding="utf-8").read()
    lineas = fuente.split("\n")
    problemas: list[str] = []

    # 1) cabecera
    if not lineas or lineas[0].strip() != "//@version=6":
        fallo(problemas, 1, "la primera línea debe ser exactamente '//@version=6'")

    # código sin comentarios, para no analizar prosa
    sin_comentarios = []
    for i, l in enumerate(lineas, start=1):
        # quita el comentario de línea respetando las comillas
        fuera, en_cadena, comilla = [], False, ""
        j = 0
        while j < len(l):
            ch = l[j]
            if en_cadena:
                if ch == comilla:
                    en_cadena = False
                fuera.append(ch)
            elif ch in ('"', "'"):
                en_cadena, comilla = True, ch
                fuera.append(ch)
            elif ch == "/" and j + 1 < len(l) and l[j + 1] == "/":
                break
            else:
                fuera.append(ch)
            j += 1
        sin_comentarios.append((i, "".join(fuera)))

    codigo = "\n".join(t for _, t in sin_comentarios)

    # 2) integrados inventados
    for numero, texto in sin_comentarios:
        for espacio, miembro in re.findall(r"\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b", texto):
            if espacio not in INTEGRADOS:
                continue          # no es un espacio de nombres de Pine: será un campo
            if miembro not in INTEGRADOS[espacio]:
                fallo(problemas, numero, f"`{espacio}.{miembro}` no es un integrado de Pine v6")

    # 3) aridad de los constructores de tipos
    tipos: dict[str, int] = {}
    tipo_actual = None
    for _, texto in sin_comentarios:
        m = re.match(r"^type\s+([A-Za-z_][A-Za-z0-9_]*)\s*$", texto.rstrip())
        if m:
            tipo_actual = m.group(1)
            tipos[tipo_actual] = 0
            continue
        if tipo_actual is not None:
            if texto.startswith((" ", "\t")) and texto.strip():
                tipos[tipo_actual] += 1
            elif texto.strip():
                tipo_actual = None
    if not tipos:
        problemas.append("  no se ha encontrado ni un `type`: ¿se ha vaciado el fichero?")

    for numero, texto in sin_comentarios:
        for nombre in tipos:
            for pos in [m.start() for m in re.finditer(rf"\b{nombre}\.new\s*\(", texto)]:
                inicio = texto.index("(", pos)
                profundidad, args, actual, en_cadena, comilla = 0, [], "", False, ""
                for ch in texto[inicio:]:
                    if en_cadena:
                        actual += ch
                        if ch == comilla:
                            en_cadena = False
                        continue
                    if ch in ('"', "'"):
                        en_cadena, comilla = True, ch
                        actual += ch
                        continue
                    if ch in "([":
                        profundidad += 1
                        if profundidad == 1:
                            continue
                    elif ch in ")]":
                        profundidad -= 1
                        if profundidad == 0:
                            args.append(actual)
                            break
                    if profundidad >= 1:
                        if ch == "," and profundidad == 1:
                            args.append(actual)
                            actual = ""
                            continue
                        actual += ch
                reales = len([a for a in args if a.strip()])
                if reales != tipos[nombre]:
                    fallo(problemas, numero,
                          f"`{nombre}.new(...)` recibe {reales} argumentos y el tipo "
                          f"tiene {tipos[nombre]} campos")

    # 4) y 5) declaraciones que sólo valen en el ámbito global
    for numero, texto in sin_comentarios:
        if re.match(r"^\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*=>\s*$", texto):
            fallo(problemas, numero, "función declarada dentro de un bloque: Pine sólo "
                                     "admite declararlas en el ámbito global")
        for nombre in SOLO_GLOBAL:
            if re.match(rf"^\s+{nombre}\s*\(", texto):
                fallo(problemas, numero, f"`{nombre}(...)` no puede ir dentro de un bloque")

    # 6) presupuesto de dibujos
    for objeto, parametro in (("line.new", "max_lines_count"),
                              ("box.new", "max_boxes_count"),
                              ("label.new", "max_labels_count")):
        if objeto in codigo and parametro not in codigo:
            problemas.append(f"  el script usa `{objeto}` pero `indicator()` no declara "
                             f"`{parametro}`: TradingView limitaría a 50 y el usuario "
                             f"vería el análisis a medias sin ningún aviso")

    # 7) tabuladores
    for numero, texto in sin_comentarios:
        if texto.startswith("\t") or "\t" in texto[:len(texto) - len(texto.lstrip())]:
            fallo(problemas, numero, "sangría con tabulador: usa cuatro espacios")

    return problemas


def main() -> int:
    if not os.path.exists(PINE):
        print(f"✗ no existe {PINE}", file=sys.stderr)
        return 1
    problemas = comprobar(PINE)
    nombre = os.path.relpath(PINE, RAIZ)
    if problemas:
        print(f"✗ {nombre}: {len(problemas)} problema(s)", file=sys.stderr)
        for p in problemas:
            print(p, file=sys.stderr)
        return 1
    print(f"✓ {nombre}: cabecera, integrados, constructores y ámbitos correctos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
