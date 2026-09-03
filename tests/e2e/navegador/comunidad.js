#!/usr/bin/env node
/**
 * Sonda de navegador de la comunidad, contra el build servido como en producción.
 *
 * Lo que comprueba y por qué:
 *
 *  1. `/community` **renderiza** y no se queda en blanco. Una SPA con un error
 *     de importación pinta un `<div id="root">` vacío y todas las demás
 *     comprobaciones sobre el DOM pasarían por no encontrar nada que fallara.
 *     Por eso lo primero es exigir texto visible.
 *  2. Cero errores de consola. Un `t is not a function` o una clave i18n rota
 *     no tumban la página pero la dejan ilegible.
 *  3. El **estado vacío** se ve tal cual: es el estado real del foro el día que
 *     se publique, y es el que nadie prueba.
 *  4. El ciclo completo con sesión: elegir seudónimo → publicar → verlo en la
 *     lista → abrirlo. Es lo que el usuario llamó «que funcione».
 *  5. Que en la pantalla **no aparezca el correo** de quien publicó.
 *
 * Uso:  node tests/e2e/navegador/comunidad.js     (con el banco en pie)
 */
const path = require('path');

const WEB = process.env.QA_WEB || 'http://127.0.0.1:3100';
const API = (process.env.QA_API || 'http://127.0.0.1:8080') + '/api';
const SELLO = String(Date.now()).slice(-9);
const CORREO = `foro_nav_${SELLO}@example.com`;
const CLAVE = 'Pruebas-1234';
const HANDLE = `nav_${SELLO}`.slice(0, 24);
const SALIDA = process.env.QA_CAPTURAS || path.join(__dirname, '..', '..', '..', '.qa-estado');

