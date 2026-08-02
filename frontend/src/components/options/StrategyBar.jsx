import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const ShapeSVG = ({ shape, color }) => {
  const paths = {
    call_buy: 'M5,28 L18,28 L30,8',
    put_buy: 'M5,8 L17,28 L30,28',
    call_sell: 'M5,8 L18,8 L30,28',
    put_sell: 'M5,28 L17,8 L30,8',
    covered_call: 'M5,28 L18,10 L30,10',
    bull_spread: 'M5,25 L13,25 L20,10 L30,10',
    bear_spread: 'M5,10 L13,10 L20,25 L30,25',
    iron_condor: 'M3,18 L8,25 L14,8 L20,8 L26,25 L31,18',
    straddle: 'M5,8 L17,28 L30,8',
    strangle: 'M3,8 L11,25 L22,25 L30,8',
    butterfly: 'M3,20 L10,20 L17,6 L24,20 L31,20',
    iron_butterfly: 'M3,18 L10,18 L17,5 L24,18 L31,18',
    jade_lizard: 'M3,20 L10,25 L17,10 L24,10 L31,20',
    call_ratio: 'M5,22 L13,28 L20,18 L30,5',
    put_ratio: 'M5,5 L13,18 L20,28 L30,22',
    collar: 'M3,25 L12,10 L22,10 L31,18',
    synthetic_long: 'M5,28 L17,17 L30,5',
    synthetic_short: 'M5,5 L17,17 L30,28',
    long_combo: 'M5,26 L12,20 L22,14 L30,5',
    short_combo: 'M5,5 L12,14 L22,20 L30,26',
    short_straddle: 'M5,28 L17,8 L30,28',
    short_strangle: 'M3,28 L11,10 L22,10 L30,28',
    ratio_spread: 'M5,20 L13,10 L20,10 L30,25',
    ratio_spread_put: 'M5,25 L13,10 L20,10 L30,20',
    broken_wing: 'M3,18 L10,18 L17,5 L24,18 L31,22',
    reverse_ic: 'M3,18 L8,10 L14,28 L20,28 L26,10 L31,18',
    reverse_ib: 'M3,18 L10,18 L17,30 L24,18 L31,18',
    long_guts: 'M5,6 L17,30 L30,6',
    strap: 'M5,6 L14,28 L22,22 L30,5',
    strip: 'M5,5 L12,22 L20,28 L30,6',
    // Multi-vencimiento: la curva no toca el eje en los extremos porque la
    // pata larga conserva valor extrínseco cuando vence la corta.
    calendar: 'M3,24 L11,20 L17,7 L23,20 L31,24',
    diagonal: 'M3,26 L11,21 L18,8 L24,12 L31,15',
    double_calendar: 'M3,25 L9,12 L14,20 L20,20 L25,12 L31,25',
    box: 'M4,14 L30,14 L30,22 L4,22 Z',
    ladder: 'M3,22 L11,22 L18,9 L24,9 L31,28',
    ladder_long: 'M3,12 L11,12 L18,25 L24,25 L31,5',
  };
  return (
    <svg viewBox="0 0 34 34" className="w-full h-full">
      <path d={paths[shape] || paths.call_buy} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="0" y1="20" x2="34" y2="20" stroke="#2a3446" strokeWidth="0.5" strokeDasharray="2 2" />
    </svg>
  );
};

// ============= CATEGORY CONFIG (i18n keys, not hardcoded labels) =============
const CATEGORIES = {
  Bullish:  { labelKey: 'filterBullish',  icon: TrendingUp,   color: '#22c55e', ring: 'ring-[#22c55e]/50',  bgActive: 'bg-[#22c55e]/15',  bgHover: 'hover:bg-[#22c55e]/10',  text: 'text-[#22c55e]' },
  Bearish:  { labelKey: 'filterBearish',  icon: TrendingDown, color: '#ef4444', ring: 'ring-[#ef4444]/50',  bgActive: 'bg-[#ef4444]/15',  bgHover: 'hover:bg-[#ef4444]/10',  text: 'text-[#ef4444]' },
  Neutral:  { labelKey: 'filterNeutral',  icon: Minus,        color: '#3b82f6', ring: 'ring-[#3b82f6]/50',  bgActive: 'bg-[#3b82f6]/15',  bgHover: 'hover:bg-[#3b82f6]/10',  text: 'text-[#3b82f6]' },
  Volatile: { labelKey: 'filterVolatile', icon: Zap,          color: '#eab308', ring: 'ring-[#eab308]/50',  bgActive: 'bg-[#eab308]/15',  bgHover: 'hover:bg-[#eab308]/10',  text: 'text-[#eab308]' },
};

