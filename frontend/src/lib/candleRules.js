/**
 * Espejo en JavaScript de los umbrales del detector de velas.
 *
 * ⚠️ FUENTE DE VERDAD: `backend/candle_patterns.py`. Esto es una COPIA para
 * poder clasificar en el navegador sin ida y vuelta al servidor (el laboratorio
 * de velas recalcula en cada arrastre del ratón; una llamada por frame sería
 * absurda). Duplicar umbrales es deuda: si divergen, la web enseñaría una regla
 * y el escáner aplicaría otra, que es peor que no enseñar nada.
 *
 * Por eso hay un test en el backend —`test_js_thresholds_match_python`— que lee
 * ESTE fichero y compara número a número con los de Python. Si alguien toca uno
 * de los dos lados, CI lo para.
 */

export const T = {
  DOJI_MAX_BODY: 0.07,
  DOJI_FLAT_WICK: 0.05,
  DRAGONFLY_MIN_LOWER: 0.6,
  GRAVESTONE_MIN_UPPER: 0.6,
  LONGLEG_MIN_WICK: 0.35,
  HAMMER_MIN_LOWER_X_BODY: 1.8,
  HAMMER_MAX_UPPER_X_BODY: 0.4,
  HAMMER_MIN_BODY: 0.05,
  MARUBOZU_MIN_BODY: 0.85,
  MARUBOZU_MAX_WICK: 0.05,
  SPINNING_MIN_BODY: 0.10,
  SPINNING_MAX_BODY: 0.35,
  HIGHWAVE_MAX_BODY: 0.25,
  HIGHWAVE_MIN_WICK: 0.30,
  SOLDIER_MIN_BODY: 0.55,
  SOLDIER_MAX_WICK: 0.25,
};

/** Mismas medidas que `_candle_metrics` en Python. */
export function metrics({ open, high, low, close }) {
  const body = Math.abs(close - open);
  const range = Math.max(high - low, 1e-9);
  return {
    body,
    range,
    upper: high - Math.max(open, close),
    lower: Math.min(open, close) - low,
    bodyPct: body / range,
    isBull: close > open,
  };
}

/**
 * Clasifica UNA vela y devuelve, para cada patrón candidato, si se cumple y
 * qué condición concreta ha fallado. Enseñar el "no" es tan útil como el "sí":
 * ver que a un martillo le falta un 3 % de mecha explica el patrón mucho mejor
 * que una definición.
 */
