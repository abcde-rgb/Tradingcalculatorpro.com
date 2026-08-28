#!/usr/bin/env node
/* eslint-disable */
/**
 * Diagnóstico del LOGIN en el sitio publicado.
 *
 * Por qué existe
 * --------------
 * «El login no funciona» tiene cuatro causas posibles y desde fuera se ven
 * IGUAL: la página carga, metes tus datos, y te quedas fuera sin ningún error
 * que mirar. Ninguna se puede distinguir sin salir a la red, y el sandbox de
 * Claude Code no tiene salida. Esto sí: corre en Actions y dice CUÁL de las
 * cuatro es.
 *
 *   1. El sitio se sirve por HTTP. Las cookies de sesión son `Secure` +
 *      `SameSite=None`, y `SameSite=None` EXIGE `Secure`: sobre HTTP el
 *      navegador las descarta en silencio. El login devuelve 200 y no entras.
 *      → GitHub → Settings → Pages → «Enforce HTTPS».
 *   2. El backend desplegado no lleva el dominio en su lista de CORS. Sin la
 *      cabecera, el navegador tira la respuesta aunque venga con 200 y con las
 *      cookies puestas. En los logs de Cloud Run se ve perfecto, y `curl` no lo
 *      reproduce porque ignora CORS. → redesplegar el backend.
 *   3. El backend no responde. → Cloud Run caído o URL equivocada.
 *   4. `REACT_APP_BACKEND_URL` no llegó al build: `API` queda a null y la web
 *      no llama a nadie. → secreto del repositorio.
 *
 * Uso
 * ---
 *     node scripts/check-login-en-vivo.js [URL_SITIO] [--api URL_BACKEND]
 *
 * Sale 1 si el login no puede funcionar. Cada fallo dice qué tocar.
 */
const SITIO = (process.argv.find((a) => a.startsWith('http'))
  || 'https://tradingcalculator.pro').replace(/\/+$/, '');
const iA = process.argv.indexOf('--api');
const API = iA > -1 ? process.argv[iA + 1].replace(/\/+$/, '') : (process.env.BACKEND_URL || '').replace(/\/+$/, '');

const fallos = [];
const mal = (que, arreglo) => fallos.push({ que, arreglo });
const ok = (m) => console.log(`  ✅ ${m}`);

async function pedir(url, opciones = {}) {
  try {
    const r = await fetch(url, { redirect: 'manual', ...opciones });
    return { r, status: r.status, ok: r.ok };
  } catch (e) { return { error: e.message, status: 0 }; }
}

(async () => {
  console.log(`Diagnóstico del login — ${SITIO}\n`);

  // ── 1 · HTTPS forzado ─────────────────────────────────────────────────────
  // Sin esto las cookies Secure no se guardan y NADA de lo demás importa.
  const plano = await pedir(SITIO.replace('https://', 'http://') + '/');
  if (plano.status >= 300 && plano.status < 400) {
    const destino = plano.r.headers.get('location') || '';
    if (destino.startsWith('https://')) ok(`HTTP redirige a HTTPS (${plano.status})`);
    else mal(`HTTP redirige a «${destino}», que NO es HTTPS`,
            'GitHub → Settings → Pages → marca «Enforce HTTPS»');
  } else if (plano.status === 200) {
    mal('el sitio responde por HTTP sin redirigir a HTTPS',
        'GitHub → Settings → Pages → marca «Enforce HTTPS». Sin esto, las cookies '
        + '`Secure; SameSite=None` de la sesión se descartan y el login NUNCA entra');
  } else if (plano.error) {
    ok('HTTP no responde (sólo HTTPS)');
  }

  // ── 2 · la página de login existe ────────────────────────────────────────
  const login = await pedir(`${SITIO}/login`, { redirect: 'follow' });
  if (login.status === 200) ok('/login responde 200');
  else mal(`/login responde ${login.status || login.error}`,
           'GitHub Pages sirve la SPA desde 404.html; comprueba que el deploy lo copió');

  // ── 3 · el build sabe a qué backend llamar ───────────────────────────────
  let apiDelBuild = API;
  if (login.status === 200) {
    const html = await login.r.text();
    const m = html.match(/src="([^"]*\/static\/js\/main\.[^"]+\.js)"/);
    if (m) {
      const js = await pedir(SITIO + m[1].replace(SITIO, ''), { redirect: 'follow' });
      if (js.status === 200) {
        const codigo = await js.r.text();
        const urls = [...codigo.matchAll(/https:\/\/[a-z0-9-]+\.run\.app/g)].map((x) => x[0]);
        if (urls.length) {
          apiDelBuild = apiDelBuild || urls[0];
          ok(`el build apunta al backend ${urls[0]}`);
        } else {
          mal('el bundle no contiene ninguna URL de backend',
              '`REACT_APP_BACKEND_URL` no llegó al build: revísalo en los secretos del repositorio. '
              + 'Sin él la web no llama a nadie y falla en silencio');
        }
      }
    }
  }

  // ── 4 · el backend responde ──────────────────────────────────────────────
  if (!apiDelBuild) {
    mal('no se sabe la URL del backend', 'pásala con --api https://…run.app');
  } else {
    const salud = await pedir(`${apiDelBuild}/api/health`, { redirect: 'follow' });
    if (salud.status === 200) ok('el backend responde en /api/health');
    else mal(`el backend responde ${salud.status || salud.error} en /api/health`,
             'Cloud Run caído, dormido o la URL no es ésa');

    // ── 5 · LA DECISIVA: ¿el backend autoriza a este dominio? ──────────────
    // Un preflight con el Origin real. Si no vuelve la cabecera, el navegador
    // descarta toda respuesta del login por mucho que el backend diga 200.
    const pre = await pedir(`${apiDelBuild}/api/auth/login`, {
      method: 'OPTIONS',
      redirect: 'follow',
      headers: {
        Origin: SITIO,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    const permitido = pre.r ? pre.r.headers.get('access-control-allow-origin') : null;
    const credenciales = pre.r ? pre.r.headers.get('access-control-allow-credentials') : null;
    if (permitido === SITIO || permitido === '*') {
      ok(`el backend autoriza a ${SITIO} (CORS)`);
      if (credenciales !== 'true')
        mal('el backend NO devuelve Access-Control-Allow-Credentials: true',
            'sin eso el navegador no envía ni guarda la cookie de sesión');
      else ok('y permite credenciales, así que la cookie puede viajar');
    } else {
      mal(`el backend NO autoriza a ${SITIO} — devuelve «${permitido || 'nada'}»`,
          'ES ESTO: el backend desplegado corre código anterior al cutover y su lista de '
          + 'CORS no tiene el dominio. El navegador descarta la respuesta del login aunque '
          + 'venga con 200. REDESPLIEGA EL BACKEND en Cloud Run desde el `main` actual');
    }
  }

  // ── veredicto ────────────────────────────────────────────────────────────
  console.log('');
  if (fallos.length === 0) {
    console.log('✓ Nada impide que el login funcione: HTTPS, la página, el backend y el CORS están bien.');
    console.log('  Si aun así no entras, el fallo está en las credenciales o en la propia cuenta,');
    console.log('  no en el despliegue.');
    process.exit(0);
  }
  console.log(`✗ ${fallos.length} cosa(s) impiden el login:\n`);
  fallos.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.que}`);
    console.log(`     → ${f.arreglo}\n`);
  });
  process.exit(1);
})();
