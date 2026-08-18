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

/**
 * Claves repetidas dentro del MISMO fichero.
 *
 * `loadFile` evalúa el diccionario como objeto JavaScript, y un objeto se queda
 * callado con la clave repetida: la segunda pisa a la primera y `Object.keys`
 * devuelve una sola. Así que este script podía dar «10 idiomas en paridad»
 * sobre ocho ficheros con una clave duplicada cada uno — que es exactamente lo
 * que pasó al fusionar una rama conservando los dos lados de un conflicto. Lo
 * cazó ESLint (`no-dupe-keys`), no esto, y el que mide la paridad debería
 * verlo antes.
 *
 * Se cuenta sobre el TEXTO, no sobre el objeto, porque en el objeto ya no está.
 */
function duplicadas(lang) {
  const out = [];
  for (const sufijo of ['.js', '.edu.js']) {
    const f = path.join(I18N_DIR, `${lang}${sufijo}`);
    if (!fs.existsSync(f)) continue;
    const vistas = new Set();
    for (const linea of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = linea.match(/^\s*["']?([a-zA-Z_0-9]+)["']?\s*:/);
      if (!m) continue;
      if (vistas.has(m[1])) out.push(`${lang}${sufijo}:${m[1]}`);
      else vistas.add(m[1]);
    }
  }
  return out;
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
  const dup = duplicadas(lang);
  report[lang] = { total: keys.size, missing, extra, duplicadas: dup };
  if (missing.length || dup.length) anyMissing = true;
}

// La referencia también puede tenerlas, y no entra en el bucle de arriba.
const dupRef = duplicadas(REF);
if (dupRef.length) anyMissing = true;
const todasDup = [...dupRef, ...LANGS.flatMap((l) => (report[l]?.duplicadas) || [])];
if (todasDup.length) {
  console.error(`\n❌ ${todasDup.length} clave(s) repetida(s) dentro de su fichero:`);
  for (const d of todasDup) console.error(`   ${d}`);
  console.error('   La segunda pisa a la primera en silencio: el diccionario dice una');
  console.error('   cosa y el fichero otra.');
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
