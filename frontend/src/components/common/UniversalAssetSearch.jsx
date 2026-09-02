import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Search, X, Clock, Flame, ArrowUpRight, ArrowDownRight,
  Bitcoin, Coins, DollarSign, LineChart, Layers, Building2, BarChart3 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { usePriceStore } from '@/lib/store';
import { CRYPTO_LIST, COMMODITIES } from '@/lib/constants';
import { universalSearchAPI } from '@/services/optionsApi';
import { CargaVelas } from '@/components/common/BrandLoading';

// ─────────────────────────────────────────────────────────────────────
// Local curated catalogs (instant offline matches, no network call)
// ─────────────────────────────────────────────────────────────────────

const FOREX_LIST = [
  { id: 'EURUSD', symbol: 'EURUSD', name: 'EUR/USD' },
  { id: 'GBPUSD', symbol: 'GBPUSD', name: 'GBP/USD' },
  { id: 'USDJPY', symbol: 'USDJPY', name: 'USD/JPY' },
  { id: 'USDCHF', symbol: 'USDCHF', name: 'USD/CHF' },
  { id: 'AUDUSD', symbol: 'AUDUSD', name: 'AUD/USD' },
  { id: 'USDCAD', symbol: 'USDCAD', name: 'USD/CAD' },
  { id: 'NZDUSD', symbol: 'NZDUSD', name: 'NZD/USD' },
  { id: 'EURGBP', symbol: 'EURGBP', name: 'EUR/GBP' },
  { id: 'EURJPY', symbol: 'EURJPY', name: 'EUR/JPY' },
  { id: 'GBPJPY', symbol: 'GBPJPY', name: 'GBP/JPY' },
  { id: 'AUDJPY', symbol: 'AUDJPY', name: 'AUD/JPY' },
  { id: 'USDMXN', symbol: 'USDMXN', name: 'USD/MXN' },
  { id: 'USDZAR', symbol: 'USDZAR', name: 'USD/ZAR' },
  { id: 'USDTRY', symbol: 'USDTRY', name: 'USD/TRY' },
  { id: 'USDCNH', symbol: 'USDCNH', name: 'USD/CNH' },
  { id: 'EURAUD', symbol: 'EURAUD', name: 'EUR/AUD' },
  { id: 'EURCHF', symbol: 'EURCHF', name: 'EUR/CHF' },
  { id: 'EURCAD', symbol: 'EURCAD', name: 'EUR/CAD' },
  { id: 'GBPCHF', symbol: 'GBPCHF', name: 'GBP/CHF' },
  { id: 'GBPAUD', symbol: 'GBPAUD', name: 'GBP/AUD' },
  { id: 'GBPCAD', symbol: 'GBPCAD', name: 'GBP/CAD' },
  { id: 'AUDNZD', symbol: 'AUDNZD', name: 'AUD/NZD' },
  { id: 'AUDCAD', symbol: 'AUDCAD', name: 'AUD/CAD' },
  { id: 'CADJPY', symbol: 'CADJPY', name: 'CAD/JPY' },
  { id: 'CHFJPY', symbol: 'CHFJPY', name: 'CHF/JPY' },
  { id: 'NZDJPY', symbol: 'NZDJPY', name: 'NZD/JPY' },
  { id: 'USDSEK', symbol: 'USDSEK', name: 'USD/SEK' },
  { id: 'USDNOK', symbol: 'USDNOK', name: 'USD/NOK' },
  { id: 'USDSGD', symbol: 'USDSGD', name: 'USD/SGD' },
  { id: 'USDPLN', symbol: 'USDPLN', name: 'USD/PLN' },
];

