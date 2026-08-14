#!/usr/bin/env bash
# ============================================================================
# ¿Los verificadores verifican? — el guardián de los guardianes
#
# Por qué existe
# --------------
# El 2026-08-13 aparecieron TRES comprobaciones que no comprobaban nada:
#
#   · `_comprobar_orden_total` del mapa era una tautología: construía las claves
#     de orden incluyendo la ruta del fichero, única por definición, así que
#     pasaba igual con el `sort` arreglado y con el `sort` roto.
#   · Una regla de `auditar.py` no disparaba jamás: al normalizar el markdown se
#     quitaban también los guiones bajos y `trading_plans` se volvía
#     «tradingplans».
#   · `capturas.js` imprimió ✅ treinta y seis veces mientras producía imágenes
#     EN BLANCO, porque servía `index.html` en lugar de cada `.js`.
#
# Las tres se cazaron igual: rompiéndolas a propósito y exigiendo que fallaran.
# Ninguna se habría cazado ejecutándolas y mirando si pasaban — pasaban.
#
# Un verificador que no puede fallar no es un verificador: es un adorno que da
# confianza falsa, que es peor que no tener nada. Esto lo comprueba por método:
# para cada uno, SABOTEAR → debe fallar → REVERTIR → debe pasar.
#
# Uso
# ---
#     bash scripts/probar-verificadores.sh
#
# Sale 1 si algún verificador sobrevive a su sabotaje. Corre en CI.
# ============================================================================
set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || exit 1

FALLOS=0
TEMPORALES=()

# Pase lo que pase —error, Ctrl-C, salida anticipada— el repositorio queda como
# estaba. Un test que ensucia el árbol es un test que nadie vuelve a ejecutar.
limpiar() {
  for f in "${TEMPORALES[@]:-}"; do [ -n "$f" ] && rm -f "$f"; done
  git checkout -- . 2>/dev/null
}
trap limpiar EXIT INT TERM

# Sólo importan los ficheros CON SEGUIMIENTO y modificados: la restauración es
# `git checkout -- .`, que no toca lo que no está en el índice. Bloquear también
# por ficheros nuevos sin seguimiento haría el test inejecutable justo cuando se
# acaba de escribir algo — que es cuando más falta hace.
if [ -n "$(git diff --name-only; git diff --cached --name-only)" ]; then
  echo "✗ Hay cambios sin commitear en ficheros con seguimiento:"
  git diff --name-only | sed 's/^/    /'
  git diff --cached --name-only | sed 's/^/    /'
  echo "  Este test sabotea ficheros y los revierte con 'git checkout --', así que"
  echo "  se llevaría esos cambios por delante. Haz commit o stash antes."
  exit 1
fi

# ── utilidades ──────────────────────────────────────────────────────────────
titulo() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# probar <nombre> <comando> <sabotaje> [restaurar]
#   ⚠️ El <comando> se ejecuta con `eval` en ESTE shell, así que un `cd` suelto
#   dentro de él se filtra y cambia el directorio del resto del script. Pasó: el
#   test de i18n llevaba `cd frontend && …`, y a partir de ahí el sabotaje
#   siguiente creaba su fichero en una ruta inexistente y el verificador parecía
#   no detectarlo. Cualquier comando que cambie de directorio va entre
#   paréntesis.
#   Comprueba que <comando> PASA, luego aplica <sabotaje>, comprueba que FALLA,
#   restaura y comprueba que vuelve a PASAR. Las tres cosas importan: si no
#   volviera a pasar, el sabotaje habría dejado residuo y el siguiente test
#   mediría otra cosa.
probar() {
  local nombre="$1" comando="$2" sabotaje="$3" restaurar="${4:-git checkout -- .}"

  if ! eval "$comando" >/dev/null 2>&1; then
    echo "  ⚠️  $nombre: no pasa ni ANTES de sabotear — hay algo roto de verdad"
    FALLOS=$((FALLOS + 1)); return
  fi

  eval "$sabotaje" >/dev/null 2>&1

  if eval "$comando" >/dev/null 2>&1; then
    echo "  ❌ $nombre: SOBREVIVE al sabotaje — no está verificando nada"
    FALLOS=$((FALLOS + 1))
  else
    echo "  ✅ $nombre: detecta el sabotaje"
  fi

  eval "$restaurar" >/dev/null 2>&1
  eval "$comando" >/dev/null 2>&1 || {
    echo "  ❌ $nombre: NO vuelve a pasar tras restaurar — el sabotaje dejó residuo"
    FALLOS=$((FALLOS + 1))
  }
}

echo "═══ ¿Los verificadores verifican? ═══"

# ── El mapa detecta que el código cambió ────────────────────────────────────
titulo "docs/MAPA.md (scripts/gen-mapa.py --check)"

