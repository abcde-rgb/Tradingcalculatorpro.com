import { useEffect, useRef, useState, memo, useCallback, useMemo } from 'react';
import { useAssetsStore, ALL_ASSETS, ASSET_CATEGORIES, getAssetsByCategory } from '@/lib/assets';
import { useThemeStore, resolveMode } from '@/lib/theme';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Maximize2, Minimize2, Star, StarOff, AlertCircle, RefreshCw, CandlestickChart, Trash2, Search, X } from 'lucide-react';
import { usePersistedState } from '@/hooks/usePersistedState';

// TradingView supported locale mapping. See https://www.tradingview.com/widget/advanced-chart/
const TV_LOCALE_MAP = {
  es: 'es',
  en: 'en',
  de: 'de_DE',
  fr: 'fr',
  ru: 'ru',
  zh: 'zh_CN',
  ja: 'ja',
  ar: 'ar_AE',
};

function TradingViewWidgetComponent() {
  const containerRef = useRef(null);
  const { selectedAsset, setSelectedAsset, selectedCategory, setSelectedCategory, favorites, addFavorite, removeFavorite } = useAssetsStore();
  const { theme } = useThemeStore();
  const { locale, t } = useTranslation();
  const tvLocale = TV_LOCALE_MAP[locale] || 'en';
  
  const [persistedData, setPersistedData, clearPersistedData, isLoadingPersistedState] = usePersistedState('tradingview_chart', {
    interval: 'D',
    isFullscreen: false
  });
  
  const [isFullscreen, setIsFullscreen] = useState(persistedData.isFullscreen);
  const [interval, setInterval] = useState(persistedData.interval);
  const [loadError, setLoadError] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const searchBoxRef = useRef(null);

  // Instant search across the FULL asset catalog (all categories at once).
  const searchResults = useMemo(() => {
    const q = searchQ.trim().toUpperCase();
    if (!q) return [];
    return Object.values(ALL_ASSETS)
      .filter(a => a.symbol.toUpperCase().includes(q) || (a.name || '').toUpperCase().includes(q))
      .sort((a, b) => {
        const ax = a.symbol.toUpperCase() === q ? 0 : a.symbol.toUpperCase().startsWith(q) ? 1 : 2;
        const bx = b.symbol.toUpperCase() === q ? 0 : b.symbol.toUpperCase().startsWith(q) ? 1 : 2;
        return ax - bx;
      })
      .slice(0, 24);
  }, [searchQ]);

  const pickSearchResult = useCallback((a) => {
    setSelectedCategory(a.category);
    setSelectedAsset(a.symbol);
    setSearchQ('');
  }, [setSelectedCategory, setSelectedAsset]);

  // Close the search dropdown on outside click.
  useEffect(() => {
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setSearchQ('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoadingPersistedState) {
      setInterval(persistedData.interval);
      setIsFullscreen(persistedData.isFullscreen);
    }
  }, [persistedData, isLoadingPersistedState]);

  useEffect(() => {
    setPersistedData({ interval, isFullscreen });
  }, [interval, isFullscreen]);
  
  const asset = ALL_ASSETS[selectedAsset];
  const tradingviewSymbol = asset?.tradingviewSymbol || 'BINANCE:BTCUSDT';
  const isFavorite = favorites.includes(selectedAsset);

  // Determinar el tema para TradingView (los temas con nombre resuelven a dark)
  const getTradingViewTheme = useCallback(() => resolveMode(theme), [theme]);

  const loadWidget = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    setIsLoading(true);
    setLoadError(false);
    
    // ✅ SECURITY FIX: Clear container safely without innerHTML
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    try {
      const tvTheme = getTradingViewTheme();
      
      // Create TradingView widget using iframe approach (more reliable)
      const iframe = document.createElement('iframe');
      iframe.id = 'tradingview-widget-iframe';
      iframe.src = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(tradingviewSymbol)}&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=RSI%40tv-basicstudies&theme=${tvTheme}&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=${tvLocale}&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=${encodeURIComponent(tradingviewSymbol)}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      
      iframe.onload = () => {
        setIsLoading(false);
        setLoadError(false);
      };
      
      iframe.onerror = () => {
        setIsLoading(false);
        setLoadError(true);
      };

      container.appendChild(iframe);
      
      // Timeout fallback
      setTimeout(() => {
        setIsLoading(false);
      }, 5000);
      
    } catch (error) {
      // Error is handled by setLoadError state
      setLoadError(true);
      setIsLoading(false);
    }
  }, [tradingviewSymbol, interval, getTradingViewTheme, tvLocale]); // Fixed: added tvLocale so widget reloads when language changes

  useEffect(() => {
    loadWidget();
    
    return () => {
      const container = containerRef.current;
      if (container) {
        // ✅ SECURITY FIX: Clear safely without innerHTML
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, [loadWidget]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(selectedAsset);
    } else {
      addFavorite(selectedAsset);
    }
  };

  const intervals = [
    { value: '1', label: '1m' },
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '30', label: '30m' },
    { value: '60', label: '1H' },
    { value: '240', label: '4H' },
    { value: 'D', label: '1D' },
    { value: 'W', label: '1W' },
    { value: 'M', label: '1M' },
  ];

  const categoryAssets = getAssetsByCategory(selectedCategory);

  return (
    <div className={`rounded-xl bg-card border border-border overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`} data-testid="tradingview-chart">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card/50 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Asset search across ALL categories */}
          <div ref={searchBoxRef} className="relative">
            <div className="flex items-center h-8 w-[170px] bg-muted border border-border rounded-md px-2 focus-within:border-primary/60">
              <Search className="w-3.5 h-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={t('tvSearchAsset')}
                className="w-full bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground"
                data-testid="chart-search"
                autoComplete="off"
                spellCheck={false}
              />
              {searchQ && (
                <button type="button" onClick={() => setSearchQ('')} aria-label="clear">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-[280px] max-h-72 overflow-y-auto bg-card border border-border rounded-lg shadow-xl z-[60]" data-testid="chart-search-results">
                {searchResults.map(a => (
                  <button
                    key={a.symbol}
                    type="button"
                    onClick={() => pickSearchResult(a)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted/60 transition-colors"
                    data-testid={`chart-search-opt-${a.symbol}`}
                  >
                    <span className="font-bold text-xs w-16 shrink-0">{a.symbol}</span>
                    <span className="text-[11px] text-muted-foreground truncate flex-1">{a.name}</span>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">
                      {ASSET_CATEGORIES[a.category]?.name || a.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Selector */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="category-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ASSET_CATEGORIES).map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {t(`category${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}`) || cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Asset Selector */}
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="asset-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryAssets.map(a => (
                <SelectItem key={a.symbol} value={a.symbol}>
                  {a.symbol} - {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Favorite Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={toggleFavorite}
            data-testid="favorite-btn" aria-label={t('favorite')}
          >
            {isFavorite ? (
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            ) : (
              <StarOff className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {intervals.map(int => (
              <button
                key={int.value}
                onClick={() => setInterval(int.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  interval === int.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted-foreground/20'
                }`}
                data-testid={`interval-${int.value}`}
              >
                {int.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          {loadError && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadWidget}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}

          {/* Fullscreen */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {/* Clear Settings */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearPersistedData} title={t('clearSettings')}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div className={`relative ${isFullscreen ? 'h-[calc(100%-52px)]' : 'h-[500px]'}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <div className="text-center">
              <CandlestickChart className="w-12 h-12 text-primary mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-muted-foreground">{t('chartLoading')}</p>
            </div>
          </div>
        )}
        
        {loadError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <div className="text-center p-6">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t('chartLoadFailed')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('chartNotAvailable')}
              </p>
              <Button onClick={loadWidget} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" /> {t('retry')}
              </Button>
            </div>
          </div>
        )}
        
        <div 
          ref={containerRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

export const TradingViewChart = memo(TradingViewWidgetComponent);
