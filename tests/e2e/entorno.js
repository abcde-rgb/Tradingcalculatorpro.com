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

/** El build de producción lleva `PUBLIC_URL=/` incrustado
 *  en las rutas de los assets, que es como se publica en GitHub Pages. Se sirve
 *  bajo esa misma base para probar el artefacto REAL: recompilarlo con otra base
 *  sería probar un binario que nunca llega al usuario. */
// Base bajo la que se sirve la app. Desde el cutover a `tradingcalculator.pro`
// (2026-08-28) el build cuelga de la RAÍZ (`PUBLIC_URL: /`), así que por defecto
// va vacía; `E2E_BASE_PATH` la fuerza para probar un build antiguo.
//
// Estuvo escrita a mano en seis ficheros, y por eso el cutover la dejó desfasada
// en los seis a la vez: las sondas pedían `/Tradingcalculatorpro.com/...` a un
// build que ya servía desde `/`, y contestaba 404. Mismo fallo que el CORS —
// una constante copiada que no siguió al dominio.
const BASE_PATH = process.env.E2E_BASE_PATH ?? '';
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

/**
 * Cierra los diálogos que tapan la pantalla recién entrada.
 *
 * El banner de cookies ya estaba contemplado; el modal de bienvenida
 * (`OnboardingModal`) no, y pinta un overlay a pantalla completa que se come
 * TODOS los clics. El síntoma no dice nada: Playwright reintenta treinta veces
 * y acaba con un timeout de 30 s sobre un botón que está «visible, enabled y
 * stable» — visible sí, alcanzable no. Cuesta un buen rato descubrirlo, y le
 * pasa a cualquiera que escriba una sonda nueva.
 */
async function descartaModales(page, intentos = 4) {
  for (let i = 0; i < intentos; i++) {
    const overlay = page.locator('div[data-state="open"][aria-hidden="true"]');
    if (!(await overlay.count())) return true;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(400);
  }
  const cerrar = page.locator(
    '[role="dialog"] button:has-text("Empezar"), [role="dialog"] button:has-text("Cerrar"), [role="dialog"] [aria-label="Close"]',
  ).first();
  if (await cerrar.isVisible().catch(() => false)) {
    await cerrar.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  return !(await page.locator('div[data-state="open"][aria-hidden="true"]').count());
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
  // Nada más entrar aparece el modal de bienvenida. Si no se cierra aquí, la
  // primera acción de CUALQUIER sonda falla con un timeout que no lo explica.
  await descartaModales(page);
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
  abreNavegador, capturador, descartaCookies, descartaModales, desbordamiento,
  entra, marcador, rutaChromium,
};
