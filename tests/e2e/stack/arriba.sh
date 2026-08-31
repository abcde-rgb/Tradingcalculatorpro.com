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
# El backend autoriza por CORS el puerto EN EL QUE SE SIRVE EL FRONTEND, y sólo
# lo aprende al arrancar. Así que un backend ya en pie con otro puerto web no
# vale: la página carga, parece correcta y el login muere en el preflight con un
# error que sólo se ve en la consola del navegador. Por eso se anota con qué
# puerto arrancó y se reinicia si ha cambiado — reusar un backend que no te va a
# dejar entrar es peor que tardar cinco segundos más.
PUERTO_WEB_ANTERIOR="$(cat "$ESTADO/puerto-web" 2>/dev/null || echo "")"
if curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_API/api/performance/instruments" \
   && [ "$PUERTO_WEB_ANTERIOR" != "$PUERTO_WEB" ]; then
  aviso "el backend en pie autoriza el puerto ${PUERTO_WEB_ANTERIOR:-desconocido}, no el $PUERTO_WEB — se reinicia"
  [ -f "$ESTADO/backend.pid" ] && kill "$(cat "$ESTADO/backend.pid")" 2>/dev/null
  rm -f "$ESTADO/backend.pid"
  for _ in $(seq 1 20); do
    curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_API/api/performance/instruments" || break
    sleep 0.5
  done
fi

if curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_API/api/performance/instruments"; then
  verde "backend ya respondía en :$PUERTO_API (CORS para :$PUERTO_WEB)"
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
  echo "$PUERTO_WEB" > "$ESTADO/puerto-web"
  for _ in $(seq 1 40); do
    curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_API/api/performance/instruments" && break
    sleep 1
  done
  curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_API/api/performance/instruments" \
    && verde "backend en :$PUERTO_API" \
    || { echo "  ✗ el backend no respondió (ver $ESTADO/backend.log)" >&2; exit 1; }
fi

# ── 3 · El frontend, servido como en producción ──────────────────────────
# Un build ya existente puede llevar incrustado OTRO backend: el de producción,
# si se compiló para desplegar. Las sondas de navegador ESCRIBEN (crean y borran
# operaciones), así que apuntarlas sin querer a producción no es un test que
# falla, es datos reales modificados. Se recompila salvo que el build actual
# apunte a este backend.
DESTINO="http://127.0.0.1:$PUERTO_API"
if [ -f "$RAIZ/frontend/build/index.html" ] \
   && ! grep -rqlF "$DESTINO" "$RAIZ/frontend/build/static/js/" 2>/dev/null; then
  aviso "el build existente NO apunta a $DESTINO — se recompila"
  rm -f "$RAIZ/frontend/build/index.html"
fi
if [ ! -f "$RAIZ/frontend/build/index.html" ]; then
  aviso "compilando el frontend (tarda unos minutos)"
  ( cd "$RAIZ/frontend" && env REACT_APP_BACKEND_URL="http://127.0.0.1:$PUERTO_API" \
      GENERATE_SOURCEMAP=false CI=false npx craco build > "$ESTADO/build.log" 2>&1 ) \
    || { echo "  ✗ el build falló (ver $ESTADO/build.log)" >&2; exit 1; }
fi
if curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_WEB${E2E_BASE_PATH:-}/"; then
  verde "servidor estático ya respondía en :$PUERTO_WEB"
else
  QA_PUERTO_WEB="$PUERTO_WEB" nohup node "$RAIZ/tests/e2e/stack/servidor.js" \
    > "$ESTADO/servidor.log" 2>&1 &
  echo $! > "$ESTADO/servidor.pid"
  sleep 2
  curl -sf -o /dev/null "http://127.0.0.1:$PUERTO_WEB${E2E_BASE_PATH:-}/" \
    && verde "frontend en :$PUERTO_WEB" \
    || { echo "  ✗ el servidor estático no respondió" >&2; exit 1; }
fi

# ── 4 · Los datos de prueba ──────────────────────────────────────────────
# `recorrido.js` y `analitica.js` afirman sobre cifras concretas (13 filas, 8
# botones de producto, +$3.471,86). Sin sembrar, esas comprobaciones fallan y el
# informe acusa al producto de un fallo que es «no hay datos».
CUENTA_QA="${QA_EMAIL:-qa@example.com}"
YA=$(psql -U "$BD_USUARIO" -d "$BD" -tAc \
     "SELECT count(*) FROM trades t JOIN users u ON t.data->>'user_id' = u.data->>'id' \
      WHERE u.data->>'email' = '$CUENTA_QA'" 2>/dev/null || echo 0)
if [ "${YA:-0}" -lt 10 ]; then
  aviso "sembrando datos de prueba (hay ${YA:-0} operaciones, se esperan 13)"
  "${QA_VENV:-$ESTADO/venv}/bin/python" "$RAIZ/tests/e2e/stack/sembrar.py" \
    > "$ESTADO/sembrar.log" 2>&1 \
    && verde "datos sembrados" \
    || aviso "la siembra falló (ver $ESTADO/sembrar.log) — las sondas de navegador fallarán"
else
  verde "datos de prueba ya presentes ($YA operaciones)"
fi

# ── 5 · Chromium y axe ───────────────────────────────────────────────────
# Las DOS en la misma orden, y no es cosmético: `npm install --no-save` sin un
# `package.json` que las declare PODA todo lo que no esté en la línea de
# órdenes. Instalar axe-core aparte —como decía la guía de accesibilidad— se
# llevaba por delante playwright-core y dejaba `lib/playwright-core` como un
# enlace roto; reinstalar Playwright se llevaba axe. Un tira y afloja infinito
# en el que ninguna de las dos sondas podía correr después de la otra.
if [ ! -d "$RAIZ/tests/e2e/lib/playwright-core" ] \
   || [ ! -d "$RAIZ/tests/e2e/node_modules/axe-core" ]; then
  aviso "instalando playwright-core y axe-core (juntas: por separado se podan)"
  mkdir -p "$RAIZ/tests/e2e/lib"
  ( cd "$RAIZ/tests/e2e" \
      && npm install --silent --no-save --prefix . playwright-core axe-core >/dev/null 2>&1 )
  [ -d "$RAIZ/tests/e2e/node_modules/playwright-core" ] \
    && ln -sfn "$RAIZ/tests/e2e/node_modules/playwright-core" "$RAIZ/tests/e2e/lib/playwright-core"
fi
node -e "require('$RAIZ/tests/e2e/entorno.js').rutaChromium()" 2>/dev/null \
  && verde "Chromium localizado" || aviso "Chromium no localizado: las sondas de navegador fallarán"

echo
echo "  API   http://127.0.0.1:$PUERTO_API/api"
echo "  Web   http://127.0.0.1:$PUERTO_WEB${E2E_BASE_PATH:-}/"
echo "  Logs  $ESTADO/"
