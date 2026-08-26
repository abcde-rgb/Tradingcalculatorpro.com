/**
 * Las figuras nuevas de la academia, en navegador y sobre el BUILD COMPILADO.
 *
 * Esta sonda existe por una razón concreta que el repositorio ya ha pagado: un
 * SVG que no pinta nada pasa cualquier test que no mire el resultado. Un
 * `<svg>` con el viewBox mal, un `<path>` con la `d` vacía o un contenedor de
 * altura cero devuelven un componente perfectamente montado y un hueco en
 * pantalla. Por eso aquí no se comprueba que el componente exista: se cuenta
 * cuántos trazos tiene y se mide la caja que ocupa.
 *
 * ⚠️ Hace falta el stack: `/education` es `premiumOnly`.
 *
 *   tests/e2e/stack/arriba.sh
 *   node tests/e2e/navegador/figuras-academia.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, entra, descartaModales, BASE } = require('../entorno');

const fallos = [];
const marca = (n, ok, d = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos.push(n);
};

const abre = async (page, topic) => {
  await page.goto(`${BASE}/education?topic=${topic}`,
                  { waitUntil: 'networkidle', timeout: 60000 });
  await descartaModales(page).catch(() => {});
  await page.waitForTimeout(700);
};

/**
 * La comprobación de verdad: la figura existe, DIBUJA y OCUPA.
 * Menos de `minTrazos` trazos es un esqueleto; menos de 40 px de alto es un
 * hueco aunque el DOM diga que está.
 */
async function figuraDibuja(page, testid, minTrazos = 3) {
  const cont = page.locator(`[data-testid="${testid}"]`);
  if (await cont.count() === 0) return { ok: false, detalle: 'no existe' };
  const svg = cont.locator('svg').first();
  if (await svg.count() === 0) return { ok: false, detalle: 'sin <svg>' };

  const trazos = await svg.locator('path, polyline, rect, circle, line').count();
  const caja = await svg.boundingBox();
  if (!caja) return { ok: false, detalle: 'sin caja (display:none?)' };

  const ok = trazos >= minTrazos && caja.height >= 40 && caja.width >= 120;
  return {
    ok,
    detalle: `${trazos} trazos · ${Math.round(caja.width)}×${Math.round(caja.height)}`,
  };
}

