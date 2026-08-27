#!/usr/bin/env node
/**
 * Que el quiz siga calificando lo que dice calificar, en los diez idiomas.
 *
 * El fallo que vigila
 * -------------------
 * Las tres opciones de cada pregunta son tres claves distintas (`…a`, `…b`,
 * `…c`) y la correcta se declara por su letra en `EducationPage.jsx`. Eso ata
 * la corrección a la CLAVE, no a una posición — pero no impide lo otro: que en
 * una traducción alguien intercambie los VALORES entre `a` y `b`.
 *
 * Siete de las dieciocho preguntas tienen opciones que son opuestos exactos:
 * «sube / baja», «sobrecomprado / sobrevendido», «duplica / reduce a la mitad»,
 * «vender prima / comprar prima». En ésas, un intercambio de valores hace que
 * el quiz califique justo al revés **y parezca perfectamente razonable**: la
 * pregunta se lee bien, las tres opciones se leen bien, y el usuario recibe un
 * ✅ por la respuesta equivocada. No hay error de sintaxis, no falta ninguna
 * clave, `i18n-check` da verde. Sólo se ve leyendo los diez idiomas a la vez.
 *
 * Así que se lee. Para cada una de esas siete, se declara el concepto que la
 * opción CORRECTA tiene que expresar en cada idioma y el que tiene que
 * expresar la INCORRECTA, y se comprueban los dos sentidos. La aserción
 * negativa importa tanto como la positiva: sin ella, una opción que dijera las
 * dos cosas pasaría.
 *
 * Comprobado el 2026-08-26: los diez idiomas estaban bien. Esto no arregla nada
 * hoy; impide que se rompa mañana sin que nadie se entere.
 *
 *   node scripts/check-quiz.js
 *
 * Sabotaje (los dos sentidos):
 *   · intercambia qzStart1a y qzStart1b en cualquier idioma → tiene que FALLAR
 *   · reescribe una opción manteniendo el sentido            → tiene que PASAR
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'lib', 'i18n');
const PAGINA = path.join(__dirname, '..', 'src', 'pages', 'EducationPage.jsx');
const IDIOMAS = ['es', 'en', 'de', 'fr', 'ru', 'zh', 'ja', 'ar', 'pt', 'it'];

/**
 * Las siete preguntas cuyas opciones son opuestos, con el concepto que cada
 * lado debe expresar. Las alternativas separadas por `|` son sinónimos
 * legítimos: se acepta cualquiera, para que reescribir una traducción con otra
 * palabra correcta no dispare un falso positivo.
 */
