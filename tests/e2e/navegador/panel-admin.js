/**
 * El panel de administración, ante respuestas que NO son las felices.
 *
 * Por qué existe
 * -------------
 * El 2026-08-28 el propietario reportó «el admin no funciona, sólo en
 * incógnito». Reproducido en navegador, eran DOS fallos distintos y ninguno
 * decía lo que pasaba:
 *
 *   · Con 428 —el backend exige 2FA a los administradores— `loadAll` sólo
 *     contemplaba 401 y 403, así que caía al `catch` genérico: el panel se
 *     pintaba VACÍO y el motivo, que el backend manda en `detail`, se quedaba
 *     en la consola. Tablas en blanco y ninguna explicación.
 *   · Con una respuesta 200 de forma inesperada, `metrics.by_locale.length`
 *     lanzaba y el ErrorBoundary se comía la página entera: «Algo salió mal».
 *
 * Esta sonda NO necesita backend ni base de datos: sirve el build y responde a
 * `/api/**` desde aquí. Eso es a propósito — el fallo está en cómo reacciona la
 * interfaz, y montar Postgres para probarlo lo haría tan caro que no se
 * ejecutaría.
 *
 * Uso:  node tests/e2e/navegador/panel-admin.js
 *       (requiere `frontend/build`; lo genera `npm run build`)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('../lib/playwright-core');
const { rutaChromium } = require('../entorno');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const BUILD = path.join(RAIZ, 'frontend', 'build');
const PUERTO = Number(process.env.QA_PUERTO_ADMIN || 4599);

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };

const ADMIN = {
  id: 'u-admin', email: 'admin@x.com', name: 'Admin', is_admin: true,
  is_premium: true, two_factor_enabled: true, auth_provider: 'password',
  email_verified: true, subscription_plan: 'lifetime',
};

let fallos = 0;
const ok = (nombre, cond, detalle) => {
  console.log(`  ${cond ? '✅' : '❌'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!cond) fallos++;
};

function servir() {
  return http.createServer((req, res) => {
    let f = path.join(BUILD, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      const idx = path.join(f, 'index.html');
      f = fs.existsSync(idx) ? idx : path.join(BUILD, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
}

async function visitarAdmin({ respuestaAdmin }) {
  const nav = await chromium.launch({ executablePath: rutaChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await nav.newContext();
  const crash = [];
  const pag = await ctx.newPage();
  pag.on('pageerror', (e) => crash.push(String(e.message).slice(0, 120)));

  await ctx.route('**/api/**', (route) => {
    const u = route.request().url();
    if (u.includes('/auth/refresh')) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ token: 't', user: ADMIN }) });
    }
    if (u.includes('/auth/me')) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(ADMIN) });
    }
    if (u.includes('/admin/')) return route.fulfill(respuestaAdmin);
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await pag.goto(`http://127.0.0.1:${PUERTO}/`, { waitUntil: 'domcontentloaded' });
  await pag.evaluate((u) => localStorage.setItem('btc-auth-storage',
    JSON.stringify({ state: { user: u, isAuthenticated: true }, version: 0 })), ADMIN);
  await pag.goto(`http://127.0.0.1:${PUERTO}/admin`, { waitUntil: 'networkidle' });
  await pag.waitForTimeout(1200);

  const ruta = new URL(pag.url()).pathname;
  const texto = await pag.evaluate(() => document.body.innerText || '');
  await nav.close();
  return { ruta, texto, crash };
}

(async () => {
  if (!fs.existsSync(path.join(BUILD, 'index.html'))) {
    console.error('✗ falta frontend/build — compila primero (npm run build)');
    process.exit(1);
  }
  const srv = servir();
  await new Promise((r) => srv.listen(PUERTO, r));
  console.log('panel-admin — el panel ante respuestas que no son la feliz\n');

  // 428: el backend exige 2FA. Tiene que LLEVAR a donde se arregla, no dejar
  // un panel en blanco con el motivo escondido en la consola.
  const a = await visitarAdmin({ respuestaAdmin: { status: 428,
    contentType: 'application/json',
    body: JSON.stringify({ detail: 'Los administradores deben activar la verificación en dos pasos.' }) } });
  ok('un 428 lleva a Ajustes en vez de dejar el panel vacío', a.ruta === '/settings', `acabó en ${a.ruta}`);
  ok('el 428 no revienta la página', a.crash.length === 0, a.crash[0]);

  // 200 con otra forma: no puede tumbar la página entera.
  const b = await visitarAdmin({ respuestaAdmin: { status: 200,
    contentType: 'application/json', body: '{}' } });
  ok('una respuesta con forma inesperada no tira la página',
     !/Something went wrong|Algo salió mal/i.test(b.texto), b.crash[0] || 'ErrorBoundary');
  ok('sin excepciones no capturadas', b.crash.length === 0, b.crash[0]);

  // 403: sigue expulsando al dashboard.
  const c = await visitarAdmin({ respuestaAdmin: { status: 403,
    contentType: 'application/json', body: JSON.stringify({ detail: 'Acceso restringido' }) } });
  ok('un 403 sigue expulsando del panel', c.ruta !== '/admin', `acabó en ${c.ruta}`);

  srv.close();
  console.log(`\n${fallos === 0 ? '✅ el panel explica el fallo en vez de romperse' : `❌ ${fallos} comprobación(es) fallan`}`);
  process.exit(fallos === 0 ? 1 && 0 : 1);
})();
