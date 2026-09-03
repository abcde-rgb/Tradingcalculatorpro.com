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
SALIDA_SABOTAJE=""

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
  # `-r` porque algún temporal es un directorio (la copia de `build/static/js`).
  for f in "${TEMPORALES[@]:-}"; do [ -n "$f" ] && rm -rf "$f"; done
  rm -f "${SALIDA_SABOTAJE:-}"
  git checkout -- . 2>/dev/null
}
trap limpiar EXIT INT TERM

# Dónde queda el error de un sabotaje que no se aplica (ver `probar()`). Se crea
# DESPUÉS del trap: si la guarda del árbol sucio corta antes, no deja huérfano un
# temporal que nadie va a borrar.
SALIDA_SABOTAJE="$(mktemp)"

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
  # $5 (opcional) es un sabotaje que vive en el ENTORNO, no en un fichero: se
  # antepone sólo a la ejecución saboteada. Hace falta para las condiciones que
  # no se pueden escribir en el disco —una sesión que no arranca, por ejemplo—
  # y que son justo las que producen el verde vacío: una sonda que no llega a
  # ejercitar lo que mide no encuentra fallos, y sin esto pasaría por buena.
  local nombre="$1" comando="$2" sabotaje="$3" restaurar="${4:-git checkout -- .}"
  local entorno="${5:-}"

  if ! eval "$comando" >/dev/null 2>&1; then
    echo "  ⚠️  $nombre: no pasa ni ANTES de sabotear — hay algo roto de verdad"
    FALLOS=$((FALLOS + 1)); return
  fi

  # El sabotaje TIENE que aplicarse, y hay que comprobarlo.
  #
  # Estaba con la salida descartada y el código de salida ignorado, y eso hace
  # indistinguibles dos cosas muy distintas: un verificador que no verifica, y un
  # sabotaje que no llegó a tocar nada. Las dos imprimen «SOBREVIVE». Ha pasado
  # dos veces: ocho heredocs con el cuerpo indentado que morían con
  # `IndentationError` (BUG-078), y un ancla que el código había dejado atrás
  # —el `replace` no encontraba su texto, escribía el fichero igual y salía con
  # 0—. Ahora un sabotaje que falla se dice, con su error, y cuenta como fallo
  # del propio test: es un problema de la prueba, no del producto.
  if ! eval "$sabotaje" > "$SALIDA_SABOTAJE" 2>&1; then
    echo "  ⚠️  $nombre: el SABOTAJE no se aplicó — $(tail -1 "$SALIDA_SABOTAJE")"
    FALLOS=$((FALLOS + 1))
    eval "$restaurar" >/dev/null 2>&1
    return
  fi

  if eval "$entorno $comando" >/dev/null 2>&1; then
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

  # Mismo motivo que en `probar()`: un cebo que no se aplica deja pasar el test
  # sin haber probado nada, y con el ✅ puesto.
  if ! eval "$cebo" > "$SALIDA_SABOTAJE" 2>&1; then
    echo "  ⚠️  $nombre: el CEBO no se aplicó — $(tail -1 "$SALIDA_SABOTAJE")"
    FALLOS=$((FALLOS + 1))
    eval "$restaurar" >/dev/null 2>&1
    return
  fi

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

  # ── El <noscript> del shell: la portada que ve un bot sin JavaScript ──────
  # `#root` llega vacío, así que ese bloque ES `/`, `/pricing` y `/about` para
  # GPTBot, ClaudeBot o PerplexityBot. Estuvo tratado como un aviso de «activa
  # JavaScript» y decía «27 patrones de vela» sobre 30 —la cifra exacta que el
  # candado de arriba ya perseguía en las claves i18n— y enlazaba /dashboard,
  # que es premium y está en Disallow, como primer destino.
  probar "el <noscript> del shell diciendo una cifra que ya no es la del catálogo" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/public/index.html'); t = p.read_text(encoding='utf-8')
p.write_text(t.replace('42 patrones chartistas y 30 patrones',
                       '42 patrones chartistas y 27 patrones', 1), encoding='utf-8')\""

  # ⚠️ El cebo apuntaba a `<li><a href="/education">Academia de trading</a></li>`,
  # línea que dejó de existir cuando el <noscript> pasó a enlazar los hubs
  # públicos (`/learn/`, `/tools/`…) en vez de las rutas con muro. El `replace`
  # no encontraba su texto, escribía el fichero igual y salía con 0: el arnés
  # cantaba «SOBREVIVE» sobre una comprobación perfecta. Es literalmente
  # BUG-078 otra vez, así que ahora el `grep -q` hace fallar el sabotaje —y
  # decirlo— si el ancla vuelve a moverse.
  probar "el <noscript> del shell enlazando una ruta que robots.txt prohíbe" \
    "(cd frontend && node scripts/engine-check.js)" \
    "grep -q '<li><a href=\"/learn/\">' frontend/public/index.html && sed -i '0,\|<li><a href=\"/learn/\">[^<]*</a></li>|s||<li><a href=\"/dashboard\">Dashboard</a></li>|' frontend/public/index.html"

  probar "el <noscript> del shell desapareciendo del todo" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib, re
p = pathlib.Path('frontend/public/index.html'); t = p.read_text(encoding='utf-8')
p.write_text(re.sub(r'<noscript>\\s*<h1>[\\s\\S]*?</noscript>', '', t, count=1), encoding='utf-8')\""

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

  # 7) La lista que el panel acepta por `?tab=`. Era una copia a mano de
  #    CALC_NAV y se quedó atrás: `/dashboard?tab=breakeven` aterrizaba en la
  #    pestaña por defecto sin fallar nada. Ahora se deriva, y comprobar los
  #    destinos del SEO contra ella sería preguntarle dos veces a la misma
  #    lista. Lo que engine-check comprueba es la CADENA de derivación, así que
  #    los sabotajes tienen que romperla por sus dos eslabones — y el tercero
  #    vuelve a poner la lista literal, para que la rama vieja siga viva.
  probar "lo permitido por ?tab= deja de derivar de las herramientas" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/pages/DashboardPage.jsx'); t = p.read_text()
p.write_text(t.replace('const allowed = ALL_CALC_TOOLS.map(',
                       'const allowed = TABS_SUELTAS.map(', 1))\""

  probar "las herramientas dejan de derivar de CALC_NAV" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/pages/DashboardPage.jsx'); t = p.read_text()
p.write_text(t.replace('const ALL_CALC_TOOLS = CALC_NAV.flatMap(',
                       'const ALL_CALC_TOOLS = OTRA_COSA.flatMap(', 1))\""

  probar "vuelve la lista literal de pestañas, y llega incompleta" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
q = chr(39)
p = pathlib.Path('frontend/src/pages/DashboardPage.jsx'); t = p.read_text()
p.write_text(t.replace('const allowed = ALL_CALC_TOOLS.map((it) => it.value);',
                       'const allowed = [' + q + 'position' + q + '];', 1))\""

  # ── Las cifras del riesgo de cola ─────────────────────────────────────────
  # `tail-risk` pasó de cero cifras a tres tablas, y una cifra en pantalla es
  # una afirmación: «20 σ pasa una vez cada 7 × 10⁸⁵ años» o es verdad, o es
  # propaganda con decimales. Cada sabotaje rompe una propiedad distinta.
  titulo "Cifras del riesgo de cola (engine-check.js)"
  probar "la cola de la normal se queda en una, no en dos" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/tailRiskData.js'); t = p.read_text()
p.write_text(t.replace('return 2 * (phi / (x + f));', 'return phi / (x + f);', 1))\""

  probar "la frecuencia se anualiza con 365 días en vez de 252 sesiones" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/tailRiskData.js'); t = p.read_text()
p.write_text(t.replace('SESIONES_ANIO = 252', 'SESIONES_ANIO = 365', 1))\""

  probar "la recuperación se vuelve simétrica a la caída" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/tailRiskData.js'); t = p.read_text()
p.write_text(t.replace('return d / (1 - d);', 'return d;', 1))\""

  probar "una caída del 100 % devuelve Infinity en vez de null" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/tailRiskData.js'); t = p.read_text()
p.write_text(t.replace('d < 0 || d >= 1) return null;', 'd < 0) return null;', 1))\""

  probar "un nivel real cambiado: la cifra del texto deja de cuadrar" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/tailRiskData.js'); t = p.read_text()
p.write_text(t.replace('pico: 5048.62', 'pico: 5000', 1))\""

  probar "un evento con los niveles Y el porcentaje: dos fuentes para una cifra" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/tailRiskData.js'); t = p.read_text()
p.write_text(t.replace('ref: { pico: 38915.87',
                       'pct: -80.5, ref: { pico: 38915.87', 1))\""

  # El dato y su texto se emparejan por `id`. Un id que el getter no conoce no
  # da error: la celda sale VACÍA, que es peor que una clave cruda porque no se
  # nota. `i18n-check` no lo ve —las claves existen—, así que lo ve esto.
  probar "un evento cuyo id el texto no conoce: la celda saldría vacía" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
