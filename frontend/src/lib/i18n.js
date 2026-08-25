// i18n — carga perezosa de idiomas. NINGUNO viaja en main.js, ni siquiera el
// español: el diccionario que se descarga es el del idioma que se va a pintar,
// y sólo ese.
//
// Hasta el 2026-08-24 el español se importaba de forma estática y pesaba
// **297 KB de los 1.010 KB de main.js** — el 29% del arranque. Quien navegaba
// en cualquiera de los otros nueve idiomas se lo bajaba igual y ADEMÁS bajaba
// el suyo: dos diccionarios completos para leer uno. Y como la detección de
// idioma vivía en un efecto de `LandingPage`, la portada se pintaba primero en
// español y luego se repintaba, con el parpadeo a la vista.
//
// Lo que lo hacía necesario era el respaldo de `t()`: con `es` siempre en
// memoria, una clave que faltara en otro idioma caía al español en vez de
// pintar la clave cruda. Ese respaldo dejó de ser la red de seguridad cuando
// `i18n-check.js` (paridad de claves) e `i18n-traducido.js` (que además estén
// traducidas) pasaron a bloquear el PR: hoy la ausencia de huecos está
// demostrada antes de fusionar, no confiada al tiempo de ejecución. El
// respaldo se queda igualmente para el caso en que la RED falle — ver
// `ensureLocale`.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Caché en memoria de los diccionarios ya cargados (no se persiste).
const loadedLocales = {};

const LOCALE_LOADERS = {
  es: () => import('./i18n/es').then((m) => m.default),
  en: () => import('./i18n/en').then((m) => m.default),
  de: () => import('./i18n/de').then((m) => m.default),
  fr: () => import('./i18n/fr').then((m) => m.default),
  ru: () => import('./i18n/ru').then((m) => m.default),
  zh: () => import('./i18n/zh').then((m) => m.default),
  ja: () => import('./i18n/ja').then((m) => m.default),
  ar: () => import('./i18n/ar').then((m) => m.default),
  pt: () => import('./i18n/pt').then((m) => m.default),
  it: () => import('./i18n/it').then((m) => m.default),
};

const SUPPORTED = ['es', 'en', 'de', 'fr', 'ru', 'zh', 'ja', 'ar', 'pt', 'it'];

// Academy-content strings (68 modules) live in a separate chunk so they don't
// ride along in main.js for visitors who never open the learning centre.
// See scripts/split-i18n-edu.js for how the split is derived and why it's safe.
const EDU_LOADERS = {
  es: () => import('./i18n/es.edu').then((m) => m.default),
  en: () => import('./i18n/en.edu').then((m) => m.default),
  de: () => import('./i18n/de.edu').then((m) => m.default),
  fr: () => import('./i18n/fr.edu').then((m) => m.default),
  ru: () => import('./i18n/ru.edu').then((m) => m.default),
  zh: () => import('./i18n/zh.edu').then((m) => m.default),
  ja: () => import('./i18n/ja.edu').then((m) => m.default),
  ar: () => import('./i18n/ar.edu').then((m) => m.default),
  pt: () => import('./i18n/pt.edu').then((m) => m.default),
  it: () => import('./i18n/it.edu').then((m) => m.default),
};

// Locales whose academy chunk is already merged in.
const eduLoaded = new Set();
// Sticky: once any page has needed the academy strings, every later locale
// switch must load them too, or changing language on /education would blank
// the module texts.
let eduEverNeeded = false;

/**
 * Merge the academy dictionary for `locale` into the in-memory cache.
 * Awaited by the lazy EducationPage import before it renders, so t() can
 * never miss and show a raw key.
 */
export async function loadEduDict(locale) {
  eduEverNeeded = true;
  const loc = SUPPORTED.includes(locale) ? locale : 'es';
  if (eduLoaded.has(loc)) return;
  try {
    const dict = await EDU_LOADERS[loc]();
    loadedLocales[loc] = { ...(loadedLocales[loc] || {}), ...dict };
    eduLoaded.add(loc);
    // Acaban de aparecer claves que antes no existían. Si es el idioma activo,
    // hay que reponer `t`: los memos que la llevan como dependencia seguirían
    // sirviendo el resultado anterior, con las claves de la Academia crudas.
    if (useI18nStore.getState().locale === loc) {
      useI18nStore.setState({ t: creaT(loc) });
    }
  } catch (err) {
    console.error(`[i18n] Failed to load academy chunk for "${loc}":`, err);
  }
}

