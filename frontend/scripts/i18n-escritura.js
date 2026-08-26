#!/usr/bin/env node
/**
 * Que cada idioma esté escrito en SU sistema de escritura.
 *
 * El hueco que esto cierra
 * ------------------------
 * `i18n-check.js` comprueba paridad de claves. `i18n-traducido.js` comprueba
 * que el texto no sea el inglés literal. Ninguno de los dos mira los
 * CARACTERES, y por ahí se han colado ya dos erratas escribiendo traducciones
 * a mano:
 *
 *   · un 决 (chino) suelto dentro de una frase en italiano
 *   · un 별 (coreano) suelto dentro de una frase en japonés
 *
 * Las dos pasaron los dos verificadores anteriores sin despeinarse: la clave
 * existía en los diez idiomas y el texto no coincidía con el inglés. Sólo se
 * vieron leyendo. Un carácter de otro alfabeto en medio de una palabra es
 * siempre un error —nunca hay motivo para uno— así que se puede comprobar.
 *
 *   node scripts/i18n-escritura.js
 *
 * Sabotaje (obligatorio antes de fiarse, en los dos sentidos):
 *   · mete un 决 en una frase italiana  → tiene que FALLAR
 *   · mete 한글 en una japonesa          → tiene que FALLAR
 *   · deja los diccionarios como están  → tiene que PASAR
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'lib', 'i18n');

// Rangos por sistema de escritura. Lo que no está aquí (latino, dígitos,
// puntuación, símbolos, emoji, flechas) no se mira: es común a todos.
// Los rangos van en \u escapado a propósito. Escritos con el carácter literal,
// el rango árabe acaba en U+FEFF y eslint lo marcaba como espacio irregular —
// con razón: un carácter invisible dentro de una clase de caracteres es
// exactamente lo que nadie ve al revisar. Escapado se lee y se revisa.
const ESCRITURAS = {
  cirilico:  /[\u0400-\u052F]/u,                                     // cirilico + suplemento
  han:       /[\u4E00-\u9FFF\u3400-\u4DBF]/u,                        // ideogramas CJK
  kana:      /[\u3040-\u309F\u30A0-\u30FF]/u,                        // hiragana + katakana
  hangul:    /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/u,
  arabe:     /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFC]/u,
  hebreo:    /[\u0590-\u05FF]/u,
  tailandes: /[\u0E00-\u0E7F]/u,
  devanagari:/[\u0900-\u097F]/u,
};

// Qué escritura puede aparecer en cada idioma. El griego NO se lista porque se
// permite en todos: Γ, Δ, Θ, σ y α son notación financiera, no idioma.
const PERMITIDO = {
  es: [], en: [], de: [], fr: [], pt: [], it: [],
  ru: ['cirilico'],
  zh: ['han'],
  ja: ['han', 'kana'],
  ar: ['arabe'],
};

const IDIOMAS = Object.keys(PERMITIDO);

/** Extrae los pares clave→valor de un diccionario sin ejecutarlo. */
function leeDiccionario(fichero) {
  const src = fs.readFileSync(fichero, 'utf8');
  const pares = [];
  const re = /^\s*"([^"]+)":\s*("(?:[^"\\]|\\.)*")\s*,?\s*$/gm;
  let m;
  while ((m = re.exec(src))) {
    let valor;
    try { valor = JSON.parse(m[2]); } catch { continue; }
    pares.push({ clave: m[1], valor, linea: src.slice(0, m.index).split('\n').length });
  }
  return pares;
}

const fallos = [];
let revisados = 0;

for (const lang of IDIOMAS) {
  const permitido = new Set(PERMITIDO[lang]);
  for (const sufijo of ['.js', '.edu.js']) {
    const fichero = path.join(DIR, `${lang}${sufijo}`);
    if (!fs.existsSync(fichero)) continue;

    for (const { clave, valor, linea } of leeDiccionario(fichero)) {
      revisados++;
      for (const [nombre, re] of Object.entries(ESCRITURAS)) {
        if (permitido.has(nombre)) continue;
        const hit = valor.match(re);
        if (!hit) continue;
        fallos.push({
          fichero: `${lang}${sufijo}`,
          linea,
          clave,
          escritura: nombre,
          caracter: hit[0],
          contexto: valor.slice(Math.max(0, hit.index - 25), hit.index + 25),
        });
      }
    }
  }
}

if (fallos.length) {
  console.error(`\n❌ ${fallos.length} valor(es) con caracteres de otro sistema de escritura:\n`);
  for (const f of fallos) {
    console.error(`  ${f.fichero}:${f.linea}  ${f.clave}`);
    console.error(`     ${f.escritura} «${f.caracter}» en: …${f.contexto}…`);
  }
  console.error('\nUn carácter de otro alfabeto dentro de una frase es siempre una errata.');
  process.exit(1);
}

console.log(`✅ ${revisados} valores: cada idioma en su escritura.`);
