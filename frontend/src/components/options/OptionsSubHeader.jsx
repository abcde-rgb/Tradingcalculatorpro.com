import React from 'react';
import {
  Activity, ArrowUpRight, ArrowDownRight, BarChart2, BookOpen,
  HelpCircle, LayoutGrid, Loader2, Target, Sigma,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import SearchBar from './SearchBar';
import IVRankBadge from './IVRankBadge';

const TABS = [
  { id: 'calculator', icon: BarChart2, labelKey: 'optTabCalculator', testid: 'tab-calculator' },
  { id: 'optimize',  icon: Target,    labelKey: 'optTabOptimize',  testid: 'tab-optimize' },
  { id: 'flow',      icon: Activity,  labelKey: 'optTabFlow',      testid: 'tab-flow' },
  { id: 'chain',     icon: LayoutGrid, labelKey: 'optTabChain',    testid: 'tab-chain' },
  { id: 'iv-surface', icon: Activity,  labelKey: 'optTabIVSurface', testid: 'tab-iv-surface' },
  { id: 'education',    icon: BookOpen,  labelKey: 'optTabAcademy',   testid: 'tab-education' },
  { id: 'black-scholes', icon: Sigma,   labelKey: 'bsTabLabel',      testid: 'tab-black-scholes' },
];

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

  return (
    <header className="sticky top-16 h-14 min-h-[56px] bg-card border-b border-border flex items-center px-5 gap-4 z-30">
      <SearchBar currentTicker={ticker} stockData={stock} onSelect={onTickerSelect} />

      {stock && (
        <div className="flex items-center gap-3 ml-2">
          {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          <span className="text-xl font-bold text-foreground font-mono" data-testid="live-price">
            ${stock.price.toFixed(2)}
          </span>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
            stock.change >= 0 ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#ef4444]/10 text-[#ef4444]'
          }`}>
            {stock.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {stock.change >= 0 ? '+' : ''}{stock.change} ({stock.changePercent}%)
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stock.sector}</span>
          <span className="relative flex h-2 w-2" title={t('precioEnVivoRefrescoCada_73be80')}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <IVRankBadge symbol={ticker} />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="flex bg-muted rounded-lg border border-border overflow-hidden">
          {TABS.map(({ id, icon: Icon, labelKey, testid }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              data-testid={testid}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeTab === id
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5 inline mr-1" />{t(labelKey)}
            </button>
          ))}
        </div>
        <button
          onClick={onOpenGuide}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          title={t('optQuickGuide')}
        >
          <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-[#eab308]" />
        </button>
        <div className="flex items-center gap-1.5 text-xs ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
          <span className="text-[#22c55e]">LIVE</span>
        </div>
      </div>
    </header>
  );
};

export default OptionsSubHeader;