q = chr(39)
p = pathlib.Path('frontend/src/lib/tailRiskData.js'); t = p.read_text()
p.write_text(t.replace(q + 'covid' + q, q + 'covid19' + q, 1))\""

  probar "una línea traducida diez veces que ningún evento pinta" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/tailRiskData.js'); t = p.read_text()
i = t.index('  { id: ' + chr(39) + 'bitcoin' + chr(39))
j = t.index('\n', i) + 1
p.write_text(t[:i] + t[j:])\""

  # El bloque «por qué importa» promete cifras concretas —«ocho pérdidas al
  # 10 % te dejan al 43,0 %»— porque un consejo sin consecuencia cuantificada
  # se olvida. Eso convierte la prosa en una afirmación numérica más, y aquí se
  # comprueba que sigue cuadrando con la función que la produce.
  probar "el texto de «por qué importa» dice una cifra que el cálculo desmiente" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/i18n/es.edu.js'); t = p.read_text()
p.write_text(t.replace('43,0 %', '45,0 %', 1))\""

  # El coste de referencia de la tabla de equilibrio está escrito dos veces:
  # en la constante que pinta la columna y en el texto que la explica. Dos
  # fuentes para una cifra es lo que envejece en silencio.
  probar "la columna de costes y el texto que la describe se separan" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/components/education/BreakevenTable.jsx'); t = p.read_text()
p.write_text(t.replace('COSTE_REFERENCIA = 0.1;', 'COSTE_REFERENCIA = 0.2;', 1))\""

  # ── Las cifras de Wyckoff ─────────────────────────────────────────────────
  # El módulo tenía 1.236 palabras y ningún número, en un método cuya segunda
  # ley es explícitamente cuantitativa. Lo que se protege no es que el recuento
  # «acierte» —no predice nada— sino que sea la cuenta que dice ser, y que la
  # operación del último paso dé los números que el texto afirma.
  probar "el recuento de Punto y Figura deja de contar la reversión" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/wyckoffMath.js'); t = p.read_text()
p.write_text(t.replace('return b + c * k * r;', 'return b + c * k;', 1))\""

  probar "un riesgo cero se pinta como relación infinita" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/wyckoffMath.js'); t = p.read_text()
p.write_text(t.replace('if (riesgo === 0) return null;', '', 1))\""

  probar "el objetivo deja de proyectar la amplitud del rango" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/wyckoffMath.js'); t = p.read_text()
p.write_text(t.replace('return a + (a - b);', 'return a;', 1))\""

  # ── El retardo de las medias móviles ──────────────────────────────────────
  # La tabla afirma que SMA y EMA comparten centro de masa, y ése es el
  # argumento entero del bloque: si el alfa deja de ser 2/(N+1) o el retardo
  # deja de ser (N−1)/2, las dos columnas se separan y el texto miente.
  probar "el alfa de la EMA deja de ser 2/(N+1)" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/maMath.js'); t = p.read_text()
p.write_text(t.replace('return 2 / (N + 1);', 'return 1 / (N + 1);', 1))\""

  probar "el retardo de la SMA pasa de (N−1)/2 a N/2" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/maMath.js'); t = p.read_text()
p.write_text(t.replace('return (N - 1) / 2;', 'return N / 2;', 1))\""

  # Ésta la caza la ruta que NO usa la fórmula: construye una recta y promedia.
  probar "el desfase en precio deja de escalar con la pendiente" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/maMath.js'); t = p.read_text()
p.write_text(t.replace('return m * r;', 'return r;', 1))\""

  # Una frase con variables que pierde una en UN idioma enseña «{d}» en
  # pantalla, y sólo a quien lee en ese idioma.
  probar "una traducción pierde una variable de la frase del desfase" \
    "(cd frontend && node scripts/engine-check.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/i18n/de.edu.js'); t = p.read_text()
p.write_text(t.replace('um {d} darunter', 'darunter', 1))\""

  # ── Los enlaces de la Academia a las herramientas ─────────────────────────
  # Tres formas de fallar sin ruido: un `?tab=` que el panel no acepta (te deja
  # en la pestaña por defecto), un id fuera de la tabla (`return null`, el
  # enlace no se pinta) y una clave mal escrita (cruda, en un solo idioma).
  titulo "Enlaces de la Academia (check-enlaces-academia.js)"
  probar "un enlace a una pestaña del panel que no existe" \
    "(cd frontend && node scripts/check-enlaces-academia.js)" \
    "python -c \"
import pathlib
q = chr(39)
p = pathlib.Path('frontend/src/pages/EducationPage.jsx'); t = p.read_text()
p.write_text(t.replace('to: ' + q + '/dashboard?tab=montecarlo' + q,
                       'to: ' + q + '/dashboard?tab=monte-carlo' + q, 1))\""

  probar "un enlace a una pestaña del diario que la URL no acepta" \
    "(cd frontend && node scripts/check-enlaces-academia.js)" \
    "python -c \"
import pathlib
q = chr(39)
p = pathlib.Path('frontend/src/pages/EducationPage.jsx'); t = p.read_text()
p.write_text(t.replace('to: ' + q + '/performance?tab=validation' + q,
                       'to: ' + q + '/performance?tab=validacion' + q, 1))\""

  probar "un módulo que enlaza un id que no está en la tabla" \
    "(cd frontend && node scripts/check-enlaces-academia.js)" \
    "python -c \"
import pathlib
q = chr(39)
p = pathlib.Path('frontend/src/pages/EducationPage.jsx'); t = p.read_text()
p.write_text(t.replace('ids={[' + q + 'pattern' + q + ']}',
                       'ids={[' + q + 'patrones' + q + ']}', 1))\""

  probar "la etiqueta de un enlace desaparece de un solo idioma" \
    "(cd frontend && node scripts/check-enlaces-academia.js)" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/lib/i18n/ja.js'); t = p.read_text()
p.write_text(t.replace('\\\"lsTitle\\\":', '\\\"lsTitleX\\\":', 1))\""

  probar "el diario acepta por la URL una pestaña que no pinta" \
    "(cd frontend && node scripts/check-enlaces-academia.js)" \
    "python -c \"
import pathlib
q = chr(39)
p = pathlib.Path('frontend/src/pages/PerformancePage.jsx'); t = p.read_text()
p.write_text(t.replace(q + 'overview' + q + ', ' + q + 'backtesting' + q,
                       q + 'overview' + q + ', ' + q + 'fantasma' + q, 1))\""

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

# El diccionario de cada idioma vive en DOS ficheros, y `lee()` sólo abría el
# primero. Con los 2.308 claves de la academia fuera de su alcance, el
# verificador imprimía ✅ con 103 claves en inglés literal en pantalla — el
# mismo fallo que dice cerrar, una carpeta más allá. Este sabotaje va contra
# `.edu.js` a propósito: es el fichero que no miraba.
probar "una clave con el texto inglés literal en el .edu.js de japonés" \
  "(cd frontend && node scripts/i18n-traducido.js)" \
  "python -c \"
import pathlib, re
en = pathlib.Path('frontend/src/lib/i18n/en.edu.js').read_text()
v = re.search(r'\\\"wyckoffVolumeTitle\\\": \\\"([^\\\"]*)\\\"', en).group(1)
p = pathlib.Path('frontend/src/lib/i18n/ja.edu.js'); t = p.read_text()
p.write_text(re.sub(r'(\\\"wyckoffVolumeTitle\\\": )\\\"[^\\\"]*\\\"', lambda m: m.group(1) + '\\\"' + v + '\\\"', t, count=1))\""

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
# Necesita `frontend/node_modules` (importa zustand). El job de doc de CI sólo
# monta Python, así que ahí se salta y lo cubre el job de frontend, que sí
# ejecuta el verificador —aunque sin sabotearlo—.
if [ -d frontend/node_modules ]; then
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
else
  echo "  ⏭️  Identidad de t: sin frontend/node_modules, no se prueba"
fi

# ── El presupuesto de peso caza una pantalla que engorda ────────────────────
# Necesita el build compilado y el servidor en pie, así que sólo se prueba si
# están; si no, se dice que se salta en vez de figurar como aprobado.
# ⚠️ La comprobación va con `curl -f` y contra la RAÍZ. Estaba sin `-f` y contra
# `/Tradingcalculatorpro.com/`, la base de GitHub Pages de antes del cutover
# (2026-08-28): sin `-f`, curl sale 0 también con un 404, así que la guarda decía
# «el servidor está en pie» ante cualquier cosa que escuchara en el puerto, y la
# ruta que preguntaba ya no existía. Misma familia que los anclas obsoletos de
# BUG-078: una constante copiada que no siguió al dominio.
if [ -d frontend/build ] && curl -sf -o /dev/null --max-time 3 "http://localhost:3100/"; then
  titulo "Presupuesto de peso (peso.js)"
  probar "un presupuesto por debajo de lo que pesa la pantalla" \
    "node tests/e2e/navegador/peso.js" \
    "python -c \"
