/**
 * El arreglo de esta tanda: la analítica ya no mezcla productos en silencio.
 *
 *  1. hay una barra de alcance con «Todo» + un botón por producto operado;
 *  2. elegir un producto RECALCULA el panel en el backend (las cifras cambian);
 *  3. si los saldos por producto se separan, se avisa de que hay más de una
 *     cuenta y de que la curva y el drawdown están sumándolas;
 *  4. el aviso desaparece al filtrar, porque ya no aplica;
 *  5. nada de esto desborda la pantalla en móvil.
 */
const { chromium } = require('../lib/playwright-core');
const path = require('path');
const fs = require('fs');
const { BASE, rutaChromium } = require('../entorno');

const MODE = process.argv[2] === 'mobile' ? 'mobile' : 'desktop';
const VIEWPORT = MODE === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const OUT = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'analitica');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (n, c, d = '') => {
  results.push(c);
  console.log(`  ${c ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`);
};
let n = 0;
const shot = async (page, name) =>
  page.screenshot({ path: path.join(OUT, `${String(++n).padStart(2, '0')}-${name}.png`), fullPage: false });

const overflow = (page) => page.evaluate(() => ({
  doc: document.documentElement.scrollWidth,
  win: window.innerWidth,
}));

(async () => {
  const browser = await chromium.launch({
    executablePath: rutaChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: 2,
    isMobile: MODE === 'mobile', hasTouch: MODE === 'mobile', locale: 'es-ES',
    userAgent: MODE === 'mobile'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  const page = await ctx.newPage();

  // Las llamadas a la analítica que salen de verdad: es la prueba de que el
  // filtro viaja al backend y no recorta el resultado ya agregado.
  const calls = [];
  page.on('request', (r) => {
    if (r.url().includes('/performance/analytics')) calls.push(r.url().split('/api')[1]);
  });

  // Y las RESPUESTAS, porque lo que esta sonda quiere demostrar es que la
  // pantalla enseña lo que el backend calculó — no que el diario de prueba
  // sume una cifra concreta.
  //
  // ⚠️ Antes iban tres números escritos a fuego (3.471, 1.496, 544,8) tomados
  // de una siembra de trece operaciones. Sembrar dos veces —que es lo que pasa
  // en cuanto alguien repite la tanda— deja veintidós, los totales cambian y
  // seis comprobaciones se ponen rojas acusando al producto de algo que hace el
  // banco de pruebas. La propia skill lo dice: «compara por contenido, no por
  // número de filas». Esto lo cumple.
  const respuestas = new Map();
  page.on('response', async (r) => {
    if (!r.url().includes('/performance/analytics')) return;
    try {
      const d = await r.json();
      // El total viene ANIDADO en `analytics`, no en la raíz de la respuesta.
      const total = d && d.analytics ? d.analytics.total_pnl : undefined;
      const clave = (r.url().match(/product=([a-z_]+)/) || [null, 'all'])[1];
      if (typeof total === 'number') respuestas.set(clave, total);
    } catch { /* una respuesta no-JSON no es un fallo de esta sonda */ }
  });

  // El total tal y como lo escribe la pantalla en es-ES: +$4.061,72 → "4061.72".
  const comoEnPantalla = (n) => Math.abs(n).toFixed(2);
  const contiene = (texto, n) => {
    const v = comoEnPantalla(n);
    const sinEspacios = texto.replace(/\s/g, '');
    const entero = v.split('.')[0];
    const dec = v.split('.')[1];
    // Acepta separador de miles, coma o punto decimal, y que la pantalla
    // recorte el cero final (544,8 en vez de 544,80).
    const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '[.,]?');
    const decimales = dec.endsWith('0') ? `[.,]${dec[0]}0?` : `[.,]${dec}`;
    return new RegExp(miles + decimales).test(sinEspacios);
  };

  console.log(`\n=== ${MODE.toUpperCase()} ${VIEWPORT.width}x${VIEWPORT.height} — alcance de la analítica ===\n`);

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  for (const label of ['Aceptar todo', 'Aceptar', 'Accept all']) {
    const b = page.getByRole('button', { name: label, exact: false }).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.locator('input[type="email"]').first().fill('qa@example.com');
  await page.locator('input[type="password"]').first().fill('QaTest2026!');
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(3500);
  ok('el login entra', !page.url().includes('/login'));

  await page.goto(`${BASE}/performance`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const tab = page.locator('[data-testid="perftab-analytics"]');
  if (await tab.isVisible().catch(() => false)) { await tab.click(); await page.waitForTimeout(3000); }
  await page.waitForSelector('[data-testid="analytics-dashboard"]', { timeout: 20000 });
  await page.waitForTimeout(1200);

  // ── 1 · La barra de alcance ────────────────────────────────────
  const bar = page.locator('[data-testid="analytics-product-filter"]');
  await bar.scrollIntoViewIfNeeded().catch(() => {});
  ok('la barra de alcance está en la analítica', await bar.isVisible());
  const chips = await bar.locator('button').count();
  ok('ofrece «Todo» + un botón por producto operado', chips === 8, `${chips} botones (1 + 7)`);
  await shot(page, 'analitica-alcance');

  // ── 2 · El aviso de cuentas mezcladas ──────────────────────────
  const warn = page.locator('[data-testid="analytics-mixed-accounts"]');
  ok('avisa de que hay más de una cuenta', await warn.isVisible());
  const warnText = await warn.innerText().catch(() => '');
  ok('el aviso dice el saldo por producto', /50,000/.test(warnText) && /10,000/.test(warnText),
    warnText.split('\n')[1] || '');
  await warn.scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, 'aviso-cuentas-mezcladas');

  // ── 3 · Las cifras del conjunto ────────────────────────────────
  const readPnl = async () => {
    const el = page.locator('[data-testid="stat-total-pnl"]').first();
    if (await el.isVisible().catch(() => false)) return (await el.innerText()).trim();
    const body = await page.locator('[data-testid="analytics-dashboard"]').innerText();
    return (body.match(/[-+]?\$[\d,]+\.\d{2}/) || ['?'])[0];
  };
  const all = await page.locator('[data-testid="analytics-dashboard"]').innerText();
  const totalConjunto = respuestas.get('all');
  ok('sin filtro, el P&L es el que devolvió el backend',
    totalConjunto !== undefined && contiene(all, totalConjunto),
    totalConjunto === undefined ? 'el backend no respondió' : `backend ${comoEnPantalla(totalConjunto)}`);

  // ── 4 · Filtrar por futuros recalcula EN EL BACKEND ────────────
  const before = calls.length;
  await page.locator('[data-testid="analytics-product-futures"]').click();
  await page.waitForTimeout(3000);
  ok('filtrar dispara una llamada nueva al backend', calls.length > before,
    calls[calls.length - 1] || '');
  ok('la llamada lleva el producto en la query',
    /product=futures/.test(calls[calls.length - 1] || ''));
  const fut = await page.locator('[data-testid="analytics-dashboard"]').innerText();
  const totalFuturos = respuestas.get('futures');
  ok('las cifras cambian a las que devolvió el backend para futuros',
    totalFuturos !== undefined && contiene(fut, totalFuturos)
      && totalFuturos !== totalConjunto,
    totalFuturos === undefined ? 'sin respuesta' : `backend ${comoEnPantalla(totalFuturos)}`);
  ok('el aviso de cuentas desaparece al filtrar',
    !(await page.locator('[data-testid="analytics-mixed-accounts"]').isVisible().catch(() => false)));
  await page.locator('[data-testid="analytics-product-filter"]').scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, 'filtro-futuros');

  // ── 5 · Filtrar por opciones: el otro extremo del diario ───────
  await page.locator('[data-testid="analytics-product-option"]').click();
  await page.waitForTimeout(3000);
  const opt = await page.locator('[data-testid="analytics-dashboard"]').innerText();
  const totalOpciones = respuestas.get('option');
  ok('las opciones se leen con la misma regla',
    totalOpciones !== undefined && contiene(opt, totalOpciones),
    totalOpciones === undefined ? 'sin respuesta' : `backend ${comoEnPantalla(totalOpciones)}`);
  ok('la llamada de opciones también viaja al backend',
    /product=option/.test(calls[calls.length - 1] || ''));
  await page.locator('[data-testid="analytics-product-filter"]').scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, 'filtro-opciones');

  // ── 6 · Volver al conjunto ─────────────────────────────────────
  await page.locator('[data-testid="analytics-product-all"]').click();
  await page.waitForTimeout(3000);
  ok('volver a «Todo» devuelve el conjunto',
    totalConjunto !== undefined
      && contiene(await page.locator('[data-testid="analytics-dashboard"]').innerText(), totalConjunto));
  ok('y el aviso de cuentas vuelve a salir',
    await page.locator('[data-testid="analytics-mixed-accounts"]').isVisible().catch(() => false));
  await shot(page, 'vuelta-a-todo');

  // ── 7 · Nada de esto desborda ──────────────────────────────────
  const ov = await overflow(page);
  ok('la analítica no desborda en horizontal', ov.doc <= ov.win + 1, `${ov.doc}px vs ${ov.win}px`);

  // El desglose por producto que ya existía sigue estando.
  const byProd = page.locator('[data-testid="breakdown-product"]');
  if (await byProd.count()) {
    await byProd.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);
    await shot(page, 'desglose-por-producto');
    ok('el desglose por producto sigue en su sitio', true);
  }

  await browser.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} comprobaciones OK — capturas en ${OUT}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error('reventó:', e.message); process.exit(2); });
