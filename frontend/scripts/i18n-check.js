#!/usr/bin/env node
/**
 * i18n completeness checker.
 *
 * Compara cada diccionario de idioma con `es.js` (referencia) y reporta claves
 * que FALTAN o SOBRAN. Útil antes de añadir/traducir contenido.
 *
 * Uso:
 *   node scripts/i18n-check.js          # resumen
 *   node scripts/i18n-check.js --full   # lista todas las claves faltantes
 *   node scripts/i18n-check.js --json   # salida JSON
 *
 * Sale con código 1 si algún idioma tiene claves faltantes (útil en CI como
 * check NO bloqueante / informativo).
 */
const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'src', 'lib', 'i18n');
const REF = 'es';
const LANGS = ['es', 'en', 'de', 'fr', 'ru', 'zh', 'ja', 'ar', 'pt', 'it'];

// The academy strings live in a separate lazily-loaded `<lang>.edu.js` chunk
// (scripts/split-i18n-edu.js). Parity has to be checked over BOTH files, since
// together they are what t() sees at runtime.
function loadFile(file) {
  if (!fs.existsSync(file)) return {};
  const src = fs.readFileSync(file, 'utf8').replace(/export\s+default\s+/, 'return ');
  // eslint-disable-next-line no-new-func
  return new Function(src)();
}

function loadKeys(lang) {
  return Object.keys({
    ...loadFile(path.join(I18N_DIR, `${lang}.js`)),
    ...loadFile(path.join(I18N_DIR, `${lang}.edu.js`)),
  });
}

const full = process.argv.includes('--full');
const asJson = process.argv.includes('--json');

const ref = new Set(loadKeys(REF));
const report = {};
let anyMissing = false;

for (const lang of LANGS) {
  if (lang === REF) continue;
  const keys = new Set(loadKeys(lang));
  const missing = [...ref].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !ref.has(k));
  report[lang] = { total: keys.size, missing, extra };
  if (missing.length) anyMissing = true;
}

if (asJson) {
  console.log(JSON.stringify({ reference: REF, refKeys: ref.size, report }, null, 2));
} else {
  console.log(`i18n — referencia ${REF}.js: ${ref.size} claves\n`);
  for (const lang of LANGS) {
    if (lang === REF) continue;
    const { total, missing, extra } = report[lang];
    const flag = missing.length ? '⚠️' : '✅';
    console.log(`${flag} ${lang}.js: ${total} claves | faltan ${missing.length} | sobran ${extra.length}`);
    if (full && missing.length) console.log('   FALTAN: ' + missing.join(', '));
    if (full && extra.length) console.log('   SOBRAN: ' + extra.join(', '));
  }
  console.log('\nPista: usa --full para ver las claves; las que faltan caen a español por t().');
}

process.exit(anyMissing ? 1 : 0);
