import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Clock, GitCompare, Wrench } from 'lucide-react';
import { STRATEGIES, STRATEGY_CATEGORIES } from '../../data/mockData';
import {
  calculateStrategyPayoff,
  findBreakEvenPoints,
  calculateStrategyGreeks,
  probabilityOfProfit,
} from '../../utils/blackScholes';
import { computeStrategyStats } from '../../utils/strategyStats';
import { useTranslation } from '@/lib/i18n';
import { fetchStock, fetchOptionsChain, fetchExpirations } from '../../services/optionsApi';

import PayoffChart from './PayoffChart';
import StrategyBar from './StrategyBar';
import OptionsChainView from './OptionsChainView';
import IVSurfaceView from './IVSurfaceView';
import EducationTab from './EducationTab';
import GuideModal from './GuideModal';
import LegEditor from './LegEditor';
import OptimizeView from './OptimizeView';
import ExplainTrade from './ExplainTrade';
import UnusualActivity from './UnusualActivity';
import AITradeCoach from './AITradeCoach';
import MarketFlow from './MarketFlow';
import TradeAdvancedPanel from './TradeAdvancedPanel';

import BlackScholesCalculator from './BlackScholesCalculator';
import OptionsSubHeader from './OptionsSubHeader';
import StatsKPIBar from './StatsKPIBar';
import CompareBar from './CompareBar';
import EarningsBanner from './EarningsBanner';
import AdvancedToggles from './AdvancedToggles';

const readPersistedNumber = (key, fallback) => {
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return saved !== null ? parseFloat(saved) : fallback;
  } catch {
    return fallback;
  }
};

const writePersistedNumber = (key, value) => {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, String(value));
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn(`[Options] persist ${key} failed:`, err);
  }
};

