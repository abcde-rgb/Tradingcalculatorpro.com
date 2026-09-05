#!/usr/bin/env node
/* eslint-disable */
/**
 * Verifica las páginas prerenderizadas que genera `gen-seo-pages.js`.
 *
 * Por qué existe
 * --------------
 * El `postbuild` genera **1.630 páginas** indexables (calculadoras, academia,
 * mercados y estrategias × 10 idiomas) y un sitemap de 1.639 URLs. Es, con
 * diferencia, el mayor activo de captación del proyecto — y hasta el 2026-08-27
 * **nada lo comprobaba**: ni CI, ni un script. La skill `auditar-seo-spa` era una
 * lista para leer a mano, y una lista que se lee a mano se lee una vez.
 *
 * Eso importa porque los fallos de SEO son silenciosos por naturaleza. Un
 * canonical que apunta a otra página no rompe nada visible: simplemente Google
 * deja de indexar la página, y no hay forma de enterarse sin mirar. Lo mismo un
 * hreflang que se deja un idioma, o un sitemap que anuncia URLs que no existen.
 * La web sigue funcionando perfectamente mientras deja de captar.
 *
 * Qué comprueba
 * -------------
 *   1. Canonical presente, absoluto, del dominio propio y **auto-referente**:
 *      la página /de/learn/x/ tiene que declararse canónica de sí misma. Un
 *      canonical cruzado le dice a Google que no indexe esta página.
 *   2. hreflang completo: los 10 idiomas + `x-default`, sin repetidos, y con la
 *      página incluyéndose a sí misma (reciprocidad). Google descarta el grupo
 *      entero si un miembro no devuelve el favor.
 *   3. `<html lang>` coincide con la carpeta del idioma, y `dir="rtl"` en árabe.
 *   4. `<title>` y `<meta description>` presentes y no vacíos.
 *   5. El sitemap y los ficheros dicen lo mismo en las DOS direcciones: ni una
 *      URL anunciada que no exista (404 servido a un crawler), ni una página
 *      generada que el sitemap no anuncie.
 *   6. El JSON-LD parsea. Un `<script type="application/ld+json">` con una coma
 *      de más no da error en pantalla: Google lo descarta y se pierde el
 *      resultado enriquecido, en silencio.
 *
 * Uso
 * ---
 *     cd frontend && npm run build && node scripts/check-seo.js
 *     node scripts/check-seo.js --breve     # sólo el resumen
 *
 * Sale 1 si algo falla. Necesita `build/`: sin él no hay nada que mirar y lo
 * dice, en vez de pasar en verde sobre cero páginas —que es la forma más fácil
 * de tener un verificador que no verifica nada—.
 */
const fs = require('fs');
const path = require('path');

// Quitar barras finales sin cuantificador de expresión regular.
//
// Estaba escrito como `.replace(/\/+$/, '')` sobre cadenas que salen del
// sitemap y de las páginas —es decir, datos que no controla este script—, y
// `\/+$` obliga al motor a retroceder: con una URL de muchas barras el coste
// es cuadrático. Es `js/polynomial-redos`, alerta alta de CodeQL. Un recorrido
// hacia atrás es lineal y hace exactamente lo mismo.
const sinBarras = (s) => {
  let i = s.length;
  while (i > 0 && s[i - 1] === '/') i -= 1;
  return s.slice(0, i);
};

// Equivalente a `.replace(/\/+$/, '/')`: colapsa las barras finales a UNA sola,
// y deja intacta la cadena que no acaba en barra. Ojo con esa segunda mitad —
// `sinBarras(s) + '/'` a secas añadiría una barra donde no la había y rompería
// la comparación entre el canonical y su <loc>.
const unaBarra = (s) => (s.endsWith('/') ? `${sinBarras(s)}/` : s);

const BUILD = path.join(__dirname, '..', 'build');
const DEFAULT_ORIGIN = 'https://tradingcalculator.pro';
const DOMAIN = sinBarras(process.env.SITE_ORIGIN || DEFAULT_ORIGIN);
const BREVE = process.argv.includes('--breve');