import json, pathlib
p = pathlib.Path('tests/e2e/presupuesto-peso.json'); d = json.loads(p.read_text())
r = d['rutas']['portada']; r['js'] //= 2; r['total'] //= 2
p.write_text(json.dumps(d, indent=2) + chr(10))\"" \
    "git checkout -- tests/e2e/presupuesto-peso.json"

  # ⚠️ Los tres recompilados de aquí abajo (RECOMPILA, RECOMPILA_ADMIN y
  # RECOMPILA_CSS) llaman a `craco build`, que es SÓLO el paso de webpack: no
  # ejecuta el `postbuild`, y el postbuild es quien genera las 1.640 páginas
  # estáticas. `craco build` empieza vaciando `build/`, así que cada uno de
  # estos sabotajes se llevaba por delante `build/learn/`, `build/tools/`,
  # `build/markets/` y `build/estrategias/`.
  #
  # Consecuencia, y este script existe precisamente para que no pase: el bloque
  # de check-seo viene DESPUÉS, no encontraba páginas, y sus diez casos salían
  # como «no pasa ni ANTES de sabotear». Diez sabotajes que llevaban tiempo sin
  # probar nada, degradados a avisos que se leen como ruido. Por eso los tres
  # recompilan ahora también las páginas.

  # ── La CSP no puede romper la web ─────────────────────────────────────────
  # El `meta` NO admite report-only: no hay ensayo posible. Si esta sonda no
  # discriminara, una directiva de menos llegaría a producción bloqueando
  # TradingView o el botón de Google, y ningún test offline lo notaría porque
  # ninguno abre un navegador.
  #
  # Se sabotea el ARTEFACTO (build/index.html) y no la fuente: recompilar aquí
  # costaría minutos y lo que se prueba —que la sonda ve una violación— no
  # depende de por dónde entró la directiva.
  # `frontend/build/` está en .gitignore, así que `git checkout --` NO lo
  # restaura: la copia de seguridad se hace y se deshace a mano.
  CSP_COPIA="$(mktemp)"
  TEMPORALES+=("$CSP_COPIA")
  cp frontend/build/index.html "$CSP_COPIA"

  titulo "Content-Security-Policy (csp.js)"
  probar "una directiva de menos bloquea un script que la web necesita" \
    "node tests/e2e/navegador/csp.js" \
    "sed -i 's|https://www.googletagmanager.com|https://zz-sabotaje.invalid|' frontend/build/index.html" \
    "cp '$CSP_COPIA' frontend/build/index.html"

  # El WebSocket va aparte porque su fallo tiene otra forma: no es un origen
  # de menos, es un ESQUEMA de menos. En CSP3 una fuente `https://host` no
  # autoriza `wss://host` —la relajación va de `ws` a `http`/`https`, nunca al
  # revés—, así que la política podía listar el backend entero y aun así dejar
  # las alertas mudas. La primera versión de esta sonda lo pasó por alto un mes
  # entero: recorría `/dashboard` sin sesión, y sin token el hook no abre nada.
  probar "el esquema wss:// de menos deja el WebSocket de alertas bloqueado" \
    "node tests/e2e/navegador/csp.js" \
    "sed -i 's| ws://127.0.0.1:8080||' frontend/build/index.html" \
    "cp '$CSP_COPIA' frontend/build/index.html"

  # Y la guarda contra el verde vacío: sin sesión no hay WebSocket que bloquear,
  # así que «ninguna violación» no significaría nada. La sonda tiene que
  # distinguir «autorizado» de «nunca se intentó».
  probar "una sesión rota NO puede pasar por «no hubo violaciones»" \
    "node tests/e2e/navegador/csp.js" \
    "true" \
    "true" \
    "QA_PASSWORD=contrasena-que-no-es"

  # Y la otra mitad: que NO grite con la política correcta. Sin esto, una sonda
  # que diera error siempre pasaría igual el sabotaje de arriba.
  probar_inverso "la política real no produce ninguna violación" \
    "node tests/e2e/navegador/csp.js" \
    "true"

  # ── Lo indefinido se pinta como raya ──────────────────────────────────────
  # La primera regla de honestidad del proyecto convirtió varias métricas de `0`
  # a `None`. El otro extremo del cambio se olvidó: la pantalla que las
  # interpolaba a pelo pasó a pintar «nullR» y «Sharpe: null», que es peor que
  # el cero que se quería evitar — el cero parece un número, «null» parece una
  # web rota, y en la pantalla con la que alguien dimensiona una posición eso
  # se lleva por delante la confianza en el resto de las cifras.
  #
  # Se sabotea el ARTEFACTO: se quita la guarda `null==avg_r?"—"` del bundle
  # servido, que es exactamente la regresión que la sonda vigila.
  NULOS_COPIA="$(mktemp -d)"
  TEMPORALES+=("$NULOS_COPIA")
  cp frontend/build/static/js/*.js "$NULOS_COPIA/"

  titulo "Lo indefinido es una raya (nulos.js)"
  probar "una métrica indefinida vuelve a pintarse cruda" \
    "node tests/e2e/navegador/nulos.js" \
    "python -c \"
import glob, io, re
# La guarda se localiza por FORMA, no por el nombre que el minificador
# asigne: era 'V.avg_r' hoy y puede ser otra letra en la proxima
# compilacion. Atarlo a la letra hizo que el sabotaje no se aplicara y
# el verificador 'sobreviviera' sin que nadie hubiera roto nada.
patron = re.compile(r'null==([A-Za-z_\$]+)\\.avg_r\\?')
tocados = 0
for f in glob.glob('frontend/build/static/js/*.js'):
    t = io.open(f, encoding='utf-8').read()
    t2, n = patron.subn(lambda m: 'null==%s.avg_r&&!1?' % m.group(1), t)
    if n:
        io.open(f, 'w', encoding='utf-8').write(t2); tocados += n
assert tocados, 'el sabotaje de nulos no encontro la guarda de la raya'\"" \
    "cp '$NULOS_COPIA'/*.js frontend/build/static/js/"

  # Y la otra mitad: con la guarda puesta NO grita. Sin esto, una sonda que
  # diera error siempre pasaría igual el sabotaje de arriba.
  probar_inverso "con las guardas puestas no encuentra ninguna cifra cruda" \
    "node tests/e2e/navegador/nulos.js" \
    "true"

  # ── El arranque del idioma ────────────────────────────────────────────────
  # Se sabotea en la FUENTE y se recompila, que tarda unos minutos. Es el
  # precio de probar de verdad: el fallo que vigila —el diccionario que no
  # llega antes de pintar, o `t` con identidad estable— no existe en el
  # código fuente, sólo en el artefacto compilado. Parchear el build a mano
  # probaría que la sonda sabe contar, no que caza la regresión.
  titulo "Arranque del idioma (idioma-arranque.js)"
  RECOMPILA="(cd frontend && REACT_APP_BACKEND_URL=http://127.0.0.1:8080 npx craco build >/dev/null 2>&1 && node scripts/gen-seo-pages.js >/dev/null 2>&1)"

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

# ── El panel de admin explica el fallo en vez de romperse ───────────────────
# Sirve el build y responde a /api/** desde la propia sonda: no necesita backend
# ni Postgres, porque lo que se prueba es cómo REACCIONA la interfaz.
if [ -d frontend/build ] && [ -d tests/e2e/lib/playwright-core ]; then
  titulo "Panel de admin ante respuestas de error (panel-admin.js)"
  RECOMPILA_ADMIN="(cd frontend && PUBLIC_URL=/ REACT_APP_BACKEND_URL=https://backend.example CI=false npx craco build >/dev/null 2>&1 && node scripts/gen-seo-pages.js >/dev/null 2>&1)"
  probar "el panel se traga un 428 y deja las tablas en blanco" \
    "node tests/e2e/navegador/panel-admin.js" \
    "python -c \"import pathlib; p=pathlib.Path('frontend/src/pages/AdminPage.jsx'); s=p.read_text(encoding='utf-8'); i=s.find('      if (mRes.status === 428'); j=s.find('        return;', i)+len('        return;\\n      }\\n'); p.write_text(s[:i]+s[j:], encoding='utf-8')\" && $RECOMPILA_ADMIN" \
    "git checkout -- . && $RECOMPILA_ADMIN"
else
  echo "  ⏭️  Panel de admin: sin build o sin playwright-core, no se prueba"
fi

# ── Contraste del texto en los dos temas ────────────────────────────────────
# Levanta su propio servidor, así que basta con el build. Se sabotea el token
# que causó el fallo real: el verde del tema claro a `35%`, que dejaba 48
# textos por debajo de la WCAG. Un umbral escrito y nunca roto no prueba nada.
if [ -d frontend/build ]; then
  titulo "Contraste WCAG (contraste.js)"
  RECOMPILA_CSS="(cd frontend && REACT_APP_BACKEND_URL=http://127.0.0.1:8080 npx craco build >/dev/null 2>&1 && node scripts/gen-seo-pages.js >/dev/null 2>&1)"
  probar "el verde del tema claro vuelve a un tono que no contrasta" \
    "node tests/e2e/navegador/contraste.js" \
    "python -c \"
import pathlib
p = pathlib.Path('frontend/src/index.css'); t = p.read_text()
i = t.index('.light {'); j = t.index('}', i)
import re
# Se ACLARA el verde primario del tema claro sea cual sea su valor: atarlo
# al literal '145 70% 26%' hizo que el sabotaje dejara de aplicarse el dia
# que ese 26% bajo a 22% por accesibilidad, y el verificador paso sin que
# nadie hubiera roto nada.
trozo = re.sub(r'--primary:\\s*145 70% \\d+%', '--primary: 145 70% 35%', t[i:j])
assert trozo != t[i:j], 'el sabotaje de contraste no encontro --primary en .light'
p.write_text(t[:i] + trozo + t[j:])\" \
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

if [ -d frontend/node_modules ]; then
  # ── Cada idioma en su alfabeto (i18n-escritura.js) ──────────────────────────
  # Los dos cebos son las erratas REALES que se colaron escribiendo traducciones a
  # mano y que pasaron `i18n-check` e `i18n-traducido` sin despeinarse: un carácter
  # chino dentro de una frase italiana y uno coreano dentro de una japonesa.
  titulo "Alfabeto por idioma (i18n-escritura.js)"
  ESCRITURA="(cd frontend && node scripts/i18n-escritura.js)"

  probar "un carácter chino dentro de una frase italiana" \
    "$ESCRITURA" \
    "sed -i 's/\"nfHome\": \"Vai alla home\"/\"nfHome\": \"Vai alla 决home\"/' frontend/src/lib/i18n/it.js" \
    "git checkout -- frontend/src/lib/i18n/it.js"

  probar "un carácter coreano dentro de una frase japonesa" \
    "$ESCRITURA" \
    "sed -i 's/\"nfHome\": \"ホームへ\"/\"nfHome\": \"ホーム별へ\"/' frontend/src/lib/i18n/ja.js" \
    "git checkout -- frontend/src/lib/i18n/ja.js"

  # El griego se permite en TODOS los idiomas a propósito: Γ, Δ, Θ y σ son
  # notación financiera, no idioma. Si esto saltara, el verificador estaría
  # marcando como errata la mitad del panel de opciones.
  probar_inverso "una letra griega en una frase inglesa (Γ es notación, no idioma)" \
    "$ESCRITURA" \
    "sed -i 's/\"nfHome\": \"Go home\"/\"nfHome\": \"Go home Γ\"/' frontend/src/lib/i18n/en.js" \
    "git checkout -- frontend/src/lib/i18n/en.js"

  # ── El quiz califica lo que dice calificar (check-quiz.js) ──────────────
  titulo "Corrección del quiz (check-quiz.js)"
  QUIZ="(cd frontend && node scripts/check-quiz.js)"

  # El cebo es el fallo REAL que vigila: intercambiar los valores de las dos
  # opciones opuestas en un idioma. La pregunta sigue leyéndose bien y el quiz
  # empieza a calificar al revés.
  probar "una traducción intercambia «sube» y «baja» entre las dos opciones" \
    "$QUIZ" \
    "python3 -c \"
import io
p='frontend/src/lib/i18n/ja.js'; s=io.open(p,encoding='utf-8').read()
a=s[s.index('\\\"qzStart1a\\\":'):s.index(chr(10),s.index('\\\"qzStart1a\\\":'))]
b=s[s.index('\\\"qzStart1b\\\":'):s.index(chr(10),s.index('\\\"qzStart1b\\\":'))]
va=a.split(': ',1)[1].rstrip(','); vb=b.split(': ',1)[1].rstrip(',')
s=s.replace(a,'  \\\"qzStart1a\\\": '+vb+',').replace(b,'  \\\"qzStart1b\\\": '+va+',')
io.open(p,'w',encoding='utf-8').write(s)\"" \
    "git checkout -- frontend/src/lib/i18n/ja.js"

  # Y el inverso, que es el que evita que el verificador se vuelva insufrible:
  # reescribir una opción con otras palabras del MISMO sentido no puede saltar,
  # o a la primera traducción mejorada alguien lo desactiva.
  probar_inverso "una opción reescrita con otras palabras del mismo sentido" \
    "$QUIZ" \
    "sed -i 's|\"qzPro1a\": \"Prämie verkaufen\"|\"qzPro1a\": \"Optionsprämien verkaufen und die Zeitprämie vereinnahmen\"|' frontend/src/lib/i18n/de.js" \
    "git checkout -- frontend/src/lib/i18n/de.js"

  # ── Los diagramas de la academia no ganan castellano (check-visuales-idioma) ─
  titulo "Techo de castellano en los diagramas (check-visuales-idioma.js)"
  VISUALES="(cd frontend && node scripts/check-visuales-idioma.js)"
  VISUAL_NUEVO="frontend/src/components/education/ZzSabotajeVisual.jsx"
  TEMPORALES+=("$VISUAL_NUEVO")

  probar "un rótulo castellano nuevo en un diagrama existente" \
    "$VISUALES" \
    "sed -i 's|>trigo · café<|>trigo · café</T><T>rotación estacional<|' frontend/src/components/education/CommoditiesVisual.jsx" \
    "git checkout -- frontend/src/components/education/CommoditiesVisual.jsx"

  probar "un diagrama NUEVO que nace en castellano (techo cero)" \
    "$VISUALES" \
    "printf 'import React from \"react\";\nexport default () => <svg><text>máximo previo</text></svg>;\n' > $VISUAL_NUEVO" \
    "rm -f $VISUAL_NUEVO"

else
  echo "  ⏭️  Alfabeto por idioma y techo de los diagramas: sin frontend/node_modules"
fi

# ── Los sabotajes que corren pytest necesitan las dependencias del backend ──
# El job de «Doc» de CI monta Python pero NO instala `requirements.txt`, así que
# ahí `python -m pytest` no existe. Sin esta guarda los cinco bloques de abajo
# reportan «no pasa ni ANTES de sabotear» y tumban el CI entero — que es lo que
# le pasaba a `main` (runs de ec2c576 y 0b289e2, ambos en rojo). Los cubre el job
# de backend, que sí instala e invoca esos mismos tests.
# Se comprueba lo que los tests NECESITAN (pytest Y las dependencias que importa
# `server.py`), no sólo que exista el corredor: con pytest instalado pero sin
# fastapi, los bloques pasan la guarda y fallan igual — que es el mismo verde
# falso, sólo que un paso más adelante.
if python -c 'import pytest, fastapi' >/dev/null 2>&1 && [ -f backend/server.py ]; then
  # ── El origen servido y la lista de CORS no pueden divergir ─────────────────
  # El fallo que esto fija ocurrió dos veces, una en cada sentido: el 2026-08-05
  # la lista traía el dominio propio y la web se servía en GitHub Pages, y el
  # 2026-08-28 el cutover puso el `CNAME` en `tradingcalculator.pro` y la lista se
  # quedó con el dominio viejo. En los dos casos la web entera dejó de hablar con
  # el backend, y en los dos casos los logs de Cloud Run se veían perfectos: sin
  # cabecera CORS el backend responde 200 y es el NAVEGADOR quien tira la
  # respuesta. `curl` tampoco lo reproduce.
  #
  # Se sabotea moviendo el `CNAME` a otro dominio, que es exactamente el cambio de
  # una línea que dejó la web caída.
  titulo "El origen servido está permitido (test_security_unit.py)"
  CORS_TEST="(cd backend && python -m pytest tests/test_security_unit.py -q -k origin_matches_the_cname -p no:cacheprovider)"
  probar "un CNAME que ya no coincide con la lista de CORS" \
    "$CORS_TEST" \
    "printf 'otrodominio.example\n' > frontend/public/CNAME"

  # Y la otra dirección: el dominio parecido de un tercero
  # (`tradingcalculatorpro.com`, sin punto) no puede volver a colarse en la lista.
  # Con `allow_credentials=True` le dejaría leer respuestas autenticadas.
  titulo "El dominio ajeno sigue fuera de CORS (test_security_unit.py)"
  probar "el dominio de un tercero devuelto a la lista de CORS" \
    "(cd backend && python -m pytest tests/test_security_unit.py -q -k lookalike_third_party -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
p.write_text(s.replace('    \"https://tradingcalculator.pro\",\n', '    \"https://tradingcalculator.pro\",\n    \"https://tradingcalculatorpro.com\",\n', 1), encoding='utf-8')
EOF"

  # ── El correo no puede distinguir mayúsculas ────────────────────────────────
  # BUG-070: el registro guardaba el correo tal como se tecleaba y el login lo
  # buscaba con igualdad exacta, que en PostgreSQL SÍ distingue mayúsculas. Quien
  # se registró como `Ana@x.com` y entraba como `ana@x.com` recibía 401 con la
  # contraseña correcta, y el 401 es idéntico al de una contraseña mala: no había
  # ninguna pista ni en pantalla ni en los logs.
  titulo "Correo insensible a mayúsculas (test_security_unit.py)"
  # ⚠️ El ancla de este sabotaje se quedó obsoleta y nadie se enteró: buscaba
  # `{"email": {"$ieq": credentials.email}}`, que BUG-070 sustituyó por
  # `_buscar_usuario_por_correo()`. El `replace` no encontraba nada, escribía el
  # fichero igual, salía con 0 y el informe decía «SOBREVIVE» — indistinguible de
  # un verificador roto. De ahí el `assert count == 1`: si el login se vuelve a
  # reescribir, esto grita en vez de mentir.
  probar "el login vuelve a buscar el correo con igualdad exacta" \
    "(cd backend && python -m pytest tests/test_security_unit.py -q -k login_looks_the_user_up -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = 'user = await _buscar_usuario_por_correo(credentials.email)'
assert s.count(viejo) == 1, 'ancla de la busqueda del login no encontrada'
nuevo = 'user = await db.users.find_one({\"email\": credentials.email})'
p.write_text(s.replace(viejo, nuevo, 1), encoding='utf-8')
EOF"

  probar "el registro deja de normalizar el correo al guardarlo" \
    "(cd backend && python -m pytest tests/test_security_unit.py -q -k register_stores -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
p.write_text(s.replace('\"email\": email_norm,', '\"email\": user_data.email,', 1), encoding='utf-8')
EOF"

  # La otra mitad, y es la que de verdad importa: el arreglo NO puede degradar a
  # un regex sin anclar. `~*` haría substring, y un correo es un regex válido, así
  # que `ana@x.com` casaría con `otro+ana@x.com.evil.com` — suplantación de cuenta.
  probar "el operador insensible degrada a un regex sin anclar" \
    "(cd backend && python -m pytest tests/test_security_unit.py -q -k ieq_is_not_an_unanchored -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = 'parts.append(f\"LOWER((data->>\'{ key }\')) = LOWER(\${param_idx})\")'
nuevo = 'parts.append(f\"(data->>\'{ key }\') ~* \${param_idx}\")'
assert s.count(viejo) == 1
p.write_text(s.replace(viejo, nuevo, 1), encoding='utf-8')
EOF"

  # ── Con duplicados, la cuenta elegida no puede cambiar ──────────────────────
  # El daño colateral de BUG-070: la comprobación de duplicados del registro
  # también distinguía mayúsculas, así que el mismo correo se dio de alta DOS
  # veces en producción. Y `find_one` es `SELECT … LIMIT 1` sin `ORDER BY`: con dos
  # filas que casan, PostgreSQL devuelve una cualquiera. Entrar unas veces en una
  # cuenta y otras en la otra es peor que fallar, y en `admin/promote` o en el alta
  # manual de un cobro significa tocar la fila equivocada.
  titulo "Elección determinista de cuenta (test_security_unit.py)"
  probar "el buscador deja de preferir la coincidencia exacta" \
    "(cd backend && python -m pytest tests/test_security_unit.py -q -k exact_match_wins -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '        if (u.get(\"email\") or \"\") == correo:'
assert s.count(viejo) == 1, 'ancla del desempate no encontrada'
p.write_text(s.replace(viejo, '        if False:', 1), encoding='utf-8')
EOF"

  probar "el buscador deja de ordenar y vuelve a elegir al azar" \
    "(cd backend && python -m pytest tests/test_security_unit.py -q -k row_order -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '.sort(\"created_at\", 1).to_list(None)'
assert s.count(viejo) == 1, 'ancla del orden no encontrada'
p.write_text(s.replace(viejo, '.to_list(None)', 1), encoding='utf-8')
EOF"

  # ── Toda respuesta de auth describe al usuario igual ────────────────────────
  # BUG-072: cuatro respuestas —login, refresh, magic link y Google— mandaban
  # `is_admin` pero no `two_factor_enabled`. La guarda del panel decide con
  # `two_factor_enabled === false`, y con el campo ausente `undefined === false`
  # es FALSO: el admin entraba y luego el backend le devolvía 428 en cada llamada.
  # Síntoma: en incógnito «funcionaba» y en el navegador de siempre no.
  titulo "Forma de las respuestas de auth (test_security_unit.py)"
  probar "una respuesta de auth que se deja el 2FA" \
    "(cd backend && python -m pytest tests/test_security_unit.py -q -k describes_the_user -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '            \"two_factor_enabled\": bool(user.get(\"totp_enabled\", False)),'
assert s.count(viejo) == 4, 'ancla del 2FA no encontrada'
p.write_text(s.replace(viejo, '', 1), encoding='utf-8')
EOF"

  # Y el otro sentido: la regla mira los objetos `user` de RESPUESTA, no las filas
  # de base de datos ni las tablas del panel, que no tienen por qué llevar el
  # campo. Un heurístico por claves las marcaba a todas y se habría desactivado.
  probar_inverso "una fila de base de datos con is_admin y sin 2FA" \
    "(cd backend && python -m pytest tests/test_security_unit.py -q -k describes_the_user -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
p.write_text(s + '\n_ZZ_FILA = {\"email\": \"x@y.z\", \"is_admin\": False, \"created_at\": \"\"}\n', encoding='utf-8')
EOF"

  # ── Qué rutas llevan límite de tasa, y cuáles no ────────────────────────────
  # El alta se quedó sin límite a propósito (2026-09-01). Es justo el cambio que
  # alguien deshace al ver un endpoint público sin limitar, y el que se lleva por
  # delante los otros tres de una pasada.
  titulo "Límites de tasa (test_rate_limit_key_unit.py)"

  probar "vuelve a ponerse un límite en el alta" \
    "(cd backend && python -m pytest tests/test_rate_limit_key_unit.py -q -k alta_no_lleva -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '@api_router.post(\"/auth/register\", response_model=dict)'
assert s.count(viejo) == 1, 'ancla del registro no encontrada'
p.write_text(s.replace(viejo, viejo + chr(10) + '@limiter.limit(\"3/hour\")', 1), encoding='utf-8')
EOF"

  probar "se quitan también los límites que protegen al dueño de la cuenta" \
    "(cd backend && python -m pytest tests/test_rate_limit_key_unit.py -q -k protegen_al_dueno -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '@limiter.limit(\"3/hour\")' + chr(10)
assert s.count(viejo) == 3, f'se esperaban 3 limites de 3/hora, hay {s.count(viejo)}'
p.write_text(s.replace(viejo, '', 3), encoding='utf-8')
EOF"

  # ── Ajustes y alta: guardar de verdad, y que lo guardado vuelva ─────────────
  # El botón «Guardar» de Ajustes daba 405 desde siempre, y el alta descartaba
  # el país que su propio formulario obliga a rellenar.
  titulo "Perfil y ajustes (test_perfil_ajustes_unit.py / test_security_unit.py)"

  probar "el perfil vuelve a aceptar un solo método (405 en el otro)" \
    "(cd backend && python -m pytest tests/test_perfil_ajustes_unit.py -q -k los_dos_metodos -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '@api_router.put(\"/auth/profile\")' + chr(10)
assert s.count(viejo) == 1, 'ancla del PUT no encontrada'
p.write_text(s.replace(viejo, '', 1), encoding='utf-8')
EOF"

  probar "el alta vuelve a descartar el país en silencio" \
    "(cd backend && python -m pytest tests/test_perfil_ajustes_unit.py -q -k acepta_el_pais -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
ini = s.find('class UserCreate(BaseModel):')
fin = s.find('class UserLogin(BaseModel):')
assert -1 < ini < fin, 'UserCreate no encontrado'
cuerpo = s[ini:fin]
viejo = '    country: Optional[str] = None' + chr(10)
assert cuerpo.count(viejo) == 1, 'ancla del pais en UserCreate no encontrada'
p.write_text(s[:ini] + cuerpo.replace(viejo, '', 1) + s[fin:], encoding='utf-8')
EOF"

  probar "una respuesta de auth deja de devolver lo que el usuario guardó" \
    "(cd backend && python -m pytest tests/test_security_unit.py -q -k devuelven_lo_que -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '            \"country\": user.get(\"country\"),' + chr(10)
assert s.count(viejo) >= 1, 'ancla de country no encontrada'
p.write_text(s.replace(viejo, '', 1), encoding='utf-8')
EOF"

  probar "Ajustes deja de resincronizar el formulario (los datos saltan)" \
    "(cd backend && python -m pytest tests/test_perfil_ajustes_unit.py -q -k resincroniza -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('frontend/src/pages/SettingsPage.jsx')
s = p.read_text(encoding='utf-8')
viejo = '  useEffect(() => { setProfileName(nombreServidor); }, [nombreServidor]);' + chr(10)
assert s.count(viejo) == 1, 'ancla del efecto no encontrada'
p.write_text(s.replace(viejo, '', 1), encoding='utf-8')
EOF"

  # ── La palanca de emergencia y el diagnóstico (2026-09-01) ──────────────────
  # Son la salida cuando el margen de alta ya está gastado. Si la palanca deja de
  # caducar, o el diagnóstico empieza a escribir, dejan de ser lo que prometen.
  titulo "Palanca de 2FA y diagnóstico (test_admin_2fa_unit.py)"

  probar "la palanca deja de caducar (se vuelve un interruptor)" \
    "(cd backend && python -m pytest tests/test_admin_2fa_unit.py -q -k una_fecha_no_un_interruptor -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = 'return limite if datetime.now(timezone.utc) < limite else None'
assert s.count(viejo) == 1, 'ancla de la caducidad no encontrada'
p.write_text(s.replace(viejo, 'return limite', 1), encoding='utf-8')
EOF"

  probar "una fecha ilegible deja de tratarse (revienta en vez de cerrar)" \
    "(cd backend && python -m pytest tests/test_admin_2fa_unit.py -q -k fecha_ilegible -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
ini = s.find('def _bypass_2fa_vigente')
assert ini > -1, 'ayudante de la palanca no encontrado'
fin = s.find(chr(10) + chr(10) + chr(10), ini)
cuerpo = s[ini:fin]
assert cuerpo.count('    except ValueError:') == 1, 'ancla del except no encontrada'
p.write_text(s[:ini] + cuerpo.replace('    except ValueError:', '    except KeyError:', 1) + s[fin:], encoding='utf-8')
EOF"

  probar "preguntar por el diagnóstico gasta el margen de alta" \
    "(cd backend && python -m pytest tests/test_admin_2fa_unit.py -q -k no_abre_el_margen -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '    email = (user.get(\"email\") or \"\").lower()'
assert s.count(viejo) == 1, 'ancla del diagnostico no encontrada'
p.write_text(s.replace(viejo, '    await _abrir_o_comprobar_margen_2fa(user)' + chr(10) + viejo, 1), encoding='utf-8')
EOF"

  # ── El encierro del admin y la sesión que se cerraba sola (BUG-076) ─────────
  # Cuatro maneras distintas de volver a encerrar a alguien:
  #   · esconder la tarjeta de 2FA a las cuentas que no son de contraseña,
  #   · devolverle al frontend una decisión que sólo el backend puede tomar,
  #   · reabrir el margen de alta en cada petición (margen infinito),
  #   · perdonar por la ventana de rotación un token revocado al cerrar sesión.
  titulo "Admin 2FA y sesión (test_admin_2fa_unit.py / test_refresh_rotation_unit.py)"

  probar "la tarjeta de 2FA vuelve a esconderse a las cuentas de Google" \
    "(cd backend && python -m pytest tests/test_admin_2fa_unit.py -q -k todas_las_cuentas -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('frontend/src/pages/SettingsPage.jsx')
s = p.read_text(encoding='utf-8')
viejo = '          <TwoFactorCard />'
assert s.count(viejo) == 1, 'ancla de la tarjeta no encontrada'
p.write_text(s.replace(viejo, \"          {user?.auth_provider === 'password' && <TwoFactorCard />}\", 1), encoding='utf-8')
EOF"

  probar "la guarda del frontend vuelve a adelantar la decisión del 2FA" \
    "(cd backend && python -m pytest tests/test_admin_2fa_unit.py -q -k no_vuelve_a_adelantar -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('frontend/src/components/common/ProtectedRoute.jsx')
s = p.read_text(encoding='utf-8')
viejo = '  if (adminOnly && !user?.is_admin) {'
assert s.count(viejo) == 1, 'ancla de la guarda no encontrada'
nuevo = '  if (adminOnly && user?.two_factor_enabled === false) { return null; }\n\n' + viejo
p.write_text(s.replace(viejo, nuevo, 1), encoding='utf-8')
EOF"

  probar "el margen de alta se reabre en cada petición (sería infinito)" \
    "(cd backend && python -m pytest tests/test_admin_2fa_unit.py -q -k un_solo_uso -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '    if marca:'
assert s.count(viejo) == 1, 'ancla de la rama de lectura no encontrada'
p.write_text(s.replace(viejo, '    if False:', 1), encoding='utf-8')
EOF"

  probar "la ventana de rotación deja de mirar POR QUÉ se revocó el token" \
    "(cd backend && python -m pytest tests/test_refresh_rotation_unit.py -q -k solo_perdona -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '    if not doc or doc.get(\"reason\") != \"rotation\":'
assert s.count(viejo) == 1, 'ancla del motivo no encontrada'
p.write_text(s.replace(viejo, '    if not doc:', 1), encoding='utf-8')
EOF"

  probar "cerrar sesión deja vivo el refresh token" \
    "(cd backend && python -m pytest tests/test_refresh_rotation_unit.py -q -k revoca_tambien -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('backend/server.py')
s = p.read_text(encoding='utf-8')
viejo = '    crudo_refresh = request.cookies.get(\"refresh_token\")'
assert s.count(viejo) == 1, 'ancla del refresh del logout no encontrada'
p.write_text(s.replace(viejo, '    crudo_refresh = None', 1), encoding='utf-8')
EOF"

  probar "un arranque en frío vuelve a cerrar la sesión al recargar" \
    "(cd backend && python -m pytest tests/test_refresh_rotation_unit.py -q -k solo_cierra -p no:cacheprovider)" \
    "python - <<'EOF'
import pathlib
p = pathlib.Path('frontend/src/lib/store.js')
s = p.read_text(encoding='utf-8')
viejo = 'if (res.status === 401 || res.status === 403) {'
assert s.count(viejo) == 1, 'ancla del 401 no encontrada'
p.write_text(s.replace(viejo, 'if (!res.ok) {', 1), encoding='utf-8')
EOF"

else
  titulo "Sabotajes sobre test_security_unit.py"
  echo "  ⏭️  se saltan: no hay pytest en este entorno (los cubre el job de backend)"
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

# ── Prosa NO es código vivo ─────────────────────────────────────────────────
# `es_comentario()` sólo miraba el primer carácter de la línea, así que
# etiquetaba «⚠️ CÓDIGO» cualquier prosa que no empezara por su marcador: una
# línea en medio de un docstring, un comentario al final de una línea, la
# continuación de un bloque {/* … */}. Los diez rastros del informe estaban los
# diez en prosa y escalaban a «🔴 2 bloqueantes».
#
# Van los DOS sentidos porque el fallo no era no-detectar, era no-distinguir:
# metiendo una asignación real recibía exactamente la misma marca que un
# docstring. Con una sola dirección, un clasificador que dijera «CÓDIGO» a todo
# seguiría pasando.
VIVO_PY="backend/zz_sabotaje_resto.py"
TEMPORALES+=("$VIVO_PY")
EN_CODIGO="python scripts/auditar.py > $INFORME 2>/dev/null; ! grep -q 'en código vivo' $INFORME"

