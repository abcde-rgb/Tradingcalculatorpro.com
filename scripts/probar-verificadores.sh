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

  # ── Margen cruzado: los cuatro fallos reales del borrador ─────────────────
  # Las cifras del curso de la Academia (?topic=cross-margin) salen de este
  # motor. Cada sabotaje de aquí reintroduce un bug que el borrador traía de
  # verdad, y si `engine-check` no lo cazara, el contenido diría cosas falsas
  # con toda la autoridad de una web que cobra por ellas.

  # 1) El margen evaluado en el precio de ENTRADA en vez de en el del stop-out
  #    —lo que contradice la tesis del propio módulo xm-04—.
  probar "el tamaño defendible vuelve a medir el margen en la entrada" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/crossMargin.js'); t = p.read_text()
p.write_text(t.replace('? p + c : p - c', '? p : p', 1))\""

  # 2) La cota de la bisección derivada del margen libre: al cubrir en modelo
  #    neto caben lotes que no cuestan margen y se cortaban en silencio.
  probar "la cota del máximo abrible vuelve a salir del margen libre" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/crossMargin.js'); t = p.read_text()
p.write_text(t.replace('while (hi < MAX_LOTS_CAP && fits(hi)) hi *= 2;',
                       'hi = Math.max(1, (available * lev) / (cs * p)) * 4;', 1))\""

  # 3) El sentido de la escalera invertido: convierte piramidar en promediar a
  #    la baja sin que nada en la pantalla lo diga.
  probar "la escalera vuelve a escalar en el sentido contrario" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/crossMargin.js'); t = p.read_text()
p.write_text(t.replace('dirOf(side) * (direction', 'dirOf(side) * -1 * (direction', 1))\""

  # 4) Un margin level indefinido devuelto como 0: la regla de honestidad
  #    numérica del proyecto, y en pantalla se lee como cuenta muerta.
  probar "un margin level indefinido vuelve a devolverse como cero" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/crossMargin.js'); t = p.read_text()
p.write_text(t.replace('* 100 : null,', '* 100 : 0,', 1))\""

  # 5) La dirección del colchón tomada de la exposición neta en vez de la
  #    pendiente. Lo destapó la simulación masiva; aquí se fija para siempre.
  probar "el colchón vuelve a tomar la dirección de la exposición neta" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/crossMargin.js'); t = p.read_text()
p.write_text(t.replace('return pendiente > 0 ? p - trigger : trigger - p;',
                       'return signedUnits(positions, num(contractSize)) > 0 ? p - trigger : trigger - p;', 1))\""

  # 6) Un enlace profundo que ya no lleva a ninguna parte. La página estática
  #    se sigue publicando y posicionando, y el visitante aterriza en la
  #    calculadora por defecto sin que nada avise.
  probar "una página de SEO que enlaza a una pestaña inexistente" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
q = chr(39)
p = pathlib.Path('frontend/scripts/gen-seo-pages.js'); t = p.read_text()
p.write_text(t.replace('tab: ' + q + 'cross-margin' + q, 'tab: ' + q + 'cross-margen' + q, 1))\""

  probar "una página de SEO que enlaza a un tema que no existe" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
q = chr(39)
p = pathlib.Path('frontend/scripts/gen-seo-pages.js'); t = p.read_text()
p.write_text(t.replace(q + 'cross-margin' + q + ', slug:', q + 'margen-cruzado' + q + ', slug:', 1))\""

  # ── La simulación masiva también tiene que poder fallar ───────────────────
  titulo "Simulación masiva (simulacion-masiva.js)"
  probar "una identidad del margen cruzado que deja de cumplirse" \
    "(cd frontend && node scripts/simulacion-masiva.js --n 200)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/crossMargin.js'); t = p.read_text()
p.write_text(t.replace('freeMargin: equity - marginUsed,', 'freeMargin: equity - marginUsed * 0.999,', 1))\""
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

# ── Las claves están traducidas, no sólo presentes ──────────────────────────
# Las dos direcciones. El sabotaje normal copia el inglés a un idioma de
# alfabeto distinto, que es el caso que de verdad ocurrió. El inverso mete una
# traducción REAL y exige que no salte: un verificador que marcase en rojo el
# japonés bien traducido se desactivaría en una semana.
titulo "Idiomas traducidos (i18n-traducido.js)"
probar "una clave con el texto inglés literal en japonés" \
  "(cd frontend && node scripts/i18n-traducido.js)" \
  "python -c \"
