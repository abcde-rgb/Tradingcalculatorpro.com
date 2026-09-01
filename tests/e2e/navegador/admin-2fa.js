/**
 * El administrador entra al panel, y puede activar el 2FA aunque su cuenta sea
 * de Google — contra el backend REAL, con el 2FA de admin en modo producción.
 *
 * Por qué existe
 * -------------
 * `panel-admin.js` responde a `/api/**` desde el propio proceso: mide cómo
 * REACCIONA la interfaz a un 428 que se fabrica. Esta sonda mide lo otro, que
 * es lo que estaba roto de verdad: si el camino completo —entrar, llegar al
 * panel, activar el segundo factor, volver— existe.
 *
 * Los tres fallos que reproduce (BUG-076):
 *   1. `SettingsPage` sólo pintaba la tarjeta de 2FA con
 *      `auth_provider === 'password'`. A un administrador de Google se le
 *      exigía el segundo factor y se le escondía dónde activarlo: la app lo
 *      mandaba a Ajustes y en Ajustes no había nada. Encerrado, sin mensaje.
 *   2. `ProtectedRoute` decidía sobre el 2FA con datos que el frontend no
 *      tiene, así que expulsaba también a quien el servidor sí dejaba pasar.
 *   3. Recargar la pestaña cerraba la sesión cuando el refresco no salía a la
 *      primera.
 *
 * Necesita el stack en pie con el 2FA de admin EXIGIDO (no el escape hatch):
 *
 *   ENVIRONMENT=development ADMIN_2FA_OPTIONAL=false ADMIN_EMAILS=<cuenta> \
 *     uvicorn server:app --port 8090
 *   node tests/e2e/stack/servidor.js          # sirve frontend/build en :3100
 *   node tests/e2e/navegador/admin-2fa.js
 *
 * Variables: QA_API (por defecto :8090), QA_WEB (:3100), QA_BD (trading_fix),
 * QA_ADMIN (jefe@example.com), QA_ADMIN_CLAVE.
 */
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, descartaCookies, descartaModales } = require('../entorno');

const API = process.env.QA_API || 'http://127.0.0.1:8090';
const WEB = process.env.QA_WEB || 'http://127.0.0.1:3100';
const BD = process.env.QA_BD || 'trading_fix';
const CORREO = process.env.QA_ADMIN || 'jefe@example.com';
const CLAVE = process.env.QA_ADMIN_CLAVE || 'Contrasena-Muy-Larga-123';

