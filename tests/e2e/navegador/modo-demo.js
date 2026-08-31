/**
 * ¿Se puede entrar en modo demo en el sitio publicado?
 *
 * El modo demo nació el 2026-05-15 como **plan B para cuando falta la URL del
 * backend** (`124c41ce`): con `API === null`, entrar con `demo@btccalc.pro` /
 * `1234` concedía una sesión premium fabricada en el navegador, y registrarse
 * con cualquier cosa también. Después se retiró (`3116a0f4`), pero las guardas
 * `token === DEMO_TOKEN` siguen repartidas por seis ficheros, así que mirar el
 * código no basta para saber si la puerta sigue abierta.
 *
 * Leer el código dice que no queda ningún `set({ token: DEMO_TOKEN })`. Eso es
 * una hipótesis. Esta sonda la ejecuta: **reproduce la condición exacta que
 * activaba el modo demo** —un build SIN `REACT_APP_BACKEND_URL`— y prueba las
 * credenciales originales en un navegador de verdad.
 *
 * Se ejecuta contra un build compilado sin backend:
 *
 *   (cd frontend && env -u REACT_APP_BACKEND_URL PUBLIC_URL=/ CI=false npm run build)
 *   node tests/e2e/navegador/modo-demo.js
 */
const fs = require('fs');
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
const PUERTO = Number(process.env.QA_PUERTO_DEMO || 3198);

const CREDENCIALES = [
  ['demo@btccalc.pro', '1234'],          // las del commit que lo introdujo
  ['demo@btccalc.pro', '12345678'],      // las que siembra el backend en dev
];

const fallos = [];
const marca = (n, ok, d = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos.push(n);
};

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