probar "una asignación real a una pasarela retirada" \
  "$EN_CODIGO" \
  "printf 'OXAPAY_API_KEY = \"zz\"\n' > $VIVO_PY" \
  "rm -f $VIVO_PY"

probar_inverso "un docstring que sólo NOMBRA la pasarela retirada" \
  "$EN_CODIGO" \
  "printf '\"\"\"Sustituye al flujo de OxaPay.\n\nSegunda linea del docstring, que tambien dice OxaPay.\n\"\"\"\n' > $VIVO_PY" \
  "rm -f $VIVO_PY"

# El cebo es la forma EXACTA que se coló hasta el 2026-08-24: encabezado con la
# fecha entre paréntesis en vez de al principio. `_ENCABEZADO_FECHADO` exigía
# `## 2026-07-30 — …` y contaba las cuarenta líneas que colgaban de
# `## Plan de trading versionado (2026-07-30)` como afirmaciones de hoy.
probar_inverso "un registro fechado que dice 8 idiomas porque ese día había 8" \
  "$CONTRADICE" \
  "printf '# Zz sabotaje\n\n## Sesión de ayer (2026-07-04) — i18n\n\nCerró con 8 idiomas a la par.\n' > $DOC_SABOTAJE" \
  "rm -f $DOC_SABOTAJE"

