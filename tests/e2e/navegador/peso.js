/**
 * Cuánto se descarga de verdad al entrar en cada pantalla pública.
 *
 * Por qué esto y no una nota de «hay que optimizar»
 * ------------------------------------------------
 * El skill `reorganizar-frontend` ya dice QUÉ hay que arreglar —una sola llamada
 * a `React.lazy` en toda la aplicación, así que quien entra en la portada se
 * descarga `AdminPage`, la Academia entera y los textos legales sin usarlos—.
 * Lo que faltaba era **poder medirlo y que una regresión falle**. Un consejo que
 * nadie puede comprobar envejece; un presupuesto que rompe CI, no.
 *
 * Qué mide exactamente, y qué NO
 * ------------------------------
 * Suma `encodedBodySize` de los recursos que pide el navegador con la caché
 * fría, por tipo. Eso es **lo que sale por el cable desde el servidor local**,
 * que **no comprime**. GitHub Pages sí comprime, así que el usuario real
 * descarga bastante menos.
 *
 * ⚠️ Esa diferencia importa: **este número no es el que ve tu usuario**. Es una
 * vara de medir consistente para detectar que una pantalla ha engordado, no una
 * estimación de su experiencia. Confundir las dos cosas sería inventarse una
 * medición, que es justo lo que este repositorio no hace.
 *
 * Tampoco mide LCP, CLS ni INP. En un contenedor con CPU compartida esas cifras
 * bailan entre ejecuciones, y una puerta que falla según lo cargado que esté el
 * servidor de integración es una puerta que se acaba desactivando. Se informa de
 * ellas, no se decide con ellas.
 *
 *   node tests/e2e/navegador/peso.js              # mide y compara
 *   node tests/e2e/navegador/peso.js --actualizar # reescribe el presupuesto
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, descartaModales, BASE } = require('../entorno');

const PRESUPUESTO = path.join(__dirname, '..', 'presupuesto-peso.json');
// Holgura sobre lo medido, en BYTES ABSOLUTOS y no en porcentaje.
//
// ⚠️ La primera versión usaba +8 %. Parece razonable hasta que haces la cuenta:
// sobre una pantalla de 1 MB son **80 KB de holgura**, o sea una librería
// entera colándose sin que salte nada. Comprobado — se le metió a `/about` un
// import de 27 KB que no usa y el verificador siguió en verde.
//
// Lo que se quiere cazar es «alguien ha añadido algo gordo», y eso es una
// cantidad fija de KB, no una fracción del tamaño actual. Con un porcentaje,
// cuanto más engorda una pantalla más fácil le resulta seguir engordando.
const HOLGURA = 15 * 1024;

// Sólo rutas PÚBLICAS. Medir una que redirige al login mide el login.
const RUTAS = [
  { ruta: '/', nombre: 'portada' },
  { ruta: '/pricing', nombre: 'precios' },
  { ruta: '/legal', nombre: 'legales' },
  { ruta: '/brokers', nombre: 'brokers' },
  { ruta: '/about', nombre: 'sobre' },
];

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function mide(nav, ruta) {
  // Contexto nuevo por ruta: caché fría, que es como llega un visitante.
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle', timeout: 60000 });
  await descartaModales(page).catch(() => {});
  await page.waitForTimeout(600);

  const m = await page.evaluate(() => {
    const rec = performance.getEntriesByType('resource');
    const suma = (f) => rec.filter(f).reduce((t, r) => t + (r.encodedBodySize || 0), 0);
    const nav0 = performance.getEntriesByType('navigation')[0];
    const pintados = performance.getEntriesByType('paint');
    return {
      js: suma((r) => r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name)),
      css: suma((r) => r.initiatorType === 'link' && /\.css(\?|$)/.test(r.name)),
      total: suma(() => true) + (nav0 ? nav0.encodedBodySize || 0 : 0),
      peticiones: rec.length,
      // Informativo, NO puerta: en CPU compartida esto baila.
      fcp: Math.round(pintados.find((p) => p.name === 'first-contentful-paint')?.startTime || 0),
      domListo: Math.round(nav0?.domContentLoadedEventEnd || 0),
    };
  });
  await ctx.close();
  return m;
}

(async () => {
  const actualizar = process.argv.includes('--actualizar');
  const nav = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const medido = {};

  try {
    for (const { ruta, nombre } of RUTAS) {
      medido[nombre] = await mide(nav, ruta);
    }
  } finally {
    await nav.close();
  }

  if (actualizar) {
    const nuevo = {
      _leeme: 'Generado por tests/e2e/navegador/peso.js --actualizar. Bytes SIN comprimir '
        + 'servidos por el servidor local; el usuario real recibe menos (Pages comprime). '
        + 'Subir un número aquí es una DECISIÓN: escribe por qué en el commit.',
      _medido_el: new Date().toISOString().slice(0, 10),
      _holgura_bytes: HOLGURA,
      rutas: {},
    };
    for (const [nombre, m] of Object.entries(medido)) {
      nuevo.rutas[nombre] = { js: m.js + HOLGURA, total: m.total + HOLGURA };
    }
    fs.writeFileSync(PRESUPUESTO, `${JSON.stringify(nuevo, null, 2)}\n`);
    console.log(`✓ presupuesto reescrito en ${path.relative(process.cwd(), PRESUPUESTO)}`);
    for (const [nombre, m] of Object.entries(medido)) {
      console.log(`  ${nombre.padEnd(9)} js ${kb(m.js).padStart(8)}  total ${kb(m.total).padStart(8)}`);
    }
    return;
  }

  if (!fs.existsSync(PRESUPUESTO)) {
    console.error('❌ no hay presupuesto. Créalo con --actualizar y revísalo antes de commitear.');
    process.exit(1);
  }
  const pres = JSON.parse(fs.readFileSync(PRESUPUESTO, 'utf8'));
  const fallos = [];

  console.log(`\n  peso por pantalla (sin comprimir · presupuesto del ${pres._medido_el})\n`);
  for (const { nombre } of RUTAS) {
    const m = medido[nombre];
    const p = pres.rutas[nombre];
    if (!p) {
      fallos.push(`${nombre}: sin presupuesto`);
      console.log(`  ❌ ${nombre.padEnd(9)} sin presupuesto — añádelo con --actualizar`);
      continue;
    }
    const okJs = m.js <= p.js;
    const okTotal = m.total <= p.total;
    if (!okJs) fallos.push(`${nombre}: JS ${kb(m.js)} > ${kb(p.js)}`);
    if (!okTotal) fallos.push(`${nombre}: total ${kb(m.total)} > ${kb(p.total)}`);
    console.log(
      `  ${okJs && okTotal ? '✅' : '❌'} ${nombre.padEnd(9)}`
      + ` js ${kb(m.js).padStart(8)} / ${kb(p.js).padStart(8)}`
      + `   total ${kb(m.total).padStart(8)} / ${kb(p.total).padStart(8)}`
      + `   ${String(m.peticiones).padStart(3)} peticiones`
      + `   · fcp ${m.fcp} ms (informativo)`,
    );
  }

  console.log('');
  if (fallos.length) {
    console.log('❌ una pantalla ha engordado por encima de su presupuesto:');
    fallos.forEach((f) => console.log(`   · ${f}`));
    console.log('\n   Si el aumento es DELIBERADO, súbelo con --actualizar y di por qué en');
    console.log('   el commit. Lo que no vale es que crezca sin que nadie lo note.');
    process.exit(1);
  }
  console.log('✅ ninguna pantalla pública se ha pasado de su presupuesto.');
})();
