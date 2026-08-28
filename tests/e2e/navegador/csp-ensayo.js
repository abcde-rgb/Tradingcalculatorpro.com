/**
 * Ensayo de CSP sobre el build compilado, ANTES de proponer ninguno.
 *
 * Un CSP en `<meta>` no admite `report-only`: entra enforcando desde el primer
 * píxel, y lo que se le olvide se cae sin aviso previo. Así que antes de
 * escribir uno hay que responder tres preguntas en un navegador de verdad, no
 * de memoria:
 *
 *   1. ¿El `<meta>` aplica de verdad, y bloquea? Si no bloqueara, todo lo demás
 *      sobra.
 *   2. ¿Qué directivas se IGNORAN en `<meta>`? `frame-ancestors` es la de la
 *      protección contra clickjacking, y si se ignora, el meta no puede
 *      sustituir a una cabecera por mucho que se quiera.
 *   3. ¿Sobrevive la aplicación a un CSP de sólo primera parte? Todo lo que
 *      salte aquí saltaría también en producción.
 *
 * Levanta su propia copia del build con el CSP inyectado: no toca el original.
 *
 *   node tests/e2e/navegador/csp-ensayo.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { chromium } = require('../lib/playwright-core');
const { rutaChromium } = require('../entorno');

const BUILD = path.join(__dirname, '..', '..', '..', 'frontend', 'build');
// Base bajo la que se sirve la app. Desde el cutover a `tradingcalculator.pro`
// (2026-08-28) el build cuelga de la RAÍZ (`PUBLIC_URL: /`), así que por defecto
// va vacía; `E2E_BASE_PATH` la fuerza para probar un build antiguo.
//
// Estuvo escrita a mano en seis ficheros, y por eso el cutover la dejó desfasada
// en los seis a la vez: las sondas pedían `/Tradingcalculatorpro.com/...` a un
// build que ya servía desde `/`, y contestaba 404. Mismo fallo que el CORS —
// una constante copiada que no siguió al dominio.
const BASE_PATH = process.env.E2E_BASE_PATH ?? '';
const PUERTO = 3199;

// Candidato deliberadamente ESTRECHO: sólo primera parte. No es la propuesta
// final — es el suelo, para ver qué se cae y con qué nombre.
const CSP_ESTRECHO = process.env.QA_CSP || [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",   // ← la que hay que ver si el navegador acepta en meta
].join('; ');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

function servidor(csp) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length);
    let f = path.join(BUILD, p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(BUILD, 'index.html');
    let cuerpo = fs.readFileSync(f);
    const ext = path.extname(f);
    if (ext === '.html' && csp) {
      // Se inyecta como lo haría el `public/index.html` real: primer hijo de
      // <head>, porque un CSP en meta sólo gobierna lo que viene DESPUÉS.
      cuerpo = Buffer.from(String(cuerpo).replace(
        '<head>', `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`));
    }
    res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream' });
    res.end(cuerpo);
  });
}

const marca = (n, ok, d = '') => console.log(`  ${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);

(async () => {
  const srv = servidor(CSP_ESTRECHO);
  await new Promise((r) => srv.listen(PUERTO, r));
  const navegador = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const page = await (await navegador.newContext()).newPage();

  const violaciones = [];
  const avisos = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) violaciones.push(t.slice(0, 200));
    if (/ignored when delivered|is ignored/i.test(t)) avisos.push(t.slice(0, 200));
  });

  console.log('═══ Ensayo de CSP en <meta> sobre el build compilado ═══\n');
  console.log(`CSP ensayado: ${CSP_ESTRECHO}\n`);

  await page.goto(`http://127.0.0.1:${PUERTO}${BASE_PATH}/`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);

  // ── 1 · ¿aplica y bloquea? ───────────────────────────────────────────
  console.log('── 1 · ¿el <meta> bloquea de verdad? ──');
  const inline = await page.evaluate(() => {
    // Un script inline que 'self' sin 'unsafe-inline' TIENE que rechazar.
    try {
      const s = document.createElement('script');
      s.textContent = 'window.__SABOTAJE_CSP__ = true;';
      document.head.appendChild(s);
    } catch (_) { /* el bloqueo puede llegar por error o en silencio */ }
    return window.__SABOTAJE_CSP__ === true;
  });
  // La expectativa DEPENDE del CSP que se esté ensayando. Con 'unsafe-inline'
  // el script inline TIENE que ejecutarse, y exigir lo contrario convertía un
  // comportamiento correcto en un ❌. Sin él, tiene que bloquearse. Las dos
  // direcciones importan: una comprobación que espera siempre lo mismo no
  // distingue «el CSP aplica» de «el CSP no está».
  const permiteInline = /script-src[^;]*'unsafe-inline'/.test(CSP_ESTRECHO);
  marca(permiteInline
    ? "un <script> inline se ejecuta (el CSP lleva 'unsafe-inline')"
    : 'un <script> inline inyectado NO se ejecuta',
  inline === permiteInline,
  inline === permiteInline
    ? (permiteInline ? 'permitido, como pide el propio CSP' : "bloqueado por script-src 'self'")
    : (inline ? 'se ejecutó y no debía: el CSP no está aplicando'
              : 'se bloqueó y debía ejecutarse'));

  const externo = await page.evaluate(async () => {
    try { await fetch('https://www.googletagmanager.com/gtm.js'); return 'permitido'; }
    catch (e) { return 'bloqueado: ' + String(e.message).slice(0, 50); }
  });
  marca('un fetch a un origen no listado se bloquea', externo.startsWith('bloqueado'), externo);

  // ── 2 · ¿qué directivas ignora el <meta>? ────────────────────────────
  console.log('\n── 2 · directivas que el <meta> IGNORA ──');
  if (avisos.length) {
    [...new Set(avisos)].forEach((a) => console.log(`  ⚠️  ${a}`));
  } else {
    console.log('  (el navegador no avisó de ninguna — ver la lista de violaciones)');
  }

  // ── 3 · qué se cae de la propia aplicación ───────────────────────────
  console.log('\n── 3 · qué rompe el CSP de sólo primera parte ──');
  const porDirectiva = {};
  [...new Set(violaciones)].forEach((v) => {
    const d = (v.match(/directive: "([a-z-]+)/) || v.match(/violates the following.*?"([a-z-]+)/) || [])[1] || 'otra';
    const rec = (v.match(/https?:\/\/[^\s'"]+/) || ['(inline)'])[0];
    (porDirectiva[d] ||= new Set()).add(rec);
  });
  if (!Object.keys(porDirectiva).length) console.log('  (ninguna violación registrada)');
  Object.entries(porDirectiva).sort().forEach(([d, set]) => {
    console.log(`  ${d}:`);
    [...set].slice(0, 8).forEach((r) => console.log(`      ${r}`));
  });

  const pintado = await page.evaluate(() => ({
    raiz: !!document.querySelector('#root')?.children.length,
    texto: document.body.innerText.trim().length,
    nodos: document.querySelectorAll('*').length,
  }));

  // ── 4 · contra la línea base SIN CSP ─────────────────────────────────
  // «La aplicación pinta» no significa nada suelto: hay que compararlo con lo
  // que pinta sin CSP. Una portada que pierde la mitad del DOM también «pinta».
  console.log('\n── 4 · contra la misma página SIN CSP ──');
  const srv2 = servidor(null);
  await new Promise((r) => srv2.listen(PUERTO + 1, r));
  const page2 = await (await navegador.newContext()).newPage();
  await page2.goto(`http://127.0.0.1:${PUERTO + 1}${BASE_PATH}/`, { waitUntil: 'networkidle', timeout: 45000 });
  await page2.waitForTimeout(2500);
  const base = await page2.evaluate(() => ({
    texto: document.body.innerText.trim().length,
    nodos: document.querySelectorAll('*').length,
  }));
  const dTexto = base.texto ? Math.round(((pintado.texto - base.texto) / base.texto) * 100) : 0;
  const dNodos = base.nodos ? Math.round(((pintado.nodos - base.nodos) / base.nodos) * 100) : 0;
  marca('el CSP no recorta la página respecto a no tenerlo',
        Math.abs(dTexto) <= 2 && Math.abs(dNodos) <= 2,
        `texto ${dTexto > 0 ? '+' : ''}${dTexto}% · nodos ${dNodos > 0 ? '+' : ''}${dNodos}%`);
  console.log(`      con CSP: ${pintado.texto} car. / ${pintado.nodos} nodos`);
  console.log(`      sin CSP: ${base.texto} car. / ${base.nodos} nodos`);

  await navegador.close();
  srv.close();
  srv2.close();
})();
