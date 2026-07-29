import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Layers, Waves, GitBranch, CandlestickChart, History, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAssetsStore, ALL_ASSETS } from '@/lib/assets';
import { PATTERN_NAME_KEY, TYPE_BADGE, BEHAVIOR_KEY, rateColor } from '@/lib/candlePatternMeta';
import { DAY_MS, loadLogFor, mergeLogFor, clearLogFor, purgeLegacyLogs } from '@/lib/structureLog';
import CandlePatternFigure from '@/components/education/CandlePatternFigure';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// The chart and the scanner share the SAME asset (Zustand store), but the
// backend reads Yahoo Finance, which needs Yahoo-formatted tickers. We know the
// category here, so we translate on the frontend and leave the backend generic.
const INDEX_YF = {
  SPX: '^GSPC', NDX: '^NDX', DJI: '^DJI', DAX: '^GDAXI', FTSE: '^FTSE',
  N225: '^N225', HSI: '^HSI', RUT: '^RUT', VIX: '^VIX', SX5E: '^STOXX50E',
  IBEX: '^IBEX', CAC: '^FCHI', XJO: '^AXJO', NIFTY: '^NSEI', IBOV: '^BVSP',
};
const COMMODITY_YF = {
  XAUUSD: 'GC=F', XAGUSD: 'SI=F', WTIUSD: 'CL=F', BRENTUSD: 'BZ=F',
  NATGAS: 'NG=F', COPPER: 'HG=F', PLATINUM: 'PL=F', PALLADIUM: 'PA=F',
};

const toYahooSymbol = (asset) => {
  if (!asset) return null;
  const s = asset.symbol;
  switch (asset.category) {
    case 'crypto':      return `${s}-USD`;              // BTC → BTC-USD
    case 'forex':       return `${s}=X`;                // EURUSD → EURUSD=X
    case 'commodities': return COMMODITY_YF[s] || s;
    case 'indices':     return INDEX_YF[s] || s;
    case 'futures':     return `${s}=F`;                // ES → ES=F
    default:            return s;                        // stocks as-is
  }
};

// The timeframe ladder comes from the backend (`/education/scan-timeframes`),
// which is the single source of truth for which (candle, history) pairs the
// data provider will actually serve — most combinations are refused upstream,
// and a refused pair used to reach the UI as "no structure detected".
// This copy is only a fallback for when that call fails; it must stay in sync
// with backend/timeframes.py.
const FALLBACK_LADDER = [
  { interval: '5m',  intraday: true,  ranges: ['1d', '5d', '1mo'], defaultRange: '5d' },
  { interval: '15m', intraday: true,  ranges: ['1d', '5d', '1mo'], defaultRange: '5d' },
  { interval: '30m', intraday: true,  ranges: ['5d', '1mo'], defaultRange: '1mo' },
  { interval: '1h',  intraday: true,  ranges: ['1mo', '3mo', '6mo', '1y', '2y'], defaultRange: '3mo' },
  // 4h no lo sirve el proveedor: el backend la compone juntando cuatro velas de 1h.
  { interval: '4h',  intraday: true,  ranges: ['3mo', '6mo', '1y', '2y'], defaultRange: '6mo' },
  { interval: '1d',  intraday: false, ranges: ['1mo', '3mo', '6mo', '1y', '2y', '5y', 'ytd', 'max'], defaultRange: '6mo' },
  { interval: '1wk', intraday: false, ranges: ['6mo', '1y', '2y', '5y', 'max'], defaultRange: '2y' },
  { interval: '1mo', intraday: false, ranges: ['1y', '2y', '5y', 'max'], defaultRange: '5y' },
];

const PERIOD_KEY = 'tcp_struct_period';          // persisted history window
const INTERVAL_KEY = 'tcp_struct_interval';      // persisted candle size

// Stable reason codes from the backend → translated labels. The backend never
// ships prose it would then have to translate 8 times.
const REASON_KEY = {
  multiTest: 'structWhyMultiTest', held: 'structWhyHeld', weak: 'structWhyWeak',
  recent: 'structWhyRecent', stale: 'structWhyStale', flip: 'structWhyFlip',
  inPlay: 'structWhyInPlay', untested: 'structWhyUntested',
  closedThrough: 'structWhyClosedThrough', followThrough: 'structWhyFollowThrough',
  expansion: 'structWhyExpansion', volume: 'structWhyVolume', retest: 'structWhyRetest',
  noData: 'structWhyNoData',
};

