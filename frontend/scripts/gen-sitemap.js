#!/usr/bin/env node
/**
 * Regenera frontend/public/sitemap.xml con SOLO las rutas públicas e indexables.
 *
 * Excluidas a propósito: /dashboard, /performance y /subscription (premium tras
 * login, y bloqueadas en robots.txt), /login y /register (utilidad, sin
 * contenido), /settings y /admin (privadas).
 *
 * Uso:  node scripts/gen-sitemap.js
 *
 * ⚠️ DOMINIO: sale de `SITE_ORIGIN`, con el dominio propio por defecto — que es
 * el que sirve desde el cutover del 2026-08-28 (`public/CNAME`, el workflow
 * compila con PUBLIC_URL=/). NO lo cambies aquí suelto: el sitemap debe coincidir
 * con el canonical de `src/hooks/useSEO.js`, el de `public/index.html`, el
 * `Sitemap:` de `public/robots.txt`, `homepage` en package.json y el PUBLIC_URL
 * del workflow. Un sitemap que anuncia un dominio y un canonical que apunta a
 * otro es peor que no tener sitemap: Google descarta las URLs anunciadas.
 * Checklist completo de la mudanza: docs/MIGRACION_DOMINIO.md
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_ORIGIN = 'https://tradingcalculator.pro';
const DOMAIN = (process.env.SITE_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
const LASTMOD = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ⚠️ ESTE FICHERO YA NO LO EJECUTA NADIE, y lo que produce es PEOR que nada.
//
// El sitemap publicado lo genera `gen-seo-pages.js` en el `postbuild`, con las
// ~1.687 URLs reales. Éste escribe 5 en `public/sitemap.xml`, que CRA copia
// dentro de `build/` — donde el postbuild lo pisa. En el flujo normal no se
// nota; en cualquier build que no llegue al postbuild se publica ÉSTE, y Search
// Console ve el sitio encoger de 1.687 URLs a 5. Por eso `check-seo.js` falla
// si `public/sitemap.xml` existe. Si necesitas cambiar el sitemap, cambia
// `gen-seo-pages.js`.
//
// La lista se deja corregida para que no contradiga al generador de verdad si
// alguien lo ejecuta por error. No para invitar a usarlo.
//
// [path, priority, changefreq]
const PAGES = [
  ['/',            '1.0',  'weekly'],
  // /education, /options y /options/strategies NO van aquí, ni /performance:
  // los cuatro son `ProtectedRoute premiumOnly` en `src/App.js` y mandan a
  // /login a quien no ha entrado. Anunciar en el sitemap una URL que robots.txt
  // prohíbe es la contradicción que Search Console marca como «enviada pero
  // bloqueada por robots.txt», y resta autoridad al resto del sitemap. La
  // referencia pública del diario, cuando exista, irá con ruta propia sin muro.
  ['/pricing',     '0.85', 'monthly'],
  ['/about',       '0.7',  'monthly'],
  ['/contact',     '0.6',  'monthly'],
  ['/legal',       '0.4',  'yearly'],
];

const alt = (hreflang, url) => `        <xhtml:link rel="alternate" hreflang="${hreflang}" href="${url}" />`;

// Estas páginas las sirve el SPA, que traduce en CLIENTE: `?lang=en` devuelve
// byte por byte el mismo HTML que la URL desnuda. Declararlas como alternativas
// `hreflang` no indexaba diez idiomas — Google las canonicaliza a una sola y
// descarta las alternativas, y encima el `canonical` de `index.html` apunta a la
// URL desnuda, así que las dos señales se contradecían.
//
// Las páginas ESTÁTICAS de `gen-seo-pages.js` sí tienen una URL por idioma
// (`/en/options/strategies/...`) y emiten su propio juego de alternativas
// correcto; este generador no las toca. Cuando exista una home estática por
// idioma, aquí se declararán esas URLs reales.
function block([p, priority, changefreq]) {
  const base = `${DOMAIN}${p}`;
  return [
    '    <url>',
    `        <loc>${base}</loc>`,
    `        <lastmod>${LASTMOD}</lastmod>`,
    `        <changefreq>${changefreq}</changefreq>`,
    `        <priority>${priority}</priority>`,
    alt('x-default', base),
    '    </url>',
  ].join('\n');
}

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n' +
  PAGES.map(block).join('\n\n') +
  '\n\n</urlset>\n';

const out = path.join(__dirname, '..', 'public', 'sitemap.xml');
fs.writeFileSync(out, xml, 'utf8');
console.log(`Wrote ${out} — ${PAGES.length} URLs (${DOMAIN})`);