// Los mismos diez de `gen-seo-pages.js` e `i18n-check.js`. Si divergen, el
// verificador lo dice: es el primer síntoma de que alguien añadió un idioma a
// medias.
const LANGS = [
  ['es', '', 'es'], ['en', '/en', 'en'], ['de', '/de', 'de'], ['fr', '/fr', 'fr'],
  ['ru', '/ru', 'ru'], ['zh', '/zh', 'zh-CN'], ['ja', '/ja', 'ja'], ['ar', '/ar', 'ar'],
  ['pt', '/pt', 'pt'], ['it', '/it', 'it'],
];
const HREFLANGS = new Set([...LANGS.map(([, , h]) => h), 'x-default']);
const PREFIJOS = new Map(LANGS.map(([l, p]) => [p.replace(/^\//, ''), l]));

// Compara el ORIGEN de dos URLs, no su prefijo de texto.
//
// Estuvo escrito como `url.startsWith(DOMINIO)` y CodeQL lo marcó como alerta
// alta (`js/incomplete-url-substring-sanitization`). Tenía razón, y no era
// teórico: `https://tradingcalculator.pro.evil.com/x` empieza por
// `https://tradingcalculator.pro`, así que un canonical secuestrado hacia un
// subdominio ajeno pasaba por bueno — que es exactamente lo que este
// verificador existe para cazar.
const mismoOrigen = (url, referencia) => {
  try { return new URL(url).origin === new URL(referencia).origin; }
  catch { return false; }
};

// La ruta de una URL sin depender de la longitud del dominio.
const rutaDe = (url) => { try { return new URL(url).pathname; } catch { return url; } };

// ── robots.txt, resuelto como lo resuelve un rastreador ─────────────────────
// Gana la regla cuyo patrón case MÁS LARGO, sea `Allow` o `Disallow`; a igual
// longitud gana `Allow`. Es lo que dice la especificación y lo que hacen
// Google, Bing y Yandex. Vive aquí arriba porque lo usan dos comprobaciones:
// la del sitemap y la de los enlaces internos.
let reglasRobots = [];               // { permite, patron }
function cargarRobots(texto) {
  reglasRobots = [];
  let enComodin = false;
  for (const l of texto.split('\n').map((x) => x.trim())) {
    const ua = l.match(/^User-agent:\s*(.+)$/i);
    if (ua) { enComodin = ua[1].trim() === '*'; continue; }
    if (!enComodin) continue;
    const r = l.match(/^(Allow|Disallow):\s*(\S*)\s*$/i);
    if (r && r[2]) reglasRobots.push({ permite: /^allow$/i.test(r[1]), patron: r[2] });
  }
}
// Coincidencia de un patrón: prefijo, con `*` como comodín y `$` como final de
// ruta. Devuelve la longitud del patrón, o -1.
const casaRobots = (patron, ruta) => {
  const anclado = patron.endsWith('$');
  const cuerpo = anclado ? patron.slice(0, -1) : patron;
  const re = new RegExp(`^${cuerpo.split('*').map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}${anclado ? '$' : ''}`);
  return re.test(ruta) ? patron.length : -1;
};
function veredictoRobots(ruta) {
  let mejor = null;
  for (const r of reglasRobots) {
    const n = casaRobots(r.patron, ruta);
    if (n < 0) continue;
    if (!mejor || n > mejor.n || (n === mejor.n && r.permite)) mejor = { n, ...r };
  }
  return mejor;
}

const problemas = new Map();          // tipo → [{pagina, detalle}]
const anota = (tipo, pagina, detalle) => {
  if (!problemas.has(tipo)) problemas.set(tipo, []);
  problemas.get(tipo).push({ pagina, detalle });
};

// ── recolectar las páginas generadas ────────────────────────────────────────
// Sólo las de `gen-seo-pages.js`: index.html dentro de una carpeta con nombre.
// El index.html raíz y el 404.html los produce craco y tienen otras reglas.
function paginas(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) paginas(p, out);
    else if (e.name === 'index.html' && path.relative(BUILD, dir) !== '') out.push(p);
  }
  return out;
}

// ── utilidades de lectura ───────────────────────────────────────────────────
const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const urlDe = (fichero) =>
  `${DOMAIN}/${path.relative(BUILD, path.dirname(fichero)).split(path.sep).join('/')}/`;

function idiomaDe(rel) {
  const primero = rel.split('/')[0];
  return PREFIJOS.has(primero) ? PREFIJOS.get(primero) : 'es';
}

// ── páginas puente ──────────────────────────────────────────────────────────
// Al traducir los slugs por idioma, cada URL vieja se queda publicada como
// puente: `meta refresh` a cero + `canonical` al destino. GitHub Pages no
// sirve cabeceras, así que un 301 de verdad es imposible y esto es lo más
// fuerte que se puede emitir.
//
// No se les aplica el examen normal —no son páginas, son redirecciones— pero
// tampoco se les perdona: un puente que apunte a una URL que no existe es un
// 404 con dos pasos, y un puente que además esté en el sitemap le pide a
// Google que indexe una redirección. Las dos cosas se comprueban abajo.
const puentes = new Map();   // rel → destino
const esPuente = (html) => /<meta http-equiv="refresh"/i.test(html);

function revisarPuente(fichero, html, rel) {
  const destino = attr(html, /<meta http-equiv="refresh" content="0;\s*url=([^"]+)"/i);
  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/);
  if (!destino) { anota('puente sin destino', rel, 'el meta refresh no trae URL'); return; }

  // El refresh va RELATIVO a la raíz y el canonical ABSOLUTO, y cada uno por su
  // motivo. El canonical nombra el dominio porque es la señal que transfiere la
  // indexación. El refresh NO puede nombrarlo: un puente servido desde otro
  // origen sacaría al visitante de donde está. Pasó — la sonda de CSP siguió
  // uno hasta el sitio de producción y midió allí la política equivocada— y
  // habría hecho lo mismo desde la URL de proyecto de GitHub Pages.
  if (/^https?:\/\//i.test(destino))
    anota('puente con refresh absoluto (saca al visitante de su origen)', rel, destino);
  else if (!destino.startsWith('/'))
    anota('puente con refresh relativo a la carpeta', rel, `${destino} — tiene que empezar por "/"`);

  if (!canonical) anota('puente sin canonical', rel, 'sólo el refresh no transfiere la señal');
  else if (!mismoOrigen(canonical, DOMAIN)) anota('puente con canonical a otro dominio', rel, canonical);
  else if (unaBarra(rutaDe(canonical)) !== unaBarra(destino))
    anota('puente con canonical y refresh discordantes', rel, `${rutaDe(canonical)} ≠ ${destino}`);
  // Un puente NO puede llevar noindex: contradiría al canonical y le diría a
  // Google que no siga la mudanza.
  const robots = attr(html, /<meta name="robots" content="([^"]*)"/);
  if (robots && /noindex/i.test(robots)) anota('puente con noindex', rel, robots);
  // Se guarda en forma absoluta para poder cruzarlo con el sitemap y con las
  // páginas generadas, que van así.
  puentes.set(rel, unaBarra(`${DOMAIN}${destino.startsWith('/') ? destino : `/${destino}`}`));
}

