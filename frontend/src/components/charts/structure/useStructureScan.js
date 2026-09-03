import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { loadLogFor, mergeLogFor, clearLogFor, purgeLegacyLogs } from '@/lib/structureLog';
import { useAssetsStore } from '@/lib/assets';
import { FALLBACK_LADDER, INTERVAL_KEY, PERIOD_KEY, intervalMinutes, loadStored, rungForChart, store } from './scannerMeta';

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

  /* La temporalidad del GRÁFICO manda. Antes el escáner guardaba la suya y la
     persistía aparte, así que ponías el gráfico en 4H y seguía informando del
     diario: tendencia, niveles y distancias describían otro gráfico. Se puede
     desviar a mano (a veces quieres mirar el escalón de arriba), pero eso
     queda a la vista y el gráfico vuelve a mandar en cuanto lo mueves. */
  const { chartInterval } = useAssetsStore();
  const chartRung = rungForChart(chartInterval);

  const [ladder, setLadder] = useState(FALLBACK_LADDER);
  const [tfInterval, setTfInterval] = useState(() => chartRung || loadStored(INTERVAL_KEY, '1d'));
  const [period, setPeriod] = useState(() => loadStored(PERIOD_KEY, '6mo'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [candles, setCandles] = useState([]);    // reversal/continuation candle signals
  const [log, setLog] = useState([]);            // persisted registro for current asset
  // Cuándo se trajeron estos datos. Sin esto la pantalla no puede decir de
  // cuándo es lo que enseña, y una lectura vieja es indistinguible de una recién
  // hecha — que es justo lo que hacía que el panel pareciera colgado.
  const [lastScanAt, setLastScanAt] = useState(null);
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

  /* El gráfico manda: al moverlo, el escáner le sigue. Si el gráfico está en
     una vela que ninguna fuente gratuita sirve con histórico (1m), NO se
     cambia nada y se avisa — escanear otra vela en silencio es el fallo que
     esto viene a cerrar. */
  useEffect(() => {
    if (!chartRung || chartRung === tfInterval) return;
    setTfInterval(chartRung);
    store(INTERVAL_KEY, chartRung);
    const next = ladder.find((r) => r.interval === chartRung);
    if (next && !next.ranges.includes(period)) {
      setPeriod(next.defaultRange);
      store(PERIOD_KEY, next.defaultRange);
    }
    // `period` se lee para decidir si sigue siendo legal, pero no debe
    // reactivar este efecto: sólo el movimiento del gráfico lo dispara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartRung, ladder]);

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

      // `res.ok` primero: el limitador (30/min) responde 429 con `{detail: ...}`,


      // que no tiene clave `error`. Sin esto, un rechazo por exceso de


      // peticiones se guardaba como lectura buena y se sellaba «leído ahora


      // mismo» — el escáner enseñando datos viejos con cara de frescos, que es


      // el fallo que el aviso de antigüedad venía a resolver.


      if (!structRes.ok) {


        throw new Error(structJson.detail || structJson.error || `HTTP ${structRes.status}`);


      }


      if (structJson.error) {
        setData(null);
        setCandles([]);
        toast.error(t('structScanError'));
        return;
      }
      setData(structJson);
      setLastScanAt(Date.now());

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

  /**
   * Y además, refrescar solo. Hasta ahora el escáner sólo volvía a pedir datos
   * si cambiabas de activo, de vela o de ventana: abierto y quieto, la lectura
   * se quedaba congelada en el momento en que se abrió, con un precio que podía
   * tener horas. Parecía colgado porque, de hecho, lo estaba.
   *
   * Dos disparadores, los dos baratos:
   *  · **Volver a la pestaña.** Es cuando el usuario mira, y es el momento en
   *    que un dato viejo molesta.
   *  · **Un temporizador atado al tamaño de la vela.** Refrescar un gráfico
   *    diario cada treinta segundos no aporta nada y castiga al proveedor: lo
   *    que puede cambiar es como mucho una vela, así que se refresca a un
   *    tercio de su duración, con un suelo de un minuto y un techo de quince.
   *
   * Nunca mientras la pestaña está oculta: un escáner en una pestaña de fondo
   * no lo mira nadie y sí gasta cuota.
   */
  //
  // El suelo bajó de 60 s a 20 s el 2026-09-03. No es que antes sobrara
  // prudencia: cada escaneo se bajaba de Yahoo la serie ENTERA, así que el
  // suelo protegía al PROVEEDOR, no al navegador. Desde que `stock_data`
  // comparte la descarga con un TTL atado a la vela, N usuarios sobre el mismo
  // símbolo y escalón son UNA llamada aguas arriba, y pedir más a menudo ya no
  // le cuesta a nadie. El techo de 15 min se queda: un gráfico mensual no
  // mejora por preguntar más.
  const refreshMs = Math.min(
    15 * 60 * 1000,
    Math.max(20 * 1000, ((intervalMinutes(tfInterval) || 1440) * 60 * 1000) / 3),
  );

  useEffect(() => {
    if (!API || !symbol) return undefined;
    const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const tick = () => { if (!hidden()) scan(); };
    const onVisible = () => { if (!hidden()) scan(); };

    const id = setInterval(tick, refreshMs);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [scan, refreshMs, symbol]);

  const clearLog = useCallback(() => {
    clearLogFor(symbol, tfInterval);
    setLog([]);
  }, [symbol, tfInterval]);

  /**
   * Mide la probabilidad histórica del montaje actual.
   *
   * No entra en `scan()` a propósito: recorre el histórico barra a barra
   * redetectando niveles y encima lo repite sobre series barajadas, así que
   * tarda segundos. Colgarlo del escaneo automático haría el escáner inusable
   * y además mediría lo mismo una y otra vez sin que nadie lo pidiera.
   */
  const measureOdds = useCallback(async ({ symbol: sym, interval, period }) => {
    if (!API) return { error: 'no_backend' };
    const q = new URLSearchParams({ interval, period, horizon: '10', shuffles: '12' });
    const r = await fetch(`${API}/api/education/level-odds/${sym}?${q}`, { credentials: 'include' });
    if (!r.ok) return { error: `http_${r.status}` };
    return r.json();
  }, []);

  return {
    ladder, rung, periods, tfInterval, activePeriod, measureOdds,
    loading, data, candles, log, lastScanAt, refreshMs,
    scan, changeInterval, changePeriod, clearLog,
    // Correspondencia con el gráfico, para que la pantalla pueda decirla:
    // `chartRung` null = el gráfico está en una vela que no se puede escanear.
    chartInterval, chartRung, syncedToChart: !!chartRung && chartRung === tfInterval,
  };
}
