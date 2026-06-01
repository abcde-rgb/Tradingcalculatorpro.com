#!/usr/bin/env python3
"""
TradingCalculator.Pro — Runner Principal + Auto-update DIARIO_BUGS.md

Ejecuta todos los tests y añade automáticamente los resultados al
DIARIO_BUGS.md en el repositorio.

Uso:
    python tests/run_and_report.py
    python tests/run_and_report.py --url https://mi-backend.run.app
    python tests/run_and_report.py --no-diary   # solo imprime, no actualiza archivo

Requiere:
    pip install requests
"""

import sys
import os
import argparse
from datetime import datetime
from pathlib import Path

# Añadir el directorio raíz al path para importar los módulos de test
sys.path.insert(0, str(Path(__file__).parent))

from test_all_endpoints import run_all_tests, BASE_URL as DEFAULT_URL
from test_frontend_consistency import run_consistency_check


def generate_diary_entry(endpoint_results: list,
                         consistency_results: dict,
                         run_date: str,
                         backend_url: str) -> str:
    """Genera una entrada formateada para el DIARIO_BUGS.md."""
    total      = len(endpoint_results)
    passed     = sum(1 for r in endpoint_results if r["passed"])
    failed     = total - passed
    pct        = round(passed / total * 100) if total > 0 else 0
    missing_routes = consistency_results.get("missing", [])
    health_ok  = any(r["name"] == "health" and r["passed"] for r in endpoint_results)

    status_icon = "✅" if pct >= 90 else ("⚠️" if pct >= 60 else "🔴")

    lines = []
    lines.append(f"\n---\n")
    lines.append(f"### [{run_date}] AUTO-TEST — {status_icon} {passed}/{total} tests pasados ({pct}%)")
    lines.append(f"**Backend:** `{backend_url}`  ")
    lines.append(f"**Ejecutado:** {run_date}  ")
    lines.append(f"**Estado general:** {'🟢 Backend operativo' if health_ok else '🔴 Backend no responde'}  ")
    lines.append(f"")

    if failed > 0:
        lines.append(f"**Tests fallidos ({failed}):**")
        for r in endpoint_results:
            if not r["passed"]:
                lines.append(f"- ❌ `{r['method']} {r['path']}` — {r['reason']}")
        lines.append("")
    else:
        lines.append("**Todos los tests pasaron.** ✅  ")
        lines.append("")

    if missing_routes:
        lines.append(f"**Rutas faltantes en backend ({len(missing_routes)}):**")
        for r in missing_routes:
            lines.append(f"- ❌ `{r['method']} {r['path']}` — {r['note']}")
        lines.append("")
    else:
        lines.append("**Consistencia frontend↔backend:** ✅ Todas las rutas verificadas  ")
        lines.append("")

    lines.append(f"*Test automático ejecutado por `tests/run_and_report.py`*")
    return "\n".join(lines)


def update_diary(entry: str, diary_path: Path):
    """Inserta la nueva entrada en la sección de resultados del diario."""
    if not diary_path.exists():
        print(f"⚠️  No se encontró {diary_path} — creando archivo nuevo")
        diary_path.write_text(
            "# 📋 DIARIO DE BUGS & FIXES — TradingCalculator.Pro\n\n"
            "## 🤖 RESULTADOS DE TESTS AUTOMÁTICOS\n" + entry + "\n",
            encoding="utf-8"
        )
        return

    content = diary_path.read_text(encoding="utf-8")
    section = "## 🤖 RESULTADOS DE TESTS AUTOMÁTICOS"

    if section in content:
        # Insertar después del header de la sección
        idx = content.index(section) + len(section)
        content = content[:idx] + "\n" + entry + content[idx:]
    else:
        # Añadir sección al final
        content = content + f"\n\n{section}\n" + entry

    diary_path.write_text(content, encoding="utf-8")
    print(f"✅ DIARIO_BUGS.md actualizado: {diary_path.resolve()}")


def main():
    parser = argparse.ArgumentParser(
        description="TradingCalculator.Pro — Test Suite Completo")
    parser.add_argument("--url", default=DEFAULT_URL,
                        help="URL base del backend")
    parser.add_argument("--no-diary", action="store_true",
                        help="No actualizar DIARIO_BUGS.md")
    args = parser.parse_args()

    # Actualizar la URL en los módulos importados
    import test_all_endpoints
    import test_frontend_consistency
    test_all_endpoints.BASE_URL = args.url.rstrip("/")
    test_frontend_consistency.BASE_URL = args.url.rstrip("/")

    run_date = datetime.now().strftime("%Y-%m-%d %H:%M")

    print("\n" + "#" * 80)
    print("  INICIANDO TEST SUITE COMPLETO")
    print("#" * 80)

    # 1. Tests de endpoints
    endpoint_results = run_all_tests()

    # 2. Consistencia frontend ↔ backend
    print("\n" + "#" * 80)
    print("  COMPROBANDO CONSISTENCIA FRONTEND ↔ BACKEND")
    print("#" * 80)
    consistency_results = run_consistency_check()

    # 3. Actualizar diario
    if not args.no_diary:
        entry = generate_diary_entry(
            endpoint_results, consistency_results,
            run_date, args.url)
        diary_path = Path(__file__).parent.parent / "DIARIO_BUGS.md"
        update_diary(entry, diary_path)
    else:
        print("\n⚠️  --no-diary activo: no se actualizó DIARIO_BUGS.md")

    # Exit code
    total  = len(endpoint_results)
    passed = sum(1 for r in endpoint_results if r["passed"])
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
