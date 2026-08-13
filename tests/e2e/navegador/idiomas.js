/**
 * Los 10 idiomas EN PANTALLA, no sólo en el archivo de claves.
 *
 * `i18n-check` compara que las 10 traducciones tengan las mismas claves. Eso no
 * dice nada sobre lo que se ve: una clave puede existir y aparecer cruda si el
 * componente la pide mal, y un texto tres veces más largo en alemán puede
 * desbordar el contenedor sin que ninguna comprobación offline se entere.
 *
 * El caso que más importa es el **árabe**: se escribe de derecha a izquierda, y
 * un layout que nunca se ha mirado en RTL suele estar roto. La aplicación ya
 * pone `dir="rtl"` y `lang` (`lib/i18n.js`), así que aquí se comprueba que eso
 * ocurre de verdad y que la página sigue siendo usable.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('../lib/playwright-core');
const { BASE, CUENTA, marcador, rutaChromium } = require('../entorno');

const IDIOMAS = [
  ['es', 'ltr'], ['en', 'ltr'], ['fr', 'ltr'], ['de', 'ltr'], ['it', 'ltr'],
  ['pt', 'ltr'], ['ru', 'ltr'], ['zh', 'ltr'], ['ja', 'ltr'], ['ar', 'rtl'],
];
const PAGINAS = [['landing', '/'], ['precios', '/pricing'], ['diario', '/performance']];
const MODO = process.argv[2] === 'movil' ? 'movil' : 'escritorio';
const VISTA = MODO === 'movil' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const SALIDA = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'idiomas', MODO);
fs.mkdirSync(SALIDA, { recursive: true });

/** Una clave i18n cruda que se cuela en pantalla: camelCase largo, sin espacios
 *  ni acentos, del estilo `tradeEntryAt`. Es un fallo real que este proyecto ya
 *  ha tenido, y a simple vista pasa por texto en inglés. */
const CLAVE_CRUDA = /\b[a-z]{2,}[A-Z][a-zA-Z]{6,}\b/g;
const PERMITIDAS = new Set([
  'TradingView', 'JavaScript', 'PayPal', 'NOWPayments', 'GitHub', 'YouTube',
  'iPhone', 'iPad', 'macOS', 'iOS', 'WhatsApp', 'LinkedIn',
]);

(async () => {
  const ok = marcador();
  const browser = await chromium.launch({
    executablePath: rutaChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: VISTA, deviceScaleFactor: 2, locale: 'es-ES',
    isMobile: MODO === 'movil', hasTouch: MODO === 'movil',
  });
  const page = await ctx.newPage();

  console.log(`\n=== LOS 10 IDIOMAS · ${MODO} ${VISTA.width}x${VISTA.height} ===\n`);

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  for (const l of ['Aceptar todo', 'Aceptar']) {
    const b = page.getByRole('button', { name: l, exact: false }).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"]').first().fill(CUENTA.email);
  await page.locator('input[type="password"]').first().fill(CUENTA.password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(3500);

  for (const [idioma, direccion] of IDIOMAS) {
    // Se fija el idioma como lo hace la propia aplicación (`lib/i18n.js` lo
    // persiste), y se recarga para que el arranque lo tome como lo tomaría un
    // usuario que vuelve al día siguiente.
    // La misma clave y forma que usa Zustand con `persist` en `lib/i18n.js`.
    // Escribir `locale` a secas no hace nada: el store lee `trading-i18n-storage`
    // y, si no encuentra su envoltorio, se queda en español — con lo que la
    // sonda «probaría» los 10 idiomas mirando 10 veces el mismo.
    await page.evaluate((l) => {
      localStorage.setItem('trading-i18n-storage', JSON.stringify({
        state: { locale: l, autoDetected: true }, version: 0,
      }));
    }, idioma);
    let desbordes = [];
    let crudas = new Set();

    for (const [nombre, ruta] of PAGINAS) {
      await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1800);

      const info = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        doc: document.documentElement.scrollWidth,
        win: window.innerWidth,
        texto: document.body.innerText,
      }));

      if (nombre === 'landing') {
        // Se compara el PREFIJO: `useSEO` cualifica algunos idiomas por región
        // (`zh` → `zh-CN`), que para buscadores es más preciso, no un fallo.
        ok(`${idioma}: <html lang> y dir correctos`,
          info.lang.split('-')[0] === idioma && info.dir === direccion,
          `lang=${info.lang} dir=${info.dir} (esperado ${idioma}*/${direccion})`);
      }
      if (info.doc > info.win + 1) desbordes.push(`${nombre} ${info.doc}>${info.win}`);
      for (const m of info.texto.match(CLAVE_CRUDA) || []) {
        if (!PERMITIDAS.has(m)) crudas.add(m);
      }
      await page.screenshot({ path: path.join(SALIDA, `${idioma}-${nombre}.png`) });
    }

    ok(`${idioma}: ninguna página se desborda`, desbordes.length === 0, desbordes.join(', '));
    ok(`${idioma}: no se ven claves i18n crudas`, crudas.size === 0,
      [...crudas].slice(0, 4).join(', '));
  }

  await browser.close();
  const todo = ok.resumen();
  console.log(`capturas en ${SALIDA}`);
  process.exit(todo ? 0 : 1);
})().catch((e) => { console.error('reventó:', e.message); process.exit(2); });
