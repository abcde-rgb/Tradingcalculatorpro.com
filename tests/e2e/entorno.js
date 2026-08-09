/**
 * Lo compartido por todas las sondas de navegador.
 *
 * Existe para que las tres cosas que se rompen al cambiar de máquina —dónde
 * está Chromium, bajo qué ruta se sirve el build y cómo se entra— estén
 * escritas UNA vez. Cuando cada sonda las llevaba por su cuenta, mover el
 * banco de pruebas significaba editar seis archivos y descubrir el séptimo
 * fallando a mitad de una tanda.
 */
const fs = require('fs');
const path = require('path');

/** El build de producción lleva `PUBLIC_URL=/Tradingcalculatorpro.com` incrustado
 *  en las rutas de los assets, que es como se publica en GitHub Pages. Se sirve
 *  bajo esa misma base para probar el artefacto REAL: recompilarlo con otra base
 *  sería probar un binario que nunca llega al usuario. */
const BASE_PATH = '/Tradingcalculatorpro.com';
const PUERTO_WEB = Number(process.env.QA_PUERTO_WEB || 3100);
const BASE = `http://127.0.0.1:${PUERTO_WEB}${BASE_PATH}`;
const API = process.env.QA_API || 'http://127.0.0.1:8080';

const CUENTA = {
  email: process.env.QA_EMAIL || 'qa@example.com',
  password: process.env.QA_PASSWORD || 'QaTest2026!',
};

/** Chromium se busca, no se escribe a mano: el número de build cambia con cada
 *  actualización de Playwright y una ruta fija convierte eso en «no arranca». */
function rutaChromium() {
  if (process.env.QA_CHROMIUM) return process.env.QA_CHROMIUM;
  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const candidatos = fs.existsSync(raiz)
    ? fs.readdirSync(raiz)
        .filter((d) => d.startsWith('chromium-'))
        .map((d) => path.join(raiz, d, 'chrome-linux', 'chrome'))
        .filter((p) => fs.existsSync(p))
    : [];
  if (!candidatos.length) {
    throw new Error(
      `No encuentro Chromium bajo ${raiz}. En este entorno viene preinstalado; ` +
      'si no, exporta QA_CHROMIUM con la ruta al binario. No ejecutes ' +
      '"playwright install": la política de red del sandbox lo bloquea.');
  }
  return candidatos.sort().reverse()[0];   // el build más alto
}

const VISTAS = {
  escritorio: { width: 1440, height: 900 },
  movil: { width: 390, height: 844 },
};

/** Contexto listo para medir: viewport, escala y user agent coherentes. */
async function abreNavegador(chromium, vista = 'escritorio') {
  const esMovil = vista === 'movil';
  const browser = await chromium.launch({
    executablePath: rutaChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: VISTAS[esMovil ? 'movil' : 'escritorio'],
    deviceScaleFactor: 2,
    isMobile: esMovil,
    hasTouch: esMovil,
    locale: 'es-ES',
    userAgent: esMovil
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
        + '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  return { browser, page: await ctx.newPage() };
}

/** El banner de cookies intercepta los clics. Descartarlo no es cosmético: sin
 *  esto, el primer clic de cada sonda se lo come el banner y el fallo aparece
 *  tres pasos más tarde, en un sitio que no tiene nada que ver. */
async function descartaCookies(page) {
  for (const etiqueta of ['Aceptar todo', 'Aceptar', 'Accept all']) {
    const b = page.getByRole('button', { name: etiqueta, exact: false }).first();
    if (await b.isVisible().catch(() => false)) {
      await b.click().catch(() => {});
      return true;
    }
  }
  return false;
}

/** Entra por el formulario real, no inyectando un token: el login es parte de
 *  lo que se está probando. Devuelve true si salió de /login. */
async function entra(page, cuenta = CUENTA) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  await descartaCookies(page);
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.locator('input[type="email"]').first().fill(cuenta.email);
  await page.locator('input[type="password"]').first().fill(cuenta.password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(3500);
  return !page.url().includes('/login');
}

/** Ancho del documento contra ancho de la ventana. Un documento más ancho es
 *  scroll horizontal, que en móvil es el defecto de maquetación más habitual. */
const desbordamiento = (page) => page.evaluate(() => ({
  doc: document.documentElement.scrollWidth,
  win: window.innerWidth,
}));

/** Marcador de resultados con el mismo formato en todas las sondas, para que
 *  una tanda completa se lea de un vistazo. */
function marcador() {
  const resultados = [];
  const ok = (nombre, cond, detalle = '') => {
    resultados.push(Boolean(cond));
    console.log(`  ${cond ? '✅' : '❌'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
    return Boolean(cond);
  };
  ok.resumen = () => {
    const pasan = resultados.filter(Boolean).length;
    console.log(`\n${pasan}/${resultados.length} comprobaciones OK`);
    return pasan === resultados.length;
  };
  return ok;
}

/** Las capturas van a un directorio ignorado por git: son prueba de una tanda
 *  concreta, no un artefacto del repositorio. */
function capturador(page, subcarpeta) {
  const salida = path.join(__dirname, '..', '..', '.qa-capturas', subcarpeta);
  fs.mkdirSync(salida, { recursive: true });
  let n = 0;
  const shot = (nombre) => page.screenshot({
    path: path.join(salida, `${String(++n).padStart(2, '0')}-${nombre}.png`),
  });
  shot.directorio = salida;
  return shot;
}

module.exports = {
  API, BASE, BASE_PATH, CUENTA, PUERTO_WEB, VISTAS,
  abreNavegador, capturador, descartaCookies, desbordamiento, entra,
  marcador, rutaChromium,
};
