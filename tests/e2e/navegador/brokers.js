/**
 * La página de brókers, en un navegador real y sobre el BUILD compilado.
 *
 * Lo que se comprueba aquí no lo ve un test de unidad, porque es de pantalla y
 * es justo lo que la ley mira:
 *
 *   · la advertencia normalizada de ESMA aparece **en la misma tarjeta que el
 *     enlace** y no en una nota al pie — «tan prominente como la promoción»;
 *   · la relación de afiliación se declara ANTES de cualquier enlace;
 *   · los enlaces salientes llevan `rel="sponsored"` y no dejan `window.opener`;
 *   · y con la lista vacía la página lo DICE, en vez de quedarse muda.
 *
 * El backend se intercepta: el estado que hay que probar es el de «hay brókers
 * publicados», y hoy no hay ninguno configurado. Probarlo con el estado real
 * sería probar sólo el caso vacío.
 *
 * ⚠️ Necesita el stack en pie sólo para servir el build; /brokers es pública.
 *
 *   tests/e2e/stack/arriba.sh     (o node tests/e2e/stack/servidor.js)
 *   node tests/e2e/navegador/brokers.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, descartaModales, BASE } = require('../entorno');

const fallos = [];
const marca = (n, ok, d = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos.push(n);
};

const CON_BROKERS = {
  afiliacion: true,
  brokers: [{
    id: 'axi',
    nombre: 'Axi',
    entidad: 'Solaris EMEA Ltd (HE376148, Chipre)',
    regulador: 'CySEC',
    licencia: '433/23',
    url: 'https://ejemplo.test/?ref=PRUEBA',
    advertencia: 'Los CFD son instrumentos complejos y conllevan un alto riesgo de perder '
      + 'dinero rápidamente debido al apalancamiento. El 67.24 % de las cuentas de '
      + 'inversores minoristas pierden dinero al operar CFD con este proveedor. Debe '
      + 'considerar si comprende cómo funcionan los CFD y si puede permitirse asumir un '
      + 'riesgo elevado de perder su dinero.',
  }],
};
const VACIO = { afiliacion: true, brokers: [] };

async function abre(nav, cuerpo, salida, nombre) {
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 1000 } });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.route('**/api/brokers', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) }));
  await page.goto(`${BASE}/brokers`, { waitUntil: 'networkidle', timeout: 60000 });
  await descartaModales(page).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(salida, `${nombre}.png`), fullPage: true });
  return { page, ctx, errores };
}

(async () => {
  const nav = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const salida = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'brokers');
  fs.mkdirSync(salida, { recursive: true });

  try {
    console.log('\n── Con brókers publicados ────────────────────────────────');
    let { page, ctx, errores } = await abre(nav, CON_BROKERS, salida, 'con-brokers');

    const tarjeta = page.locator('[data-testid="broker-axi"]');
    marca('la tarjeta del bróker se pinta', await tarjeta.count() === 1);

    const enlace = page.locator('[data-testid="broker-enlace-axi"]');
    marca('hay enlace al bróker', await enlace.count() === 1);
    if (await enlace.count()) {
      const rel = (await enlace.getAttribute('rel')) || '';
      marca('el enlace va como `sponsored`', /sponsored/.test(rel), rel);
      marca('y no le deja el window.opener a un tercero',
            /noopener/.test(rel) && /noreferrer/.test(rel), rel);
    }

    // Lo que de verdad exige ESMA: que la advertencia esté al lado, no al pie.
    const aviso = page.locator('[data-testid="broker-advertencia-axi"]');
    const hayAviso = await aviso.count() === 1;
    marca('la advertencia normalizada está en la MISMA tarjeta',
          hayAviso && await tarjeta.locator('[data-testid="broker-advertencia-axi"]').count() === 1);
    if (hayAviso) {
      const texto = (await aviso.innerText()).replace(/\s+/g, ' ');
      marca('lleva el porcentaje real del bróker', /67\.24\s*%/.test(texto), texto.slice(0, 70));
      marca('y dice de qué producto habla', /CFD/.test(texto));

      // «Tan prominente como la promoción»: si el aviso se pinta más pequeño
      // que el botón, se está cumpliendo con la letra y no con la norma.
      const tAviso = await aviso.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      const tBoton = await enlace.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      marca('no está empequeñecida frente al botón', tAviso >= tBoton,
            `aviso ${tAviso}px vs botón ${tBoton}px`);

      // Y por encima del enlace en el flujo de lectura, o al menos visible sin
      // buscarla: ambos tienen que caber en la misma pantalla.
      const cAviso = await aviso.boundingBox();
      const cEnlace = await enlace.boundingBox();
      marca('se ve a la vez que el enlace, sin desplazarse',
            cAviso && cEnlace && Math.abs(cAviso.y - cEnlace.y) < 400,
            cAviso && cEnlace ? `Δy=${Math.round(Math.abs(cAviso.y - cEnlace.y))}px` : 'sin caja');
    }

    const afil = page.locator('[data-testid="brokers-afiliacion"]');
    marca('la relación de afiliación se declara', await afil.count() === 1);
    if (await afil.count() && await enlace.count()) {
      const yAfil = (await afil.boundingBox())?.y ?? 1e9;
      const yEnlace = (await enlace.boundingBox())?.y ?? 0;
      marca('y ANTES del primer enlace', yAfil < yEnlace, `${Math.round(yAfil)} < ${Math.round(yEnlace)}`);
    }

    marca('sin errores de consola', errores.length === 0, errores[0]?.slice(0, 90) || '');
    await ctx.close();

    console.log('\n── Sin brókers publicados (el estado de hoy) ─────────────');
    ({ page, ctx, errores } = await abre(nav, VACIO, salida, 'vacio'));
    marca('lo dice en vez de quedarse muda',
          await page.locator('[data-testid="brokers-vacio"]').count() === 1);
    marca('y NO pinta ninguna tarjeta de bróker',
          await page.locator('[data-testid^="broker-"]').count() === 0);
    marca('la declaración de afiliación sigue estando',
          await page.locator('[data-testid="brokers-afiliacion"]').count() === 1);
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
  console.log('✅ La página de brókers dice lo que la ley obliga a decir.');
})();
