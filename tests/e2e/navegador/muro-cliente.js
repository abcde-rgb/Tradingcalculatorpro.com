/**
 * ¿Qué se desbloquea mintiéndole al cliente?
 *
 * `useIsPremium()` lee el estado de Zustand, y ese estado vive en el navegador
 * del usuario. Cualquiera abre la consola y lo cambia. La pregunta útil no es
 * si se puede —se puede siempre, y no tiene arreglo— sino **qué consigue quien
 * lo hace**: si sólo ve la pantalla que estaba escondida y ésta se queda vacía
 * porque el servidor no le da datos, el muro aguanta; si además obtiene el
 * resultado, el muro era una cortina.
 *
 * Se ejecuta sobre el BUILD COMPILADO, que es lo que se publica, no sobre el
 * servidor de desarrollo.
 *
 *   node tests/e2e/navegador/muro-cliente.js
 */
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, BASE, descartaCookies, descartaModales } = require('../entorno');

const CUENTA = {
  email: process.env.QA_CUENTA_LIBRE || 'sonda1787045926@ejemplo.com',
  password: process.env.QA_CUENTA_LIBRE_CLAVE || 'Clave-Segura-123',
};

const fallos = [];
const marca = (n, ok, d = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos.push(n);
};

(async () => {
  const navegador = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const page = await (await navegador.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  const respuestas = [];
  page.on('response', (r) => {
    if (r.url().includes('/api/')) respuestas.push({ url: r.url(), estado: r.status() });
  });

  // ── Sesión real de una cuenta SIN premium ────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 });
  await descartaCookies(page).catch(() => {});
  await page.fill('input[type="email"]', CUENTA.email);
  await page.fill('input[type="password"]', CUENTA.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  await descartaModales(page).catch(() => {});

  const sesion = await page.evaluate(() => {
    // El store de Zustand se expone por el módulo, no por window: se lee del
    // texto de la pantalla, que es lo que el usuario ve de verdad.
    return { url: location.pathname, cuerpo: document.body.innerText.slice(0, 400) };
  });
  const entro = !sesion.url.endsWith('/login');
  marca('la cuenta sin premium entra en la aplicación', entro, sesion.url);
  if (!entro) {
    console.log('    (sin sesión no se puede medir el resto)\n   ', sesion.cuerpo.slice(0, 200));
    await navegador.close();
    process.exit(1);
  }

  // ── 1 · Con la verdad: la pantalla premium está cerrada ──────────────
  console.log('\n── antes de mentir ──');
  await page.goto(`${BASE}/performance`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);
  const antes = await page.evaluate(() => document.body.innerText);
  // ⚠️ NO vale buscar «premium» o «precios» en la página entera: esas palabras
  // están en la barra de navegación de TODAS las pantallas, así que la
  // afirmación daba verde sin que hubiera muro alguno. Hay que preguntar por lo
  // que sólo existe si el muro está puesto, Y por lo que sólo existe si NO lo
  // está — las dos mitades, o no se está midiendo nada.
  const contenidoPremium = await page.evaluate(() => Boolean(
    document.querySelector('[data-testid="analytics-dashboard"], [data-testid="journal-table"], table tbody tr'),
  ));
  const avisoMuro = /suscripci[óo]n|desbloquea|hazte premium|requiere premium/i.test(antes);
  marca('/performance enseña el muro y NO enseña datos a una cuenta gratuita',
        avisoMuro && !contenidoPremium,
        `aviso de muro: ${avisoMuro ? 'sí' : 'NO'} · contenido premium visible: ${contenidoPremium ? 'SÍ' : 'no'}`);

  // ── 2 · Mintiendo: se fuerza is_premium en el estado del cliente ─────
  console.log('\n── mintiéndole al cliente ──');
  const mentido = await page.evaluate(() => {
    // Zustand persiste parte del estado; se falsea por ahí y se recarga, que es
    // lo que haría cualquiera desde la consola sin tocar el código.
    const clave = Object.keys(localStorage).find((k) => /auth|store|user/i.test(k));
    if (!clave) return { ok: false, motivo: 'no hay estado persistido que falsear' };
    try {
      const v = JSON.parse(localStorage.getItem(clave));
      const u = v?.state?.user || v?.user;
      if (!u) return { ok: false, motivo: `sin user en «${clave}»` };
      u.is_premium = true;
      u.subscription_plan = 'lifetime';
      localStorage.setItem(clave, JSON.stringify(v));
      return { ok: true, clave };
    } catch (e) { return { ok: false, motivo: String(e).slice(0, 60) }; }
  });
  console.log(`    estado falseado: ${mentido.ok ? `sí (${mentido.clave})` : `no — ${mentido.motivo}`}`);

  respuestas.length = 0;
  await page.reload({ waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);
  const despues = await page.evaluate(() => document.body.innerText);

  // Lo que importa: ¿aparecen DATOS? Un panel abierto y vacío no es una fuga.
  const api403 = respuestas.filter((r) => r.estado === 403).length;
  // `/analytics/track` es telemetría propia y responde 200 a cualquiera: si
  // entra en el filtro, la sonda denuncia una fuga que no existe. Pasó.
  const ES_DATO_PREMIUM = /\/api\/(performance|journal|trades|plan|portfolio|backtest|monte-carlo)/;
  const api200 = respuestas.filter((r) => r.estado === 200
    && ES_DATO_PREMIUM.test(r.url) && !/\/analytics\/track/.test(r.url));
  marca('el servidor sigue negando los datos aunque el cliente mienta',
        api200.length === 0,
        api200.length ? api200.slice(0, 3).map((r) => r.url.split('/api')[1]).join(', ')
                      : `${api403} respuestas 403, ninguna 2xx con datos`);

  const cambio = antes.replace(/\s+/g, '') !== despues.replace(/\s+/g, '');
  console.log(`    (la pantalla ${cambio ? 'SÍ' : 'no'} cambia de aspecto al mentir — cosmético)`);

  // ── 3 · Las dos calculadoras que se calculan en el navegador ─────────
  // Monte Carlo y el simulador no llaman al backend: su «premium» es
  // inevitablemente cosmético. Se comprueba para poder DECIRLO, no para exigir
  // que aguante: exigirlo sería pedir lo imposible.
  console.log('\n── lo que se calcula en el navegador ──');
  respuestas.length = 0;
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);
  const llamadasMC = respuestas.filter((r) => /monte-carlo|simulat/i.test(r.url));
  console.log(`    llamadas al backend de monte-carlo/simulador: ${llamadasMC.length}`);

  console.log('\n' + '='.repeat(70));
  console.log(fallos.length ? `❌ ${fallos.length} fallo(s)` : '✅ el muro aguanta donde puede aguantar');
  await navegador.close();
  process.exit(fallos.length ? 1 : 0);
})();
