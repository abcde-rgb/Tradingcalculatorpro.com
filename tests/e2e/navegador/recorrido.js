/**
 * Recorrido de QA del diario multiproducto, con capturas.
 *
 * Se ejecuta contra el stack REAL en local: build de producción del frontend,
 * FastAPI y Postgres 16. No hay mocks del backend — lo único que no puede
 * funcionar aquí son los proveedores de mercado (Yahoo, CoinGecko), que la
 * política de red del sandbox bloquea, y eso se anota como tal en vez de
 * disimularse.
 *
 *   node qa.js desktop     1440x900
 *   node qa.js mobile       390x844, táctil
 */
const { chromium } = require('../lib/playwright-core');
const fs = require('fs');
const path = require('path');

const { BASE, rutaChromium } = require('../entorno');
const EXE = rutaChromium();
// Bajo la misma base que en producción (`PUBLIC_URL=/Tradingcalculatorpro.com`),
// para probar el artefacto que de verdad se publica.

const MODE = process.argv[2] === 'mobile' ? 'mobile' : 'desktop';
const OUT = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'recorrido');
const VIEWPORT = MODE === 'mobile'
  ? { width: 390, height: 844 }
  : { width: 1440, height: 900 };

fs.mkdirSync(OUT, { recursive: true });

const results = [];
let step = 0;
const errors = [];      // errores de consola y peticiones fallidas

function ok(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
  console.log(`  ${cond ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function shot(page, name) {
  step += 1;
  const file = path.join(OUT, `${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

/** ¿Se desborda la página en horizontal? Es el fallo clásico en móvil. */
async function overflow(page) {
  return page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }));
}

