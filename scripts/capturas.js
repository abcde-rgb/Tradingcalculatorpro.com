#!/usr/bin/env node
/**
 * Capturas de las pantallas públicas — el camino RÁPIDO.
 *
 * Por qué existe
 * --------------
 * El skill `qa` ya hace capturas, pero es el camino pesado: levanta Postgres,
 * uvicorn, siembra datos y recorre la app autenticada. Para «¿esto se ve bien?»
 * es demasiado, y lo que pasaba en la práctica es que lo visual se verificaba
 * LEYENDO CÓDIGO — que para un producto cuyo valor es visual no verifica nada.
 *
 * Esto sirve el build estático y fotografía lo que hay fuera del muro de pago,
 * sin base de datos y sin backend. No sustituye a `qa`: lo precede.
 *
 * Además de la foto, recoge los **errores de consola** de cada página. Una
 * captura bonita de una pantalla que escupe errores en la consola es una
 * captura que engaña.
 *
 * Uso
 * ---
 *     npm run build            # una vez (necesita frontend/build/)
 *     node scripts/capturas.js
 *     node scripts/capturas.js --solo=/pricing --tema=dark
 *
 * Salida en `.capturas/` (ignorado por git).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const BUILD = path.join(RAIZ, 'frontend', 'build');
const SALIDA = path.join(RAIZ, '.capturas');
const PUERTO = 4173;

// El build se publica en un subdirectorio de GitHub Pages, así que `homepage`
// en package.json hace que los assets cuelguen de `/Tradingcalculatorpro.com/`.
// Servir desde la raíz devolvía index.html para cada .js, y el navegador se
// comía un `SyntaxError: Unexpected token '<'`: las capturas salían EN BLANCO y
// parecían correctas en el log. De ahí que la base se derive, no se suponga.
const BASE = (() => {
  try {
    const { homepage } = require(path.join(RAIZ, 'frontend', 'package.json'));
    return homepage ? new URL(homepage).pathname.replace(/\/$/, '') : '';
  } catch { return ''; }
})();

// Sólo lo que vive FUERA del muro de pago. Todo lo demás exige suscripción
// activa y saldría como una redirección a /pricing: una captura de la pantalla
// equivocada es peor que ninguna captura.
const PANTALLAS = [
  ['/',                    'landing'],
  ['/pricing',             'precios'],
  ['/options',             'opciones-publico'],
  ['/options/strategies',  'opciones-estrategias'],
  ['/login',               'entrar'],
  ['/register',            'registro'],
  ['/legal',               'legal'],
  ['/contact',             'contacto'],
  ['/about',               'sobre'],
];

const VISTAS = [
  ['escritorio', { width: 1440, height: 900 }],
  ['movil',      { width: 390,  height: 844 }],
];

const args = process.argv.slice(2);
const arg = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1];
const soloRuta = arg('solo');
const temas = arg('tema') ? [arg('tema')] : ['light', 'dark'];

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json' };

/** Servidor estático con vuelta a index.html: la app usa rutas de navegador. */
function servir() {
  return http.createServer((req, res) => {
    let limpio = decodeURIComponent(req.url.split('?')[0]);
    if (BASE && limpio.startsWith(BASE)) limpio = limpio.slice(BASE.length) || '/';
    let f = path.join(BUILD, limpio);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      const indice = path.join(f, 'index.html');
      f = fs.existsSync(indice) ? indice : path.join(BUILD, 'index.html');
    }
    try {
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
      res.end(fs.readFileSync(f));
    } catch {
      res.writeHead(404); res.end('no');
    }
  }).listen(PUERTO);
}

