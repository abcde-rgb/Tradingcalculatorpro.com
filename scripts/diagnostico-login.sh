#!/usr/bin/env bash
# ============================================================================
# ¿Es el backend, la base de datos, el navegador o la red?
#
# Se ejecuta DESDE TU ORDENADOR (no desde el sandbox de Claude, que tiene la
# salida a internet restringida). Usa curl, que IGNORA CORS y no tiene
# localStorage ni service worker: si algo falla aquí, el problema NO está en el
# navegador.
#
#   bash scripts/diagnostico-login.sh tu-correo@ejemplo.com
#
# La contraseña se pide por teclado y no se muestra ni queda en el historial.
# ============================================================================
set -uo pipefail

API="${API:-https://tradingcalculator-api-2rkq2snofq-ue.a.run.app}"
WEB="${WEB:-https://tradingcalculator.pro}"
CORREO="${1:-}"

azul()  { printf '\n\033[1m%s\033[0m\n' "$1"; }
bien()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
mal()   { printf '  \033[31m✗\033[0m %s\n' "$1"; }
nota()  { printf '    %s\n' "$1"; }

azul "1 · ¿Está vivo el backend, y ve la base de datos?"
SALUD=$(curl -s -o /tmp/salud.txt -w '%{http_code}' --max-time 20 "$API/api/health")
CUERPO=$(cat /tmp/salud.txt 2>/dev/null)
if [ "$SALUD" = "200" ]; then
  bien "backend vivo y base de datos conectada — $CUERPO"
elif [ "$SALUD" = "503" ]; then
  mal "el backend RESPONDE pero la base de datos NO — $CUERPO"
  nota "Es tu hipótesis confirmada: mira DATABASE_URL en Cloud Run."
elif [ "$SALUD" = "000" ]; then
  mal "no se alcanza $API — no hay respuesta"
  nota "Puede ser tu red local, un DNS o el servicio caído. Prueba desde el móvil con datos."
else
  mal "respuesta inesperada: HTTP $SALUD — $CUERPO"
fi

azul "2 · ¿El backend desplegado autoriza el dominio nuevo? (CORS)"
CORS=$(curl -s -D - -o /dev/null --max-time 20 -X OPTIONS "$API/api/auth/login" \
  -H "Origin: $WEB" -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' | tr -d '\r')
if grep -qi "access-control-allow-origin: $WEB" <<<"$CORS"; then
  bien "sí: el arreglo del CORS ESTÁ desplegado"
else
  mal "NO devuelve la cabecera para $WEB — el arreglo del CORS no está desplegado"
  nota "El navegador descartará toda respuesta. curl no lo nota; tu navegador sí."
  nota "Cabeceras recibidas:"; grep -i 'access-control' <<<"$CORS" | sed 's/^/      /'
fi

if [ -z "$CORREO" ]; then
  azul "3 · Login"
  nota "Pásame el correo para probarlo:  bash $0 tu-correo@ejemplo.com"
  exit 0
fi

azul "3 · ¿Acepta el backend tus credenciales? (sin navegador de por medio)"
printf '    contraseña (no se muestra): '
read -rs CLAVE; echo

probar_login() {
  local correo="$1" etiqueta="$2"
  local cuerpo respuesta codigo
  cuerpo=$(python3 -c 'import json,sys;print(json.dumps({"email":sys.argv[1],"password":sys.argv[2]}))' "$correo" "$CLAVE")
  respuesta=$(curl -s -o /tmp/login.txt -w '%{http_code}' --max-time 25 -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' -H "Origin: $WEB" -d "$cuerpo")
  codigo="$respuesta"
  case "$codigo" in
    200) bien "$etiqueta → ENTRA (HTTP 200)"
         nota "Si esto entra y el navegador no, el problema es del NAVEGADOR: borra los datos del sitio." ;;
    401) mal  "$etiqueta → credenciales rechazadas (HTTP 401)" ;;
    429) mal  "$etiqueta → demasiados intentos (HTTP 429). Espera un minuto y repite." ;;
    000) mal  "$etiqueta → sin respuesta (red)" ;;
    *)   mal  "$etiqueta → HTTP $codigo — $(cat /tmp/login.txt)" ;;
  esac
}

MINUS=$(printf '%s' "$CORREO" | tr '[:upper:]' '[:lower:]')
MAYUS="$(printf '%s' "${CORREO:0:1}" | tr '[:lower:]' '[:upper:]')${MINUS:1}"

probar_login "$MINUS" "todo en minúsculas ($MINUS)"
[ "$MAYUS" != "$MINUS" ] && probar_login "$MAYUS" "con la inicial en mayúscula ($MAYUS)"

azul "Cómo leer esto"
nota "Una entra y la otra no  → son DOS cuentas distintas (el fallo de mayúsculas)."
nota "Las dos dan 401         → la contraseña no es la de esa cuenta, o la cuenta no existe."
nota "Las dos entran (200)    → el backend está bien: el problema es el navegador."
nota "Nada responde           → red o servicio; prueba desde otra conexión."
rm -f /tmp/salud.txt /tmp/login.txt