(async () => {
  console.log(`\n=== QA ${MODE.toUpperCase()} (${VIEWPORT.width}x${VIEWPORT.height}) ===\n`);
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: MODE === 'mobile',
    hasTouch: MODE === 'mobile',
    userAgent: MODE === 'mobile'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();

  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`consola: ${m.text().slice(0, 160)}`);
  });
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (u.includes('127.0.0.1')) errors.push(`peticion fallida: ${u.slice(0, 110)}`);
  });

  // ── 1 · Landing ────────────────────────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  // El banner de cookies intercepta los clics: se descarta antes de nada.
  for (const label of ['Aceptar todo', 'Aceptar', 'Accept all', 'Rechazar']) {
    const b = page.getByRole('button', { name: label, exact: false }).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  await page.waitForTimeout(600);
  await shot(page, 'landing');
  ok('la landing carga', (await page.title()).includes('Trading Calculator'));
  let ov = await overflow(page);
  ok('la landing no se desborda en horizontal', ov.doc <= ov.win + 1, `${ov.doc}px vs ${ov.win}px`);

  // ── 2 · Login ──────────────────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(900);
  await shot(page, 'login');
  await page.locator('input[type="email"]').first().fill('qa@example.com');
  await page.locator('input[type="password"]').first().fill('QaTest2026!');
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(3500);
  ok('el login entra', !page.url().includes('/login'), `url: ${page.url().replace(BASE, '')}`);
  await shot(page, 'tras-login');

  // ── 3 · Diario ─────────────────────────────────────────────────
  await page.goto(`${BASE}/performance`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const journalTab = page.locator('[data-testid="perftab-journal"]');
  if (await journalTab.isVisible().catch(() => false)) { await journalTab.click(); await page.waitForTimeout(2500); }
  await shot(page, 'diario');
  const rows = await page.locator('tr[data-testid^="trade-row-"]').count();
  ok('el diario lista las operaciones sembradas', rows >= 10, `${rows} filas`);
  const prodCells = await page.locator('table').first().innerText().catch(() => '');
  ok('la tabla muestra la columna de producto', /CFD|Futuros|Forex|Opciones/i.test(prodCells));
  ok('la tabla muestra el apalancamiento', /20×|20x/.test(prodCells));
  ov = await overflow(page);
  ok('el diario no desborda la pagina', ov.doc <= ov.win + 1, `${ov.doc}px vs ${ov.win}px`);

  // ── 4 · Formulario: producto por producto ──────────────────────
  await page.locator('[data-testid="trade-journal-add"]').first().click();
  await page.waitForTimeout(1800);
  await shot(page, 'form-abierto');
  const picker = page.locator('[data-testid="trade-product-picker"]');
  ok('el selector de producto esta arriba del todo', await picker.isVisible());
  const nProd = await picker.locator('button').count();
  ok('ofrece los 7 productos', nProd === 7, `${nProd} botones`);

  // CFD de oro a 20x sobre 10 000 -> tiene que saltar el tope de exposicion
  await page.locator('[data-testid="trade-product-cfd"]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="trade-symbol"]').fill('XAUUSD');
  await page.waitForTimeout(900);
  await page.locator('[data-testid="trade-entry"]').fill('2000');
  await page.locator('[data-testid="trade-quantity"]').fill('1');
  await page.locator('[data-testid="trade-balance"]').fill('10000');
  await page.waitForTimeout(1200);
  await shot(page, 'form-cfd-oro');

  const card = await page.locator('[data-testid="trade-instrument-card"]').innerText().catch(() => '');
  ok('la ficha del instrumento sale del catalogo', /Oro/i.test(card) && /100/.test(card), card.slice(0, 80));
  const lev = await page.locator('[data-testid="trade-leverage"]').inputValue().catch(() => '');
  ok('prefija el apalancamiento tipico del oro (20x)', lev === '20', `leverage=${lev}`);

  const notional = await page.locator('[data-testid="live-notional"]').innerText().catch(() => '');
  ok('el nocional es 200.000 $ (1 lote = 100 onzas)', notional.includes('200,000'), notional.replace(/\n/g, ' '));
  const margin = await page.locator('[data-testid="live-margin"]').innerText().catch(() => '');
  ok('el margen a 20x es 10.000 $', margin.includes('10,000'), margin.replace(/\n/g, ' '));
  const exp = await page.locator('[data-testid="live-exposure"]').innerText().catch(() => '');
  ok('la exposicion es 20x la cuenta', /20\.0×/.test(exp), exp.replace(/\n/g, ' '));
  const warn = page.locator('[data-testid="live-exposure-warn"]');
  ok('salta el aviso del tope de exposicion', await warn.isVisible(), (await warn.innerText().catch(() => '')).slice(0, 70));
  await shot(page, 'form-aviso-exposicion');

  // Regresion: el apalancamiento del ACTIVO tiene que ganar al generico del
  // producto (CFD son 10x, el oro 20x). Y en cuanto el trader escribe el suyo,
  // cambiar de activo ya no se lo pisa.
  await page.locator('[data-testid="trade-leverage"]').fill('7');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="trade-symbol"]').fill('US500');
  await page.waitForTimeout(1000);
  const levManual = await page.locator('[data-testid="trade-leverage"]').inputValue().catch(() => '');
  ok('un apalancamiento escrito a mano no se pisa al cambiar de activo',
    levManual === '7', `leverage=${levManual}`);

  // ── 5 · Unidades: stop en pips sobre forex ─────────────────────
  await page.locator('[data-testid="trade-product-forex"]').click();
  await page.waitForTimeout(600);
  await page.locator('[data-testid="trade-symbol"]').fill('EURUSD');
  await page.locator('[data-testid="trade-entry"]').fill('1.1000');
  await page.locator('[data-testid="trade-quantity"]').fill('1');
  await page.waitForTimeout(900);
  await page.selectOption('[data-testid="trade-sl-unit"]', 'pips');
  await page.locator('[data-testid="trade-sl-value"]').fill('20');
  await page.waitForTimeout(1000);
  const slResolved = await page.locator('[data-testid="trade-sl-resolved"]').innerText().catch(() => '');
  ok('20 pips aterrizan en 1,0980 (0,0001 por pip)', slResolved.includes('1.0980'), slResolved);
  await page.selectOption('[data-testid="trade-tp-unit"]', 'r');
  await page.locator('[data-testid="trade-tp-value"]').fill('2');
  await page.waitForTimeout(1000);
  const tpResolved = await page.locator('[data-testid="trade-tp-resolved"]').innerText().catch(() => '');
  ok('el objetivo a 2R aterriza en 1,1040', tpResolved.includes('1.1040'), tpResolved);
  const rr = await page.locator('[data-testid="live-rr"]').innerText().catch(() => '');
  ok('el R:B se calcula 1:2', /1:2\.00/.test(rr), rr.replace(/\n/g, ' '));
  await shot(page, 'form-unidades-pips-R');

  // Yen: el pip vale 0,01, no 0,0001 — confundirlos multiplica el riesgo por 100
  await page.locator('[data-testid="trade-symbol"]').fill('USDJPY');
  await page.locator('[data-testid="trade-entry"]').fill('150.00');
  await page.waitForTimeout(1100);
  const jpy = await page.locator('[data-testid="trade-sl-resolved"]').innerText().catch(() => '');
  ok('el pip del yen es 0,01 (20 pips -> 149,80)', jpy.includes('149.80'), jpy);

  // ── 6 · Suelo 1:1 ──────────────────────────────────────────────
  await page.selectOption('[data-testid="trade-tp-unit"]', 'price');
  await page.locator('[data-testid="trade-tp-value"]').fill('150.10');
  await page.waitForTimeout(1100);
  const rrWarn = page.locator('[data-testid="live-rr-warn"]');
  ok('avisa cuando se arriesga mas de lo que se puede ganar', await rrWarn.isVisible(),
    (await rrWarn.innerText().catch(() => '')).slice(0, 60));
  await shot(page, 'form-aviso-1a1');

  // ── 7 · Futuros: ticks y contrato del catalogo ─────────────────
  await page.locator('[data-testid="trade-product-futures"]').click();
  await page.waitForTimeout(600);
  await page.locator('[data-testid="trade-symbol"]').fill('MES');
  await page.locator('[data-testid="trade-entry"]').fill('5000');
  await page.locator('[data-testid="trade-quantity"]').fill('2');
  await page.waitForTimeout(1000);
  await page.selectOption('[data-testid="trade-sl-unit"]', 'ticks');
  await page.locator('[data-testid="trade-sl-value"]').fill('8');
  await page.waitForTimeout(1000);
  const mesCard = await page.locator('[data-testid="trade-instrument-card"]').innerText().catch(() => '');
  ok('reconoce el Micro E-mini y su valor de tick', /Micro E-mini/i.test(mesCard), mesCard.slice(0, 70));
  const mesSl = await page.locator('[data-testid="trade-sl-resolved"]').innerText().catch(() => '');
  ok('8 ticks del MES son 2 puntos (4998)', mesSl.includes('4998'), mesSl);
  await shot(page, 'form-futuros-ticks');

  // ── 8 · Opciones: riesgo definido ──────────────────────────────
  await page.locator('[data-testid="trade-product-option"]').click();
  await page.waitForTimeout(700);
  await page.locator('[data-testid="trade-symbol"]').fill('AAPL');
  await page.locator('[data-testid="trade-entry"]').fill('3.50');
  await page.locator('[data-testid="trade-quantity"]').fill('2');
  await page.waitForTimeout(1200);
  const na = page.locator('[data-testid="trade-leverage-na"]');
  ok('en opciones no se ofrece apalancamiento', await na.isVisible());
  const maxLoss = await page.locator('[data-testid="live-maxloss"]').innerText().catch(() => '');
  ok('la prima (700 $) es la perdida maxima', maxLoss.includes('700'), maxLoss.replace(/\n/g, ' '));
  const optSection = page.locator('[data-testid="trade-options-section"]');
  ok('aparece el bloque de opciones', await optSection.isVisible());
  await shot(page, 'form-opciones');

  // ── 9 · Costes y alertas ───────────────────────────────────────
  await page.locator('[data-testid="trade-product-crypto_perp"]').click();
  await page.waitForTimeout(700);
  await page.locator('[data-testid="trade-symbol"]').fill('BTCUSDT');
  await page.locator('[data-testid="trade-entry"]').fill('100000');
  await page.locator('[data-testid="trade-quantity"]').fill('0.05');
  await page.waitForTimeout(1000);
  const costToggle = page.locator('[data-testid="trade-costs-section-toggle"]');
  await costToggle.scrollIntoViewIfNeeded();
  await costToggle.click();
  await page.waitForTimeout(800);
  const fundingField = page.locator('[data-testid="trade-funding-rate"]');
  ok('en un perpetuo se piden los campos de funding', await fundingField.isVisible());
  await shot(page, 'form-costes-funding');

  const alertToggle = page.locator('[data-testid="trade-alert-section-toggle"]');
  await alertToggle.scrollIntoViewIfNeeded();
  await alertToggle.click();
  await page.waitForTimeout(700);
  await page.locator('[data-testid="trade-alert-enabled"]').check();
  await page.waitForTimeout(900);
  const smsChip = page.locator('[data-testid="trade-alert-channel-sms"]');
  const smsTxt = await smsChip.innerText().catch(() => '');
  ok('el SMS se marca como no disponible', /no disponible/i.test(smsTxt), smsTxt);
  await shot(page, 'form-alertas');

  // Cerrar el formulario sin guardar
  await page.keyboard.press('Escape').catch(() => {});
  const closeBtn = page.locator('[data-testid="trade-form-modal"] button').first();
  if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
  await page.waitForTimeout(1200);

  // ── 10 · Analitica ─────────────────────────────────────────────
  const anTab = page.locator('[data-testid="perftab-analytics"]');
  if (await anTab.isVisible().catch(() => false)) {
    await anTab.click();
    await page.waitForTimeout(3200);
    await shot(page, 'analitica');
    const byProduct = page.locator('[data-testid="breakdown-product"]');
    ok('hay desglose por producto', await byProduct.isVisible().catch(() => false));
    const costsCard = page.locator('[data-testid="costs-card"]');
    ok('hay panel de costes', await costsCard.isVisible().catch(() => false));
    const levUsage = page.locator('[data-testid="leverage-usage"]');
    ok('publica el uso del apalancamiento', await levUsage.isVisible().catch(() => false),
      (await levUsage.innerText().catch(() => '')).replace(/\n/g, ' · ').slice(0, 90));
    await levUsage.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(600);
    await shot(page, 'analitica-producto-costes');
    ov = await overflow(page);
    ok('la analitica no desborda la pagina', ov.doc <= ov.win + 1, `${ov.doc}px vs ${ov.win}px`);
  }

  // ── 11 · Otras vistas publicas ─────────────────────────────────
  for (const [route, name] of [['/options', 'opciones-hub'], ['/education', 'educacion'], ['/pricing', 'precios']]) {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1600);
    await shot(page, name);
    const o = await overflow(page);
    ok(`${route} no desborda`, o.doc <= o.win + 1, `${o.doc}px vs ${o.win}px`);
  }

  await browser.close();

  const pass = results.filter((r) => r.pass).length;
  console.log(`\n${pass}/${results.length} comprobaciones OK`);
  if (errors.length) {
    console.log('\nErrores de consola / red (unicos):');
    [...new Set(errors)].slice(0, 12).forEach((e) => console.log('  · ' + e));
  } else {
    console.log('\nSin errores de consola ni peticiones fallidas.');
  }
  fs.writeFileSync(path.join(OUT, 'resultados.json'),
    JSON.stringify({ mode: MODE, viewport: VIEWPORT, results, errors: [...new Set(errors)] }, null, 2));
  process.exit(results.some((r) => !r.pass) ? 1 : 0);
})().catch((e) => { console.error('QA reventó:', e.message); process.exit(2); });
