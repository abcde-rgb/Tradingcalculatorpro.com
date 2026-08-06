#!/usr/bin/env python3
"""Escribe el espejo de JavaScript del catálogo de instrumentos.

El formulario del diario calcula en vivo mientras el usuario teclea —nocional,
margen, exposición, riesgo, liquidación— y el backend recalcula lo mismo al
guardar. Son dos implementaciones de la misma matemática, y eso está bien: el
navegador no puede esperar a la red para decirte que te has pasado del tope, y
el servidor no puede fiarse de lo que le mande el navegador.

Lo que NO puede ser dos veces son los **datos**. Que un lote de oro sean 100
onzas o que el pip del yen sea 0,01 no admite dos opiniones, y mantener a mano
dos tablas idénticas en dos lenguajes acaba siempre igual: divergen, y el
usuario ve dos cifras distintas para la misma posición según la mire antes o
después de guardar.

Por eso el catálogo vive en `backend/instruments.py` y este script lo vuelca a
`frontend/src/lib/instrumentSpecs.generated.js`. El archivo generado se commitea
(el build del frontend no ejecuta Python), y `--check` verifica que sigue
cuadrando — ahí es donde se detecta si alguien tocó una tabla y olvidó la otra.

Uso:
    python scripts/gen-instruments-js.py            # regenera
    python scripts/gen-instruments-js.py --check    # verifica (código 1 si difiere)
"""
from __future__ import annotations

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

OUT_PATH = os.path.join(ROOT, "frontend", "src", "lib", "instrumentSpecs.generated.js")

HEADER = """/* eslint-disable */
/**
 * GENERADO AUTOMÁTICAMENTE — no editar a mano.
 *
 * Fuente: `backend/instruments.py`.
 * Regenerar: `python scripts/gen-instruments-js.py`
 * Verificar: `python scripts/gen-instruments-js.py --check`
 *
 * Aquí sólo hay DATOS (tamaños de contrato, ticks, pips, apalancamientos
 * típicos). La matemática que los usa vive en `lib/instruments.js`, escrita a
 * mano y en paralelo a la del backend: el navegador tiene que poder calcular
 * sin red y el servidor no puede fiarse de lo que le llegue del navegador.
 */
"""


def render() -> str:
    from instruments import catalog  # noqa: E402 — depende del sys.path de arriba

    payload = json.dumps(catalog(), indent=2, ensure_ascii=False, sort_keys=True)
    return f"{HEADER}\nconst SPECS = {payload};\n\nexport default SPECS;\n"


def main() -> int:
    content = render()
    check = "--check" in sys.argv
    if check:
        if not os.path.exists(OUT_PATH):
            print(f"✗ falta {os.path.relpath(OUT_PATH, ROOT)} — ejecuta el generador")
            return 1
        with open(OUT_PATH, encoding="utf-8") as fh:
            current = fh.read()
        if current != content:
            print("✗ el catálogo del frontend NO coincide con backend/instruments.py")
            print("  → python scripts/gen-instruments-js.py")
            return 1
        print("✓ catálogo de instrumentos en paridad (backend ↔ frontend)")
        return 0

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        fh.write(content)
    print(f"✓ escrito {os.path.relpath(OUT_PATH, ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
