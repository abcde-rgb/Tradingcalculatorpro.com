/**
 * El panel de probabilidad, en el navegador y sobre el BUILD COMPILADO.
 *
 * Yahoo está bloqueado en el sandbox, así que las dos rutas del escáner se
 * sirven desde fixtures interceptadas con `page.route`. Eso NO es hacer trampa:
 * lo que se comprueba aquí es la PANTALLA —que el porcentaje nunca sale sin su
 * muestra, que la ventaja se pinta, que el aviso de intervalos solapados
 * aparece cuando toca—, y para eso la respuesta tiene que ser fija y conocida.
 * La aritmética ya está comprobada en `test_level_odds_unit.py` contra series
 * de respuesta conocida.
 *
 *   node tests/e2e/navegador/probabilidad-medida.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, entra, BASE, descartaModales } = require('../entorno');

const BUILD = path.join(__dirname, '..', '..', '..', 'frontend', 'build');
const BP = '/Tradingcalculatorpro.com';
const PUERTO = 3195;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json', '.woff2': 'font/woff2' };

const fallos = [];
const marca = (n, ok, d = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos.push(n);
};

// ── Respuestas fijas ──────────────────────────────────────────────────────
// Un veredicto con los intervalos SOLAPADOS a propósito: es el caso en que la
// pantalla tiene que negarse a coronar un ganador.
const ODDS = {
  symbol: 'TEST', interval: '1d', period: '2y', horizon: 10,
  bars: 500, observations: 320, iterations: 1000, nullShuffles: 12,
  method: 'historical_frequency+bootstrap',
  current: { close: 101.5, resistance: 110, support: 100, zone: 'near_support', pattern: 'hammer', date: '2026-08-18' },
  verdict: {
    outcome: 'support', criterion: 'zone', n: 116, separated: false, runner_up: 'resistance',
    distribution: {
      resistance: { p: 44.0, lo: 35.0, hi: 53.0, n: 116, hits: 51, iterations: 1000 },
      support: { p: 48.3, lo: 39.0, hi: 57.0, n: 116, hits: 56, iterations: 1000 },
      neither: { p: 7.7, lo: 3.0, hi: 13.0, n: 116, hits: 9, iterations: 1000 },
    },
  },
  by_zone: [
    { key: 'near_support', n: 116, support: { p: 48.3, lo: 39, hi: 57, n: 116, hits: 56 },
      resistance: { p: 44.0, lo: 35, hi: 53, n: 116, hits: 51 },
      neither: { p: 7.7, lo: 3, hi: 13, n: 116, hits: 9 },
      nullSupport: 67.7, edgeSupport: -19.4 },
  ],
  after_break: {
    n: 42,
    continues_down: { p: 61.9, lo: 47, hi: 76, n: 42, hits: 26 },
    back_to_resistance: { p: 31.0, lo: 17, hi: 45, n: 42, hits: 13 },
    neither: { p: 7.1, lo: 0, hi: 16, n: 42, hits: 3 },
  },
  null: { shuffles: 12, by_zone: { near_support: { support: 67.7, runs: 12 } } },
};

// El escaneo, con la referencia VIVA y niveles en disputa: los dos casos que
// la pantalla ignoraba por completo antes de este cambio.
const SCAN = {
  symbol: 'TEST', interval: '1d', trend: 'range', rowsScanned: 500,
  currentPrice: 101.5, referencePrice: 101.5, referenceSource: 'live',
  lastClose: 100.2, livePrice: 101.5, referenceAgeSeconds: 420,
  liveVsCloseDivergencePct: 1.297, levelsBetweenLiveAndClose: 2,
  lastBarDate: '2026-08-18', lastBarForming: false, intraday: false,
  context: { roomAbovePct: 8.4, roomBelowPct: -1.5, rangePositionPct: 15,
             roomAboveAtr: 2.1, roomBelowAtr: 0.4 },
  confluence: { checked: true, matched: 2, interval: '1wk' },
  levels: [{ price: 110, type: 'resistance', touches: 3, zone: [109, 111] },
           { price: 100, type: 'support', touches: 4, zone: [99, 101] }],
  swings: [], events: [], fvgs: [], breakouts: [],
  counts: { confirmedEvents: 0, confluent: 2 }, bars: [],
};

(async () => {
  const nav = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const page = await (await nav.newContext({ viewport: { width: 1500, height: 1400 } })).newPage();

  const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/education/structure-scan/**', (r) => r.fulfill(json(SCAN)));
  await page.route('**/api/education/level-odds/**', (r) => r.fulfill(json(ODDS)));
  await page.route('**/api/education/pattern-scan/**', (r) => r.fulfill(json({ detections: [] })));

  console.log('═══ Probabilidad medida · build compilado, en pantalla ═══\n');
  if (!await entra(page)) { console.log('  ✗ sin sesión no hay escáner'); await nav.close(); process.exit(1); }
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);
  await descartaModales(page).catch(() => {});

  // Escanear: el panel de probabilidad sólo aparece con niveles ya detectados.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find((x) => /escanear|scan/i.test(x.textContent.trim()) && x.textContent.trim().length < 20);
    if (b) b.click();
  });
  await page.waitForTimeout(3000);

  const hayEscaner = await page.locator('[data-testid="struct-reading"]').count();
  marca('el escáner monta con los datos servidos', hayEscaner > 0, `${hayEscaner}`);

  // ── El precio de referencia, que la pantalla ignoraba ────────────────
  const precio = await page.locator('[data-testid="struct-price-now"]').first().innerText().catch(() => '');
  marca('la etiqueta dice COTIZACIÓN VIVA, no «último cierre»',
    /live|vivo|viva/i.test(precio), precio.replace(/\s+/g, ' ').slice(0, 60));
  marca('y dice cuántos minutos tiene esa cotización',
    /\d+\s*min/i.test(precio), precio.replace(/\s+/g, ' ').slice(0, 60));

  const disputa = await page.locator('[data-testid="struct-ref-disputed"]').count();
  marca('avisa de los 2 niveles que cambian de bando según la referencia',
    disputa > 0, `${disputa} aviso(s)`);

  // ── El panel de probabilidad ─────────────────────────────────────────
  const hayPanel = await page.locator('[data-testid="level-odds"]').count();
  marca('el panel de probabilidad aparece bajo los niveles', hayPanel > 0, `${hayPanel}`);

  if (hayPanel) {
    await page.locator('[data-testid="odds-measure-btn"]').click();
    await page.waitForTimeout(2500);

    const veredicto = await page.locator('[data-testid="odds-verdict"]').innerText().catch(() => '');
    marca('el veredicto se pinta', veredicto.length > 20, veredicto.replace(/\s+/g, ' ').slice(0, 70));

    // La regla que más importa: ningún porcentaje sin su muestra al lado.
    // ⚠️ Se miran las TARJETAS, no la caja entera. El texto que explica la
    // ventaja cita «48,3 % frente a 67,7 %» para decir de dónde sale la resta,
    // y contar esos dos como cifras sueltas daba un falso rojo: el 48,3 ya
    // aparece arriba con su muestra. La regla es sobre lo que se publica como
    // dato, no sobre la prosa que lo explica.
    const tarjetas = await page.evaluate(() => {
      const caja = document.querySelector('[data-testid="odds-verdict"]');
      if (!caja) return null;
      const rejilla = caja.querySelector('.grid');
      if (!rejilla) return null;
      return [...rejilla.children].map((c) => {
        const txt = c.innerText;
        return { pct: /\d+[.,]\d\s*%/.test(txt), muestra: /\d+\/\d+/.test(txt) };
      });
    });
    marca('las tres tarjetas del veredicto llevan porcentaje Y muestra',
      Array.isArray(tarjetas) && tarjetas.length === 3
        && tarjetas.every((x) => x.pct && x.muestra),
      JSON.stringify(tarjetas));

    const solape = await page.locator('[data-testid="odds-not-separated"]').count();
    marca('con intervalos solapados AVISA en pantalla en vez de coronar un ganador',
      solape > 0, `${solape} aviso(s)`);

    const ventaja = await page.locator('[data-testid="odds-edge"]').innerText().catch(() => '');
    marca('la ventaja sobre el azar se pinta y es NEGATIVA pese al 48 % crudo',
      /-19/.test(ventaja), ventaja.replace(/\s+/g, ' ').slice(0, 80));

    const ruptura = await page.locator('[data-testid="odds-after-break"]').count();
    marca('el bloque de «roto el soporte» aparece', ruptura > 0, `${ruptura}`);

    const metodo = await page.locator('[data-testid="odds-method"]').innerText().catch(() => '');
    marca('se publica el método (barras, montajes, horizonte, iteraciones)',
      /500/.test(metodo) && /320/.test(metodo) && /1000/.test(metodo),
      metodo.replace(/\s+/g, ' ').slice(0, 90));
  }

  console.log('\n' + '='.repeat(66));
  console.log(fallos.length ? `❌ ${fallos.length} fallo(s)` : '✅ el panel publica lo que debe y como debe');
  await nav.close();
  process.exit(fallos.length ? 1 : 0);
})();