export function classify(candle) {
  const m = metrics(candle);
  const pct = (x) => x / m.range;
  const out = [];

  const add = (id, basis, checks) => {
    const failed = checks.filter((c) => !c.ok);
    out.push({ id, basis, ok: failed.length === 0, checks, failed });
  };

  add('doji', 'body', [
    { label: 'bodyMax', ok: m.bodyPct <= T.DOJI_MAX_BODY, got: m.bodyPct, want: T.DOJI_MAX_BODY, cmp: '<=' },
  ]);
  add('dragonfly-doji', 'both', [
    { label: 'bodyMax', ok: m.bodyPct <= T.DOJI_MAX_BODY, got: m.bodyPct, want: T.DOJI_MAX_BODY, cmp: '<=' },
    { label: 'upperMax', ok: pct(m.upper) <= T.DOJI_FLAT_WICK, got: pct(m.upper), want: T.DOJI_FLAT_WICK, cmp: '<=' },
    { label: 'lowerMin', ok: pct(m.lower) >= T.DRAGONFLY_MIN_LOWER, got: pct(m.lower), want: T.DRAGONFLY_MIN_LOWER, cmp: '>=' },
  ]);
  add('gravestone-doji', 'both', [
    { label: 'bodyMax', ok: m.bodyPct <= T.DOJI_MAX_BODY, got: m.bodyPct, want: T.DOJI_MAX_BODY, cmp: '<=' },
    { label: 'lowerMax', ok: pct(m.lower) <= T.DOJI_FLAT_WICK, got: pct(m.lower), want: T.DOJI_FLAT_WICK, cmp: '<=' },
    { label: 'upperMin', ok: pct(m.upper) >= T.GRAVESTONE_MIN_UPPER, got: pct(m.upper), want: T.GRAVESTONE_MIN_UPPER, cmp: '>=' },
  ]);
  add('long-legged-doji', 'both', [
    { label: 'bodyMax', ok: m.bodyPct <= T.DOJI_MAX_BODY, got: m.bodyPct, want: T.DOJI_MAX_BODY, cmp: '<=' },
    { label: 'upperMin', ok: pct(m.upper) >= T.LONGLEG_MIN_WICK, got: pct(m.upper), want: T.LONGLEG_MIN_WICK, cmp: '>=' },
    { label: 'lowerMin', ok: pct(m.lower) >= T.LONGLEG_MIN_WICK, got: pct(m.lower), want: T.LONGLEG_MIN_WICK, cmp: '>=' },
  ]);
  add('hammer', 'wicks', [
    { label: 'lowerVsBody', ok: m.body > 0 && m.lower >= T.HAMMER_MIN_LOWER_X_BODY * m.body,
      got: m.body > 0 ? m.lower / m.body : 0, want: T.HAMMER_MIN_LOWER_X_BODY, cmp: '>=', unit: 'x' },
    { label: 'upperVsBody', ok: m.body > 0 && m.upper <= T.HAMMER_MAX_UPPER_X_BODY * m.body,
      got: m.body > 0 ? m.upper / m.body : 99, want: T.HAMMER_MAX_UPPER_X_BODY, cmp: '<=', unit: 'x' },
    { label: 'bodyMin', ok: m.bodyPct >= T.HAMMER_MIN_BODY, got: m.bodyPct, want: T.HAMMER_MIN_BODY, cmp: '>=' },
  ]);
  add('shooting-star', 'wicks', [
    { label: 'upperVsBody', ok: m.body > 0 && m.upper >= T.HAMMER_MIN_LOWER_X_BODY * m.body,
      got: m.body > 0 ? m.upper / m.body : 0, want: T.HAMMER_MIN_LOWER_X_BODY, cmp: '>=', unit: 'x' },
    { label: 'lowerVsBody', ok: m.body > 0 && m.lower <= T.HAMMER_MAX_UPPER_X_BODY * m.body,
      got: m.body > 0 ? m.lower / m.body : 99, want: T.HAMMER_MAX_UPPER_X_BODY, cmp: '<=', unit: 'x' },
    { label: 'bodyMin', ok: m.bodyPct >= T.HAMMER_MIN_BODY, got: m.bodyPct, want: T.HAMMER_MIN_BODY, cmp: '>=' },
  ]);
  add('marubozu', 'both', [
    { label: 'bodyMin', ok: m.bodyPct >= T.MARUBOZU_MIN_BODY, got: m.bodyPct, want: T.MARUBOZU_MIN_BODY, cmp: '>=' },
    { label: 'upperMax', ok: pct(m.upper) <= T.MARUBOZU_MAX_WICK, got: pct(m.upper), want: T.MARUBOZU_MAX_WICK, cmp: '<=' },
    { label: 'lowerMax', ok: pct(m.lower) <= T.MARUBOZU_MAX_WICK, got: pct(m.lower), want: T.MARUBOZU_MAX_WICK, cmp: '<=' },
  ]);
  add('spinning-top', 'both', [
    { label: 'bodyRange', ok: m.bodyPct > T.SPINNING_MIN_BODY && m.bodyPct < T.SPINNING_MAX_BODY,
      got: m.bodyPct, want: T.SPINNING_MAX_BODY, cmp: '<' },
    { label: 'upperOverBody', ok: m.upper > m.body, got: pct(m.upper), want: m.bodyPct, cmp: '>' },
    { label: 'lowerOverBody', ok: m.lower > m.body, got: pct(m.lower), want: m.bodyPct, cmp: '>' },
  ]);
  add('high-wave', 'both', [
    { label: 'bodyRange', ok: m.bodyPct > T.DOJI_MAX_BODY && m.bodyPct <= T.HIGHWAVE_MAX_BODY,
      got: m.bodyPct, want: T.HIGHWAVE_MAX_BODY, cmp: '<=' },
    { label: 'upperMin', ok: pct(m.upper) >= T.HIGHWAVE_MIN_WICK, got: pct(m.upper), want: T.HIGHWAVE_MIN_WICK, cmp: '>=' },
    { label: 'lowerMin', ok: pct(m.lower) >= T.HIGHWAVE_MIN_WICK, got: pct(m.lower), want: T.HIGHWAVE_MIN_WICK, cmp: '>=' },
  ]);
  add('soldier', 'both', [
    { label: 'bodyMin', ok: m.bodyPct >= T.SOLDIER_MIN_BODY, got: m.bodyPct, want: T.SOLDIER_MIN_BODY, cmp: '>=' },
    { label: 'runWickMax', ok: pct(m.isBull ? m.upper : m.lower) <= T.SOLDIER_MAX_WICK,
      got: pct(m.isBull ? m.upper : m.lower), want: T.SOLDIER_MAX_WICK, cmp: '<=' },
  ]);

  return { metrics: m, results: out, matched: out.filter((r) => r.ok) };
}
