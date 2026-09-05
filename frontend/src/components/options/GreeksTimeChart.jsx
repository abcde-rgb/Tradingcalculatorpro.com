import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { calculateStrategyGreeks } from '@/utils/blackScholes';

/**
 * GreeksTimeChart — Shows how each Greek evolves from today (T=daysToExpiry)
 * to expiration (T=0), assuming the underlying stays at current spot price.
 * Helpful to visualize theta decay, gamma explosion near expiry, vega collapse, etc.
 */

const GREEKS_CONFIG = [
  { key: 'delta', label: 'Delta Δ', color: '#22c55e' },
  { key: 'gamma', label: 'Gamma Γ', color: '#f59e0b' },
  { key: 'theta', label: 'Theta Θ', color: '#ef4444' },
  { key: 'vega', label: 'Vega ν', color: '#60a5fa' },
];

// Chart layout constants (module-level to avoid inline-object re-renders)
const CHART_MARGIN = { top: 5, right: 20, left: 0, bottom: 5 };
const AXIS_TICK = { fill: '#8b9ab8', fontSize: 10, fontFamily: 'IBM Plex Mono' };
const TOOLTIP_STYLE = { background: '#0a0a0a', border: '1px solid #262626', borderRadius: 8, fontSize: 11 };
const LEGEND_STYLE = { fontSize: 10, paddingTop: 8 };

const GreeksTimeChart = ({ legs, stockPrice, daysToExpiry }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState({ delta: true, gamma: true, theta: true, vega: true });
  const [normalize, setNormalize] = useState(false);

  // Memoize inline objects so Recharts doesn't see new references on every render.
  const xDomain = useMemo(() => [0, daysToExpiry || 0], [daysToExpiry]);
  const xAxisLabel = useMemo(
    () => ({ value: t('diasDesdeHoy_114266'), position: 'insideBottom', offset: -2, fill: '#6b7a94', fontSize: 10 }),
    [t]
  );
  const expirationLineLabel = useMemo(
    () => ({ value: t('vencimiento_91e0e1'), position: 'top', fill: '#f59e0b', fontSize: 9 }),
    [t]
  );

  const series = useMemo(() => {
    if (!legs || legs.length === 0 || !stockPrice || !daysToExpiry || daysToExpiry < 1) return [];
    const total = daysToExpiry;
    const out = [];
    // Step: 1 day for <=60d, 2 days otherwise (keeps chart performant)
    const step = total <= 60 ? 1 : Math.max(1, Math.round(total / 60));
    for (let d = 0; d <= total; d += step) {
      const remaining = total - d;
      const shiftedLegs = legs.map((l) => (l.type === 'stock' ? l : { ...l, daysToExpiry: remaining }));
      const g = calculateStrategyGreeks(shiftedLegs, stockPrice);
      out.push({
        day: d,
        daysLeft: remaining,
        delta: Number(g.delta || 0),
        gamma: Number(g.gamma || 0),
        theta: Number(g.theta || 0),
        vega: Number(g.vega || 0),
      });
    }
    // Always include final day (expiration)
    if (out.length && out[out.length - 1].day !== total) {
      const shiftedLegs = legs.map((l) => (l.type === 'stock' ? l : { ...l, daysToExpiry: 0 }));
      const g = calculateStrategyGreeks(shiftedLegs, stockPrice);
      out.push({
        day: total, daysLeft: 0,
        delta: Number(g.delta || 0), gamma: Number(g.gamma || 0),
        theta: Number(g.theta || 0), vega: Number(g.vega || 0),
      });
    }
    return out;
  }, [legs, stockPrice, daysToExpiry]);

  // For normalization (% of absolute max), each series scaled independently
  const displayed = useMemo(() => {
    if (!normalize || series.length === 0) return series;
    const maxes = { delta: 0, gamma: 0, theta: 0, vega: 0 };
    series.forEach((p) => {
      GREEKS_CONFIG.forEach(({ key }) => {
        const abs = Math.abs(p[key]);
        if (abs > maxes[key]) maxes[key] = abs;
      });
    });
    return series.map((p) => {
      const row = { day: p.day, daysLeft: p.daysLeft };
      GREEKS_CONFIG.forEach(({ key }) => {
        row[key] = maxes[key] > 0 ? (p[key] / maxes[key]) * 100 : 0;
      });
      return row;
    });
  }, [series, normalize]);

  if (!legs || legs.length === 0 || !stockPrice) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground text-sm">
        Añade al menos una leg para visualizar la evolución temporal de las Greeks.
      </div>
    );
  }

  const today = daysToExpiry;

  return (
    <div className="bg-card rounded-xl border border-border p-4" data-testid="greeks-time-chart">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-bold text-foreground">{t('evolucionDeLasGreeksHasta_088c5c')}</h4>
          <p className="text-[10px] text-muted-foreground">
            Asumiendo precio spot constante en ${stockPrice.toFixed(2)} · T = {daysToExpiry}d
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {GREEKS_CONFIG.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all ${
                visible[key] ? 'bg-muted border-border text-foreground' : 'bg-background border-border/50 text-muted-foreground line-through'
              }`}
              data-testid={`greek-toggle-${key}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: color }}></span>
              {label}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer ml-2">
            <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} className="accent-primary" />
            Normalizar (%)
          </label>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayed} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis
              dataKey="day"
              type="number"
              domain={xDomain}
              stroke="#262626"
              tick={AXIS_TICK}
              tickFormatter={(v) => `T+${v}d`}
              label={xAxisLabel}
            />
            <YAxis
              stroke="#262626"
              tick={AXIS_TICK}
              tickFormatter={(v) => normalize ? `${v.toFixed(0)}%` : v.toFixed(2)}
              width={55}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(v) => `Día T+${v} · ${today - v}d al vencimiento`}
              formatter={(val, name) => [normalize ? `${Number(val).toFixed(1)}%` : Number(val).toFixed(4), name]}
            />
            <Legend
              wrapperStyle={LEGEND_STYLE}
              iconType="line"
            />
            <ReferenceLine y={0} stroke="#444" strokeWidth={1} />
            <ReferenceLine x={today} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={expirationLineLabel} />
            {GREEKS_CONFIG.map(({ key, label, color }) =>
              visible[key] ? (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  name={label}
                  isAnimationActive={false}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        {GREEKS_CONFIG.map(({ key, label, color }) => {
          if (series.length < 2) return null;
          const first = series[0][key];
          const last = series[series.length - 1][key];
          const delta = last - first;
          const pct = Math.abs(first) > 0.0001 ? (delta / Math.abs(first)) * 100 : 0;
          return (
            <div key={key} className="bg-muted/40 rounded-lg border border-border/60 p-2">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full" style={{ background: color }}></span>
                {label}
              </div>
              <div className="text-xs font-mono font-bold text-foreground mt-0.5">
                {first.toFixed(3)} → {last.toFixed(3)}
              </div>
              <div className={`text-[9px] font-mono ${delta >= 0 ? 'text-long' : 'text-short'}`}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(3)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GreeksTimeChart;
