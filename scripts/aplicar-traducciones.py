#!/usr/bin/env python3
"""Aplica un JSON de traducciones a `frontend/src/lib/i18n/<idioma>.edu.js`.

Sustituye SÓLO claves que ya existen: nunca añade ni borra, así que la paridad
que comprueba `i18n-check` no se puede romper desde aquí. Si una clave del JSON
no está en el fichero, se informa y se ignora.

    python scripts/aplicar-traducciones.py de fichero1.json fichero2.json
"""
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DIR = RAIZ / "frontend" / "src" / "lib" / "i18n"


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    idioma, ficheros = sys.argv[1], sys.argv[2:]

    trad: dict[str, str] = {}
    for f in ficheros:
        trad.update(json.loads(pathlib.Path(f).read_text(encoding="utf-8")))

    destino = DIR / f"{idioma}.edu.js"
    txt = destino.read_text(encoding="utf-8")
    puestas, ausentes = 0, []

    for clave, valor in trad.items():
        pat = re.compile(r'("' + re.escape(clave) + r'":\s*)"(?:[^"\\]|\\.)*"')
        if not pat.search(txt):
            ausentes.append(clave)
            continue
        escapado = valor.replace("\\", "\\\\").replace('"', '\\"')
        txt = pat.sub(lambda m: m.group(1) + '"' + escapado + '"', txt, count=1)
        puestas += 1

    destino.write_text(txt, encoding="utf-8")
    print(f"{idioma}: {puestas} claves traducidas")
    if ausentes:
        print(f"  (no están en {destino.name}, ignoradas: {len(ausentes)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