# ── El cableado del asistente ───────────────────────────────────────────────
# Seis comprobaciones, seis sabotajes. Van una a una y no en bloque a propósito:
# `gen-asistente.py` corta en el primer fallo, así que un sabotaje múltiple sólo
# probaría el primero y dejaría los otros cinco sin verificar — que es justo la
# clase de cobertura falsa que este fichero existe para impedir.
titulo "Cableado del asistente (gen-asistente.py)"

probar "una skill cuyo name: no coincide con su carpeta" \
  "python scripts/gen-asistente.py --check" \
  "sed -i 's/^name: no-me-fio$/name: no-me-fio-renombrada/' .claude/skills/no-me-fio/SKILL.md"

probar "una cita a una skill que no existe" \
  "python scripts/gen-asistente.py --check" \
  "printf '\nAplica la skill \`fantasma-inexistente\`.\n' >> .claude/commands/examen-web.md"

probar "una regla con un paths: que no casa con ningún fichero" \
  "python scripts/gen-asistente.py --check" \
  "sed -i 's|^  - \"backend/Dockerfile\"$|  - \"backend/Dockerfile\"\n  - \"backend/NO_EXISTE_SABOTAJE.yaml\"|' .claude/rules/infra.md"

probar "una regla que CLAUDE.md deja de nombrar" \
  "python scripts/gen-asistente.py --check" \
  "sed -i 's|\`rules/preferencias.md\`|\`rules/NOMBRE_CAMBIADO.md\`|' CLAUDE.md"