let fallos = 0;
const ok = (nombre, cond, detalle) => {
  console.log(`  ${cond ? '✅' : '❌'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!cond) fallos++;
};

const sql = (q) => execFileSync('psql', ['-U', 'root', '-d', BD, '-tAc', q], { encoding: 'utf8' }).trim();

/** TOTP RFC 6238 en treinta líneas: la sonda tiene que teclear un código REAL. */
function totp(secretoBase32, momento = Date.now()) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secretoBase32.replace(/=+$/, '').toUpperCase()) {
    bits += alfabeto.indexOf(c).toString(2).padStart(5, '0');
  }
  const bytes = Buffer.from((bits.match(/.{8}/g) || []).map((b) => parseInt(b, 2)));
  const paso = Buffer.alloc(8);
  paso.writeBigUInt64BE(BigInt(Math.floor(momento / 1000 / 30)));
  const h = crypto.createHmac('sha1', bytes).update(paso).digest();
  const off = h[h.length - 1] & 0xf;
  const num = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(num % 1e6).padStart(6, '0');
}

async function api(ruta, opciones = {}) {
  const res = await fetch(`${API}/api${ruta}`, {
    method: opciones.metodo || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
    },
    body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
  });
  let d = {};
  try { d = await res.json(); } catch { /* sin cuerpo */ }
  return { estado: res.status, datos: d };
}

/** La cuenta vuelve al día cero: admin de Google, sin 2FA y con el margen intacto. */
function reiniciaCuenta() {
  sql(`UPDATE users SET data = (data - 'admin_2fa_grace_started_at' - 'totp_enabled'
       - 'totp_secret' - 'totp_pending_secret')
       || '{"auth_provider":"google"}'::jsonb
       WHERE data->>'email' = '${CORREO}'`);
  sql(`DELETE FROM revoked_tokens`);
}

async function entra(page) {
  // El banner de cookies y el modal de bienvenida pintan overlays a pantalla
  // completa que se comen TODOS los clics: sin descartarlos, el fallo es un
  // timeout de 30 s sobre un botón «visible, enabled y stable». Los dos
  // ayudantes viven en `entorno.js` justamente por eso.
  await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await descartaCookies(page);
  await descartaModales(page);
  await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await descartaModales(page);
  await page.locator('input[type="email"]').first().fill(CORREO);
  await page.locator('input[type="password"]').first().fill(CLAVE);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
  await descartaModales(page);
}

(async () => {
  console.log('\nPanel de administración y segundo factor (backend real, 2FA exigido)\n');
  reiniciaCuenta();

  const navegador = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await contexto.newPage();
  const erroresJs = [];
  page.on('pageerror', (e) => erroresJs.push(String(e).slice(0, 120)));

  try {
    await entra(page);
    ok('la sesión se abre', !page.url().includes('/login'), page.url());

    // ── 1 · El panel deja pasar por el margen de alta ──────────────────────
    await page.goto(`${WEB}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await descartaModales(page);
    ok('1 · /admin se abre sin 2FA (margen de alta)',
       page.url().includes('/admin'), page.url());
    ok('   · y el panel se ha pintado de verdad',
       await page.locator('[data-testid="admin-page"]').count() > 0);
    ok('   · con el aviso de que hay que activar el 2FA ya',
       await page.locator('[data-testid="admin-2fa-grace-banner"]').isVisible().catch(() => false));
    ok('   · y con datos reales, no tablas en blanco',
       await page.locator('[data-testid="metric-total-users"]').count() > 0);

    // ── 2 · La tarjeta de 2FA existe para una cuenta de Google ─────────────
    await page.goto(`${WEB}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await descartaModales(page);
    const proveedor = sql(`SELECT data->>'auth_provider' FROM users WHERE data->>'email'='${CORREO}'`);
    // El BOTÓN, no el texto de la página.
    //
    // La primera versión de esta comprobación buscaba «dos pasos» en cualquier
    // parte, y pasaba con el código ROTO: el aviso ámbar de «activa el 2FA»
    // lleva esa frase, así que casaba justo en la pantalla donde la tarjeta NO
    // estaba. Un ✅ que no probaba nada, que es peor que un ❌.
    const boton = page.getByRole('button', { name: /^Activar 2FA$|^Enable 2FA$/ }).first();
    const hayTarjeta = await boton.isVisible().catch(() => false);
    ok(`2 · Ajustes ofrece ACTIVAR el 2FA con auth_provider='${proveedor}'`, hayTarjeta,
       hayTarjeta ? '' : 'SIN SALIDA: se le exige el 2FA y no se le enseña dónde activarlo');

    // ── 3 · Vencido el margen, el backend manda: fuera del panel ───────────
    sql(`UPDATE users SET data = jsonb_set(data, '{admin_2fa_grace_started_at}',
         to_jsonb((now() at time zone 'utc' - interval '11 minutes')::text))
         WHERE data->>'email' = '${CORREO}'`);
    // Desde /dashboard, no desde /settings: si se sale ya de Ajustes, «acaba en
    // Ajustes» se cumple sin que nadie haya redirigido nada.
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.goto(`${WEB}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    ok('3 · con el margen vencido, el panel echa a Ajustes',
       page.url().includes('/settings'), page.url());
    ok('   · y explica por qué',
       await page.locator('[data-testid="admin-2fa-notice"]').isVisible().catch(() => false)
       || (await page.content()).includes('dos pasos'));

    // ── 4 · Activar el 2FA de verdad devuelve el panel ─────────────────────
    const { datos: sesion } = await api('/auth/login', { metodo: 'POST', cuerpo: { email: CORREO, password: CLAVE } });
    const { datos: alta } = await api('/auth/2fa/setup', { metodo: 'POST', token: sesion.token });
    ok('4 · /auth/2fa/setup responde a una cuenta de Google', Boolean(alta.secret), alta.detail || '');
    const { estado: estAlta } = await api('/auth/2fa/enable', {
      metodo: 'POST', token: sesion.token, cuerpo: { code: totp(alta.secret) },
    });
    ok('   · el código real la activa', estAlta === 200, `HTTP ${estAlta}`);

    // Con 2FA la entrada pasa por el código: se rehace la sesión del navegador.
    await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { try { localStorage.clear(); } catch { /* nada */ } });
    await entra(page);
    await page.waitForTimeout(1200);
    const campoCodigo = page.locator('input[autocomplete="one-time-code"]').first();
    if (await campoCodigo.count()) {
      await campoCodigo.fill(totp(alta.secret));
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2500);
    }
    ok('   · el login pide el código y lo acepta', !page.url().includes('/login'), page.url());
    await page.goto(`${WEB}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    ok('   · y el panel vuelve a abrirse, ya con el margen gastado',
       page.url().includes('/admin') && await page.locator('[data-testid="metric-total-users"]').count() > 0,
       page.url());
    ok('   · sin el aviso de margen, porque ya hay 2FA',
       await page.locator('[data-testid="admin-2fa-grace-banner"]').count() === 0);

    // ── 5 · Recargar la pestaña no cierra la sesión ────────────────────────
    let sobrevive = true;
    for (let i = 0; i < 3; i++) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      if (page.url().includes('/login')) { sobrevive = false; break; }
    }
    ok('5 · tres recargas seguidas y la sesión sigue en pie', sobrevive, page.url());

    // Dos pestañas arrancando a la vez sobre la misma cookie de refresco.
    const page2 = await contexto.newPage();
    await Promise.all([
      page.reload({ waitUntil: 'domcontentloaded' }),
      page2.goto(`${WEB}/admin`, { waitUntil: 'domcontentloaded' }),
    ]);
    await page.waitForTimeout(3000);
    ok('   · y dos pestañas recargando a la vez tampoco la cierran',
       !page.url().includes('/login') && !page2.url().includes('/login'),
       `${page.url()} · ${page2.url()}`);

    ok('sin errores de JavaScript', erroresJs.length === 0, erroresJs.slice(0, 2).join(' | '));
  } finally {
    await navegador.close();
  }

  console.log(`\n${fallos === 0 ? '✅' : '❌'} ${fallos} fallo(s)\n`);
  process.exit(fallos === 0 ? 0 : 1);
})();