// ── el examen de una página ─────────────────────────────────────────────────
function revisar(fichero) {
  const html = fs.readFileSync(fichero, 'utf8');
  const rel = path.relative(BUILD, path.dirname(fichero)).split(path.sep).join('/');
  const propia = urlDe(fichero);
  const lang = idiomaDe(rel);

  if (esPuente(html)) { revisarPuente(fichero, html, rel); return null; }

  // 0 · icono declarado
  //
  // Ninguna de las 1.640 páginas lo traía, y por eso el sitio salía en Yandex
  // con el globo genérico en vez de su marca. El favicon de la raíz no basta:
  // el buscador lee el que declara la página que ha indexado, y aquí las
  // páginas que se indexan son éstas, no la portada.
  if (!/<link rel="icon"/i.test(html)) anota('sin favicon declarado', rel, '');

  // 0b · ningún subrecurso con URL absoluta.
  //
  // Estas páginas llevan una CSP dura propia: `default-src 'none'` con
  // `img-src 'self' data:`. Un icono declarado como
  // `https://tradingcalculator.pro/favicon.ico` es «otro origen» en cuanto la
  // página NO se sirve exactamente desde ahí, y el navegador lo bloquea. Pasó:
  // los cuatro iconos salían absolutos y la sonda `csp.js` cantó 31
  // violaciones sirviendo el build desde `127.0.0.1`.
  //
  // En producción habría funcionado por casualidad, mientras el dominio
  // coincidiera, y se habría roto en el banco de pruebas, en la URL de proyecto
  // de GitHub Pages —que se conserva por si cae el DNS— y en cualquier
  // previsualización. Se comprueba aquí, sin navegador, porque `csp.js`
  // necesita CI y un Chromium: los fallos que sólo caza la sonda cara son los
  // que vuelven.
  //
  // `canonical`, `alternate` y `og:*` quedan fuera a propósito: son metadatos,
  // NO los carga la página, y deben ser absolutos.
  //
  // Y la regla se aplica SÓLO a las páginas de política dura, las que declaran
  // `default-src 'none'`: ésas no autorizan ningún origen externo, así que
  // cualquier URL absoluta es una violación. Los shells de las rutas del SPA
  // llevan otra CSP —que sí permite Google Fonts y GTM a propósito— y
  // prohibírselo aquí serían 18 falsos positivos por build. Un verificador que
  // grita sin motivo se acaba apagando, y con él la comprobación que sí servía.
  const csp = attr(html, /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/i) || '';
  if (/default-src\s+'none'/.test(csp)) {
    for (const m of html.matchAll(/<link\s+rel="(?!canonical|alternate)([^"]+)"[^>]*href="(https?:\/\/[^"]+)"/gi))
      anota('subrecurso absoluto en una página con default-src \'none\'', rel, `${m[1]} → ${m[2]}`);
    for (const m of html.matchAll(/<(?:img|script|iframe)[^>]+src="(https?:\/\/[^"]+)"/gi))
      anota('subrecurso absoluto en una página con default-src \'none\'', rel, m[1]);
  }

  // 1 · canonical
  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/);
  if (!canonical) anota('canonical ausente', rel, '');
  else if (!mismoOrigen(canonical, DOMAIN)) anota('canonical a otro dominio', rel, canonical);
  else if (unaBarra(canonical) !== unaBarra(propia))
    anota('canonical NO auto-referente', rel, `dice ${canonical}`);

  // 2 · hreflang
  const alt = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"\s+href="([^"]+)"/g)];
  // Un `x-default` SOLO y auto-referente no es un juego incompleto: es la
  // declaración correcta de una página que tiene UNA versión para todo el
  // mundo. Es el caso de las rutas de aplicación (`/pricing/`, `/about/`…):
  // la SPA traduce en cliente, así que no existe `/en/pricing/` que declarar.
  // Exigirles los diez idiomas empujaría justo al error que `public/index.html`
  // documenta — diez URLs sirviendo el mismo HTML.
  const soloXDefault = alt.length === 1 && alt[0][1] === 'x-default'
    && unaBarra(alt[0][2]) === unaBarra(propia);
  if (alt.length && !soloXDefault) {
    const vistos = alt.map((m) => m[1]);
    const faltan = [...HREFLANGS].filter((h) => !vistos.includes(h));
    const dup = vistos.filter((h, i) => vistos.indexOf(h) !== i);
    if (faltan.length) anota('hreflang incompleto', rel, `faltan ${faltan.join(', ')}`);
    if (dup.length) anota('hreflang duplicado', rel, [...new Set(dup)].join(', '));
    const propio = LANGS.find(([l]) => l === lang)?.[2];
    if (propio && !vistos.includes(propio))
      anota('hreflang sin reciprocidad', rel, `no se incluye a sí misma (${propio})`);
  }

  // 3 · lang y dirección
  const htmlLang = attr(html, /<html lang="([^"]+)"/);
  if (htmlLang !== lang) anota('<html lang> incorrecto', rel, `dice "${htmlLang}", toca "${lang}"`);
  if (lang === 'ar' && !/dir="rtl"/.test(html)) anota('árabe sin dir="rtl"', rel, '');

  // 4 · título y descripción
  const titulo = attr(html, /<title>([^<]*)<\/title>/);
  if (!titulo || !titulo.trim()) anota('sin <title>', rel, '');
  const desc = attr(html, /<meta name="description" content="([^"]*)"/);
  if (!desc || !desc.trim()) anota('sin description', rel, '');
  // Una descripción cortada a media palabra la descarta el buscador y se
  // inventa el resumen con el texto de la página. Pasó: las 1.640 salían de un
  // `.slice(0, 158)` y la rusa de `operar-noticias` terminaba en «счётом. И»
  // —arranque de «Используйте»—, así que Yandex publicaba en su lugar el
  // descargo legal del pie. Se exige que acabe en puntuación, en «…» o en una
  // palabra entera.
  else if (/[\p{L}\p{N}]$/u.test(desc) && desc.length >= 150)
    anota('description cortada a media palabra', rel, `…${desc.slice(-28)}`);

  // og:locale con el formato que exige Open Graph (`idioma_TERRITORIO`).
  const ogLoc = attr(html, /<meta property="og:locale" content="([^"]*)"/);
  if (ogLoc && !/^[a-z]{2}_[A-Z]{2}$/.test(ogLoc))
    anota('og:locale mal formado', rel, `"${ogLoc}" — toca algo como "ru_RU"`);

  // 6 · JSON-LD que parsee
  for (const m of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const datos = JSON.parse(m[1]);
      // `@graph` combina varios tipos bajo un solo @context (p. ej. una
      // calculadora que además publica su HowTo): no lleva `@type` en la
      // raíz a propósito, lo lleva cada entrada del array.
      const tipado = datos['@type']
        || (Array.isArray(datos['@graph']) && datos['@graph'].length > 0
            && datos['@graph'].every((n) => n && n['@type']));
      if (!datos['@context'] || !tipado)
        anota('JSON-LD sin @context/@type', rel, '');
    } catch (e) {
      anota('JSON-LD que no parsea', rel, e.message.slice(0, 60));
    }
  }
  return propia;
}