import pathlib, re
en = pathlib.Path('frontend/src/lib/i18n/en.js').read_text()
v = re.search(r'\\\"planInvalidationHint\\\": \\\"([^\\\"]*)\\\"', en).group(1)
p = pathlib.Path('frontend/src/lib/i18n/ja.js'); t = p.read_text()
p.write_text(re.sub(r'(\\\"planInvalidationHint\\\": )\\\"[^\\\"]*\\\"', lambda m: m.group(1) + '\\\"' + v + '\\\"', t, count=1))\""

probar_inverso "una traducción de verdad no la hace saltar" \
  "(cd frontend && node scripts/i18n-traducido.js)" \
  "python -c \"
import pathlib, re
p = pathlib.Path('frontend/src/lib/i18n/ja.js'); t = p.read_text()
p.write_text(re.sub(r'(\\\"planInvalidationHint\\\": )\\\"[^\\\"]*\\\"', lambda m: m.group(1) + '\\\"入る前に書くこと。\\\"', t, count=1))\""

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

# ── La identidad de `t` acompaña al idioma ──────────────────────────────────
# Corre en Node contra el store, sin navegador ni build: la invariante vive en
# `lib/i18n.js` y se comprueba ahí. El cebo es la forma EXACTA de BUG-066 —una
# `t` única que lee el idioma activo—, que traduce bien y sólo pierde el cambio
# de identidad.
titulo "Identidad de t por idioma (check-i18n-identidad.js)"
probar "t vuelve a ser una funcion estable (los useMemo se congelan)" \
  "(cd frontend && node scripts/check-i18n-identidad.js)" \
  "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/i18n.js'); t = p.read_text()
cebo = ('let _unica = null;' + chr(10) +
        'const estable = (loc) => { if (!_unica) _unica = (k, v) => '
        'creaT(useI18nStore.getState().locale)(k, v); return _unica; };' + chr(10) + chr(10) +
        'function creaT(locale) {')
p.write_text(t.replace('function creaT(locale) {', cebo, 1).replace('t: creaT', 't: estable'))\""

probar "una t nueva cada vez pero que no traduce" \
  "(cd frontend && node scripts/check-i18n-identidad.js)" \
  "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/i18n.js'); t = p.read_text()
p.write_text(t.replace('  return (key, vars) => {', '  return (key) => key;' + chr(10) + '  return (key, vars) => {', 1))\""

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

  # ── El arranque del idioma ────────────────────────────────────────────────
  # Se sabotea en la FUENTE y se recompila, que tarda unos minutos. Es el
  # precio de probar de verdad: el fallo que vigila —el diccionario que no
  # llega antes de pintar, o `t` con identidad estable— no existe en el
  # código fuente, sólo en el artefacto compilado. Parchear el build a mano
  # probaría que la sonda sabe contar, no que caza la regresión.
  titulo "Arranque del idioma (idioma-arranque.js)"
  RECOMPILA="(cd frontend && REACT_APP_BACKEND_URL=http://127.0.0.1:8080 npx craco build >/dev/null 2>&1)"

  probar "el español vuelve a viajar incrustado en main.js" \
    "node tests/e2e/navegador/idioma-arranque.js" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/i18n.js'); t = p.read_text()
