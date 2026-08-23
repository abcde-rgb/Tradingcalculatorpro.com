/**
 * ¿Se nota cuando el precio NO es de ahora?
 *
 * `market_data.py` lo pone como requisito en su propia cabecera: *«A price we
 * could not refresh is returned with stale=True and as_of. The caller MUST
 * surface it»*. Y añade por qué: enseñar un precio viejo como si fuera en vivo,
 * en un sitio donde se dimensionan posiciones, es un problema legal y no
 * estético.
 *
 * Hasta el 2026-08-22 esa etiqueta verde «LIVE» del panel de opciones estaba
 * escrita a mano y no dependía de nada: se pintaba igual con un precio de hace
 * un segundo que con uno de ayer. Un test de unidad no lo ve —el backend
 * respondía bien—, así que se comprueba aquí, en el build compilado.
 *
 * El backend se INTERCEPTA en vez de provocarle un fallo real: en el sandbox
 * Yahoo está bloqueado, así que un precio viejo de verdad saldría por el motivo
 * equivocado, y en CI dependería de que el mercado esté abierto.
 *
 * ⚠️ Necesita el stack: `/options/calculator` es premium.
 *
 *   tests/e2e/stack/arriba.sh
 *   node tests/e2e/navegador/precio-viejo.js
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

const AHORA = Math.floor(Date.now() / 1000);
const VIVO = {
  symbol: 'AAPL', name: 'Apple Inc.', price: 187.42, change: 2.42, changePercent: 1.31,
  high52w: 199.62, low52w: 124.17, volume: '51.3M', sector: 'Technology',
  dividendYield: 0, stale: false, source: 'market', as_of: AHORA,
};
// Lo que devuelve la cadena de reserva cuando cae al último valor bueno
// conocido: el precio sigue, pero la ficha rica de Yahoo no, y va marcado.
const VIEJO = {
  ...VIVO, stale: true, source: 'cache', as_of: AHORA - 4 * 3600,
  high52w: null, low52w: null, dividendYield: null,
};

async function abre(nav, cuerpo, salida, nombre) {
  const ctx = await nav.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.route('**/api/stock/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) }));

  if (!(await entra(page))) {
    console.error('✗ No se pudo entrar. ¿Está el stack en pie? tests/e2e/stack/arriba.sh');
    process.exit(1);
  }
  await page.goto(`${BASE}/options/calculator`, { waitUntil: 'networkidle', timeout: 60000 });
  await descartaModales(page).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(salida, `${nombre}.png`) });
  return { page, ctx, errores };
}

(async () => {
  const nav = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const salida = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'precio-viejo');
  fs.mkdirSync(salida, { recursive: true });

  try {
    // ── Con un precio fresco, nada cambia ───────────────────────────────
    console.log('\n── Precio fresco ─────────────────────────────────────────');
    let { page, ctx, errores } = await abre(nav, VIVO, salida, 'vivo');
    marca('se anuncia como en vivo',
          await page.locator('[data-testid="estado-precio-vivo"]').count() === 1);
    marca('y NO aparece el aviso de desfasado',
          await page.locator('[data-testid="estado-precio-desfasado"]').count() === 0);
    marca('el precio no va en ámbar',
          await page.locator('[data-testid="live-price"]').getAttribute('data-stale') === 'false');
    marca('sin errores de consola', errores.length === 0, errores[0]?.slice(0, 90) || '');
    await ctx.close();

    // ── Con un precio que no se pudo refrescar ──────────────────────────
    console.log('\n── Precio del último valor bueno conocido ────────────────');
    ({ page, ctx, errores } = await abre(nav, VIEJO, salida, 'viejo'));

    const vivo = await page.locator('[data-testid="estado-precio-vivo"]').count();
    marca('el «LIVE» verde YA NO se pinta', vivo === 0,
          vivo ? 'sigue diciendo LIVE sobre un precio de hace 4 h' : '');

    const aviso = page.locator('[data-testid="estado-precio-desfasado"]');
    const hayAviso = await aviso.count() === 1;
    marca('sale el aviso de precio sin actualizar', hayAviso);
    if (hayAviso) {
      // La antigüedad se comprueba sobre SU PROPIO elemento y con espera, no
      // sobre una foto del texto del aviso entero. La primera versión hacía
      // `innerText()` de una vez y salía roja de vez en cuando con el producto
      // perfectamente bien: `innerText` no reintenta, así que si la captura cae
      // en mitad de un re-render (el precio se refresca cada 15 s) devuelve el
      // texto a medias. Un ❌ intermitente sin defecto detrás es lo que hace que
      // se deje de mirar el informe.
      const edad = page.locator('[data-testid="estado-precio-edad"]');
      let texto = '';
      try {
        await edad.waitFor({ state: 'attached', timeout: 10000 });
        texto = (await edad.innerText()).replace(/\s+/g, ' ');
      } catch (_) { /* se queda vacío y la marca sale roja con el motivo */ }
      marca('el aviso dice CUÁNTO de viejo es', /\d+\s*(s|min|h|d)\b/.test(texto),
            texto || 'no apareció el elemento de la antigüedad en 10 s');

      const completo = (await aviso.innerText()).replace(/\s+/g, ' ');
      marca('y de dónde salió', /cache|finnhub|twelvedata|market/i.test(completo), completo);
    }

    // Lo que de verdad mira quien va a dimensionar una posición es el número,
    // y el aviso vive en la esquina opuesta de la barra.
    const precio = page.locator('[data-testid="live-price"]');
    marca('el propio precio queda marcado como viejo',
          await precio.getAttribute('data-stale') === 'true');
    const clases = (await precio.getAttribute('class')) || '';
    marca('y se ve distinto, no sólo en el DOM', /amber/.test(clases), clases.slice(0, 70));

    marca('sin errores de consola', errores.length === 0, errores[0]?.slice(0, 90) || '');
    await ctx.close();

    console.log(`\n  capturas en ${salida}`);
  } finally {
    await nav.close();
  }

  console.log('');
  if (fallos.length) {
    console.log(`❌ ${fallos.length} comprobación(es) en rojo:`);
    fallos.forEach((f) => console.log(`   · ${f}`));
    process.exit(1);
  }
  console.log('✅ Un precio viejo se ve como lo que es.');
})();
