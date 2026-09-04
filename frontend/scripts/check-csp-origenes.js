#!/usr/bin/env node
/**
 * La CSP compilada autoriza de verdad al backend de este build.
 *
 * ## El fallo que existe para cazar
 *
 * `public/index.html` escribe la política con marcadores:
 *
 *     connect-src 'self' %REACT_APP_BACKEND_URL% %REACT_APP_BACKEND_WS_URL% …
 *
 * CRA los sustituye por el valor de la variable **si la variable existe**. Si no
 * existe, deja el marcador tal cual, y el navegador descarta esa fuente:
 *
 *     The source list for the CSP directive 'connect-src' contains an invalid
 *     source: '%REACT_APP_BACKEND_URL%'. It will be ignored.
 *
 * El resto de la directiva sigue aplicando, así que el efecto no es «no hay
 * política»: es peor, es una política que **prohíbe hablar con la API**. La web
 * carga, se ve entera, y ni un `fetch` llega al backend.
 *
 * Y hay una segunda forma, que el marcador no delata: un secreto **definido y
 * vacío**. `${{ secrets.X }}` de un secreto que no existe vale `''`, la variable
 * SÍ está en el entorno, CRA la sustituye por nada y la directiva queda
 * sintácticamente perfecta y sin el backend dentro. Ahí no hay ni aviso en la
 * consola.
 *
 * Las dos rompen la web entera, las dos dejan el build en verde, y ninguna la
 * ve un test que mire el código fuente: el marcador está bien escrito en
 * `public/index.html`. Lo que hay que mirar es el ARTEFACTO.
 *
 * ## Qué comprueba, y por qué así
 *
 * 1. **Ningún marcador `%…%` sobrevive dentro de la política** (ni `%PUBLIC_URL%`,
 *    que si sobrevive deja los assets colgando de una ruta con signos de
 *    porcentaje y no carga ni el CSS). Los demás marcadores —`%REACT_APP_GTM_ID%`
 *    y los dos de verificación de buscadores— se listan como aviso y no tumban
 *    la ejecución: son opcionales por diseño y `ci.yml` no tiene por qué
 *    inventarse un identificador de GTM para compilar. Con `--exigir-todos`
 *    pasan a ser fatales, y así se ejecuta en el despliegue, donde el workflow
 *    SÍ pasa las seis variables y un marcador vivo significa que se cayó una.
 *
 * 2. **`connect-src` lleva el par `http(s)://host` + `ws(s)://host`** del mismo
 *    origen. Esta es la comprobación que no depende de conocer el valor
 *    esperado: ninguna de las fuentes de terceros de la política (Google
 *    Analytics, PostHog, `accounts.google.com`) es un WebSocket, así que el
 *    único `ws://` o `wss://` de la lista es el backend, y su gemelo `http(s)`
 *    tiene que estar al lado. Con el marcador sobreviviendo, o con el secreto
 *    vacío, no queda ningún `ws://` y esto falla.
 *
 *    De regalo cierra offline el fallo que costó un mes de alertas mudas: en
 *    CSP3 la relajación de esquemas va de `ws` a `http`/`https` y **nunca al
 *    revés**, así que `https://api…` NO autoriza `wss://api…`. Hasta hoy eso
 *    sólo lo veía `csp.js` abriendo un navegador con sesión iniciada.
 *
 * 3. **Si `REACT_APP_BACKEND_URL` está en el entorno**, que sea ESE origen el
 *    que quedó dentro. Cubre el caso de compilar apuntando a un sitio y
 *    verificar apuntando a otro.
 *
 * No se comprueba con el navegador a propósito: esto tiene que poder correr en
 * el paso siguiente al build, sin servidor y sin Chromium, que es donde hace
 * falta —justo antes de publicar.
 *
 * Uso:
 *     node scripts/check-csp-origenes.js                  # sobre frontend/build
 *     node scripts/check-csp-origenes.js --exigir-todos   # en el despliegue
 *     BUILD=otra/carpeta node scripts/check-csp-origenes.js
 *
 * Sabotajes (los tres tienen que FALLAR):
 *   · devolver el marcador:  sed -i 's|http://127.0.0.1:8080|%REACT_APP_BACKEND_URL%|'
 *   · vaciar el origen:      sed -i 's|http://127.0.0.1:8080||'
 *   · quitar sólo el `ws://`: sed -i 's| ws://127.0.0.1:8080||'
 */
const fs = require('fs');
const path = require('path');

const BUILD = process.env.BUILD || path.join(__dirname, '..', 'build');
const INDICE = path.join(BUILD, 'index.html');

const problemas = [];
const avisos = [];
const bien = [];

if (!fs.existsSync(INDICE)) {
  console.error(`❌ No encuentro ${INDICE}. Compila primero: (cd frontend && npm run build)`);
  process.exit(1);
}

const html = fs.readFileSync(INDICE, 'utf8');
const EXIGIR_TODOS = process.argv.includes('--exigir-todos');

