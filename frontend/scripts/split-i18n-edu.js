#!/usr/bin/env node
/* eslint-disable */
/**
 * Splits the academy-content strings out of each locale dictionary into a
 * lazily-loaded `<locale>.edu.js` chunk.
 *
 * WHY: `es.js` (555 KB raw) ships inside `main.js`, so every visitor to the
 * landing page downloads all 5.2k Spanish strings — including the 68 academy
 * modules they may never open. Two thirds of that weight belongs to
 * `tradingEducationContent.js`, which is imported by EducationPage ONLY, and
 * EducationPage is already a lazy route.
 *
 * SAFETY — this is the part that matters, because a wrong split shows raw key
 * names to users (a bug this project has already been bitten by twice):
 *   1. Keys are collected from literal `t('key')` calls in
 *      tradingEducationContent.js. That file has ZERO dynamic t() calls, so the
 *      extraction is complete, not a guess.
 *   2. Any key ALSO referenced from another file (candle pattern names used by
 *      the live detector, the SEO generator, etc.) stays in the eager
 *      dictionary. Only exclusively-academy keys move.
 *   3. lib/i18n.js awaits the edu chunk before EducationPage renders and when
 *      the locale changes, so t() can never miss.
 *
 * Idempotent: running it again on already-split files is a no-op.
 * Usage: node scripts/split-i18n-edu.js [--check]
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const I18N = path.join(ROOT, 'src', 'lib', 'i18n');
const CONTENT = path.join(ROOT, 'src', 'lib', 'tradingEducationContent.js');
const LANGS = ['es', 'en', 'de', 'fr', 'ru', 'zh', 'ja', 'ar', 'pt', 'it'];
const CHECK = process.argv.includes('--check');

const load = (file) =>
  new Function(fs.readFileSync(file, 'utf8').replace(/export\s+default\s+/, 'return '))();

// 1) Keys the academy content asks for, from literal t('…') calls.
const src = fs.readFileSync(CONTENT, 'utf8');
const dynamic = [...src.matchAll(/\bt\(\s*[^'`)]/g)].length;
if (dynamic > 0) {
  console.error(`❌ ${dynamic} llamadas t() no literales en tradingEducationContent.js.`);
  console.error('   La extracción dejaría de ser completa. Aborta.');
  process.exit(1);
}
const eduKeys = new Set([...src.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1]));

// 2) Keys referenced anywhere else must stay eager.
const elsewhere = cp.execSync(
  `grep -rhoE "'[A-Za-z0-9_]+'" ${path.join(ROOT, 'src')} ${path.join(ROOT, 'scripts')} ` +
  `--include=*.js --include=*.jsx --exclude=tradingEducationContent.js --exclude-dir=i18n || true`,
  { maxBuffer: 1e9 }
).toString();
const usedElsewhere = new Set(elsewhere.split('\n').map((s) => s.replace(/'/g, '')));

const exclusive = [...eduKeys].filter((k) => !usedElsewhere.has(k)).sort();
const shared = [...eduKeys].filter((k) => usedElsewhere.has(k));

console.log(`Claves de academia: ${eduKeys.size}`);
console.log(`  → exclusivas (se mueven): ${exclusive.length}`);
console.log(`  → compartidas (se quedan): ${shared.length}`);

if (CHECK) process.exit(0);

const header = (lang) => `// AUTO-GENERADO por scripts/split-i18n-edu.js — no editar a mano.
// Contenido de la academia para "${lang}", cargado en diferido por lib/i18n.js
// justo antes de renderizar EducationPage. Ver el porqué en el script.
export default `;

let moved = 0;
for (const lang of LANGS) {
  const main = path.join(I18N, `${lang}.js`);
  const eduFile = path.join(I18N, `${lang}.edu.js`);
  const dict = load(main);
  const existingEdu = fs.existsSync(eduFile) ? load(eduFile) : {};

  const edu = { ...existingEdu };
  const rest = {};
  for (const [k, v] of Object.entries(dict)) {
    if (exclusive.includes(k)) edu[k] = v;
    else rest[k] = v;
  }

  const movedNow = Object.keys(dict).length - Object.keys(rest).length;
  moved += movedNow;

  const dump = (o) =>
    '{\n' + Object.entries(o)
      // Always quote: some keys are not valid JS identifiers
      // (e.g. "Gestión de Riesgo" — a label used as its own key).
      .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
      .join('\n') + '\n}\n';

  fs.writeFileSync(eduFile, header(lang) + dump(edu), 'utf8');
  fs.writeFileSync(main, 'export default ' + dump(rest), 'utf8');
  console.log(`  ${lang}: ${Object.keys(rest).length} eager + ${Object.keys(edu).length} diferidas (movidas ahora: ${movedNow})`);
}
console.log(`✅ Split completado (${moved} claves movidas en total).`);