(async () => {
  const navegador = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const salida = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'figuras');
  fs.mkdirSync(salida, { recursive: true });

  try {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));

    if (!(await entra(page))) {
      console.error('✗ No se pudo entrar. ¿Está el stack en pie? tests/e2e/stack/arriba.sh');
      process.exit(1);
    }

    // ── Las griegas ────────────────────────────────────────────────────
    console.log('\n── option-greeks: seis curvas donde no había ninguna ─────');
    await abre(page, 'option-greeks');
    for (const g of ['delta', 'gamma', 'theta', 'vega', 'rho', 'iv']) {
      const r = await figuraDibuja(page, `greek-fig-${g}`);
      marca(`${g} dibuja y ocupa`, r.ok, r.detalle);
    }
    await page.screenshot({ path: path.join(salida, '01-griegas.png'), fullPage: true });

    // ── Los payoffs ────────────────────────────────────────────────────
    console.log('\n── options-strat: siete diagramas de pago ────────────────');
    await abre(page, 'options-strat');
    const estrategias = ['coveredcall', 'cashput', 'bullspread', 'bearspread',
                         'ironcondor', 'straddle', 'protectiveput'];
    for (const e of estrategias) {
      const r = await figuraDibuja(page, `payoff-fig-${e}`, 5);
      marca(`${e} dibuja y ocupa`, r.ok, r.detalle);
    }

    // El condor y el butterfly se describen igual y se distinguen por la forma.
    // Si el condor perdiera su meseta, el módulo dejaría de enseñar lo único que
    // no cabe en el texto — y ninguna otra comprobación lo vería.
    // ⚠️ `.first()` cogía el polyline de los EJES, que se dibuja antes que el
    //   pago, y la comprobación salía roja con el producto perfectamente bien
    //   (leía «20,12 20,98», que es la vertical del eje). La línea de pago es
    //   siempre la que MÁS vértices tiene: los ejes tienen dos.
    const polys = await page.locator('[data-testid="payoff-fig-ironcondor"] polyline')
      .evaluateAll(ns => ns.map(n => n.getAttribute('points') || ''));
    const pts = polys.sort((a, b) => b.trim().split(/\s+/).length - a.trim().split(/\s+/).length)[0];
    let meseta = false;
    if (pts) {
      // Dos vértices consecutivos a la MISMA altura, y arriba: eso es la meseta.
      const ys = pts.trim().split(/\s+/).map(p => Number(p.split(',')[1]));
      meseta = ys.some((y, i) => i < ys.length - 1 && y === ys[i + 1] && y < 60);
    }
    marca('el iron condor tiene MESETA, no pico (es lo que lo separa del butterfly)',
          meseta, pts ? pts.slice(0, 44) + '…' : 'sin points');

    await page.screenshot({ path: path.join(salida, '02-payoffs.png'), fullPage: true });

    // ── La guía de stops, en el módulo correcto ────────────────────────
    console.log('\n── StopLossGuide vive donde se busca ─────────────────────');
    await abre(page, 'stops-targets');
    const enStops = await page.locator('text=/stop/i').count();
    marca('stops-targets tiene contenido de stops visible', enStops > 0, `${enStops} coincidencias`);
    const svgsStops = await page.locator('main svg, [role="tabpanel"] svg').count();
    marca('stops-targets ya tiene figuras', svgsStops > 2, `${svgsStops} svg`);

    await abre(page, 'capital');
    marca('capital sigue en pie tras quitarle la guía',
          await page.locator('[role="tabpanel"]').count() > 0);

    // ── Las cifras del riesgo de cola ──────────────────────────────────
    // `tail-risk` tenía 1.096 palabras y cero cifras. `engine-check` comprueba
    // la aritmética; esto comprueba la otra mitad, que en este repositorio ya
    // ha mentido dos veces: que la cifra LLEGUE a la pantalla, y en el formato
    // del idioma. Los números vienen del cálculo, así que un cambio en
    // `tailRiskData.js` que rompa el render sale aquí.
    console.log('\n── tail-risk: tres tablas donde no había un solo número ──');
    await abre(page, 'tail-risk');
    marca('las tablas de cifras existen',
          await page.locator('[data-testid="tail-figures"]').count() > 0);
    const cola = await page.locator('[data-testid="tail-figures"]').innerText().catch(() => '');
    for (const cifra of ['−20,47 %', '−77,9 %', '−91,5 %', '+900 %', '+1.900 %']) {
      marca(`la tabla dice ${cifra}`, cola.includes(cifra));
    }
    // La fila que da sentido a todas las demás: 20 σ frente al universo.
    const universos = await page.locator('[data-testid="tail-universos"]').innerText().catch(() => '');
    marca('20 σ se compara con la edad del universo en potencias de diez',
          /10⁷⁵|10⁷⁵/.test(universos) || /× 10/.test(universos), universos.trim());
    // Aserción negativa: las diez filas tienen texto, ninguna celda vacía.
    const vacias = await page.locator('[data-testid^="tail-ev-"]').evaluateAll(
      (fs2) => fs2.filter((f) => (f.lastElementChild?.textContent || '').trim().length < 20).length);
    marca('ninguna fila de evento se queda sin explicación', vacias === 0, `${vacias} vacías`);
    await page.screenshot({ path: path.join(salida, '04-riesgo-cola.png'), fullPage: true });

    // ── Los dos componentes que estaban sin importar ───────────────────
    // `auditar.py` los deja de contar como huérfanos en cuanto alguien escribe
    // su nombre en otro fichero: eso comprueba el import, no el render. Un
    // componente importado dentro de una rama que nunca se cumple sigue sin
    // verlo nadie, y el informe diría que ya está integrado.
    console.log('\n── TradingBasicsGuide y WhyItMatters, ya no huérfanos ────');
    await abre(page, 'start-here');
    marca('el diagrama de largos se pinta',
          await page.locator('svg[aria-label="Long diagram"]').count() > 0);
    // Es una guía por PESTAÑAS: el de cortos no existe hasta que se pulsa. Sin
    // esta mitad, la comprobación de arriba pasaría con el resto sin montar.
    marca('el de cortos no está antes de pulsar',
          await page.locator('svg[aria-label="Short diagram"]').count() === 0);
    const botonCorto = page.locator('button', { hasText: /Short/i }).first();
    if (await botonCorto.count()) {
      await botonCorto.click();
      await page.waitForTimeout(500);
      marca('…y aparece después', await page.locator('svg[aria-label="Short diagram"]').count() > 0);
    } else {
      marca('el botón de la sección de cortos existe', false);
    }

    // El bloque «por qué importa» y sus cifras, que `engine-check` ata a la
    // aritmética que las produce. Aquí se comprueba que salgan a pantalla.
    // En `risk` va además la tabla de equilibrio: diez filas que el curso
    // nombraba decenas de veces sin decir nunca a cuánto acierto obligaban.
    for (const [tema, textos] of [['risk', ['85,1 %', '43,0 %', '+132 %']],
                                  ['probability', ['50 %', '55 %']]]) {
      await abre(page, tema);
      const bloque = page.locator('[data-testid="why-it-matters"]').first();
      marca(`${tema}: el bloque «por qué importa» se pinta`, await bloque.count() > 0);
      const txt = await bloque.count() ? await bloque.innerText() : '';
      for (const s of textos) marca(`${tema}: dice «${s}»`, txt.includes(s));
    }
    await abre(page, 'risk');
    const tablaEq = page.locator('[data-testid="breakeven-table"]');
    marca('la tabla de equilibrio se pinta en el módulo de riesgo',
          await tablaEq.count() > 0);
    const eq = await tablaEq.count() ? await tablaEq.innerText() : '';
    // Los dos extremos y la fila de referencia: si `tablaEquilibrio` cambiara,
    // aquí se vería antes que en ningún otro sitio.
    for (const s of ['80,0 %', '50,0 %', '55,0 %', '9,1 %']) {
      marca(`la tabla dice ${s}`, eq.includes(s));
    }
    await page.screenshot({ path: path.join(salida, '05-por-que-importa.png'), fullPage: true });

    // ── Móvil oscuro: donde se rompe la maquetación de un SVG ──────────
    console.log('\n── Móvil y modo oscuro ──────────────────────────────────');
    const movil = await navegador.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      colorScheme: 'dark',
    });
    const pm = await movil.newPage();
    await entra(pm);
    await abre(pm, 'option-greeks');
    const rm = await figuraDibuja(pm, 'greek-fig-gamma');
    marca('en móvil oscuro gamma sigue dibujando', rm.ok, rm.detalle);
    const desborda = await pm.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    marca('sin desbordamiento horizontal en móvil', !desborda);
    await pm.screenshot({ path: path.join(salida, '03-griegas-movil-oscuro.png'), fullPage: true });
    await movil.close();

    marca('sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));
    console.log(`\n  capturas → ${salida}`);
  } finally {
    await navegador.close();
  }

  console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s): ${fallos.join(', ')}\n`
                            : '\n✅ Las figuras nuevas dibujan de verdad.\n');
  process.exit(fallos.length ? 1 : 0);
})();
