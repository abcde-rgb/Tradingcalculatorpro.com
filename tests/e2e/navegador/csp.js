#!/usr/bin/env node
/**
 * Que la Content-Security-Policy no rompa la web (hueco G-10).
 *
 * ## Por qué esta sonda existe
 *
 * GitHub Pages no deja poner cabeceras, así que la política viaja en un `meta`.
 * Y el `meta` **no admite `report-only`**: no hay ensayo. Una directiva de menos
 * y el navegador bloquea TradingView, el botón de Google o las fuentes — en
 * producción, sin aviso previo y sin que ningún test offline lo note, porque
 * ningún test offline abre un navegador.
 *
 * Por eso la política de `public/index.html` no se escribió adivinando: se midió
 * con Playwright qué orígenes piden de verdad las pantallas, y esta sonda vuelve
 * a comprobarlo en cada cambio.
 *
 * ## Las dos trampas que ya se colaron aquí
 *
 * 1. La primera versión daba VERDE con el servidor apagado. Claro: una página
 *    que no carga no produce violaciones. Es el mismo falso verde que el
 *    proyecto ya cazó con `python -m http.server` devolviendo 200 a todo. Por
 *    eso cada página tiene que responder 200 **y** traer texto.
 *
 * 2. La segunda daba VERDE con el WebSocket de alertas roto. Recorría
 *    `/dashboard`, sí — pero **sin sesión**: sin token `useWebSocketAlerts`
 *    devuelve `null` y no abre nada, así que no había conexión que bloquear y
 *    no había violación que ver. La política autorizaba `https://api…` y el
 *    hook abría `wss://api…`, que en CSP3 es OTRO esquema: la relajación va de
 *    `ws` a `http`/`https`, nunca al revés. Lo destapó `pre-despliegue.js`, que
 *    sí entra. De ahí el tercer bloque de abajo, y su guarda: no basta con «no
 *    hubo violación», hay que **exigir que el WebSocket se intentara**.
 *
 * 3. La tercera daba VERDE sobre la SPA creyendo mirar una página estática. El
 *    servidor de pruebas devuelve `index.html` para toda ruta desconocida —lo
 *    necesita React Router—, así que una estática que no existiera se
 *    comprobaba como si fuera la SPA: política blanda, ninguna violación,
 *    palomita. `/en/learn/` estuvo así (es un directorio de páginas, no una
 *    página), y con ello el bloque de la política DURA no probaba nada. De ahí
 *    la exigencia de abajo: la página servida tiene que traer `default-src
 *    'none'` para contar como estática.
 *
 * ## Sin backend
 *
 * El bloque del WebSocket necesita sesión, y la sesión necesita backend. En
 * `ci.yml` no lo hay —el job de frontend sólo compila—, así que ahí se pasa
 * `--sin-sesion`: se dice en la salida que ese bloque NO se ha comprobado y
 * dónde sí se comprueba, en vez de fingir que pasó. Para que la bandera no se
 * extienda a donde sí se puede probar, si se pasa con el backend EN PIE la
 * sonda falla.
 *
 * Uso (necesita el stack en pie — `tests/e2e/stack/arriba.sh`):
 *     node tests/e2e/navegador/csp.js
 *     node tests/e2e/navegador/csp.js --sin-sesion   # CI: sólo lo que se puede
 */
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, BASE, API, entra, descartaCookies } = require('../entorno');

const SIN_SESION = process.argv.includes('--sin-sesion');

// La SPA: las públicas más una privada, que redirige al muro pero carga el
// mismo bundle y las mismas integraciones.
const RUTAS_SPA = [
  '/', '/pricing', '/options', '/options/strategies', '/login', '/register',
  '/legal', '/contact', '/about', '/brokers', '/education', '/dashboard',
];