(async () => {
  if (!fs.existsSync(path.join(BUILD, 'index.html'))) {
    console.error('✗ Falta frontend/build. Genéralo primero:  cd frontend && npm run build');
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = require(path.join(RAIZ, 'frontend', 'node_modules', 'playwright')));
  } catch {
    console.error('✗ Falta playwright en frontend/node_modules.');
    console.error('  Ejecuta antes:  bash scripts/preparar-entorno.sh');
    process.exit(1);
  }

  fs.rmSync(SALIDA, { recursive: true, force: true });
  fs.mkdirSync(SALIDA, { recursive: true });

  const servidor = servir();

  // El navegador YA viene en la imagen. Nunca ejecutes `npx playwright install`:
  // volvería a descargar Chromium entero y en el sandbox tarda o falla.
  //
  // Playwright pide la versión exacta que su paquete fija (p. ej. la build 1234)
  // y la imagen trae otra (la 1194), así que la búsqueda automática falla con un
  // «Executable doesn't exist» que invita justamente a descargarlo. La salida es
  // pasarle el binario a mano: cualquier Chromium reciente sirve para tomar
  // capturas, y el que hay está instalado y probado.
  const candidatos = [
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    ...fs.existsSync('/opt/pw-browsers')
      ? fs.readdirSync('/opt/pw-browsers')
          .filter((d) => d.startsWith('chromium'))
          .map((d) => path.join('/opt/pw-browsers', d, 'chrome-linux', 'chrome'))
      : [],
  ];
  const executablePath = candidatos.find((p) => fs.existsSync(p));
  if (executablePath) console.log(`  (navegador de la imagen: ${executablePath})\n`);

  const navegador = await chromium.launch({
    args: ['--no-sandbox'],
    ...(executablePath ? { executablePath } : {}),
  });

  const pantallas = soloRuta ? PANTALLAS.filter(([r]) => r === soloRuta) : PANTALLAS;
  const problemas = [];
  let hechas = 0;

  for (const [nombreVista, viewport] of VISTAS) {
    for (const tema of temas) {
      const ctx = await navegador.newContext({ viewport, deviceScaleFactor: 1 });
      // El tema y el idioma viven en localStorage (lib/cloudPrefs.js). Se
      // siembran ANTES de que cargue la app; si no, la primera pintura sale con
      // el valor por defecto y la captura del tema oscuro sale clara.
      await ctx.addInitScript((t) => {
        localStorage.setItem('theme', t);
        // La clave y el valor SALEN DEL CÓDIGO (components/common/CookieBanner.jsx:
        // CONSENT_KEY = 'tcp-cookie-consent', niveles 'all' | 'essential'). Con una
        // clave inventada el banner seguía saliendo y tapaba la calculadora de la
        // portada en las 36 capturas — y el log las daba por buenas.
        localStorage.setItem('tcp-cookie-consent', 'all');
      }, tema);

      for (const [ruta, nombre] of pantallas) {
        const pagina = await ctx.newPage();
        // Cortar TODO lo que no sea el servidor local. En el sandbox la red de
        // salida está restringida, así que cada fuente de Google, cada script de
        // GA4 y el widget de TradingView se quedaban esperando hasta agotar el
        // tiempo: la tanda entera tardaba 8 minutos y el informe de errores de
        // consola era 90 % ruido de túnel. Cortándolos, la página se pinta con
        // lo que de verdad sirve el build, que es lo que queremos fotografiar.
        await pagina.route('**', (ruta_) => {
          const u = ruta_.request().url();
          if (u.startsWith(`http://localhost:${PUERTO}`) || u.startsWith('data:')) return ruta_.continue();
          return ruta_.abort();
        });
        const errores = [];
        // Lo que hemos cortado nosotros no es un fallo de la página.
        const ruidoDeRed = /ERR_FAILED|ERR_BLOCKED|ERR_TUNNEL|ERR_CONNECTION|net::/i;
        pagina.on('console', (m) => {
          if (m.type() !== 'error') return;
          const txt = m.text().slice(0, 160);
          if (!ruidoDeRed.test(txt)) errores.push(txt);
        });
        pagina.on('pageerror', (e) => errores.push(`[excepción] ${String(e).slice(0, 160)}`));

        try {
          await pagina.goto(`http://localhost:${PUERTO}${BASE}${ruta}`, {
            waitUntil: 'domcontentloaded', timeout: 20000,
          });
          // Recorrer la página ANTES de fotografiar. Tres componentes usan
          // `whileInView` de framer-motion: arrancan con opacity 0 y sólo
          // aparecen cuando entran en el viewport. En una captura de página
          // completa sin scroll previo, medio sitio salía en blanco —secciones
          // con título y nada debajo— y parecía un fallo del producto cuando era
          // un fallo de la captura. Justo «la captura que engaña».
          await pagina.evaluate(async () => {
            await new Promise((listo) => {
              let y = 0;
              const paso = () => {
                window.scrollBy(0, window.innerHeight * 0.8);
                y += window.innerHeight * 0.8;
                if (y < document.body.scrollHeight) setTimeout(paso, 90);
                else { window.scrollTo(0, 0); setTimeout(listo, 250); }
              };
              paso();
            });
          });
          await pagina.waitForTimeout(900);

          // Y aun así queda gente en `opacity: 0`: `whileInView` de framer-motion
          // usa un IntersectionObserver que, en una captura de página completa,
          // no llega a disparar para todo. Medido en la portada: 51 elementos
          // invisibles repartidos por 12 secciones, que salían con TÍTULO Y NADA
          // DEBAJO. Parecía un producto roto y era una captura rota.
          //
          // El arreglo es dirigido a propósito: sólo se tocan los elementos que
          // llevan la huella de framer —opacidad 0 puesta en el `style` en línea—.
          // Un `opacity: 1 !important` global sacaría también modales y menús que
          // deben estar ocultos, y entonces la captura mentiría en el otro sentido.
          const revelados = await pagina.evaluate(() => {
            let n = 0;
            for (const el of document.querySelectorAll('[style*="opacity"]')) {
              if (getComputedStyle(el).opacity === '0') {
                el.style.opacity = '1';
                el.style.transform = 'none';
                n++;
              }
            }
            return n;
          });
          if (revelados) await pagina.waitForTimeout(250);
          const fichero = path.join(SALIDA, `${nombre}__${nombreVista}__${tema}.png`);
          await pagina.screenshot({ path: fichero, fullPage: true });
          hechas++;
          const marca = [errores.length ? `⚠️  ${errores.length} error(es) de consola` : '',
                         revelados ? `(${revelados} animaciones forzadas)` : ''].filter(Boolean).join(' ');
          console.log(`  ✅ ${nombre.padEnd(22)} ${nombreVista.padEnd(11)} ${tema.padEnd(6)} ${marca}`);
          if (errores.length) problemas.push({ ruta, nombreVista, tema, errores });
        } catch (e) {
          console.log(`  ❌ ${nombre.padEnd(22)} ${nombreVista.padEnd(11)} ${tema.padEnd(6)} ${String(e).slice(0, 90)}`);
          problemas.push({ ruta, nombreVista, tema, errores: [String(e).slice(0, 160)] });
        }
        await pagina.close();
      }
      await ctx.close();
    }
  }

  await navegador.close();
  servidor.close();

  console.log(`\n${hechas} capturas en .capturas/`);
  if (problemas.length) {
    console.log(`\n⚠️  ${problemas.length} pantalla(s) con errores de consola:`);
    for (const p of problemas.slice(0, 10)) {
      console.log(`  ${p.ruta} (${p.nombreVista}/${p.tema}):`);
      for (const e of [...new Set(p.errores)].slice(0, 3)) console.log(`     ${e}`);
    }
    console.log('\n  Una captura bonita de una pantalla que escupe errores engaña.');
  } else {
    console.log('✅ ninguna pantalla escupió errores de consola');
  }
  process.exit(0);
})();
