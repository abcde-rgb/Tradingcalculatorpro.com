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
const BASE = (process.argv.find((a) => a.startsWith('http'))
  || 'https://tradingcalculator.pro').replace(/\/+$/, '');
const iM = process.argv.indexOf('--muestra');
const MUESTRA = iM > -1 ? parseInt(process.argv[iM + 1], 10) || 12 : 12;
const iO = process.argv.indexOf('--origen');
const ORIGEN = (iO > -1 ? process.argv[iO + 1] : BASE).replace(/\/+$/, '');
// De la URL anunciada a la URL que se descarga. Idéntica en producción.
const aBase = (u) => (u.startsWith(ORIGEN) ? BASE + u.slice(ORIGEN.length) : u);

const fallos = [];
const mal = (q, d) => fallos.push(`${q}${d ? ` — ${d}` : ''}`);

async function pedir(url) {
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
    const ajenas = locs.filter((u) => !u.startsWith(ORIGEN));
    if (ajenas.length)
      mal(`${ajenas.length} URL(s) del sitemap apuntan a otro dominio`, ajenas[0]);
  }

  // 4 · una muestra del sitemap responde de verdad y se declara canónica de sí
  //     misma. Repartida a lo largo de la lista, no las N primeras: las primeras
  //     son siempre las rutas principales, y son justo las que nunca fallan.
  const paso = Math.max(1, Math.floor(locs.length / MUESTRA));
  const muestra = locs.filter((_, i) => i % paso === 0).slice(0, MUESTRA);
  let vistas = 0;
  for (const url of muestra) {
    const r = await pedir(aBase(url));
    if (!r.ok) { mal(`404 en una URL del sitemap`, `${url} (${r.status})`); continue; }
    vistas++;
    const can = r.texto.match(/<link rel="canonical" href="([^"]+)"/);
    if (!can) mal('página publicada sin canonical', url);
    else if (can[1].replace(/\/+$/, '') !== url.replace(/\/+$/, ''))
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
