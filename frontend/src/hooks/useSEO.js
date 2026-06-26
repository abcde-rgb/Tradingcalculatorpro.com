import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

const ORIGIN = 'https://tradingcalculatorpro.com';
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
};

const SUPPORTED_LOCALES = Object.keys(LOCALE_META);

/**
 * useSEO — per-page, fully i18n-aware SEO updater.
 *
 * Updates:
 *  - <title>
 *  - meta description / og:* / twitter:*
 *  - canonical link
 *  - <html lang="…" dir="…">
 *  - hreflang alternates for the current path across all 8 locales
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
    // Canonical always points to the bare path (no ?lang param) — search engines
    // pick the correct locale via hreflang alternates below.
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
 * Replace the existing rel="alternate" hreflang link list to point all 8 locales
 * to the **current path** (instead of the static `/` from index.html). This is
 * what makes Google, Bing and Yandex serve the right localised version for
 * each user's region on every route — not just the homepage.
 */
function syncHreflangAlternates(path) {
  const head = document.head;
  // Remove any previously-added hreflang link nodes managed by this hook.
  head.querySelectorAll('link[rel="alternate"][data-i18n-managed="true"]').forEach((n) => n.remove());

  // Also drop the static index.html alternates so we don't have stale hreflang
  // values pointing to `/` from the homepage when the user is on /options etc.
  head.querySelectorAll('link[rel="alternate"][hreflang]:not([data-i18n-managed])').forEach((n) => n.remove());

  for (const code of SUPPORTED_LOCALES) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', LOCALE_META[code].html);
    link.setAttribute('data-i18n-managed', 'true');
    link.setAttribute(
      'href',
      code === 'es' ? `${ORIGIN}${path}` : `${ORIGIN}${path}?lang=${code}`,
    );
    head.appendChild(link);
  }

  // x-default → Spanish (the project's default locale).
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
