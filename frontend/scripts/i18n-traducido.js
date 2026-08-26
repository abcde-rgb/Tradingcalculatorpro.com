#!/usr/bin/env node
/**
 * Que las claves no sólo EXISTAN en los diez idiomas, sino que estén traducidas.
 *
 * El hueco que esto cierra
 * ------------------------
 * `i18n-check.js` comprueba **paridad de claves**: que los diez ficheros tengan
 * el mismo juego y que ninguna clave usada en el código quede sin definir. Eso
 * está bien y no basta.
 *
 * El 2026-08-23, con `i18n-check` en verde y diciendo «0 huecos», había **215
 * claves con el texto inglés literal** en otros idiomas — 194 de ellas en ruso,
 * chino, japonés y árabe, donde una coincidencia con el inglés no puede ser
 * casualidad. Se pintaban en el plan de trading y en el escáner de estructura:
 * un usuario japonés abría la pantalla y leía inglés, y el verificador decía
 * que la paridad era perfecta. Lo era. La paridad no era el problema.
 *
 * Un verificador que pasa mientras lo que dice proteger está roto da confianza
 * falsa, que es peor que no tenerlo.
 *
 * Cómo distingue «sin traducir» de «coincide legítimamente»
 * --------------------------------------------------------
 * Sólo mira valores que son FRASE (≥ 25 caracteres y con espacio): nombres de
 * marca, símbolos, importes y siglas quedan fuera, que es donde vive casi toda
 * la coincidencia legítima.
 *
 * En **ruso, chino, japonés y árabe** una frase idéntica al inglés es prueba: no
 * comparten alfabeto. En alemán, francés, portugués e italiano sí puede haber
 * coincidencia real, así que existe `EXCEPCIONES` — y cada entrada tiene que
 * decir por qué. Un fichero de excepciones sin motivos se convierte en el sitio
 * donde se esconden los fallos.
 *
 *   node scripts/i18n-traducido.js          # falla si hay texto sin traducir
 *   node scripts/i18n-traducido.js --lista  # imprime las claves, para trabajar
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'lib', 'i18n');
const ORIGEN = 'en';
const IDIOMAS = ['es', 'de', 'fr', 'ru', 'zh', 'ja', 'ar', 'pt', 'it'];
// Sin alfabeto latino: aquí una frase idéntica al inglés no admite discusión.
const SIN_LATINO = new Set(['ru', 'zh', 'ja', 'ar']);

const MIN_LARGO = 25;

// Claves cuyo valor coincide con el inglés A PROPÓSITO. Cada una con su motivo:
// una excepción sin explicar es un fallo escondido.
const EXCEPCIONES = {
  // clave: { motivo, idiomas: true | ['de', 'fr'] }
  //
  // Todas éstas coinciden con el inglés en los diez idiomas porque su contenido
  // no es idioma: son símbolos, marcas o nomenclatura que el sector usa igual
  // en todas partes. Traducir «EUR/USD» o «Apple Pay» sería un error, no una
  // mejora.
  appPromoPlatforms: { motivo: 'nombres de sistemas operativos', idiomas: true },
  forexExamples: { motivo: 'pares de divisas: notación universal', idiomas: true },
  stocksExamples: { motivo: 'tickers de bolsa: son identificadores, no palabras', idiomas: true },
  cryptoDesc: { motivo: 'tickers de cripto + «Stablecoins», préstamo en los diez', idiomas: true },
  revolutDesc: { motivo: 'nombres de marca (Revolut Pay, Apple Pay, Google Pay)', idiomas: true },
  optionsAICoach: { motivo: 'nombre de producto propio + modelo', idiomas: true },
  optContractsKbdHint: { motivo: 'símbolos de teclado: no llevan texto', idiomas: true },
  feeHint_adv004: { motivo: 'nombres de bróker con sus comisiones', idiomas: true },
  mock_shortCallNakedSell_311c7764: {
    motivo: 'nomenclatura de estructuras de opciones: el sector la usa en inglés',
    idiomas: true,
  },
  basicsSummaryLotsDesc: {
    motivo: 'tamaños de lote: «Micro · Mini · Standard · Macro» se escribe igual en las lenguas latinas',
    idiomas: ['it', 'de', 'fr', 'pt'],
  },
  tsysTickersPh: {
    motivo: '«Optional» se escribe igual en de/fr/pt/it y el resto son tickers',
    idiomas: ['de', 'fr', 'pt', 'it'],
  },
  tfOptionStrategyPlaceholder: {
    motivo: 'nombres de estrategia (Bull Put Spread, Iron Condor, PMCC) sin traducir en el sector',
    idiomas: true,
  },

  // Nomenclatura de análisis técnico que el sector usa en inglés en TODOS los
  // idiomas. Estas siete salieron a la luz al hacer que el verificador leyera
  // también los `.edu.js`; no son deuda de traducción, son el nombre de la cosa.
  // Los textos que las EXPLICAN sí están traducidos: lo que se conserva es el
  // término, no la frase.
  mstrDennisName: { motivo: 'nombre propio + apodo del grupo (los Turtles)', idiomas: true },
  imethProfileName: {
    motivo: '«Volume Profile / Market Profile»: nombre de la técnica, en inglés en el sector',
    idiomas: true,
  },
  advVolProfileName: { motivo: 'igual que imethProfileName', idiomas: true },
  advVsaName: { motivo: 'VSA (Volume Spread Analysis): siglas del método', idiomas: true },
  advSqueezeName: {
    motivo: '«Squeeze» + los apellidos de los indicadores (Bollinger, Keltner)',
    idiomas: true,
  },
  fomoTitle: { motivo: 'FOMO: sigla adoptada tal cual en los diez idiomas', idiomas: true },
  pfofPfofName: {
    motivo: 'Payment for order flow (PFOF): término regulatorio, se cita en inglés',
    idiomas: true,
  },
};

const LINEA = /^\s*"([A-Za-z0-9_]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm;

// Los diccionarios de cada idioma viven en DOS ficheros: `<idioma>.js` y
// `<idioma>.edu.js` (toda la academia — Wyckoff, COT, Renko, Heikin Ashi…).
//
// ⚠️ Esta función leía sólo el primero. Con 2.308 claves de academia por idioma
// fuera del alcance, imprimía «✅ ninguna clave se queda con el texto del idioma
// de origen» mientras 103 claves seguían en inglés literal en los nueve idiomas
// no ingleses, montadas y visibles en pantalla. Es exactamente el fallo que el
// propio verificador dice cerrar, una carpeta más allá.
//
// Si mañana aparece un tercer fichero por idioma, va aquí.
const SUFIJOS = ['.js', '.edu.js'];

function lee(idioma) {
  const out = {};
  for (const suf of SUFIJOS) {
    const ruta = path.join(DIR, `${idioma}${suf}`);
    if (!fs.existsSync(ruta)) continue;
    const txt = fs.readFileSync(ruta, 'utf8');
    let m;
    LINEA.lastIndex = 0;
    while ((m = LINEA.exec(txt)) !== null) out[m[1]] = m[2];
  }
  return out;
}

function exceptuada(clave, idioma) {
  const e = EXCEPCIONES[clave];
  if (!e) return false;
  return e.idiomas === true || (Array.isArray(e.idiomas) && e.idiomas.includes(idioma));
}

const origen = lee(ORIGEN);
const frases = Object.entries(origen).filter(
  ([, v]) => v.length >= MIN_LARGO && v.includes(' '),
);

const porIdioma = {};
const todas = new Set();
for (const idioma of IDIOMAS) {
  const d = lee(idioma);
  porIdioma[idioma] = frases
    .filter(([k, v]) => d[k] === v && !exceptuada(k, idioma))
    .map(([k]) => k);
  porIdioma[idioma].forEach((k) => todas.add(k));
}

if (process.argv.includes('--lista')) {
  for (const idioma of IDIOMAS) {
    if (!porIdioma[idioma].length) continue;
    console.log(`\n── ${idioma} (${porIdioma[idioma].length}) ──`);
    porIdioma[idioma].forEach((k) => console.log(`${k}\t${origen[k]}`));
  }
  process.exit(0);
}

console.log(`  ${frases.length} claves del origen (${ORIGEN}) son frase de ≥${MIN_LARGO} caracteres\n`);
let dudosas = 0;
let seguras = 0;
for (const idioma of IDIOMAS) {
  const n = porIdioma[idioma].length;
  const certeza = SIN_LATINO.has(idioma);
  if (certeza) seguras += n; else dudosas += n;
  const marca = n === 0 ? '✅' : '❌';
  console.log(
    `  ${marca} ${idioma.padEnd(3)} ${String(n).padStart(4)} con el texto de ${ORIGEN} literal`
    + (certeza ? '   (alfabeto distinto: es prueba)' : ''),
  );
}

console.log('');
if (todas.size === 0) {
  console.log('✅ ninguna clave se queda con el texto del idioma de origen.');
  process.exit(0);
}

console.log(`❌ ${todas.size} clave(s) distintas se muestran SIN TRADUCIR.`);
if (seguras) {
  console.log(`   ${seguras} de ellas en ruso, chino, japonés o árabe, que no comparten`);
  console.log('   alfabeto con el inglés: ahí la coincidencia no puede ser casual.');
}
if (dudosas) {
  console.log(`   ${dudosas} en idiomas de alfabeto latino. Si alguna coincide de verdad,`);
  console.log('   añádela a EXCEPCIONES en este fichero CON SU MOTIVO.');
}
console.log('\n   Para trabajarlas:  node scripts/i18n-traducido.js --lista');
process.exit(1);