probar "un subagente que no puede cargar la skill que dice seguir" \
  "python scripts/gen-asistente.py --check" \
  "sed -i 's|\.claude/skills/seguridad-pagos/SKILL\.md|(de memoria)|' .claude/agents/revisor-seguridad.md"

# La que cierra el bucle: sin ella el router es otra tabla escrita a mano.
# Se restaura con `rm -rf`, no con `git checkout`, porque el sabotaje crea un
# fichero SIN seguimiento y `git checkout -- .` no se lo lleva: el residuo haría
# fallar todos los tests posteriores.
probar "una skill nueva que el router no enruta" \
  "python scripts/gen-asistente.py --check" \
  "mkdir -p .claude/skills/zzz-sabotaje && printf -- '---\nname: zzz-sabotaje\ndescription: Skill de sabotaje.\n---\n\n# Sabotaje\n' > .claude/skills/zzz-sabotaje/SKILL.md" \
  "rm -rf .claude/skills/zzz-sabotaje"

probar "el mapa del asistente que se queda atrás" \
  "python scripts/gen-asistente.py --check" \
  "sed -i 's/^## Skills (/## Habilidades (/' .claude/ARQUITECTURA_ASISTENTE.md"

# El otro lado: la prosa histórica de docs/ cita skills retiradas y eso NO es un
# fallo de cableado. Sin esta comprobación, ampliar el radio a todo el repo para
# «cubrir más» convertiría cada auditoría vieja en un error, y el arreglo sería
# apagar la comprobación entera.
probar_inverso "una skill inexistente citada en docs/ no es cableado roto" \
  "python scripts/gen-asistente.py --check" \
  "printf '\nSe aplicó la skill \`ya-retirada-en-2026\`.\n' >> docs/REGISTRO_SESIONES.md"

