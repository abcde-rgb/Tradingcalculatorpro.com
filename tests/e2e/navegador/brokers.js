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
    esReferido: true,
    cumpleUe: true,
    advertenciaCorta: 'El 67.24 % de las cuentas de CFD minoristas pierden dinero con este proveedor.',
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
      //
      // ⚠️ Se mide el PÁRRAFO, no su contenedor. La primera versión medía el
      // `div` del aviso, que no lleva clase de tamaño y hereda los 16 px del
      // cuerpo: daba 16 px y pasaba aunque el texto estuviera puesto a 10.
      // Comprobado poniéndolo a `text-[10px]` — la sonda seguía en verde con la
      // advertencia en letra diminuta, que es justo el incumplimiento que esta
      // comprobación existe para cazar.
      const parrafo = aviso.locator('p').first();
      const tAviso = await parrafo.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
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

    // ── Y lo mismo en la PORTADA, que es donde está la sección de socios ──
    //
    // No basta con que /brokers cumpla: la tarjeta de la portada es promoción
    // igual, y es la que ve todo el mundo. Si la advertencia se quedara sólo en
    // la página de detalle, el sitio estaría promocionando CFDs sin ella en su
    // pantalla más vista.
    console.log('\n── La misma tarjeta en la portada ────────────────────────');
    const ctxP = await nav.newContext({ viewport: { width: 1400, height: 1000 } });
    const portada = await ctxP.newPage();
    const erroresP = [];
    portada.on('pageerror', (e) => erroresP.push(String(e)));
    await portada.route('**/api/brokers', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CON_BROKERS) }));
    await portada.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
    await descartaModales(portada).catch(() => {});
    await portada.locator('[data-testid="recommended-tools"]').scrollIntoViewIfNeeded().catch(() => {});
    await portada.waitForTimeout(1200);
    await portada.screenshot({ path: path.join(salida, 'portada.png'), fullPage: false });

    const tarjetaP = portada.locator('[data-testid="partner-card-axi"]');
    marca('el bróker aparece en la sección de socios', await tarjetaP.count() === 1);

    // ── La marquesina ──────────────────────────────────────────────────
    //
    // Tres cosas que sólo se ven en un navegador de verdad, y que son
    // justo lo que se pidió: que se mueva sola, que no se vea la barra de
    // desplazamiento, y que se PARE al pasar por encima. La tercera no es
    // un detalle: una tarjeta en movimiento no se puede pulsar.
    const pista = portada.locator('.marquesina-pista');
    const anim = await pista.first().evaluate((e) => {
      const s = getComputedStyle(e);
      return { nombre: s.animationName, estado: s.animationPlayState, dur: s.animationDuration };
    });
    marca('la fila se mueve sola', anim.nombre === 'marquesina' && anim.dur !== '0s',
          `${anim.nombre} ${anim.dur}`);

    // ⚠️ Medir sólo `offsetHeight - clientHeight` NO vale, y se comprobó:
    // con el `overflow: hidden` y el `scrollbar-width: none` quitados a
    // propósito, este número seguía siendo 0 —Chromium headless no reserva
    // sitio para la barra— y la comprobación pasaba con la barra puesta. Hay
    // que preguntar por el ESTILO, que es lo que decide si se ve.
    const barra = await portada.locator('.marquesina').first().evaluate((e) => ({
      alto: e.offsetHeight - e.clientHeight,
      desborda: e.scrollWidth > e.clientWidth,
      ancho: getComputedStyle(e).scrollbarWidth,
      pseudo: getComputedStyle(e, '::-webkit-scrollbar').display,
      overflow: getComputedStyle(e).overflowX,
    }));
    // Y sin esto la comprobación sería tautológica: una fila que no desborda
    // no tiene barra que ocultar, así que «no se ve» no diría nada.
    marca('la fila desborda de verdad', barra.desborda, `scrollWidth vs clientWidth`);
    marca('sin barra de desplazamiento a la vista',
          barra.alto === 0
          && (barra.overflow === 'hidden' || barra.ancho === 'none' || barra.pseudo === 'none'),
          `alto ${barra.alto}px · scrollbar-width ${barra.ancho} · overflow-x ${barra.overflow}`);

    // ⚠️ Nada de `tarjetaP.hover()`. Playwright espera a que el elemento esté
    // QUIETO antes de actuar sobre él, y sobre una animación infinita eso no
    // llega nunca: la primera versión de esta comprobación se quedó colgada
    // 30 s y reventó la sonda entera. Un ratón de verdad no espera a nada, así
    // que se mueve por coordenadas — y sobre el CONTENEDOR, que no se mueve.
    const cajaM = await portada.locator('.marquesina').first().boundingBox();
    await portada.mouse.move(cajaM.x + cajaM.width / 2, cajaM.y + cajaM.height / 2);
    await portada.waitForTimeout(200);
    const pausada = await pista.first().evaluate((e) => getComputedStyle(e).animationPlayState);
    marca('se para al pasar el ratón por encima', pausada === 'paused', pausada);

    await portada.mouse.move(5, 5);
    await portada.waitForTimeout(200);
    const reanudada = await pista.first().evaluate((e) => getComputedStyle(e).animationPlayState);
    marca('y vuelve a andar al quitarlo', reanudada === 'running', reanudada);

    // El bucle empalma porque hay DOS copias. La segunda no puede duplicar
    // los `data-testid` ni salir en el árbol de accesibilidad.
    const copias = await portada.locator('a[href="https://ejemplo.test/?ref=PRUEBA"]').count();
    marca('hay dos copias para que el bucle empalme', copias === 2, `${copias} copias`);
    marca('pero sólo UNA cuenta como tarjeta', await tarjetaP.count() === 1);
    marca('y la copia está fuera del árbol de accesibilidad',
          await portada.locator('a[href="https://ejemplo.test/?ref=PRUEBA"][aria-hidden="true"]').count() === 1);

    const avisoP = portada.locator('[data-testid="partner-advertencia-axi"]');
    marca('con su advertencia normalizada', await avisoP.count() === 1);
    if (await avisoP.count() && await tarjetaP.count()) {
      const texto = (await avisoP.innerText()).replace(/\s+/g, ' ');
      // Lo que NO puede irse detrás del «leer más» es la CIFRA: un aviso que
      // esconde el porcentaje deja la tarjeta promocionando sin avisar.
      marca('el porcentaje sigue VISIBLE en la tarjeta', /67\.24\s*%/.test(texto), texto.slice(0, 70));
      const tAviso = await avisoP.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      const tDesc = await tarjetaP.locator('p').first()
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      marca('no más pequeña que la descripción', tAviso >= tDesc,
            `aviso ${tAviso}px vs descripción ${tDesc}px`);

      // La descripción existe, que es lo que se pidió: los brókers ya no salen
      // sólo con la letra pequeña de la entidad.
      //
      // ⚠️ Esto se apuntaba antes al primer `<p>` de la tarjeta, y era falso:
      // quitando la descripción, el primer `<p>` pasaba a ser la línea de la
      // entidad —«Solaris EMEA Ltd (HE376148, Chipre) · CySEC · 433/23»—, que
      // también es larga y tampoco lleva el porcentaje. La comprobación seguía
      // en verde con la descripción borrada. Ahora se pide POR SU IDENTIFICADOR
      // y se comprueba que dice lo suyo, no que haya un párrafo cualquiera.
      const desc = portada.locator('[data-testid="partner-desc-axi"]');
      const hayDesc = await desc.count() === 1;
      marca('la tarjeta lleva descripción propia', hayDesc);
      if (hayDesc) {
        const txt = (await desc.innerText()).trim();
        marca('y describe al bróker, no repite la ficha legal',
              txt.length > 40 && !/HE376148|433\/23|67\.24/.test(txt), txt.slice(0, 70));
      }
    }

    // Los dos socios de cripto que ya estaban siguen ahí: esto añade, no pisa.
    marca('los socios que ya había siguen en su sitio',
          await portada.locator('[data-testid="partner-card-margex"]').count() === 1);

    marca('sin errores de consola en la portada', erroresP.length === 0,
          erroresP[0]?.slice(0, 90) || '');
    await ctxP.close();

    // ── Con «reducir movimiento» activado ──────────────────────────────
    //
    // Esta pasada no es un extra de accesibilidad: es donde se prueba el
    // «leer más». Playwright exige que un elemento esté QUIETO antes de
    // pulsarlo, y sobre una animación infinita eso no llega nunca.
    //
    // Y además cubre el fallo que la regla global de accesibilidad provoca
    // sola: deja toda animación en 0,01 ms con una iteración, lo que sobre
    // esta pista la dejaría congelada a −50 %, con la mitad de las tarjetas
    // fuera de la pantalla y sin forma de alcanzarlas.
    console.log('\n── Con «reducir movimiento» del sistema ─────────────────');
    const ctxR = await nav.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    const quieta = await ctxR.newPage();
    const erroresR = [];
    quieta.on('pageerror', (e) => erroresR.push(String(e)));
    await quieta.route('**/api/brokers', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CON_BROKERS) }));
    await quieta.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
    await descartaModales(quieta).catch(() => {});
    await quieta.locator('[data-testid="recommended-tools"]').scrollIntoViewIfNeeded().catch(() => {});
    await quieta.waitForTimeout(800);
    await quieta.screenshot({ path: path.join(salida, 'portada-sin-movimiento.png'), fullPage: false });

    const estadoR = await quieta.locator('.marquesina-pista').first().evaluate((e) => ({
      nombre: getComputedStyle(e).animationName,
      x: e.getBoundingClientRect().x,
      padre: e.parentElement.getBoundingClientRect().x,
    }));
    marca('la animación se QUITA, no se acelera', estadoR.nombre === 'none', estadoR.nombre);
    marca('y la pista no queda desplazada a mitad de recorrido',
          Math.abs(estadoR.x - estadoR.padre) < 2,
          `pista en x=${Math.round(estadoR.x)}, contenedor en x=${Math.round(estadoR.padre)}`);
    marca('la barra de desplazamiento sigue oculta',
          await quieta.locator('.marquesina').first()
            .evaluate((e) => e.offsetHeight - e.clientHeight) === 0);

    const leerMas = quieta.locator('[data-testid="partner-leermas-axi"]');
    marca('hay un «leer más»', await leerMas.count() === 1);
    if (await leerMas.count()) {
      const [nueva] = await Promise.all([
        ctxR.waitForEvent('page', { timeout: 10000 }).catch(() => null),
        leerMas.click(),
      ]);
      marca('que abre en OTRA pestaña', !!nueva,
            nueva ? await nueva.url() : 'no se abrió ninguna pestaña');
      if (nueva) {
        marca('y lleva a la advertencia completa, no al bróker',
              /\/brokers/.test(nueva.url()) && !/ejemplo\.test/.test(nueva.url()),
              await nueva.url());
        await nueva.close();
      }
      marca('la tarjeta NO se abrió al pulsar «leer más»',
            quieta.url().endsWith('/') || /Tradingcalculatorpro\.com\/?$/.test(quieta.url()),
            quieta.url());
    }
    marca('sin errores de consola', erroresR.length === 0, erroresR[0]?.slice(0, 90) || '');
    await ctxR.close();

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
