import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { STRATEGIES, STRATEGY_CATEGORIES } from '../../data/mockData';
import {
  calculateStrategyPayoff,
  findBreakEvenPoints,
  calculateStrategyGreeks,
  probabilityOfProfit,
  priceRangeFromExpectedMove,
  frontDaysToExpiry,
} from '../../utils/blackScholes';
import { computeStrategyStats } from '../../utils/strategyStats';
import { useTranslation } from '@/lib/i18n';
import { fetchStock, fetchOptionsChains, fetchExpirations } from '../../services/optionsApi';
import useRiskFreeRate from '@/hooks/useRiskFreeRate';
import SyntheticDataBanner from './SyntheticDataBanner';

import PayoffChart from './PayoffChart';
import OptionsChainView from './OptionsChainView';
import IVSurfaceView from './IVSurfaceView';
import DealerPositioning from './DealerPositioning';
import EducationTab from './EducationTab';
import GuideModal from './GuideModal';
import LegEditor from './LegEditor';
import OptimizeView from './OptimizeView';
import UnusualActivity from './UnusualActivity';
import MarketFlow from './MarketFlow';

import BlackScholesCalculator from './BlackScholesCalculator';
import OptionsSubHeader from './OptionsSubHeader';
import StatsKPIBar from './StatsKPIBar';
import CompareBar from './CompareBar';
import EarningsBanner from './EarningsBanner';
import PositionSetupBar from './PositionSetupBar';
import GreeksStrip from './GreeksStrip';
import ExitTargetsTable from './ExitTargetsTable';
import SecondaryPanels from './SecondaryPanels';
import { SectionHeading } from './SectionCard';

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

/**
 * Estrategia pedida por la URL (`/options/calculator?strategy=pmcc`).
 *
 * Es lo que hace que el botón "abrir en la calculadora" de las fichas públicas
 * de estrategia lleve a algún sitio: sin esto, el enlace aterrizaba siempre en
 * la long call por defecto y el usuario tenía que buscar a mano entre 66.
 */
const strategyFromUrl = () => {
  try {
    const id = new URLSearchParams(window.location.search).get('strategy');
    return (id && STRATEGIES.find((s) => s.id === id)) || null;
  } catch {
    return null;
  }
};

