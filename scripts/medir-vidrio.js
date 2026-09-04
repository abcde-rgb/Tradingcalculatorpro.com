#!/usr/bin/env node
/**
 * Mide el contraste REAL de la galería de glassmorfismo.
 *
 * Por qué existe
 * --------------
 * Con un `backdrop-filter` de por medio, **el color declarado del panel no es
 * el que se ve**. `rgba(255,255,255,.05)` sobre una malla verde da un gris
 * verdoso distinto en cada punto de la pantalla, y calcular el contraste desde
 * el CSS es inventárselo. Este script no calcula: **fotografía y muestrea**.
 *
 * Para cada variante:
 *   1. Abre la maqueta y cambia a esa variante.
 *   2. Localiza los elementos marcados con `data-medir` y lee su color de
 *      texto ya resuelto por el navegador.
 *   3. **Apaga el texto** (`color:transparent`), fotografía su caja exacta y
 *      decodifica el PNG a píxeles. Apagarlo no cambia la maquetación ni el
 *      `backdrop-filter`, así que lo que queda en esa caja es exactamente el
 *      fondo que hay DEBAJO de esas letras.
 *   4. Promedia el recorte y calcula el contraste WCAG 2.1 contra el color
 *      del texto.
 *
 * La primera versión muestreaba «al lado» de la letra y recogía píxeles de
 * glifo: el párrafo del hero salía a 3,8:1 cuando de verdad da 6,2:1. Un
 * medidor que mide mal es peor que no medir, porque su número se cita.
 *
 * El PNG se decodifica a mano con `zlib` (deflate + desfiltrado) para no
 * depender de ninguna librería: este repo no instala nada para medir.
 *
 * Uso:  node scripts/medir-vidrio.js [--json]
 * Sale 1 si algún texto de los medidos baja de 4,5:1 en la variante marcada
 * como implementable (`flota`), que es la única que se propone adoptar.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RAIZ = path.join(__dirname, '..');
const MAQUETA = 'file://' + path.join(RAIZ, 'docs', 'maquetas', 'main-glassmorfismo.html');
const VARIANTES = ['minimo', 'malla', 'ahumado', 'canto', 'claro', 'flota'];

/* La variante que se propone adoptar. Es la única cuyo contraste bloquea:
   las otras cinco se enseñan para comparar, no para desplegarlas. */
const IMPLEMENTABLE = 'flota';
const MINIMO_AA = 4.5;
/* Texto grande (≥24 px o ≥18,66 px en negrita) pasa con 3:1 en WCAG 2.1. */
const MINIMO_AA_GRANDE = 3.0;

function cargarPlaywright() {
  for (const c of ['playwright', 'playwright-core', '/opt/node22/lib/node_modules/playwright']) {
    try { return require(c); } catch { /* siguiente */ }
  }
  throw new Error('no se encontró playwright');
}

function rutaChromium() {
  if (process.env.QA_CHROMIUM) return process.env.QA_CHROMIUM;
  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const cands = fs.existsSync(raiz)
    ? fs.readdirSync(raiz).filter((d) => d.startsWith('chromium-'))
      .map((d) => path.join(raiz, d, 'chrome-linux', 'chrome')).filter((p) => fs.existsSync(p))
    : [];
  if (!cands.length) throw new Error(`No encuentro Chromium bajo ${raiz}`);
  return cands.sort().reverse()[0];
}

/* ── PNG → píxeles, sin dependencias ────────────────────────────────────── */

function leerPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('no es un PNG');
  let pos = 8;
  let ancho = 0; let alto = 0; let profundidad = 0; let tipo = 0;
  const trozos = [];
  while (pos < buf.length) {
    const largo = buf.readUInt32BE(pos);
    const nombre = buf.toString('ascii', pos + 4, pos + 8);
    const datos = buf.subarray(pos + 8, pos + 8 + largo);
    if (nombre === 'IHDR') {
      ancho = datos.readUInt32BE(0); alto = datos.readUInt32BE(4);
      profundidad = datos[8]; tipo = datos[9];
    } else if (nombre === 'IDAT') {
      trozos.push(datos);
    } else if (nombre === 'IEND') break;
    pos += 12 + largo;
  }
  if (profundidad !== 8) throw new Error(`profundidad ${profundidad} no soportada`);
  const canales = { 0: 1, 2: 3, 4: 2, 6: 4 }[tipo];
  if (!canales) throw new Error(`tipo de color ${tipo} no soportado`);

  const crudo = zlib.inflateSync(Buffer.concat(trozos));
  const paso = ancho * canales;
  const salida = Buffer.alloc(alto * paso);

  // Desfiltrado PNG (filtros 0..4, por línea).
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[y * (paso + 1)];
    const linea = crudo.subarray(y * (paso + 1) + 1, y * (paso + 1) + 1 + paso);
    const destino = salida.subarray(y * paso, (y + 1) * paso);
    const arriba = y > 0 ? salida.subarray((y - 1) * paso, y * paso) : null;
    for (let x = 0; x < paso; x++) {
      const a = x >= canales ? destino[x - canales] : 0;
      const b = arriba ? arriba[x] : 0;
      const c = (arriba && x >= canales) ? arriba[x - canales] : 0;
      let v = linea[x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += Math.floor((a + b) / 2);
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      destino[x] = v & 0xff;
    }
  }
  return { ancho, alto, canales, pix: salida };
}

