/**
 * Qué orígenes contacta de verdad la web publicada.
 *
 * Enumerar los orígenes leyendo el código fuente no vale para redactar un CSP:
 * se escapan los que se construyen en tiempo de ejecución (el `src` de un
 * iframe de TradingView, el `img` que inyecta GA4, la fuente que pide un CSS ya
 * cargado). Y un CSP al que le falte UN origen tumba la función que lo usa, sin
 * aviso previo y sin modo `report-only`, porque el `<meta>` no lo admite.
 *
 * Así que se recorre el BUILD COMPILADO en un navegador real y se anota cada
 * petición, con la directiva de CSP que le correspondería. Lo que salga de aquí
 * es la lista mínima; lo que no aparezca, no está probado que no haga falta.
 *
 *   node tests/e2e/navegador/seguridad-origenes.js
 */
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, BASE, descartaCookies, descartaModales } = require('../entorno');

// El `type` que reporta Playwright → la directiva de CSP que la gobierna.
const DIRECTIVA = {
  document: 'default-src', stylesheet: 'style-src', image: 'img-src',
  media: 'media-src', font: 'font-src', script: 'script-src',
  texttrack: 'media-src', xhr: 'connect-src', fetch: 'connect-src',
  eventsource: 'connect-src', websocket: 'connect-src', manifest: 'manifest-src',
  other: 'default-src',
};

const RUTAS = [
  ['portada', ''],
  ['precios', 'pricing'],
  ['panel', 'dashboard'],
  ['opciones', 'options'],
  ['graficos', 'charts'],
  ['academia', 'education'],
  ['entrar', 'login'],
];

(async () => {
  const navegador = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const origenes = new Map();   // origen → Set(directivas)
  const inline = { scripts: 0, estilos: 0 };
  const consola = [];

  const anota = (url, tipo) => {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
    let o;
    try { o = new URL(url).origin; } catch { return; }
    if (o === BASE_ORIGEN) return;               // propio: 'self'
    if (!origenes.has(o)) origenes.set(o, new Set());
    origenes.get(o).add(DIRECTIVA[tipo] || 'default-src');
  };

  const BASE_ORIGEN = new URL(BASE).origin;

  page.on('request', (r) => anota(r.url(), r.resourceType()));
  page.on('console', (m) => {
    if (m.type() === 'error') consola.push(m.text().slice(0, 160));
  });

  for (const [nombre, ruta] of RUTAS) {
    const url = `${BASE}/${ruta}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await descartaCookies(page).catch(() => {});
      await descartaModales(page).catch(() => {});
      // Da margen a lo que se carga en diferido (iframes, analítica).
      await page.waitForTimeout(2500);
      const t = await page.title();
      console.log(`  ✓ ${nombre.padEnd(10)} ${t.slice(0, 60)}`);
    } catch (e) {
      console.log(`  ✗ ${nombre.padEnd(10)} ${String(e.message).slice(0, 80)}`);
    }
  }

  // Inline: lo que obligaría a 'unsafe-inline' si no se hashea.
  const conteo = await page.evaluate(() => ({
    scripts: [...document.querySelectorAll('script:not([src])')].filter((s) => s.textContent.trim()).length,
    estilos: [...document.querySelectorAll('style')].length,
    styleAttr: document.querySelectorAll('[style]').length,
  }));
  Object.assign(inline, conteo);

  console.log('\n═══ ORÍGENES EXTERNOS CONTACTADOS ═══');
  const porDirectiva = {};
  [...origenes.entries()].sort().forEach(([o, dirs]) => {
    console.log(`  ${o.padEnd(42)} ${[...dirs].join(', ')}`);
    dirs.forEach((d) => { (porDirectiva[d] ||= new Set()).add(o); });
  });

  console.log('\n═══ AGRUPADO POR DIRECTIVA ═══');
  Object.entries(porDirectiva).sort().forEach(([d, set]) => {
    console.log(`  ${d}: ${[...set].sort().join(' ')}`);
  });

  console.log('\n═══ INLINE (obliga a unsafe-inline o hashes) ═══');
  console.log(`  <script> sin src: ${inline.scripts} · <style>: ${inline.estilos} · atributos style=: ${inline.styleAttr}`);

  if (consola.length) {
    console.log('\n═══ ERRORES DE CONSOLA ═══');
    [...new Set(consola)].slice(0, 15).forEach((c) => console.log(`  · ${c}`));
  }

  await navegador.close();
})();