const CalculatorPage = () => {
  const { t } = useTranslation();
  const [ticker, setTicker] = useState('AAPL');
  const [stock, setStock] = useState(null);
  const [expirations, setExpirations] = useState([]);
  // Una cadena POR vencimiento, no una sola. Un calendar o un PMCC tienen patas
  // en fechas distintas: con un único `chain` no se podían ni representar.
  // Clave: índice de vencimiento; valor: { chain, synthetic }.
  const [chains, setChains] = useState({});
  // ¿La cadena que se está mostrando la fabricó el modelo por falta de datos reales?
  const [chainSynthetic, setChainSynthetic] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(() => strategyFromUrl() || STRATEGIES[0]);
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
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/options/earnings/${ticker}`, { credentials: 'include' });
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
  }, [ticker]);

  // Cada pata puede apuntar a un vencimiento distinto, así que la lista de
  // cadenas que hay que tener cargadas es la unión del vencimiento seleccionado
  // y los que usen las patas. Se pide en UNA llamada.
  const [legExpIdxs, setLegExpIdxs] = useState([]);
  const neededExpIdxs = useMemo(() => {
    const set = new Set([selectedExpIdx, ...legExpIdxs]);
    return [...set].filter((i) => Number.isInteger(i) && i >= 0).sort((a, b) => a - b);
  }, [selectedExpIdx, legExpIdxs]);
  const neededKey = neededExpIdxs.join(',');

  // Cambiar de ticker invalida TODAS las cadenas: una cadena de AAPL bajo el
  // símbolo MSFT no es un dato viejo, es un dato de otro activo.
  useEffect(() => {
    setChains({});
    setLegExpIdxs([]);
  }, [ticker]);

  // Load options chains when the ticker or the set of needed expirations changes
  useEffect(() => {
    const loadChains = async () => {
      if (!ticker || neededExpIdxs.length === 0) return;
      try {
        const data = await fetchOptionsChains(ticker, neededExpIdxs);
        if (data?.chains) {
          setChains(data.chains);
          setChainSynthetic(Boolean(data.synthetic));
          const primary = data.chains[String(selectedExpIdx)]?.chain || [];
          if (primary.length > 0 && data.stock?.price != null) {
            const closestIdx = primary.reduce(
              (best, s, idx) =>
                Math.abs(s.strike - data.stock.price) <
                Math.abs(primary[best].strike - data.stock.price)
                  ? idx
                  : best,
              0
            );
            setSelectedStrikeIdx(closestIdx);
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[Options] error loading options chains:', e);
        }
      }
    };
    loadChains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, neededKey]);

  // La cadena "actual" — la del vencimiento seleccionado — sigue existiendo para
  // todo lo que es mono-expiración (preset, cadena, superficie de IV).
  const chain = useMemo(
    () => chains[String(selectedExpIdx)]?.chain || [],
    [chains, selectedExpIdx]
  );
  const chainFor = useCallback(
    (expIdx) => chains[String(expIdx)]?.chain || [],
    [chains]
  );

  // Al cambiar de pestaña, el navegador conservaba la posición de scroll de la
  // anterior: se aterrizaba a media tabla de la cadena, con la cabecera ya
  // fuera de vista. Cada pestaña empieza por arriba.
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleTickerSelect = useCallback((symbol) => {
    setTicker(typeof symbol === 'string' ? symbol.toUpperCase() : symbol);
  }, []);

  const currentExp = useMemo(
    () => expirations[selectedExpIdx] || expirations[3] || { daysToExpiry: 30 },
    [expirations, selectedExpIdx]
  );
  // Días a vencimiento de un índice cualquiera, con respaldo en el seleccionado:
  // una pata cuyo vencimiento aún no ha llegado del backend no debe valorarse
  // como si venciera hoy.
  const dteFor = useCallback(
    (expIdx) => expirations[expIdx]?.daysToExpiry ?? currentExp.daysToExpiry,
    [expirations, currentExp]
  );
  const selectedStrike = chain[selectedStrikeIdx];

  // Build legs from strategy + selected strike (PRESET mode)
  // `legDef.expOffset` desplaza la pata a un vencimiento posterior: es lo que
  // convierte un vertical en un calendar o una diagonal.
  const presetLegs = useMemo(() => {
    if (!selectedStrike || !currentExp || chain.length === 0 || !stock) return [];
    return selectedStrategy.legs.map((legDef) => {
      if (legDef.type === 'stock') {
        return { type: 'stock', action: legDef.action, quantity: legDef.qty, strike: stock.price };
      }
      const legExpIdx = Math.max(
        0,
        Math.min(
          Math.max(0, expirations.length - 1),
          selectedExpIdx + (legDef.expOffset || 0)
        )
      );
      const legChain = chainFor(legExpIdx);
      const source = legChain.length > 0 ? legChain : chain;
      const idx = Math.max(0, Math.min(source.length - 1, selectedStrikeIdx + (legDef.offset || 0)));
      const strikeData = source[idx];
      const opt = strikeData?.[legDef.type];
      return {
        type: legDef.type,
        action: legDef.action,
        quantity: legDef.qty * contracts,
        strike: strikeData?.strike || 0,
        premium: opt?.mid || 0,
        iv: opt?.iv || 0.3,
        expIdx: legExpIdx,
        daysToExpiry: dteFor(legExpIdx),
      };
    });
  }, [
    selectedStrategy, selectedStrikeIdx, chain, chainFor, currentExp, stock, contracts,
    selectedStrike, selectedExpIdx, expirations.length, dteFor,
  ]);

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
        expIdx: l.expIdx ?? selectedExpIdx,
        daysToExpiry: dteFor(l.expIdx ?? selectedExpIdx),
      }));
  }, [customLegs, currentExp, chain, stock, selectedExpIdx, dteFor]);

  // Mantiene cargadas las cadenas de los vencimientos que usan las patas.
  useEffect(() => {
    const used = [...new Set(customLegs.map((l) => l.expIdx ?? selectedExpIdx))];
    setLegExpIdxs((prev) =>
      prev.length === used.length && prev.every((v, i) => v === used[i]) ? prev : used
    );
  }, [customLegs, selectedExpIdx]);

  // Revalorar una pata contra la cadena de SU vencimiento.
  //
  // Al cambiar de vencimiento no basta con mover el índice: la prima, la IV y
  // el strike de la pata siguen siendo los de la fecha anterior, y como esos
  // valores viven en `customLegs` nada los refrescaba. Se reancla por strike
  // más cercano porque dos vencimientos no listan los mismos strikes.
  // `pricedExpIdx` marca contra qué cadena está valorada, y es lo que corta el
  // bucle: cuando ya coincide, no hay nada que reescribir.
  useEffect(() => {
    if (customLegs.length === 0) return;
    let changed = false;
    const next = customLegs.map((l) => {
      const expIdx = l.expIdx ?? selectedExpIdx;
      if (l.pricedExpIdx === expIdx) return l;
      const legChain = chains[String(expIdx)]?.chain;
      if (!legChain || legChain.length === 0) return l;
      const target = l.strike ?? stock?.price ?? legChain[0].strike;
      const nearest = legChain.reduce(
        (best, s, i) =>
          Math.abs(s.strike - target) < Math.abs(legChain[best].strike - target) ? i : best,
        0
      );
      const strikeData = legChain[nearest];
      changed = true;
      return {
        ...l,
        strikeIdx: nearest,
        strike: strikeData.strike,
        premium: strikeData[l.type]?.mid ?? 0,
        iv: strikeData[l.type]?.iv ?? 0.3,
        pricedExpIdx: expIdx,
      };
    });
    if (changed) setCustomLegs(next);
  }, [chains, customLegs, selectedExpIdx, stock]);

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
          const legChain = chainFor(l.expIdx ?? selectedExpIdx);
          const source = legChain.length > 0 ? legChain : chain;
          const idx = source.findIndex((s) => s.strike === l.strike);
          return {
            id: `seed-${Date.now()}-${i}`,
            type: l.type,
            action: l.action,
            quantity: l.quantity || 1,
            strikeIdx: idx >= 0 ? idx : selectedStrikeIdx,
            strike: l.strike,
            premium: l.premium,
            iv: l.iv,
            expIdx: l.expIdx ?? selectedExpIdx,
            enabled: true,
          };
        })
    );
  }, [
    customLegs.length, presetLegs, selectedStrategy.id, ticker, selectedStrikeIdx,
    chain, chainFor, selectedExpIdx,
  ]);

  // Strategy B (compare mode)
  const legsB = useMemo(() => {
    if (!compareMode || !selectedStrike || !currentExp || chain.length === 0 || !stock) return [];
    return selectedStrategyB.legs.map((legDef) => {
      if (legDef.type === 'stock') {
        return { type: 'stock', action: legDef.action, quantity: legDef.qty * contracts, strike: stock.price };
      }
      const legExpIdx = Math.max(
        0,
        Math.min(
          Math.max(0, expirations.length - 1),
          selectedExpIdx + (legDef.expOffset || 0)
        )
      );
      const legChain = chainFor(legExpIdx);
      const source = legChain.length > 0 ? legChain : chain;
      const idx = Math.max(0, Math.min(source.length - 1, selectedStrikeIdx + (legDef.offset || 0)));
      const strikeData = source[idx];
      const opt = strikeData?.[legDef.type];
      return {
        type: legDef.type,
        action: legDef.action,
        quantity: legDef.qty * contracts,
        strike: strikeData?.strike || 0,
        premium: opt?.mid || 0,
        iv: opt?.iv || 0.3,
        expIdx: legExpIdx,
        daysToExpiry: dteFor(legExpIdx),
      };
    });
  }, [
    compareMode, selectedStrategyB, selectedStrikeIdx, chain, chainFor, currentExp, stock,
    contracts, selectedStrike, selectedExpIdx, expirations.length, dteFor,
  ]);

  // El eje temporal del gráfico va anclado a la pata MÁS CERCANA, no al
  // vencimiento seleccionado: en un calendar, el día que manda es el que vence
  // primero, porque es cuando la posición cambia de naturaleza.
  const chartHorizonDays = useMemo(() => {
    const front = frontDaysToExpiry(legs);
    return front > 0 ? front : currentExp?.daysToExpiry || 30;
  }, [legs, currentExp]);

  const daysForChart = useMemo(
    () => Math.max(0, Math.round(chartHorizonDays * (timeSlider / 100))),
    [chartHorizonDays, timeSlider]
  );

  // El tipo libre de riesgo real, con su procedencia. Antes se pasaba 0.05
  // literal mientras el backend valoraba con ^IRX: Rho era decorativo y las
  // estructuras de puro tipo (box, jelly roll, conversion) no cuadraban.
  const { rate: riskFreeRate, ratePct: riskFreePct, source: riskFreeSource, isLive: riskFreeLive } =
    useRiskFreeRate();

  // Rango del gráfico derivado del expected move en vez del ±35% fijo: en un
  // 0DTE el payoff salía plano en mitad del lienzo y en un LEAPS volátil se
  // cortaba la parte donde la posición vive.
  const priceRange = useMemo(
    () => (stock ? priceRangeFromExpectedMove(legs, stock.price) : 0.35),
    [legs, stock]
  );
  const priceRangeB = useMemo(
    () => (stock ? priceRangeFromExpectedMove(legsB, stock.price) : 0.35),
    [legsB, stock]
  );

  const payoffData = useMemo(() => {
    if (!stock || legs.length === 0) return [];
    return calculateStrategyPayoff(legs, stock.price, priceRange, daysForChart, riskFreeRate, dividendYield);
  }, [legs, stock, priceRange, daysForChart, riskFreeRate, dividendYield]);

  const payoffDataB = useMemo(() => {
    if (!compareMode || !stock || legsB.length === 0) return [];
    return calculateStrategyPayoff(legsB, stock.price, priceRangeB, daysForChart, riskFreeRate, dividendYield);
  }, [compareMode, legsB, stock, priceRangeB, daysForChart, riskFreeRate, dividendYield]);

  const breakEvens = useMemo(() => findBreakEvenPoints(payoffData), [payoffData]);
  const greeks = useMemo(() => {
    if (!stock || legs.length === 0) {
      return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, vanna: 0, charm: 0, vomma: 0 };
    }
    return calculateStrategyGreeks(legs, stock.price, riskFreeRate, dividendYield);
  }, [legs, stock, riskFreeRate, dividendYield]);

  const pop = useMemo(() => {
    if (!stock || legs.length === 0) return 0;
    return probabilityOfProfit(legs, stock.price, riskFreeRate, dividendYield);
  }, [legs, stock, riskFreeRate, dividendYield]);

  const stats = useMemo(
    () => computeStrategyStats(payoffData, legs, stock, pop, breakEvens, commission),
    [payoffData, legs, stock, pop, breakEvens, commission]
  );

  const breakEvensB = useMemo(() => findBreakEvenPoints(payoffDataB), [payoffDataB]);
  const popB = useMemo(() => {
    if (!compareMode || !stock || legsB.length === 0) return 0;
    return probabilityOfProfit(legsB, stock.price, riskFreeRate, dividendYield);
  }, [compareMode, legsB, stock, riskFreeRate, dividendYield]);
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
      // Una posición guardada puede ser multi-expiración: conservar su expIdx
      // es lo que evita que al recargarla se aplane en un vertical.
      expIdx: l.expIdx ?? selectedExpIdx,
      daysToExpiry: l.daysToExpiry || 30,
      enabled: true,
    }));
    setCustomLegs(mapped);
    if (pos.symbol && pos.symbol !== ticker) setTicker(pos.symbol);
  }, [ticker, selectedExpIdx]);

  const handleOpenInCalculator = useCallback((result) => {
    const mappedLegs = (result.legs || []).map((leg) => ({
      id: `leg-${Math.random().toString(36).slice(2, 8)}`,
      type: leg.type,
      action: leg.action,
      quantity: leg.quantity || 1,
      strike: leg.strike,
      premium: leg.premium || 0,
      iv: 0.3,
      expIdx: leg.expIdx ?? selectedExpIdx,
      daysToExpiry: result.daysToExpiry || 30,
      enabled: true,
    }));
    setCustomLegs(mappedLegs);
    setActiveTab('calculator');
  }, [selectedExpIdx]);

  /**
   * Cambiar el vencimiento global ARRASTRA las patas.
   *
   * Se desplazan todas por el mismo delta en vez de fijarlas al índice nuevo:
   * así una posición normal se mueve entera a la fecha elegida, y un calendar
   * o una diagonal conservan su separación entre patas —que es lo que las
   * define— en lugar de aplanarse en un vertical. La revaloración la hace el
   * efecto de arriba en cuanto llega la cadena.
   */
  const handleExpChange = useCallback((nextIdx) => {
    const maxIdx = Math.max(0, expirations.length - 1);
    const target = Math.max(0, Math.min(maxIdx, nextIdx));
    const delta = target - selectedExpIdx;
    if (delta !== 0) {
      setCustomLegs((prev) =>
        prev.map((l) => ({
          ...l,
          expIdx: Math.max(0, Math.min(maxIdx, (l.expIdx ?? selectedExpIdx) + delta)),
        }))
      );
    }
    setSelectedExpIdx(target);
  }, [selectedExpIdx, expirations.length]);

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
        onTabChange={handleTabChange}
        onTickerSelect={handleTickerSelect}
        onOpenGuide={() => setShowGuide(true)}
      />

      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Avisos de calidad del dato — juntos y arriba del todo: condicionan la
          lectura de TODO lo que viene después, así que no pueden aparecer
          intercalados a mitad de página. */}
      {(dataError || expWarning || chainSynthetic) && (
        <div className="px-3 md:px-4 pt-3 space-y-2" data-testid="data-quality-notices">
          {dataError && (
            <div
              className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3"
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
              className="rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-2.5"
              data-testid="estimated-expirations-warning"
            >
              <p className="text-xs font-semibold text-[#f59e0b]">{expWarning}</p>
            </div>
          )}

          {/* La cadena real se protege sola cuando no hay precio, pero cuando SÍ
              hay precio y el proveedor no devuelve cadena, el backend la fabrica.
              Ese caso llega marcado y hay que avisar antes de que nadie calcule. */}
          <SyntheticDataBanner synthetic={chainSynthetic} />
        </div>
      )}

      {activeTab === 'education' && (
        <EducationTab onSwitchToCalc={() => setActiveTab('calculator')} />
      )}

      {activeTab === 'chain' && (
        <OptionsChainView
          chain={chain}
          stockPrice={stock?.price}
          expirations={expirations}
          selectedExpIdx={selectedExpIdx}
          onExpChange={handleExpChange}
        />
      )}

      {activeTab === 'iv-surface' && <IVSurfaceView stock={stock} chain={chain} />}

      {activeTab === 'dealers' && (
        <div className="p-4">
          <DealerPositioning
            ticker={ticker}
            stock={stock}
            legs={legs}
            expirationIdx={selectedExpIdx}
          />
        </div>
      )}

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
        <div className="p-3 md:p-4 space-y-3">
          <UnusualActivity symbol={ticker} />
          <MarketFlow
            onSelectSymbol={(sym) => {
              setTicker(sym);
              setActiveTab('calculator');
            }}
          />
        </div>
      )}

      {activeTab === 'calculator' && (
        <div className="p-3 md:p-4 space-y-5" data-testid="options-calculator-body">
          <EarningsBanner
            nextEarnings={nextEarnings}
            daysToExpiry={currentExp?.daysToExpiry}
          />

          {/* ═══ 1 · Configura la posición ═════════════════════════════
              Estrategia, vencimiento y contratos: las tres decisiones que
              definen todo lo demás, juntas y en el orden en que se toman. */}
          <section>
            <SectionHeading step={1} title={t('optStepSetup')} hint={t('optStepSetupHint')} />
            <PositionSetupBar
              strategies={STRATEGIES}
              categories={STRATEGY_CATEGORIES}
              selectedStrategy={selectedStrategy}
              onSelectStrategy={handleSelectStrategy}
              expirations={expirations}
              selectedExpIdx={selectedExpIdx}
              onExpChange={handleExpChange}
              contracts={contracts}
              onContractsChange={setContracts}
              compareMode={compareMode}
              onToggleCompare={() => setCompareMode((v) => !v)}
            />
          </section>

          {/* ═══ 2 · Resultado ═════════════════════════════════════════
              Lo que decide si la operación entra o no. Va inmediatamente
              después de la configuración y antes que cualquier gráfico. */}
          <section>
            <SectionHeading step={2} title={t('optStepResult')} hint={t('optStepResultHint')} />
            <StatsKPIBar
              stats={stats}
              breakEvens={breakEvens}
              currentExp={currentExp}
            />

            {/* Objetivos de salida. Va aquí y no en el acordeón: no es análisis
                accesorio, es con lo que se colocan las órdenes de cierre, y sale
                de la misma curva que el gráfico. */}
            <div className="mt-2 bg-card border border-border rounded-xl p-3">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                {t('optExitTargetsTitle')}
              </h3>
              <ExitTargetsTable
                payoffData={payoffData}
                legs={legs}
                stockPrice={stock?.price}
                commission={commission}
                contracts={contracts}
              />
            </div>
            {compareMode && (
              <div className="mt-2">
                <CompareBar
                  strategies={STRATEGIES}
                  categories={STRATEGY_CATEGORIES}
                  selectedStrategy={selectedStrategy}
                  selectedStrategyB={selectedStrategyB}
                  onSelectStrategyB={setSelectedStrategyB}
                  stats={stats}
                  statsB={statsB}
                />
              </div>
            )}
          </section>

          {/* ═══ 3 · Gráfico y patas ═══════════════════════════════════
              Se editan mirando el gráfico, así que van lado a lado en
              escritorio y apilados en móvil. El deslizador de tiempo vive
              DENTRO de la tarjeta del gráfico: antes flotaba suelto debajo,
              sin decir a qué afectaba. */}
          <section>
            <SectionHeading step={3} title={t('optStepChart')} hint={t('optStepChartHint')} />
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-3">
              <div className="bg-card rounded-xl border border-border flex flex-col overflow-hidden">
                <div className="p-4 h-[420px] md:h-[480px]">
                  <PayoffChart
                    data={payoffData}
                    breakEvens={breakEvens}
                    stockPrice={stock?.price}
                    high52w={stock?.high52w}
                    low52w={stock?.low52w}
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
                <div className="border-t border-border px-4 py-2.5 flex items-center gap-3">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <label htmlFor="time-slider" className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {t('optTimeSliderLabel')}
                  </label>
                  <input
                    id="time-slider"
                    type="range" min={0} max={100} value={timeSlider}
                    onChange={(e) => setTimeSlider(parseInt(e.target.value, 10))}
                    className="flex-1 min-w-0"
                    data-testid="time-slider"
                  />
                  <span className="text-xs font-mono font-bold text-foreground tabular-nums whitespace-nowrap">
                    {daysForChart}d
                    <span className="text-muted-foreground font-normal"> / {chartHorizonDays}d</span>
                  </span>
                </div>
              </div>

              {/* En xl la celda se estira sola hasta la altura de la columna
                  del gráfico (grid con align stretch); en móvil se le da una
                  altura fija para que la lista tenga su propio scroll en vez
                  de alargar la página con 6 patas. */}
              <div className="bg-card rounded-xl border border-border overflow-hidden h-[420px] xl:h-auto">
                <LegEditor
                  legs={customLegs}
                  chain={chain}
                  chains={chains}
                  expirations={expirations}
                  defaultExpIdx={selectedExpIdx}
                  stockPrice={stock?.price || 0}
                  onLegsChange={setCustomLegs}
                />
              </div>
            </div>
          </section>

          {/* ═══ 4 · Griegas ═══════════════════════════════════════════
              Primarias en una posición de opciones: describen de qué vive y
              de qué muere. Antes estaban escondidas tras un botón, al mismo
              nivel que Kelly o la cartera. */}
          <section>
            <SectionHeading step={4} title={t('optStepGreeks')} hint={t('optStepGreeksHint')} />
            <GreeksStrip
              greeks={greeks}
              riskFree={{
                ratePct: riskFreePct,
                source: riskFreeSource,
                isLive: riskFreeLive,
              }}
            />
          </section>

          {/* ═══ Más análisis ══════════════════════════════════════════
              Todo lo accesorio, en un solo acordeón y cerrado por defecto. */}
          <section>
            <SectionHeading title={t('optMoreAnalysis')} hint={t('optMoreAnalysisHint')} />
            <SecondaryPanels
              legs={legs}
              stock={stock}
              greeks={greeks}
              stats={stats}
              breakEvens={breakEvens}
              currentExp={currentExp}
              ticker={ticker}
              contracts={contracts}
              accountBalance={accountBalance}
              onAccountBalanceChange={setAccountBalance}
              onLoadPosition={handleLoadPosition}
              commission={commission}
              onCommissionChange={setCommission}
              dividendYield={dividendYield}
              onDividendChange={setDividendYield}
              chainSynthetic={chainSynthetic}
              riskFreeRate={riskFreeRate}
              selectedExpIdx={selectedExpIdx}
            />
          </section>
        </div>
      )}

    </div>
  );
};

export default CalculatorPage;
