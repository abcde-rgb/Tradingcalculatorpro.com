#!/usr/bin/env bash
# ============================================================================
# Orientación de arranque — TradingCalculator.Pro
#
# Se ejecuta al empezar cada sesión (hook SessionStart en .claude/settings.json).
# Todo lo que imprime entra en el contexto de Claude ANTES del primer mensaje.
#
# Existe porque el estado que más importa es justo el que más deriva, y leerlo
# costaba abrir ficheros enormes: la auditoría del 2026-08-13 encontró 6 PRs y 4
# ramas con trabajo terminado que nadie recordaba. Eso no es un despiste, es
# estructural: si nada te lo dice al arrancar, no te enteras.
#
# REGLAS DE ESTE SCRIPT:
#   - Sin red. Nada de `git ls-remote`, `gh` ni curl: tiene que tardar < 1 s.
#   - Sin datos escritos a mano. Todo se deriva; lo que se escribe a mano, rota.
#   - Nunca falla. Cualquier error se traga y sale 0: un hook roto no puede
#     impedirte trabajar.
# ============================================================================
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

echo "═══ TradingCalculator.Pro — estado al arrancar ═══"

# ── Dónde estás ────────────────────────────────────────────────────────────
rama=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
sucio=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$sucio" = "0" ]; then estado="limpio"; else estado="$sucio fichero(s) sin commitear"; fi
echo "Rama: $rama · árbol: $estado"

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "?")
  behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "?")
  [ "$ahead$behind" != "00" ] && echo "Frente a origin/main: $ahead por delante, $behind por detrás"
fi

# ── Lo que se queda fuera y se olvida ──────────────────────────────────────
# Ramas remotas con commits que main no tiene. Sale de refs LOCALES: si están
# viejas, un `git fetch --prune` las pone al día. Mejor un número aproximado
# ahora que un número exacto que cuesta red.
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  todas=$(git branch -r --no-merged origin/main 2>/dev/null \
    | grep -v 'HEAD\|origin/main\|origin/gh-pages' | sed 's/^ *//')
  deps=$(echo "$todas" | grep -c 'dependabot' || true)
  # La rama actual no cuenta: es el trabajo de esta sesión, no trabajo olvidado.
  producto=$(echo "$todas" | grep -v 'dependabot' | grep -vx "origin/$rama" | grep -c . || true)

  if [ "${producto:-0}" -gt 0 ]; then
    echo ""
    echo "⚠️  $producto rama(s) de producto con trabajo que NO está en main${deps:+ (+ $deps de dependabot)}."
    echo "    Las más recientes:"
    git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:short)' refs/remotes/origin 2>/dev/null \
      | grep -v 'dependabot\|origin/main\|origin/gh-pages\|origin/HEAD' \
      | grep -v "^origin/$rama|" \
      | while IFS='|' read -r ref fecha; do
          n=$(git rev-list --count "origin/main..$ref" 2>/dev/null || echo 0)
          [ "${n:-0}" -gt 0 ] && echo "      · ${ref#origin/}  ($n commits, $fecha)"
        done | head -5
    echo "    Inventario completo: docs/AUDITORIA_REPOSITORIO_2026-08-13.md §2"
  fi
fi

# ── Si la doc se ha quedado atrás ──────────────────────────────────────────
if [ -f docs/ESTADO_PROYECTO.md ]; then
  ver=$(grep -o 'Última verificación real contra el código:\*\* [0-9-]\{10\}' docs/ESTADO_PROYECTO.md 2>/dev/null | grep -o '[0-9-]\{10\}$')
  if [ -n "${ver:-}" ]; then
    hoy=$(date +%Y-%m-%d)
    dias=$(( ( $(date -d "$hoy" +%s 2>/dev/null || echo 0) - $(date -d "$ver" +%s 2>/dev/null || echo 0) ) / 86400 ))
    if [ "${dias:-0}" -ge 7 ]; then
      echo ""
      echo "📅 ESTADO_PROYECTO.md no se verifica contra el código desde hace $dias días ($ver)."
      echo "    Las cifras de §1 y §2 son las que más se desvían."
    fi
  fi
fi

# ── Si el mapa generado se ha quedado atrás ────────────────────────────────
if [ -f docs/MAPA.md ]; then
  mapa=$(stat -c %Y docs/MAPA.md 2>/dev/null || echo 0)
  nuevo=$(find backend frontend/src -name '*.py' -o -name '*.jsx' -o -name '*.js' 2>/dev/null \
    | grep -v node_modules | xargs stat -c %Y 2>/dev/null | sort -rn | head -1)
  if [ "${nuevo:-0}" -gt "${mapa:-0}" ]; then
    echo ""
    echo "🗺️  docs/MAPA.md es más antiguo que el código. Regenéralo: python scripts/gen-mapa.py"
  fi
else
  echo ""
  echo "🗺️  Falta docs/MAPA.md — genéralo con: python scripts/gen-mapa.py"
fi

echo ""
echo "Orientación: docs/ESTADO_PROYECTO.md (estado) · docs/MAPA.md (dónde está cada cosa)"
echo "Las reglas por zona (.claude/rules/) se cargan solas al abrir ficheros de su área."
echo "═════════════════════════════════════════════════"
exit 0