probar "ruta nueva en el backend" \
  "python scripts/gen-mapa.py --check" \
  "printf '\n\n@api_router.get(\"/sabotaje\")\nasync def sabotaje():\n    return {}\n' >> backend/timeframes.py"

MODULO_FALSO="backend/zz_sabotaje.py"
TEMPORALES+=("$MODULO_FALSO")
probar "módulo nuevo en el backend" \
  "python scripts/gen-mapa.py --check" \
  "printf '\"\"\"Modulo de sabotaje.\"\"\"\n' > $MODULO_FALSO" \
  "rm -f $MODULO_FALSO"

probar "ruta nueva en el frontend" \
  "python scripts/gen-mapa.py --check" \
  "python -c \"
import pathlib
p = pathlib.Path('frontend/src/App.js'); t = p.read_text()
p.write_text(t.replace('<Route path=\\\"/about\\\"', '<Route path=\\\"/sabotaje\\\" element={<X />} />\n<Route path=\\\"/about\\\"', 1))\""

# El fallo que rompió CI el primer día: una clave de orden PARCIAL hace que el
# fichero generado dependa del orden del sistema de ficheros.
probar "orden no total (el fallo real que rompió CI)" \
  "python scripts/gen-mapa.py" \
  "python -c \"
import pathlib
p = pathlib.Path('scripts/gen-mapa.py'); t = p.read_text()
p.write_text(t.replace('_CLAVE_TAMANO = lambda x: (-x[1], x[0])', '_CLAVE_TAMANO = lambda x: (-x[1],)', 1))\""

# ── El catálogo de instrumentos ─────────────────────────────────────────────
titulo "Catálogo backend ↔ frontend (gen-instruments-js.py --check)"
probar "el catálogo del backend cambia y el generado no" \
  "python scripts/gen-instruments-js.py --check" \
  "python -c \"
import pathlib, re
p = pathlib.Path('backend/instruments.py'); t = p.read_text()
m = re.search(r'\\\"contract_size\\\":\\s*([0-9.]+)', t)
if m: p.write_text(t[:m.start(1)] + '777.0' + t[m.end(1):])\""

# ── Los enlaces de la documentación ─────────────────────────────────────────
titulo "Enlaces de la doc (check-doc-links.py)"
probar "enlace a un documento inexistente" \
  "python scripts/check-doc-links.py" \
  "printf '\n[enlace roto](./NO_EXISTE_SABOTAJE.md)\n' >> docs/README.md"

# ── Paridad de idiomas ──────────────────────────────────────────────────────
titulo "Paridad i18n (i18n-check.js)"
if [ -d frontend/node_modules ]; then
  probar "una clave que falta en un idioma" \
    "(cd frontend && node scripts/i18n-check.js)" \
    "python -c \"
import pathlib, re
p = pathlib.Path('frontend/src/lib/i18n/en.js'); t = p.read_text()
m = re.search(r'\n  \\\"[A-Za-z0-9_]+\\\": .*?,\n', t)
if m: p.write_text(t[:m.start()] + '\n' + t[m.end():])\""
else
  echo "  ⏭️  i18n-check: sin node_modules (ejecuta scripts/preparar-entorno.sh)"
fi

# ── La auditoría detecta lo que dice detectar ───────────────────────────────
titulo "Auditoría (auditar.py --estricto)"
COMPONENTE_MUERTO="frontend/src/components/ZzSabotajeHuerfano.jsx"
TEMPORALES+=("$COMPONENTE_MUERTO")
# ⚠️ Sin tubería a propósito. `auditar.py --estricto` sale 1 cuando hay
# hallazgos, y con `set -o pipefail` la tubería hereda ESE código en vez del del
# `grep`: el test daba «SOBREVIVE» mientras la auditoría detectaba el componente
# perfectamente. El verificador estaba bien; la fontanería del test, no.
INFORME=$(mktemp)
TEMPORALES+=("$INFORME")
probar "un componente que nadie importa" \
  "python scripts/auditar.py > $INFORME 2>/dev/null; ! grep -q ZzSabotajeHuerfano $INFORME" \
  "printf 'export const ZzSabotajeHuerfano = () => null;\n' > $COMPONENTE_MUERTO" \
  "rm -f $COMPONENTE_MUERTO"

# ── Veredicto ───────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
if [ "$FALLOS" -eq 0 ]; then
  echo "✅ Todos los verificadores fallan cuando deben fallar."
  echo "   (Que es la única prueba de que sirven para algo.)"
else
  echo "❌ $FALLOS verificador(es) no detectan su propio sabotaje."
  echo "   Un verificador que no puede fallar da confianza falsa: es peor que"
  echo "   no tenerlo, porque nadie vuelve a mirar lo que dice cubrir."
fi
exit "$FALLOS"