export const languages = [
  { code: 'es', name: 'Español',   flag: '🇪🇸' },
  { code: 'en', name: 'English',   flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch',   flag: '🇩🇪' },
  { code: 'fr', name: 'Français',  flag: '🇫🇷' },
  { code: 'ru', name: 'Русский',   flag: '🇷🇺' },
  { code: 'zh', name: '中文',       flag: '🇨🇳' },
  { code: 'ja', name: '日本語',     flag: '🇯🇵' },
  { code: 'ar', name: 'العربية',   flag: '🇸🇦' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'it', name: 'Italiano',  flag: '🇮🇹' },
];

function applyDomLocale(locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.dir  = locale === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = locale;
}

/**
 * Deja el diccionario de `locale` en memoria. Idempotente.
 *
 * Si la descarga falla y el idioma no es el español, cae al español: sin
 * ningún diccionario cargado `t()` devuelve la clave cruda y la pantalla se
 * llena de `heroTitle`. Es el único respaldo que queda, y es para fallos de
 * RED — los huecos de traducción los cierra CI antes de fusionar.
 */
export async function ensureLocale(locale) {
  const loc = SUPPORTED.includes(locale) ? locale : 'es';
  if (loadedLocales[loc]) return loc;
  try {
    loadedLocales[loc] = await LOCALE_LOADERS[loc]();
    return loc;
  } catch (err) {
    console.error(`[i18n] no se pudo cargar el idioma "${loc}":`, err);
    if (loc === 'es') return null;
    try {
      loadedLocales.es = loadedLocales.es || (await LOCALE_LOADERS.es());
      return 'es';
    } catch (_) {
      return null;
    }
  }
}

/**
 * Fabrica la `t` de un idioma. **Devuelve una función NUEVA cada vez, y eso es
 * el punto, no un descuido.**
 *
 * `t` vivía como una única función estable que leía `get().locale` en cada
 * llamada. Traducía bien, pero su IDENTIDAD no cambiaba nunca, y diecisiete
 * `useMemo`/`useCallback` de once ficheros la llevaban como única dependencia
 * relacionada con el idioma:
 *
 *     return useMemo(() => [ … descripcion: t(p.descKey) … ], [brokers, t]);
 *
 * Como `t` nunca cambiaba, esos memos **no se recalculaban jamás** al cambiar
 * de idioma: se quedaban congelados en el idioma del primer render. Medido en
 * el navegador el 2026-08-24 sobre la portada — al pasar de español a inglés,
 * el menú decía «Pricing» y la descripción de Margex seguía en español, en la
 * misma pantalla. Afectaba a las tarjetas de socios y brókers, los nombres de
 * las estrategias de opciones, el constructor de setups, el plan de trading y
 * el detector de patrones.
 *
 * Se arregla aquí y no en los diecisiete sitios a propósito: añadir `locale` a
 * cada array de dependencias deja el mismo agujero abierto para el memo número
 * dieciocho, y quien lo escriba no tendrá forma de saberlo. Con la identidad
 * ligada al idioma, `[t]` pasa a ser una dependencia CORRECTA y el patrón
 * natural es el que funciona.
 *
 * Quien cambie el contenido de `loadedLocales` tiene que reponer `t` (ver
 * `loadEduDict`), o los memos volverán a servir lo viejo.
 */
function creaT(locale) {
  return (key, vars) => {
    let str = loadedLocales[locale]?.[key] ?? loadedLocales.es?.[key] ?? key;
    if (vars && typeof str === 'string' && str.includes('{')) {
      str = str.replace(/\{(\w+)\}/g, (_, k) =>
        (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
    }
    return str;
  };
}

/** El idioma que el navegador pide, o null si no es ninguno de los diez. */
function idiomaDelNavegador() {
  if (typeof navigator === 'undefined') return null;
  const raw     = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
  const primary = raw.split('-')[0];
  const mapped  = primary === 'iw' ? 'ar' : primary;   // código hebreo antiguo
  return SUPPORTED.includes(mapped) ? mapped : null;
}

/**
 * Resuelve el idioma y carga SU diccionario antes del primer render.
 *
 * Se espera en `index.js`. Las tres fuentes, por prioridad:
 *   1. `?lang=` — un enlace compartido manda sobre lo guardado.
 *   2. lo persistido en localStorage (zustand ya rehidrató, es síncrono).
 *   3. el idioma del navegador, sólo en la primera visita.
 *
 * Resolverlo AQUÍ y no en un efecto de `LandingPage` es lo que evita bajar dos
 * diccionarios y pintar la portada dos veces. Ojo: marca `autoDetected` pero
 * NO llama a `pickLocale`, porque adivinar no es elegir — si contara como
 * preferencia, el idioma supuesto en un móvil nuevo pisaría en la nube el que
 * el usuario eligió a mano. Ver `cloudPrefs.pickLocale`.
 */
export async function bootI18n() {
  const estado = useI18nStore.getState();
  let loc = estado.locale;

  let delEnlace = null;
  try {
    const p = new URLSearchParams(window.location.search).get('lang');
    if (p && SUPPORTED.includes(p)) delEnlace = p;
  } catch (_) { /* sin window.location utilizable */ }

  if (delEnlace) {
    loc = delEnlace;
    useI18nStore.setState({ autoDetected: true });   // que la detección no lo pise
  } else if (!estado.autoDetected) {
    loc = idiomaDelNavegador() || loc;
    useI18nStore.setState({ autoDetected: true });
  }

  const cargado = await ensureLocale(loc);
  const final = cargado || loc;
  applyDomLocale(final);
  useI18nStore.setState({ locale: final, t: creaT(final) });
  return final;
}

export const useI18nStore = create(
  persist(
    (set, get) => ({
      locale: 'es',
      autoDetected: false,

      setLocale: async (locale) => {
        if (!SUPPORTED.includes(locale)) return;

        // Sin diccionario no se cambia: dejar el idioma puesto y el texto en el
        // anterior es preferible a repintar la interfaz con claves crudas.
        if (!loadedLocales[locale] && (await ensureLocale(locale)) !== locale) return;

        // If the academy strings were already needed once, the new locale needs
        // them too — otherwise switching language on /education would leave the
        // module texts showing raw keys.
        if (eduEverNeeded && !eduLoaded.has(locale)) {
          await loadEduDict(locale);
        }

        applyDomLocale(locale);
        // `t` nueva: es lo que hace que los memos con `[t]` se recalculen.
        set({ locale, t: creaT(locale) });
      },

      // `bootI18n` ya detecta antes del primer render, así que en el arranque
      // normal esto sale por la primera línea. Se mantiene porque es la vía por
      // la que una pantalla puede pedir la detección si el arranque no la hizo
      // (y porque `LandingPage` la llama desde siempre).
      detectBrowserLanguage: () => {
        if (get().autoDetected) return null;
        const target = idiomaDelNavegador();
        set({ autoDetected: true });
        if (target && target !== get().locale) {
          get().setLocale(target);
          return target;
        }
        return null;
      },

      t: creaT('es'),
    }),
    {
      name: 'trading-i18n-storage',
      partialize: (state) => ({ locale: state.locale, autoDetected: state.autoDetected }),
      // Sólo el atributo del DOM. La carga del diccionario la hace `bootI18n`,
      // que además espera a que termine antes del primer render; hacerla
      // también aquí duplicaba el trabajo y dejaba el orden al azar.
      onRehydrateStorage: () => (state) => {
        if (state) applyDomLocale(state.locale);
      },
    }
  )
);

export const useTranslation = () => {
  const { locale, setLocale, t, detectBrowserLanguage } = useI18nStore();
  return { locale, setLocale, t, detectBrowserLanguage };
};