const CalculatorPage = () => {
  const { t } = useTranslation();
  const [ticker, setTicker] = useState('AAPL');
  const [stock, setStock] = useState(null);
  const [expirations, setExpirations] = useState([]);
  const [chain, setChain] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0]);
  const [selectedExpIdx, setSelectedExpIdx] = useState(3);
  const [selectedStrikeIdx, setSelectedStrikeIdx] = useState(15);
  const [contracts, setContracts] = useState(1);
  const [timeSlider, setTimeSlider] = useState(100);
  const [activeTab, setActiveTab] = useState('calculator');
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [customLegs, setCustomLegs] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedStrategyB, setSelectedStrategyB] = useState(
    STRATEGIES.find((s) => s.id === 'short_put') || STRATEGIES[1]
  );
  const [showKelly, setShowKelly] = useState(false);
  const [showGreeks, setShowGreeks] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [nextEarnings, setNextEarnings] = useState(null);
  // Data-quality state: set when the backend cannot return real market data
  // (price === null / error) or returns estimated (non-tradeable) expirations.
  const [dataError, setDataError] = useState(null);
  const [expWarning, setExpWarning] = useState(null);

  const [commission, setCommission] = useState(() => readPersistedNumber('options_commission', 0.65));
  useEffect(() => writePersistedNumber('options_commission', commission), [commission]);

  // Dividend yield (decimal, e.g. 0.005 = 0.5%) — auto from stock data when available.
  const [dividendYield, setDividendYield] = useState(0);

  const [accountBalance, setAccountBalance] = useState(() =>
    readPersistedNumber('options_account_balance', 10000)
  );
  useEffect(() => writePersistedNumber('options_account_balance', accountBalance), [accountBalance]);

  // Load stock data + expirations + earnings + start live-price polling
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [stockData, expData] = await Promise.all([
          fetchStock(ticker),
          fetchExpirations(ticker),
        ]);
        // Only treat the stock as usable when we have a real price. The backend
        // returns price === null (plus an `error`) when no real market data is
        // available — in that case we keep stock === null so every downstream
        // calculation (which all guard on `!stock`) stays disabled.
        if (stockData && stockData.price != null && !stockData.error) {
          setStock(stockData);
          setDataError(null);
          if (typeof stockData.dividendYield === 'number') {
            setDividendYield(stockData.dividendYield);
          }
        } else {
          setStock(null);
          setDataError(
            (stockData && stockData.error) ||
              'Market data unavailable — the market may be closed or the symbol may be invalid.'
          );
        }
        if (expData?.expirations) setExpirations(expData.expirations);
        // Flag estimated (non-market) expirations so the user knows the dates
        // may not be tradeable.
        setExpWarning(
          expData?.source === 'estimated'
            ? expData.warning || 'Estimated expiration dates — these may not be tradeable.'
            : null
        );
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[Options] error loading initial stock/expirations:', e);
        }
      }
      setLoading(false);
    };
    loadData();

    (async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/options/earnings/${ticker}`);
        if (res.ok) {
          const data = await res.json();
          setNextEarnings(data.nextEarnings);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.warn('earnings lookup failed:', err);
      }
    })();

    const interval = setInterval(async () => {
      try {
        const freshStock = await fetchStock(ticker);
        // Only update on a real price — never overwrite with a null-price error
        // payload (which would silently re-enable nothing useful).
        if (freshStock && freshStock.price != null && !freshStock.error) {
          setStock(freshStock);
          setDataError(null);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.warn('live price refresh failed:', err);
      }
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  // Load options chain when expiration changes
  useEffect(() => {
    const loadChain = async () => {
      if (!ticker) return;
      try {
        const data = await fetchOptionsChain(ticker, selectedExpIdx);
        if (data?.chain) {
          setChain(data.chain);
          if (data.chain.length > 0 && data.stock) {
            const closestIdx = data.chain.reduce(
              (best, s, idx) =>
                Math.abs(s.strike - data.stock.price) <
                Math.abs(data.chain[best].strike - data.stock.price)
                  ? idx
                  : best,
              0
            );
            setSelectedStrikeIdx(closestIdx);
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[Options] error loading options chain:', e);
        }
      }
    };
    loadChain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, selectedExpIdx]);

  const handleTickerSelect = useCallback((symbol) => {
    setTicker(typeof symbol === 'string' ? symbol.toUpperCase() : symbol);
  }, []);

  const currentExp = useMemo(
    () => expirations[selectedExpIdx] || expirations[3] || { daysToExpiry: 30 },
    [expirations, selectedExpIdx]
  );
  const selectedStrike = chain[selectedStrikeIdx];

  // Build legs from strategy + selected strike (PRESET mode)
  const presetLegs = useMemo(() => {
    if (!selectedStrike || !currentExp || chain.length === 0 || !stock) return [];
    return selectedStrategy.legs.map((legDef) => {
      if (legDef.type === 'stock') {
        return { type: 'stock', action: legDef.action, quantity: legDef.qty, strike: stock.price };
      }
      const idx = Math.max(0, Math.min(chain.length - 1, selectedStrikeIdx + (legDef.offset || 0)));
      const strikeData = chain[idx];
      const opt = strikeData?.[legDef.type];
      return {
        type: legDef.type,
        action: legDef.action,
        quantity: legDef.qty * contracts,
        strike: strikeData?.strike || 0,
        premium: opt?.mid || 0,
        iv: opt?.iv || 0.3,
        daysToExpiry: currentExp.daysToExpiry,
      };
    });
  }, [selectedStrategy, selectedStrikeIdx, chain, currentExp, stock, contracts, selectedStrike]);

  // Custom legs (CUSTOM mode)
  const customBuiltLegs = useMemo(() => {
    if (!currentExp || chain.length === 0 || !stock) return [];
    return customLegs
      .filter((l) => l.enabled)
      .map((l) => ({
        type: l.type,
        action: l.action,
        quantity: l.quantity,
        strike: l.strike,
        premium: l.premium,
        iv: l.iv,
        daysToExpiry: currentExp.daysToExpiry,
      }));
  }, [customLegs, currentExp, chain, stock]);

  // Active legs — always uses the Constructor.
  // Apply the global "contracts" multiplier so premium / max loss / Greeks all scale together.
  const legs = useMemo(
    () =>
      customBuiltLegs.map((l) => ({
        ...l,
        quantity: (l.quantity || 1) * contracts,
      })),
    [customBuiltLegs, contracts]
  );

  // Auto-seed Constructor with the selected preset strategy's legs
  // (when empty + preset is built + ticker/strike/strategy changed).
  const seededRef = useRef(null);
  useEffect(() => {
    if (customLegs.length > 0) return;
    if (presetLegs.length === 0) return;
    const key = `${selectedStrategy.id}-${ticker}-${selectedStrikeIdx}`;
    if (seededRef.current === key) return;
    seededRef.current = key;
    setCustomLegs(
      presetLegs
        .filter((l) => l.type !== 'stock')
        .map((l, i) => {
          const idx = chain.findIndex((s) => s.strike === l.strike);
          return {
            id: `seed-${Date.now()}-${i}`,
            type: l.type,
            action: l.action,
            quantity: l.quantity || 1,
            strikeIdx: idx >= 0 ? idx : selectedStrikeIdx,
            strike: l.strike,
            premium: l.premium,
            iv: l.iv,
            enabled: true,
          };
        })
    );
  }, [customLegs.length, presetLegs, selectedStrategy.id, ticker, selectedStrikeIdx, chain]);

  // Strategy B (compare mode)
  const legsB = useMemo(() => {
    if (!compareMode || !selectedStrike || !currentExp || chain.length === 0 || !stock) return [];
    return selectedStrategyB.legs.map((legDef) => {
      if (legDef.type === 'stock') {
        return { type: 'stock', action: legDef.action, quantity: legDef.qty * contracts, strike: stock.price };
      }
      const idx = Math.max(0, Math.min(chain.length - 1, selectedStrikeIdx + (legDef.offset || 0)));
      const strikeData = chain[idx];
      const opt = strikeData?.[legDef.type];
      return {
        type: legDef.type,
        action: legDef.action,
        quantity: legDef.qty * contracts,
        strike: strikeData?.strike || 0,
        premium: opt?.mid || 0,
        iv: opt?.iv || 0.3,
        daysToExpiry: currentExp.daysToExpiry,
      };
    });
  }, [compareMode, selectedStrategyB, selectedStrikeIdx, chain, currentExp, stock, contracts, selectedStrike]);

  const daysForChart = useMemo(
    () => Math.max(0, Math.round((currentExp?.daysToExpiry || 30) * (timeSlider / 100))),
    [currentExp, timeSlider]
  );

  const payoffData = useMemo(() => {
    if (!stock || legs.length === 0) return [];
    return calculateStrategyPayoff(legs, stock.price, 0.35, daysForChart, 0.05, dividendYield);
  }, [legs, stock, daysForChart, dividendYield]);

  const payoffDataB = useMemo(() => {
    if (!compareMode || !stock || legsB.length === 0) return [];
    return calculateStrategyPayoff(legsB, stock.price, 0.35, daysForChart, 0.05, dividendYield);
  }, [compareMode, legsB, stock, daysForChart, dividendYield]);

  const breakEvens = useMemo(() => findBreakEvenPoints(payoffData), [payoffData]);
  const greeks = useMemo(() => {
    if (!stock || legs.length === 0) return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
    return calculateStrategyGreeks(legs, stock.price, 0.05, dividendYield);
  }, [legs, stock, dividendYield]);

  const pop = useMemo(() => {
    if (!stock || legs.length === 0) return 0;
    return probabilityOfProfit(legs, stock.price);
  }, [legs, stock]);

  const stats = useMemo(
    () => computeStrategyStats(payoffData, legs, stock, pop, breakEvens, commission),
    [payoffData, legs, stock, pop, breakEvens, commission]
  );

  const breakEvensB = useMemo(() => findBreakEvenPoints(payoffDataB), [payoffDataB]);
  const popB = useMemo(() => {
    if (!compareMode || !stock || legsB.length === 0) return 0;
    return probabilityOfProfit(legsB, stock.price);
  }, [compareMode, legsB, stock]);
  const statsB = useMemo(() => {
    if (!compareMode) return computeStrategyStats([], [], null, 0, []);
    return computeStrategyStats(payoffDataB, legsB, stock, popB, breakEvensB, 0);
  }, [compareMode, payoffDataB, legsB, stock, popB, breakEvensB]);

  const handleLoadPosition = useCallback((pos) => {
    const mapped = (pos.legs || []).map((l) => ({
      id: `leg-${Math.random().toString(36).slice(2, 8)}`,
      type: l.type, action: l.action,
      quantity: l.quantity || 1, strike: l.strike,
      premium: l.premium || 0, iv: l.iv || 0.3,
      daysToExpiry: l.daysToExpiry || 30,
    }));
    setCustomLegs(mapped);
    if (pos.symbol && pos.symbol !== ticker) setTicker(pos.symbol);
  }, [ticker]);

  const handleOpenInCalculator = useCallback((result) => {
    const mappedLegs = (result.legs || []).map((leg) => ({
      id: `leg-${Math.random().toString(36).slice(2, 8)}`,
      type: leg.type,
      action: leg.action,
      quantity: leg.quantity || 1,
      strike: leg.strike,
      premium: leg.premium || 0,
      iv: 0.3,
      daysToExpiry: result.daysToExpiry || 30,
    }));
    setCustomLegs(mappedLegs);
    setActiveTab('calculator');
  }, []);

  const handleSelectStrategy = useCallback((s) => {
    setSelectedStrategy(s);
    seededRef.current = null; // invalidate cache to force re-seed
    setCustomLegs([]);        // trigger auto-seed effect with new strategy
  }, []);

  return (
    <div className="flex flex-col bg-background text-foreground" data-testid="options-calculator-root">
      <OptionsSubHeader
        ticker={ticker}
        stock={stock}
        loading={loading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTickerSelect={handleTickerSelect}
        onOpenGuide={() => setShowGuide(true)}
      />

      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {dataError && (
        <div
          className="mx-4 mt-3 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3"
          data-testid="market-data-error"
        >
          <p className="text-sm font-semibold text-[#ef4444]">
            {ticker}: {t('marketDataUnavailableTitle')}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{dataError}</p>
        </div>
      )}

      {expWarning && (
        <div
          className="mx-4 mt-3 rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-2.5"
          data-testid="estimated-expirations-warning"
        >
          <p className="text-xs font-semibold text-[#f59e0b]">{expWarning}</p>
        </div>
      )}

      {activeTab === 'education' && (
        <EducationTab onSwitchToCalc={() => setActiveTab('calculator')} />
      )}

      {activeTab === 'chain' && (
        <OptionsChainView
          chain={chain}
          stockPrice={stock?.price}
          expiration={currentExp}
          expirations={expirations}
          selectedExpIdx={selectedExpIdx}
          onExpChange={setSelectedExpIdx}
        />
      )}

      {activeTab === 'iv-surface' && <IVSurfaceView stock={stock} chain={chain} />}

      {activeTab === 'black-scholes' && <BlackScholesCalculator />}

      {activeTab === 'optimize' && (
        <OptimizeView
          symbol={ticker}
          stock={stock}
          expirations={expirations}
          onOpenInCalculator={handleOpenInCalculator}
        />
      )}

      {activeTab === 'flow' && (
        <div className="space-y-0">
          <UnusualActivity symbol={ticker} />
          <div className="px-4 pb-4">
            <MarketFlow
              onSelectSymbol={(sym) => {
                setTicker(sym);
                setActiveTab('calculator');
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'calculator' && (
        <>
          <EarningsBanner
            nextEarnings={nextEarnings}
            daysToExpiry={currentExp?.daysToExpiry}
          />

          {/* Strategy preset bar with compare-mode toggle (rendered inline in
              the filter row — the old absolute overlay collided with the
              category pills on small screens) */}
          <StrategyBar
            strategies={STRATEGIES}
            categories={STRATEGY_CATEGORIES}
            selected={selectedStrategy}
            onSelect={handleSelectStrategy}
            rightSlot={
              <button
                onClick={() => setCompareMode((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 h-8 rounded-full text-[10px] font-bold transition-all border ${
                  compareMode
                    ? 'bg-[#a855f7]/20 border-[#a855f7]/50 text-[#c084fc]'
                    : 'bg-[#a855f7]/10 border-[#a855f7]/25 text-[#c084fc] hover:bg-[#a855f7]/20'
                }`}
                data-testid="compare-toggle"
              >
                <GitCompare className="w-3 h-3" />
                <span className="whitespace-nowrap">{compareMode ? t('optComparing') : t('optCompareToggle')}</span>
              </button>
            }
          />

          {/* Constructor multi-leg header */}
          <div className="bg-card border-b border-border px-5 py-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#f59e0b]" />
              <h3 className="text-sm font-bold text-foreground">{t('optConstructorTitle')}</h3>
            </div>
            <span className="text-[10px] bg-[#f59e0b]/10 px-2 py-0.5 rounded-full text-[#fbbf24] font-semibold">
              {customLegs.filter((l) => l.enabled).length} {t('optLegs')}
            </span>
            <span className="text-[10px] text-muted-foreground ml-2">· {t('optConstructorHint')}</span>
          </div>

          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 flex flex-col p-3 gap-2.5 min-w-0">
              <StatsKPIBar
                stats={stats}
                breakEvens={breakEvens}
                legs={legs}
                ticker={ticker}
                currentExp={currentExp}
                commission={commission}
                onCommissionChange={setCommission}
                contracts={contracts}
                onContractsChange={setContracts}
              />

              {compareMode && (
                <CompareBar
                  strategies={STRATEGIES}
                  categories={STRATEGY_CATEGORIES}
                  selectedStrategy={selectedStrategy}
                  selectedStrategyB={selectedStrategyB}
                  onSelectStrategyB={setSelectedStrategyB}
                  stats={stats}
                  statsB={statsB}
                />
              )}

              {/* Chart — fixed tall height for prominence */}
              <div className="bg-card rounded-xl border border-border p-4 h-[520px]">
                <PayoffChart
                  data={payoffData}
                  breakEvens={breakEvens}
                  stockPrice={stock?.price}
                  legs={legs}
                  dataB={compareMode ? payoffDataB : null}
                  labelA={t(selectedStrategy.name)}
                  labelB={t(selectedStrategyB.name)}
                  title={
                    compareMode
                      ? `${t(selectedStrategy.name)} vs ${t(selectedStrategyB.name)} — ${ticker}`
                      : `${t(selectedStrategy.name)} — ${ticker}`
                  }
                />
              </div>

              {/* Time slider */}
              <div className="flex items-center gap-3 bg-card/60 rounded-lg border border-border/60 px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{t('vencimiento_91e0e1')}</span>
                <div className="flex-1 relative">
                  <input
                    type="range" min={0} max={100} value={timeSlider}
                    onChange={(e) => setTimeSlider(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <span className="text-xs font-mono font-bold text-foreground min-w-[44px] text-right">
                  {daysForChart}d
                </span>
                <span className="text-[10px] text-muted-foreground">/ {currentExp?.daysToExpiry}d</span>
              </div>

              <ExplainTrade legs={legs} stock={stock} breakEvens={breakEvens} stats={stats} />

              <AITradeCoach
                symbol={ticker}
                stock={stock}
                legs={legs}
                stats={stats}
                greeks={greeks}
                daysToExpiry={currentExp?.daysToExpiry}
                balance={accountBalance}
              />
            </div>

            <aside className="w-full lg:w-[272px] lg:min-w-[272px] bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col">
              <div className="p-4 border-b border-border">
                <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2.5 block">
                  {t('optExpirationDate')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {expirations.slice(0, 9).map((exp, idx) => (
                    <button
                      key={exp.date}
                      onClick={() => setSelectedExpIdx(idx)}
                      className={`px-1.5 py-2 rounded-lg text-center transition-all text-[11px] ${
                        selectedExpIdx === idx
                          ? 'bg-primary/15 text-primary border border-primary/40 font-semibold'
                          : 'bg-muted text-muted-foreground border border-border hover:border-border hover:text-foreground'
                      }`}
                    >
                      <div className="font-medium">{exp.label}</div>
                      <div className="text-[9px] opacity-60 mt-0.5">{exp.daysToExpiry}d</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <LegEditor
                  legs={customLegs}
                  chain={chain}
                  stockPrice={stock?.price || 0}
                  onLegsChange={setCustomLegs}
                />
              </div>
            </aside>
          </div>

          {/* Advanced sections — collapsible */}
          <div className="border-t border-border bg-background">
            <AdvancedToggles
              showKelly={showKelly} onToggleKelly={() => setShowKelly((v) => !v)}
              showGreeks={showGreeks} onToggleGreeks={() => setShowGreeks((v) => !v)}
              showPortfolio={showPortfolio} onTogglePortfolio={() => setShowPortfolio((v) => !v)}
              greeks={greeks}
              legs={legs}
              stock={stock}
              currentExp={currentExp}
              ticker={ticker}
              stats={stats}
              contracts={contracts}
              accountBalance={accountBalance}
              onAccountBalanceChange={setAccountBalance}
              onLoadPosition={handleLoadPosition}
            />

            {/* Pro-grade panel: Fees + Dividends + P&L Attribution + Assignment */}
            <div className="px-4 py-3 border-t border-border">
              <TradeAdvancedPanel
                legs={legs}
                stock={stock}
                feePerContract={commission}
                onFeeChange={setCommission}
                dividendYield={dividendYield}
                onDividendChange={setDividendYield}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalculatorPage;
