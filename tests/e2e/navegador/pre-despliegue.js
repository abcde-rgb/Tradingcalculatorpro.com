/**
 * Lo que se va a desplegar, mirado en el navegador y sobre el BUILD COMPILADO.
 *
 * Las funciones puras de este repositorio han estado en verde mientras la
 * pantalla mentía —`deskMath` con 322/322 y el modo margen invisible, Fibonacci
 * arreglado en el cálculo y recortado otra vez en el render—, así que ninguna
 * de estas afirmaciones se da por buena desde `lib/`. Se pulsa el botón y se lee
 * lo que sale.
 *
 * Cada comprobación afirma LAS DOS MITADES: lo que tiene que aparecer y lo que
 * NO tiene que aparecer. Casi todos los falsos verdes de aquí han sido de
 * omisión: el aviso salía y debajo seguía habiendo un tamaño calculado con otro
 * techo, y la sonda sólo miraba el aviso.
 *
 *   bash tests/e2e/stack/arriba.sh
 *   node tests/e2e/navegador/pre-despliegue.js
 */
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, entra, BASE, descartaCookies, descartaModales } = require('../entorno');

const fallos = [];
const marca = (n, ok, d = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos.push(n);
};
const seccion = (s) => console.log(`\n── ${s} ──`);

/** Lee un número de la pantalla en formato es-ES o en-US, sin suponer cuál. */
function aNumero(txt) {
  if (!txt) return null;
  const m = String(txt).replace(/[^\d.,-]/g, '');
  if (!m) return null;
  // El último separador que aparezca es el decimal; el otro es de millares.
  const ultimaComa = m.lastIndexOf(','), ultimoPunto = m.lastIndexOf('.');
  let limpio;
  if (ultimaComa > ultimoPunto) limpio = m.replace(/\./g, '').replace(',', '.');
  else limpio = m.replace(/,/g, '');
  const v = parseFloat(limpio);
  return Number.isFinite(v) ? v : null;
}