// ── main ────────────────────────────────────────────────────────────────────
if (!fs.existsSync(BUILD)) {
  console.error('✗ No existe frontend/build/.');
  console.error('  Este verificador mira las páginas GENERADAS, así que sin build no');
  console.error('  hay nada que comprobar. Ejecuta antes: cd frontend && npm run build');
  process.exit(1);
}

const ficheros = paginas(BUILD);
if (ficheros.length === 0) {
  console.error('✗ build/ existe pero no tiene ni una página generada.');
  console.error('  ¿Corrió el postbuild (`node scripts/gen-seo-pages.js`)? Pasar en verde');
  console.error('  sobre cero páginas sería exactamente un verificador que no verifica.');
  process.exit(1);
}

const generadas = new Set(ficheros.map(revisar).filter(Boolean));

// 5 · sitemap ↔ ficheros, en las dos direcciones
const SITEMAP = path.join(BUILD, 'sitemap.xml');
let enSitemap = new Set();
if (!fs.existsSync(SITEMAP)) {
  anota('falta sitemap.xml', 'build/sitemap.xml', '');
} else {
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  enSitemap = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => unaBarra(m[1])));

  // El `lastmod` no puede ser la fecha del build repetida en todas las URLs.
  //
  // La primera versión de esta guarda contaba fechas DISTINTAS en el sitemap:
  // con >200 URLs y una sola fecha, sospechaba build-date. Pero un día de
  // cambios anchos de verdad —un i18n-check que toca los diez `<lang>.js`, por
  // ejemplo— produce ESA MISMA firma con fechas reales: `git log` sobre cada
  // fuente devuelve legítimamente "hoy" para casi todo, y el sitemap por sí
  // solo no distingue esto del bug que reemplaza. Se cazó en el propio build
  // de esta guarda (BUG-085): un `--` de más en `fechaReal()` ignoraba en
  // silencio el pathspec y devolvía el último commit del REPO ENTERO en vez
  // del de la ruta pedida — con o sin ese bug, el sitemap final se ve IGUAL en
  // un día de cambios amplios, así que sólo el propio generador puede saber
  // si el mecanismo funcionó.
  //
  // Por eso mira `.lastmod-meta.json`, que `gen-seo-pages.js` escribe con
  // cuántas CONSULTAS a git (no páginas — muchas comparten una) cayeron al
  // build-date por falta de historial, no cuántas fechas distintas salieron.
  const metaPath = path.join(BUILD, '.lastmod-meta.json');
  if (!fs.existsSync(metaPath)) {
    anota('falta el informe de fechas del generador', 'build/.lastmod-meta.json',
          'gen-seo-pages.js no lo escribió — ¿una versión vieja del script?');
  } else {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const ratio = meta.consultas ? meta.fallos / meta.consultas : 1;
    if (ratio > 0.05)
      anota('muchas fechas cayeron al build-date en vez de al historial de git', 'build/.lastmod-meta.json',
            `${meta.fallos}/${meta.consultas} consultas (${(ratio * 100).toFixed(1)}%) — ¿clon superficial? Hace falta fetch-depth: 0`);
  }

  const norm = new Set([...generadas].map(unaBarra));
  // Las mismas, como ruta relativa sin barras, para cruzarlas con los enlaces.
  const generadasRel = new Set([...norm].map((u) => rutaDe(u).replace(/^\/|\/$/g, '')));
  // Las rutas de APLICACIÓN (el array MAIN de `gen-seo-pages.js`: /, /options,
  // /options/strategies, /pricing…) van al sitemap a propósito y las sirve la
  // SPA, sin página estática propia. No son un fallo.
  //
  // La lista se LEE de `gen-seo-pages.js` en vez de copiarse aquí. Copiada, el
  // día que alguien añada una ruta de app este verificador la denunciaría como
  // página inexistente, y el arreglo evidente —relajar la regla— dejaría de
  // detectar las que sí faltan. Una exención escrita a mano se pudre igual que
  // cualquier otra lista escrita a mano.
  const genSrc = fs.readFileSync(path.join(__dirname, 'gen-seo-pages.js'), 'utf8');
  const mMain = genSrc.match(/const MAIN\s*=\s*\[([\s\S]*?)\];/);
  const rutasApp = new Set(
    (mMain ? [...mMain[1].matchAll(/\['([^']+)'/g)].map((m) => m[1]) : [])
      .flatMap((r) => LANGS.map(([, pref]) =>
        sinBarras(`${DOMAIN}${pref}${r}`) || DOMAIN)));
  if (!mMain) anota('no se pudo leer MAIN de gen-seo-pages.js', 'scripts/gen-seo-pages.js',
                    'sin esa lista no se distingue una ruta de app de una página que falta');

  for (const loc of enSitemap) {
    const sinBarra = sinBarras(loc);
    if (rutasApp.has(sinBarra)) continue;
    const ruta = rutaDe(loc).replace(/^\/|\/$/g, '');
    if (ruta.split('/').length >= 2 && !norm.has(loc))
      anota('sitemap anuncia una página que no existe', ruta, '');
  }
  for (const u of norm) if (!enSitemap.has(u))
    anota('página generada que el sitemap no anuncia', rutaDe(u), '');

  // robots.txt se lee AQUÍ, antes de las dos comprobaciones que lo necesitan:
  // la de enlaces internos (abajo) y la del sitemap (más abajo). Estaba leído
  // sólo en la segunda, así que la primera corría con la lista de reglas VACÍA
  // y daba por pública toda ruta prohibida: 1.640 falsos positivos.
  const ROBOTS = path.join(BUILD, 'robots.txt');
  if (fs.existsSync(ROBOTS)) cargarRobots(fs.readFileSync(ROBOTS, 'utf8'));
  else anota('falta robots.txt', 'build/robots.txt', '');

  // Un enlace interno lleva a un fichero, o la ruta está prohibida en robots.
  //
  // No es «ningún enlace roto» a secas: las 1.640 páginas rematan con un CTA
  // hacia la aplicación de pago —`/education`, `/dashboard`,
  // `/options/calculator`— y ésas NO tienen fichero propio a propósito: son
  // `ProtectedRoute premiumOnly` y darles un 200 sólo serviría para publicar
  // una pantalla de acceso. Como están en `Disallow`, ningún rastreador que
  // respete el estándar las sigue, y el visitante sí llega porque GitHub Pages
  // le sirve el shell.
  //
  // Lo que la regla prohíbe es lo otro: enlazar una ruta PÚBLICA que no existe.
  // Ese enlace sí lo sigue un rastreador, y se encuentra un 404. Ya pasó una
  // vez, con `/learn/gestion-del-riesgo/` en el `<noscript>` —el módulo se
  // llama `gestion-del-capital`—: un enlace plausible y muerto es justo lo que
  // ninguna lectura por encima caza.
  const permitida = (ruta) => { const v = veredictoRobots(ruta); return !v || v.permite; };
  const hayFichero = (r) => generadasRel.has(r)
    || fs.existsSync(path.join(BUILD, r))
    || fs.existsSync(path.join(BUILD, `${r}.html`));
  for (const f of ficheros) {
    const rel = path.relative(BUILD, path.dirname(f)).split(path.sep).join('/');
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/<a[^>]+href="([^"]+)"/g)) {
      let destino = m[1];
      if (mismoOrigen(destino, DOMAIN)) destino = rutaDe(destino);
      if (!destino.startsWith('/')) continue;             // externo o ancla
      const ruta = destino.split('#')[0].split('?')[0];
      const limpia = ruta.replace(/^\/|\/$/g, '');
      if (!limpia || hayFichero(limpia)) continue;
      if (permitida(ruta))
        anota('enlace a una ruta pública que no existe', rel, destino);
    }
  }

  // Los puentes, contra el sitemap y contra las páginas de verdad.
  for (const [rel, destino] of puentes) {
    if (enSitemap.has(unaBarra(`${DOMAIN}/${rel}/`)))
      anota('el sitemap anuncia una página puente', rel,
            'una redirección no se indexa: sobra del sitemap');
    if (!norm.has(destino))
      anota('puente hacia una URL que no existe', rel, `→ ${destino}`);
    else if (!enSitemap.has(destino))
      anota('puente hacia una URL que el sitemap no anuncia', rel, `→ ${destino}`);
  }

  // Ninguna sección puede quedarse sin su hub, y ninguna página sin hub que la
  // enlace: eso es lo que convertía las 1.640 en huérfanas —alcanzables sólo
  // por el sitemap, que descubre pero no reparte autoridad—. Se comprueba que
  // cada página real está citada por el hub de su idioma y su sección.
  const enlazadas = new Set();
  for (const f of ficheros) {
    const rel = path.relative(BUILD, path.dirname(f)).split(path.sep).join('/');
    const trozos = rel.split('/');
    const esHub = trozos.length <= 2 && /^(learn|tools|markets|strategies|patterns|candles)$/.test(trozos[trozos.length - 1]);
    if (!esHub) continue;
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/<li><a href="([^"]+)"/g))
      enlazadas.add(unaBarra(m[1]));
  }
  if (enlazadas.size === 0) {
    anota('no hay ni un hub de sección', 'build/', 'las páginas vuelven a ser huérfanas');
  } else {
    for (const u of norm) {
      const ruta = rutaDe(u).replace(/^\/|\/$/g, '');
      const trozos = ruta.split('/');
      // La portada, las rutas del SPA y los propios hubs no cuelgan de un hub.
      if (trozos.length <= 2) continue;
      if (!enlazadas.has(u)) anota('página huérfana: ningún hub la enlaza', ruta, '');
    }
  }

  // Ninguna URL del sitemap puede estar prohibida en robots.txt.
  //
  // Existe porque pasó: `/performance` es premium y robots la bloqueaba, pero el
  // sitemap la anunciaba igual. El arreglo estaba escrito —con su comentario— en
  // `gen-sitemap.js`, que el build NO ejecuta: `postbuild` corre sólo
  // `gen-seo-pages.js`, y ahí seguía. Search Console lo marca como «enviada pero
  // bloqueada por robots.txt» y resta autoridad al resto del sitemap.
  //
  // Se leen las reglas del grupo `*`, que es el que aplica a los rastreadores de
  // buscador, y se resuelven COMO LAS RESUELVE UN RASTREADOR: gana la regla
  // cuyo patrón case más largo, sea `Allow` o `Disallow`; a igual longitud gana
  // `Allow`. Es lo que dice la especificación y lo que hacen Google, Bing y
  // Yandex.
  //
  // Antes sólo se miraban los `Disallow` y se comparaba el prefijo a pelo. Con
  // eso, `Disallow: /options` + `Allow: /options/strategies/` —la pareja que
  // deja fuera la pantalla premium y dentro las 66 fichas públicas— se leía
  // como «las 66 están prohibidas», y el verificador denunciaba 660 páginas
  // perfectamente indexables. Un verificador que dice que algo está roto
  // cuando no lo está se acaba desactivando, y con él se va la comprobación
  // que sí servía.
  //
  // También se ha quitado el borrado del prefijo de idioma. `robots.txt` casa
  // rutas LITERALES: `Disallow: /options` no cubre `/en/options/…`, y fingir
  // que sí era inventarse una prohibición que ningún rastreador aplica.
  for (const loc of enSitemap) {
    const ruta = rutaDe(loc);
    const v = veredictoRobots(ruta);
    if (v && !v.permite)
      anota('el sitemap anuncia una URL que robots.txt prohíbe', ruta, `Disallow: ${v.patron}`);
  }

  // Los enlaces del <noscript> del shell tienen que llevar a algún sitio.
  //
  // Ese bloque es lo único que lee un rastreador sin JavaScript, y sus enlaces
  // son su única salida hacia las 1.640 páginas estáticas: uno roto ahí no es
  // un 404 más, es el callejón sin salida de la portada. `engine-check` mira su
  // contenido (cifras y rutas prohibidas) pero corre sin build y no puede saber
  // qué páginas existen; aquí sí.
  //
  // Existe porque al escribir ese bloque puse `/learn/gestion-del-riesgo/`, que
  // no existe — el módulo se llama `gestion-del-capital`. Un enlace plausible y
  // muerto es exactamente lo que ninguna lectura por encima caza.
  // En `public/` no puede haber un sitemap.
  //
  // Había uno: 8 URLs con `lastmod` congelado en 2026-08-11, de cuando el
  // sitemap se escribía a mano. CRA copia `public/` dentro de `build/` y luego
  // el `postbuild` lo pisa con el bueno, así que en el flujo normal no se
  // notaba — pero cualquier build que no llegue al postbuild publica ESE, y
  // Search Console ve el sitio encoger de 1.648 URLs a 8. Pasó de verdad en
  // `probar-verificadores.sh`, donde tres sabotajes recompilan con `craco
  // build` a secas.
  //
  // Lo escribe `gen-sitemap.js`, que ya no ejecuta nadie. Si vuelve a aparecer
  // el fichero, es que alguien lo ha corrido: mejor que salte aquí.
  const PUB_SITEMAP = path.join(__dirname, '..', 'public', 'sitemap.xml');
  if (fs.existsSync(PUB_SITEMAP)) {
    anota('hay un sitemap en public/ que pisaría al generado', 'public/sitemap.xml',
      'lo escribe gen-sitemap.js, que el build no ejecuta; el bueno lo genera gen-seo-pages.js');
  }

  const SHELL = path.join(BUILD, 'index.html');
  if (!fs.existsSync(SHELL)) {
    anota('falta el shell', 'build/index.html', '');
  } else {
    const html = fs.readFileSync(SHELL, 'utf8');
    const bloque = ([...html.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)]
      .map((m) => m[1]).find((b) => b.includes('<h1>'))) || '';
    if (!bloque) {
      anota('el shell no trae <noscript> con contenido', 'build/index.html',
        'sin él, la portada es una página en blanco para cualquier bot que no ejecute JS');
    }
    for (const m of bloque.matchAll(/href="(\/[^"#?]*)"/g)) {
      const href = m[1];
      const limpio = sinBarras(`${DOMAIN}${href}`) || DOMAIN;
      if (rutasApp.has(limpio)) continue;                       // ruta de la SPA
      const local = path.join(BUILD, href.replace(/^\//, ''));
      if (fs.existsSync(local) || fs.existsSync(path.join(local, 'index.html'))) continue;
      anota('el <noscript> del shell enlaza algo que no existe en el build', href, '');
    }
  }
}

// ── veredicto ───────────────────────────────────────────────────────────────
const total = [...problemas.values()].reduce((n, v) => n + v.length, 0);
console.log(`SEO de las páginas prerenderizadas — ${ficheros.length} páginas, ` +
            `${enSitemap.size} URLs en el sitemap, ${LANGS.length} idiomas`);

if (total === 0) {
  console.log('✓ canonical auto-referente, hreflang ×10 + x-default, lang/dir, '
            + 'title/description, JSON-LD y sitemap: todo coherente');
  process.exit(0);
}

console.log(`\n✗ ${total} problema(s) en ${problemas.size} categoría(s):\n`);
for (const [tipo, casos] of [...problemas].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${tipo} — ${casos.length}`);
  if (!BREVE) for (const c of casos.slice(0, 3))
    console.log(`      · ${c.pagina}${c.detalle ? `  (${c.detalle})` : ''}`);
  if (!BREVE && casos.length > 3) console.log(`      … y ${casos.length - 3} más`);
}
console.log('\n  Ninguno de estos rompe la web: rompen la indexación, que no se ve.');
process.exit(1);
