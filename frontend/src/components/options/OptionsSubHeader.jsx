import React from 'react';
import {
  Activity, ArrowUpRight, ArrowDownRight, BarChart2, BookOpen,
  HelpCircle, LayoutGrid, Loader2, Target, Sigma,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import SearchBar from './SearchBar';
import IVRankBadge from './IVRankBadge';

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
    <header className="sticky top-16 bg-card border-b border-border z-30">
      {/* Row 1 — instrument: search, live price, IV rank. Tabular numerals so
          the price doesn't shift the row every time it ticks. */}
      <div className="h-14 min-h-[56px] flex items-center px-4 md:px-5 gap-3 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
        <SearchBar currentTicker={ticker} stockData={stock} onSelect={onTickerSelect} />

        {stock && (
          <div className="flex items-center gap-2.5 ml-1 shrink-0">
            {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            <span
              className="text-xl font-bold text-foreground font-mono tabular-nums"
              data-testid="live-price"
            >
              ${stock.price.toFixed(2)}
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums ${
              stock.change >= 0 ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#ef4444]/10 text-[#ef4444]'
            }`}>
              {stock.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {stock.change >= 0 ? '+' : ''}{stock.change} ({stock.changePercent}%)
            </div>
            <span className="hidden md:inline text-[10px] text-muted-foreground uppercase tracking-wider">
              {stock.sector}
            </span>
            <span className="relative flex h-2 w-2" title={t('precioEnVivoRefrescoCada_73be80')}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <IVRankBadge symbol={ticker} />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenGuide}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title={t('optQuickGuide')}
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-[#eab308]" />
          </button>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
            <span className="text-[#22c55e]">LIVE</span>
          </div>
        </div>
      </div>

      {/* Row 2 — navigation, grouped by intent. Desktop: three labelled
          clusters. Mobile: a single select, one line instead of seven. */}
      <div className="border-t border-border/60 px-4 md:px-5 py-1.5">
        <div className="hidden lg:flex items-center gap-4 overflow-x-auto [scrollbar-width:thin]">
          {GROUPS.map((g) => (
            <div key={g.id} className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
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
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold shrink-0">
            {t(activeGroup.labelKey)}
          </span>
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value)}
            data-testid="options-tab-select"
            aria-label={activeLabel ? t(activeLabel) : undefined}
            className="flex-1 h-8 rounded-lg border border-border bg-muted text-xs font-medium px-2 text-foreground"
          >
            {GROUPS.map((g) => (
              <optgroup key={g.id} label={t(g.labelKey)}>
                {g.tabs.map((tb) => (
                  <option key={tb.id} value={tb.id}>{t(tb.labelKey)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};

export default OptionsSubHeader;
