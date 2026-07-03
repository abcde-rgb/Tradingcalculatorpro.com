import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Eye, X, Search, RefreshCw } from 'lucide-react';
import { usePersistedState } from '@/hooks/usePersistedState';

const API = process.env.REACT_APP_BACKEND_URL;
const MAX_SYMBOLS = 8;
const REFRESH_MS = 60000;

export const Watchlist = () => {
  const { t } = useTranslation();
  const [data, setData] = usePersistedState('watchlist', {
    symbols: ['BTC-USD', 'AAPL', '^GSPC'],
  });
  const symbols = Array.isArray(data.symbols) ? data.symbols : [];
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);

  const fetchQuotes = useCallback(async (syms) => {
    if (!API || !syms.length) return;
    setLoading(true);
    try {
      const results = await Promise.all(syms.map(async (s) => {
        try {
          const r = await fetch(`${API}/api/stock/${encodeURIComponent(s)}`);
          return [s, await r.json()];
        } catch { return [s, null]; }
      }));
      setQuotes(Object.fromEntries(results));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes(symbols);
    const id = setInterval(() => fetchQuotes(symbols), REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(symbols)]);

  // Debounced symbol search against the universal (Yahoo-backed) endpoint.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || !API) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/api/tickers/universal-search?q=${encodeURIComponent(query)}&limit=6`);
        const j = await r.json();
        setSuggestions(j.results || []);
      } catch { setSuggestions([]); }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const addSymbol = (sym) => {
    const s = sym.toUpperCase();
    if (!symbols.includes(s) && symbols.length < MAX_SYMBOLS) {
      setData(prev => ({ ...prev, symbols: [...(prev.symbols || []), s] }));
    }
    setQuery('');
    setSuggestions([]);
  };
  const removeSymbol = (sym) =>
    setData(prev => ({ ...prev, symbols: (prev.symbols || []).filter(v => v !== sym) }));

  return (
    <Card className="bg-card border-border" data-testid="watchlist">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> {t('watchlistTitle')}
          </span>
          <button
            type="button"
            onClick={() => fetchQuotes(symbols)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title={t('watchlistRefresh')}
            data-testid="watchlist-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add symbol */}
        {symbols.length < MAX_SYMBOLS && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('watchlistAdd')}
              className="pl-8 h-8 text-sm bg-muted border-border"
              data-testid="watchlist-add-input"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => addSymbol(s.symbol)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors"
                  >
                    <span className="font-mono font-bold">{s.symbol}</span>
                    <span className="text-muted-foreground truncate ml-2">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rows */}
        {symbols.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">{t('watchlistEmpty')}</p>
        )}
        <div className="space-y-1">
          {symbols.map(sym => {
            const q = quotes[sym];
            const price = q?.price;
            const chg = q?.changePercent;
            const up = typeof chg === 'number' && chg >= 0;
            return (
              <div
                key={sym}
                className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-border/60 bg-background/40 hover:border-border transition-colors"
                data-testid={`watchlist-row-${sym}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-mono font-bold leading-tight">{sym}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{q?.name || ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold leading-tight">
                      {typeof price === 'number' ? `$${price.toLocaleString()}` : '—'}
                    </p>
                    {typeof chg === 'number' && (
                      <p className={`text-[11px] font-mono ${up ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                        {up ? '+' : ''}{chg.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSymbol(sym)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-[#ef4444] transition-all"
                    title={t('watchlistRemove')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
