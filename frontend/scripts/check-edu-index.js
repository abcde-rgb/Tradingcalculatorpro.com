#!/usr/bin/env node
/**
 * El índice de la Academia y su navegación tienen que decir lo mismo.
 *
 * `lib/eduIndex.js` declara los módulos que se pueden encontrar preguntando;
 * `pages/EducationPage.jsx` declara los que se pueden abrir navegando. Son dos
 * listas escritas a mano y ninguna de las dos avisa cuando se separan:
 *
 *   · Un módulo en la navegación y no en el índice existe pero **no se
 *     encuentra nunca**. Es el fallo silencioso: el contenido está escrito, la
 *     página lo pinta, y quien pregunta por él recibe otra cosa.
 *   · Un módulo en el índice y no en la navegación es un enlace roto: el
 *     buscador manda a un `?topic=` que la página no reconoce y el usuario
 *     aterriza en el módulo por defecto sin entender por qué.
 *
 * `engine-check.js` ya comprueba el índice contra los getters, pero no puede
 * leer la navegación: vive dentro de un componente de 5500 líneas y sólo
 * existe en tiempo de render. Aquí se extrae del fuente, que es feo pero es lo
 * único que no obliga a montar React para comprobar dos listas.
 *
 *   node scripts/check-edu-index.js
 *
 * Sale con 1 si divergen.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

function navTopicIds() {
  const page = fs.readFileSync(path.join(SRC, 'pages', 'EducationPage.jsx'), 'utf8');
  const start = page.indexOf('const EDUCATION_NAV');
  const end = page.indexOf('const totalTopics');
  if (start < 0 || end < 0 || end < start) {
    console.error('❌ No se encuentra el bloque EDUCATION_NAV en EducationPage.jsx.');
    console.error('   Si se ha renombrado o movido, actualiza este script: sin él, las');
    console.error('   dos listas vuelven a poder separarse sin que nada avise.');
    process.exit(1);
  }
  const block = page.slice(start, end);
  return [...block.matchAll(/value:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

function indexModuleIds() {
  const src = fs.readFileSync(path.join(SRC, 'lib', 'eduIndex.js'), 'utf8');
  return [...src.matchAll(/\{\s*id:\s*'([a-z0-9-]+)',\s*titleKey:/g)].map((m) => m[1]);
}

const nav = navTopicIds();
const idx = indexModuleIds();

const missing = nav.filter((id) => !idx.includes(id));
const extra = idx.filter((id) => !nav.includes(id));
const dupes = idx.filter((id, i) => idx.indexOf(id) !== i);

console.log(`check-edu-index — navegación: ${nav.length} · índice: ${idx.length}`);

let failed = false;
if (missing.length) {
  failed = true;
  console.error(`\n❌ ${missing.length} módulo(s) en la navegación y NO en el índice:`);
  console.error(`   ${missing.join(', ')}`);
  console.error('   Existen y no se encuentran preguntando. Añádelos a EDU_MODULES');
  console.error('   con su getter (o con `getters: []` si no tienen contenido indexable).');
}
if (extra.length) {
  failed = true;
  console.error(`\n❌ ${extra.length} módulo(s) en el índice y NO en la navegación:`);
  console.error(`   ${extra.join(', ')}`);
  console.error('   El buscador enviaría a un ?topic= que la página no reconoce.');
}
if (dupes.length) {
  failed = true;
  console.error(`\n❌ id(s) repetidos en el índice: ${[...new Set(dupes)].join(', ')}`);
}

if (failed) process.exit(1);
console.log('✅ Las dos listas coinciden.');
