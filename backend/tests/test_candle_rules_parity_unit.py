"""
Los umbrales del detector de velas viven en DOS sitios: `candle_patterns.py`
(la verdad, lo que decide en el escáner) y `frontend/src/lib/candleRules.js`
(una copia, para que el laboratorio pueda clasificar en el navegador sin una
llamada al servidor por cada arrastre del ratón).

Duplicar constantes es deuda. Lo peligroso no es la copia: es que se separen en
silencio y la web acabe ENSEÑANDO una regla mientras el escáner aplica otra.
Este test lee el fichero JavaScript y compara número a número.

Si falla, la copia dejó de reflejar la fuente. Se arregla el JS, no el test.
"""
import json
import re
from pathlib import Path

import pytest

JS = Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "candleRules.js"

# Cada umbral de JS, con el valor que DEBE tener según candle_patterns.py y de
# qué condición sale, para que un fallo diga dónde mirar.
EXPECTED = {
    "DOJI_MAX_BODY":            (0.07, "_is_doji: body_pct <= 0.07"),
    "DOJI_FLAT_WICK":           (0.05, "_is_dragonfly_doji / _is_gravestone_doji: mecha plana <= 0.05*range"),
    "DRAGONFLY_MIN_LOWER":      (0.6,  "_is_dragonfly_doji: lower >= 0.6*range"),
    "GRAVESTONE_MIN_UPPER":     (0.6,  "_is_gravestone_doji: upper >= 0.6*range"),
    "LONGLEG_MIN_WICK":         (0.35, "_is_long_legged_doji: ambas mechas >= 0.35*range"),
    "HAMMER_MIN_LOWER_X_BODY":  (1.8,  "_is_hammer: lower >= 1.8*body"),
    "HAMMER_MAX_UPPER_X_BODY":  (0.4,  "_is_hammer: upper <= 0.4*body"),
    "HAMMER_MIN_BODY":          (0.05, "_is_hammer: body_pct >= 0.05"),
    "MARUBOZU_MIN_BODY":        (0.85, "_is_marubozu: body_pct >= 0.85"),
    "MARUBOZU_MAX_WICK":        (0.05, "_is_marubozu: mechas <= 0.05*range"),
    "SPINNING_MIN_BODY":        (0.10, "_is_spinning_top: body_pct > 0.10"),
    "SPINNING_MAX_BODY":        (0.35, "_is_spinning_top: body_pct < 0.35"),
    "HIGHWAVE_MAX_BODY":        (0.25, "_is_high_wave: body_pct <= 0.25"),
    "HIGHWAVE_MIN_WICK":        (0.30, "_is_high_wave: mechas >= 0.30*range"),
    "SOLDIER_MIN_BODY":         (0.55, "_SOLDIER_MIN_BODY_PCT"),
    "SOLDIER_MAX_WICK":         (0.25, "_SOLDIER_MAX_WICK_PCT"),
}


def _js_thresholds():
    if not JS.exists():
        pytest.skip(f"no está el fichero del frontend: {JS}")
    src = JS.read_text(encoding="utf-8")
    block = re.search(r"export const T = \{(.*?)\};", src, re.S)
    assert block, "no se encontró el bloque `export const T = {...}` en candleRules.js"
    return {k: float(v) for k, v in re.findall(r"(\w+):\s*([0-9.]+)", block.group(1))}


def test_js_thresholds_match_python():
    js = _js_thresholds()
    problemas = []
    for name, (want, origen) in EXPECTED.items():
        if name not in js:
            problemas.append(f"falta {name} en candleRules.js (viene de {origen})")
        elif abs(js[name] - want) > 1e-9:
            problemas.append(f"{name}: JS={js[name]} pero Python usa {want} ({origen})")
    assert not problemas, "Los umbrales del navegador y del servidor divergen:\n  " + "\n  ".join(problemas)


def test_the_js_copy_has_no_extra_invented_thresholds():
    """Un umbral que solo existe en JS es una regla que el escáner NO aplica."""
    js = _js_thresholds()
    sobrantes = set(js) - set(EXPECTED)
    assert not sobrantes, f"umbrales solo en JS, sin equivalente en Python: {sorted(sobrantes)}"


def test_the_soldier_thresholds_really_come_from_the_module():
    """Ata el test al código, no a una copia de los números en el propio test:
    si alguien cambia el módulo, esto lo ve."""
    import terminal.candle_patterns as cp
    assert cp._SOLDIER_MIN_BODY_PCT == EXPECTED["SOLDIER_MIN_BODY"][0]
    assert cp._SOLDIER_MAX_WICK_PCT == EXPECTED["SOLDIER_MAX_WICK"][0]
