#!/usr/bin/env node
/**
 * `t` tiene que ser una función NUEVA por idioma.
 *
 * Qué invariante es esta, y por qué merece un verificador propio
 * -------------------------------------------------------------
 * `t` vivía en el store de zustand como una única función que leía el idioma
 * activo en cada llamada. Traducía bien y su identidad no cambiaba nunca, así
 * que los diecisiete `useMemo`/`useCallback` que la llevan como dependencia
 * —el patrón natural, y el que exige `react-hooks/exhaustive-deps`— no se
 * recalculaban jamás al cambiar de idioma: se quedaban congelados en el idioma
 * del primer render (BUG-066). En la portada eso se veía como el menú en
 * inglés y la descripción de Margex en español, en la misma pantalla.
 *
 * El arreglo fue `creaT(locale)`, que devuelve una función por idioma. Desde
 * entonces `[t]` es una dependencia CORRECTA y el patrón natural funciona.
 * Esta comprobación existe para que siga siéndolo.
 *
 * Por qué NO basta con la sonda de navegador
 * ------------------------------------------
 * `tests/e2e/navegador/idioma-arranque.js` mira un texto memoizado de la
 * marquesina de socios y comprueba que cambia al cambiar de idioma. Cazaba
 * esto — hasta que el propio memo pasó a llevar `locale` en sus dependencias
 * (hizo falta para traducir los países con `Intl.DisplayNames`). Desde ese
 * momento ese componente recalcula por `locale` aunque `t` no cambie, y la
 * sonda dejó de discriminar sin que nada avisara: **el testigo dejó de ser
 * sensible al fallo que vigilaba**. Se descubrió porque el sabotaje controlado
 * pasó a sobrevivir.
 *
 * La lección es la de siempre en este repositorio: una comprobación indirecta
 * envejece cuando cambia aquello a través de lo cual mira. Y no queda ningún
 * memo con `[t]` a secas en una pantalla pública, así que no hay testigo nuevo
 * al que mudarse. La invariante se fija donde vive —el store— y no a través de
 * un componente que puede dejar de reflejarla.
 *
 *   node scripts/check-i18n-identidad.js
 */
const fs = require('fs');
const path = require('path');
const { registerHooks } = require('module');
const { pathToFileURL } = require('url');

const SRC = path.join(__dirname, '..', 'src');

// `lib/i18n.js` importa `'./i18n/en'` sin extensión, que es lo normal en un
// proyecto con webpack y lo que Node NO resuelve. Sin este gancho, cada
// `import()` de un diccionario falla, `ensureLocale` devuelve null, `setLocale`
// se sale por la primera línea y la comprobación acusa al código de un fallo
// que es del cargador. Se añade la extensión y se comprueba el MISMO fichero
// que compila el bundler, en vez de una copia adaptada.
registerHooks({
  resolve(especificador, contexto, siguiente) {
    if (especificador.startsWith('.') && !path.extname(especificador)) {
      const base = contexto.parentURL ? path.dirname(new URL(contexto.parentURL).pathname) : SRC;
      const candidato = path.resolve(base, `${especificador}.js`);
      if (fs.existsSync(candidato)) {
        return { url: pathToFileURL(candidato).href, shortCircuit: true };
      }
    }
    return siguiente(especificador, contexto);
  },
});

// `lib/i18n.js` usa `persist` de zustand, que en el arranque busca
// `localStorage`. En Node no existe: se pone uno mínimo en memoria ANTES de
// importar el módulo. No es simular el navegador, es darle a `persist` el
// almacén que pide para poder observar el store de verdad.
if (typeof globalThis.localStorage === 'undefined') {
  const memoria = new Map();
  globalThis.localStorage = {
    getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
    setItem: (k, v) => memoria.set(k, String(v)),
    removeItem: (k) => memoria.delete(k),
    clear: () => memoria.clear(),
  };
}
// `applyDomLocale` toca `document.documentElement`. Sin él, `setLocale` revienta.
if (typeof globalThis.document === 'undefined') {
  globalThis.document = { documentElement: {} };
}

(async () => {
  const { useI18nStore } = await import(
    pathToFileURL(path.join(SRC, 'lib', 'i18n.js')).href);

  const fallos = [];
  const linea = (ok, txt) => console.log(`  ${ok ? '✅' : '❌'} ${txt}`);

  const tInicial = useI18nStore.getState().t;

  // Cambiar de idioma tiene que reponer `t`. Se prueban varios saltos, no uno:
  // un arreglo que sólo repusiera en el primer cambio pasaría con uno solo.
  let anterior = tInicial;
  for (const idioma of ['en', 'ja', 'de', 'es']) {
    // eslint-disable-next-line no-await-in-loop
    await useI18nStore.getState().setLocale(idioma);
    const ahora = useI18nStore.getState().t;
    const cambio = ahora !== anterior;
    if (!cambio) {
      fallos.push(`al pasar a "${idioma}" la identidad de t NO cambió`);
    }
    linea(cambio, `cambio a ${idioma}: t es una función nueva`);
    anterior = ahora;
  }

  // Y tiene que seguir TRADUCIENDO bien, no sólo cambiar de identidad. Sin
  // esto, «devolver siempre una función nueva que no traduce» pasaría.
  await useI18nStore.getState().setLocale('en');
  const en = useI18nStore.getState().t('heroDescription');
  await useI18nStore.getState().setLocale('es');
  const es = useI18nStore.getState().t('heroDescription');
  const traduce = en && es && en !== es && !/^heroDescription$/.test(en);
  if (!traduce) {
    fallos.push(`t no traduce: en="${String(en).slice(0, 40)}" es="${String(es).slice(0, 40)}"`);
  }
  linea(traduce, 'y sigue traduciendo: heroDescription difiere entre en y es');

  console.log('');
  if (fallos.length) {
    console.error('❌ la identidad de `t` no acompaña al idioma:');
    fallos.forEach((f) => console.error(`   · ${f}`));
    console.error('\n   Con `t` estable, todo `useMemo(..., [t])` se congela en el idioma');
    console.error('   del primer render. Ver `creaT` en src/lib/i18n.js y BUG-066.');
    process.exit(1);
  }
  console.log('✅ `t` es una función nueva por idioma, y traduce.');
})().catch((e) => {
  console.error('❌ no se pudo comprobar:', e.message);
  process.exit(1);
});
