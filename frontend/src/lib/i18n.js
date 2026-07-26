// i18n — lazy locale loading. Only Spanish is bundled eagerly.
// All other locales are separate webpack chunks loaded on demand.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import esTranslations from './i18n/es';

// In-memory cache of loaded locale dictionaries (not persisted to localStorage).
// Spanish is pre-loaded; all others are fetched lazily when first needed.
const loadedLocales = { es: esTranslations };

const LOCALE_LOADERS = {
  en: () => import('./i18n/en').then((m) => m.default),
  de: () => import('./i18n/de').then((m) => m.default),
  fr: () => import('./i18n/fr').then((m) => m.default),
  ru: () => import('./i18n/ru').then((m) => m.default),
  zh: () => import('./i18n/zh').then((m) => m.default),
  ja: () => import('./i18n/ja').then((m) => m.default),
  ar: () => import('./i18n/ar').then((m) => m.default),
};

const SUPPORTED = ['es', 'en', 'de', 'fr', 'ru', 'zh', 'ja', 'ar'];

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
];

function applyDomLocale(locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.dir  = locale === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = locale;
}

export const useI18nStore = create(
  persist(
    (set, get) => ({
      locale: 'es',
      autoDetected: false,

      setLocale: async (locale) => {
        if (!SUPPORTED.includes(locale)) return;

        // Load chunk if not yet cached
        if (!loadedLocales[locale] && LOCALE_LOADERS[locale]) {
          try {
            loadedLocales[locale] = await LOCALE_LOADERS[locale]();
          } catch (err) {
            console.error(`[i18n] Failed to load locale "${locale}":`, err);
            return;
          }
        }

        // If the academy strings were already needed once, the new locale needs
        // them too — otherwise switching language on /education would leave the
        // module texts showing raw keys.
        if (eduEverNeeded && !eduLoaded.has(locale)) {
          await loadEduDict(locale);
        }

        applyDomLocale(locale);
        set({ locale });
      },

      detectBrowserLanguage: () => {
        if (get().autoDetected) return null;
        if (typeof navigator === 'undefined') return null;
        const raw     = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
        const primary = raw.split('-')[0];
        const mapped  = primary === 'iw' ? 'ar' : primary;
        const target  = SUPPORTED.includes(mapped) ? mapped : null;
        set({ autoDetected: true });
        if (target && target !== get().locale) {
          get().setLocale(target);
          return target;
        }
        return null;
      },

      t: (key, vars) => {
        const locale = get().locale;
        let str = loadedLocales[locale]?.[key] ?? loadedLocales.es?.[key] ?? key;
        if (vars && typeof str === 'string' && str.includes('{')) {
          str = str.replace(/\{(\w+)\}/g, (_, k) =>
            vars[k] !== undefined ? String(vars[k]) : `{${k}}`
          );
        }
        return str;
      },
    }),
    {
      name: 'trading-i18n-storage',
      partialize: (state) => ({ locale: state.locale, autoDetected: state.autoDetected }),
      onRehydrateStorage: () => async (state) => {
        if (!state) return;
        const loc = state.locale;
        applyDomLocale(loc);
        // Pre-load the persisted locale so t() works immediately on hydration
        if (loc !== 'es' && LOCALE_LOADERS[loc] && !loadedLocales[loc]) {
          try {
            loadedLocales[loc] = await LOCALE_LOADERS[loc]();
            // Trigger re-render by nudging the store
            useI18nStore.setState({ locale: loc });
          } catch (_) {}
        }
      },
    }
  )
);

export const useTranslation = () => {
  const { locale, setLocale, t, detectBrowserLanguage } = useI18nStore();
  return { locale, setLocale, t, detectBrowserLanguage };
};
