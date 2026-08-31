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

// ── el examen de una página ─────────────────────────────────────────────────
function revisar(fichero) {
  const html = fs.readFileSync(fichero, 'utf8');
  const rel = path.relative(BUILD, path.dirname(fichero)).split(path.sep).join('/');
  const propia = urlDe(fichero);
  const lang = idiomaDe(rel);

  // 1 · canonical
  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/);
  if (!canonical) anota('canonical ausente', rel, '');
  else if (!mismoOrigen(canonical, DOMAIN)) anota('canonical a otro dominio', rel, canonical);
  else if (unaBarra(canonical) !== unaBarra(propia))
    anota('canonical NO auto-referente', rel, `dice ${canonical}`);

  // 2 · hreflang
  const alt = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
  if (alt.length) {
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

  // 6 · JSON-LD que parsee
  for (const m of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const datos = JSON.parse(m[1]);
      if (!datos['@context'] || !datos['@type'])
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

const generadas = new Set(ficheros.map(revisar));

// 5 · sitemap ↔ ficheros, en las dos direcciones
const SITEMAP = path.join(BUILD, 'sitemap.xml');
let enSitemap = new Set();
if (!fs.existsSync(SITEMAP)) {
  anota('falta sitemap.xml', 'build/sitemap.xml', '');
} else {
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  enSitemap = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => unaBarra(m[1])));
  const norm = new Set([...generadas].map(unaBarra));
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

  // Ninguna URL del sitemap puede estar prohibida en robots.txt.
  //
  // Existe porque pasó: `/performance` es premium y robots la bloqueaba, pero el
  // sitemap la anunciaba igual. El arreglo estaba escrito —con su comentario— en
  // `gen-sitemap.js`, que el build NO ejecuta: `postbuild` corre sólo
  // `gen-seo-pages.js`, y ahí seguía. Search Console lo marca como «enviada pero
  // bloqueada por robots.txt» y resta autoridad al resto del sitemap.
  //
  // Se leen las reglas del grupo `*`, que es el que aplica a los rastreadores de
  // buscador. Prefijo simple, que es como funciona robots.txt.
  const ROBOTS = path.join(BUILD, 'robots.txt');
  if (!fs.existsSync(ROBOTS)) {
    anota('falta robots.txt', 'build/robots.txt', '');
  } else {
    const lineas = fs.readFileSync(ROBOTS, 'utf8').split('\n').map((l) => l.trim());
    const prohibidas = [];
    let enComodin = false;
    for (const l of lineas) {
      const ua = l.match(/^User-agent:\s*(.+)$/i);
      if (ua) { enComodin = ua[1].trim() === '*'; continue; }
      if (!enComodin) continue;
      const d = l.match(/^Disallow:\s*(\S+)\s*$/i);
      if (d && d[1] !== '/') prohibidas.push(d[1]);
    }
    for (const loc of enSitemap) {
      const ruta = rutaDe(loc);
      const sinIdioma = ruta.replace(
        new RegExp(`^/(${LANGS.map(([l]) => l).filter((l) => l !== 'es').join('|')})(?=/|$)`), '');
      const choca = prohibidas.find((d) => sinIdioma === d || sinIdioma.startsWith(`${d}/`)
        || sinIdioma === `${d}/`);
      if (choca)
        anota('el sitemap anuncia una URL que robots.txt prohíbe', ruta, `Disallow: ${choca}`);
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