# El mapa cuenta cuántos ficheros casan con cada regla, y ese número tiene que
# salir igual en todas las máquinas. No salía: al crear un `backend/.venv` local,
# `backend/**/*.py` pasó de 130 a 8990 y `--check` empezó a fallar solo — con el
# repositorio intacto. Un fichero generado que depende de lo que tengas instalado
# convierte su propio aviso en ruido, y un aviso que es ruido se deja de leer.
probar_inverso "un .venv o node_modules no cambia el recuento" \
  "python scripts/gen-asistente.py --check" \
  "mkdir -p backend/.venv/lib/sab frontend/node_modules/sab && echo 'x=1' > backend/.venv/lib/sab/f.py && echo '//' > frontend/node_modules/sab/f.js" \
  "rm -rf backend/.venv/lib/sab frontend/node_modules/sab"

# ── Las páginas prerenderizadas siguen siendo indexables ────────────────────
# Necesita el build compilado: este verificador mira las páginas GENERADAS, no
# el generador. Sin build se dice que se salta, en vez de figurar como aprobado.
#
# Restaura con `cp`, no con `git checkout`: `build/` está en .gitignore, así que
# git no revertiría el sabotaje y todos los casos siguientes medirían una página
# ya rota — dando por bueno cualquier verificador que viniera detrás.
if [ -d frontend/build ] && [ -f frontend/build/sitemap.xml ]; then
  titulo "SEO de las páginas prerenderizadas (check-seo.js)"

  # La página de muestra tiene que ser una página DE VERDAD, y en un idioma que
  # no sea el español ni el árabe. Los tres requisitos han costado un susto:
  #
  #  · **Ni un puente.** Desde que los slugs se traducen, cada URL vieja queda
  #    publicada como redirección (`canonical` + `meta refresh`) y también casa
  #    con `*/learn/*`. `find … | head -1` cogió una, y como a los puentes no se
  #    les aplica el examen normal —no son páginas—, SEIS sabotajes salieron
  #    «SOBREVIVE» sobre comprobaciones que funcionaban perfectamente. Es
  #    exactamente el modo de fallo que BUG-078 dejó documentado: el dato de
  #    prueba desfasado, no la comprobación. `grep -L` los descarta.
  #  · **Español no**, porque el sabotaje de `<html lang>` lo pone a "es": sobre
  #    una página española no cambiaría nada.
  #  · **Árabe no**, porque su etiqueta lleva `dir="rtl"` y el `sed` del mismo
  #    sabotaje no casaría.
  #
  # Se fija la carpeta (`de/learn`) y no el fichero: los slugs salen del título
  # traducido, así que una ruta escrita a mano se pudriría a la primera revisión
  # de la traducción alemana.
  SEO_PAG=$(find frontend/build/de/learn -name index.html -print0 2>/dev/null \
    | xargs -0 grep -L 'http-equiv="refresh"' 2>/dev/null | sort | head -1)
  if [ -z "$SEO_PAG" ]; then
    echo "  ⚠️  no hay ninguna página real bajo build/de/learn/: recompila con 'cd frontend && npm run build'"
    FALLOS=$((FALLOS + 1))
  fi

  # Un puente cualquiera (los que dejó la traducción de slugs) y el hub ruso.
  # Por la misma razón que arriba: se buscan, no se escriben.
  SEO_PUENTE=$(find frontend/build/ru/learn -name index.html -print0 2>/dev/null \
    | xargs -0 grep -l 'http-equiv="refresh"' 2>/dev/null | sort | head -1)
  SEO_HUB=frontend/build/ru/learn/index.html
  SEO_REGEN="(cd frontend && node scripts/gen-seo-pages.js >/dev/null 2>&1)"
  SEO_BAK=$(mktemp); SEO_MAP=$(mktemp); SEO_SHELL=$(mktemp)
  TEMPORALES+=("$SEO_BAK" "$SEO_MAP" "$SEO_SHELL")
  cp "$SEO_PAG" "$SEO_BAK"; cp frontend/build/sitemap.xml "$SEO_MAP"
  # El shell también, que ahora hay sabotajes que lo tocan y `build/` está en
  # .gitignore: sin esta copia el sabotaje se quedaría puesto y los casos
  # siguientes medirían una portada ya rota.
  cp frontend/build/index.html "$SEO_SHELL"
  SEO_REST="cp $SEO_BAK $SEO_PAG; cp $SEO_MAP frontend/build/sitemap.xml; cp $SEO_SHELL frontend/build/index.html"

  # El canonical cruzado es el fallo más caro y el menos visible: la página se
  # ve perfecta y le está diciendo a Google que indexe otra.
  probar "un canonical que apunta a otra página" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|rel=\"canonical\" href=\"[^\"]*\"|rel=\"canonical\" href=\"https://abcde-rgb.github.io/Tradingcalculatorpro.com/otra/\"|' $SEO_PAG" \
    "$SEO_REST"

  probar "un idioma que se cae del hreflang" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i '/hreflang=\"it\"/d' $SEO_PAG" \
    "$SEO_REST"

  probar "<html lang> que no es el de su carpeta" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|<html lang=\"[a-z]*\">|<html lang=\"es\">|' $SEO_PAG" \
    "$SEO_REST"

  probar "una página sin título" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|<title>[^<]*</title>|<title></title>|' $SEO_PAG" \
    "$SEO_REST"

  # Un JSON-LD con una coma de más no da error en pantalla: Google lo descarta y
  # se pierde el resultado enriquecido sin que nadie se entere.
  probar "un JSON-LD que no parsea" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|<script type=\"application/ld+json\">|<script type=\"application/ld+json\">,,,|' $SEO_PAG" \
    "$SEO_REST"

  # Las calculadoras publican `@graph` (SoftwareApplication + HowTo) en vez de
  # `@type` en la raíz: el check tiene que aceptar eso, pero sin dejar pasar
  # un `@graph` con una entrada sin tipo — un JSON-LD parseable no es lo
  # mismo que un JSON-LD que describe algo.
  probar "un JSON-LD sin @type ni @graph válido" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|\"@type\":\"LearningResource\"|\"@typeSABOTAJE\":\"LearningResource\"|' $SEO_PAG" \
    "$SEO_REST"

  # El canonical secuestrado hacia un SUBDOMINIO que empieza igual. La primera
  # versión comparaba con `url.startsWith(DOMINIO)` y esto pasaba por bueno:
  # `https://tradingcalculator.pro.evil.com/x` empieza por
  # `https://tradingcalculator.pro`. Lo cazó CodeQL como alerta alta
  # (js/incomplete-url-substring-sanitization), no una prueba — de ahí ésta.
  probar "un canonical a un subdominio que empieza igual" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|rel=\"canonical\" href=\"[^\"]*\"|rel=\"canonical\" href=\"https://tradingcalculator.pro.evil.com/x/\"|' $SEO_PAG" \
    "$SEO_REST"

  probar "el sitemap anunciando una URL que no existe" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|</urlset>|<url><loc>https://abcde-rgb.github.io/Tradingcalculatorpro.com/no/existe/</loc></url></urlset>|' frontend/build/sitemap.xml" \
    "$SEO_REST"

  # El sitemap anunciando una ruta que robots.txt prohíbe. Pasó de verdad:
  # `/performance` es premium y robots la bloqueaba, pero el sitemap la anunciaba
  # porque el arreglo estaba escrito en `gen-sitemap.js` —que el build no ejecuta—
  # y no en `gen-seo-pages.js`, que es el que corre en `postbuild`.
  probar "el sitemap anunciando una ruta que robots.txt prohíbe" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|</urlset>|<url><loc>https://tradingcalculator.pro/performance</loc></url></urlset>|' frontend/build/sitemap.xml" \
    "$SEO_REST"

  # Un enlace plausible y muerto en el <noscript> del shell. Es el único camino
  # que tiene un rastreador sin JavaScript hacia las 1.640 páginas estáticas, así
  # que ahí un 404 no es un 404 más: es el callejón sin salida de la portada.
  # Pasó al escribir el bloque: `/learn/gestion-del-riesgo/`, cuando el módulo se
  # llama `gestion-del-capital`.
  probar "el <noscript> del shell enlazando una página que no existe" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|/learn/gestion-del-capital/|/learn/gestion-del-riesgo/|' frontend/build/index.html" \
    "$SEO_REST"

  # Un sitemap en public/. Había uno de verdad: 8 URLs con lastmod congelado en
  # 2026-08-11, que CRA copia a build/ y el postbuild pisa — salvo cuando el
  # postbuild no corre, y entonces se publica ése. Search Console vería el sitio
  # encoger de 1.648 URLs a 8.
  probar "un sitemap en public/ que pisaría al generado" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "printf '<?xml version=\"1.0\"?><urlset></urlset>' > frontend/public/sitemap.xml" \
    "rm -f frontend/public/sitemap.xml; $SEO_REST"

  probar "el <noscript> del shell borrado del build" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "python -c \"