(async () => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length);
    let f = path.join(BUILD, p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(BUILD, 'index.html');
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => srv.listen(PUERTO, r));
  const BASE = `http://127.0.0.1:${PUERTO}${BASE_PATH}`;

  const navegador = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // El idioma se FIJA. `rechazoVisible` busca prosa, y desde que los mensajes
  // del store se traducen («Backend no configurado» → «Backend not
  // configured») la sonda dependía del `Accept-Language` de la máquina: veía
  // el rechazo en castellano y no en inglés, y concluía que el formulario ni
  // se había enviado.
  await page.addInitScript(() => {
    localStorage.setItem('trading-i18n-storage',
      JSON.stringify({ state: { locale: 'es', autoDetected: true }, version: 0 }));
  });

  const peticiones = [];
  page.on('request', (r) => { if (/\/api\//.test(r.url())) peticiones.push(r.url()); });

  console.log('═══ ¿Sigue existiendo el modo demo? ═══\n');

  // ── 0 · la condición: el build NO conoce ningún backend ──────────────
  const js = fs.readdirSync(path.join(BUILD, 'static', 'js'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(BUILD, 'static', 'js', f), 'utf8')).join('');
  const tieneApi = /https?:\/\/[a-z0-9.-]+(:\d+)?\/api/i.test(js);
  marca('el build bajo prueba NO lleva URL de backend (API === null)', !tieneApi,
        tieneApi ? 'lleva una: no se está reproduciendo la condición del modo demo'
                 : 'reproduce la condición exacta con la que existía el modo demo');
  if (tieneApi) { await navegador.close(); srv.close(); process.exit(1); }

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach((b) => {
      if (/acept|entend|de acuerdo|accept/i.test(b.textContent)) b.click();
    });
  });
  await page.waitForTimeout(600);

  // ── 1 · las credenciales originales ──────────────────────────────────
  for (const [email, clave] of CREDENCIALES) {
    // `clear()` se lleva por delante el idioma fijado arriba, así que se
    // vuelve a poner: sin esto la primera credencial se probaría en castellano
    // y la segunda en el idioma del navegador.
    await page.evaluate(() => {
      try {
        localStorage.clear();
        localStorage.setItem('trading-i18n-storage',
          JSON.stringify({ state: { locale: 'es', autoDetected: true }, version: 0 }));
      } catch (_) { /* nada */ }
    });
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(400);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', clave);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    const estado = await page.evaluate(() => ({
      ruta: location.pathname,
      // La prueba de fuego: ¿hay sesión guardada, y con qué token?
      guardado: localStorage.getItem('btc-auth-storage') || '',
      texto: document.body.innerText.replace(/\s+/g, ' '),
    }));
    const entro = !estado.ruta.endsWith('/login');
    const autenticado = /"isAuthenticated":true/.test(estado.guardado);
    // ⚠️ NO se busca «demo-token» en localStorage. El `partialize` del store
    // guarda sólo `user` e `isAuthenticated`: el token vive en memoria y no se
    // persiste NUNCA, así que esa comprobación no puede dar positivo jamás.
    // Estaba puesta, y al reintroducir el modo demo a propósito para probar
    // esta sonda siguió diciendo «token demo: no» con el modo demo activo y la
    // sesión concedida. Una aserción que no puede fallar da falsa tranquilidad.
    // Lo que delata la sesión fabricada es `isAuthenticated` y la ruta.
    // ⚠️ Las dos mitades, en la MISMA aserción. «No hay sesión» a solas también
    // sale verde si el formulario no llegó a enviarse nunca —selector que no
    // encaja, botón deshabilitado, validación que corta antes—, y entonces no
    // se está midiendo el modo demo sino un clic perdido. El error visible es
    // la prueba de que el intento SÍ se procesó y aun así fue rechazado.
    const rechazoVisible = /backend no configurado|credenciales|inv[áa]lid|incorrect/i.test(estado.texto);

    marca(`${email} / ${clave}: se procesa el intento y NO concede sesión`,
          !entro && !autenticado && rechazoVisible,
          `ruta ${estado.ruta.replace(BASE_PATH, '') || '/'}`
          + ` · isAuthenticated: ${autenticado ? 'SÍ' : 'no'}`
          + ` · rechazo en pantalla: ${rechazoVisible ? 'sí' : 'NO (¿se envió el formulario?)'}`);
  }

  // ── 2 · el registro, que también fabricaba sesión ────────────────────
  await page.evaluate(() => { try { localStorage.clear(); } catch (_) { /* nada */ } });
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(500);
  const hayFormulario = await page.evaluate(() => Boolean(document.querySelector('input[type="password"]')));
  if (hayFormulario) {
    await page.evaluate(() => {
      const t = document.querySelector('input[type="text"], input[name="name"]');
      if (t) { t.value = 'Demo'; t.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.fill('input[type="email"]', 'cualquiera@ejemplo.com');
    await page.fill('input[type="password"]', 'Clave-Segura-123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    const tras = await page.evaluate(() => ({
      ruta: location.pathname,
      guardado: localStorage.getItem('btc-auth-storage') || '',
    }));
    marca('registrarse sin backend NO fabrica una sesión premium',
          tras.ruta.endsWith('/register') && !/"isAuthenticated":true/.test(tras.guardado),
          `ruta ${tras.ruta.replace(BASE_PATH, '')} · isAuthenticated: ${/"isAuthenticated":true/.test(tras.guardado) ? 'SÍ' : 'no'}`);
  } else {
    console.log('  ⏭️  /register sin formulario de contraseña — no se puede medir');
  }

  // ── 3 · que las guardas del modo demo siguen siendo alcanzables ──────
  // Quedan veinte comparaciones `token === DEMO_TOKEN` repartidas por seis
  // ficheros. Con el modo demo ya inalcanzable son código muerto — se anota
  // para que conste, no como fallo.
  console.log('\n── restos del modo demo en el artefacto publicado ──');
  const restos = (js.match(/demo-token/g) || []).length;
  console.log(`  «demo-token» aparece ${restos} vez(ces) en el bundle, todas como comparación`);
  console.log(`  peticiones a /api/ durante toda la prueba: ${peticiones.length} (API === null)`);
  console.log('\n' + '='.repeat(70));
  console.log(fallos.length ? `❌ ${fallos.length} fallo(s)` : '✅ el modo demo no se puede activar');
  await navegador.close();
  srv.close();
  process.exit(fallos.length ? 1 : 0);
})();
