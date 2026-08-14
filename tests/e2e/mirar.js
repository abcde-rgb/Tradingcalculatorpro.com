#!/usr/bin/env node
/**
 * `mirar` — abrir una pantalla, tocarla y ver qué sale.
 *
 * `correr.sh` ejecuta el examen entero: doscientas y pico comprobaciones sobre
 * ocho sondas. Es lo correcto antes de mergear y es demasiado caro mientras
 * diseñas, que es cuando más falta hace mirar: escribes un panel, quieres verlo,
 * y montar una sonda nueva para eso cuesta más que el panel.
 *
 * Esto es el hueco. Una orden, una pantalla, una captura, y de paso lo que
 * pocas veces se mira y siempre importa:
 *
 *   · **los errores de JavaScript de la página**, que no salen en el build ni
 *     en el lint y hacen que un panel entero no se pinte,
 *   · **el desbordamiento horizontal**, el defecto de maquetación más habitual,
 *   · **el texto real de los `data-testid` que pidas**, para poder afirmar
 *     sobre cifras sin abrir la imagen.
 *
 * Se apoya en el stack que ya levantó `stack/arriba.sh`; no arranca nada.
 *
 * ```bash
 * node tests/e2e/mirar.js dashboard
 * node tests/e2e/mirar.js dashboard --movil
 * node tests/e2e/mirar.js education --leer edu-assistant,edu-ask-input
 * node tests/e2e/mirar.js dashboard \
 *   --hacer 'fill:desk-capital=10000; click:desk-product-futures; fill:desk-entry=5000' \
 *   --leer desk-size-value,desk-size-binding \
 *   --recorta trading-desk
 * ```
 *
 * `--hacer` es un guion mínimo a propósito: `fill:`, `click:`, `select:`,
 * `esperar:` y `tecla:`, separados por `;`. No pretende ser un lenguaje — en
 * cuanto una comprobación merece repetirse, su sitio es una sonda de
 * `navegador/`, no una cadena en la línea de órdenes.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '..', 'frontend', 'node_modules', 'playwright-core'));
const {
  BASE, abreNavegador, descartaModales, desbordamiento, entra,
} = require('./entorno');

const args = process.argv.slice(2);
const opcion = (nombre, def = null) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const bandera = (nombre) => args.includes(`--${nombre}`);

const ruta = (args.find((a) => !a.startsWith('--')) || 'dashboard').replace(/^\//, '');
const vista = bandera('movil') ? 'movil' : 'escritorio';
const leer = (opcion('leer') || '').split(',').map((s) => s.trim()).filter(Boolean);
const guion = opcion('hacer') || '';
const recorta = opcion('recorta');
const salida = opcion('salida')
  || path.join(process.env.TMPDIR || '/tmp', 'mirar');

/** Un paso del guion: `verbo:objetivo` o `verbo:objetivo=valor`. */
async function ejecuta(page, paso) {
  const [verboRaw, ...resto] = paso.split(':');
  const verbo = verboRaw.trim();
  const cuerpo = resto.join(':').trim();
  const [objetivo, ...val] = cuerpo.split('=');
  const valor = val.join('=');
  const loc = () => page.locator(`[data-testid="${objetivo.trim()}"]`).first();

  switch (verbo) {
    case 'fill':   await loc().fill(valor); return `fill ${objetivo}=${valor}`;
    case 'click':  await loc().click(); return `click ${objetivo}`;
    case 'select': await loc().selectOption(valor); return `select ${objetivo}=${valor}`;
    case 'tecla':  await page.keyboard.press(objetivo.trim()); return `tecla ${objetivo}`;
    case 'esperar': await page.waitForTimeout(Number(objetivo) || 500); return `esperar ${objetivo}ms`;
    default: throw new Error(`verbo desconocido: "${verbo}" (fill, click, select, tecla, esperar)`);
  }
}

(async () => {
  fs.mkdirSync(salida, { recursive: true });
  const { browser, page } = await abreNavegador(chromium, vista);

  // Lo que la consola del navegador sabe y ningún check offline puede ver.
  //
  // Los fallos de RED se cuentan aparte y no tiñen el resultado. En este
  // sandbox, TradingView, Yahoo y los proveedores de precio están bloqueados
  // por política, así que cada carga escupe media docena de
  // ERR_TUNNEL_CONNECTION_FAILED. Mezclarlos con los errores de verdad hace
  // que la herramienta grite «9 errores» en cada ejecución, y a la tercera vez
  // nadie los lee — que es exactamente cómo se cuela el que sí importaba.
  const errores = [];
  const red = [];
  const ES_RED = /ERR_(TUNNEL_CONNECTION_FAILED|CONNECTION_RESET|NAME_NOT_RESOLVED|CONNECTION_REFUSED|BLOCKED_BY|CERT_)|Failed to load resource/;
  page.on('pageerror', (e) => errores.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const txt = m.text().slice(0, 200);
    (ES_RED.test(txt) ? red : errores).push(`console: ${txt}`);
  });

  console.log(`mirar — ${ruta} · ${vista}`);
  const dentro = await entra(page);
  if (!dentro) console.log('  ! el login no entró (¿sembraste con stack/arriba.sh?)');

  await page.goto(`${BASE}/${ruta}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await descartaModales(page);

  for (const paso of guion.split(';').map((s) => s.trim()).filter(Boolean)) {
    try {
      console.log(`  · ${await ejecuta(page, paso)}`);
    } catch (e) {
      console.log(`  ✗ ${paso} — ${String(e.message).split('\n')[0]}`);
    }
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(600);

  // El desbordamiento se mide siempre: es gratis y es el fallo de maquetación
  // que más veces llega a producción sin que nadie lo note en el escritorio.
  const ov = await desbordamiento(page);
  console.log(`  ancho: documento ${ov.doc}px · ventana ${ov.win}px`
    + (ov.doc > ov.win + 1 ? '  ❌ SE DESBORDA' : '  ✅'));

  for (const id of leer) {
    const el = page.locator(`[data-testid="${id}"]`).first();
    const hay = await el.count();
    const txt = hay ? (await el.innerText()).replace(/\s*\n\s*/g, ' | ').trim() : '(no está en la página)';
    console.log(`  ${id}: ${txt}`);
  }

  const destino = path.join(salida, `${ruta.replace(/\//g, '-')}-${vista}.png`);
  const objetivo = recorta ? page.locator(`[data-testid="${recorta}"]`).first() : page;
  await objetivo.screenshot({ path: destino, fullPage: !recorta });
  console.log(`  captura: ${destino}`);

  console.log(errores.length
    ? `  ❌ ${errores.length} error(es) de JavaScript:\n     ${errores.slice(0, 6).join('\n     ')}`
    : '  ✅ sin errores de JavaScript');
  if (red.length) {
    console.log(`  · ${red.length} recurso(s) externo(s) sin cargar — normal aquí: `
      + 'la red de salida del sandbox bloquea TradingView y los proveedores de precio');
  }

  await browser.close();
  process.exit(errores.length ? 1 : 0);
})().catch((e) => {
  console.error('mirar falló:', e.message);
  console.error('¿Está el stack en pie? tests/e2e/stack/arriba.sh');
  process.exit(1);
});
