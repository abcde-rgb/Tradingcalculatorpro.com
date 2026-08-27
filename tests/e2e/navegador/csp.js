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
 * ## La trampa que casi se cuela al escribirla
 *
 * La primera versión daba VERDE con el servidor apagado. Claro: una página que
 * no carga no produce violaciones. Es el mismo falso verde que el proyecto ya
 * cazó con `python -m http.server` devolviendo 200 a todo. Por eso ahora cada
 * página tiene que responder 200 **y** traer texto: sin eso, cuenta como fallo.
 *
 * Uso (necesita el build servido en :3100 — `node tests/e2e/stack/servidor.js`):
 *     node tests/e2e/navegador/csp.js
 */
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, BASE } = require('../entorno');

// La SPA: las públicas más una privada, que redirige al muro pero carga el
// mismo bundle y las mismas integraciones.
const RUTAS_SPA = [
  '/', '/pricing', '/options', '/options/strategies', '/login', '/register',
  '/legal', '/contact', '/about', '/brokers', '/education', '/dashboard',
];

// Las estáticas llevan una política MUCHO más dura (`default-src 'none'`),
// así que se comprueban aparte: un script que se colara ahí sería un fallo
// distinto y más grave.
const RUTAS_ESTATICAS = [
  '/en/tools/calculadora-tamano-posicion/',
  '/en/markets/forex/',
  '/en/learn/',
];

const TEXTO_MINIMO = 40;

async function revisa(pagina, url) {
  const consola = [];
  pagina.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) consola.push(t.slice(0, 160));
  });

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

  const eventos = await pagina.evaluate(() => window.__csp || []).catch(() => []);
  return [...new Set([...consola, ...eventos])];
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
      await pagina.addInitScript(() => {
        window.__csp = [];
        document.addEventListener('securitypolicyviolation', (e) =>
          window.__csp.push(`${e.effectiveDirective} ← ${e.blockedURI}`));
      });
      const problemas = await revisa(pagina, BASE + ruta);
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

  await navegador.close();
  console.log(
    fallos
      ? `\n❌ ${fallos} problema(s) de CSP. El meta NO admite report-only: esto rompería la web.`
      : '\n✅ Ninguna violación de CSP, y todas las páginas cargaron de verdad.',
  );
  process.exit(fallos ? 1 : 0);
})();