import pathlib, re
p = pathlib.Path('frontend/build/index.html'); t = p.read_text(encoding='utf-8')
p.write_text(re.sub(r'<noscript><h1>[\\s\\S]*?</noscript>', '', t, count=1), encoding='utf-8')\"" \
    "$SEO_REST"

  # ── Lo que hacía que el sitio no se indexara, y ningún verificador miraba ──

  # EL fallo. GitHub Pages sólo sirve `index.html` en la raíz: cualquier ruta
  # sin fichero propio recibe `404.html` **con estado 404**, y el workflow copia
  # ahí el shell del SPA. La persona ve la web perfecta; el rastreador ve un
  # 404. `/pricing`, `/about`, `/contact` y `/legal` llevaban así desde siempre,
  # anunciadas en el sitemap. Borrar el fichero reproduce exactamente ese
  # estado.
  probar "una ruta pública del SPA sin fichero propio (vuelve a ser un 404)" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "rm -rf frontend/build/pricing" \
    "$SEO_REST; eval $SEO_REGEN"

  # El icono de los resultados de búsqueda. Ninguna de las 1.640 páginas lo
  # declaraba, y por eso el sitio salía en Yandex con el globo genérico.
  probar "una página sin favicon declarado" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i '/rel=\"icon\"/d' $SEO_PAG" \
    "$SEO_REST"

  # La descripción cortada a media palabra. El buscador la descarta y se
  # inventa el resumen con el texto de la página — en la rusa de
  # `operar-noticias` eligió el descargo legal del pie, y eso es lo que Yandex
  # publicaba como descripción del tema.
  # El cebo es un LITERAL de 158 caracteres que acaba a media palabra
  # («…Handelsalltagskennz»), que es exactamente lo que producía el
  # `.slice(0, 158)` del generador. Literal y no calculado a propósito: un cebo
  # que se construye con python multilínea dentro de una cadena de bash es la
  # fragilidad que costó BUG-078, y un cebo que no se aplica es indistinguible
  # de un verificador que no verifica.
  probar "una description cortada a media palabra" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "grep -q 'name=\"description\"' $SEO_PAG && sed -i 's|<meta name=\"description\" content=\"[^\"]*\"|<meta name=\"description\" content=\"Algorithmischer Handel bedeutet, Regeln in Code zu fassen: Ein Programm prueft den Markt und fuehrt aus, ohne Muedigkeit und ohne Zweifel, Handelsalltagskennz\"|' $SEO_PAG" \
    "$SEO_REST"

  probar "un og:locale sin territorio (Open Graph lo descarta)" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|property=\"og:locale\" content=\"\\([a-z][a-z]\\)_[A-Z][A-Z]\"|property=\"og:locale\" content=\"\\1\"|' $SEO_PAG" \
    "$SEO_REST"

  # Las páginas puente de los slugs traducidos. Un puente cuyo canonical y
  # cuyo refresh no coinciden manda dos señales distintas y no transfiere nada.
  probar "una página puente con canonical y refresh discordantes" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|<link rel=\"canonical\" href=\"|<link rel=\"canonical\" href=\"https://tradingcalculator.pro/otra-cosa/#|' $SEO_PUENTE" \
    "$SEO_REST; eval $SEO_REGEN"

  # La huerfandad, que es lo que tenía a las 1.640 compitiendo desde cero:
  # alcanzables sólo por el sitemap, sin un enlace desde ninguna página con
  # autoridad. Los hubs son el esqueleto; si uno deja de citar a una página,
  # esa página vuelve a estar suelta.
  probar "una página que ningún hub enlaza (huérfana otra vez)" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i 's|<li><a href=\"[^\"]*\"|<li><a href=\"https://tradingcalculator.pro/ru/learn/ninguna/\"|g' $SEO_HUB" \
    "$SEO_REST; eval $SEO_REGEN"

  # robots.txt resuelve por coincidencia MÁS LARGA. `Disallow: /options` +
  # `Allow: /options/strategies/` deja fuera la pantalla premium y dentro las
  # 66 fichas públicas. Sin ese `Allow`, el `Disallow` se lleva las 66 — que
  # es justo lo que el sitemap anuncia.
  probar "el Allow que salva las 66 fichas de estrategia, borrado" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "sed -i '/^Allow: \\/options\\/strategies\\/\$/d' frontend/build/robots.txt" \
    "cp frontend/public/robots.txt frontend/build/robots.txt; $SEO_REST"

  # El otro lado: una página puente NO va en el sitemap, y eso no es un fallo.
  # Anunciar una redirección le pide a Google que indexe una redirección. Si el
  # verificador lo denunciara, el arreglo evidente —meter los puentes en el
  # sitemap— sería peor que el problema.
  probar_inverso "una página generada fuera del sitemap no es un fallo si es un puente" \
    "(cd frontend && node scripts/check-seo.js --breve)" \
    "test -f frontend/build/ru/learn/operar-noticias/index.html && grep -q 'http-equiv=\"refresh\"' frontend/build/ru/learn/operar-noticias/index.html" \
    "$SEO_REST"
else
  titulo "SEO de las páginas prerenderizadas (check-seo.js)"
  echo "  ⏭️  se salta: no hay frontend/build/ (compila con 'cd frontend && npm run build')"
fi

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
