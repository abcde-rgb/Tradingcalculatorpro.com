#!/usr/bin/env node
/**
 * Los enlaces de la Academia a las herramientas llevan a algún sitio.
 *
 * La academia tenía cinco enlaces salientes en 5.500 líneas y uno solo iba a
 * una calculadora: quince herramientas construidas, módulos que las mencionan,
 * y ninguna forma de llegar. Al arreglarlo aparecieron veintitantos enlaces
 * nuevos, y con ellos una forma de fallar que no hace ruido:
 *
 *   · `?tab=` con un nombre que el panel no acepta **no da error**. Te deja en
 *     la pestaña por defecto, y desde fuera parece que el enlace no hacía nada.
 *   · Un id que no está en `HERRAMIENTAS` hace `return null`: el enlace
 *     desaparece del render sin avisar a nadie.
 *   · Una clave i18n mal escrita se pinta cruda, y sólo en el idioma que nadie
 *     mira.
 *
 * Ninguna de las tres la ve el lint, ni el build, ni `i18n-check` —que sólo
 * compara diccionarios entre sí—. Se comprueban aquí, contra las listas reales
 * de los dos paneles de destino.
 *
 *   node scripts/check-enlaces-academia.js
 *
 * Sale con 1 si algún enlace no lleva a ninguna parte.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const lee = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

const IDIOMAS = ['es', 'en', 'de', 'fr', 'ru', 'zh', 'ja', 'ar', 'pt', 'it'];

function aborta(msg) {
  console.error(`❌ ${msg}`);
  console.error('   Si el bloque se ha renombrado o movido, actualiza este script:');
  console.error('   sin él los enlaces vuelven a poder romperse en silencio.');
  process.exit(1);
}

// ── Lo que la academia promete ────────────────────────────────────────────
const edu = lee('pages', 'EducationPage.jsx');

const hIni = edu.indexOf('const HERRAMIENTAS = {');
if (hIni < 0) aborta('No se encuentra la tabla HERRAMIENTAS en EducationPage.jsx.');
const hFin = edu.indexOf('\n};', hIni);
const bloque = edu.slice(hIni, hFin);

const HERRAMIENTAS = new Map(
  [...bloque.matchAll(/(\w+):\s*\{\s*to:\s*'([^']+)',\s*k:\s*'(\w+)'/g)]
    .map((m) => [m[1], { to: m[2], k: m[3] }]),
);
if (!HERRAMIENTAS.size) aborta('La tabla HERRAMIENTAS existe pero no se ha podido leer ni una entrada.');

// Los ids que el JSX usa de verdad. `ids={['a', 'b']}`.
const usados = new Set();
for (const m of edu.matchAll(/EnlacesHerramienta\s+ids=\{\[([^\]]*)\]\}/g)) {
  for (const id of m[1].matchAll(/'(\w+)'/g)) usados.add(id[1]);
}
if (!usados.size) aborta('Ningún <EnlacesHerramienta ids={[...]}> en la página: ¿se ha renombrado el componente?');

// ── Lo que los paneles de destino aceptan ─────────────────────────────────
const dash = lee('pages', 'DashboardPage.jsx');
const navIni = dash.indexOf('const CALC_NAV');
const navFin = dash.indexOf('\n  ];', navIni);
if (navIni < 0 || navFin < 0) aborta('No se encuentra CALC_NAV en DashboardPage.jsx.');
const tabsDash = new Set([...dash.slice(navIni, navFin).matchAll(/value: '([a-z0-9-]+)'/g)].map((m) => m[1]));

const perf = lee('pages', 'PerformancePage.jsx');
const pIni = perf.indexOf('const PESTANAS_PERFORMANCE = [');
if (pIni < 0) aborta('No se encuentra PESTANAS_PERFORMANCE en PerformancePage.jsx.');
const permitidasPerf = new Set(
  [...perf.slice(pIni, perf.indexOf('];', pIni)).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]),
);
// Y las que la página pinta de verdad. Que una pestaña esté permitida no
// significa que exista: `?tab=` la aceptaría y no se renderizaría nada.
const pintadasPerf = new Set([...perf.matchAll(/TabsContent value="([a-z0-9-]+)"/g)].map((m) => m[1]));

// ── Los diez diccionarios, para las etiquetas ─────────────────────────────
const clavesPorIdioma = new Map(
  IDIOMAS.map((l) => {
    const src = ['', '.edu'].map((s) => {
      const f = path.join(SRC, 'lib', 'i18n', `${l}${s}.js`);
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    }).join('\n');
    return [l, new Set([...src.matchAll(/^\s*"?([A-Za-z0-9_]+)"?:/gm)].map((m) => m[1]))];
  }),
);

// ── Comprobaciones ────────────────────────────────────────────────────────
let fallos = 0;
const mal = (msg, detalle) => { fallos++; console.error(`\n❌ ${msg}`); console.error(`   ${detalle}`); };

const huerfanos = [...usados].filter((id) => !HERRAMIENTAS.has(id));
if (huerfanos.length) {
  mal(`${huerfanos.length} id(s) enlazados que no están en HERRAMIENTAS: ${huerfanos.join(', ')}`,
    'El componente hace `return null`: el enlace no se pinta y nadie se entera.');
}

const sinUsar = [...HERRAMIENTAS.keys()].filter((id) => !usados.has(id));
if (sinUsar.length) {
  mal(`${sinUsar.length} entrada(s) de HERRAMIENTAS que ningún módulo usa: ${sinUsar.join(', ')}`,
    'O se enlazan desde algún módulo, o se quitan: una entrada muerta envejece sin que nada la mire.');
}

for (const [id, h] of HERRAMIENTAS) {
  const m = /^\/(dashboard|performance)\?tab=([a-z0-9-]+)$/.exec(h.to);
  if (!m) {
    mal(`El destino de '${id}' no tiene la forma esperada: ${h.to}`,
      'Se espera /dashboard?tab=… o /performance?tab=…; otra cosa no se puede comprobar.');
    continue;
  }
  const [, panel, tab] = m;
  if (panel === 'dashboard' && !tabsDash.has(tab)) {
    mal(`'${id}' enlaza a /dashboard?tab=${tab}, que no está en CALC_NAV`,
      'El visitante aterriza en la calculadora por defecto sin que nada avise.');
  }
  if (panel === 'performance') {
    if (!permitidasPerf.has(tab)) {
      mal(`'${id}' enlaza a /performance?tab=${tab}, que la página no acepta por la URL`,
        'Añádela a PESTANAS_PERFORMANCE o corrige el enlace.');
    } else if (!pintadasPerf.has(tab)) {
      mal(`'${id}' enlaza a /performance?tab=${tab}: permitida, pero no hay TabsContent que la pinte`,
        'La pestaña se activaría y no se vería nada.');
    }
  }

  for (const l of IDIOMAS) {
    if (!clavesPorIdioma.get(l).has(h.k)) {
      mal(`La etiqueta de '${id}' («${h.k}») no existe en ${l}`,
        'Se pintaría el nombre de la clave en crudo, y sólo en ese idioma.');
    }
  }
}

// Y al revés: la lista que el panel acepta no puede prometer pestañas que no
// existen. Sin esto, `?tab=` aceptaría un nombre fantasma y no pintaría nada.
const fantasma = [...permitidasPerf].filter((tab) => !pintadasPerf.has(tab));
if (fantasma.length) {
  mal(`PESTANAS_PERFORMANCE acepta pestañas que la página no pinta: ${fantasma.join(', ')}`,
    'Quítalas de la lista o añade su TabsContent.');
}

const total = HERRAMIENTAS.size;
console.log(`check-enlaces-academia — ${total} destinos · ${usados.size} usados en ${
  [...edu.matchAll(/EnlacesHerramienta\s+ids=/g)].length} enlaces de la Academia`);

if (fallos) {
  console.error(`\n${fallos} problema(s).`);
  process.exit(1);
}
console.log('✅ Cada enlace de la Academia lleva a una pestaña que existe, con etiqueta en los diez idiomas.');
