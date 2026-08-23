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

# La guarda va ANTES del trap, y el orden no es estético.
#
# Estuvo al revés y la consecuencia fue exactamente la que la guarda existe para
# evitar: el `trap ... EXIT` se instalaba primero, la guarda detectaba el árbol
# sucio, imprimía «haz commit antes» y hacía `exit 1` — lo que disparaba el trap
# y ejecutaba `git checkout -- .`, borrando los cambios que acababa de negarse a
# pisar. Una guarda que provoca el daño del que avisa es peor que no tenerla:
# quien la lee se queda tranquilo.
#
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

# Pase lo que pase —error, Ctrl-C, salida anticipada— el repositorio queda como
# estaba. Un test que ensucia el árbol es un test que nadie vuelve a ejecutar.
limpiar() {
  for f in "${TEMPORALES[@]:-}"; do [ -n "$f" ] && rm -f "$f"; done
  git checkout -- . 2>/dev/null
}
trap limpiar EXIT INT TERM

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

# probar_inverso <nombre> <comando> <cebo> [restaurar]
#   La otra mitad, y hace falta: un verificador que grita con TODO tampoco
#   verifica nada, sólo que de otra manera —se desactiva a la semana y ya no
#   protege—. Aquí se aplica un <cebo> que NO es un fallo y se exige que el
#   verificador siga pasando.
#
#   Sin esto, «arreglar» un falso positivo desactivando el verificador entero
#   pasaría igual el sabotaje normal, porque un verificador apagado detecta lo
#   mismo que uno roto: nada.
probar_inverso() {
  local nombre="$1" comando="$2" cebo="$3" restaurar="${4:-git checkout -- .}"

  if ! eval "$comando" >/dev/null 2>&1; then
    echo "  ⚠️  $nombre: no pasa ni ANTES del cebo — hay algo roto de verdad"
    FALLOS=$((FALLOS + 1)); return
  fi

  eval "$cebo" >/dev/null 2>&1

  if eval "$comando" >/dev/null 2>&1; then
    echo "  ✅ $nombre: no salta con un falso positivo"
  else
    echo "  ❌ $nombre: SALTA con algo que no es un fallo — falso positivo"
    FALLOS=$((FALLOS + 1))
  fi

  eval "$restaurar" >/dev/null 2>&1
  eval "$comando" >/dev/null 2>&1 || {
    echo "  ❌ $nombre: NO vuelve a pasar tras restaurar — el cebo dejó residuo"
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
# fichero generado dependa del orden del sistema de ficheros. Se sabotea cada
# clave por separado; si una sola sobreviviera, el mapa volvería a salir distinto
# en el portátil y en el runner.
probar "orden no total en los tamaños (el fallo real que rompió CI)" \
  "python scripts/gen-mapa.py --check" \
  "python -c \"
import pathlib
p = pathlib.Path('scripts/gen-mapa.py'); t = p.read_text()
p.write_text(t.replace('return (-x[1], x[0])', 'return (-x[1],)', 1))\""

probar "orden no total en las rutas" \
  "python scripts/gen-mapa.py --check" \
  "python -c \"
import pathlib
p = pathlib.Path('scripts/gen-mapa.py'); t = p.read_text()
p.write_text(t.replace('return (r[\\\"path\\\"], r[\\\"metodo\\\"], r[\\\"fichero\\\"], r[\\\"linea\\\"])', 'return (r[\\\"path\\\"],)', 1))\""

# El detector de consumidores es lo que da sentido a la cifra de rutas muertas.
# Si sus 19 controles dejaran de comprobarse, el número volvería a ser una
# opinión — que es exactamente lo que era antes del 2026-08-17.
probar "el detector de consumidores se estropea" \
  "python scripts/gen-mapa.py --check" \
  "python -c \"
import pathlib
p = pathlib.Path('scripts/gen-mapa.py'); t = p.read_text()
p.write_text(t.replace('def se_consume(', 'def se_consume(*_a, **_k):\n    return True\n\n\ndef _se_consume_original(', 1))\""

# ── Las rutas muertas llevan decisión escrita ───────────────────────────────
titulo "Decisión por ruta muerta (check-rutas-muertas.py)"

# El mapa CUENTA las rutas sin consumidor; esto exige que cada una tenga escrito
# qué se hace con ella. Sin ello el número sube de 38 a 39, se regenera el mapa,
# y CI se pone verde con una ruta más que nadie puede alcanzar.
probar "una ruta nueva que ninguna pantalla llama" \
  "python scripts/check-rutas-muertas.py" \
  "printf '\n\n@api_router.get(\"/sabotaje/sin/decision\")\nasync def sabotaje_sin_decision():\n    return {}\n' >> backend/timeframes.py"

# ⚠️ Este sabotaje nombraba una ruta y su decisión a pelo
# (`/api/quote/{symbol}` … CONSTRUIR). El día que esa ruta cambió de decisión, el
# `replace` dejó de encontrar nada: el fichero quedaba INTACTO, el verificador
# pasaba con toda la razón, y la suite lo cantó como «SOBREVIVE al sabotaje».
# Un sabotaje que no sabotea es la misma nada que un verificador que no verifica,
# sólo que además acusa a quien no ha hecho nada. Ahora se borra la PRIMERA fila
# de decisión que haya, sea cual sea, y se comprueba que de verdad ha cambiado
# algo antes de dar el sabotaje por aplicado.
probar "una fila que desaparece de la tabla" \
  "python scripts/check-rutas-muertas.py" \
  "python -c \"
import pathlib, re, sys
p = pathlib.Path('docs/RUTAS_MUERTAS.md'); t = p.read_text()
corte = t.index('## Las decisiones')
# El ancla es el backtick: las filas de DECISIÓN empiezan por '| \\\`GET\\\`…'. Sin
# él, el primer '|' de la sección es la cabecera de la tabla, borrarla no quita
# ninguna decisión y el verificador pasa — otro sabotaje que no sabotea.
nuevo = t[:corte] + re.sub(r'^\\| \\\`[^\\n]*\\n', '| x |\\n', t[corte:], count=1, flags=re.M)
if nuevo == t: sys.exit('el sabotaje no cambió nada: no hay filas de decisión')
p.write_text(nuevo)\""

# La dirección que de verdad pudre las listas: una ruta que YA tiene pantalla y
# se queda en la tabla de deuda. Le pasó a `/plan` —estuvo en la lista de muertas
# después de tener pantalla— y sólo se cazó por los controles de `gen-mapa.py`.
probar "una ruta de la tabla que ya tiene consumidor" \
  "python scripts/check-rutas-muertas.py" \
  "printf '\nexport const _sab = () => fetch(\`\${API}/education/pattern-catalog\`);\n' >> frontend/src/lib/store.js"

# Y el falso positivo simétrico: un COMENTARIO que nombra una ruta no la consume.
# `gen-mapa.py` los quita a propósito (lo descubrió el comentario de `/pricing`
# que citaba `/api/portfolio/rebalance` al explicar por qué se retiraba). Si esto
# saltara, la forma de callarlo sería borrar el comentario que explica las cosas.
probar_inverso "un comentario que NOMBRA una ruta no la consume" \
  "python scripts/check-rutas-muertas.py" \
  "printf '\n// TODO: conectar \`\${API}/education/pattern-catalog\` algún día\n' >> frontend/src/lib/store.js"

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

# La otra mitad, que es la que faltaba: el verificador tiene que CALLARSE dentro
# de un bloque de código. Sin esta comprobación, «arreglar» el falso positivo
# desactivando el verificador entero también habría pasado el sabotaje de arriba.
# El falso positivo era real: un `[a-z0-9-]+` seguido de un paréntesis de grupo
# tiene la forma exacta de `[texto](destino)`, y cualquier documento que enseñe
# una expresión regular quedaba marcado como roto.
probar_inverso "un enlace roto DENTRO de un bloque de código no cuenta" \
  "python scripts/check-doc-links.py" \
  "printf '\n\`\`\`\n[enlace roto](./NO_EXISTE_SABOTAJE.md)\n\`\`\`\n' >> docs/README.md"

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
  # Una clave que el código usa y NINGÚN idioma define sale CRUDA en pantalla,
  # y la paridad entre idiomas no la ve: faltar en los diez es «consistente».
  # Llegaron 26 así al build compilado antes de que existiera esta guarda.
  probar "una clave que el código usa y ningún idioma define" \
    "(cd frontend && node scripts/i18n-check.js)" \
    "python -c \"
import pathlib, re
p = pathlib.Path('frontend/src/lib/i18n/es.js'); t = p.read_text()
p.write_text(re.sub(r'\n  .advSqnHint.: .*?,\n', '\n', t, count=1))\""

  # Una clave repetida NO cambia el número de claves: el objeto colapsa las dos
  # en una y `Object.keys()` cuenta igual. Por eso el detector lee el TEXTO del
  # fichero. Resolver un conflicto de i18n «quedándose con los dos lados» metió
  # 21.893 duplicadas sin que nada se quejara hasta que existió esta guarda.
  probar "una clave duplicada dentro del mismo idioma" \
    "(cd frontend && node scripts/i18n-check.js)" \
    "python -c \"
import pathlib, re
p = pathlib.Path('frontend/src/lib/i18n/en.js'); t = p.read_text()
m = re.search(r'\n  (\\\"?[A-Za-z0-9_]+\\\"?: .*?,)\n', t)
if m: p.write_text(t[:m.end()] + '  ' + m.group(1) + '\n' + t[m.end():])\""
  # ── Las cifras que la web dice de sí misma ────────────────────────────────
  # «186 activos» en la portada es una promesa, no un adorno: o sale del
  # catálogo o alguien responde por ella. engine-check compara siteFacts.js
  # contra su fuente real, así que basta con desviar una cifra.
  titulo "Motor y cifras del producto (engine-check.js)"
  probar "una cifra de siteFacts que ya no cuadra con su fuente" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib, re
p = pathlib.Path('frontend/src/lib/siteFacts.js'); t = p.read_text()
p.write_text(re.sub(r'assets: \\d+', 'assets: 999', t, count=1))\""
else
  echo "  ⏭️  i18n-check y engine-check: sin node_modules (ejecuta scripts/preparar-entorno.sh)"
fi

# ── Cookies httpOnly cross-site: sin credentials el fetch va sin sesión ──────
titulo "Credenciales en los fetch (check-fetch-credentials.js)"
FETCH_FALSO="frontend/src/lib/sabotajeFetch.js"
TEMPORALES+=("$FETCH_FALSO")
# ⚠️ Sin plantilla de cadena a propósito. El sabotaje se pasa por `eval`, y unas
# comillas invertidas ahí dentro son sustitución de comandos para bash: el
# fichero no llegaba a escribirse y el verificador figuraba como «SOBREVIVE»
# estando perfectamente. La concatenación con `+` la detecta igual.
probar "un fetch al backend sin credentials" \
  "(cd frontend && node scripts/check-fetch-credentials.js)" \
  "printf \"export const x = () => fetch(API + '/api/sabotaje', { method: 'GET' });\n\" > $FETCH_FALSO" \
  "rm -f $FETCH_FALSO"

# ── Los logos de socios: el fichero de la carpeta tiene que llegar a la web ──
# El fallo real que esto caza no es un logo feo, es un logo INVISIBLE: alguien
# deja `axi-square.svg` en `assets/partners/`, da por hecho que ya sale, y el
# mapa generado ni se entera. Se sabotea dejando un fichero sin regenerar, que
# es exactamente eso.
titulo "Logos de socios (gen-partner-logos.js --check)"
LOGO_FALSO="frontend/src/assets/partners/zzsabotaje-square.svg"
TEMPORALES+=("$LOGO_FALSO")
probar "un logo dejado en la carpeta que el mapa generado no conoce" \
  "(cd frontend && node scripts/gen-partner-logos.js --check)" \
  "printf '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1 1\"></svg>' > $LOGO_FALSO" \
  "rm -f $LOGO_FALSO"

# Y la otra dirección: un `import` del mapa que ya no tiene fichero detrás
# rompe el build entero, así que el mapa no puede sobrevivir a un borrado.
probar "un logo borrado que el mapa generado sigue importando" \
  "(cd frontend && node scripts/gen-partner-logos.js --check)" \
  "mv frontend/src/assets/partners/margex-square.png /tmp/zz-margex.png" \
  "mv /tmp/zz-margex.png frontend/src/assets/partners/margex-square.png"

# ── El precio anunciado es el que se cobra ──────────────────────────────────
# Las dos direcciones: que un idioma se desvíe, y que suba el precio en el
# backend sin que nadie toque los textos. La segunda es la que pasa de verdad.
titulo "Precio anunciado vs cobrado (check-precios.py)"
probar "un idioma anuncia un precio distinto del que se cobra" \
  "python scripts/check-precios.py" \
  "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/i18n/ja.js')
p.write_text(p.read_text().replace('\\\"monthlyPrice\\\": \\\"€17\\\"', '\\\"monthlyPrice\\\": \\\"€19\\\"', 1))\""

probar "sube el precio en el backend y los textos se quedan atrás" \
  "python scripts/check-precios.py" \
  "python -c \"
import pathlib
p = pathlib.Path('backend/server.py')
p.write_text(p.read_text().replace('\\\"price\\\": 17.00', '\\\"price\\\": 21.00', 1))\""

# ── El presupuesto de peso caza una pantalla que engorda ────────────────────
# Necesita el build compilado y el servidor en pie, así que sólo se prueba si
# están; si no, se dice que se salta en vez de figurar como aprobado.
if [ -d frontend/build ] && curl -s -o /dev/null --max-time 3 "http://localhost:3100/Tradingcalculatorpro.com/"; then
  titulo "Presupuesto de peso (peso.js)"
  probar "un presupuesto por debajo de lo que pesa la pantalla" \
    "node tests/e2e/navegador/peso.js" \
    "python -c \"
import json, pathlib
p = pathlib.Path('tests/e2e/presupuesto-peso.json'); d = json.loads(p.read_text())
r = d['rutas']['portada']; r['js'] //= 2; r['total'] //= 2
p.write_text(json.dumps(d, indent=2) + chr(10))\"" \
    "git checkout -- tests/e2e/presupuesto-peso.json"
else
  echo "  ⏭️  Presupuesto de peso: sin build o sin servidor en :3100, no se prueba"
fi

# ── La Academia: lo que la navegación ofrece tiene que estar en el índice ────
# Un módulo que se navega pero no se indexa existe y no se encuentra nunca; uno
# indexado y no navegable es un enlace roto. Se sabotea renombrando un `value:`
# de la navegación, que es justo cómo se separan de verdad las dos listas.
titulo "Índice de la Academia (check-edu-index.js)"
probar "un tema de la navegación que el índice no conoce" \
  "(cd frontend && node scripts/check-edu-index.js)" \
  "python -c \"
import pathlib, re
p = pathlib.Path('frontend/src/pages/EducationPage.jsx'); t = p.read_text()
i = t.index('const EDUCATION_NAV')
m = re.search(r\\\"value: '([a-z0-9-]+)'\\\", t[i:])
if m: p.write_text(t[:i] + t[i:].replace(m.group(0), \\\"value: 'zz-sabotaje'\\\", 1))\""

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