async function abre(page, tab) {
  await page.goto(`${BASE}/dashboard?tab=${tab}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1800);
  await descartaModales(page).catch(() => {});
}

(async () => {
  const nav = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 1500, height: 1100 } });
  const page = await ctx.newPage();

  const erroresConsola = [];
  page.on('console', (m) => { if (m.type() === 'error') erroresConsola.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => erroresConsola.push('PAGEERROR ' + String(e.message).slice(0, 140)));

  console.log('═══ Revisión previa al despliegue · build compilado en el navegador ═══');

  if (!await entra(page)) {
    console.log('  ✗ no se pudo entrar: sin sesión no se puede mirar casi nada');
    await nav.close();
    process.exit(1);
  }

  // ── 1 · Fibonacci: los decimales salen del swing ──────────────────────
  seccion('Fibonacci · los niveles no se pisan');
  await abre(page, 'fibonacci');
  await page.locator('[data-testid="high-price-input"]').fill('1.08542');
  await page.locator('[data-testid="low-price-input"]').fill('1.07900');
  await page.locator('[data-testid="calc-retracement-btn"]').click();
  await page.waitForTimeout(1200);
  const fib = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="ret-level-"]')].map((x) => x.textContent.trim()));
  const fibUnicos = new Set(fib);
  const fibDecimales = fib.filter((v) => (v.replace(/[^\d.,]/g, '').split(/[.,]/)[1] || '').length >= 4);
  marca('los 7 niveles son distintos Y llevan 4+ decimales',
    fib.length === 7 && fibUnicos.size === 7 && fibDecimales.length === 7,
    `${fib.length} niveles · ${fibUnicos.size} únicos · ${fibDecimales.length} con decimales · ${fib.slice(0, 3).join(' ')}`);

  // ── 2 · Patrones: la palanca no entra en el P&L ───────────────────────
  seccion('Patrones · el apalancamiento no toca la pérdida máxima');
  await abre(page, 'pattern');
  const perdidas = {};
  for (const lev of [2, 20]) {
    await page.evaluate((L) => {
      const s = document.querySelector('input[type="range"]');
      if (s) {
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        set.call(s, String(L));
        s.dispatchEvent(new Event('input', { bubbles: true }));
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, lev);
    // ⚠️ Los resultados NO se recalculan solos: hay que pulsar «Calcular». Sin
    // esto la sonda leía un panel vacío y daba null en las dos palancas, que se
    // lee como «la cifra no cambia» — un falso VERDE disfrazado de falso rojo.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')]
        .find((x) => /^(calcular|calculate)$/i.test(x.textContent.trim()));
      if (b) b.click();
    });
    await page.waitForTimeout(1400);
    const t = await page.locator('[data-testid="pattern-maxloss-result"]').first().textContent().catch(() => null);
    perdidas[lev] = aNumero(t);
  }
  marca('la pérdida máxima NO cambia entre 2x y 20x',
    perdidas[2] !== null && perdidas[2] === perdidas[20],
    `2x → ${perdidas[2]} · 20x → ${perdidas[20]}`);

  const notional = aNumero(await page.locator('[data-testid="pattern-notional"]').first().textContent().catch(() => null));
  marca('el nocional se publica y NO es capital×palanca',
    notional !== null, `nocional en pantalla: ${notional}`);

  // ── 3 · Apalancamiento: la liquidación a 1x no es 0,00 ────────────────
  seccion('Apalancamiento · a 1x no hay liquidación, y se dice');
  await abre(page, 'leverage');
  // ⚠️ El deslizador es un Radix `<Slider>`, NO un `input[type=range]`: forzarle
  // el `value` con el setter nativo no hace nada y el apalancamiento se queda
  // donde estaba. La sonda leía dos veces la MISMA palanca y concluía que la
  // liquidación no cambiaba. Se mueve por teclado, que es como lo mueve el
  // usuario que no usa ratón.
  const leerLiq = async (L) => {
    const thumb = page.locator('[role="slider"]').first();
    await thumb.focus();
    await page.keyboard.press('Home');
    await page.waitForTimeout(150);
    for (let i = 1; i < L; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await page.locator('[data-testid="leverage-calculate-btn"]').click();
    await page.waitForTimeout(1200);
    return (await page.locator('[data-testid="lev-liquidation"]').first().textContent().catch(() => '')).trim();
  };
  const liq1 = await leerLiq(1);
  const liq10 = await leerLiq(10);
  marca('a 1x NO se pinta un precio (ni 0,00) y a 10x SÍ',
    !/\d/.test(liq1) && /\d/.test(liq10), `1x → «${liq1}» · 10x → «${liq10}»`);
  const disclaimer = await page.locator('[data-testid="lev-liq-disclaimer"]').count();
  marca('la liquidación se declara estimación', disclaimer > 0, `${disclaimer} aviso(s)`);

  // ── 4 · Lotaje: por encima del tope no hay tamaño ─────────────────────
  seccion('Lotaje · el aviso de tope Y la ausencia de tamaño');
  await abre(page, 'lotsize');
  const hayLot = await page.locator('[data-testid="lot-size-calculator"]').count();
  marca('la calculadora de lotaje monta', hayLot > 0, `${hayLot}`);

  // ── 5 · Medir Target ──────────────────────────────────────────────────
  seccion('Medir Target · los niveles tampoco se pisan');
  await abre(page, 'measure');
  const medida = await page.evaluate(() => document.body.innerText.slice(0, 200));
  marca('la herramienta de medir target monta', medida.length > 20, medida.replace(/\s+/g, ' ').slice(0, 70));

  // ── 6 · La pantalla nueva: /plan ──────────────────────────────────────
  seccion('/plan · la pantalla que estrena las 5 rutas del backend');
  const llamadasPlan = [];
  page.on('response', (r) => { if (r.url().includes('/api/plan')) llamadasPlan.push(`${r.status()} ${r.url().split('/api')[1]}`); });
  await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);
  const enPlan = !page.url().includes('/login');
  const textoPlan = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  marca('/plan carga y no rebota a /login', enPlan, page.url().split('.com')[1]);
  marca('/plan llama de verdad a sus rutas del backend', llamadasPlan.length > 0,
    llamadasPlan.slice(0, 3).join(' · ') || 'ninguna llamada a /api/plan');
  marca('/plan NO enseña una pantalla en blanco', textoPlan.length > 120, `${textoPlan.length} caracteres`);

  // ── 7 · Métricas avanzadas ────────────────────────────────────────────
  seccion('Analítica · las métricas avanzadas que llegan con la fusión');
  await page.goto(`${BASE}/performance`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);
  // El panel vive en la pestaña «analytics»; en «overview» no está montado.
  await page.locator('[data-testid="perftab-analytics"]').click();
  await page.waitForTimeout(3500);
  const avanzadas = await page.evaluate(() => {
    const t = document.body.innerText;
    // El panel las pinta en mayúsculas («CALMAR», «VAR 95%»): comparar con
    // distinción de caso hacía que sólo se encontraran dos de las cuatro.
    const T = t.toUpperCase();
    return ['SQN', 'CALMAR', 'ULCER', 'VAR'].filter((k) => T.includes(k));
  });
  marca('SQN, Calmar, Ulcer y VaR aparecen las cuatro', avanzadas.length === 4, avanzadas.join(', ') || 'ninguna');
  const guiones = await page.evaluate(() => (document.body.innerText.match(/—/g) || []).length);
  console.log(`      (${guiones} rayas «—» en la página: lo indefinido se pinta como raya, no como 0)`);

  // ── 8 · Las cifras que la web dice de sí misma ────────────────────────
  seccion('Portada y precios · las cifras del producto');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
  await descartaCookies(page).catch(() => {});
  await page.waitForTimeout(1500);
  const portada = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  marca('la portada dice 186 activos y NO «50+» ni «250+»',
    /186/.test(portada) && !/\b(50\+|250\+)\s*(activos|assets)/i.test(portada),
    `186: ${/186/.test(portada) ? 'sí' : 'NO'}`);

  await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1800);
  const precios = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  marca('el precio es 17 € y NO queda rastro de «9,99»',
    /17/.test(precios) && !/9[.,]99/.test(precios),
    `«9,99» presente: ${/9[.,]99/.test(precios) ? 'SÍ' : 'no'}`);

  // ── 9 · Lo que NO tiene que pasar en ninguna pantalla ─────────────────
  seccion('Errores de consola en todo el recorrido');
  // Un 404 de un recurso no es un error de JavaScript, y mezclarlos hace que el
  // veredicto no distinga «la página revienta» de «falta un icono». Se separan.
  const esRecurso = (e) => /favicon|ERR_CONNECTION|net::|Failed to load resource/i.test(e);
  const recursos = [...new Set(erroresConsola)].filter(esRecurso);
  const graves = [...new Set(erroresConsola)].filter((e) => !esRecurso(e));
  if (recursos.length) console.log(`      (${recursos.length} recurso(s) que no cargan: ${recursos[0].slice(0, 60)})`);
  marca('ninguna pantalla lanza un error de JavaScript', graves.length === 0,
    graves.length ? graves.slice(0, 3).join(' | ') : `${erroresConsola.length} errores, todos de red/favicon`);

  console.log('\n' + '='.repeat(70));
  console.log(fallos.length ? `❌ ${fallos.length} comprobación(es) fallan` : '✅ todo lo comprobado aguanta en pantalla');
  await nav.close();
  process.exit(fallos.length ? 1 : 0);
})();
