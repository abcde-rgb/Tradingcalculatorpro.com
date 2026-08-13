#!/usr/bin/env bash
# ============================================================================
# Prepara el entorno para que la verificación se pueda EJECUTAR, no sólo citar.
#
# Por qué existe
# --------------
# En una sesión de Claude Code en la web el contenedor viene sin dependencias.
# De los ocho verificadores del proyecto, tres —`pytest` (761 funciones),
# `eslint` y `npm run build`— simplemente no podían correr, y sin `node_modules`
# tampoco había Playwright, así que tampoco capturas. El resultado era que cada
# cambio se subía con los tests sin comprobar y el fallo aparecía tres minutos
# después, en rojo, en un PR.
#
# Dónde se engancha
# -----------------
# En el campo **Setup script** del entorno, en claude.ai/code (selector de
# entorno → icono de ajustes). Corre como root en Ubuntu 24.04 ANTES de que
# arranque Claude, y Anthropic guarda después una instantánea del disco: se
# ejecuta una vez y todas las sesiones siguientes ya nacen con esto instalado.
# No es un coste por sesión.
#
# Las tres reglas de un setup script, que este cumple:
#   1. Tiene que salir 0. Si falla, la sesión no arranca → todo lleva `|| true`.
#      Una caída de npm no puede dejarte sin poder trabajar.
#   2. Tiene que acabar en ~5 minutos → los dos instaladores van en PARALELO.
#   3. Necesita red a los registros → cubierto por el nivel «Trusted».
#
# Uso manual (también sirve en local, o para reparar una sesión):
#     bash scripts/preparar-entorno.sh
# ============================================================================
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ" || exit 0

echo "═══ Preparando el entorno de TradingCalculator.Pro ═══"
inicio=$(date +%s)

# ── Backend ────────────────────────────────────────────────────────────────
# En venv aislado a propósito: el `PyJWT` del sistema (Debian/Ubuntu) choca con
# el fijado en requirements.txt, y ese choque ya costó una sesión.
preparar_backend() {
  echo "[backend] creando venv e instalando…"
  python3 -m venv backend/.venv 2>/dev/null || python -m venv backend/.venv 2>/dev/null || {
    echo "[backend] ⚠️  no se pudo crear el venv"; return 0; }
  backend/.venv/bin/pip install --quiet --upgrade pip 2>/dev/null
  if backend/.venv/bin/pip install --quiet -r backend/requirements.txt pytest 2>&1 | tail -3; then
    echo "[backend] ✅ dependencias + pytest"
  else
    echo "[backend] ⚠️  la instalación falló; la sesión arranca igual"
  fi
}

# ── Frontend ───────────────────────────────────────────────────────────────
# `--legacy-peer-deps` es obligatorio: React 19 con dependencias que todavía
# declaran 18 en sus peerDependencies. Sin la bandera, npm aborta.
preparar_frontend() {
  echo "[frontend] npm ci…"
  if (cd frontend && npm ci --legacy-peer-deps --no-audit --no-fund > /tmp/npm-ci.log 2>&1); then
    echo "[frontend] ✅ node_modules"
  else
    echo "[frontend] ⚠️  npm ci falló (últimas líneas):"
    tail -5 /tmp/npm-ci.log 2>/dev/null | sed 's/^/           /'
  fi
}

# En paralelo: es lo que hace que quepa en los cinco minutos.
preparar_backend &
PID_BACK=$!
preparar_frontend &
PID_FRONT=$!
wait $PID_BACK $PID_FRONT

# ── Playwright: sólo enlazar, NUNCA descargar ──────────────────────────────
# Chromium ya viene en la imagen. `playwright install` volvería a bajarlo
# entero, tardaría de más y reventaría el límite de tiempo del setup script.
if [ -d /opt/pw-browsers ]; then
  echo "[capturas] ✅ Chromium ya en la imagen (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers)"
else
  echo "[capturas] ⚠️  no encuentro /opt/pw-browsers; las capturas no funcionarán"
fi

# ── Qué ha quedado realmente disponible ────────────────────────────────────
echo ""
echo "═══ Verificadores disponibles ═══"
comprobar() {  # nombre · comando de prueba
  if eval "$2" >/dev/null 2>&1; then echo "  ✅ $1"; else echo "  ❌ $1 — no disponible"; fi
}
comprobar "py_compile"        "cd backend && python -m py_compile server.py"
comprobar "pytest"            "backend/.venv/bin/python -c 'import pytest'"
comprobar "import del backend" "backend/.venv/bin/python -c 'import fastapi, asyncpg'"
comprobar "eslint"            "test -x frontend/node_modules/.bin/eslint"
comprobar "npm run build"     "test -d frontend/node_modules/react-scripts -o -d frontend/node_modules/@craco"
comprobar "i18n-check"        "node --version"
comprobar "gen-mapa"          "python3 scripts/gen-mapa.py --check"

echo ""
echo "Listo en $(( $(date +%s) - inicio ))s. Atajo de verificación: /verify"
exit 0   # SIEMPRE 0: un fallo de instalación no puede impedir que arranques
