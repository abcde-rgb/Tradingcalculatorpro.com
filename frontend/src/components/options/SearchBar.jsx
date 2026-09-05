import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Search, Clock, TrendingUp, Star, ArrowUpRight, ArrowDownRight, X, Flame } from 'lucide-react';
import { fetchStock, searchTickersAPI } from '../../services/optionsApi';
import { searchTickersLocal } from '../../data/mockData';
import { useCloudPref } from '@/lib/cloudPrefs';

const TRENDING = ['SPY', 'NVDA', 'TSLA', 'AAPL', 'META', 'AMZN'];

const highlightMatch = (text, query) => {
  if (!query) return text;
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

const SearchBar = ({ currentTicker, stockData, onSelect }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  // Los últimos activos consultados van con la cuenta, no con el equipo
  // (ver `lib/cloudPrefs.js`).
  const [recents, setRecents] = useCloudPref('optionsRecents');

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const addRecent = useCallback((symbol) => {
    setRecents(prev => [symbol, ...prev.filter(s => s !== symbol)].slice(0, 6));
  }, [setRecents]);

  // Fetch results with smart debounce
  useEffect(() => {
    if (!open) return;

    if (!query.trim()) {
      setResults([]);
      setActiveIdx(-1);
      return;
    }

    // Resultados locales EN EL MISMO TECLEO. Antes este bloque sólo encendía
    // el spinner pese al comentario, así que cada letra esperaba una ida y
    // vuelta al backend y no aparecía nada hasta terminar de escribir. Los
    // locales van sin precio a propósito (ver `searchTickersLocal`).
    const local = searchTickersLocal(query);
    if (local.length > 0) {
      setResults(local);
      setActiveIdx(0);
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const apiResults = await searchTickersAPI(query);
        // El backend manda cuando responde: trae precio y cobertura completa.
        // Si no devuelve nada, se conservan los locales en vez de vaciar la
        // lista que el usuario ya está viendo.
        if (apiResults && apiResults.length > 0) {
          setResults(apiResults);
          setActiveIdx(0);
        } else if (local.length === 0) {
          setResults([]);
          setActiveIdx(-1);
        }
      } catch {
        if (local.length === 0) setResults([]);
      }
      setLoading(false);
    }, 80); // Very fast debounce for instant feel

    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation and selection
  const handleSelectRef = useRef();
  
  const handleSelect = useCallback((symbol) => {
    const s = symbol.toUpperCase();
    addRecent(s);
    onSelect(s);
    setOpen(false);
    setQuery('');
    setActiveIdx(-1);
  }, [onSelect, addRecent]);
  
  handleSelectRef.current = handleSelect;

  const handleKeyDown = useCallback((e) => {
    const totalItems = results.length || 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) {
        handleSelectRef.current(results[activeIdx].symbol);
      } else if (query.trim()) {
        handleSelectRef.current(query.trim().toUpperCase());
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, activeIdx, query]);

  const handleFocus = () => {
    setOpen(true);
    setActiveIdx(-1);
  };

  // Group results by sector
  const groupedResults = useMemo(() => {
    if (!results || results.length === 0) return {};
    const groups = {};
    results.forEach(r => {
      const sector = r.sector || 'Other';
      if (!groups[sector]) groups[sector] = [];
      groups[sector].push(r);
    });
    return groups;
  }, [results]);

  const flatResults = results || [];
  const showRecents = open && !query.trim() && recents.length > 0;
  const showTrending = open && !query.trim();
  const showResults = open && query.trim() && flatResults.length > 0;
  const showNoResults = open && query.trim() && flatResults.length === 0 && !loading;

  return (
    <div ref={containerRef} className="relative w-full max-w-[380px]">
      {/* Input */}
      <div className={`relative flex items-center bg-muted border rounded-xl overflow-hidden transition-all ${
        open ? 'border-primary/60 ring-2 ring-primary/15 shadow-lg shadow-primary/10' : 'border-border hover:border-primary/40'
      }`}>
        <Search className={`absolute left-3.5 w-4 h-4 transition-colors ${open ? 'text-primary' : 'text-muted-foreground'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={open ? 'Escribe ticker o nombre...' : `${currentTicker} — ${stockData?.name || ''}`}
          className="w-full bg-transparent pl-10 pr-10 py-2.5 text-sm text-foreground placeholder-[#4a5568] focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-3 p-0.5 rounded hover:bg-border transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        {loading && (
          <div className="absolute right-3 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#131a2b] border border-border rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-[200] max-h-[440px] flex flex-col">

          {/* Recents */}
          {showRecents && (
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Recientes</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recents.map(sym => (
                  <button
                    key={sym}
                    onClick={() => handleSelect(sym)}
                    className="px-2.5 py-1 bg-[#1a2238] border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted transition-all"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending */}
          {showTrending && (
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Flame className="w-3 h-3 text-warn" />
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Trending</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING.map(sym => (
                  <button
                    key={sym}
                    onClick={() => handleSelect(sym)}
                    className="px-2.5 py-1.5 bg-[#1a2238] border border-border rounded-lg text-xs font-bold text-foreground hover:text-foreground hover:border-warn/40 hover:bg-muted transition-all flex items-center gap-1"
                  >
                    <TrendingUp className="w-3 h-3 text-warn" />
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {showResults && (
            <div className="flex-1 overflow-y-auto">
              {Object.entries(groupedResults).map(([sector, items]) => (
                <div key={sector}>
                  <div className="px-3.5 pt-2.5 pb-1 flex items-center gap-1.5">
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{sector}</span>
                    <div className="flex-1 h-px bg-muted" />
                  </div>
                  {items.map((result) => {
                    const globalIdx = flatResults.indexOf(result);
                    const isActive = globalIdx === activeIdx;
                    return (
                      <button
                        key={result.symbol}
                        onClick={() => handleSelect(result.symbol)}
                        onMouseEnter={() => setActiveIdx(globalIdx)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-all ${
                          isActive ? 'bg-muted' : 'hover:bg-[#1a2238]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            isActive ? 'bg-primary/15 text-primary' : 'bg-[#1a2238] text-muted-foreground'
                          }`}>
                            {result.symbol.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">{highlightMatch(result.symbol, query)}</span>
                              {result.symbol === currentTicker && (
                                <Star className="w-3 h-3 text-warn fill-warn" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{highlightMatch(result.name || '', query)}</p>
                          </div>
                        </div>
                        {/* Los resultados locales llegan sin precio: hasta que
                            responde el backend no se pinta cifra alguna, en vez
                            de un guarismo inventado o un "$undefined". */}
                        <div className="text-right flex-shrink-0 ml-3">
                          {typeof result.price === 'number' ? (
                            <>
                              <div className="text-sm font-bold text-foreground font-mono">${result.price.toFixed(2)}</div>
                              {typeof result.changePercent === 'number' && (
                                <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                                  result.change >= 0 ? 'text-long' : 'text-short'
                                }`}>
                                  {result.change >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                  {result.change >= 0 ? '+' : ''}{result.changePercent}%
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-[10px] text-muted-foreground font-mono">—</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Custom ticker */}
          {query.trim() && (
            <button
              onClick={() => handleSelect(query.trim())}
              className="w-full px-3.5 py-3 border-t border-border flex items-center gap-2 hover:bg-[#1a2238] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm text-primary">Buscar <span className="font-bold">"{query.toUpperCase()}"</span></span>
              <span className="ml-auto text-[10px] text-muted-foreground bg-[#1a2238] px-2 py-0.5 rounded">Enter ↵</span>
            </button>
          )}

          {/* No results */}
          {showNoResults && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">{t('noSeEncontraronResultadosPara_035a76')}<span className="text-muted-foreground">{query}</span>"</p>
              <p className="text-xs text-muted-foreground mt-1">{t('pulsaEnterParaBuscarDe_12c630')}</p>
            </div>
          )}

          {/* Footer hint */}
          {open && (
            <div className="px-3.5 py-2 border-t border-border flex items-center gap-3 text-[9px] text-muted-foreground">
              <span><kbd className="px-1 py-0.5 bg-[#1a2238] rounded text-muted-foreground">↑↓</kbd> Navegar</span>
              <span><kbd className="px-1 py-0.5 bg-[#1a2238] rounded text-muted-foreground">Enter</kbd> Seleccionar</span>
              <span><kbd className="px-1 py-0.5 bg-[#1a2238] rounded text-muted-foreground">Esc</kbd> {t('cerrar_92eb39')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
