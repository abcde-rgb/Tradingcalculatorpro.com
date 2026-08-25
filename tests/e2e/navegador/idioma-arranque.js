/**
 * El arranque del idioma: se pinta traducido y se baja UN solo diccionario.
 *
 * Por qué hace falta una sonda propia
 * -----------------------------------
 * Desde el 2026-08-24 ningún diccionario viaja en `main.js`: `bootI18n()`
 * resuelve el idioma (?lang= → guardado → navegador) y espera a SU diccionario
 * antes del primer render. Eso quitó 297 KB del arranque, pero movió la
 * traducción al camino crítico: si el diccionario no llega antes de pintar,
 * `t()` devuelve la clave y el titular de la portada dice `heroTitle`.
 *
 * Ninguna de las puertas que ya existen ve eso. `i18n-check` compara ficheros
 * de idioma, no lo que acaba en pantalla. `peso.js` mide bytes y estaría
 * ENCANTADO con una portada rota: pesa menos. `npm run build` compila igual.
 * El fallo es de tiempo de ejecución y sólo se ve en un navegador de verdad.
 *
 * Qué comprueba, y por qué cada cosa
 * ----------------------------------
 *   1. **Se pinta traducido.** El titular no puede ser una clave i18n. Es el
 *      fallo que introduciría quitar la espera de `index.js`.
 *   2. **Un diccionario, no dos.** Es la razón de ser del cambio: antes, quien
 *      navegaba en inglés se bajaba el español (incrustado) *y* el inglés.
 *      Contar los chunks con un diccionario dentro es lo único que distingue
 *      «funciona» de «funciona y además ahorra».
 *   3. **El idioma que sale es el que se pidió**, por las tres vías.
 *   4. **Sin repintado de idioma.** `?lang=en` no puede enseñar español antes.
 *
 * Necesita el build servido en :3100 — `bash tests/e2e/stack/arriba.sh`.
 *
 *   node tests/e2e/navegador/idioma-arranque.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, descartaModales, BASE } = require('../entorno');

const I18N = path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'lib', 'i18n');

// El diccionario REAL, no una copia en la sonda. Misma técnica que
// `i18n-check.js`: el fichero es `export default { … }` y nada más.
//
// Leerlo de la fuente es lo que hace que esta sonda siga sirviendo cuando
// alguien reescriba el texto del hero. Una cadena copiada aquí a mano se
// quedaría atrás al primer cambio de copy y entonces habría dos salidas: o
// falla sin que nada esté roto, o se borra la comprobación.
function diccionario(lang) {
  const src = fs.readFileSync(path.join(I18N, `${lang}.js`), 'utf8')
    .replace(/export\s+default\s+/, 'return ');
  // eslint-disable-next-line no-new-func
  return new Function(src)();
}

// La clave que se compara. Tiene que ser prosa VISIBLE en la portada: con el
// `<h1>` no valdría — es «Trading CalculatorPRO», la marca, idéntica en los
// diez idiomas, y una comprobación contra eso pasa en verde aunque la página
// salga entera en el idioma equivocado.
const CLAVE_TESTIGO = 'heroDescription';
const normaliza = (s) => (s || '').replace(/\s+/g, ' ').trim();

// Un diccionario se reconoce porque define `heroTitle` como PROPIEDAD. La
// comilla importa: `t("heroTitle")` (la llamada, que sí está en main.js) se
// minifica a la cadena `"heroTitle"`, y el diccionario a `heroTitle:"…"`. Sin
// los dos puntos, esta sonda contaría main.js como diccionario y no detectaría
// jamás una regresión a la carga estática — que es justo lo que vigila.
const ES_DICCIONARIO = /heroTitle\s*:/;

// Textos con los que se distingue un idioma de otro sin depender de una clave
// concreta: es el `<html lang>` más una palabra que sólo existe en ese idioma.
const CASOS = [
  { nombre: 'navegador en inglés',   idioma: 'en-US', espera: 'en' },
  { nombre: 'navegador en alemán',   idioma: 'de-DE', espera: 'de' },
  { nombre: 'navegador en japonés',  idioma: 'ja-JP', espera: 'ja' },
  // Un idioma que no soportamos cae al español, no a una pantalla en blanco.
  { nombre: 'navegador en noruego',  idioma: 'nb-NO', espera: 'es' },
];

async function arranca(nav, { idioma, ruta = '/', almacenado = null }) {
  const ctx = await nav.newContext({
    locale: idioma,
    viewport: { width: 1366, height: 900 },
  });
  const diccionarios = [];
  // El cuerpo se lee en el momento: tras cerrar el contexto ya no se puede.
  ctx.on('response', async (res) => {
    if (!/\.js(\?|$)/.test(res.url())) return;
    try {
      const cuerpo = await res.text();
      if (ES_DICCIONARIO.test(cuerpo)) diccionarios.push(res.url().split('/').pop());
    } catch (_) { /* respuesta ya descartada */ }
  });

  const page = await ctx.newPage();
  if (almacenado) {
    // Sembrar zustand ANTES de que arranque la aplicación: es lo que ve un
    // visitante que ya eligió idioma en una visita anterior.
    await page.addInitScript((loc) => {
      localStorage.setItem('trading-i18n-storage', JSON.stringify({
        state: { locale: loc, autoDetected: true }, version: 0,
      }));
    }, almacenado);
  }

  // El texto del PRIMER pintado con contenido.
  //
  // ⚠️ La primera versión de esto vigilaba `<html lang>` y daba un falso
  // positivo perpetuo: `index.html` se sirve con `lang="es"` incrustado, así
  // que el atributo vale «es» desde antes de que exista JavaScript y cambia
  // después aunque no se haya pintado una sola palabra en español. El atributo
  // no es lo que ve el usuario. Lo que ve es esto: qué texto había en `#root`
  // la primera vez que hubo alguno.
  let primerPintado = null;
  await page.exposeFunction('anotaPintado', (txt) => {
    if (primerPintado === null && normaliza(txt)) primerPintado = normaliza(txt).slice(0, 4000);
  });
  await page.addInitScript(() => {
    const arranca = () => {
      const root = document.getElementById('root');
      if (!root) return;
      if (root.innerText?.trim()) { window.anotaPintado?.(root.innerText); return; }
      new MutationObserver((_, obs) => {
        if (root.innerText?.trim()) { window.anotaPintado?.(root.innerText); obs.disconnect(); }
      }).observe(root, { childList: true, subtree: true, characterData: true });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', arranca);
    } else arranca();
  });

  await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle', timeout: 60000 });
  await descartaModales(page).catch(() => {});
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    texto: document.body.innerText,
    // Una clave cruda que se cuele en cualquier parte del texto visible. Las
    // claves de este proyecto son camelCase sin espacios; la lista blanca son
    // marcas y tecnicismos que se escriben así de verdad.
    crudas: (document.body.innerText.match(/\b[a-z]+[A-Z][A-Za-z]{4,}\b/g) || [])
      .filter((s) => !/^(TradingCalculator|JavaScript|PayPal|YouTube|iPhone|iPad|eToro|xStation|cTrader|MetaTrader|NinjaTrader|TradingView|WebAuthn|OpenAI|GitHub|WhatsApp|LinkedIn)/.test(s))
      .slice(0, 8),
  }));
  await ctx.close();
  return { ...r, texto: normaliza(r.texto), diccionarios, primerPintado };
}

