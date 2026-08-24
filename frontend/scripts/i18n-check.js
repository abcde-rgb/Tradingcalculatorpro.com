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

/**
 * Claves que el código pide con `t('…')` y que NO define ningún idioma.
 *
 * ⚠️ La paridad entre idiomas NO las ve. Este verificador compara los diez
 * ficheros entre sí, así que una clave que falta en LOS DIEZ es perfectamente
 * «consistente»: faltan 0, sobran 0, verde. Y en pantalla sale la clave cruda.
 *
 * Pasó de verdad: 26 claves —`advSqnHint`, `gexFlipHint`, `longTermRange`,
 * `settingsProfileSave`…— llegaron al build compilado y se leían tal cual en
 * los diez idiomas. Ninguna de las puertas de CI podía verlo, porque ninguna
 * cruzaba el CÓDIGO con el DICCIONARIO: sólo el diccionario consigo mismo.
 *
 * Sólo se miran las llamadas con una cadena literal. Las claves construidas
 * (`t(\`calcDesc${id}\`)`) no se pueden resolver sin ejecutar la aplicación, y
 * fingir que sí llenaría esto de falsos positivos hasta que nadie lo mirase.
 */
function clavesUsadasSinDefinir(definidas) {
  const RAIZ = path.join(__dirname, '..', 'src');
  const usadas = new Map();
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!/[\\/]i18n$|node_modules/.test(p)) recorrer(p);
      } else if (/\.(jsx|js)$/.test(e.name)) {
        const src = fs.readFileSync(p, 'utf8');
        for (const m of src.matchAll(/\bt\(\s*['"]([A-Za-z0-9_]+)['"]\s*[),]/g)) {
          if (!usadas.has(m[1])) usadas.set(m[1], path.relative(RAIZ, p));
        }
      }
    }
  };
  recorrer(RAIZ);
  return [...usadas].filter(([k]) => !definidas.has(k));
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
  // ⚠️ Esta pista decía «las que faltan caen a español por t()». Dejó de ser
  // cierto el 2026-08-24: ya no hay ningún diccionario incrustado en main.js,
  // así que el español sólo está en memoria si el español es el idioma activo.
  // Una clave que falte se pinta CRUDA en pantalla. La consecuencia de fallar
  // aquí es peor que antes, no menor.
  console.log('\nPista: usa --full para ver las claves. Una clave que falte se pinta cruda:');
  console.log('el español ya no viaja en main.js, así que no hay respaldo que la tape.');
}

// `loadKeys` ya fusiona el diccionario general con el de la Academia, así que
// `ref` es el conjunto completo de lo definido.
const huerfanas = clavesUsadasSinDefinir(ref);
if (huerfanas.length) {
  console.error(`\n❌ ${huerfanas.length} clave(s) que el código usa y NINGÚN idioma define:`);
  for (const [k, f] of huerfanas.slice(0, 30)) console.error(`   ${k}  ←  ${f}`);
  if (huerfanas.length > 30) console.error(`   … y ${huerfanas.length - 30} más`);
  console.error('   Se pintan CRUDAS en pantalla, en los diez idiomas. La paridad entre');
  console.error('   idiomas no las ve: faltar en todos es «consistente».');
} else {
  console.log('✅ ninguna clave usada en el código se queda sin definir.');
}

process.exit(anyMissing || huerfanas.length ? 1 : 0);
