#!/usr/bin/env bash
# El examen entero. Sin argumentos lo corre todo; con uno, sólo esa sonda.
#
#   tests/e2e/correr.sh                    → todo
#   tests/e2e/correr.sh recorrido          → sólo el recorrido (escritorio+móvil)
#   tests/e2e/correr.sh autorizacion rgpd  → sólo esas dos
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E="$RAIZ/tests/e2e"
ESTADO="${QA_ESTADO:-$RAIZ/.qa-estado}"
PY="${QA_VENV:-$ESTADO/venv}/bin/python"
[ -x "$PY" ] || PY=python3

bash "$E2E/stack/arriba.sh" || exit 1
echo

fallos=0
corre() {  # corre <nombre> <orden...>
  echo "══ $1 ══"
  shift
  "$@" || fallos=$((fallos + 1))
  echo
}

quiere() { [ $# -eq 0 ] && return 0; for q in "$@"; do [ "$q" = "$OBJETIVO" ] && return 0; done; return 1; }

TODO=("$@")
for OBJETIVO in recorrido analitica temas ticker accesibilidad autorizacion rgpd persistencia; do
  if [ ${#TODO[@]} -gt 0 ]; then
    encontrado=0
    for q in "${TODO[@]}"; do [ "$q" = "$OBJETIVO" ] && encontrado=1; done
    [ $encontrado -eq 1 ] || continue
  fi
  case "$OBJETIVO" in
    recorrido)
      corre "recorrido · escritorio" node "$E2E/navegador/recorrido.js" desktop
      corre "recorrido · móvil"      node "$E2E/navegador/recorrido.js" mobile ;;
    analitica)
      corre "analítica · escritorio" node "$E2E/navegador/analitica.js" desktop
      corre "analítica · móvil"      node "$E2E/navegador/analitica.js" mobile ;;
    temas)        corre "temas e idiomas (móvil)" node "$E2E/navegador/temas.js" ;;
    ticker)       corre "ticker sin proveedor"    node "$E2E/navegador/ticker.js" ;;
    accesibilidad)
      # Sin axe-core la sonda sale con 2 y lo dice; no se cuenta como fallo del
      # producto, pero tampoco se calla: una comprobación que no puede correr no
      # es una comprobación que pasa.
      if [ -d "$E2E/node_modules/axe-core" ]; then
        corre "accesibilidad · escritorio" node "$E2E/navegador/accesibilidad.js" escritorio
        corre "accesibilidad · móvil"      node "$E2E/navegador/accesibilidad.js" movil
      else
        echo "══ accesibilidad ══"
        echo "  ⏭  falta axe-core: cd tests/e2e && npm install --no-save axe-core"
        echo
      fi ;;
    autorizacion) corre "autorización cruzada"    "$PY" "$E2E/api/autorizacion.py" ;;
    rgpd)         corre "RGPD: export y borrado"  "$PY" "$E2E/api/rgpd.py" ;;
    persistencia) corre "pantalla vs base de datos" "$PY" "$E2E/api/persistencia.py" ;;
  esac
done

echo "════════════════════════════════════════════"
[ $fallos -eq 0 ] && echo "  Todas las sondas en verde." \
                  || echo "  $fallos sonda(s) con fallos — mira arriba."
echo "  Capturas en $RAIZ/.qa-capturas/"
exit $fallos
