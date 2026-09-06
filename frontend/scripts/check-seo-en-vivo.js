#!/usr/bin/env node
/* eslint-disable */
/**
 * Comprueba el sitio PUBLICADO: que lo que se desplegó es lo que se indexa.
 *
 * Por qué existe, y por qué está separado de `check-seo.js`
 * ---------------------------------------------------------
 * `check-seo.js` mira el `build/` local: comprueba que el generador produce
 * páginas correctas. Eso no dice nada sobre lo que hay publicado. Entre el build
 * y el sitio en vivo pasan cosas que ningún verificador local ve:
 *
 *   · el deploy falla a medias y GitHub Pages sigue sirviendo lo anterior;
 *   · el sitemap se publica pero las páginas que anuncia devuelven 404;
 *   · el dominio cambia y el canonical publicado apunta a otro sitio;
 *   · `robots.txt` acaba bloqueando lo que se quería indexar.
 *
 * Ninguna de esas rompe nada visible. Simplemente el sitio deja de captar.
 *
 * Corre en `.github/workflows/seo-en-vivo.yml`, que sí tiene red. **En el
 * sandbox de Claude Code NO hay salida a internet**, así que aquí sólo se puede
 * ejecutar contra un servidor local — que es justo como se probó su lógica:
 *
 *     cd frontend && npx serve -s build -l 3100 &
 *     node scripts/check-seo-en-vivo.js http://localhost:3100
 *
 * Para que eso funcione hay que separar dos cosas que en producción coinciden y
 * en una prueba no:
 *
 *   · ORIGEN — el dominio con el que el sitio se ANUNCIA (el de las <loc> del
 *     sitemap y el de los canonical). Es contra el que se juzga.
 *   · BASE   — de dónde se DESCARGA de verdad.
 *
 * En producción son el mismo y no hay que pasar nada. En una prueba local el
 * sitemap sigue anunciando el dominio de producción —y debe hacerlo— mientras
 * las páginas se sirven de localhost. Sin esta separación el verificador sólo
 * podría ejecutarse contra el sitio real, es decir: no podría probarse.
 *
 * Uso
 * ---
 *     node scripts/check-seo-en-vivo.js [URL_BASE] [--origen URL] [--muestra N]
 *
 * Sin argumentos usa el dominio de producción para ambos. Sale 1 si algo falla.
 */
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

const BASE = sinBarras(process.argv.find((a) => a.startsWith('http'))
  || 'https://tradingcalculator.pro');
const iM = process.argv.indexOf('--muestra');
const MUESTRA = iM > -1 ? parseInt(process.argv[iM + 1], 10) || 12 : 12;
const iO = process.argv.indexOf('--origen');
const ORIGEN = sinBarras(iO > -1 ? process.argv[iO + 1] : BASE);
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

// De la URL anunciada a la URL que se descarga. Idéntica en producción.
const aBase = (u) => (mismoOrigen(u, ORIGEN) ? BASE + rutaDe(u) + (new URL(u).search || '') : u);

const fallos = [];
const mal = (q, d) => fallos.push(`${q}${d ? ` — ${d}` : ''}`);

// Sólo se descarga de la BASE que se está auditando. Las URLs vienen del
// sitemap del propio sitio, y un sitemap alterado —o simplemente mal
// generado— haría que este verificador saliera a pedir a donde le dijeran.
// CodeQL lo marca como `js/request-forgery`, y tiene razón: el destino de un
// `fetch` no puede decidirlo el documento que estás auditando.
//
// Además evita un falso verde: sin esta guarda, una <loc> que apunte a otro
// host se descargaría bien y contaría como «página publicada OK» cuando no es
// de este sitio.
function permitida(url) {
  try { return new URL(url).origin === new URL(BASE).origin; }
  catch { return false; }
}

async function pedir(url) {
  if (!permitida(url)) {
    return { ok: false, status: 0, texto: '', error: `fuera de ${BASE}` };
  }
  try {
    const r = await fetch(url, { redirect: 'follow' });
    return { ok: r.ok, status: r.status, texto: r.ok ? await r.text() : '' };
  } catch (e) {
    return { ok: false, status: 0, texto: '', error: e.message };
  }
}