const fallos = [];
const ok = (nombre, cond, detalle = '') => {
  if (cond) console.log(`  ✓ ${nombre}`);
  else { console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`); fallos.push(nombre); }
};

function cargarPlaywright() {
  for (const cand of ['playwright', 'playwright-core',
    '/opt/node22/lib/node_modules/playwright']) {
    try { return require(cand); } catch { /* siguiente */ }
  }
  throw new Error('no se encontró playwright');
}

/* Chromium se BUSCA, igual que en `tests/e2e/entorno.js`: el número de build
 * cambia con cada actualización de Playwright y la ruta que la librería trae
 * por defecto apunta a un build que en este entorno no está descargado. Sin
 * esto, la sonda muere pidiendo `npx playwright install`, que la política de
 * red del sandbox bloquea. */
function rutaChromium() {
  if (process.env.QA_CHROMIUM) return process.env.QA_CHROMIUM;
  const fs = require('fs');
  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const candidatos = fs.existsSync(raiz)
    ? fs.readdirSync(raiz)
      .filter((d) => d.startsWith('chromium-'))
      .map((d) => path.join(raiz, d, 'chrome-linux', 'chrome'))
      .filter((p) => fs.existsSync(p))
    : [];
  if (!candidatos.length) throw new Error(`No encuentro Chromium bajo ${raiz}`);
  return candidatos.sort().reverse()[0];
}

async function api(metodo, ruta, cuerpo, token) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let datos = null;
  try { datos = await r.json(); } catch { /* sin cuerpo */ }
  return { cod: r.status, datos };
}

(async () => {
  const { chromium } = cargarPlaywright();
  const navegador = await chromium.launch({
    executablePath: rutaChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const contexto = await navegador.newContext({ viewport: { width: 1360, height: 1000 } });
  const pagina = await contexto.newPage();

  const errores = [];
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  pagina.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message));

  // ── 1 · La lista pública renderiza ───────────────────────────────────────
  await pagina.goto(`${WEB}/community`, { waitUntil: 'networkidle' });
  // El banner de cookies intercepta clics: se acepta antes de tocar nada.
  const banner = pagina.locator('button:has-text("Aceptar"), button:has-text("Accept")').first();
  if (await banner.isVisible().catch(() => false)) await banner.click().catch(() => {});

  const textoLista = (await pagina.textContent('body')) || '';
  ok('la lista renderiza con contenido', textoLista.trim().length > 200,
    `sólo ${textoLista.trim().length} caracteres`);
  ok('el título de la sección aparece', /Comunidad|Community/i.test(textoLista));
  ok('los filtros de categoría están', await pagina.locator('#f-producto').count() > 0);
  ok('el selector de orden está', await pagina.locator('#f-orden').count() > 0);

  await pagina.screenshot({ path: path.join(SALIDA, 'comunidad-lista.png'), fullPage: true });

  // ── 2 · Estado vacío o lista, pero nunca en blanco ───────────────────────
  const vacio = /Todav[íi]a no hay ning[úu]n hilo|No threads yet/i.test(textoLista);
  if (vacio) {
    ok('el estado vacío explica que no hay contenido sembrado',
      /no hay conversaciones de ejemplo|no sample conversations|inventad/i.test(textoLista));
  } else {
    console.log('  (el foro ya tiene hilos de la sonda de API: no se comprueba el estado vacío)');
  }

  // ── 3 · Ciclo con sesión ─────────────────────────────────────────────────
  let { cod, datos } = await api('POST', '/auth/register',
    { email: CORREO, password: CLAVE, name: 'Sonda' });
  if (cod !== 200 && cod !== 201) {
    ({ cod, datos } = await api('POST', '/auth/login', { email: CORREO, password: CLAVE }));
  }
  const token = datos && datos.token;
  ok('la sonda consigue una sesión', Boolean(token), `HTTP ${cod}`);

  if (token) {
    const perfil = await api('PUT', '/forum/profile', { handle: HANDLE }, token);
    ok('se puede fijar el seudónimo por API', perfil.cod === 200, `HTTP ${perfil.cod}`);

    const titulo = `Sonda de navegador ${SELLO} sobre el oro`;
    const pub = await api('POST', '/forum/threads', {
      title: titulo,
      body: 'Cuerpo publicado por la sonda de navegador para comprobar el ciclo completo.',
      category: 'analisis', product: 'forex', symbol: 'XAUUSD',
      analysis: { symbol: 'XAUUSD', side: 'long', entry: 2412.3, stop: 2398, target: 2441 },
    }, token);
    ok('se publica un hilo con análisis', pub.cod === 200, `HTTP ${pub.cod}`);
    const hiloId = pub.datos && pub.datos.thread && pub.datos.thread.id;

    // La lista, ya con el hilo dentro.
    await pagina.goto(`${WEB}/community?order=nuevo`, { waitUntil: 'networkidle' });
    const listaConHilo = (await pagina.textContent('body')) || '';
    ok('el hilo aparece en la lista', listaConHilo.includes(titulo));
    ok('la lista enseña el seudónimo', listaConHilo.includes('@' + HANDLE));
    ok('la lista NO enseña el correo', !listaConHilo.includes(CORREO));

    if (hiloId) {
      await pagina.goto(`${WEB}/community/${hiloId}`, { waitUntil: 'networkidle' });
      const detalle = (await pagina.textContent('body')) || '';
      ok('el detalle del hilo renderiza', detalle.includes(titulo));
      ok('la ficha del análisis se pinta', detalle.includes('2.412,3') || detalle.includes('2412.3')
        || detalle.includes('2,412.3'));
      ok('el R:R calculado por el servidor sale (2,01)',
        /2[.,]01/.test(detalle), 'no se encuentra 2,01 en la página');
      ok('el detalle NO enseña el correo', !detalle.includes(CORREO));
      await pagina.screenshot({ path: path.join(SALIDA, 'comunidad-hilo.png'), fullPage: true });

      // Móvil: la maqueta tiene que sobrevivir a 390 px sin desbordar.
      const movil = await contexto.newPage();
      await movil.setViewportSize({ width: 390, height: 844 });
      await movil.goto(`${WEB}/community/${hiloId}`, { waitUntil: 'networkidle' });
      const desborda = await movil.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('en móvil no hay desbordamiento horizontal', !desborda);
      await movil.screenshot({ path: path.join(SALIDA, 'comunidad-movil.png'), fullPage: true });
      await movil.close();
    }
  }

  // ── 4 · Consola limpia ───────────────────────────────────────────────────
  // Se descartan SÓLO los fallos de red de salida, que en este sandbox están
  // bloqueados por política (fuentes de Google, analítica, proveedores de
  // precio — ver CLAUDE.md § Sandbox remoto). No se descarta ningún error de
  // JavaScript: filtrar por «ruido» en vez de por causa es cómo un smoke visual
  // acaba imprimiendo ✅ sobre páginas en blanco, que ya pasó en este repo.
  const RED_BLOQUEADA = /ERR_TUNNEL_CONNECTION_FAILED|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_BLOCKED_BY_CLIENT|net::ERR_FAILED|favicon/i;
  const relevantes = errores.filter((e) => !RED_BLOQUEADA.test(e));
  ok('cero errores de JavaScript en consola', relevantes.length === 0,
    relevantes.slice(0, 3).join(' | '));
  if (errores.length !== relevantes.length) {
    console.log(`  (descartados ${errores.length - relevantes.length} fallos de red `
      + 'de salida: el sandbox no tiene internet)');
  }

  await navegador.close();

  console.log();
  if (fallos.length) {
    console.log(`✗ ${fallos.length} comprobación(es) fallidas: ${JSON.stringify(fallos)}`);
    process.exit(1);
  }
  console.log('✓ la comunidad funciona en el navegador (lista, hilo, análisis y móvil)');
})().catch((e) => { console.error('sonda rota:', e); process.exit(2); });
