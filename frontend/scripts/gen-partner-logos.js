#!/usr/bin/env node
/**
 * Los logos de los socios, descubiertos solos.
 *
 * Por qué existe
 * --------------
 * Los logos oficiales de los brókers son marcas registradas y los sirve cada
 * uno en su media kit de afiliados. Desde el entorno de desarrollo remoto **no
 * se pueden descargar**: el proxy de salida responde 403 a los seis dominios
 * (comprobado uno a uno, y también en dominios alternativos, en Wikimedia, en
 * los CDN de npm y en los servicios de favicon). `simple-icons`, el juego de
 * iconos de marca más grande que hay —3453 iconos, accesible desde aquí— no
 * tiene ninguno de los seis; sí tiene «Axis Bank» y «Axios», que son empresas
 * distintas y usarlas sería peor que no poner nada.
 *
 * Así que el fichero lo tiene que dejar una persona. Lo que hace este script es
 * que eso sea **lo único** que haga falta: deja
 * `src/assets/partners/<id>-square.png` y ya está. Sin tocar código, sin
 * acordarse de añadir un `import` a mano en un mapa que nadie recuerda que
 * existe — que es exactamente cómo un logo acaba en la carpeta sin salir en la
 * web y nadie entiende por qué.
 *
 * El `<id>` es el del bróker en `backend/brokers_referidos.py` (`axi`,
 * `dukascopy`, `swissquote`, `saxo`, `ibkr`, `vtmarkets`) o el del socio en
 * `RecommendedTools.jsx` (`margex`, `hyperliquid`).
 *
 * Uso
 * ---
 *   node scripts/gen-partner-logos.js            # genera
 *   node scripts/gen-partner-logos.js --check    # falla si está desfasado (CI)
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'assets', 'partners');
const SALIDA = path.join(DIR, 'logos.generated.js');
// Ordenadas por preferencia: ante `axi-square.svg` y `axi-square.png`, gana el
// vectorial, que es el que no se pixela en pantallas densas.
const EXTENSIONES = ['.svg', '.png', '.webp', '.jpg', '.jpeg'];
const PATRON = /^([a-z0-9-]+)-square(\.[a-z]+)$/;

function descubre() {
  if (!fs.existsSync(DIR)) return [];
  const porId = new Map();
  for (const fichero of fs.readdirSync(DIR).sort()) {
    const m = PATRON.exec(fichero);
    if (!m) continue;
    const [, id, ext] = m;
    if (!EXTENSIONES.includes(ext)) continue;
    const previo = porId.get(id);
    if (previo && EXTENSIONES.indexOf(path.extname(previo)) <= EXTENSIONES.indexOf(ext)) continue;
    porId.set(id, fichero);
  }
  return [...porId.entries()].sort(([a], [b]) => a.localeCompare(b));
}

// El nombre de la variable no puede salir del id tal cual: `vt-markets` no es
// un identificador válido en JavaScript.
const variable = (id) => `logo_${id.replace(/[^a-z0-9]/g, '_')}`;

function genera(entradas) {
  const imports = entradas.map(([id, f]) => `import ${variable(id)} from './${f}';`).join('\n');
  const mapa = entradas.map(([id]) => `  ${JSON.stringify(id)}: ${variable(id)},`).join('\n');
  return `// ⚠️ GENERADO por scripts/gen-partner-logos.js — NO editar a mano.
//
// Para añadir el logo de un socio o un bróker: deja el fichero en esta misma
// carpeta como \`<id>-square.svg\` (o .png/.webp/.jpg) y ejecuta
// \`node scripts/gen-partner-logos.js\`. El \`<id>\` es el del bróker en
// \`backend/brokers_referidos.py\` o el del socio en \`RecommendedTools.jsx\`.
//
// Sin fichero, la tarjeta pinta una ficha de marca propia (monograma, nombre y
// supervisor). Un logo que no tenemos no se imita: se deja el hueco honesto.
${imports ? `${imports}\n` : ''}
const LOGOS = {
${mapa}
};

export default LOGOS;
`;
}

const entradas = descubre();
const contenido = genera(entradas);
const comprobar = process.argv.includes('--check');

if (comprobar) {
  const actual = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8') : '';
  if (actual !== contenido) {
    console.error('❌ logos.generated.js no refleja los ficheros de src/assets/partners/.');
    console.error('   Arréglalo con: node scripts/gen-partner-logos.js');
    const tiene = entradas.map(([id]) => id);
    console.error(`   Logos encontrados en disco: ${tiene.length ? tiene.join(', ') : '(ninguno)'}`);
    process.exit(1);
  }
  console.log(`✓ logos de socios al día (${entradas.length}: ${entradas.map(([id]) => id).join(', ') || 'ninguno'})`);
} else {
  fs.writeFileSync(SALIDA, contenido);
  console.log(`✓ logos.generated.js — ${entradas.length} logo(s): ${entradas.map(([id]) => id).join(', ') || 'ninguno'}`);
  const sin = ['axi', 'dukascopy', 'swissquote', 'saxo', 'ibkr', 'vtmarkets']
    .filter((id) => !entradas.some(([e]) => e === id));
  if (sin.length) {
    console.log(`  falta el logo de: ${sin.join(', ')}`);
    console.log('  → déjalos como src/assets/partners/<id>-square.svg y vuelve a ejecutar esto');
  }
}