// Las estáticas llevan una política MUCHO más dura (`default-src 'none'`),
// así que se comprueban aparte: un script que se colara ahí sería un fallo
// distinto y más grave.
// Tienen que ser páginas que EXISTAN: una ruta inventada recibe el fallback de
// la SPA y se comprobaría la política blanda creyendo comprobar la dura.
// `revisa()` lo exige explícitamente cuando `dura` va a true.
const RUTAS_ESTATICAS = [
  '/en/tools/calculadora-tamano-posicion/',
  '/en/markets/forex/',
  '/en/learn/analisis-fundamental/',
];

const TEXTO_MINIMO = 40;

function escucha(pagina, consola) {
  pagina.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) consola.push(t.slice(0, 160));
  });
}

async function revisa(pagina, url, dura = false) {
  const consola = [];
  escucha(pagina, consola);

  let respuesta = null;
  try {
    respuesta = await pagina.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch { /* se evalúa abajo por estado y contenido */ }
  await pagina.waitForTimeout(1500);

  const estado = respuesta ? respuesta.status() : 0;
  const largo = await pagina
    .evaluate(() => (document.body ? document.body.innerText.length : 0))
    .catch(() => 0);

  // Guarda contra el falso verde: sin página no hay violaciones que ver.
  if (estado !== 200 || largo < TEXTO_MINIMO) {
    return [`NO CARGÓ (http=${estado}, texto=${largo} car.)`];
  }

  // Guarda contra el OTRO falso verde: el servidor devuelve `index.html` para
  // toda ruta desconocida, así que una estática que no exista se comprobaría
  // como SPA —política blanda, cero violaciones, palomita— y el bloque de la
  // política dura no probaría nada. Un 200 no basta: hay que ver la política.
  if (dura) {
    const politica = await pagina
      .evaluate(() => document.querySelector(
        'meta[http-equiv="Content-Security-Policy" i]')?.getAttribute('content') || '')
      .catch(() => '');
    if (!/default-src\s+'none'/i.test(politica)) {
      return [
        'NO ES LA PÁGINA ESTÁTICA — el servidor devolvió el fallback de la SPA ' +
        '(esta ruta no existe en el build), así que se estaría midiendo la ' +
        'política blanda creyendo medir la dura',
      ];
    }
  }

  const eventos = await pagina.evaluate(() => window.__csp || []).catch(() => []);
  return [...new Set([...consola, ...eventos])];
}

/** ¿Hay backend al otro lado? Misma ruta con la que `arriba.sh` da el stack por
 *  levantado, así que las dos cosas responden a la misma pregunta. */
async function hayBackend() {
  try {
    const r = await fetch(`${API}/api/performance/instruments`, {
      signal: AbortSignal.timeout(4000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

const semilla = (pagina) => pagina.addInitScript(() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) =>
    window.__csp.push(`${e.effectiveDirective} ← ${e.blockedURI}`));
});

/**
 * El WebSocket de alertas, que sólo existe con sesión iniciada.
 * Devuelve una lista de problemas (vacía = bien).
 */
async function revisaWebSocket(navegador) {
  const pagina = await navegador.newPage();
  await semilla(pagina);
  const consola = [];
  escucha(pagina, consola);

  // Playwright ve el intento de conexión aunque la política lo bloquee: es la
  // única señal que distingue «autorizado» de «nunca se intentó».
  const sockets = [];
  pagina.on('websocket', (ws) => sockets.push(ws.url()));

  const problemas = [];
  const dentro = await entra(pagina).catch(() => false);
  if (!dentro) {
    problemas.push('NO SE PUDO ENTRAR — sin sesión el hook no abre nada y esto no probaría nada');
    await pagina.close();
    return problemas;
  }

  await pagina.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 45000 })
    .catch(() => { });
  await descartaCookies(pagina);
  await pagina.waitForTimeout(4000);

  const eventos = await pagina.evaluate(() => window.__csp || []).catch(() => []);
  const todo = [...new Set([...consola, ...eventos])];

  // 1 · ¿se intentó?  Sin esto, un dashboard que dejara de montar `PriceAlerts`
  //     pondría la sonda verde para siempre sin comprobar nada.
  if (!sockets.some((u) => /^wss?:\/\//.test(u))) {
    problemas.push(
      'el dashboard NO intentó abrir el WebSocket — la comprobación no vale ' +
      `(sockets vistos: ${sockets.length ? sockets.join(', ') : 'ninguno'})`,
    );
  } else {
    console.log(`     (WebSocket intentado: ${sockets[0].replace(/token=[^&]*/, 'token=…')})`);
  }

  // 2 · ¿lo bloqueó la política?
  const bloqueado = todo.filter((t) => /ws:\/\/|wss:\/\/|connect-src/i.test(t));
  problemas.push(...bloqueado);

  await pagina.close();
  return problemas;
}

(async () => {
  const navegador = await chromium.launch({ executablePath: rutaChromium() });
  let fallos = 0;

  for (const [titulo, rutas] of [
    ['SPA (política con unsafe-inline: CRA y GTM inyectan scripts)', RUTAS_SPA],
    ["Páginas estáticas (política dura: default-src 'none')", RUTAS_ESTATICAS],
  ]) {
    console.log(`\n\x1b[1m${titulo}\x1b[0m`);
    for (const ruta of rutas) {
      const pagina = await navegador.newPage();
      await semilla(pagina);
      const problemas = await revisa(pagina, BASE + ruta, rutas === RUTAS_ESTATICAS);
      if (problemas.length) {
        fallos += problemas.length;
        console.log(`  ❌ ${ruta}`);
        problemas.slice(0, 6).forEach((p) => console.log(`       ${p}`));
      } else {
        console.log(`  ✅ ${ruta}`);
      }
      await pagina.close();
    }
  }

  console.log('\n\x1b[1mWebSocket de alertas (requiere sesión: sin token no se abre)\x1b[0m');
  let wsOmitido = false;
  if (SIN_SESION) {
    // La bandera no puede convertirse en la forma barata de tener la sonda en
    // verde: si el backend está en pie, esto SÍ se puede probar y hay que
    // probarlo. Un `--sin-sesion` copiado a un entorno completo sería
    // exactamente el falso verde del que habla la cabecera.
    if (await hayBackend()) {
      fallos += 1;
      console.log(
        `  ❌ se pasó --sin-sesion pero el backend responde en ${API}: ` +
        'quita la bandera, aquí el WebSocket sí se puede comprobar',
      );
    } else {
      wsOmitido = true;
      console.log(
        `  ⏭️  NO COMPROBADO — --sin-sesion y sin backend en ${API}.\n` +
        '       Este bloque necesita sesión iniciada. Lo cubre el banco `qa`\n' +
        '       (tests/e2e/stack/arriba.sh + csp.js sin bandera) y pre-despliegue.js.\n' +
        '       Offline lo cubre a medias check-csp-origenes.js, que exige el par\n' +
        '       http(s)+ws(s) del backend dentro de connect-src.',
      );
    }
  } else {
    const wsProblemas = await revisaWebSocket(navegador);
    if (wsProblemas.length) {
      fallos += wsProblemas.length;
      console.log('  ❌ /dashboard → wss://<backend>/api/ws/alerts');
      wsProblemas.slice(0, 6).forEach((p) => console.log(`       ${p}`));
    } else {
      console.log('  ✅ /dashboard → el WebSocket se abre y la política lo autoriza');
    }
  }

  await navegador.close();
  const coletilla = wsOmitido ? ' (el WebSocket queda SIN comprobar: ver arriba)' : '';
  console.log(
    fallos
      ? `\n❌ ${fallos} problema(s) de CSP. El meta NO admite report-only: esto rompería la web.`
      : `\n✅ Ninguna violación de CSP, y todas las páginas cargaron de verdad${coletilla}.`,
  );
  process.exit(fallos ? 1 : 0);
})();
