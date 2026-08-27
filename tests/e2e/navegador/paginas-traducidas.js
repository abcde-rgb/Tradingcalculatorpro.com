#!/usr/bin/env node
/**
 * Que las páginas públicas se PINTEN en el idioma elegido.
 *
 * El hueco que esto cierra
 * ------------------------
 * `i18n-check` compara los juegos de claves entre los diez idiomas.
 * `i18n-traducido` comprueba que el valor no sea el inglés literal.
 * `i18n-escritura` comprueba que cada idioma use su alfabeto.
 *
 * Los tres miran el DICCIONARIO. Ninguno pregunta si la pantalla lo usa.
 *
 * Y durante meses no lo usaba: `AboutPage`, `ContactPage` y `NotFoundPage` no
 * tenían una sola llamada a `t()`. El texto iba en castellano dentro del JSX y
 * salía en castellano en los diez idiomas, con la cabecera y el pie
 * correctamente traducidos alrededor. Los tres verificadores en verde.
 *
 * Esta sonda mira lo que ve el usuario, en el build compilado, y hace las DOS
 * aserciones — porque la de omisión es la que ha fallado siempre aquí:
 *
 *   1. el texto del idioma pedido ESTÁ                     (afirmativa)
 *   2. el texto castellano equivalente NO está             (negativa)
 *
 * Sin la segunda, una página que pintara los dos daría verde.
 *
 *   node tests/e2e/navegador/paginas-traducidas.js
 *
 * Sabotaje (en los dos sentidos):
 *   · devuelve una página a su literal castellano  → tiene que FALLAR
 *   · déjalas como están                           → tiene que PASAR
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { rutaChromium } = require('../entorno');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const BUILD = path.join(RAIZ, 'frontend', 'build');
const PUERTO = 4177;

const BASE = (() => {
  try {
    const { homepage } = require(path.join(RAIZ, 'frontend', 'package.json'));
    return homepage ? new URL(homepage).pathname.replace(/\/$/, '') : '';
  } catch { return ''; }
})();

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };

/** Servidor estático con vuelta a index.html; la ruta se contiene dentro de BUILD. */
function servir() {
  return http.createServer((req, res) => {
    let limpio = decodeURIComponent(req.url.split('?')[0]);
    if (BASE && limpio.startsWith(BASE)) limpio = limpio.slice(BASE.length) || '/';
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
    } catch { res.writeHead(404); res.end('no'); }
  }).listen(PUERTO);
}

// Por pantalla: un trozo de texto propio de cada idioma que TIENE que salir, y
// el castellano equivalente que NO puede salir cuando el idioma no es español.
// Se eligen frases que sólo existen en esa página, no palabras sueltas.
const CASOS = [
  {
    ruta: '/about',
    castellano: 'Construido por traders',
    esperado: { en: 'Built by traders', de: 'Von Tradern gebaut', ja: 'トレーダーが作った' },
  },
  {
    ruta: '/about',
    castellano: 'Las herramientas profesionales de análisis',
    esperado: { en: 'Professional options-analysis tools', de: 'Professionelle Werkzeuge zur Optionsanalyse', ja: 'プロ向けのオプション分析ツール' },
  },
  {
    ruta: '/contact',
    castellano: '¿En qué podemos ayudarte?',
    esperado: { en: 'How can we help?', de: 'Wie können wir helfen?', ja: 'どうされましたか？' },
  },
  {
    ruta: '/contact',
    castellano: 'Ofrecemos reembolso completo dentro de los primeros 14 días',
    esperado: { en: 'We give a full refund within the first 14 days', de: 'erstatten wir innerhalb der ersten 14 Tage', ja: '最初の14日以内であれば全額返金' },
  },
  {
    ruta: '/esta-ruta-no-existe',
    castellano: 'Esta posición entró en stop-loss',
    esperado: { en: 'This position hit its stop-loss', de: 'Diese Position wurde ausgestoppt', ja: 'このポジションは損切りになりました' },
  },
  {
    ruta: '/login',
    castellano: '¿Olvidaste tu contraseña?',
    esperado: { en: 'Forgot your password?', de: 'Passwort vergessen?', ja: 'パスワードをお忘れですか？' },
  },
  {
    ruta: '/login',
    castellano: 'Iniciar con Magic Link (sin contraseña)',
    esperado: { en: 'Sign in with a Magic Link', de: 'Mit Magic Link anmelden', ja: 'Magic Link でログイン' },
  },
];

const IDIOMAS = ['en', 'de', 'ja'];

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
    process.exit(1);
  }

  const servidor = servir();
  const navegador = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const fallos = [];
  let comprobaciones = 0;

  for (const idioma of IDIOMAS) {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
    // El idioma se siembra como lo guarda zustand, antes de que arranque la app:
    // `bootI18n` lo lee y carga ESE diccionario antes del primer pintado.
    await ctx.addInitScript(([clave, valor]) => {
      try { window.localStorage.setItem(clave, valor); } catch (_) { /* modo privado */ }
    }, ['trading-i18n-storage', JSON.stringify({ state: { locale: idioma, autoDetected: true }, version: 0 })]);

    for (const caso of CASOS) {
      const pagina = await ctx.newPage();
      const url = `http://localhost:${PUERTO}${BASE}${caso.ruta}`;
      try {
        await pagina.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await pagina.waitForTimeout(600);          // el diccionario llega por import()
        const texto = await pagina.evaluate(() => document.body.innerText);

        const quiero = caso.esperado[idioma];
        comprobaciones += 2;

        if (!texto.includes(quiero)) {
          fallos.push(`${caso.ruta} [${idioma}] NO contiene «${quiero}»`);
        }
        // La aserción que faltaba: y tampoco puede salir el castellano.
        if (texto.includes(caso.castellano)) {
          fallos.push(`${caso.ruta} [${idioma}] sigue pintando el castellano «${caso.castellano}»`);
        }
      } catch (e) {
        fallos.push(`${caso.ruta} [${idioma}] no cargó: ${String(e).slice(0, 100)}`);
      }
      await pagina.close();
    }
    await ctx.close();
  }

  await navegador.close();
  servidor.close();

  if (fallos.length) {
    console.error(`\n❌ ${fallos.length} de ${comprobaciones} comprobaciones fallan:\n`);
    for (const f of fallos) console.error(`   · ${f}`);
    process.exit(1);
  }
  console.log(`✅ ${comprobaciones} comprobaciones: ${CASOS.length} textos × ${IDIOMAS.length} idiomas`);
  console.log('   (cada uno con su aserción negativa: el castellano no se cuela)');
  process.exit(0);
})();
