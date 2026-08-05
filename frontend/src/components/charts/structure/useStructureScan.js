import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { loadLogFor, mergeLogFor, clearLogFor, purgeLegacyLogs } from '@/lib/structureLog';
import { FALLBACK_LADDER, INTERVAL_KEY, PERIOD_KEY, loadStored, store } from './scannerMeta';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Everything the scanner DOES: the timeframe ladder, the two scans, the
 * persistent log and the settings that survive a reload.
 *
 * It lives apart from the panels because it is the half that can be reasoned
 * about on its own — request supersession, the ladder falling back, a stored
 * window the selected candle cannot serve — and none of that has anything to
 * do with how a level is drawn.
 */
export default function useStructureScan(symbol) {
  const { t } = useTranslation();

  const [ladder, setLadder] = useState(FALLBACK_LADDER);
  const [tfInterval, setTfInterval] = useState(() => loadStored(INTERVAL_KEY, '1d'));
  const [period, setPeriod] = useState(() => loadStored(PERIOD_KEY, '6mo'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [candles, setCandles] = useState([]);    // reversal/continuation candle signals
  const [log, setLog] = useState([]);            // persisted registro for current asset
  const reqId = useRef(0);

  const rung = ladder.find((r) => r.interval === tfInterval)
    || ladder.find((r) => r.interval === '1d')
    || ladder[0];
  const periods = rung?.ranges || [];
  // A stored window that this rung cannot serve would be silently rewritten by
  // the backend; pick the rung's default instead so the button row matches
  // what is actually being requested.
  const activePeriod = periods.includes(period) ? period : (rung?.defaultRange || period);

  // Real ladder from the backend (falls back to the local copy on failure).
  useEffect(() => {
    if (!API) return undefined;
    let alive = true;
    fetch(`${API}/api/education/scan-timeframes`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (alive && Array.isArray(j?.timeframes) && j.timeframes.length) setLadder(j.timeframes);
      })
      .catch(() => { /* keep the local copy */ });
    return () => { alive = false; };
  }, []);

  // El registro anterior mezclaba temporalidades y no puede repararse: sus
  // entradas no guardaron en cuál se detectaron. Se descarta una sola vez.
  useEffect(() => { purgeLegacyLogs(); }, []);

  // Registro del activo EN ESTA TEMPORALIDAD: cambiar de vela cambia de lista.
  useEffect(() => { setLog(loadLogFor(symbol, tfInterval)); }, [symbol, tfInterval]);

  const changeInterval = useCallback((iv) => {
    setTfInterval(iv);
    store(INTERVAL_KEY, iv);
    const next = ladder.find((r) => r.interval === iv);
    if (next && !next.ranges.includes(period)) {
      setPeriod(next.defaultRange);
      store(PERIOD_KEY, next.defaultRange);
    }
  }, [ladder, period]);

  const changePeriod = useCallback((p) => {
    setPeriod(p);
    store(PERIOD_KEY, p);
  }, []);

  const scan = useCallback(async () => {
    if (!API || !symbol) return;
    const myReq = ++reqId.current;
    setLoading(true);
    try {
      const sym = encodeURIComponent(symbol);
      const tf = `period=${encodeURIComponent(activePeriod)}&interval=${encodeURIComponent(tfInterval)}`;
      const [structRes, patternRes] = await Promise.all([
        fetch(`${API}/api/education/structure-scan/${sym}?${tf}`, { credentials: 'include' }),
        fetch(`${API}/api/education/pattern-scan/${sym}?${tf}&limit=20`, { credentials: 'include' }),
      ]);
      const [structJson, patternJson] = await Promise.all([structRes.json(), patternRes.json()]);
      if (myReq !== reqId.current) return;   // a newer request superseded this one

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
      setLog(mergeLogFor(symbol, tfInterval, [...evtItems, ...candleItems]));
    } catch (e) {
      if (myReq !== reqId.current) return;
      if (process.env.NODE_ENV !== 'production') console.error('[StructureScanner]', e);
      setData(null);
      setCandles([]);
      toast.error(t('structScanError'));
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [symbol, activePeriod, tfInterval, t]);

  // Auto-scan whenever the chart's asset, candle size or window changes.
  useEffect(() => { scan(); }, [scan]);

  const clearLog = useCallback(() => {
    clearLogFor(symbol, tfInterval);
    setLog([]);
  }, [symbol, tfInterval]);

  return {
    ladder, rung, periods, tfInterval, activePeriod,
    loading, data, candles, log,
    scan, changeInterval, changePeriod, clearLog,
  };
}
