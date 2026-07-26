import React, { useEffect, useRef, useState, memo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useThemeStore, resolveMode } from '@/lib/theme';

/**
 * TVWidget — one loader for every TradingView embeddable widget.
 *
 * Before this, the app had two hand-rolled iframe embeds (advanced chart +
 * economic calendar) that each duplicated the locale/theme mapping. Everything
 * new goes through here so those two mappings can never drift again.
 *
 * Behaviour worth knowing:
 *  - Mounts lazily via IntersectionObserver: a widget below the fold costs
 *    nothing until it is scrolled into view (these scripts are heavy).
 *  - Remounts on theme/locale change — TradingView widgets cannot be
 *    re-themed after creation.
 *  - Cleans the container on unmount so React never fights the injected DOM.
 *
 * Docs: https://www.tradingview.com/widget-docs/
 */

// TradingView's locale codes are not plain ISO — keep this the single source.
export const TV_LOCALE_MAP = {
  es: 'es', en: 'en', de: 'de_DE', fr: 'fr', ru: 'ru', zh: 'zh_CN', ja: 'ja', ar: 'ar_AE',
};

export const tvLocale = (locale) => TV_LOCALE_MAP[locale] || 'en';

const SCRIPT_BASE = 'https://s3.tradingview.com/external-embedding/embed-widget-';

function TVWidgetComponent({
  type,
  config = {},
  height = 400,
  className = '',
  /** Skip the lazy mount (use for above-the-fold widgets). */
  eager = false,
  title,
}) {
  const hostRef = useRef(null);
  const { locale } = useTranslation();
  const { theme } = useThemeStore();
  const [visible, setVisible] = useState(eager);

  // Lazy mount: don't pay for a widget nobody scrolls to.
  useEffect(() => {
    if (visible || !hostRef.current || typeof IntersectionObserver === 'undefined') {
      if (!visible && typeof IntersectionObserver === 'undefined') setVisible(true);
      return undefined;
    }
    const el = hostRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  const colorTheme = resolveMode(theme) === 'dark' ? 'dark' : 'light';
  // Serialised so the effect re-runs when a caller passes a new object literal.
  const configKey = JSON.stringify(config);

  useEffect(() => {
    if (!visible) return undefined;
    const host = hostRef.current;
    if (!host) return undefined;

    host.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.height = '100%';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.height = '100%';
    container.appendChild(inner);

    const script = document.createElement('script');
    script.src = `${SCRIPT_BASE}${type}.js`;
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      colorTheme,
      locale: tvLocale(locale),
      isTransparent: true,
      width: '100%',
      height: '100%',
      ...JSON.parse(configKey),
    });
    container.appendChild(script);
    host.appendChild(container);

    return () => {
      // Detach before React reclaims the node, or the widget keeps timers alive.
      host.innerHTML = '';
    };
  }, [visible, type, configKey, colorTheme, locale]);

  return (
    <div
      ref={hostRef}
      className={`rounded-lg overflow-hidden border border-border/60 bg-muted/20 ${className}`}
      style={{ height }}
      data-testid={`tv-widget-${type}`}
      aria-label={title}
    />
  );
}

export const TVWidget = memo(TVWidgetComponent);

/* ────────────────────────────────────────────────────────────────
 * Named widgets — only the ones that earn their pixels.
 * Deliberately NOT wrapped: mini-chart (redundant with symbol
 * overview), single-quote (low value per pixel) and top-stories
 * (news must be citable and ours — see docs/EXAMEN_FINAL §4.6).
 * ──────────────────────────────────────────────────────────────── */

/** Live crypto table: price, market cap and volume — the "biggest coins" view. */
export const TVCryptoScreener = (p) => (
  <TVWidget type="screener" height={490} config={{ defaultColumn: 'overview', market: 'crypto', showToolbar: true }} {...p} />
);

/** Stock screener with fundamentals (not just price). */
export const TVStockScreener = ({ market = 'america', ...p }) => (
  <TVWidget type="screener" height={490} config={{ defaultColumn: 'overview', defaultScreen: 'most_capitalized', market, showToolbar: true }} {...p} />
);

/** The currency cross matrix — the fastest way to explain what a "pair" is. */
export const TVForexCrossRates = ({ currencies, ...p }) => (
  <TVWidget
    type="forex-cross-rates"
    height={400}
    config={{ currencies: currencies || ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'] }}
    {...p}
  />
);

/** Multi-tab overview with sparklines — good for indices/commodities/bonds. */
export const TVMarketOverview = ({ tabs, ...p }) => (
  <TVWidget type="market-overview" height={450} config={{ showFloatingTooltip: true, showSymbolLogo: true, tabs }} {...p} />
);

/** Crypto map sized by market cap. */
export const TVCryptoHeatmap = (p) => (
  <TVWidget type="crypto-coins-heatmap" height={440} config={{ dataSource: 'Crypto', blockSize: 'market_cap_calc', blockColor: 'change', hasTopBar: true }} {...p} />
);

/** S&P 500 map by sector. */
export const TVStockHeatmap = ({ dataSource = 'SPX500', ...p }) => (
  <TVWidget type="stock-heatmap" height={440} config={{ dataSource, blockSize: 'market_cap_basic', blockColor: 'change', grouping: 'sector', hasTopBar: true }} {...p} />
);

/** Single-symbol chart + key stats. */
export const TVSymbolOverview = ({ symbols, ...p }) => (
  <TVWidget
    type="symbol-overview"
    height={380}
    config={{ symbols: symbols || [['NASDAQ:AAPL|3M']], chartOnly: false, fontSize: '11' }}
    {...p}
  />
);

/** Technical consensus gauge for one symbol. */
export const TVTechnicalAnalysis = ({ symbol = 'NASDAQ:AAPL', interval = '1D', ...p }) => (
  <TVWidget type="technical-analysis" height={400} config={{ symbol, interval, showIntervalTabs: true }} {...p} />
);

/** Scrolling price strip. */
export const TVTickerTape = ({ symbols, ...p }) => (
  <TVWidget
    type="ticker-tape"
    height={46}
    eager
    config={{ symbols: symbols || [], displayMode: 'adaptive', showSymbolLogo: true }}
    {...p}
  />
);

/** Economic calendar (importanceFilter: -1 low, 0 medium, 1 high). */
export const TVEvents = ({ importanceFilter = '0,1', countryFilter, ...p }) => (
  <TVWidget type="events" height={420} config={{ importanceFilter, countryFilter }} {...p} />
);

export default TVWidget;
