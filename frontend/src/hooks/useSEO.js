import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

// Dominio propio. Tiene que ser LA MISMA cadena que `frontend/public/CNAME`,
// que `SITE_ORIGIN` del workflow de despliegue y que el `DEFAULT_ORIGIN` de
// `scripts/gen-sitemap.js` y `scripts/gen-seo-pages.js`: si el canonical de una
// página y su `<loc>` en el sitemap no coinciden, Google descarta el sitemap.
const ORIGIN = 'https://tradingcalculator.pro';
const BRAND  = 'Trading Calculator PRO';

/**
 * Maps the app's short locale code to:
 *  - the matching `og:locale` value
 *  - the html `lang` attribute (BCP-47)
 *  - text direction (rtl / ltr)
 */
const LOCALE_META = {
  es: { og: 'es_ES', html: 'es', dir: 'ltr' },
  en: { og: 'en_US', html: 'en', dir: 'ltr' },
  de: { og: 'de_DE', html: 'de', dir: 'ltr' },
  fr: { og: 'fr_FR', html: 'fr', dir: 'ltr' },
  ru: { og: 'ru_RU', html: 'ru', dir: 'ltr' },
  zh: { og: 'zh_CN', html: 'zh-CN', dir: 'ltr' },
  ja: { og: 'ja_JP', html: 'ja', dir: 'ltr' },
  ar: { og: 'ar_SA', html: 'ar', dir: 'rtl' },
  pt: { og: 'pt_PT', html: 'pt', dir: 'ltr' },
  it: { og: 'it_IT', html: 'it', dir: 'ltr' },
};

/**
 * useSEO — per-page, fully i18n-aware SEO updater.
 *
 * Updates:
 *  - <title>
 *  - meta description / og:* / twitter:*
 *  - canonical link
 *  - <html lang="…" dir="…">
 *  - the x-default hreflang for the current path
 *
 * Both literal strings and translation keys are accepted via `titleKey` /
 * `descriptionKey`. Plain `title` / `description` props still work.
 */
export function useSEO({
  title,
  titleKey,
  description,
  descriptionKey,
  canonicalPath,
  image = `${ORIGIN}/og-image.png`,   // PNG 1200×630 — SVG no renderiza en redes sociales
  type = 'website',
  noindex = false,                    // true en páginas privadas/utilidad (no indexar)
}) {
  const { t, locale } = useTranslation();

  useEffect(() => {
    const meta = LOCALE_META[locale] || LOCALE_META.es;
    const localizedTitle = titleKey ? t(titleKey) : title;
    const localizedDesc  = descriptionKey ? t(descriptionKey) : description;

    const fullTitle = localizedTitle ? `${localizedTitle} | ${BRAND}` : BRAND;
    const path = canonicalPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
    // El canonical es siempre la ruta desnuda (sin `?lang`): la SPA sirve UNA
    // URL por ruta y traduce en cliente, así que `?lang=de` no es otra página.
    const canonical = `${ORIGIN}${path}`;

    document.title = fullTitle;
    document.documentElement.setAttribute('lang', meta.html);
    document.documentElement.setAttribute('dir', meta.dir);

    setMeta('meta[name="description"]', 'content', localizedDesc);
    setMeta('meta[property="og:description"]', 'content', localizedDesc);
    setMeta('meta[name="twitter:description"]', 'content', localizedDesc);
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[property="og:type"]', 'content', type);
    setMeta('meta[property="og:locale"]', 'content', meta.og);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[name="twitter:url"]', 'content', canonical);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[name="twitter:image"]', 'content', image);

    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex, follow' : 'index, follow');

    setLink('canonical', canonical);
    syncHreflangAlternates(path);
  }, [title, titleKey, description, descriptionKey, canonicalPath, image, type, noindex, locale, t]);
}

/**
 * Mantiene el `x-default` apuntando a la RUTA ACTUAL, y no declara más
 * alternativas.
 *
 * Aquí se emitían diez `hreflang` a `?lang=xx` sobre esta misma URL. Es
 * exactamente el patrón que `public/index.html` documenta y quitó de la
 * portada, reintroducido en cada una de las rutas de la SPA: el idioma se
 * traduce en CLIENTE, así que `/pricing?lang=de` devuelve byte por byte el
 * mismo HTML que `/pricing`. Peor todavía, este mismo hook pone el canonical de
 * esas URLs en la ruta desnuda (sin `?lang`), de modo que las dos señales se
 * contradecían: el hreflang decía «ésta es la versión alemana», el canonical
 * decía «ésta no es una página, la buena es la otra», y gana el canonical.
 * Resultado: cero idiomas indexados de más y rastreo gastado en diez URLs que
 * Google ya sabía que eran una.
 *
 * `hreflang` sólo significa algo cuando hay una URL POR IDIOMA. Las que sí las
 * tienen —las 1.640 páginas estáticas de `gen-seo-pages.js`, con
 * `/de/learn/…`— emiten su propio juego completo y correcto. Mientras la SPA
 * sirva una sola URL por ruta, lo honesto es no declarar alternativas.
 */
function syncHreflangAlternates(path) {
  const head = document.head;
  head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());

  const xDefault = document.createElement('link');
  xDefault.setAttribute('rel', 'alternate');
  xDefault.setAttribute('hreflang', 'x-default');
  xDefault.setAttribute('data-i18n-managed', 'true');
  xDefault.setAttribute('href', `${ORIGIN}${path}`);
  head.appendChild(xDefault);
}

function setMeta(selector, attr, value) {
  if (!value) return;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const matchAttr = selector.match(/\[([^=]+)="([^"]+)"\]/);
    if (matchAttr) el.setAttribute(matchAttr[1], matchAttr[2]);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}