const STOCKS_LIST = [
  { id: 'AAPL',  symbol: 'AAPL',  name: 'Apple Inc.' },
  { id: 'MSFT',  symbol: 'MSFT',  name: 'Microsoft' },
  { id: 'NVDA',  symbol: 'NVDA',  name: 'NVIDIA' },
  { id: 'TSLA',  symbol: 'TSLA',  name: 'Tesla' },
  { id: 'AMZN',  symbol: 'AMZN',  name: 'Amazon' },
  { id: 'META',  symbol: 'META',  name: 'Meta' },
  { id: 'GOOG',  symbol: 'GOOG',  name: 'Alphabet C' },
  { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet A' },
  { id: 'AVGO',  symbol: 'AVGO',  name: 'Broadcom' },
  { id: 'BRK.B', symbol: 'BRK.B', name: 'Berkshire Hathaway' },
  { id: 'LLY',   symbol: 'LLY',   name: 'Eli Lilly' },
  { id: 'JPM',   symbol: 'JPM',   name: 'JPMorgan Chase' },
  { id: 'V',     symbol: 'V',     name: 'Visa' },
  { id: 'MA',    symbol: 'MA',    name: 'Mastercard' },
  { id: 'WMT',   symbol: 'WMT',   name: 'Walmart' },
  { id: 'XOM',   symbol: 'XOM',   name: 'ExxonMobil' },
  { id: 'JNJ',   symbol: 'JNJ',   name: 'Johnson & Johnson' },
  { id: 'UNH',   symbol: 'UNH',   name: 'UnitedHealth' },
  { id: 'COST',  symbol: 'COST',  name: 'Costco' },
  { id: 'NFLX',  symbol: 'NFLX',  name: 'Netflix' },
  { id: 'CRM',   symbol: 'CRM',   name: 'Salesforce' },
  { id: 'AMD',   symbol: 'AMD',   name: 'AMD' },
  { id: 'COIN',  symbol: 'COIN',  name: 'Coinbase' },
  { id: 'MSTR',  symbol: 'MSTR',  name: 'MicroStrategy' },
  { id: 'PLTR',  symbol: 'PLTR',  name: 'Palantir' },
  { id: 'UBER',  symbol: 'UBER',  name: 'Uber' },
  { id: 'SHOP',  symbol: 'SHOP',  name: 'Shopify' },
  { id: 'BABA',  symbol: 'BABA',  name: 'Alibaba' },
  { id: 'TSM',   symbol: 'TSM',   name: 'TSMC' },
  { id: 'ASML',  symbol: 'ASML',  name: 'ASML Holding' },
  { id: 'ARM',   symbol: 'ARM',   name: 'Arm Holdings' },
  { id: 'SMCI',  symbol: 'SMCI',  name: 'Super Micro' },
  { id: 'INTC',  symbol: 'INTC',  name: 'Intel' },
  { id: 'MU',    symbol: 'MU',    name: 'Micron' },
  { id: 'QCOM',  symbol: 'QCOM',  name: 'Qualcomm' },
  { id: 'BA',    symbol: 'BA',    name: 'Boeing' },
  { id: 'NKE',   symbol: 'NKE',   name: 'Nike' },
  { id: 'SBUX',  symbol: 'SBUX',  name: 'Starbucks' },
  { id: 'DIS',   symbol: 'DIS',   name: 'Disney' },
  { id: 'F',     symbol: 'F',     name: 'Ford' },
  { id: 'GM',    symbol: 'GM',    name: 'General Motors' },
  { id: 'RIVN',  symbol: 'RIVN',  name: 'Rivian' },
  { id: 'LCID',  symbol: 'LCID',  name: 'Lucid' },
  { id: 'NIO',   symbol: 'NIO',   name: 'NIO' },
  { id: 'SAN.MC',  symbol: 'SAN.MC',  name: 'Banco Santander' },
  { id: 'BBVA.MC', symbol: 'BBVA.MC', name: 'BBVA' },
  { id: 'ITX.MC',  symbol: 'ITX.MC',  name: 'Inditex (Zara)' },
  { id: 'IBE.MC',  symbol: 'IBE.MC',  name: 'Iberdrola' },
  { id: 'TEF.MC',  symbol: 'TEF.MC',  name: 'Telefónica' },
  { id: 'REP.MC',  symbol: 'REP.MC',  name: 'Repsol' },
  { id: 'CABK.MC', symbol: 'CABK.MC', name: 'CaixaBank' },
  { id: 'AENA.MC', symbol: 'AENA.MC', name: 'Aena' },
  { id: 'AIR.PA',  symbol: 'AIR.PA',  name: 'Airbus' },
  { id: 'MC.PA',   symbol: 'MC.PA',   name: 'LVMH' },
  { id: 'OR.PA',   symbol: 'OR.PA',   name: "L'Oréal" },
  { id: 'SIE.DE',  symbol: 'SIE.DE',  name: 'Siemens' },
  { id: 'BMW.DE',  symbol: 'BMW.DE',  name: 'BMW' },
  { id: 'VOW3.DE', symbol: 'VOW3.DE', name: 'Volkswagen' },
  { id: 'ALV.DE',  symbol: 'ALV.DE',  name: 'Allianz' },
  { id: 'NESN.SW', symbol: 'NESN.SW', name: 'Nestlé' },
  { id: 'NOVN.SW', symbol: 'NOVN.SW', name: 'Novartis' },
  { id: 'AZN.L',   symbol: 'AZN.L',   name: 'AstraZeneca' },
  { id: 'HSBA.L',  symbol: 'HSBA.L',  name: 'HSBC' },
  { id: 'ENEL.MI', symbol: 'ENEL.MI', name: 'Enel' },
];

const ETFS_LIST = [
  { id: 'SPY',  symbol: 'SPY',  name: 'S&P 500 ETF' },
  { id: 'QQQ',  symbol: 'QQQ',  name: 'Nasdaq-100 ETF' },
  { id: 'IWM',  symbol: 'IWM',  name: 'Russell 2000 ETF' },
  { id: 'DIA',  symbol: 'DIA',  name: 'Dow Jones ETF' },
  { id: 'VOO',  symbol: 'VOO',  name: 'Vanguard S&P 500' },
  { id: 'VTI',  symbol: 'VTI',  name: 'Vanguard Total Market' },
  { id: 'VT',   symbol: 'VT',   name: 'Vanguard Total World' },
  { id: 'EFA',  symbol: 'EFA',  name: 'iShares MSCI EAFE' },
  { id: 'EEM',  symbol: 'EEM',  name: 'iShares MSCI Emerging' },
  { id: 'AGG',  symbol: 'AGG',  name: 'iShares US Aggregate Bond' },
  { id: 'TLT',  symbol: 'TLT',  name: '20+ Year Treasury' },
  { id: 'GLD',  symbol: 'GLD',  name: 'SPDR Gold Trust' },
  { id: 'SLV',  symbol: 'SLV',  name: 'iShares Silver Trust' },
  { id: 'USO',  symbol: 'USO',  name: 'US Oil Fund' },
  { id: 'UNG',  symbol: 'UNG',  name: 'US Natural Gas' },
  { id: 'ARKK', symbol: 'ARKK', name: 'ARK Innovation' },
  { id: 'ARKG', symbol: 'ARKG', name: 'ARK Genomic' },
  { id: 'ARKF', symbol: 'ARKF', name: 'ARK Fintech' },
  { id: 'ARKW', symbol: 'ARKW', name: 'ARK Next Gen Internet' },
  { id: 'TQQQ', symbol: 'TQQQ', name: 'ProShares 3x QQQ' },
  { id: 'SQQQ', symbol: 'SQQQ', name: 'ProShares -3x QQQ' },
  { id: 'SOXL', symbol: 'SOXL', name: 'Direxion 3x Semis' },
  { id: 'UVXY', symbol: 'UVXY', name: 'ProShares 1.5x VIX' },
  { id: 'VXX',  symbol: 'VXX',  name: 'iPath VIX Short-term' },
  { id: 'XLF',  symbol: 'XLF',  name: 'Financial Select' },
  { id: 'XLK',  symbol: 'XLK',  name: 'Technology Select' },
  { id: 'XLE',  symbol: 'XLE',  name: 'Energy Select' },
  { id: 'XLV',  symbol: 'XLV',  name: 'Health Care Select' },
  { id: 'XLY',  symbol: 'XLY',  name: 'Cons. Discretionary' },
  { id: 'XLI',  symbol: 'XLI',  name: 'Industrial Select' },
  { id: 'XLU',  symbol: 'XLU',  name: 'Utilities Select' },
  { id: 'SMH',  symbol: 'SMH',  name: 'Semiconductors' },
  { id: 'SOXX', symbol: 'SOXX', name: 'iShares Semiconductors' },
  { id: 'KWEB', symbol: 'KWEB', name: 'KraneShares China' },
  { id: 'FXI',  symbol: 'FXI',  name: 'iShares China 50' },
  { id: 'EWZ',  symbol: 'EWZ',  name: 'iShares MSCI Brazil' },
  { id: 'EWJ',  symbol: 'EWJ',  name: 'iShares MSCI Japan' },
  { id: 'TAN',  symbol: 'TAN',  name: 'Solar Energy' },
  { id: 'ICLN', symbol: 'ICLN', name: 'Clean Energy' },
  { id: 'IBB',  symbol: 'IBB',  name: 'iShares Biotech' },
  { id: 'IGV',  symbol: 'IGV',  name: 'iShares Software' },
  { id: 'VNQ',  symbol: 'VNQ',  name: 'Real Estate' },
  { id: 'SCHD', symbol: 'SCHD', name: 'Schwab Dividend' },
];

const INDICES_LIST = [
  { id: '^GSPC',     symbol: 'SPX',    name: 'S&P 500' },
  { id: '^DJI',      symbol: 'DJI',    name: 'Dow Jones' },
  { id: '^IXIC',     symbol: 'NDX',    name: 'Nasdaq Composite' },
  { id: '^RUT',      symbol: 'RUT',    name: 'Russell 2000' },
  { id: '^VIX',      symbol: 'VIX',    name: 'Volatility Index' },
  { id: '^FTSE',     symbol: 'FTSE',   name: 'FTSE 100' },
  { id: '^GDAXI',    symbol: 'DAX',    name: 'DAX 40 (Germany)' },
  { id: '^FCHI',     symbol: 'CAC',    name: 'CAC 40 (France)' },
  { id: '^N225',     symbol: 'N225',   name: 'Nikkei 225 (Japan)' },
  { id: '^HSI',      symbol: 'HSI',    name: 'Hang Seng (HK)' },
  { id: '^STOXX50E', symbol: 'SX5E',   name: 'Euro Stoxx 50' },
  { id: '^IBEX',     symbol: 'IBEX35', name: 'IBEX 35 (España)' },
  { id: '^AXJO',     symbol: 'ASX200', name: 'ASX 200 (Australia)' },
  { id: '^BVSP',     symbol: 'BOVESPA', name: 'Bovespa (Brasil)' },
  { id: '^NSEI',     symbol: 'NIFTY',  name: 'Nifty 50 (India)' },
  { id: '^KS11',     symbol: 'KOSPI',  name: 'KOSPI (Corea)' },
  { id: '^GSPTSE',   symbol: 'TSX',    name: 'TSX (Canadá)' },
];

const COMMODITIES_FUTURES = [
  { id: 'GC=F', symbol: 'XAUUSD', name: 'Gold' },
  { id: 'SI=F', symbol: 'XAGUSD', name: 'Silver' },
  { id: 'CL=F', symbol: 'WTI',    name: 'Crude Oil (WTI)' },
  { id: 'BZ=F', symbol: 'BRENT',  name: 'Brent Crude' },
  { id: 'NG=F', symbol: 'NATGAS', name: 'Natural Gas' },
  { id: 'HG=F', symbol: 'COPPER', name: 'Copper' },
  { id: 'PL=F', symbol: 'XPT',    name: 'Platinum' },
  { id: 'PA=F', symbol: 'XPD',    name: 'Palladium' },
  { id: 'ZC=F', symbol: 'CORN',   name: 'Corn' },
  { id: 'ZW=F', symbol: 'WHEAT',  name: 'Wheat' },
  { id: 'KC=F', symbol: 'COFFEE', name: 'Coffee' },
  { id: 'CC=F', symbol: 'COCOA',  name: 'Cocoa' },
  { id: 'SB=F', symbol: 'SUGAR',  name: 'Sugar' },
  { id: 'CT=F', symbol: 'COTTON', name: 'Cotton' },
];

const CATEGORY_META = {
  crypto:      { icon: Bitcoin,    label: 'Crypto',      color: 'text-[#f7931a]' },
  stocks:      { icon: Building2,  label: 'Acciones',    color: 'text-info' },
  etfs:        { icon: LineChart,  label: 'ETFs',        color: 'text-compare' },
  indices:     { icon: BarChart3,  label: 'Índices',     color: 'text-[#06b6d4]' },
  forex:       { icon: DollarSign, label: 'Forex',       color: 'text-long' },
  commodities: { icon: Coins,      label: 'Commodities', color: 'text-caution' },
};

const RECENTS_KEY = 'universal_asset_recents';
const TRENDING = ['bitcoin', 'ethereum', 'AAPL', 'NVDA', 'TSLA', 'SPY', 'QQQ', '^GSPC', 'EURUSD', 'GC=F'];

const buildAssetIndex = (categories) => {
  const idx = [];
  if (categories.includes('crypto')) {
    CRYPTO_LIST.forEach((c) => idx.push({ ...c, category: 'crypto' }));
  }
  if (categories.includes('commodities')) {
    COMMODITIES.forEach((c) => idx.push({ ...c, category: 'commodities' }));
    COMMODITIES_FUTURES.forEach((c) => idx.push({ ...c, category: 'commodities' }));
  }
  if (categories.includes('forex')) {
    FOREX_LIST.forEach((c) => idx.push({ ...c, category: 'forex' }));
  }
  if (categories.includes('stocks')) {
    STOCKS_LIST.forEach((c) => idx.push({ ...c, category: 'stocks' }));
  }
  if (categories.includes('etfs')) {
    ETFS_LIST.forEach((c) => idx.push({ ...c, category: 'etfs' }));
  }
  if (categories.includes('indices')) {
    INDICES_LIST.forEach((c) => idx.push({ ...c, category: 'indices' }));
  }
  // de-dup by id
  const seen = new Set();
  return idx.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
};

const highlightMatch = (text, query) => {
  if (!query || !text) return text;
  const idx = text.toUpperCase().indexOf(query.toUpperCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-bold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
};

/**
 * UniversalAssetSearch — professional asset selector.
 *
 * Features:
 * - Curated local catalog of crypto/stocks/ETFs/indices/forex/commodities
 * - Live backend search (yfinance universe, ~250+ symbols) when user types
 * - Category filter chips, recents, trending
 * - Keyboard navigation (↑↓ Enter Esc)
 *
 * @param {string}   value          - current asset id (e.g. "bitcoin", "EURUSD", "AAPL", "^GSPC")
 * @param {function} onChange       - called with the full asset object {id, symbol, name, category}
 * @param {string[]} [categories]   - which asset classes to include. Defaults to ALL.
 * @param {string}   [placeholder]  - input placeholder
 * @param {string}   [testId]       - data-testid for the trigger
 */
const UniversalAssetSearch = ({
  value,
  onChange,
  categories = ['crypto', 'stocks', 'etfs', 'indices', 'forex', 'commodities'],
  placeholder,
  testId = 'universal-asset-search',
}) => {
  const { t } = useTranslation();
  const { prices } = usePriceStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [remoteResults, setRemoteResults] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); } catch { return []; }
  });

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Stabilize categories: parents pass an inline array literal each render,
  // creating a new array reference every time → would cause buildAssetIndex
  // to recompute and the debounced fetch effect to re-fire infinitely.
  // Memoize on the JOINED string so referential equality holds across renders.
  const categoriesKey = categories.join(',');
  const stableCategories = useMemo(() => categories, [categoriesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fullIndex = useMemo(() => buildAssetIndex(stableCategories), [stableCategories]);

  // Find the currently selected asset to render in the trigger.
  const selected = useMemo(
    () => fullIndex.find((a) => a.id === value || a.symbol === value),
    [fullIndex, value]
  );

  const getPrice = useCallback((asset) => {
    if (!asset) return null;
    if (asset.category === 'crypto' && prices?.[asset.id]?.usd) {
      return prices[asset.id].usd;
    }
    return null;
  }, [prices]);

  const getChangePct = useCallback((asset) => {
    if (!asset) return null;
    if (asset.category === 'crypto' && prices?.[asset.id]?.usd_24h_change != null) {
      return prices[asset.id].usd_24h_change;
    }
    return null;
  }, [prices]);

  // Debounced backend search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) { setRemoteResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setRemoteLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await universalSearchAPI(q, 50);
        const filtered = (data || []).filter((r) => stableCategories.includes(r.category));
        setRemoteResults(filtered.map((r) => ({
          id: r.symbol,
          symbol: r.symbol,
          name: r.name || r.symbol,
          category: r.category,
          remote: true,
        })));
      } catch {
        setRemoteResults([]);
      }
      setRemoteLoading(false);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, stableCategories]);

  // Filter local + merge remote
  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    let pool = fullIndex;
    if (activeCategory !== 'all') pool = pool.filter((a) => a.category === activeCategory);
    if (q) {
      pool = pool.filter(
        (a) => a.symbol.toUpperCase().includes(q) || (a.name || '').toUpperCase().includes(q)
      );
    }
    // Merge backend results, dedup by id+symbol
    const localKeys = new Set();
    pool.forEach((a) => { localKeys.add(a.id); localKeys.add(a.symbol); });
    const remoteFiltered = activeCategory === 'all'
      ? remoteResults
      : remoteResults.filter((r) => r.category === activeCategory);
    const extras = remoteFiltered.filter((r) => !localKeys.has(r.id) && !localKeys.has(r.symbol));

    // For exact-symbol queries (<= 8 chars), promote any result whose symbol
    // matches the query EXACTLY to the top — this gives canonical aliases
    // from the backend (BTC, NDX, XAUUSD, GOLD, DAX...) priority over local
    // substring matches.
    const merged = [...pool, ...extras];
    if (q && q.length <= 8) {
      merged.sort((a, b) => {
        const aExact = a.symbol.toUpperCase() === q || a.id.toUpperCase() === q;
        const bExact = b.symbol.toUpperCase() === q || b.id.toUpperCase() === q;
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;
        // Then prefer symbols that START with the query.
        const aStarts = a.symbol.toUpperCase().startsWith(q);
        const bStarts = b.symbol.toUpperCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        return 0;
      });
    }
    return merged;
  }, [fullIndex, query, activeCategory, remoteResults]);

  // Group by category for display.
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((a) => {
      const k = a.category;
      if (!g[k]) g[k] = [];
      g[k].push(a);
    });
    return g;
  }, [filtered]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset highlight when filtered list changes.
  useEffect(() => {
    setActiveIdx(filtered.length > 0 ? 0 : -1);
  }, [filtered.length, query, activeCategory]);

  const addRecent = useCallback((id) => {
    setRecents((prev) => {
      const next = [id, ...prev.filter((s) => s !== id)].slice(0, 8);
      try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* no-op */ }
      return next;
    });
  }, []);

  const handleSelect = useCallback((asset) => {
    if (!asset) return;
    addRecent(asset.id);
    onChange?.(asset);
    setOpen(false);
    setQuery('');
  }, [onChange, addRecent]);

  const handleKeyDown = (e) => {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIdx]) handleSelect(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Trigger button — closed state.
  if (!open) {
    const SelMeta = selected ? CATEGORY_META[selected.category] : null;
    const SelIcon = SelMeta?.icon || Search;
    const selPrice = getPrice(selected);
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 30);
        }}
        className="w-full flex items-center gap-2 bg-muted border border-border rounded-md px-3 py-2 text-sm hover:border-primary/40 transition-colors"
        data-testid={testId}
      >
        <SelIcon className={`w-4 h-4 flex-shrink-0 ${SelMeta?.color || 'text-muted-foreground'}`} />
        <div className="flex-1 text-left min-w-0">
          {selected ? (
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-foreground">{selected.symbol}</span>
              <span className="text-[11px] text-muted-foreground truncate">{selected.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder || t('asset')}</span>
          )}
        </div>
        {selPrice != null && (
          <span className="font-mono text-xs text-muted-foreground hidden sm:inline">
            ${selPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </span>
        )}
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    );
  }

  // Open dropdown
  const showRecents = !query.trim() && recents.length > 0 && activeCategory === 'all';
  const showTrending = !query.trim() && activeCategory === 'all';
  const recentAssets = recents
    .map((id) => fullIndex.find((a) => a.id === id))
    .filter(Boolean);
  const trendingAssets = TRENDING
    .map((id) => fullIndex.find((a) => a.id === id || a.symbol === id))
    .filter(Boolean);

  // Display order for category groups
  const CAT_ORDER = ['crypto', 'stocks', 'etfs', 'indices', 'forex', 'commodities'];

  return (
    <div ref={containerRef} className="relative w-full" data-testid={`${testId}-open`}>
      {/* Search input */}
      <div className="relative flex items-center bg-muted border border-primary/60 ring-2 ring-primary/15 rounded-md px-3 py-2">
        <Search className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Buscar acción, ETF, índice, crypto, forex...'}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        {remoteLoading && <CargaVelas className="w-3.5 h-3.5 text-primary mr-1" />}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="p-0.5 rounded hover:bg-border"
            aria-label="Clear"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown panel */}
      <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-lg shadow-xl shadow-black/50 z-50 max-h-[480px] flex flex-col overflow-hidden">
        {/* Category tabs */}
        {stableCategories.length > 1 && (
          <div className="flex items-center gap-1 px-2 pt-2 pb-1 border-b border-border overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex-shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="uas-tab-all"
            >
              <Layers className="w-3 h-3 inline mr-1" />
              Todos
            </button>
            {stableCategories.map((cat) => {
              const meta = CATEGORY_META[cat];
              if (!meta) return null;
              const Ic = meta.icon;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 flex-shrink-0 ${
                    activeCategory === cat
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`uas-tab-${cat}`}
                >
                  <Ic className={`w-3 h-3 ${activeCategory === cat ? 'text-primary' : meta.color}`} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Recents */}
        {showRecents && (
          <div className="px-3 pt-2 pb-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Recientes
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentAssets.map((a) => (
                <button
                  key={`recent-${a.id}`}
                  type="button"
                  onClick={() => handleSelect(a)}
                  className="px-2 py-0.5 bg-muted border border-border rounded text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {a.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending */}
        {showTrending && trendingAssets.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Flame className="w-3 h-3 text-warn" />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Trending
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trendingAssets.map((a) => (
                <button
                  key={`trend-${a.id}`}
                  type="button"
                  onClick={() => handleSelect(a)}
                  className="px-2 py-0.5 bg-muted border border-border rounded text-[11px] font-bold text-foreground hover:border-warn/40 transition-colors"
                >
                  {a.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {CAT_ORDER.filter((c) => grouped[c]).map((cat) => {
            const items = grouped[cat];
            const meta = CATEGORY_META[cat];
            const Ic = meta?.icon || Search;
            return (
              <div key={`group-${cat}`}>
                <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
                  <Ic className={`w-3 h-3 ${meta?.color}`} />
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                    {meta?.label || cat}
                  </span>
                  <span className="text-[9px] text-muted-foreground">({items.length})</span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
                {items.map((a) => {
                  const globalIdx = filtered.indexOf(a);
                  const isActive = globalIdx === activeIdx;
                  const p = getPrice(a);
                  const ch = getChangePct(a);
                  return (
                    <button
                      key={`opt-${a.id}`}
                      type="button"
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      onClick={() => handleSelect(a)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 transition-colors text-left ${
                        isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                      data-testid={`uas-option-${a.id}`}
                    >
                      <div className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                        isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {a.symbol.replace(/[\^=\-USD]/g, '').slice(0, 2) || a.symbol.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                          {highlightMatch(a.symbol, query)}
                          {a.remote && (
                            <span className="text-[8px] bg-primary/15 text-primary px-1 py-0.5 rounded font-mono">LIVE</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {highlightMatch(a.name || '', query)}
                        </div>
                      </div>
                      {p != null && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-[11px] font-mono font-bold text-foreground">
                            ${p.toLocaleString('en-US', { maximumFractionDigits: p < 1 ? 4 : 2 })}
                          </div>
                          {ch != null && (
                            <div className={`text-[9px] font-semibold flex items-center justify-end gap-0.5 ${
                              ch >= 0 ? 'text-long' : 'text-short'
                            }`}>
                              {ch >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                              {ch >= 0 ? '+' : ''}{ch.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Empty state: visible when no local + no remote results */}
          {filtered.length === 0 && !remoteLoading && query.trim().length > 0 && (
            <div
              className="px-4 py-8 text-center"
              data-testid={`${testId}-empty`}
            >
              <Search className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Sin resultados para "<span className="text-foreground font-bold">{query}</span>"
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Prueba con otro símbolo o cambia de categoría
              </p>
            </div>
          )}
        </div>

        {/* Keyboard hint footer */}
        <div className="px-3 py-1.5 border-t border-border flex items-center gap-3 text-[9px] text-muted-foreground">
          <span><kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd> Navegar</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Seleccionar</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> Cerrar</span>
          <span className="ml-auto">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</span>
        </div>
      </div>
    </div>
  );
};

export default UniversalAssetSearch;