/**
 * Cambia el idioma con el selector de la cabecera —el camino del usuario, que
 * pasa por `pickLocale`— y lee dos textos: uno normal y otro que sale de un
 * `useMemo`. Que cambien los dos es lo que se comprueba.
 *
 * ⚠️ Esto NO es ya la red que caza BUG-066 (`t` con identidad estable). Lo fue
 * hasta que el memo de la marquesina pasó a llevar `locale` en sus
 * dependencias —hizo falta para traducir los países—: desde entonces recalcula
 * por `locale` aunque `t` no cambie, y el sabotaje controlado empezó a
 * sobrevivir. La invariante se comprueba ahora donde vive, en el store, con
 * `frontend/scripts/check-i18n-identidad.js`.
 *
 * Lo que sigue valiendo aquí es lo que se ve: que cambiar de idioma cambia el
 * texto de la pantalla, memoizado incluido. Es una afirmación de usuario, no
 * una prueba de la invariante.
 */
async function cambiaIdiomaEnCaliente(nav) {
  const ctx = await nav.newContext({ locale: 'es-ES', viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await descartaModales(page).catch(() => {});
  await page.waitForTimeout(400);

  const lee = () => page.evaluate(() => ({
    // Texto normal: `t()` llamado directamente en el render.
    nav: (document.querySelector('[data-testid="nav-pricing"]')?.textContent || '').trim(),
    // Texto memoizado: sale de `useTarjetas()`, un useMemo con `[brokers, t]`.
    memo: (document.querySelector('[data-testid="partner-desc-margex"]')?.textContent || '').trim(),
  }));

  const antes = await lee();
  await page.click('[data-testid="language-toggle"]');
  await page.waitForTimeout(400);
  await page.getByRole('menuitem', { name: /English/ }).click();
  await page.waitForTimeout(1500);
  const despues = await lee();

  await ctx.close();
  return { antes, despues };
}

(async () => {
  const nav = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const fallos = [];
  const linea = (ok, txt) => console.log(`  ${ok ? '✅' : '❌'} ${txt}`);

  try {
    console.log('\n  arranque del idioma (build servido, caché fría)\n');

    for (const caso of CASOS) {
      const r = await arranca(nav, caso);
      const testigo = normaliza(diccionario(caso.espera)[CLAVE_TESTIGO]);

      const okIdioma = r.lang === caso.espera;
      if (!okIdioma) fallos.push(`${caso.nombre}: <html lang> es "${r.lang}", se esperaba "${caso.espera}"`);
      linea(okIdioma, `${caso.nombre.padEnd(22)} → ${r.lang || '(vacío)'}`);

      const okUno = r.diccionarios.length === 1;
      if (!okUno) {
        fallos.push(`${caso.nombre}: ${r.diccionarios.length} diccionarios descargados `
          + `(${r.diccionarios.join(', ') || 'ninguno'}), debería ser 1`);
      }
      linea(okUno, `   diccionarios descargados: ${r.diccionarios.length}`);

      // Contra el diccionario de verdad: esto es lo que separa «se pintó algo»
      // de «se pintó EN ESTE IDIOMA».
      const okTexto = testigo.length > 0 && r.texto.includes(testigo);
      if (!okTexto) {
        fallos.push(`${caso.nombre}: no aparece el texto de "${CLAVE_TESTIGO}" en ${caso.espera} `
          + `— se esperaba «${testigo.slice(0, 60)}…»`);
      }
      linea(okTexto, `   texto en ${caso.espera}: «${testigo.slice(0, 44)}…»`);

      // Y ya en el PRIMER pintado, no tras un repintado.
      const okPrimero = r.primerPintado !== null && r.primerPintado.includes(testigo);
      if (!okPrimero) {
        fallos.push(`${caso.nombre}: el primer pintado no estaba en ${caso.espera} `
          + `— empezaba por «${(r.primerPintado || '(nada)').slice(0, 70)}»`);
      }
      linea(okPrimero, '   ya en el primer pintado, sin repintar');

      if (r.crudas.length) {
        fallos.push(`${caso.nombre}: claves crudas en pantalla — ${r.crudas.join(', ')}`);
        linea(false, `   claves crudas: ${r.crudas.join(', ')}`);
      }
    }

    // ── ?lang= manda sobre lo guardado, y desde el primer pintado ──────────
    const enlace = await arranca(nav, { idioma: 'es-ES', ruta: '/?lang=en', almacenado: 'es' });
    const okEnlace = enlace.lang === 'en';
    if (!okEnlace) fallos.push(`?lang=en sobre un guardado en español: salió "${enlace.lang}"`);
    linea(okEnlace, `?lang=en pisa el idioma guardado → ${enlace.lang}`);

    // Ni un fotograma en español, aunque el guardado dijera español: es el
    // parpadeo que tenía la portada cuando la detección vivía en un efecto de
    // `LandingPage` y el diccionario español ya estaba en main.js.
    const enEs = normaliza(diccionario('es')[CLAVE_TESTIGO]);
    const enEn = normaliza(diccionario('en')[CLAVE_TESTIGO]);
    const sinParpadeo = enlace.primerPintado !== null
      && enlace.primerPintado.includes(enEn)
      && !enlace.primerPintado.includes(enEs);
    if (!sinParpadeo) {
      fallos.push('?lang=en: el primer pintado no estaba ya en inglés — '
        + `empezaba por «${(enlace.primerPintado || '(nada)').slice(0, 70)}»`);
    }
    linea(sinParpadeo, '   sin un fotograma en español antes del inglés');

    const okEnlaceUno = enlace.diccionarios.length === 1;
    if (!okEnlaceUno) fallos.push(`?lang=en descargó ${enlace.diccionarios.length} diccionarios`);
    linea(okEnlaceUno, `   diccionarios descargados: ${enlace.diccionarios.length}`);

    // ── Cambiar de idioma cambia TODO el texto, también lo memoizado ──────
    //
    // Esta es la comprobación que cazó BUG-066. `t` era una función estable en
    // el store, así que diecisiete `useMemo(..., [t])` no se recalculaban nunca
    // al cambiar de idioma: el menú pasaba a inglés y la descripción de Margex
    // seguía en español, en la misma pantalla. Mirar sólo la navegación —lo que
    // hace cualquier prueba de idioma escrita a ojo— habría dado verde.
    const cambio = await cambiaIdiomaEnCaliente(nav);
    const okMenu = cambio.despues.nav !== cambio.antes.nav;
    if (!okMenu) fallos.push(`el menú no cambió al pasar a inglés: sigue en "${cambio.despues.nav}"`);
    linea(okMenu, `cambio en caliente es→en · menú: "${cambio.antes.nav}" → "${cambio.despues.nav}"`);

    const okMemo = cambio.despues.memo && cambio.despues.memo !== cambio.antes.memo;
    if (!okMemo) {
      fallos.push('un texto dentro de useMemo NO cambió al cambiar de idioma '
        + `(sigue diciendo «${cambio.antes.memo.slice(0, 50)}…») — `
        + 'la identidad de `t` no cambia con el idioma, ver creaT() en lib/i18n.js');
    }
    linea(okMemo, `   texto memoizado: «${cambio.antes.memo.slice(0, 34)}…» → «${cambio.despues.memo.slice(0, 34)}…»`);

    // ── El idioma guardado gana al del navegador ──────────────────────────
    const guardado = await arranca(nav, { idioma: 'en-US', almacenado: 'ar' });
    const okGuardado = guardado.lang === 'ar' && guardado.dir === 'rtl';
    if (!okGuardado) {
      fallos.push('un idioma guardado (ar) no gana al del navegador (en-US), '
        + `o falta dir=rtl: lang="${guardado.lang}" dir="${guardado.dir}"`);
    }
    linea(okGuardado, `el idioma guardado gana al del navegador → ${guardado.lang} (dir=${guardado.dir})`);
  } finally {
    await nav.close();
  }

  console.log('');
  if (fallos.length) {
    console.error(`❌ ${fallos.length} fallo(s) en el arranque del idioma:`);
    fallos.forEach((f) => console.error(`   · ${f}`));
    process.exit(1);
  }
  console.log('✅ un solo diccionario, el idioma correcto y sin claves crudas.');
})();