p.write_text(t.replace(chr(39) + 'zustand/middleware' + chr(39) + ';',
                       chr(39) + 'zustand/middleware' + chr(39) + ';' + chr(10) +
                       'import esT from ' + chr(39) + './i18n/es' + chr(39) + ';')
              .replace('const loadedLocales = {};', 'const loadedLocales = { es: esT };'))\" \
     && $RECOMPILA" \
    "git checkout -- frontend/src/lib/i18n.js && $RECOMPILA"

  # `t` con identidad estable: los memos con `[t]` se congelan en el idioma del
  # primer render (BUG-066). Ojo — con este sabotaje el MENÚ sigue cambiando
  # bien de idioma. Comprobado el 2026-08-24: de los dos textos que mira la
  # sonda, sólo el memoizado se queda atrás. Una prueba de idioma que mirase la
  # navegación —lo natural— daría verde con el fallo dentro.
  # ⚠️ Aquí había un segundo sabotaje —`t` con identidad estable— y se ha
  # RETIRADO, no perdido: se mudó a `check-i18n-identidad.js`, que lo comprueba
  # en el store y no a través de un componente.
  #
  # El motivo es instructivo. Esta sonda miraba un texto memoizado de la
  # marquesina de socios, y funcionó hasta que ese memo pasó a llevar `locale`
  # en sus dependencias —hizo falta para traducir los países con
  # `Intl.DisplayNames`—. Desde entonces el componente recalcula por `locale`
  # aunque `t` no cambie: el sabotaje empezó a SOBREVIVIR y la sonda llevaba
  # sin discriminar desde ese commit sin que nada avisara. Lo cazó esta batería.
  #
  # La lección: una comprobación indirecta envejece cuando cambia aquello a
  # través de lo cual mira. El testigo dejó de ser sensible al fallo que
  # vigilaba y siguió diciendo ✅.

else
  echo "  ⏭️  Presupuesto de peso y arranque del idioma: sin build o sin servidor"
  echo "      en :3100, no se prueban (bash tests/e2e/stack/arriba.sh)"
fi

# ── Contraste del texto en los dos temas ────────────────────────────────────
# Levanta su propio servidor, así que basta con el build. Se sabotea el token
# que causó el fallo real: el verde del tema claro a `35%`, que dejaba 48
# textos por debajo de la WCAG. Un umbral escrito y nunca roto no prueba nada.
if [ -d frontend/build ]; then
  titulo "Contraste WCAG (contraste.js)"
  RECOMPILA_CSS="(cd frontend && REACT_APP_BACKEND_URL=http://127.0.0.1:8080 npx craco build >/dev/null 2>&1)"
  probar "el verde del tema claro vuelve a un tono que no contrasta" \
    "node tests/e2e/navegador/contraste.js" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/index.css'); t = p.read_text()
i = t.index('.light {'); j = t.index('}', i)
p.write_text(t[:i] + t[i:j].replace('145 70% 26%', '145 70% 35%') + t[j:])\" \
     && $RECOMPILA_CSS" \
    "git checkout -- frontend/src/index.css && $RECOMPILA_CSS"
else
  echo "  ⏭️  Contraste: sin build, no se prueba"
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

# La regla «la doc dice 8 idiomas y hay 10» tiene que distinguir una afirmación
# VIVA de una entrada FECHADA, donde «8 idiomas» era cierto ese día. Por eso van
# los dos sentidos: una sola dirección deja pasar los dos fallos que ya tuvo
# —marcar el histórico entero (empuja a reescribir el pasado) y no marcar nada.
DOC_SABOTAJE="docs/ZzSabotajeIdiomas.md"
TEMPORALES+=("$DOC_SABOTAJE")
CONTRADICE="python scripts/auditar.py > $INFORME 2>/dev/null; ! grep -q 'dicen «8 idiomas»' $INFORME"

probar "una afirmación viva de que la web tiene 8 idiomas" \
  "$CONTRADICE" \
  "printf '# Zz sabotaje\n\n## Idiomas\n\nLa interfaz está en 8 idiomas.\n' > $DOC_SABOTAJE" \
  "rm -f $DOC_SABOTAJE"

# El cebo es la forma EXACTA que se coló hasta el 2026-08-24: encabezado con la
# fecha entre paréntesis en vez de al principio. `_ENCABEZADO_FECHADO` exigía
# `## 2026-07-30 — …` y contaba las cuarenta líneas que colgaban de
# `## Plan de trading versionado (2026-07-30)` como afirmaciones de hoy.
probar_inverso "un registro fechado que dice 8 idiomas porque ese día había 8" \
  "$CONTRADICE" \
  "printf '# Zz sabotaje\n\n## Sesión de ayer (2026-07-04) — i18n\n\nCerró con 8 idiomas a la par.\n' > $DOC_SABOTAJE" \
  "rm -f $DOC_SABOTAJE"

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