const INVERTIBLES = {
  qzStart1: {
    correcta: { es: 'sube', en: 'up', de: 'steigt', fr: 'monte', ru: 'рост',
                zh: '上涨', ja: '上が', ar: 'ارتفاع', pt: 'sobe', it: 'sale' },
    incorrecta: { es: 'baja', en: 'down', de: 'fällt', fr: 'baisse', ru: 'падени',
                  zh: '下跌', ja: '下が', ar: 'انخفاض', pt: 'desce', it: 'scende' },
  },
  qzTech2: {
    correcta: { es: 'más altos', en: 'higher', de: 'höhere', fr: 'hauts', ru: 'высок',
                zh: '抬高', ja: '切り上が', ar: 'أعلى', pt: 'mais altos', it: 'più alti' },
    incorrecta: { es: 'más bajos', en: 'lower', de: 'tiefere', fr: 'bas', ru: 'низк',
                  zh: '降低', ja: '切り下が', ar: 'أدنى', pt: 'mais baixos', it: 'più bassi' },
  },
  qzTech3: {
    correcta: { es: 'sobrecomprado', en: 'overbought', de: 'überkauft', fr: 'suracheté',
                ru: 'перекуплен', zh: '超买', ja: '買われ過ぎ', ar: 'شرائي',
                pt: 'sobrecomprado', it: 'ipercomprato' },
    incorrecta: { es: 'sobrevendido', en: 'oversold', de: 'überverkauft', fr: 'survendu',
                  ru: 'перепродан', zh: '超卖', ja: '売られ過ぎ', ar: 'بيعي',
                  pt: 'sobrevendido', it: 'ipervenduto' },
  },
  qzAdv3: {
    correcta: { es: 'mitad', en: 'halve', de: 'halbiert', fr: 'divise par deux',
                ru: 'вдвое', zh: '减半', ja: '半分', ar: 'النصف',
                pt: 'metade', it: 'dimezza' },
    incorrecta: { es: 'duplica', en: 'double', de: 'verdoppelt', fr: 'double',
                  ru: 'удваивает', zh: '翻倍', ja: '倍', ar: 'يضاعف',
                  pt: 'duplica', it: 'raddoppia' },
  },
  qzPsy2: {
    // El sesgo de disposición: cortar GANANCIAS pronto. La opción incorrecta
    // dice lo contrario y es, además, la conducta correcta — por eso una
    // inversión aquí no sólo califica mal: enseña justo lo contrario.
    correcta: { es: 'Cortar ganancias', en: 'Cutting winners', de: 'Gewinne früh',
                fr: 'Couper les gains', ru: 'Резать прибыль', zh: '过早止盈',
                ja: '利益を早く切', ar: 'قطع الأرباح', pt: 'Cortar lucros',
                it: 'Tagliare presto i guadagni' },
    incorrecta: { es: 'Cortar pérdidas', en: 'Cutting losers', de: 'Verluste früh',
                  fr: 'Couper les pertes', ru: 'Резать убытки', zh: '过早止损',
                  ja: '損を早く切', ar: 'قطع الخسائر', pt: 'Cortar perdas',
                  it: 'Tagliare presto le perdite' },
  },
  qzPro1: {
    correcta: { es: 'Vender prima', en: 'Sell', de: 'verkaufen', fr: 'Vendre',
                ru: 'Продаже', zh: '卖出', ja: '売る', ar: 'بيع',
                pt: 'Vender', it: 'Vendere' },
    incorrecta: { es: 'Comprar prima', en: 'Buy', de: 'kaufen', fr: 'Acheter',
                  ru: 'Покупке', zh: '买入', ja: '買う', ar: 'شراء',
                  pt: 'Comprar', it: 'Comprare' },
  },
  qzPro2: {
    correcta: { es: 'Compró', en: 'Bought', de: 'gekauft|kaufte', fr: 'acheté',
                ru: 'Купил', zh: '买入', ja: '買った', ar: 'اشترى',
                pt: 'Comprou', it: 'comprato' },
    incorrecta: { es: 'Vendió', en: 'Sold', de: 'verkauft|verkaufte', fr: 'vendu',
                  ru: 'Продал', zh: '卖出', ja: '売った', ar: 'باع',
                  pt: 'Vendeu', it: 'venduto' },
  },
};

/** La letra correcta de cada pregunta, leída del componente. No se duplica aquí. */
function letrasCorrectas() {
  const src = fs.readFileSync(PAGINA, 'utf8');
  const ini = src.indexOf('const QUIZ_BANK = {');
  if (ini < 0) throw new Error('No se encuentra QUIZ_BANK en EducationPage.jsx');
  const bloque = src.slice(ini, src.indexOf('};', ini));
  const salida = {};
  for (const m of bloque.matchAll(/keys:\s*\[([^\]]+)\][^}]*?correct:\s*\[([^\]]+)\]/g)) {
    const claves = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    const letras = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    if (claves.length !== letras.length) {
      throw new Error(`QUIZ_BANK: ${claves.length} preguntas y ${letras.length} respuestas`);
    }
    claves.forEach((c, i) => { salida[c] = letras[i]; });
  }
  return salida;
}

function dicc(lang) {
  const leer = (f) => {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) return {};
    const src = fs.readFileSync(p, 'utf8');
    const out = {};
    for (const m of src.matchAll(/^\s*"([^"]+)":\s*("(?:[^"\\]|\\.)*")\s*,?\s*$/gm)) {
      try { out[m[1]] = JSON.parse(m[2]); } catch { /* valor no literal */ }
    }
    return out;
  };
  return { ...leer(`${lang}.js`), ...leer(`${lang}.edu.js`) };
}

