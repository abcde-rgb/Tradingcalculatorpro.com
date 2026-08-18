#!/usr/bin/env python3
"""Investiga qué rasgos del escáner aportan de verdad, sobre un activo REAL.

Este es el guion que hay que correr donde HAYA red. En el sandbox remoto los
proveedores de precio están bloqueados por política de egreso (403 en el
CONNECT: Yahoo, Binance, Kraken y Stooq), así que el motor se desarrolló y se
validó contra series sintéticas de respuesta conocida — pero los números de tu
oro y tu BTC sólo salen aquí.

    python scripts/investigar-rasgos.py GC=F --periodo 5y --intervalo 1d
    python scripts/investigar-rasgos.py BTC-USD --periodo 2y --barajados 20
    python scripts/investigar-rasgos.py GC=F --buscar-config

Qué contesta
------------
· Qué rasgos separan los resultados por encima de lo que separaría el azar,
  corregido por haberlos mirado todos (Holm–Bonferroni).
· Cuánto se separa cada valor de cada rasgo, con su muestra y su intervalo.
· Con `--buscar-config`: la mejor combinación de horizonte, fuerza y tolerancia,
  ELEGIDA en la primera mitad de la serie y medida UNA sola vez en la segunda.

Lo que NO contesta
------------------
Si el resultado sirve para operar. Que un rasgo separe en el histórico no dice
que vaya a seguir separando; dice que separó. Por eso la búsqueda de
configuración publica `holds_out_of_sample`: si sale `False`, lo que se encontró
era ruido con suerte.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from level_research import buscar_configuracion, investigar  # noqa: E402
from stock_data import get_ohlc_history  # noqa: E402


def barra_ventaja(v: float, ancho: int = 24) -> str:
    """Una barra de texto centrada en cero, para leer el signo de un vistazo."""
    medio = ancho // 2
    n = max(-medio, min(medio, int(round(v / 40 * medio))))
    if n >= 0:
        return " " * medio + "█" * n + " " * (medio - n)
    return " " * (medio + n) + "█" * (-n) + " " * medio


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("simbolo", help="Símbolo del proveedor (GC=F para oro, BTC-USD…)")
    ap.add_argument("--periodo", default="5y")
    ap.add_argument("--intervalo", default="1d")
    ap.add_argument("--horizonte", type=int, default=10)
    ap.add_argument("--fuerza", type=int, default=2)
    ap.add_argument("--tolerancia", type=float, default=0.008)
    ap.add_argument("--barajados", type=int, default=15,
                    help="Series barajadas para la línea base. 0 = sin línea "
                         "base, y entonces NO se publica ninguna ventaja.")
    ap.add_argument("--buscar-config", action="store_true",
                    help="Busca la mejor configuración dentro de muestra y la "
                         "valida una sola vez fuera.")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    print(f"Bajando {args.simbolo} · {args.periodo} · {args.intervalo}…",
          file=sys.stderr)
    filas = get_ohlc_history(args.simbolo, args.periodo, args.intervalo)
    if not filas:
        print("✗ el proveedor no devolvió datos. En el sandbox remoto está "
              "bloqueado por política de egreso: corre esto donde haya red.",
              file=sys.stderr)
        return 1
    print(f"  {len(filas)} barras: {filas[0]['date']} → {filas[-1]['date']}",
          file=sys.stderr)

    if args.buscar_config:
        r = buscar_configuracion(filas)
        if args.json:
            print(json.dumps(r, indent=2, default=str))
            return 0
        if r.get("error"):
            print(f"✗ {r['error']}")
            return 1
        e = r["chosen"]
        print(f"\n═══ Búsqueda de configuración · {args.simbolo} ═══")
        print(f"  combinaciones probadas: {r['trials']}")
        print(f"  dentro de muestra: {r['in_sample_bars']} barras · "
              f"fuera: {r['out_of_sample_bars']}")
        print(f"\n  ELEGIDA dentro: horizonte {e['horizon']} · fuerza "
              f"{e['strength']} · tolerancia {e['tolerance']}")
        print(f"    mejor rasgo: {e['best_feature']} (p={e['p']:.2e})")
        o = r["out_of_sample"]
        print(f"\n  FUERA de muestra: {o['observations']} observaciones")
        print(f"    supervivientes: {o['survivors'] or 'NINGUNO'}")
        print(f"\n  ¿aguanta fuera?  {'SÍ' if r['holds_out_of_sample'] else 'NO'}")
        if not r["holds_out_of_sample"]:
            print("    Lo que se eligió dentro no se sostiene fuera. Con "
                  f"{r['trials']} intentos, encontrar algo dentro era esperable "
                  "por suerte: esto dice que era eso.")
        return 0

    r = investigar(filas, horizonte=args.horizonte, strength=args.fuerza,
                   tolerance=args.tolerancia, barajados=args.barajados)
    if args.json:
        print(json.dumps(r, indent=2, default=str))
        return 0

    if r.get("error"):
        print(f"✗ {r['error']}")
        return 1

    print(f"\n═══ Rasgos que separan · {args.simbolo} "
          f"{args.intervalo} ═══")
    print(f"  {r['observations']} montajes medidos sobre {r['bars']} barras · "
          f"horizonte {r['horizon']} · {args.barajados} barajados")
    print(f"  {r['features_tested']} rasgos probados, corregidos por "
          f"{r['correction']}\n")

    if not args.barajados:
        print("  ⚠️ Sin barajados no hay línea base: no se publica ventaja "
              "ninguna, porque sin ella lo que se mediría es geometría.\n")

    print(f"  {'rasgo':20} {'valor':14} {'n':>5} {'obs':>7} {'azar':>7} "
          f"{'ventaja':>8}  {'':^24} {'p':>10}  Holm")
    for e in r["features"]:
        b = e.get("best")
        if not b:
            print(f"  {e['feature']:20} {'(sin grupo con muestra)':<14}")
            continue
        v = b.get("edge")
        holm = "✔ SOBREVIVE" if e["holm"].get("survives") else "—"
        print(f"  {e['feature']:20} {str(b['value']):14} {b['n']:5} "
              f"{b['freq']['p']:6.1f}% {str(b['null_freq'] or '—'):>7} "
              f"{(f'{v:+.1f}' if v is not None else '—'):>8}  "
              f"{barra_ventaja(v) if v is not None else ' ' * 24} "
              f"{b['p']:10.2e}  {holm}")

    print(f"\n  SUPERVIVIENTES: {r['survivors'] or 'NINGUNO'}")
    if not r["survivors"]:
        print("    Con este histórico, ninguno de los rasgos separa por encima "
              "de lo que separaría el azar. Es un resultado, no un fallo: dice "
              "que no hay nada que publicar como probabilidad.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
