#!/usr/bin/env python3
"""Que `docs/RUTAS_MUERTAS.md` y el código digan lo mismo, en las dos direcciones.

Por qué existe
--------------
`gen-mapa.py` ya detecta las rutas sin consumidor y las cuenta en `docs/MAPA.md`.
Pero contar no frena nada: el día que alguien añade un endpoint que ninguna
pantalla llama, el número sube de 38 a 39, se regenera el mapa y CI se pone
verde. La deuda crece sin que nadie tenga que decidir nada.

Aquí cada ruta muerta lleva una **decisión escrita** —BORRAR, CONSTRUIR o
ARREGLAR— y esto comprueba que la tabla no se despegue del código:

  · una ruta que se queda sin consumidor y no está en la tabla → falla, y hay
    que escribir qué se hace con ella;
  · una fila cuya ruta ya tiene pantalla → falla, y hay que quitarla, que es el
    fallo que de verdad pudre las listas: la de `trading_plan` estuvo en la de
    muertas después de tener pantalla, y sólo se cazó porque `gen-mapa.py` tiene
    controles.

La detección no se reimplementa: se importa de `gen-mapa.py`, cuyo `se_consume`
está validado contra 19 rutas de destino conocido. Dos detectores distintos
serían dos oportunidades de equivocarse.

Uso
---
    python scripts/check-rutas-muertas.py
"""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
TABLA = RAIZ / "docs" / "RUTAS_MUERTAS.md"

DECISIONES = ("BORRAR", "CONSTRUIR", "ARREGLAR")

# `| `GET` | `/api/quote/{symbol}` | CONSTRUIR | ... |`
FILA = re.compile(
    r"^\|\s*`(?P<metodo>[A-Z]+)`\s*\|\s*`(?P<ruta>/api/[^`]+)`\s*"
    r"\|\s*(?P<decision>[A-ZÁÉÍÓÚ]+)\s*\|"
)


def _gen_mapa():
    """El módulo `gen-mapa.py`, cuyo nombre no es un identificador de Python."""
    ruta = RAIZ / "scripts" / "gen-mapa.py"
    spec = importlib.util.spec_from_file_location("gen_mapa", ruta)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def muertas_segun_el_codigo(gm) -> set[tuple[str, str]]:
    """Las rutas sospechosas de ahora mismo: (método, /api/ruta).

    Se excluyen las huérfanas por diseño —webhooks, sonda de salud, panel de
    admin—, que es la misma separación que hace el mapa.
    """
    blob = gm.blob_frontend()
    return {
        (r["metodo"], f"/api{r['path']}")
        for r in gm.rutas()
        if not gm.se_consume(r["path"], blob) and not gm.por_que_huerfana(r)
    }


# El documento tiene prosa y tablas de contexto —el histórico de bajas, por
# ejemplo— cuyas filas también empiezan por «| `». Sólo cuenta lo que va DESPUÉS
# de este encabezado, que es donde viven las decisiones. Sin acotarlo, una tabla
# explicativa nueva rompe el verificador y la tentación es relajar el patrón,
# que es justo lo que haría dejar pasar una fila de decisión mal escrita.
ENCABEZADO_DECISIONES = "## Las decisiones"


def decididas_en_la_tabla() -> tuple[dict[tuple[str, str], str], list[str]]:
    """Lo que dice la tabla: {(método, ruta): decisión}, y las filas ilegibles."""
    decididas: dict[tuple[str, str], str] = {}
    malas: list[str] = []
    texto = TABLA.read_text(encoding="utf-8")
    if ENCABEZADO_DECISIONES not in texto:
        return {}, [f"docs/RUTAS_MUERTAS.md: falta el encabezado «{ENCABEZADO_DECISIONES}», "
                    "sin el cual no se sabe qué filas son decisiones"]
    corte = texto.index(ENCABEZADO_DECISIONES)
    saltadas = texto[:corte].count("\n")
    for n, linea in enumerate(texto[corte:].splitlines(), saltadas + 1):
        if not linea.startswith("| `"):
            continue
        m = FILA.match(linea)
        if not m:
            malas.append(f"docs/RUTAS_MUERTAS.md:{n}: fila que no se entiende — {linea[:70]}")
            continue
        if m["decision"] not in DECISIONES:
            malas.append(f"docs/RUTAS_MUERTAS.md:{n}: decisión «{m['decision']}» "
                         f"no es una de {', '.join(DECISIONES)}")
            continue
        decididas[(m["metodo"], m["ruta"])] = m["decision"]
    return decididas, malas


def main() -> int:
    gm = _gen_mapa()
    codigo = muertas_segun_el_codigo(gm)
    tabla, malas = decididas_en_la_tabla()

    sin_decidir = sorted(codigo - set(tabla))
    ya_vivas = sorted(set(tabla) - codigo)

    if malas:
        print("✗ la tabla tiene filas que no se pueden leer:")
        for m in malas:
            print(f"    {m}")

    if sin_decidir:
        print(f"✗ {len(sin_decidir)} ruta(s) sin consumidor y sin decisión:")
        for metodo, ruta in sin_decidir:
            print(f"    {metodo:7} {ruta}")
        print("  Ninguna pantalla las llama. Añádelas a docs/RUTAS_MUERTAS.md con")
        print(f"  su decisión ({' / '.join(DECISIONES)}) y el motivo, o dales pantalla.")

    if ya_vivas:
        print(f"✗ {len(ya_vivas)} fila(s) de la tabla que ya NO están muertas:")
        for metodo, ruta in ya_vivas:
            print(f"    {metodo:7} {ruta}   ({tabla[(metodo, ruta)]})")
        print("  El frontend ya las llama, o han dejado de existir. Quítalas de")
        print("  docs/RUTAS_MUERTAS.md: una lista de deuda que no se vacía no vale nada.")

    if malas or sin_decidir or ya_vivas:
        return 1

    reparto = {d: sum(1 for v in tabla.values() if v == d) for d in DECISIONES}
    print(f"✓ {len(tabla)} rutas sin consumidor, todas decididas "
          f"({', '.join(f'{d.lower()} {n}' for d, n in reparto.items())})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
