/**
 * Accesibilidad: lo que impide usar la aplicación a quien no ve bien, no puede
 * usar ratón o navega con lector de pantalla.
 *
 * No es un extra de cortesía. La Ley Europea de Accesibilidad (EAA) aplica desde
 * junio de 2025 a los servicios de consumo en la UE, y esto es un producto de
 * pago para consumidores europeos. Además, casi todo lo que arregla —contraste,
 * foco visible, etiquetas— mejora la usabilidad de todo el mundo.
 *
 * Se ejecuta axe-core inyectado en la página, sin dependencias externas: la
 * política de red del sandbox bloquea las CDN, así que la biblioteca se lee del
 * `node_modules` local. Si no está, la sonda lo dice en vez de fingir que pasa.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('../lib/playwright-core');
const { BASE, CUENTA, rutaChromium } = require('../entorno');

const MODO = process.argv[2] === 'movil' ? 'movil' : 'escritorio';
const VISTA = MODO === 'movil' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const SALIDA = path.join(__dirname, '..', '..', '..', '.qa-capturas', 'accesibilidad');
fs.mkdirSync(SALIDA, { recursive: true });

/** Sólo lo que impide usar la aplicación. Los avisos «menores» de axe generan
 *  tanto ruido que esconden lo que de verdad bloquea a alguien. */
const GRAVES = new Set(['critical', 'serious']);

// Claro y oscuro. Los cuatro temas con nombre heredan los colores de señal
// de `:root` (= oscuro), así que medirlos sería medir el oscuro otra vez.
const TEMAS = ['dark', 'light'];

// Cuatro páginas medían poco: los colores de señal viven sobre todo en el
// panel, la academia y el escáner, que no se miraban. Con el tema claro
// añadido son 8 × 2 = 16 mediciones por vista, que es lo que cuesta que un
// incumplimiento no dependa de qué pantalla le tocó a la sonda.
const PAGINAS = [
  ['landing', '/'],
  ['precios', '/pricing'],
  ['opciones', '/options'],
  ['diario', '/performance'],
  ['panel', '/dashboard'],
  ['academia', '/education'],
  ['brokers', '/brokers'],
  ['ajustes', '/settings'],
];

function rutaAxe() {
  const candidatos = [
    path.join(__dirname, '..', 'node_modules', 'axe-core', 'axe.min.js'),
    path.join(__dirname, '..', '..', '..', 'frontend', 'node_modules', 'axe-core', 'axe.min.js'),
  ];
  return candidatos.find((p) => fs.existsSync(p)) || null;
}