const ORIGIN_KEY = { highs: 'structOriginHighs', lows: 'structOriginLows', mixed: 'structOriginMixed' };

// En qué se fija el detector para cada patrón. Es lo primero que quiere saber
// quien compara el aviso con su gráfico.
const BASIS_KEY = { body: 'structBasisBody', wicks: 'structBasisWicks', both: 'structBasisBoth' };

const TREND_UI = {
  uptrend:   { color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10', border: 'border-[#22c55e]/30', Icon: TrendingUp,   key: 'structTrendUp' },
  downtrend: { color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/30', Icon: TrendingDown, key: 'structTrendDown' },
  range:     { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border',        Icon: Minus,        key: 'structTrendRange' },
};

const DIR_UI = {
  bullish: { color: 'text-[#22c55e]', icon: '↑' },
  bearish: { color: 'text-[#ef4444]', icon: '↓' },
};

const LEVEL_UI = {
  resistance: { color: 'text-[#ef4444]', key: 'structLvlResistance' },
  support:    { color: 'text-[#22c55e]', key: 'structLvlSupport' },
  pivot:      { color: 'text-[#f59e0b]', key: 'structLvlPivot' },
};

// ── Persistence helpers (localStorage; all guarded — private mode / quota safe) ──
const loadStored = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};
const store = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* no-op */ }
};

const signed = (n) => (n > 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`);

const relTime = (ts, t) => {
  const diff = Date.now() - ts;
  if (diff < 60 * 60 * 1000) return t('structLogJustNow');
  if (diff < DAY_MS) return t('structLogHoursAgo').replace('{h}', String(Math.floor(diff / (60 * 60 * 1000))));
  return t('structLogDaysAgo').replace('{d}', String(Math.floor(diff / DAY_MS)));
};

const StructureScanner = () => {
  const { t } = useTranslation();
  const { selectedAsset } = useAssetsStore();
  const asset = ALL_ASSETS[selectedAsset];
  const yahoo = toYahooSymbol(asset);

  const [ladder, setLadder] = useState(FALLBACK_LADDER);
  const [tfInterval, setTfInterval] = useState(() => loadStored(INTERVAL_KEY, '1d'));
  const [period, setPeriod] = useState(() => loadStored(PERIOD_KEY, '6mo'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [candles, setCandles] = useState([]);   // reversal/continuation candle signals
  const [log, setLog] = useState([]);            // persisted registro for current asset
  const reqId = useRef(0);

  const rung = ladder.find((r) => r.interval === tfInterval) || ladder.find((r) => r.interval === '1d') || ladder[0];
  const periods = rung?.ranges || [];
  // A stored window that this rung cannot serve would be silently rewritten by
  // the backend; pick the rung's default instead so the button row matches
  // what is actually being requested.
  const activePeriod = periods.includes(period) ? period : (rung?.defaultRange || period);

  // Real ladder from the backend (falls back to the local copy on failure).
  useEffect(() => {
    if (!API) return;
    let alive = true;
    fetch(`${API}/api/education/scan-timeframes`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (alive && Array.isArray(j?.timeframes) && j.timeframes.length) setLadder(j.timeframes);
      })
      .catch(() => { /* keep the local copy */ });
    return () => { alive = false; };
  }, []);

  const changeInterval = useCallback((iv, rows) => {
    setTfInterval(iv);
    store(INTERVAL_KEY, iv);
    const next = rows.find((r) => r.interval === iv);
    if (next && !next.ranges.includes(period)) {
      setPeriod(next.defaultRange);
      store(PERIOD_KEY, next.defaultRange);
    }
  }, [period]);

  const changePeriod = useCallback((p) => {
    setPeriod(p);
    store(PERIOD_KEY, p);
  }, []);

  // El registro anterior mezclaba temporalidades y no puede repararse: sus
  // entradas no guardaron en cuál se detectaron. Se descarta una sola vez.
  useEffect(() => { purgeLegacyLogs(); }, []);

  // Registro del activo EN ESTA TEMPORALIDAD: cambiar de vela cambia de lista.
  useEffect(() => { setLog(loadLogFor(yahoo, tfInterval)); }, [yahoo, tfInterval]);

  const scan = useCallback(async () => {
    if (!API || !yahoo) return;
    const myReq = ++reqId.current;
    setLoading(true);
    try {
      const sym = encodeURIComponent(yahoo);
      const tf = `period=${encodeURIComponent(activePeriod)}&interval=${encodeURIComponent(tfInterval)}`;
      const [structRes, patternRes] = await Promise.all([
        fetch(`${API}/api/education/structure-scan/${sym}?${tf}`, { credentials: 'include' }),
        fetch(`${API}/api/education/pattern-scan/${sym}?${tf}&limit=20`, { credentials: 'include' }),
      ]);
      const [structJson, patternJson] = await Promise.all([structRes.json(), patternRes.json()]);
      if (myReq !== reqId.current) return; // a newer request superseded this one

      if (structJson.error) {
        setData(null);
        setCandles([]);
        toast.error(t('structScanError'));
        return;
      }
      setData(structJson);

      // Candle signals that carry a directional message: reversal / continuation.
      const dets = Array.isArray(patternJson?.detections) ? patternJson.detections : [];
      const signals = dets.filter((d) => d.behavior === 'reversal' || d.behavior === 'continuation');
      setCandles(signals);

      // Build the registro: structure breaks + directional candle signals, deduped.
      // El id lleva la temporalidad: sin ella, el mismo patrón en 15m y en
      // diario compartía identificador y uno pisaba al otro.
      const evtItems = (structJson.events || []).map((e) => ({
        id: `e|${tfInterval}|${e.date}|${e.kind}|${e.direction}|${e.price}`,
        cat: 'event', kind: e.kind, dir: e.direction, price: e.price, date: e.date,
        tf: tfInterval,
      }));
      const candleItems = signals.map((d) => ({
        id: `c|${tfInterval}|${d.date}|${d.pattern_id}`,
        cat: 'candle', pid: d.pattern_id, ctype: d.type, behavior: d.behavior,
        dir: d.type === 'bullish' ? 'bullish' : d.type === 'bearish' ? 'bearish' : null,
        price: d.ohlc?.close, date: d.date,
        tf: d.interval || tfInterval,
        startDate: d.start_date, basis: d.basis, candles: d.candle_count,
      }));
      setLog(mergeLogFor(yahoo, tfInterval, [...evtItems, ...candleItems]));
    } catch (e) {
      if (myReq !== reqId.current) return;
      if (process.env.NODE_ENV !== 'production') console.error('[StructureScanner]', e);
      setData(null);
      setCandles([]);
      toast.error(t('structScanError'));
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [yahoo, activePeriod, tfInterval, t]);

  // Auto-scan whenever the chart's asset, candle size or window changes.
  useEffect(() => { scan(); }, [scan]);

  const onClearLog = () => {
    clearLogFor(yahoo, tfInterval);
    setLog([]);
  };

  const patternName = (id) => (PATTERN_NAME_KEY[id] ? t(PATTERN_NAME_KEY[id]) : id);
  const behaviorLabel = (b) => (BEHAVIOR_KEY[b] ? t(BEHAVIOR_KEY[b]) : b);

  const trend = (data && TREND_UI[data.trend]) || TREND_UI.range;
  const TrendIcon = trend.Icon;
  const events = data?.events ? [...data.events].reverse().slice(0, 8) : [];
  const allLevels = data?.levels || [];
  // The whole point of the rewrite: the side of the CURRENT price decides the
  // role. Above → resistance, below → support. Rendered as a price ladder so
  // it reads the way a chart does, farthest resistance at the top.
  const resistances = allLevels.filter((l) => l.type === 'resistance')
    .sort((a, b) => b.price - a.price).slice(-4);
  const supports = allLevels.filter((l) => l.type === 'support')
    .sort((a, b) => b.price - a.price).slice(0, 4);
  const nearestRes = data?.nearestResistance?.price;
  const nearestSup = data?.nearestSupport?.price;
  const fvgs = data?.fvgs ? data.fvgs.slice(0, 6) : [];
  const c = data?.counts || {};
  const candleSignals = candles.slice(0, 6);
  const newInDay = log.filter((e) => Date.now() - e.ts < DAY_MS).length;
  const adjusted = Array.isArray(data?.adjustments) && data.adjustments.length > 0;

  const reasonList = (codes) => (codes || [])
    .map((code) => (REASON_KEY[code] ? t(REASON_KEY[code]) : code))
    .join(' · ');

  // One level row of the price ladder, with its evidence attached.
  const LevelRow = ({ lv, nearest }) => {
    const ui = LEVEL_UI[lv.type] || LEVEL_UI.pivot;
    const conf = lv.confirmation || {};
    return (
      <div
        className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
          nearest ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/40'
        }`}
        data-testid={`struct-level-${lv.type}`}
      >
        <span className={`font-semibold ${ui.color}`}>{t(ui.key)}</span>
        <span className="font-mono text-foreground">{lv.price}</span>
        {typeof lv.distancePct === 'number' && (
          <span className={`font-mono text-[10px] ${ui.color}`}>{signed(lv.distancePct)}</span>
        )}
        {nearest && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
            {t('structNearestTag')}
          </span>
        )}
        {lv.flipped && (
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[#f59e0b]"
            title={t('structFlippedTip').replace('{origin}', t(ORIGIN_KEY[lv.origin] || 'structOriginMixed'))}
          >
            {t('structFlippedTag')}
          </span>
        )}
        <span
          className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
          style={undefined}
          title={t('structConfTip')
            .replace('{visits}', String(conf.visits ?? 0))
            .replace('{held}', String(conf.held ?? 0))
            .replace('{broken}', String(conf.broken ?? 0))
            .replace('{score}', String(conf.score ?? 0))
            + (conf.reasons?.length ? ` — ${reasonList(conf.reasons)}` : '')}
        >
          <span className={conf.confirmed ? 'text-[#22c55e]' : 'text-muted-foreground'}>
            {conf.confirmed ? `✓ ${t('structConfirmedTag')}` : t('structUnconfirmedTag')}
          </span>
        </span>
        <span className="flex gap-0.5 shrink-0" title={`${lv.strength}/5`}>
          {Array.from({ length: 5 }).map((_, k) => (
            <span
              key={k}
              className={`inline-block w-1.5 h-1.5 rounded-full ${k < lv.strength ? ui.color.replace('text-', 'bg-') : 'bg-border'}`}
            />
          ))}
        </span>
      </div>
    );
  };

  return (
    <Card
      className="bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/30"
      data-testid="structure-scanner"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
              <Activity className="w-5 h-5 text-primary" />
              {t('structScanTitle')}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {t('structScanIntro')}
            </p>
          </div>
          {asset && (
            <div className="text-right shrink-0">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {t('structScanReading')}
              </div>
              <div className="text-sm font-bold font-mono text-primary">{asset.symbol}</div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{asset.name}</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls: candle size + history window + rescan.
            The two rows are dependent: the windows offered are only those the
            selected candle size can actually serve upstream. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {t('structTfCandle')}
            </span>
            <div className="flex gap-1 bg-muted rounded-md border border-border p-0.5 flex-wrap" role="group">
              {ladder.map((r) => (
                <button
                  key={r.interval}
                  onClick={() => changeInterval(r.interval, ladder)}
                  className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                    tfInterval === r.interval ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`struct-interval-${r.interval}`}
                >
                  {r.interval}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {t('structTfHistory')}
            </span>
            <div className="flex gap-1 bg-muted rounded-md border border-border p-0.5 flex-wrap" role="group">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => changePeriod(p)}
                  className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                    activePeriod === p ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`struct-period-${p}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={scan}
            disabled={loading || !yahoo}
            size="sm"
            variant="outline"
            className="ml-auto"
            data-testid="struct-rescan-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('livePatternScanning') : t('structScanRescan')}
          </Button>
        </div>

        {/* Honest notices: the backend rewrote the request, or the last candle
            of an intraday series has not closed yet. Both change what the
            numbers below mean, so neither may be hidden. */}
        {adjusted && (
          <div className="text-[11px] rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] px-2.5 py-1.5"
               data-testid="struct-adjusted">
            {t('structAdjustedNotice')
              .replace('{interval}', data.interval || '')
              .replace('{period}', data.period || '')}
          </div>
        )}
        {data?.lastBarForming && (
          <div className="text-[11px] rounded-md border border-border bg-muted/50 text-muted-foreground px-2.5 py-1.5"
               data-testid="struct-forming">
            {t('structLastBarForming')}
          </div>
        )}

        {/* Trend banner */}
        {data && (
          <div
            className={`flex items-center gap-3 rounded-lg border ${trend.border} ${trend.bg} px-4 py-3`}
            data-testid="struct-trend"
          >
            <TrendIcon className={`w-6 h-6 ${trend.color} shrink-0`} />
            <div className="min-w-0">
              <div className={`text-base font-bold ${trend.color}`}>{t(trend.key)}</div>
              <div className="text-[11px] text-muted-foreground leading-snug">{t(`${trend.key}Desc`)}</div>
            </div>
          </div>
        )}

        {/* Stats line */}
        {data && (
          <div className="text-xs text-muted-foreground font-mono space-y-0.5" data-testid="struct-stats">
            <div>
              {t('structScanStats')
                .replace('{rows}', String(data.rowsScanned ?? 0))
                .replace('{swings}', String(c.swings ?? 0))
                .replace('{bos}', String(c.bos ?? 0))
                .replace('{choch}', String(c.choch ?? 0))}
            </div>
            <div className="text-[10px]">
              {t('structLevelsStats')
                .replace('{levels}', String(c.levels ?? 0))
                .replace('{res}', String(c.resistances ?? 0))
                .replace('{sup}', String(c.supports ?? 0))
                .replace('{conf}', String(c.confirmedLevels ?? 0))}
            </div>
            {data.atr != null && (
              <div className="text-[10px]">
                {t('structAtrLine')
                  .replace('{atr}', String(data.atr))
                  .replace('{atrPct}', String(data.atrPct ?? '—'))
                  .replace('{tol}', String(data.tolerancePct ?? '—'))}
              </div>
            )}
          </div>
        )}

        {/* Candlestick signals: reversal / continuation on the recent bars */}
        {candleSignals.length > 0 && (
          <section data-testid="struct-candles">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <CandlestickChart className="w-3.5 h-3.5 text-primary" />
              {t('structCandlesTitle')}
            </h4>
            <div className="space-y-1.5">
              {candleSignals.map((d, i) => {
                const badge = TYPE_BADGE[d.type] || TYPE_BADGE.neutral;
                return (
                  <div
                    key={`${d.date}-${d.pattern_id}-${i}`}
                    className={`flex items-center gap-2.5 rounded-md border ${badge.border} ${badge.bg} px-2.5 py-1.5`}
                    data-testid={`struct-candle-${i}`}
                  >
                    <div className="flex-shrink-0 transform scale-[0.5] origin-left -mr-7 -my-2">
                      <CandlePatternFigure patternId={d.pattern_id} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold truncate">{patternName(d.pattern_id)}</span>
                        {/* La temporalidad, siempre a la vista: es lo que faltaba
                            para poder contrastar el aviso con el gráfico. */}
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                          {d.interval || tfInterval}
                        </span>
                        <span className={`text-[10px] font-mono uppercase ${badge.color}`}>{badge.icon} {d.type}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted border border-border">
                          {behaviorLabel(d.behavior)}
                        </span>
                        {d.basis && BASIS_KEY[d.basis] && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground"
                            title={d.metrics
                              ? t('structBasisTip')
                                  .replace('{body}', String(d.metrics.bodyPct))
                                  .replace('{up}', String(d.metrics.upperWickPct))
                                  .replace('{down}', String(d.metrics.lowerWickPct))
                              : undefined}
                          >
                            {t(BASIS_KEY[d.basis])}
                          </span>
                        )}
                        {typeof d.rate === 'number' && (
                          <span className={`text-[10px] font-mono font-bold ${rateColor(d.rate)}`}>{d.rate}%</span>
                        )}
                      </div>
                    </div>
                    {/* Un patrón de 3 velas ocupa 3 barras: sin la fecha de
                        apertura había que contar velas hacia atrás a mano. */}
                    <span className="font-mono text-muted-foreground/70 text-[10px] ml-auto shrink-0 text-right leading-tight">
                      {d.start_date && d.start_date !== d.date && (
                        <>{t('structPatternOpens')} {d.start_date}<br /></>
                      )}
                      {t('structPatternConfirms')} {d.confirm_date || d.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Structure events: BOS / CHoCH */}
        {events.length > 0 && (
          <section data-testid="struct-events">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              {t('structEventsTitle')}
            </h4>
            <div className="space-y-1.5">
              {events.map((e, i) => {
                const dir = DIR_UI[e.direction] || DIR_UI.bullish;
                const isChoch = e.kind === 'CHoCH';
                const conf = e.confirmation || {};
                return (
                  <div
                    key={`${e.date}-${e.index}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className={`font-semibold ${isChoch ? 'text-[#f59e0b]' : 'text-primary'}`}>
                      {t(isChoch ? 'structChoch' : 'structBos')}
                    </span>
                    <span className={`font-mono ${dir.color}`}>{dir.icon} {t(`structDir_${e.direction}`)}</span>
                    {/* A close one tick past a swing high is not a break of
                        structure. The badge says whether the evidence is there,
                        and the tooltip says exactly which evidence. */}
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        conf.confirmed ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-muted text-muted-foreground'
                      }`}
                      title={`${t('structEvidence')}: ${conf.score ?? 0}/100${conf.reasons?.length ? ` — ${reasonList(conf.reasons)}` : ''}`}
                    >
                      {conf.confirmed ? `✓ ${t('structConfirmedTag')}` : t('structUnconfirmedTag')}
                    </span>
                    <span className="font-mono text-muted-foreground ml-auto">{e.price}</span>
                    <span className="font-mono text-muted-foreground/70 text-[10px]">{e.date}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Support / Resistance as a PRICE LADDER.
            Everything above the current price is resistance, everything below
            it is support — regardless of whether the level was originally
            built by highs or by lows. A level that changed hands carries the
            `polarity` badge instead of being quietly mislabelled. */}
        {data && allLevels.length > 0 && (
          <section data-testid="struct-levels">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <Layers className="w-3.5 h-3.5 text-primary" />
              {t('structLevelsTitle')}
            </h4>

            <div className="text-[10px] uppercase tracking-wider text-[#ef4444] font-semibold mb-1">
              {t('structAboveIsResistance')}
            </div>
            <div className="space-y-1.5">
              {resistances.length > 0
                ? resistances.map((lv, i) => (
                    <LevelRow key={`r-${lv.price}-${i}`} lv={lv} nearest={lv.price === nearestRes} />
                  ))
                : <div className="text-[11px] text-muted-foreground px-1 pb-1">{t('structNoneAbove')}</div>}
            </div>

            {/* The whole support/resistance split hangs off this one number, so
                it has to say WHICH price it is. Labelling the last bar's close
                "price now" was wrong on any closed session and on every
                weekend, and a level between the close and the live quote flips
                role depending on which one is used. */}
            <div
              className="my-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5"
              data-testid="struct-price-now"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                  {data.referenceSource === 'live' ? t('structPriceLive') : t('structPriceLastClose')}
                </span>
                <span className="font-mono font-bold text-primary">
                  {data.referencePrice ?? data.currentPrice}
                </span>
                {data.referenceSource !== 'live' && data.referenceDate && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    · {data.referenceDate}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug mt-1">
                {data.referenceSource === 'live'
                  ? t('structRefLiveHint')
                  : t('structRefCloseHint')}
              </p>
              {/* Only worth showing when a level actually sits in the gap. */}
              {data.referenceSource === 'live' && data.levelsBetweenLiveAndClose > 0 && (
                <p className="text-[10px] leading-snug mt-1 text-[#fbbf24]"
                   data-testid="struct-ref-divergence">
                  {t('structRefDivergence')
                    .replace('{n}', String(data.levelsBetweenLiveAndClose))
                    .replace('{close}', String(data.lastClose))
                    .replace('{pct}', String(data.liveVsCloseDivergencePct))}
                </p>
              )}
            </div>

            <div className="text-[10px] uppercase tracking-wider text-[#22c55e] font-semibold mb-1">
              {t('structBelowIsSupport')}
            </div>
            <div className="space-y-1.5">
              {supports.length > 0
                ? supports.map((lv, i) => (
                    <LevelRow key={`s-${lv.price}-${i}`} lv={lv} nearest={lv.price === nearestSup} />
                  ))
                : <div className="text-[11px] text-muted-foreground px-1">{t('structNoneBelow')}</div>}
            </div>
          </section>
        )}

        {/* Fair Value Gaps */}
        {fvgs.length > 0 && (
          <section data-testid="struct-fvgs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <Waves className="w-3.5 h-3.5 text-primary" />
              {t('structFvgTitle')}
            </h4>
            <div className="space-y-1.5">
              {fvgs.map((g, i) => {
                const dir = DIR_UI[g.direction] || DIR_UI.bullish;
                return (
                  <div
                    key={`${g.date}-${g.index}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className={`font-mono ${dir.color}`}>{dir.icon} {t(`structDir_${g.direction}`)}</span>
                    <span className="font-mono text-foreground">{g.bottom} – {g.top}</span>
                    <span
                      className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        g.filled ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {t(g.filled ? 'structFvgFilled' : 'structFvgOpen')}
                    </span>
                    <span className="font-mono text-muted-foreground/70 text-[10px]">{g.date}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Persistent registro: what the scanner has recorded (survives reloads) */}
        {log.length > 0 && (
          <section data-testid="struct-log">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <History className="w-3.5 h-3.5 text-primary" />
                {t('structLogTitle')}
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                  {tfInterval}
                </span>
                {newInDay > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                    {t('structLogNew').replace('{n}', String(newInDay))}
                  </span>
                )}
              </h4>
              <button
                onClick={onClearLog}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#ef4444] transition-colors"
                data-testid="struct-log-clear"
              >
                <Trash2 className="w-3 h-3" />
                {t('structLogClear')}
              </button>
            </div>
            <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
              {log.map((e) => {
                const dir = DIR_UI[e.dir];
                const isNew = Date.now() - e.ts < DAY_MS;
                const label = e.cat === 'candle'
                  ? patternName(e.pid)
                  : t(e.kind === 'CHoCH' ? 'structChoch' : 'structBos');
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                      isNew ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'
                    }`}
                  >
                    {isNew && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title={t('structLogNew').replace('{n}', '')} />
                    )}
                    <span className="font-semibold truncate max-w-[130px]">{label}</span>
                    {e.tf && (
                      <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-primary/15 text-primary shrink-0">
                        {e.tf}
                      </span>
                    )}
                    {e.cat === 'candle' && e.behavior && (
                      <span className="text-[9px] text-muted-foreground uppercase">{behaviorLabel(e.behavior)}</span>
                    )}
                    {dir && <span className={`font-mono ${dir.color}`}>{dir.icon}</span>}
                    {e.price != null && <span className="font-mono text-muted-foreground">{e.price}</span>}
                    <span className="font-mono text-muted-foreground/70 text-[10px] ml-auto shrink-0">{e.date}</span>
                    <span className="text-[9px] text-muted-foreground/60 shrink-0 hidden sm:inline">· {relTime(e.ts, t)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed pt-1.5">
              {t('structLogNote')}
            </p>
          </section>
        )}

        {/* Empty state */}
        {data && data.rowsScanned === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground" data-testid="struct-empty">
            {t('structScanEmpty')}
          </div>
        )}

        {/* Nothing detected but data was scanned */}
        {data && data.rowsScanned > 0 && events.length === 0 && allLevels.length === 0 && fvgs.length === 0 && candleSignals.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('structScanNoStructure')}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/70 leading-relaxed pt-1">
          {t('structScanNote')}
        </p>
      </CardContent>
    </Card>
  );
};

export default StructureScanner;
