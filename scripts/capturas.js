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
    // ⚠️ La ruta se RESUELVE y se comprueba que sigue dentro de `BUILD`.
    // `path.join(BUILD, u)` con `u` sacado de la URL deja salir del directorio
    // con `..%2f..%2fetc/passwd`, y CodeQL lo marca como alta con razón: da
    // igual que este servidor sólo viva durante un test y escuche en local —
    // el patrón es el mismo que en producción, y aquí se copia y se pega.
    const raiz = path.join(BUILD, 'index.html');
    const pedido = path.resolve(BUILD, `.${path.posix.normalize(`/${limpio}`)}`);
    let f = pedido.startsWith(BUILD + path.sep) || pedido === BUILD ? pedido : raiz;
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      const indice = path.join(f, 'index.html');
      f = fs.existsSync(indice) ? indice : raiz;
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
  // Fallos DUROS: la captura no se pudo tomar, o se tomó del tema
  // equivocado. Distinto de un error de consola, que se informa pero no
  // invalida la foto.
  let fallosDuros = 0;

  for (const [nombreVista, viewport] of VISTAS) {
    for (const tema of temas) {
      const ctx = await navegador.newContext({ viewport, deviceScaleFactor: 1 });
      // El tema y el idioma viven en localStorage (lib/cloudPrefs.js). Se
      // siembran ANTES de que cargue la app; si no, la primera pintura sale con
      // el valor por defecto y la captura del tema oscuro sale clara.
      await ctx.addInitScript((t) => {
        // ⚠️ `lib/theme.js` guarda el tema con el `persist` de zustand bajo
        // `trading-theme-storage`, y lo lee como `JSON.parse(...).state.theme`.
        // Aquí se escribía `localStorage.setItem('theme', t)` —clave inventada,
        // sin el sobre de zustand—, que la aplicación no lee jamás: las 18
        // capturas «light» eran el tema OSCURO, píxel por píxel idénticas a su
        // pareja en seis pantallas, y el log las daba por buenas.
        //
        // El comentario de abajo ya avisaba de esto para la cookie: la clave
        // SALE DEL CÓDIGO. Con el tema no se hizo y se supuso.
        localStorage.setItem('trading-theme-storage',
          JSON.stringify({ state: { theme: t }, version: 0 }));
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
          // Quitar la carga perezosa ANTES del barrido.
          //
          // No basta con esperar a que las imágenes carguen: en una captura de
          // página completa Chromium redimensiona el viewport a los 8.800 px de
          // la portada y **descarta lo decodificado de las imágenes lejanas**,
          // así que los logotipos de la marquesina se pintaban como huecos de
          // 286×286 aunque `complete` fuera true y `naturalWidth` valiera 400.
          // Fotografiado con la marquesina parada se veían perfectamente: era la
          // captura, no el producto. Con `eager` se quedan.
          await pagina.evaluate(() => {
            for (const img of document.images) img.loading = 'eager';
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

          // El tema que se pidió tiene que ser el que se fotografía.
          //
          // Sin esta comprobación, sembrar mal el localStorage no rompe nada:
          // sale una captura perfectamente válida del tema por defecto con el
          // nombre del otro. Pasó dieciocho veces seguidas y el log dijo ✅
          // dieciocho veces. Una captura que miente sobre lo que retrata es
          // peor que no tenerla, porque se usa para decidir.
          const modo = await pagina.evaluate(() => ({
            claro: document.documentElement.classList.contains('light'),
            oscuro: document.documentElement.classList.contains('dark'),
          }));
          const esperado = tema === 'light';
          if (modo.claro !== esperado || modo.oscuro === esperado) {
            throw new Error(
              `el tema no se aplicó: se pidió "${tema}" y <html> lleva `
              + `${modo.claro ? 'light' : ''}${modo.oscuro ? 'dark' : ''}`
              + ' — revisa la clave de localStorage contra lib/theme.js');
          }

          // Las imágenes perezosas (`loading="lazy"`) empiezan a cargar al
          // entrar en el viewport durante el barrido de arriba, pero pueden no
          // haber terminado de decodificar cuando se dispara la foto. Los
          // logotipos de la marquesina salían como huecos negros de 286×286 y
          // parecían un fallo del producto. Se espera a que todas terminen.
          //
          // ⚠️ Con plazo, y no por prudencia genérica: una imagen `lazy` que
          // nunca llega a entrar en el viewport se queda con `complete=false`
          // PARA SIEMPRE —no ha empezado a cargar, así que no va a disparar ni
          // `onload` ni `onerror`—. La primera versión de esto esperaba a todas
          // sin plazo y la tanda se colgó indefinidamente sin escribir un solo
          // fichero. Esperar es correcto; esperar sin límite es un cuelgue.
          await pagina.evaluate(() => Promise.race([
            Promise.all([...document.images]
              .filter((i) => !i.complete)
              .map((i) => new Promise((r) => { i.onload = r; i.onerror = r; }))),
            new Promise((r) => setTimeout(r, 3000)),
          ]));
          const sinPintar = await pagina.evaluate(() => [...document.images]
            .filter((i) => i.currentSrc && !i.naturalWidth).map((i) => i.currentSrc).slice(0, 3));

          // Parar las animaciones CSS antes de disparar.
          //
          // No es por estética ni por determinismo (que también): un elemento
          // con una animación de `transform` vive en su propia capa del
          // compositor, y en una captura de página completa —donde Chromium
          // extiende el viewport a los 8.800 px de la portada— esas capas **no
          // se rasterizan fuera del viewport visible**. La marquesina de socios
          // salía con los cuatro logotipos en blanco mientras `naturalWidth`
          // valía 400 y la consola no decía nada. Parada, se rasteriza.
          //
          // Se comprobó antes que no era el producto: fotografiando el elemento
          // con la animación detenida, los logos estaban ahí.
          await pagina.addStyleTag({
            content: '*, *::before, *::after { animation: none !important;'
              + ' transition: none !important; }',
          });
          await pagina.waitForTimeout(200);

          // Agrandar el VIEWPORT hasta la página entera y fotografiar sin
          // `fullPage`, en vez de usar `fullPage` sobre un viewport de 900 px.
          //
          // No es equivalente. Con `fullPage`, Chromium compone una imagen más
          // alta que el viewport y **las imágenes que quedan fuera de él no
          // llegan a rasterizarse**: los cuatro logotipos de la marquesina
          // salían como rectángulos vacíos de 286×286 mientras `complete` era
          // true, `naturalWidth` valía 400 y la consola no decía nada. Se
          // descartó una por una que fuera el producto: la misma página, en el
          // mismo instante y con la animación parada, fotografiada como
          // viewport normal enseña los logos; en `fullPage`, no. Ni `eager` ni
          // esperar al `decode` lo arreglan, porque no es un problema de carga.
          //
          // Con el viewport a la altura del documento todo cae dentro y se
          // pinta. El ancho no se toca, así que el layout responsive es el
          // mismo que se pidió.
          const alto = await pagina.evaluate(() => Math.min(
            Math.max(document.body.scrollHeight, document.documentElement.scrollHeight), 20000));
          if (alto > viewport.height) {
            await pagina.setViewportSize({ width: viewport.width, height: alto });
            await pagina.waitForTimeout(400);
          }

          const fichero = path.join(SALIDA, `${nombre}__${nombreVista}__${tema}.png`);
          await pagina.screenshot({ path: fichero });
          hechas++;
          const marca = [errores.length ? `⚠️  ${errores.length} error(es) de consola` : '',
                         sinPintar.length ? `⚠️  ${sinPintar.length} imagen(es) sin pintar` : '',
                         revelados ? `(${revelados} animaciones forzadas)` : ''].filter(Boolean).join(' ');
          console.log(`  ✅ ${nombre.padEnd(22)} ${nombreVista.padEnd(11)} ${tema.padEnd(6)} ${marca}`);
          if (errores.length) problemas.push({ ruta, nombreVista, tema, errores });
          if (sinPintar.length) problemas.push({ ruta, nombreVista, tema, errores: sinPintar.map((s) => `[imagen sin pintar] ${s}`) });
        } catch (e) {
          console.log(`  ❌ ${nombre.padEnd(22)} ${nombreVista.padEnd(11)} ${tema.padEnd(6)} ${String(e).slice(0, 90)}`);
          problemas.push({ ruta, nombreVista, tema, errores: [String(e).slice(0, 160)] });
          fallosDuros += 1;
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

  // ⚠️ Esto salía SIEMPRE con 0. Una tanda que no llegó a tomar una sola
  // captura válida —build roto, tema mal sembrado, servidor caído— le decía
  // «bien» a quien la llamara. Los errores de consola siguen siendo informe:
  // la foto es válida y ya se dice arriba. Lo que sale con 1 es no tener foto,
  // o tenerla del tema que no se pidió.
  if (fallosDuros) {
    console.error(`\n❌ ${fallosDuros} captura(s) no se pudieron tomar o salieron del tema equivocado.`);
    process.exit(1);
  }
  process.exit(0);
})();
