import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  
  // Memoize filtered payload to avoid recalculating on every render
  const relevantData = payload.filter(e => e.dataKey === 'pnl' || e.dataKey === 'pnlAtExpiry');
  
  return (
    <div className="bg-[#1a2238] border border-border rounded-lg px-4 py-3 shadow-2xl shadow-black/40">
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Stock Price</p>
      <p className="text-foreground font-bold text-base font-mono">${Number(label).toFixed(2)}</p>
      <div className="h-px bg-border my-2" />
      {relevantData.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 rounded" style={{ backgroundColor: entry.stroke || entry.color }} />
            <span className="text-[10px] text-muted-foreground">{entry.dataKey === 'pnl' ? 'Current' : 'At Expiry'}</span>
          </div>
          <span className={`text-xs font-bold font-mono ${entry.value >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {entry.value >= 0 ? '+' : ''}${Number(entry.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Ajusta un precio al punto más cercano de la rejilla del gráfico.
 *
 * El eje X es CATEGÓRICO (`dataKey="price"` sin `type="number"`), así que una
 * `ReferenceLine` sólo se dibuja si su `x` coincide EXACTAMENTE con un valor
 * presente en los datos: un precio intermedio no pinta nada, y lo hace en
 * silencio. La rejilla tiene 201 puntos, de modo que el desvío del ajuste es
 * imperceptible. Devuelve null fuera del rango, para no dibujar una referencia
 * que el gráfico no cubre.
 */
function snapToGrid(value, chartData) {
  if (typeof value !== 'number' || !(value > 0) || !chartData || chartData.length === 0) return null;
  const first = chartData[0].price;
  const last = chartData[chartData.length - 1].price;
  if (value < first || value > last) return null;
  let best = first;
  for (const d of chartData) {
    if (Math.abs(d.price - value) < Math.abs(best - value)) best = d.price;
  }
  return best;
}

const PayoffChart = ({
  data, breakEvens, stockPrice, title, legs = [], dataB = null, labelA = 'A', labelB = 'B',
  high52w = null, low52w = null,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Merge strategy B payoff by price, aligned with A (same price grid)
    const bMap = new Map();
    if (dataB && dataB.length > 0) {
      dataB.forEach((d) => bMap.set(d.price, d));
    }
    return data.map(d => {
      const b = bMap.get(d.price);
      return {
        ...d,
        profitArea: d.pnlAtExpiry >= 0 ? d.pnlAtExpiry : 0,
        lossArea: d.pnlAtExpiry < 0 ? d.pnlAtExpiry : 0,
        pnlCurrentB: b ? b.pnlCurrent : null,
        pnlAtExpiryB: b ? b.pnlAtExpiry : null,
      };
    });
  }, [data, dataB]);

  // Strikes from option legs (stock legs excluded) with pre-computed label objects
  // to avoid recreating inline label={{...}} objects on every render.
  const optionStrikes = useMemo(() => {
    const strikes = (legs || [])
      .filter((l) => l && l.type !== 'stock' && Number.isFinite(l.strike))
      .map((l) => ({
        strike: l.strike,
        type: l.type,
        action: l.action,
        labelObj: {
          value: `${l.action === 'buy' ? '+' : '−'}${l.type.toUpperCase()} $${l.strike}`,
          position: 'insideBottom',
          fill: l.type === 'call' ? '#4ade80' : '#f87171',
          fontSize: 10,
          fontFamily: 'JetBrains Mono',
          offset: 8,
        },
      }));
    // Deduplicate by strike
    const seen = new Set();
    return strikes.filter((s) => {
      if (seen.has(s.strike)) return false;
      seen.add(s.strike);
      return true;
    });
  }, [legs]);

  // Pre-computed BE label objects (avoid inline object on every render)
  const breakEvenLabels = useMemo(
    () =>
      (breakEvens || []).map((be) => ({
        value: `BE $${be}`,
        position: 'insideTopRight',
        fill: '#a78bfa',
        fontSize: 9,
        fontFamily: 'JetBrains Mono',
      })),
    [breakEvens]
  );

  // Domain X (min/max of chart prices) for moneyness zone shading
  const xDomain = useMemo(() => {
    if (!chartData.length) return [0, 0];
    return [chartData[0].price, chartData[chartData.length - 1].price];
  }, [chartData]);

  const yDomain = useMemo(() => {
    if (!chartData.length) return [-100, 100];
    const vals = chartData.flatMap(d => [d.pnl, d.pnlAtExpiry]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(Math.abs(max - min) * 0.15, 20);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [chartData]);

  // Performance optimization: memoize inline objects
  const chartMargin = useMemo(() => ({ top: 10, right: 30, left: 10, bottom: 5 }), []);
  const xAxisTick = useMemo(() => ({ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }), []);
  const yAxisTick = useMemo(() => ({ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }), []);
  const refLineLabel = useMemo(() => ({
    value: `$${stockPrice}`,
    position: 'top',
    fill: '#f59e0b',
    fontSize: 10,
    fontFamily: 'JetBrains Mono'
  }), [stockPrice]);

  // Máximo y mínimo de 52 semanas del subyacente.
  //
  // Dicen si el break-even cae en terreno que el precio ya ha pisado este año o
  // si hace falta un máximo anual para ganar dinero — algo que la curva de
  // payoff, por sí sola, no cuenta. Se recortan al dominio del gráfico a mano
  // en vez de con `ifOverflow`: una referencia fuera de escala estira el eje y
  // aplasta la curva, y el recorte declarado aquí es además comprobable.
  const high52wX = useMemo(() => snapToGrid(high52w, chartData), [high52w, chartData]);
  const low52wX = useMemo(() => snapToGrid(low52w, chartData), [low52w, chartData]);
  const show52wHigh = high52wX !== null;
  const show52wLow = low52wX !== null;
  const high52wLabel = useMemo(() => ({
    value: `52W ${high52w}`, position: 'insideTopRight', fill: '#38bdf8', fontSize: 9,
    fontFamily: 'JetBrains Mono',
  }), [high52w]);
  const low52wLabel = useMemo(() => ({
    value: `52W ${low52w}`, position: 'insideTopLeft', fill: '#38bdf8', fontSize: 9,
    fontFamily: 'JetBrains Mono',
  }), [low52w]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Select a strategy to see the payoff diagram</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-4 text-[10px] flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[2px] rounded bg-[#22c55e]"></div>
            <span className="text-muted-foreground">{dataB ? `A · ${labelA}` : 'Current'}</span>
          </div>
          {dataB && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[2px] rounded bg-[#a855f7]"></div>
              <span className="text-muted-foreground">B · {labelB}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[2px] rounded bg-white opacity-50"></div>
            <span className="text-muted-foreground">At Expiry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#22c55e]/20"></div>
            <span className="text-muted-foreground">Profit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#ef4444]/20"></div>
            <span className="text-muted-foreground">Loss</span>
          </div>
          <span className="text-muted-foreground/40">|</span>
          <div className="flex items-center gap-1.5" title="In-The-Money zone (Call: S>K, Put: S<K)">
            <div className="w-3 h-3 rounded-sm bg-[#4ade80]/25 border border-[#4ade80]/40"></div>
            <span className="text-muted-foreground">ITM</span>
          </div>
          <div className="flex items-center gap-1.5" title="At-The-Money (Spot ≈ Strike)">
            <div className="w-3 h-3 rounded-sm bg-[#eab308]/25 border border-[#eab308]/40"></div>
            <span className="text-muted-foreground">ATM</span>
          </div>
          <div className="flex items-center gap-1.5" title="Out-of-The-Money zone (Call: S<K, Put: S>K)">
            <div className="w-3 h-3 rounded-sm bg-[#f87171]/25 border border-[#f87171]/40"></div>
            <span className="text-muted-foreground">OTM</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={chartMargin}>
            <defs>
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="lossFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="currentFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2238" vertical={false} />

            {/* Moneyness zones — shaded areas showing ITM/ATM/OTM per option strike.
                For CALL: ITM = price < strike (shifted), OTM = price > strike. Actually
                for a CALL owner, ITM means S > K; but on the X axis (price at expiry) the
                "ITM zone" is X > K for calls and X < K for puts. We shade per leg strike. */}
            {optionStrikes.map((opt, i) => {
              const K = opt.strike;
              const atmBand = (xDomain[1] - xDomain[0]) * 0.02; // ±2% of range around strike = ATM
              const isCall = opt.type === 'call';
              return (
                <React.Fragment key={`mz-${i}-${K}`}>
                  {/* ITM zone (light green) */}
                  <ReferenceArea
                    x1={isCall ? K + atmBand : xDomain[0]}
                    x2={isCall ? xDomain[1] : K - atmBand}
                    y1={yDomain[0]}
                    y2={yDomain[1]}
                    fill="#4ade80"
                    fillOpacity={0.07}
                    stroke="none"
                    ifOverflow="hidden"
                  />
                  {/* ATM zone (yellow) narrow band around strike */}
                  <ReferenceArea
                    x1={K - atmBand}
                    x2={K + atmBand}
                    y1={yDomain[0]}
                    y2={yDomain[1]}
                    fill="#eab308"
                    fillOpacity={0.18}
                    stroke="none"
                    ifOverflow="hidden"
                  />
                  {/* OTM zone (light red) */}
                  <ReferenceArea
                    x1={isCall ? xDomain[0] : K + atmBand}
                    x2={isCall ? K - atmBand : xDomain[1]}
                    y1={yDomain[0]}
                    y2={yDomain[1]}
                    fill="#f87171"
                    fillOpacity={0.07}
                    stroke="none"
                    ifOverflow="hidden"
                  />
                  {/* Strike vertical line */}
                  <ReferenceLine
                    x={K}
                    stroke={isCall ? '#4ade80' : '#f87171'}
                    strokeDasharray="2 3"
                    strokeOpacity={0.75}
                    strokeWidth={1.2}
                    label={opt.labelObj}
                  />
                </React.Fragment>
              );
            })}

            <XAxis
              dataKey="price" stroke="#262626"
              tick={xAxisTick}
              tickFormatter={(v) => `$${v}`}
              interval={Math.floor(chartData.length / 8)}
            />
            <YAxis
              stroke="#262626" domain={yDomain}
              tick={yAxisTick}
              tickFormatter={(v) => `$${v}`}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#262626" strokeWidth={1.5} />
            <ReferenceLine
              x={stockPrice} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1}
              label={refLineLabel}
            />
            {breakEvens?.map((be, i) => (
              <ReferenceLine
                key={`be-${be}-${i}`} x={be} stroke="#a78bfa" strokeDasharray="4 4" strokeWidth={1}
                label={breakEvenLabels[i]}
              />
            ))}

            {/* Máximo y mínimo de 52 semanas del subyacente.
                Dice si el break-even cae en una zona que el precio ha visitado
                alguna vez en el último año o si hace falta un máximo histórico
                para ganar dinero — que es lo que el payoff, por sí solo, no
                cuenta. Sólo se pintan si están DENTRO del rango del gráfico:
                una referencia fuera de escala comprime la curva y no informa
                de nada. */}
            {show52wHigh && (
              <ReferenceLine
                x={high52wX} stroke="#38bdf8" strokeDasharray="2 5" strokeWidth={1}
                label={high52wLabel}
              />
            )}
            {show52wLow && (
              <ReferenceLine
                x={low52wX} stroke="#38bdf8" strokeDasharray="2 5" strokeWidth={1}
                label={low52wLabel}
              />
            )}
            <Area type="monotone" dataKey="profitArea" stroke="none" fill="url(#profitFill)" isAnimationActive={false} baseValue={0} />
            <Area type="monotone" dataKey="lossArea" stroke="none" fill="url(#lossFill)" isAnimationActive={false} baseValue={0} />
            <Area type="monotone" dataKey="pnlAtExpiry" stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.4} fill="none" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="pnl" stroke="#22c55e" strokeWidth={2.5} fill="url(#currentFill)" dot={false} isAnimationActive={false} name={labelA} />

            {/* Strategy B overlay (comparison mode) */}
            {dataB && dataB.length > 0 && (
              <>
                <Area type="monotone" dataKey="pnlAtExpiryB" stroke="#c084fc" strokeWidth={1.5} strokeOpacity={0.5} fill="none" strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="pnlCurrentB" stroke="#a855f7" strokeWidth={2.5} fill="none" dot={false} isAnimationActive={false} name={labelB} />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PayoffChart;