/**
 * ¿Dice este texto ese concepto?
 *
 * Con LÍMITE DE PALABRA, no `includes` pelado. El `includes` daba dos falsos
 * positivos en alemán en la primera ejecución: «verkaufen» contiene «kaufen» y
 * «verkaufte» contiene «kaufte», así que la opción correcta parecía decir
 * también la incorrecta. Justo el par que este verificador existe para
 * distinguir — y habría obligado a «arreglar» una traducción que estaba bien.
 *
 * En chino y japonés no hay límite de palabra que valga, así que ahí se busca
 * la subcadena tal cual: 买入 y 卖出 no se contienen mutuamente.
 *
 * Las alternativas van separadas por `|`: basta con que aparezca una, para que
 * reescribir una traducción con otra palabra correcta no dispare la alarma.
 */
function contiene(texto, agujas) {
  const t = texto.toLowerCase();
  return String(agujas).split('|').some((aguja) => {
    const a = aguja.trim().toLowerCase();
    if (!a) return false;
    if (!/[a-z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF]/.test(a)) return t.includes(a);
    const esc = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Límite sólo al PRINCIPIO. Sin él, «kaufen» casaba dentro de «verkaufen» y
    // el verificador acusaba a una traducción correcta. Con límite también al
    // final se iba al otro extremo: «halve» dejaba de casar con «Halves»,
    // «sell» con «Selling» y «высок» con «высокие», y acusaba a otras tres.
    // La forma que sirve aquí es prefijo de palabra: estos idiomas flexionan
    // por el final, así que el principio ancla y el final se deja libre.
    return new RegExp(`(?<![\\p{L}])${esc}`, 'u').test(t);
  });
}

const correctas = letrasCorrectas();
const fallos = [];
let comprobaciones = 0;

// Coherencia previa: si el componente deja de declarar alguna de las siete, el
// verificador estaría mirando al vacío y diría que todo va bien.
for (const clave of Object.keys(INVERTIBLES)) {
  if (!correctas[clave]) fallos.push(`${clave}: QUIZ_BANK ya no la declara — este check dejaría de cubrirla`);
}

for (const lang of IDIOMAS) {
  const D = dicc(lang);
  for (const [clave, esperado] of Object.entries(INVERTIBLES)) {
    const letra = correctas[clave];
    if (!letra) continue;
    const otra = ['a', 'b', 'c'].find((L) => L !== letra && D[clave + L] !== undefined);
    const textoOk = D[clave + letra];
    const textoNo = D[clave + otra];
    if (textoOk === undefined || textoNo === undefined) {
      fallos.push(`${lang} ${clave}: falta alguna de las opciones`);
      continue;
    }
    const debeDecir = esperado.correcta[lang];
    const noDebeDecir = esperado.incorrecta[lang];
    comprobaciones += 2;

    if (!contiene(textoOk, debeDecir)) {
      fallos.push(`${lang} ${clave}${letra} (marcada CORRECTA) no dice «${debeDecir}»: «${textoOk}»`);
    }
    // La aserción negativa: la correcta no puede decir además lo contrario, o
    // un intercambio parcial pasaría.
    if (contiene(textoOk, noDebeDecir)) {
      fallos.push(`${lang} ${clave}${letra} (marcada CORRECTA) dice «${noDebeDecir}», que es la respuesta mala: «${textoOk}»`);
    }
  }
}

if (fallos.length) {
  console.error(`\n❌ ${fallos.length} problema(s) en el quiz:\n`);
  for (const f of fallos) console.error(`   · ${f}`);
  console.error('\nUn quiz que califica al revés es peor que no tener quiz: enseña lo contrario');
  console.error('y devuelve un ✅ mientras lo hace.');
  process.exit(1);
}

console.log(`✅ quiz: ${comprobaciones} comprobaciones sobre ${Object.keys(INVERTIBLES).length} preguntas invertibles × ${IDIOMAS.length} idiomas.`);
console.log('   La opción marcada correcta dice lo que tiene que decir, y no dice lo contrario.');