const meta = html.match(
  /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*content=["']([\s\S]*?)["']\s*\/?>/i,
);

// ── 1 · Ningún marcador sin sustituir donde importa ─────────────────────────
// Fatales: los que caen DENTRO de la política (el navegador descarta esa fuente
// entera) y `%PUBLIC_URL%` (los assets colgarían de una ruta con signos de
// porcentaje y no cargaría ni el CSS). El resto se dice y no se tumba, salvo
// con `--exigir-todos`.
const marcadores = [...new Set(html.match(/%[A-Z_][A-Z0-9_]*%/g) || [])];
const enLaPolitica = new Set(meta ? meta[1].match(/%[A-Z_][A-Z0-9_]*%/g) || [] : []);
const graves = marcadores.filter((m) => enLaPolitica.has(m) || m === '%PUBLIC_URL%');
const leves = marcadores.filter((m) => !graves.includes(m));

if (graves.length) {
  problemas.push(
    `marcadores sin sustituir donde rompen la web: ${graves.join(', ')}\n` +
    '      → la variable no estaba definida al compilar. Dentro de la CSP eso\n' +
    '        hace que el navegador DESCARTE esa fuente: la web carga y no puede\n' +
    '        hablar con su propia API.',
  );
}
if (leves.length) {
  if (EXIGIR_TODOS) {
    problemas.push(
      `marcadores sin sustituir: ${leves.join(', ')}\n` +
      '      → con --exigir-todos (despliegue) toda variable tiene que llegar:\n' +
      '        el workflow las pasa todas, así que un marcador vivo es una que\n' +
      '        se cayó por el camino.',
    );
  } else {
    avisos.push(
      `sin sustituir (opcionales aquí): ${leves.join(', ')} — el despliegue las\n` +
      '     pasa y allí se exigen con --exigir-todos',
    );
  }
}
if (!graves.length && !leves.length) bien.push('ningún marcador %VARIABLE% sobrevive al build');

// ── 2 · La CSP existe y trae el par del backend ─────────────────────────────
if (!meta) {
  problemas.push(
    'no hay <meta http-equiv="Content-Security-Policy"> en build/index.html\n' +
    '      → Pages no admite cabeceras: sin este meta el sitio va SIN política.',
  );
} else {
  const politica = meta[1];
  const connect = politica
    .split(';')
    .map((d) => d.trim())
    .find((d) => /^connect-src\b/i.test(d));

  if (!connect) {
    problemas.push(
      "la política no declara `connect-src`\n" +
      "      → hereda de `default-src 'self'`, que deja fuera al backend.",
    );
  } else {
    const fuentes = connect.split(/\s+/).slice(1).filter(Boolean);
    const origen = (u) => { try { return new URL(u).host; } catch { return null; } };

    const sockets = fuentes.filter((f) => /^wss?:\/\//i.test(f));
    const webs = fuentes.filter((f) => /^https?:\/\//i.test(f));

    if (!sockets.length) {
      problemas.push(
        'connect-src no autoriza ningún `ws://` ni `wss://`\n' +
        `      fuentes: ${fuentes.join(' ') || '(ninguna)'}\n` +
        '      → o el origen del backend no llegó al build (variable ausente o\n' +
        '        vacía), o se quitó el esquema del WebSocket. En CSP3 una fuente\n' +
        '        `https://host` NO autoriza `wss://host`, así que las alertas\n' +
        '        quedarían mudas sin un solo error visible en la pantalla.',
      );
    } else {
      for (const ws of sockets) {
        const host = origen(ws);
        const gemelo = webs.find((w) => origen(w) === host);
        if (!gemelo) {
          problemas.push(
            `connect-src autoriza \`${ws}\` pero no el \`http(s)://${host}\` del mismo origen\n` +
            '      → las llamadas normales a la API quedarían bloqueadas.',
          );
        } else {
          bien.push(`connect-src autoriza el backend en los dos esquemas (${gemelo} + ${ws})`);
        }
      }
    }

    // ── 3 · Y es el backend con el que se compiló ─────────────────────────
    const esperado = (process.env.REACT_APP_BACKEND_URL || '').trim();
    if (esperado) {
      const host = origen(esperado);
      if (!host) {
        problemas.push(`REACT_APP_BACKEND_URL no es una URL válida: «${esperado}»`);
      } else if (!webs.some((w) => origen(w) === host)) {
        problemas.push(
          `se compiló con REACT_APP_BACKEND_URL=${esperado} pero connect-src no lo lleva\n` +
          `      fuentes: ${fuentes.join(' ')}`,
        );
      } else {
        bien.push(`el origen de connect-src es el del entorno (${host})`);
      }
    }
  }
}

// ── Veredicto ───────────────────────────────────────────────────────────────
console.log('CSP compilada — orígenes del backend en build/index.html');
bien.forEach((b) => console.log(`  ✓ ${b}`));
avisos.forEach((a) => console.log(`  ⚠️  ${a}`));

if (problemas.length) {
  problemas.forEach((p) => console.error(`  ❌ ${p}`));
  console.error(
    `\n❌ ${problemas.length} problema(s). El \`meta\` NO admite report-only: esto no se\n` +
    '   ensaya en producción, se descubre cuando la web ya no habla con la API.\n' +
    '   Compila con la variable puesta:\n' +
    '     (cd frontend && REACT_APP_BACKEND_URL=http://127.0.0.1:8080 npm run build)',
  );
  process.exit(1);
}

console.log('\n✅ La política compilada autoriza al backend en los dos esquemas.');
