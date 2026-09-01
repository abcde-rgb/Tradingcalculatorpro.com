import React from 'react';
import {
  Activity, ArrowUpRight, ArrowDownRight, BarChart2, BookOpen,
  HelpCircle, LayoutGrid, Loader2, Target, Sigma,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SearchBar from './SearchBar';
import IVRankBadge from './IVRankBadge';
import EstadoPrecio from '@/components/common/EstadoPrecio';

// Seven tabs in one flat row overflowed every screen below ~1280px and forced
// horizontal scrolling. Grouping them into three intents (trade / analyse /
// learn) keeps every tab reachable in one glance and collapses cleanly on
// mobile. Tab ids are unchanged — CalculatorPage still switches on them.
const GROUPS = [
  {
    id: 'trade',
    labelKey: 'optGroupTrade',
    tabs: [
      { id: 'calculator', icon: BarChart2, labelKey: 'optTabCalculator', testid: 'tab-calculator' },
      { id: 'optimize', icon: Target, labelKey: 'optTabOptimize', testid: 'tab-optimize' },
    ],
  },
  {
    id: 'analyse',
    labelKey: 'optGroupAnalyse',
    tabs: [
      { id: 'chain', icon: LayoutGrid, labelKey: 'optTabChain', testid: 'tab-chain' },
      { id: 'iv-surface', icon: Sigma, labelKey: 'optTabIVSurface', testid: 'tab-iv-surface' },
      { id: 'flow', icon: Activity, labelKey: 'optTabFlow', testid: 'tab-flow' },
      { id: 'dealers', icon: ArrowUpRight, labelKey: 'optTabDealers', testid: 'tab-dealers' },
    ],
  },
  {
    id: 'learn',
    labelKey: 'optGroupLearn',
    tabs: [
      { id: 'black-scholes', icon: Sigma, labelKey: 'bsTabLabel', testid: 'tab-black-scholes' },
      { id: 'education', icon: BookOpen, labelKey: 'optTabAcademy', testid: 'tab-education' },
    ],
  },
];

const TABS = GROUPS.flatMap((g) => g.tabs);

// El resaltado por defecto de shadcn usa --accent, que en este tema es azul
// (217°) mientras la app es verde (145°). Las pestañas activas de escritorio
// ya van en primary; el desplegable móvil tiene que leerse igual.
const ITEM_CLS = 'text-xs focus:bg-primary/15 focus:text-primary data-[state=checked]:text-primary';

const OptionsSubHeader = ({
  ticker,
  stock,
  loading,
  activeTab,
  onTabChange,
  onTickerSelect,
  onOpenGuide,
}) => {
  const { t } = useTranslation();

  const activeGroup = GROUPS.find((g) => g.tabs.some((tb) => tb.id === activeTab)) || GROUPS[0];
  const activeLabel = TABS.find((tb) => tb.id === activeTab)?.labelKey;

  return (
    // On a landscape phone the two sticky bars ate 43% of the viewport
    // (65px header + 102px here). Below 520px of height the toolbar scrolls
    // away instead of pinning, giving the content the screen back.
    <header className="sticky top-16 [@media(max-height:520px)]:static bg-card border-b border-border z-30">
      {/* Row 1 — instrument: search, live price, IV rank. Tabular numerals so
          the price doesn't shift the row every time it ticks. */}
      <div className="h-14 min-h-[56px] flex items-center px-4 md:px-5 gap-3 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
        <SearchBar currentTicker={ticker} stockData={stock} onSelect={onTickerSelect} />

        {stock && (
          <div className="flex items-center gap-2.5 ml-1 shrink-0">
            {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            {/* El aviso de «sin actualizar» vive en la esquina opuesta, que es
                donde estaba el LIVE. Ahí solo no basta: lo que el usuario mira
                para dimensionar es ESTE número, y a 1.300 px de distancia las
                dos cosas no se relacionan. Cuando el precio es viejo, el propio
                precio lo dice. */}
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                stock.stale ? 'text-warn' : 'text-foreground'
              }`}
              title={stock.stale ? t('precioDesfasadoAviso') : undefined}
              data-testid="live-price"
              data-stale={stock.stale ? 'true' : 'false'}
            >
              ${stock.price.toFixed(2)}
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums ${
              stock.change >= 0 ? 'bg-long/10 text-long' : 'bg-short/10 text-short'
            }`}>
              {stock.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {stock.change >= 0 ? '+' : ''}{stock.change} ({stock.changePercent}%)
            </div>
            <span className="hidden md:inline text-[10px] text-muted-foreground uppercase tracking-wider">
              {stock.sector}
            </span>
            <IVRankBadge symbol={ticker} />
          </div>
        )}

        {/* Un solo indicador de "en vivo". Antes había dos —un punto que
            palpitaba junto al precio y una etiqueta LIVE a la derecha— diciendo
            exactamente lo mismo desde dos sitios distintos.

            Y hasta el 2026-08-22 ese «LIVE» verde estaba escrito a mano: se
            pintaba igual con un precio de hace un segundo que con uno de ayer.
            Ahora sale de `stock.stale`, que es lo que responde el backend desde
            que `/api/stock/{symbol}` tiene detrás la cadena de reserva. Sobre
            este precio se construyen strikes, griegas y P&L. */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <EstadoPrecio stale={stock?.stale} asOf={stock?.as_of} source={stock?.source} />
          <button
            onClick={onOpenGuide}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title={t('optQuickGuide')}
            aria-label={t('optQuickGuide')}
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-caution" />
          </button>
        </div>
      </div>

      {/* Row 2 — navigation, grouped by intent. Desktop: three labelled
          clusters. Mobile: a single select, one line instead of seven. */}
      <div className="border-t border-border/60 px-4 md:px-5 py-1.5">
        <div className="hidden lg:flex items-center gap-4 overflow-x-auto [scrollbar-width:thin]">
          {GROUPS.map((g) => (
            <div key={g.id} className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t(g.labelKey)}
              </span>
              <div className="flex bg-muted rounded-lg border border-border overflow-hidden">
                {g.tabs.map(({ id, icon: Icon, labelKey, testid }) => (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    data-testid={testid}
                    aria-current={activeTab === id ? 'page' : undefined}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      activeTab === id
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 inline mr-1" />{t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
            {t(activeGroup.labelKey)}
          </span>
          {/* Radix, no <select> nativo: en móvil el nativo abre la hoja a
              pantalla completa del sistema —tapa la pantalla entera y no se
              parece a nada del resto de la app—. Esto despliega un panel
              anclado bajo el control, como en escritorio. */}
          <Select value={activeTab} onValueChange={onTabChange}>
            <SelectTrigger
              data-testid="options-tab-select"
              aria-label={activeLabel ? t(activeLabel) : undefined}
              className="flex-1 min-w-0 h-8 rounded-lg border-border bg-muted text-xs font-medium px-2 text-foreground shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              {GROUPS.map((g) => (
                <SelectGroup key={g.id}>
                  <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                    {t(g.labelKey)}
                  </SelectLabel>
                  {g.tabs.map(({ id, icon: Icon, labelKey }) => (
                    <SelectItem key={id} value={id} className={ITEM_CLS}>
                      <Icon className="w-3.5 h-3.5 inline mr-1.5 -mt-px" />
                      {t(labelKey)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
};

export default OptionsSubHeader;
