#!/usr/bin/env node
/**
 * Regenera frontend/public/sitemap.xml con SOLO las rutas públicas e indexables.
 *
 * Excluidas a propósito: /dashboard y /subscription (premium/login), /login y
 * /register (utilidad, sin contenido), /settings y /admin (privadas).
 *
 * Uso:  node scripts/gen-sitemap.js
 *
 * ⚠️ DOMINIO: sale de `SITE_ORIGIN`, con el de GitHub Pages por defecto porque
 * es el que sirve hoy (el workflow compila con PUBLIC_URL=/Tradingcalculatorpro.com
 * y publica sin CNAME). NO lo cambies aquí suelto: el sitemap tiene que coincidir
 * con el canonical de `src/hooks/useSEO.js`, el de `public/index.html`, el
 * `Sitemap:` de `public/robots.txt`, `homepage` en package.json y el PUBLIC_URL
 * del workflow. Un sitemap que anuncia un dominio y un canonical que apunta a
 * otro es peor que no tener sitemap: Google descarta las URLs anunciadas.
 * Checklist completo de la mudanza: docs/MIGRACION_DOMINIO.md
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_ORIGIN = 'https://abcde-rgb.github.io/Tradingcalculatorpro.com';
const DOMAIN = (process.env.SITE_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
const LASTMOD = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const LANGS = [['en', 'en'], ['de', 'de'], ['fr', 'fr'], ['ru', 'ru'], ['zh-CN', 'zh'], ['ja', 'ja'], ['ar', 'ar']];

// [path, priority, changefreq]
const PAGES = [
  ['/',            '1.0',  'weekly'],
  ['/options',            '0.9',  'weekly'],
  ['/options/strategies', '0.85', 'weekly'],
  ['/education',   '0.9',  'weekly'],
  ['/performance', '0.9',  'weekly'],
  ['/pricing',     '0.85', 'monthly'],
  ['/about',       '0.7',  'monthly'],
  ['/contact',     '0.6',  'monthly'],
  ['/legal',       '0.4',  'yearly'],
];

const alt = (hreflang, url) => `        <xhtml:link rel="alternate" hreflang="${hreflang}" href="${url}" />`;

function block([p, priority, changefreq]) {
  const base = `${DOMAIN}${p}`;
  const sep = base.includes('?') ? '&' : '?';
  const lines = [
    '    <url>',
    `        <loc>${base}</loc>`,
    `        <lastmod>${LASTMOD}</lastmod>`,
    `        <changefreq>${changefreq}</changefreq>`,
    `        <priority>${priority}</priority>`,
    alt('es', base),
  ];
  for (const [hreflang, code] of LANGS) lines.push(alt(hreflang, `${base}${sep}lang=${code}`));
  lines.push(alt('x-default', base), '    </url>');
  return lines.join('\n');
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
