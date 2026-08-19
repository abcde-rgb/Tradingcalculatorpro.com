#!/usr/bin/env python3
"""Verifica que los enlaces relativos entre documentos apuntan a algo real.

Por qué existe: la documentación de este repo se referencia mucho a sí misma
(`ESTADO_PROYECTO` → `DEPLOY_CHECKLIST` → `DIARIO_BUGS` → …), y mover un archivo
rompe esos enlaces en silencio. Ya pasó: `docs/ESTADO_PROYECTO.md` citaba
`docs/PLAN_DE_TRADING_spec.md`, que no existía, y nada lo detectó.

Comprueba sólo enlaces **relativos a archivos del repo**. No toca la red, así que
corre en el sandbox y en CI igual de bien.

Uso:
    python scripts/check-doc-links.py            # todo el repo
    python scripts/check-doc-links.py docs/      # una carpeta

Salida: 0 si todo resuelve; 1 y la lista de roturas si no.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Carpetas que no son documentación nuestra
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "build", "dist",
             ".pytest_cache", "coverage"}

# [texto](destino) — se ignoran los que empiezan por protocolo, ancla o mailto
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
EXTERNAL = ("http://", "https://", "mailto:", "tel:", "#", "data:")


def iter_markdown(base: Path):
    for path in sorted(base.rglob("*.md")):
        if not any(part in SKIP_DIRS for part in path.parts):
            yield path


def check(base: Path) -> list[tuple[Path, int, str]]:
    broken: list[tuple[Path, int, str]] = []
    for doc in iter_markdown(base):
        # Los bloques de código NO llevan enlaces: lo que hay dentro es texto que
        # se muestra tal cual. Sin esta guarda, cualquier documento que enseñe una
        # expresión regular queda marcado como roto — un `[a-z0-9-]+` seguido de
        # un paréntesis de grupo tiene exactamente la forma de `[texto](destino)`.
        # Pasó al documentar cómo se mide la academia, y el fallo apuntaba a una
        # línea que no contenía ningún enlace.
        en_bloque = False
        for lineno, line in enumerate(doc.read_text(encoding="utf-8").splitlines(), 1):
            if line.lstrip().startswith("```"):
                en_bloque = not en_bloque
                continue
            if en_bloque:
                continue
            for target in LINK_RE.findall(line):
                if target.startswith(EXTERNAL):
                    continue
                # Un ancla dentro del mismo archivo (fichero.md#seccion): sólo el fichero
                file_part = target.split("#", 1)[0]
                if not file_part:
                    continue
                resolved = (doc.parent / file_part).resolve()
                if not resolved.exists():
                    broken.append((doc.relative_to(ROOT), lineno, target))
    return broken


def main() -> int:
    base = ROOT / sys.argv[1] if len(sys.argv) > 1 else ROOT
    if not base.exists():
        print(f"no existe: {base}")
        return 1

    docs = list(iter_markdown(base))
    broken = check(base)

    print(f"enlaces de doc — {len(docs)} documentos revisados en {base.relative_to(ROOT) or '.'}/")
    if not broken:
        print("✅ todos los enlaces relativos resuelven")
        return 0
    print(f"❌ {len(broken)} enlace(s) roto(s):")
    for doc, lineno, target in broken:
        print(f"   {doc}:{lineno} → {target}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
