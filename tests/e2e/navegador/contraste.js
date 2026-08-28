/**
 * Contraste real del texto sobre el fondo que le toca, en los dos temas.
 *
 * Por qué hace falta
 * ------------------
 * El tema claro no se había visto NUNCA. `capturas.js` sembraba el tema en una
 * clave de `localStorage` que la aplicación no lee (`theme` en vez del sobre de
 * zustand `trading-theme-storage`), así que las dieciocho capturas «light» eran
 * el tema oscuro y el log las daba por buenas. Arreglado eso, aparece lo que
 * llevaba meses sin mirar nadie: texto gris clarito sobre papel hueso.
 *
 * Mirar una captura no basta para esto. El ojo perdona un gris flojo en una
 * pantalla grande y con buena luz; la persona que abre la web en un móvil al
 * sol, no. Y «se ve bien» no es un criterio que se pueda romper en CI.
 *
 * Qué mide, y contra qué
 * ----------------------
 * Recorre el texto VISIBLE, resuelve el color de fondo real subiendo por los
 * ancestros hasta encontrar uno opaco, y calcula el contraste de la WCAG 2.1.
 * El umbral depende del tamaño, como en la norma: 3.0 para texto grande
 * (≥24px, o ≥18.66px en negrita) y 4.5 para el resto.
 *
 * Lo que NO hace, a propósito:
 * - No juzga texto deshabilitado por su color a secas: un control apagado
 *   *debe* verse apagado y la norma lo exime (1.4.3, «texto inactivo»). Se
 *   informa aparte, sin contar como fallo.
 * - No mira iconos ni bordes. Es 1.4.3 (texto), no 1.4.11 (no-textual).
 * - No inventa un fondo cuando no puede resolverlo: lo cuenta como
 *   «indeterminado» y lo dice. Suponer blanco daría fallos fantasma en el tema
 *   oscuro y aprobados falsos en el claro.
 *
 * Necesita el build servido — lo levanta él mismo, como `capturas.js`.
 *
 *   node tests/e2e/navegador/contraste.js
 *   node tests/e2e/navegador/contraste.js --tema=light --solo=/pricing
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('../lib/playwright-core');
const { rutaChromium } = require('../entorno');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const BUILD = path.join(RAIZ, 'frontend', 'build');
// Base bajo la que se sirve la app. Desde el cutover a `tradingcalculator.pro`
// (2026-08-28) el build cuelga de la RAÍZ (`PUBLIC_URL: /`), así que por defecto
// va vacía; `E2E_BASE_PATH` la fuerza para probar un build antiguo.
//
// Estuvo escrita a mano en seis ficheros, y por eso el cutover la dejó desfasada
// en los seis a la vez: las sondas pedían `/Tradingcalculatorpro.com/...` a un
// build que ya servía desde `/`, y contestaba 404. Mismo fallo que el CORS —
// una constante copiada que no siguió al dominio.
const BASE = process.env.E2E_BASE_PATH ?? '';
const PUERTO = 4174;

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1];
const TEMAS = arg('tema') ? [arg('tema')] : ['light', 'dark'];
const RUTAS = arg('solo') ? [[arg('solo'), 'elegida']] : [
  ['/', 'portada'],
  ['/pricing', 'precios'],
  ['/about', 'sobre'],
  ['/legal', 'legal'],
  ['/contact', 'contacto'],
];

const MIME = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
};

/** Lo que corre DENTRO del navegador. Devuelve un hallazgo por texto flojo. */
function sondaEnPagina() {
  const canal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = ([r, g, b]) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  const contraste = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const rgb = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((n) => parseFloat(n));
    return { c: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  // Mezcla el color de delante sobre el de detrás según su alfa. Sin esto, un
  // `text-muted-foreground/70` se juzgaría por su color pleno y saldría mejor
  // de lo que se ve.
  const sobre = (frente, fondo) => frente.c.map((v, i) => v * frente.a + fondo[i] * (1 - frente.a));

  /** El primer fondo OPACO subiendo por los ancestros, o null si no lo hay. */
  const fondoDe = (el) => {
    let n = el; const capas = [];
    while (n && n !== document.documentElement.parentNode) {
      const bg = rgb(getComputedStyle(n).backgroundColor);
      if (bg && bg.a > 0) {
        if (bg.a >= 0.999) {
          let color = bg.c;
          for (let i = capas.length - 1; i >= 0; i -= 1) color = sobre(capas[i], color);
          return color;
        }
        capas.push(bg);
      }
      n = n.parentElement;
    }
    return null;
  };

  const esInactivo = (el) => {
    if (el.closest('[disabled],[aria-disabled="true"],[data-disabled]')) return true;
    const cs = getComputedStyle(el);
    return cs.cursor === 'not-allowed' || parseFloat(cs.opacity) < 0.55;
  };

  const hallazgos = []; const inactivos = []; let indeterminados = 0; let mirados = 0;
  const vistos = new Set();

  for (const el of document.querySelectorAll('body *')) {
    // Sólo elementos con texto PROPIO: si se cuenta el del padre, el mismo
    // texto se juzga una vez por cada ancestro y el informe se llena de ecos.
    const propio = [...el.childNodes]
      .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (!propio) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;

    // Texto pintado POR el fondo (`bg-clip-text` + `text-transparent`): su
    // `color` computado es transparente y los píxeles los pone el degradado.
    // Medirlo por el color da 1.0 y un fallo que no existe — el «PRO» del
    // titular salía como el peor contraste de la portada estando perfectamente
    // legible. No se puede evaluar desde el CSS, así que se cuenta como
    // indeterminado y se dice, en vez de inventar un veredicto.
    const recortado = (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text');
    if (recortado) { indeterminados += 1; continue; }

    const fondo = fondoDe(el);
    if (!fondo) { indeterminados += 1; continue; }
    const fg = rgb(cs.color);
    if (!fg) { indeterminados += 1; continue; }
    mirados += 1;

    const px = parseFloat(cs.fontSize);
    const negrita = parseInt(cs.fontWeight, 10) >= 700;
    const grande = px >= 24 || (negrita && px >= 18.66);
    const minimo = grande ? 3.0 : 4.5;
    const ratio = contraste(sobre(fg, fondo), fondo);
    if (ratio >= minimo) continue;

    const clave = `${propio.slice(0, 40)}|${Math.round(ratio * 10)}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const dato = {
      texto: propio.slice(0, 56), ratio: Math.round(ratio * 100) / 100, minimo,
      px: Math.round(px), color: cs.color,
      fondo: `rgb(${fondo.map((v) => Math.round(v)).join(', ')})`,
      donde: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''),
    };
    (esInactivo(el) ? inactivos : hallazgos).push(dato);
  }
  return { hallazgos, inactivos, indeterminados, mirados };
}

(async () => {
  if (!fs.existsSync(path.join(BUILD, 'index.html'))) {
    console.error('❌ no hay build. `cd frontend && npm run build` primero.');
    process.exit(1);
  }
  const servidor = http.createServer((q, s) => {
    let u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith(BASE)) u = u.slice(BASE.length) || '/';
    // ⚠️ La ruta se RESUELVE y se comprueba que sigue dentro de `BUILD`.
    // `path.join(BUILD, u)` con `u` sacado de la URL deja salir del directorio
    // con `..%2f..%2fetc/passwd`, y CodeQL lo marca como alta con razón: da
    // igual que este servidor sólo viva durante un test y escuche en local —
    // el patrón es el mismo que en producción, y aquí se copia y se pega.
    const indice = path.join(BUILD, 'index.html');
    const pedido = path.resolve(BUILD, `.${path.posix.normalize(`/${u}`)}`);
    let f = pedido.startsWith(BUILD + path.sep) || pedido === BUILD ? pedido : indice;
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = indice;
    s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(s);
  });
  await new Promise((r) => servidor.listen(PUERTO, r));

  const nav = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  let fallos = 0; let inactivosTotal = 0;

  try {
    for (const tema of TEMAS) {
      const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
      // Misma clave que lee `lib/theme.js`. Ver el aviso en `capturas.js`.
      await ctx.addInitScript((t) => {
        localStorage.setItem('trading-theme-storage',
          JSON.stringify({ state: { theme: t }, version: 0 }));
        localStorage.setItem('tcp-cookie-consent', 'all');
      }, tema);

      console.log(`\n  ── tema ${tema} ${'─'.repeat(52)}`);
      for (const [ruta, nombre] of RUTAS) {
        const p = await ctx.newPage();
        await p.route('**', (r) => (r.request().url().startsWith(`http://localhost:${PUERTO}`)
          || r.request().url().startsWith('data:') ? r.continue() : r.abort()));
        await p.goto(`http://localhost:${PUERTO}${BASE}${ruta}`,
          { waitUntil: 'domcontentloaded', timeout: 30000 });
        await p.waitForTimeout(1200);

        const modoOk = await p.evaluate((t) => document.documentElement.classList
          .contains(t === 'light' ? 'light' : 'dark'), tema);
        if (!modoOk) {
          console.log(`  ❌ ${nombre}: el tema ${tema} no se aplicó — medición inválida`);
          fallos += 1; await p.close(); continue;
        }

        const r = await p.evaluate(sondaEnPagina);
        inactivosTotal += r.inactivos.length;
        if (!r.hallazgos.length) {
          console.log(`  ✅ ${nombre.padEnd(9)} ${String(r.mirados).padStart(4)} textos`
            + `${r.inactivos.length ? ` · ${r.inactivos.length} inactivo(s), no cuentan` : ''}`);
        } else {
          fallos += r.hallazgos.length;
          console.log(`  ❌ ${nombre.padEnd(9)} ${String(r.mirados).padStart(4)} textos · `
            + `${r.hallazgos.length} por debajo del mínimo:`);
          for (const h of r.hallazgos.sort((a, b) => a.ratio - b.ratio).slice(0, 8)) {
            console.log(`       ${String(h.ratio).padStart(5)} < ${h.minimo}  «${h.texto}»`);
            console.log(`             ${h.px}px  ${h.color} sobre ${h.fondo}  · ${h.donde}`);
          }
          if (r.hallazgos.length > 8) console.log(`       … y ${r.hallazgos.length - 8} más`);
        }
        await p.close();
      }
      await ctx.close();
    }
  } finally {
    await nav.close(); servidor.close();
  }

  console.log('');
  if (fallos) {
    console.error(`❌ ${fallos} texto(s) por debajo del contraste mínimo de la WCAG 2.1 (1.4.3).`);
    if (inactivosTotal) console.error(`   (${inactivosTotal} más son controles inactivos: exentos, no contados.)`);
    process.exit(1);
  }
  console.log('✅ todo el texto visible cumple el contraste mínimo en los dos temas.');
  if (inactivosTotal) console.log(`   (${inactivosTotal} controles inactivos, exentos por 1.4.3.)`);
})();
