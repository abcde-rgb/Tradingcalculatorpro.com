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

// `LOCALE_META` sigue usándose para `og:locale`, `<html lang>` y la dirección
// del texto. La lista de códigos suelta ya no: las alternativas `hreflang` por
// idioma las emite `gen-seo-pages.js` en las páginas que de verdad tienen una
// URL por idioma. Ver `syncHreflangAlternates`.

/**
 * useSEO — per-page, fully i18n-aware SEO updater.
 *
 * Updates:
 *  - <title>
 *  - meta description / og:* / twitter:*
 *  - canonical link
 *  - <html lang="…" dir="…">
 *  - hreflang alternates for the current path across every locale
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
    // Canonical always points to the bare path (no ?lang param).
    //
    // Con barra final, y no es un detalle de estilo. Desde que cada ruta
    // pública tiene su propio `build/<ruta>/index.html` —sin eso GitHub Pages
    // devolvía 404 a los rastreadores—, quien sirve `/pricing` es un
    // directorio: Pages redirige `/pricing` a `/pricing/` con un 301. Si el
    // canonical dijera `/pricing`, estaría apuntando a una URL que redirige a
    // la que lo declara, y el sitemap (que anuncia `/pricing/`) diría una
    // tercera cosa. Las tres señales tienen que decir lo mismo.
    const canonical = `${ORIGIN}${conBarra(path)}`;

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
 * Mantiene el juego de `hreflang` de la ruta actual.
 *
 * ⚠️ Aquí se emitían diez alternativas `?lang=xx` sobre la misma URL, y eso es
 * EXACTAMENTE lo que `public/index.html` había quitado —con un comentario de
 * quince líneas explicando por qué— el día que se arregló la portada. El
 * arreglo duraba lo que tardaba React en montar: este hook borraba las
 * alternativas estáticas del HTML y las repoblaba con las `?lang=`.
 *
 * El motivo por el que no valen sigue siendo el mismo: la SPA traduce en
 * CLIENTE, así que `/pricing?lang=de` devuelve byte por byte el mismo HTML que
 * `/pricing`. Google canonicaliza las diez a una sola, descarta las
 * alternativas y encima se contradicen con el `canonical`, que apunta a la URL
 * desnuda. El resultado neto no eran diez idiomas indexados: era presupuesto de
 * rastreo gastado y dos señales peleándose.
 *
 * Las páginas que SÍ tienen una URL por idioma —las 1.680 que genera
 * `gen-seo-pages.js`, bajo `/en/…`, `/ru/…`— emiten su propio juego correcto en
 * el HTML, y este hook no llega a ellas: son HTML plano, sin React.
 *
 * Aquí, por tanto, sólo se declara `x-default` hacia la propia URL.
 */
function syncHreflangAlternates(path) {
  const head = document.head;
  head.querySelectorAll('link[rel="alternate"][data-i18n-managed="true"]').forEach((n) => n.remove());
  head.querySelectorAll('link[rel="alternate"][hreflang]:not([data-i18n-managed])').forEach((n) => n.remove());

  const xDefault = document.createElement('link');
  xDefault.setAttribute('rel', 'alternate');
  xDefault.setAttribute('hreflang', 'x-default');
  xDefault.setAttribute('data-i18n-managed', 'true');
  xDefault.setAttribute('href', `${ORIGIN}${conBarra(path)}`);
  head.appendChild(xDefault);
}

// Barra final en toda ruta que no sea un fichero. Ver el comentario del
// `canonical`: es lo que mantiene de acuerdo al canonical, al sitemap y a la
// URL que GitHub Pages sirve de verdad.
function conBarra(path) {
  if (!path || path === '/') return '/';
  if (path.endsWith('/')) return path;
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return path;   // /og-image.png y similares
  return `${path}/`;
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
