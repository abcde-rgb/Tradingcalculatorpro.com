#!/usr/bin/env bash
# Levanta el banco de pruebas: Postgres + backend + el build servido como en producción.
#
# Es idempotente: si algo ya está en pie, no lo toca. Eso importa porque el
# contenedor de una sesión remota se duerme y hay que rearrancar a mitad de
# trabajo, y entonces lo último que quieres es que el script se pelee con lo
# que sigue vivo.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BD="${QA_BD:-trading_dev}"
BD_USUARIO="${QA_BD_USUARIO:-$(whoami)}"
PUERTO_API="${QA_PUERTO_API:-8080}"
PUERTO_WEB="${QA_PUERTO_WEB:-3100}"
ESTADO="${QA_ESTADO:-$RAIZ/.qa-estado}"
mkdir -p "$ESTADO"

verde() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
aviso() { printf '  \033[33m!\033[0m %s\n' "$1"; }

# ── 1 · Postgres ─────────────────────────────────────────────────────────
# pg_ctl se niega a correr como root, así que va por `su postgres`. El socket
# Unix no es un capricho: `init_pool` trata cualquier host TCP como si fuera
# Neon y exige SSL, y contra un Postgres local sin SSL falla con
# CERTIFICATE_VERIFY_FAILED. Por socket sí conecta (asyncpg no negocia TLS ahí).
if pg_isready -q 2>/dev/null; then
  verde "Postgres ya estaba en pie"
else
  VERSION="$(ls /usr/lib/postgresql 2>/dev/null | sort -n | tail -1)"
  if [ -z "$VERSION" ]; then
    echo "  ✗ no hay Postgres instalado en /usr/lib/postgresql" >&2
    exit 1
  fi
  su postgres -c "/usr/lib/postgresql/$VERSION/bin/pg_ctl \
      -D /var/lib/postgresql/$VERSION/main -l /tmp/pg.log \
      -o '-c config_file=/etc/postgresql/$VERSION/main/postgresql.conf' start" \
    >/dev/null 2>&1
  for _ in $(seq 1 20); do pg_isready -q 2>/dev/null && break; sleep 0.5; done
  pg_isready -q 2>/dev/null && verde "Postgres $VERSION arrancado" \
    || { echo "  ✗ Postgres no arrancó (ver /tmp/pg.log)" >&2; exit 1; }
fi

# El rol tiene que coincidir con el usuario del sistema: la autenticación por
# socket es `peer`, así que un rol con otro nombre no entra jamás.
su postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='$BD_USUARIO'\"" \
  2>/dev/null | grep -q 1 \
  || su postgres -c "createuser -s '$BD_USUARIO'" 2>/dev/null \
  && verde "rol '$BD_USUARIO' disponible"
psql -U "$BD_USUARIO" -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "$BD" \
  || createdb -U "$BD_USUARIO" "$BD" 2>/dev/null
verde "base '$BD' disponible"

# ── 2 · Backend ──────────────────────────────────────────────────────────
if curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_API/api/performance/instruments"; then
  verde "backend ya respondía en :$PUERTO_API"
else
  VENV="${QA_VENV:-$ESTADO/venv}"
  if [ ! -x "$VENV/bin/uvicorn" ]; then
    aviso "creando entorno de Python (sólo la primera vez)"
    python3 -m venv "$VENV" >/dev/null 2>&1
    "$VENV/bin/pip" install -q -r "$RAIZ/backend/requirements.txt" pytest >/dev/null 2>&1
  fi
  # CORS con el puerto donde se sirve el frontend, o el navegador bloquea el
  # login antes de que la prueba llegue a medir nada.
  ENVIRONMENT=development \
  JWT_SECRET="${QA_JWT_SECRET:-devonly}" \
  ADMIN_EMAILS="${QA_ADMIN:-qa@test.local}" \
  DATABASE_URL="postgresql://$BD_USUARIO@/$BD?host=/var/run/postgresql" \
  CORS_ORIGINS="http://localhost:$PUERTO_WEB,http://127.0.0.1:$PUERTO_WEB" \
  nohup "$VENV/bin/uvicorn" server:app --host 127.0.0.1 --port "$PUERTO_API" \
    --app-dir "$RAIZ/backend" > "$ESTADO/backend.log" 2>&1 &
  echo $! > "$ESTADO/backend.pid"
  for _ in $(seq 1 40); do
    curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_API/api/performance/instruments" && break
    sleep 1
  done
  curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_API/api/performance/instruments" \
    && verde "backend en :$PUERTO_API" \
    || { echo "  ✗ el backend no respondió (ver $ESTADO/backend.log)" >&2; exit 1; }
fi

# ── 3 · El frontend, servido como en producción ──────────────────────────
if [ ! -f "$RAIZ/frontend/build/index.html" ]; then
  aviso "no hay build; compilando (tarda unos minutos)"
  ( cd "$RAIZ/frontend" && env REACT_APP_BACKEND_URL="http://127.0.0.1:$PUERTO_API" \
      GENERATE_SOURCEMAP=false CI=false npx craco build > "$ESTADO/build.log" 2>&1 ) \
    || { echo "  ✗ el build falló (ver $ESTADO/build.log)" >&2; exit 1; }
fi
if curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_WEB/Tradingcalculatorpro.com/"; then
  verde "servidor estático ya respondía en :$PUERTO_WEB"
else
  QA_PUERTO_WEB="$PUERTO_WEB" nohup node "$RAIZ/tests/e2e/stack/servidor.js" \
    > "$ESTADO/servidor.log" 2>&1 &
  echo $! > "$ESTADO/servidor.pid"
  sleep 2
  curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_WEB/Tradingcalculatorpro.com/" \
    && verde "frontend en :$PUERTO_WEB" \
    || { echo "  ✗ el servidor estático no respondió" >&2; exit 1; }
fi

# ── 4 · Chromium ─────────────────────────────────────────────────────────
if [ ! -d "$RAIZ/tests/e2e/lib/playwright-core" ]; then
  aviso "instalando playwright-core (sólo la primera vez)"
  mkdir -p "$RAIZ/tests/e2e/lib"
  ( cd "$RAIZ/tests/e2e" && npm install --silent --no-save --prefix . playwright-core >/dev/null 2>&1 )
  [ -d "$RAIZ/tests/e2e/node_modules/playwright-core" ] \
    && ln -sfn "$RAIZ/tests/e2e/node_modules/playwright-core" "$RAIZ/tests/e2e/lib/playwright-core"
fi
node -e "require('$RAIZ/tests/e2e/entorno.js').rutaChromium()" 2>/dev/null \
  && verde "Chromium localizado" || aviso "Chromium no localizado: las sondas de navegador fallarán"

echo
echo "  API   http://127.0.0.1:$PUERTO_API/api"
echo "  Web   http://127.0.0.1:$PUERTO_WEB/Tradingcalculatorpro.com/"
echo "  Logs  $ESTADO/"
