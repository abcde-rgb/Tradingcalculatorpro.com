/**
 * El módulo de ludopatía, en un navegador real y sobre el BUILD COMPILADO.
 *
 * Se comprueba en el build y no en las funciones porque casi todo lo que puede
 * fallar aquí es de pantalla: que el aviso de «esto no diagnostica» se pinte
 * ANTES del cuestionario y no debajo, que el resultado nunca salga sin él, que
 * el teléfono de ayuda esté visible sin haber contestado nada, y que la figura
 * del refuerzo dibuje algo en vez de un hueco. Nada de eso lo ve un test de
 * unidad, y todo eso es lo que decide si el módulo ayuda o hace daño.
 *
 * ⚠️ SÍ hace falta el stack: `/education` es `premiumOnly`. Mi primer intento
 * sirvió el build por su cuenta y aterrizó en /login, con las diez
 * comprobaciones en rojo y el módulo perfectamente sano. Levanta antes:
 *
 *   tests/e2e/stack/arriba.sh
 *   node tests/e2e/navegador/ludopatia.js
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

(async () => {
  const navegador = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  // A la carpeta IGNORADA por git: son de una tanda concreta y pesan
  // un mega cada una. `tests/e2e/capturas/` no está en .gitignore y la
  // primera versión metió tres PNG en el commit.
  const salida = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'ludopatia');
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

    console.log('\n── El módulo abre y se pinta ─────────────────────────────');
    await abre(page, 'gambling-harm');

    const aviso = page.locator('[data-testid="gmb-disclaimer"]');
    marca('el aviso de «esto no diagnostica» existe', await aviso.count() > 0);

    // Va ANTES del cuestionario, no debajo: quien lee el test y se va tiene que
    // haberlo cruzado. Se compara la posición en pantalla, no el orden del DOM.
    if (await aviso.count() > 0 && await page.locator('[data-testid="gmb-screen"]').count() > 0) {
      const a = await aviso.boundingBox();
      const c = await page.locator('[data-testid="gmb-screen"]').boundingBox();
      marca('el aviso va POR ENCIMA del cuestionario', a && c && a.y < c.y,
            a && c ? `aviso y=${Math.round(a.y)}, test y=${Math.round(c.y)}` : 'sin caja');
    } else {
      marca('el aviso va POR ENCIMA del cuestionario', false, 'falta uno de los dos');
    }

    const ids = ['disorder', 'sameline', 'variable', 'nearmiss', 'chasing',
                 'illusion', 'tolerance', 'numbers', 'border', 'guardrails'];
    const presentes = [];
    for (const id of ids) {
      if (await page.locator(`[data-testid="gmb-item-${id}"]`).count() > 0) presentes.push(id);
    }
    marca('los diez apartados se pintan', presentes.length === 10,
          `${presentes.length}/10${presentes.length < 10 ? ' faltan: ' + ids.filter(i => !presentes.includes(i)) : ''}`);

    // Ningún apartado puede salir con la clave cruda en vez del texto.
    const crudas = await page.locator('text=/^gmb[A-Z]/').count();
    marca('ningún texto sale como clave i18n cruda', crudas === 0, `${crudas} encontradas`);

    console.log('\n── La ayuda está antes de contestar nada ─────────────────');
    marca('el bloque de ayuda es visible sin hacer el test',
          await page.locator('[data-testid="gmb-help"]').isVisible());
    const html = await page.content();
    marca('el teléfono de FEJAR aparece', html.includes('900 200 225'));

    console.log('\n── La figura dibuja algo, no un hueco ────────────────────');
    const fig = page.locator('[data-testid="gmb-reinforcement"] svg');
    const rects = await fig.locator('rect').count();
    marca('la figura del refuerzo tiene barras', rects === 24, `${rects} rects (esperadas 24)`);
    const cajaFig = await fig.boundingBox();
    marca('la figura ocupa espacio real', cajaFig && cajaFig.height > 40 && cajaFig.width > 200,
          cajaFig ? `${Math.round(cajaFig.width)}×${Math.round(cajaFig.height)}` : 'sin caja');

    console.log('\n── El cribado ───────────────────────────────────────────');
    marca('sin contestar no hay resultado',
          await page.locator('[data-testid="gmb-result-positive"]').count() === 0
          && await page.locator('[data-testid="gmb-result-negative"]').count() === 0);

    await page.locator('[data-testid="gmb-q0-no"]').click();
    await page.locator('[data-testid="gmb-q1-no"]').click();
    await page.waitForTimeout(200);
    marca('dos «no» dan resultado negativo',
          await page.locator('[data-testid="gmb-result-negative"]').count() === 1
          && await page.locator('[data-testid="gmb-result-positive"]').count() === 0);

    await page.locator('[data-testid="gmb-q0-yes"]').click();
    await page.waitForTimeout(200);
    const pos = page.locator('[data-testid="gmb-result-positive"]');
    marca('un «sí» da resultado positivo', await pos.count() === 1);

    // La parte que de verdad importa: el resultado NUNCA sale solo. Si esta
    // falla, el módulo está dando un veredicto clínico a alguien.
    const textoPos = await pos.textContent().catch(() => '');
    marca('el positivo lleva pegado el «esto no es un diagnóstico»',
          /no es un diagn|not a diagnosis/i.test(textoPos || ''),
          (textoPos || '').slice(0, 60));

    await page.screenshot({ path: path.join(salida, '01-escritorio-claro.png'), fullPage: true });

    console.log('\n── Las tasas de acierto ya no se venden como medidas ─────');
    await abre(page, 'strategies');
    marca('el aviso sobre las tasas de acierto está',
          await page.locator('[data-testid="strat-winrate-note"]').count() === 1);
    const badges = await page.locator('text=/≈ \\d+-\\d+%/').count();
    marca('las tasas llevan «≈»', badges >= 5, `${badges} insignias`);
    const verdes = await page.locator('.text-green-500:has-text("%")').count();
    marca('ninguna tasa se pinta en verde (verde = medido)', verdes === 0, `${verdes} en verde`);
    await page.screenshot({ path: path.join(salida, '02-estrategias.png'), fullPage: true });

    console.log('\n── Móvil y modo oscuro ──────────────────────────────────');
    const movil = await navegador.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      colorScheme: 'dark',
    });
    const pm = await movil.newPage();
    await entra(pm);
    await abre(pm, 'gambling-harm');
    marca('en móvil oscuro el módulo se pinta',
          await pm.locator('[data-testid="gmb-disclaimer"]').count() > 0);
    const desborda = await pm.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    marca('no hay desbordamiento horizontal en móvil', !desborda);
    await pm.screenshot({ path: path.join(salida, '03-movil-oscuro.png'), fullPage: true });
    await movil.close();

    marca('sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));
    console.log(`\n  capturas → ${salida}`);
  } finally {
    await navegador.close();
  }

  console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s): ${fallos.join(', ')}\n`
                            : '\n✅ El módulo de ludopatía se comporta en el navegador.\n');
  process.exit(fallos.length ? 1 : 0);
})();
