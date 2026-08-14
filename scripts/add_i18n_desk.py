#!/usr/bin/env python3
"""Añade las claves de la mesa de cálculo a los diez idiomas.

Se ejecuta UNA vez y se queda en el repo como registro de qué se añadió y con
qué texto en cada idioma; a partir de ahí vigila `i18n-check.js`.

Mismo criterio que `add_i18n_multiproduct.py`: los términos del sector (pip,
tick, lote, spot, CFD, forex, cross, isolated, R:B) no se traducen, porque es
como los dice quien opera y como aparecen en la pantalla de su bróker.
"""
from __future__ import annotations

import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I18N = os.path.join(ROOT, "frontend", "src", "lib", "i18n")
LANGS = ["es", "en", "de", "fr", "ru", "zh", "ja", "ar", "pt", "it"]


def apply(extra: dict[str, list[str]]) -> None:
    """Inserta las claves que falten antes del `}` final de cada diccionario."""
    for idx, lang in enumerate(LANGS):
        path = os.path.join(I18N, f"{lang}.js")
        with io.open(path, encoding="utf-8") as fh:
            src = fh.read()
        present = set(re.findall(r'^\s*"([A-Za-z0-9_]+)":', src, re.M))

        lines = []
        for key, values in extra.items():
            if key in present:
                continue
            assert len(values) == len(LANGS), f"{key}: {len(values)} textos, hacen falta {len(LANGS)}"
            value = values[idx].replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'  "{key}": "{value}",')

        if not lines:
            print(f"  {lang}: sin cambios")
            continue

        marker = src.rstrip()
        assert marker.endswith("}"), f"{lang}.js no termina en }}"
        body = marker[:-1].rstrip()
        if not body.endswith(","):
            body += ","
        with io.open(path, "w", encoding="utf-8") as fh:
            fh.write(body + "\n" + "\n".join(lines) + "\n}\n")
        print(f"  {lang}: +{len(lines)} claves")


if __name__ == "__main__":
    import sys

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from i18n_desk_part1 import KEYS as K1  # noqa: E402
    from i18n_desk_part2 import KEYS as K2  # noqa: E402
    from i18n_desk_part3 import KEYS as K3  # noqa: E402

    merged = {**K1, **K2, **K3}
    print(f"mesa de cálculo — {len(merged)} claves × {len(LANGS)} idiomas")
    apply(merged)