const FilterPill = ({ active, onClick, Icon, label, count, text, bgActive, bgHover, ring, iconColor, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`group relative flex items-center gap-2 px-3 h-8 rounded-full border transition-all ${
      active
        ? `${bgActive} ${text} border-transparent ring-1 ${ring} shadow-sm`
        : `bg-muted/30 border-border text-muted-foreground ${bgHover} hover:text-foreground hover:border-border/80`
    }`}
  >
    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={active ? undefined : { color: iconColor, opacity: 0.75 }} />
    <span className="text-[11px] font-semibold tracking-wide">{label}</span>
    <span
      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full transition-colors ${
        active ? 'bg-background/40' : 'bg-muted/60 group-hover:bg-muted'
      }`}
    >
      {count}
    </span>
  </button>
);

/**
 * Selector de estrategia. Ya NO se renderiza siempre: vive dentro de
 * `PositionSetupBar` y sólo aparece cuando el usuario pulsa el nombre de la
 * estrategia actual. Por eso no lleva marco ni fondo propios — los pone el
 * contenedor — y ya no recibe `rightSlot`: el botón de comparar pasó a la fila
 * de configuración, que es donde se decide, no dentro de la lista.
 */
const StrategyBar = ({ strategies, categories, selected, onSelect }) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState(null);
  const [query, setQuery] = useState('');
  const selectedCardRef = useRef(null);

  // Lista VERTICAL con scroll propio, no una tira horizontal.
  //
  // El modo plegado era `flex-nowrap overflow-x-auto`: una sola fila con las
  // 66 estrategias, que obligaba a arrastrar de lado durante metros para llegar
  // a las últimas y no cabía en ninguna pantalla. Una lista vertical acotada se
  // recorre con la rueda del ratón, con la barra o con el teclado, y además
  // admite buscar por nombre — con 66 estructuras, filtrar es más rápido que
  // recorrer.
  const filtered = useMemo(() => {
    const byCat = activeCategory
      ? strategies.filter((s) => s.category === activeCategory)
      : strategies;
    const q = query.trim().toLowerCase();
    if (!q) return byCat;
    return byCat.filter((s) => t(s.name).toLowerCase().includes(q));
  }, [strategies, activeCategory, query, t]);

  // Al abrir, deja la estrategia activa a la vista dentro de la lista.
  useEffect(() => {
    if (selectedCardRef.current) {
      selectedCardRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selected, activeCategory]);

  return (
    <div className="px-4 py-3">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <FilterPill
          active={!activeCategory}
          onClick={() => setActiveCategory(null)}
          Icon={Layers}
          label={t('filterAll')}
          count={strategies.length}
          text="text-primary"
          bgActive="bg-primary/15"
          bgHover="hover:bg-primary/10"
          ring="ring-primary/50"
          iconColor="#9ca3af"
          testId="filter-all"
        />
        {categories.map(cat => {
          const cfg = CATEGORIES[cat];
          if (!cfg) return null;
          const count = strategies.filter(s => s.category === cat).length;
          return (
            <FilterPill
              key={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              Icon={cfg.icon}
              label={t(cfg.labelKey)}
              count={count}
              text={cfg.text}
              bgActive={cfg.bgActive}
              bgHover={cfg.bgHover}
              ring={cfg.ring}
              iconColor={cfg.color}
              testId={`filter-${cat.toLowerCase()}`}
            />
          );
        })}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground tabular-nums" data-testid="strategy-count">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* Buscador: con 66 estructuras, escribir "calendar" llega antes que
          recorrer la lista entera. */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('patternsSearchPlaceholder')}
        data-testid="strategy-search"
        className="w-full h-9 mb-2 rounded-lg bg-muted border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
      />

      {/* Lista vertical acotada: rueda del ratón, barra de scroll o teclado. */}
      <div
        className="max-h-[46vh] min-h-[9rem] overflow-y-auto overscroll-contain [scrollbar-width:thin] grid grid-cols-1 lg:grid-cols-2 gap-1.5 pr-1"
        data-testid="strategy-list"
      >
        {filtered.map(strategy => (
          <button
            key={strategy.id}
            ref={selected.id === strategy.id ? selectedCardRef : null}
            onClick={() => onSelect(strategy)}
            aria-current={selected.id === strategy.id ? 'true' : undefined}
            className={`flex w-full items-center gap-2.5 pl-2 pr-3 py-2 rounded-lg border text-left transition-colors ${
              selected.id === strategy.id
                ? 'bg-primary/10 border-primary/50'
                : 'bg-muted border-border hover:border-primary/30 hover:bg-muted/70'
            }`}
          >
            <div className="w-9 h-7 flex-shrink-0">
              <ShapeSVG shape={strategy.shape} color={selected.id === strategy.id ? '#22c55e' : strategy.color} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate text-foreground">{t(strategy.name)}</div>
              <div className="text-[9px] text-muted-foreground truncate">
                {t('riskLabel')}: {t(strategy.risk)} · {t('rewardLabel')}: {t(strategy.reward)}
              </div>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full text-xs text-muted-foreground py-6 text-center">
            {t('patternsNoResults')} “{query}”
          </p>
        )}
      </div>
    </div>
  );
};

export default StrategyBar;
