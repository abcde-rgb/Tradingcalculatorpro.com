#!/usr/bin/env bash
# Para lo que arrancó `arriba.sh`. Postgres se deja en pie a propósito: es lento
# de arrancar y no estorba a nada.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ESTADO="${QA_ESTADO:-$RAIZ/.qa-estado}"
for servicio in backend servidor; do
  if [ -f "$ESTADO/$servicio.pid" ]; then
    kill "$(cat "$ESTADO/$servicio.pid")" 2>/dev/null && echo "  parado $servicio"
    rm -f "$ESTADO/$servicio.pid"
  fi
done
# Red de seguridad: si el pid se perdió (rearranque del contenedor), por patrón.
# El corchete evita que el grep se encuentre a sí mismo y se mate el propio shell.
pkill -f "[u]vicorn server:app" 2>/dev/null && echo "  parado uvicorn suelto"
pkill -f "[s]tack/servidor.js" 2>/dev/null && echo "  parado servidor suelto"
echo "  (Postgres se deja arrancado: tarda en levantar y no molesta)"
