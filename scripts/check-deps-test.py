#!/usr/bin/env python3
"""Las dependencias de test se declaran UNA vez, y todos apuntan ahí.

Existe por un fallo con dos caras, las dos ya vividas:

* `pytest-asyncio` estaba instalado «de arrastre» en local y no en CI, así que
  las siete pruebas `async def` fallaban **sólo en CI**. Se arregló pasándolo a
  mano en la línea de `pip install` del workflow.
* Con eso, `CLAUDE.md` se quedó documentando `pip install -r requirements.txt`,
  que **no basta**: quien siguiera la guía del proyecto veía esas mismas pruebas
  como FALLIDAS, con un aviso de «marcador desconocido» fácil de leer como
  ruido. El fallo se había mudado de sitio, no desaparecido.

La causa de las dos es la misma: la dependencia no estaba declarada en ningún
fichero. Ahora vive en `backend/requirements-dev.txt` y esto comprueba que el
workflow y la guía sigan apuntando ahí, en vez de volver a listar paquetes a
mano cada uno por su cuenta.

    python scripts/check-deps-test.py
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DEV = RAIZ / "backend" / "requirements-dev.txt"
CI = RAIZ / ".github" / "workflows" / "ci.yml"
GUIA = RAIZ / "CLAUDE.md"

# Lo que hace falta para que `pytest tests/` diga la verdad. Si mañana entra
# otro plugin sin el que una prueba se reporta mal, va aquí.
IMPRESCINDIBLES = ("pytest", "pytest-asyncio")

fallos = []


def mal(msg):
    fallos.append(msg)


if not DEV.exists():
    mal(f"falta {DEV.relative_to(RAIZ)}: es donde se declaran las dependencias de test")
else:
    dev = DEV.read_text(encoding="utf-8")
    if not re.search(r"^-r\s+requirements\.txt\s*$", dev, re.M):
        mal("requirements-dev.txt no arrastra requirements.txt con `-r`: "
            "instalarlo dejaría el backend sin sus dependencias reales")
    for paquete in IMPRESCINDIBLES:
        # `pytest-asyncio` contiene `pytest`, así que se ancla al principio de línea.
        if not re.search(rf"^{re.escape(paquete)}(==|>=|$)", dev, re.M):
            mal(f"requirements-dev.txt no declara {paquete}")

for fichero, nombre in ((CI, "el workflow de CI"), (GUIA, "CLAUDE.md")):
    if not fichero.exists():
        mal(f"no se encuentra {fichero.relative_to(RAIZ)}")
        continue
    texto = fichero.read_text(encoding="utf-8")
    instalaciones = re.findall(r"pip install [^\n]*", texto)
    if not instalaciones:
        mal(f"{nombre} no instala nada: ¿cómo corre las pruebas?")
        continue
    # Ninguna línea de instalación puede listar los plugins a mano: es lo que
    # hacía que la guía y CI se contaran cosas distintas.
    for linea in instalaciones:
        if "requirements-dev.txt" in linea:
            continue
        if any(re.search(rf"\b{re.escape(p)}\b", linea) for p in IMPRESCINDIBLES):
            mal(f"{nombre} lista dependencias de test a mano en vez de usar "
                f"requirements-dev.txt: «{linea.strip()}»")
    if not any("requirements-dev.txt" in l for l in instalaciones):
        mal(f"{nombre} no instala requirements-dev.txt, así que sus pruebas "
            f"correrán sin los plugins y algunas se reportarán mal")

if fallos:
    print("✗ las dependencias de test no están declaradas en un solo sitio:")
    for f in fallos:
        print(f"   · {f}")
    sys.exit(1)

print("✓ dependencias de test: declaradas en backend/requirements-dev.txt, "
      "y CI y CLAUDE.md apuntan ahí")