(async () => {
  const axe = rutaAxe();
  if (!axe) {
    console.error('  ✗ falta axe-core. Instálalo con:\n'
      + '      cd tests/e2e && npm install --no-save axe-core\n'
      + '    (sin él esta sonda no puede comprobar nada, y decirlo es mejor que'
      + ' pasar en verde)');
    process.exit(2);
  }
  const fuenteAxe = fs.readFileSync(axe, 'utf-8');

  const browser = await chromium.launch({
    executablePath: rutaChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: VISTA, deviceScaleFactor: 2, locale: 'es-ES',
    isMobile: MODO === 'movil', hasTouch: MODO === 'movil',
  });
  const page = await ctx.newPage();

  console.log(`\n=== ACCESIBILIDAD · ${MODO} ${VISTA.width}x${VISTA.height} ===\n`);

  // Entrar una vez: el diario está tras el muro de pago y es donde vive el
  // formulario más complejo, que es justo lo que más falla en accesibilidad.
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  for (const l of ['Aceptar todo', 'Aceptar']) {
    const b = page.getByRole('button', { name: l, exact: false }).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"]').first().fill(CUENTA.email);
  await page.locator('input[type="password"]').first().fill(CUENTA.password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(3500);

  const porRegla = new Map();
  let totalGraves = 0;
  let totalExentos = 0;

  // ── Los DOS temas, y no es un extra ─────────────────────────────────────
  // Esta sonda recorrió meses un solo tema —el oscuro, que es el de arranque—
  // y por eso daba 1 incumplimiento en /performance. Con el tema claro eran
  // 77: los colores de señal estaban escritos en hexadecimal, elegidos mirando
  // el fondo oscuro, y sobre papel las CIFRAS DE P&L caían a 2,09:1. Un tema
  // que no se mide es un tema que no existe para la sonda.
  for (const tema of TEMAS) {
  for (const [nombre, ruta] of PAGINAS) {
    // El tema se fija ANTES de navegar: aplicarlo después deja a axe midiendo
    // los colores de la pintada anterior.
    await page.evaluate((t) => localStorage.setItem('trading-theme-storage',
      JSON.stringify({ state: { theme: t }, version: 0 })), tema);
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const temaReal = await page.evaluate(() => document.documentElement.className);
    if (!new RegExp(`\\b${tema}\\b`).test(temaReal)) {
      console.log(`  ⚠️  ${nombre}: se pidió «${tema}» y quedó «${temaReal}» — `
        + 'la medición de este tema NO vale');
      totalGraves += 1;
    }
    await page.addScriptTag({ content: fuenteAxe });
    const r = await page.evaluate(async () => {
      // ── Decoración inerte ────────────────────────────────────────────────
      // `EmptyState` enseña una muestra DIFUMINADA de lo que aparecerá en la
      // tarjeta cuando el usuario meta datos: `opacity-35`, `blur`,
      // `pointer-events-none`, `select-none` y `aria-hidden="true"`. Un lector
      // de pantalla no la anuncia y el ratón no la alcanza — es una ilustración,
      // no contenido.
      //
      // Pero la regla `color-contrast` de axe empareja por lo que se VE en
      // pantalla, no por el árbol de accesibilidad, así que medía el 35 % de
      // opacidad y devolvía 2,01:1 sobre cinco nodos: cinco «serious» que no
      // impiden usar nada. La WCAG 2.1 §1.4.3 exime la decoración pura, y un
      // informe con falsos graves acaba leyéndose por encima, que es lo peor
      // que le puede pasar a esta sonda.
      //
      // La exención es deliberadamente ESTRECHA —hacen falta `aria-hidden` y
      // `pointer-events: none` a la vez, en el nodo o en un ancestro— y sólo se
      // aplica a `color-contrast`: para el resto de reglas un `aria-hidden` mal
      // puesto es justamente lo que hay que ver. Y no se descarta en silencio:
      // se cuenta y se imprime aparte.
      const inerte = (el) => {
        for (let n = el; n; n = n.parentElement) {
          if (n.nodeType === 1 && n.getAttribute('aria-hidden') === 'true'
              && getComputedStyle(n).pointerEvents === 'none') return true;
        }
        return false;
      };
      const res = await window.axe.run(document, {
        resultTypes: ['violations'],
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      });
      return res.violations.map((v) => {
        const exentos = v.id !== 'color-contrast' ? [] : v.nodes.filter((n) => {
          let el = null;
          try { el = document.querySelector(n.target[0]); } catch { el = null; }
          return el && inerte(el);
        });
        const reales = v.nodes.filter((n) => !exentos.includes(n));
        return {
          id: v.id, impact: v.impact, help: v.help,
          n: reales.length, exentos: exentos.length,
          ejemplo: (reales[0]?.html || '').slice(0, 110),
          objetivo: (reales[0]?.target || []).join(' '),
        };
      }).filter((v) => v.n > 0 || v.exentos > 0);
    });
    const graves = r.filter((v) => GRAVES.has(v.impact) && v.n > 0);
    const exentos = r.reduce((s, v) => s + (GRAVES.has(v.impact) ? v.exentos : 0), 0);
    totalGraves += graves.reduce((s, v) => s + v.n, 0);
    totalExentos += exentos;
    console.log(`  ${(tema + '/' + nombre).padEnd(16)} ${graves.length ? '❌' : '✅'} `
      + `${graves.length} regla(s) grave(s), ${graves.reduce((s, v) => s + v.n, 0)} elemento(s)`
      + (exentos ? ` · ${exentos} exento(s) por decoración inerte` : ''));
    for (const v of graves) {
      console.log(`      · [${v.impact}] ${v.id} ×${v.n} — ${v.help}`);
      console.log(`        ${v.objetivo}  ${v.ejemplo}`);
      const acc = porRegla.get(v.id) || { impact: v.impact, help: v.help, n: 0, paginas: [] };
      acc.n += v.n; acc.paginas.push(`${tema}/${nombre}`);
      porRegla.set(v.id, acc);
    }
    await page.screenshot({ path: path.join(SALIDA, `${MODO}-${tema}-${nombre}.png`) });
  }
  }

  console.log('\n── resumen por regla ──');
  if (!porRegla.size) console.log('  sin incumplimientos graves');
  for (const [id, v] of [...porRegla].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  ${String(v.n).padStart(3)} × ${id} [${v.impact}] — ${v.help}`);
    console.log(`        en: ${[...new Set(v.paginas)].join(', ')}`);
  }
  fs.writeFileSync(path.join(SALIDA, `${MODO}-resumen.json`),
    JSON.stringify([...porRegla].map(([id, v]) => ({ id, ...v })), null, 2));

  await browser.close();
  console.log(`\n${totalGraves} elemento(s) con incumplimiento grave — capturas en ${SALIDA}`);
  // Se dice siempre, aunque sea 0: una exención que no se ve es una
  // exención que nadie vuelve a revisar.
  console.log(`${totalExentos} exento(s) por decoración inerte (aria-hidden + pointer-events:none)`);
  process.exit(totalGraves ? 1 : 0);
})().catch((e) => { console.error('reventó:', e.message); process.exit(2); });