(async () => {
  console.log(`SEO en vivo — ${BASE}`);

  // 1 · la portada responde. Si esto falla, lo demás no significa nada.
  const home = await pedir(`${BASE}/`);
  if (!home.ok) {
    console.error(`✗ la portada no responde (${home.status || home.error}).`);
    console.error('  Sin sitio publicado no hay nada que auditar: el resto de');
    console.error('  comprobaciones se omite para no dar un verde sobre la nada.');
    process.exit(1);
  }

  // 1b · el icono que sale en los resultados de búsqueda.
  //
  // Google y Yandex lo piden por su cuenta a la raíz, aparte de leer el que
  // declara la página. Si no responde, el resultado sale con el globo genérico
  // —que es como salía el sitio en Yandex— y no hay forma de enterarse desde
  // dentro: la web se ve perfecta con el icono cacheado del navegador.
  const icono = await pedir(`${BASE}/favicon.ico`);
  if (!icono.ok) mal('favicon.ico no responde', `${icono.status || icono.error} — el buscador pintará un icono genérico`);
  if (!/<link[^>]+rel="[^"]*icon/i.test(home.texto))
    mal('la portada no declara ningún icono', 'sin `rel="icon"` el buscador se queda con lo que encuentre');

  // 2 · robots.txt existe y declara el sitemap
  const robots = await pedir(`${BASE}/robots.txt`);
  if (!robots.ok) mal('robots.txt no responde', robots.status);
  else if (!/^\s*Sitemap:/mi.test(robots.texto))
    mal('robots.txt no declara Sitemap:', 'los buscadores no encuentran el índice');

  // 3 · el sitemap existe, parece XML y tiene URLs
  const sm = await pedir(`${BASE}/sitemap.xml`);
  let locs = [];
  if (!sm.ok) mal('sitemap.xml no responde', sm.status);
  else {
    locs = [...sm.texto.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (locs.length === 0) mal('sitemap.xml sin ninguna <loc>', 'se publicó vacío');
    const ajenas = locs.filter((u) => !mismoOrigen(u, ORIGEN));
    if (ajenas.length)
      mal(`${ajenas.length} URL(s) del sitemap apuntan a otro dominio`, ajenas[0]);
  }

  // 4 · una muestra del sitemap responde de verdad y se declara canónica de sí
  //     misma.
  //
  // ⚠️ Aquí ponía que las primeras URLs de la lista «son las rutas principales,
  // y son justo las que nunca fallan», y por eso el muestreo `i % paso` las
  // saltaba: con 1.648 URLs el paso era ~55, así que de las ocho primeras sólo
  // se pedía la portada.
  //
  // Eran las únicas que fallaban. GitHub Pages sólo sirve `index.html` en la
  // raíz; cualquier otra ruta sin fichero propio recibe `404.html` **con
  // estado 404**, y el workflow copia ahí el shell del SPA. Resultado: la
  // persona ve la web perfecta y el rastreador recibe un 404. `/pricing`,
  // `/education`, `/options`, `/about`, `/contact` y `/legal` llevaban así
  // desde siempre, anunciadas en el sitemap, y este verificador estaba
  // construido para no mirarlas.
  //
  // Ahora se piden SIEMPRE las primeras y las últimas —que son las que un
  // muestreo por paso fijo no visita nunca— y se reparte el resto por el medio.
  // El sitemap sale ordenado por jerarquía (portada, rutas de aplicación, hubs,
  // y detrás la cola larga), así que la cabecera es justo lo que más duele si
  // falla.
  const EXTREMOS = 8;
  const cabeza = locs.slice(0, EXTREMOS);
  const cola = locs.slice(-EXTREMOS);
  const medio = locs.slice(EXTREMOS, -EXTREMOS);
  const cuantas = Math.max(1, MUESTRA - cabeza.length - cola.length);
  const paso = Math.max(1, Math.floor(medio.length / cuantas));
  const muestra = [...cabeza, ...medio.filter((_, i) => i % paso === 0).slice(0, cuantas), ...cola]
    .filter((u, i, a) => a.indexOf(u) === i);
  let vistas = 0;
  for (const url of muestra) {
    const r = await pedir(aBase(url));
    if (!r.ok) { mal(`404 en una URL del sitemap`, `${url} (${r.status})`); continue; }
    vistas++;
    const can = r.texto.match(/<link rel="canonical" href="([^"]+)"/);
    if (!can) mal('página publicada sin canonical', url);
    else if (sinBarras(can[1]) !== sinBarras(url))
      mal('canonical publicado que no es auto-referente', `${url} → ${can[1]}`);
    if (!/rel="alternate" hreflang=/.test(r.texto))
      mal('página publicada sin hreflang', url);
  }

  console.log(`  ${locs.length} URLs en el sitemap · ${vistas}/${muestra.length} de la muestra OK`);
  if (fallos.length === 0) {
    console.log('✓ el sitio publicado responde, se anuncia y se declara indexable');
    process.exit(0);
  }
  console.log(`\n✗ ${fallos.length} problema(s) en el sitio publicado:`);
  for (const f of fallos) console.log(`    · ${f}`);
  process.exit(1);
})();