/** Color medio de la imagen entera (el recorte ya viene acotado). */
function colorMedio(img) {
  let r = 0; let g = 0; let b = 0; let n = 0;
  for (let y = 0; y < img.alto; y++) {
    for (let x = 0; x < img.ancho; x++) {
      const i = y * img.ancho * img.canales + x * img.canales;
      r += img.pix[i]; g += img.pix[i + 1]; b += img.pix[i + 2]; n++;
    }
  }
  return [r / n, g / n, b / n];
}

/* ── WCAG 2.1 ───────────────────────────────────────────────────────────── */

const canal = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const luminancia = ([r, g, b]) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
function contraste(a, b) {
  const la = luminancia(a); const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function rgbDeCss(css) {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0];
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2]];
}

/* ── Medición ───────────────────────────────────────────────────────────── */

async function main() {
  const { chromium } = cargarPlaywright();
  const navegador = await chromium.launch({
    executablePath: rutaChromium(), args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 1000 } });

  const resultados = {};
  let fallos = 0;

  for (const v of VARIANTES) {
    await pagina.goto(`${MAQUETA}#/${v}`);
    await pagina.evaluate((id) => {
      const b = document.querySelector(`#tabs button[data-v="${id}"]`);
      if (b) b.click();
    }, v);
    await pagina.waitForTimeout(400);

    const nombres = await pagina.$$eval('[data-medir]', (els) => els.map((el) => el.dataset.medir));

    resultados[v] = [];
    for (const nombre of nombres) {
      /* Se mide el fondo BAJO el texto, y para eso el texto se apaga.
       *
       * Muestrear «al lado» de la letra estaba mal: un párrafo ancho tiene
       * glifos hasta el borde derecho, así que el parche recogía píxeles de
       * letra y el fondo salía más claro de lo que es — el `desc` daba 3,8:1
       * cuando el panel real da mucho más. Poniendo `color:transparent` el
       * elemento sigue ocupando lo mismo, sigue componiéndose sobre el mismo
       * `backdrop-filter`, y lo que queda en su caja es EXACTAMENTE el fondo
       * que hay detrás de esas letras.
       *
       * También se desplaza el elemento al centro de la ventana: dos de los
       * puntos caen por debajo del pliegue y el recorte se salía de la imagen.
       */
      const p = await pagina.evaluate((n) => {
        const el = document.querySelector(`[data-medir="${n}"]`);
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        const cs = getComputedStyle(el);
        const datos = {
          color: cs.color, tamano: parseFloat(cs.fontSize), peso: cs.fontWeight,
        };
        el.dataset.colorPrevio = el.style.color;
        el.style.color = 'transparent';
        const r = el.getBoundingClientRect();
        return { ...datos, x: r.x, y: r.y, w: r.width, h: r.height };
      }, nombre);

      const clip = {
        x: Math.max(0, Math.round(p.x)), y: Math.max(0, Math.round(p.y)),
        width: Math.max(2, Math.round(p.w)), height: Math.max(2, Math.round(p.h)),
      };
      let fondo = null;
      try {
        fondo = colorMedio(leerPng(await pagina.screenshot({ clip })));
      } catch (e) {
        console.error(`  ! no se pudo muestrear ${v}/${nombre}: ${e.message}`);
      }

      await pagina.evaluate((n) => {
        const el = document.querySelector(`[data-medir="${n}"]`);
        el.style.color = el.dataset.colorPrevio || '';
      }, nombre);

      if (!fondo) continue;
      const texto = rgbDeCss(p.color);
      const ratio = contraste(texto, fondo);
      const grande = p.tamano >= 24 || (p.tamano >= 18.66 && Number(p.peso) >= 700);
      const minimo = grande ? MINIMO_AA_GRANDE : MINIMO_AA;
      resultados[v].push({
        punto: nombre, ratio: Math.round(ratio * 100) / 100,
        minimo, pasa: ratio >= minimo,
        fondo: fondo.map((c) => Math.round(c)),
      });
      if (v === IMPLEMENTABLE && ratio < minimo) fallos++;
    }
  }

  await navegador.close();

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(resultados, null, 2));
  } else {
    for (const v of VARIANTES) {
      const filas = resultados[v] || [];
      const peor = filas.reduce((a, b) => (b.ratio < a.ratio ? b : a), filas[0] || { ratio: 0 });
      const malos = filas.filter((f) => !f.pasa);
      console.log(`\n${v}${v === IMPLEMENTABLE ? '  (la que se propone)' : ''}`);
      for (const f of filas) {
        console.log(`  ${f.pasa ? '✓' : '✗'} ${f.punto.padEnd(8)} ${String(f.ratio).padStart(6)}:1`
          + `  (mínimo ${f.minimo})  fondo rgb(${f.fondo.join(',')})`);
      }
      console.log(`  → peor ${peor.ratio}:1 · ${malos.length} por debajo del mínimo`);
    }
  }

  if (fallos) {
    console.error(`\n✗ ${fallos} texto(s) por debajo del mínimo en «${IMPLEMENTABLE}», `
      + 'que es la variante que se propone adoptar.');
    return 1;
  }
  console.log(`\n✓ «${IMPLEMENTABLE}» pasa el contraste en todos los puntos medidos.`);
  return 0;
}

main().then((c) => process.exit(c)).catch((e) => { console.error(e); process.exit(2); });
