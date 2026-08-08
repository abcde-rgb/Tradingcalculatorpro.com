/**
 * El ticker del dashboard con el proveedor de precios caído.
 *
 * Antes salía XAU a 2 680 $ con flecha verde y +0,5 %: un precio de hace meses
 * presentado como el de ahora. Ahora no sale nada, que es la respuesta correcta
 * a «no lo sé». Lo que se comprueba es que la ausencia NO rompe el dashboard.
 */
const { chromium } = require('../lib/playwright-core');
const path = require('path');
const fs = require('fs');
const { BASE, rutaChromium } = require('../entorno');

const OUT = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'ticker');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (n, c, d = '') => { results.push(c); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`); };

(async () => {
  const browser = await chromium.launch({
    executablePath: rutaChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await (await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'es-ES',
  })).newPage();
  const crashes = [];
  page.on('pageerror', (e) => crashes.push(e.message.slice(0, 120)));

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  for (const l of ['Aceptar todo', 'Aceptar']) {
    const b = page.getByRole('button', { name: l, exact: false }).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.locator('input[type="email"]').first().fill('qa@example.com');
  await page.locator('input[type="password"]').first().fill('QaTest2026!');
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);

  const texto = await page.locator('body').innerText();
  ok('el dashboard carga con el proveedor de precios caído', !page.url().includes('/login'));
  ok('NO se pinta un precio de oro inventado', !/2[.,]?680/.test(texto),
    (texto.match(/2[.,]?680[^\n]{0,20}/) || ['ninguno'])[0]);
  ok('NO se pinta la plata inventada', !/31[.,]50/.test(texto));
  ok('no hay excepción de React al faltar los precios', crashes.length === 0,
    crashes[0] || 'sin errores');
  const doc = await page.evaluate(() => document.documentElement.scrollWidth);
  const win = await page.evaluate(() => window.innerWidth);
  ok('el dashboard no se desborda', doc <= win + 1, `${doc}px vs ${win}px`);
  await page.screenshot({ path: path.join(OUT, '01-dashboard-sin-precios.png') });

  await browser.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} comprobaciones OK`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error('reventó:', e.message); process.exit(2); });
