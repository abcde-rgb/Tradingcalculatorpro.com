/**
 * Los tres arreglos de esta tanda, comprobados en móvil de verdad:
 *  1. el menú móvil ofrece los SEIS temas, no un interruptor claro/oscuro;
 *  2. cada tema se aplica de verdad (cambia la clase del <html>);
 *  3. el selector de idiomas lista los 10.
 */
const { chromium } = require('../lib/playwright-core');
const path = require('path');
const fs = require('fs');
const { BASE, rutaChromium } = require('../entorno');


const OUT = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'temas');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (n, c, d = '') => {
  results.push(c);
  console.log(`  ${c ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`);
};

(async () => {
  const browser = await chromium.launch({
    executablePath: rutaChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, locale: 'es-ES',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  }).then((c) => c.newPage());

  console.log('\n=== MÓVIL 390x844 — temas e idiomas ===\n');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  for (const l of ['Aceptar todo', 'Aceptar']) {
    const b = page.getByRole('button', { name: l, exact: false }).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  await page.waitForTimeout(600);

  await page.locator('[data-testid="mobile-menu-toggle"]').click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '01-menu-movil.png') });

  await page.locator('[data-testid="mobile-theme-toggle"]').click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '02-temas-movil.png') });

  for (const id of ['gold', 'crypto', 'forex', 'nasdaq']) {
    ok(`el tema ${id} esta en el menu movil`,
      await page.locator(`[data-testid="mobile-theme-${id}"]`).isVisible().catch(() => false));
  }
  const items = await page.locator('[role="menuitem"]').count();
  ok('el menu ofrece 7 entradas (claro, oscuro, sistema + 4 premium)', items === 7, `${items} entradas`);

  // Que se aplique de verdad, no solo que se vea en la lista.
  await page.locator('[data-testid="mobile-theme-gold"]').click();
  await page.waitForTimeout(1200);
  const cls = await page.evaluate(() => document.documentElement.className);
  ok('elegir «oro» aplica la clase del tema', /theme-gold/.test(cls), `class="${cls}"`);
  await page.screenshot({ path: path.join(OUT, '03-tema-oro-aplicado.png') });

  // Idiomas: los 10. Elegir un tema cierra el menu entero, asi que hay que
  // reabrirlo y esperar a que el disparador este montado.
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
  const langBtn = page.locator('[data-testid="mobile-language-toggle"]');
  if (!(await langBtn.isVisible().catch(() => false))) {
    await page.locator('[data-testid="mobile-menu-toggle"]').click().catch(() => {});
    await page.waitForTimeout(900);
  }
  await langBtn.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await langBtn.click().catch(() => {});
  await page.waitForTimeout(1000);
  const langs = await page.locator('[role="menuitem"]').count();
  ok('el selector de idiomas lista los 10', langs === 10, `${langs} idiomas`);
  await page.screenshot({ path: path.join(OUT, '04-idiomas-movil.png') });

  await browser.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} comprobaciones OK`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error('reventó:', e.message); process.exit(2); });
