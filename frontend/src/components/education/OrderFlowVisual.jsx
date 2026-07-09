import React from 'react';

// Language-neutral schematic SVGs for the Order-flow module, keyed by item id.
// Same idea as GlossaryVisual: a diagram renders inside the card when one exists,
// otherwise nothing. Colours: green = buy/bid, red = sell/ask, amber = highlight.

const BUY = '#22c55e';
const SELL = '#ef4444';
const NEUT = '#60a5fa';
const HOT = '#f59e0b';
const MUT = '#94a3b8';

const Frame = ({ children, label }) => (
  <svg viewBox="0 0 240 118" className="w-full h-28" role="img" aria-label={label}
       preserveAspectRatio="xMidYMid meet">{children}</svg>
);
const T = (p) => <text fontSize="8" fontFamily="monospace" {...p} />;

const VISUALS = {
  // Depth of Market — resting limit orders: asks (red) above, bids (green) below
  dom: (
    <Frame label="order book">
      {[[14, SELL, 70], [26, SELL, 46], [38, SELL, 96]].map(([y, c, w], i) => (
        <g key={`a${i}`}>
          <rect x={130 - w} y={y - 5} width={w} height="9" fill={c} opacity="0.75" rx="1" />
          <T x="134" y={y + 2} fill={c}>ask</T>
        </g>
      ))}
      <line x1="8" y1="59" x2="150" y2="59" stroke={MUT} strokeWidth="1" strokeDasharray="3 3" />
      <T x="154" y="62" fill={MUT}>spread</T>
      {[[80, BUY, 88], [92, BUY, 54], [104, BUY, 108]].map(([y, c, w], i) => (
        <g key={`b${i}`}>
          <rect x={130 - w} y={y - 5} width={w} height="9" fill={c} opacity="0.75" rx="1" />
          <T x="134" y={y + 2} fill={c}>bid</T>
        </g>
      ))}
    </Frame>
  ),
  // Time & sales tape — each print hits the ask (green, buyer) or bid (red, seller)
  tape: (
    <Frame label="time and sales">
      {[[BUY, 12, '1.2'], [BUY, 5, '0.4'], [SELL, 20, '2.0'], [BUY, 8, '0.9'], [SELL, 33, '3.3'], [SELL, 6, '0.6']].map(
        ([c, sz, lbl], i) => (
          <g key={i} transform={`translate(0 ${8 + i * 18})`}>
            <rect x="10" y="0" width="10" height="12" fill={c} rx="1" />
            <rect x="26" y="2" width={Math.min(sz * 5, 150)} height="8" fill={c} opacity="0.45" rx="1" />
            <T x={Math.min(26 + sz * 5, 176) + 4} y="9" fill={c}>{lbl}k</T>
          </g>
        )
      )}
    </Frame>
  ),
  // Volume delta — net of aggressive buys vs sells, per bar
  delta: (
    <Frame label="volume delta">
      <line x1="8" y1="60" x2="232" y2="60" stroke={MUT} strokeWidth="0.75" />
      {[18, -10, 26, 8, -22, 14, 30, -6].map((d, i) => {
        const x = 18 + i * 27;
        const h = Math.abs(d) * 1.6;
        const up = d > 0;
        return (
          <rect key={i} x={x} y={up ? 60 - h : 60} width="16" height={h}
                fill={up ? BUY : SELL} opacity="0.8" rx="1" />
        );
      })}
      <polyline points="26,52 53,56 80,44 107,40 134,52 161,44 188,30 215,36"
                fill="none" stroke={HOT} strokeWidth="1.5" />
      <T x="6" y="14" fill={HOT}>Δ acum.</T>
    </Frame>
  ),
  // Footprint / cluster — bid×ask volume traded at each price inside one candle
  footprint: (
    <Frame label="footprint">
      <rect x="86" y="8" width="60" height="102" fill={NEUT} opacity="0.06" rx="2" />
      {[['9', '41', 14], ['22', '58', 30], ['61', '30', 46, true], ['48', '12', 62], ['15', '7', 78]].map(
        ([b, a, y, hot], i) => (
          <g key={i}>
            <T x="112" y={y} textAnchor="end" fill={SELL}>{b}</T>
            <T x="118" y={y} fill={BUY}>{a}</T>
            {hot && <rect x="82" y={y - 9} width="72" height="13" fill={HOT} opacity="0.22" rx="2" />}
          </g>
        )
      )}
      <T x="70" y="30" textAnchor="end" fill={SELL}>bid</T>
      <T x="160" y="30" fill={BUY}>ask</T>
      <T x="82" y="98" fill={HOT}>← imbalance</T>
    </Frame>
  ),
  // Absorption — a big limit wall eats the aggression; price won't move
  absorption: (
    <Frame label="absorption">
      <rect x="150" y="20" width="14" height="80" fill={NEUT} opacity="0.8" rx="2" />
      <T x="150" y="14" fill={NEUT}>wall</T>
      {[30, 46, 62, 78, 94].map((y, i) => (
        <g key={i}>
          <line x1="30" y1={y} x2="146" y2={y} stroke={SELL} strokeWidth="1.6" />
          <path d={`M146 ${y} l-7 -4 l0 8 z`} fill={SELL} />
        </g>
      ))}
      <line x1="180" y1="16" x2="180" y2="104" stroke={BUY} strokeWidth="2" />
      <T x="184" y="60" fill={BUY}>precio</T>
      <T x="184" y="72" fill={BUY}>plano</T>
    </Frame>
  ),
  // Iceberg — a hidden size that keeps refilling at one price
  iceberg: (
    <Frame label="iceberg order">
      <line x1="16" y1="46" x2="224" y2="46" stroke={MUT} strokeWidth="1" strokeDasharray="2 2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={30 + i * 34} y="36" width="22" height="8" fill={BUY} opacity="0.85" rx="1" />
      ))}
      <rect x="30" y="58" width="192" height="46" fill={NEUT} opacity="0.14" rx="3" />
      <path d="M126 46 L126 58" stroke={MUT} strokeWidth="1" strokeDasharray="2 2" />
      <T x="30" y="30" fill={BUY}>se rellena…</T>
      <T x="126" y="86" textAnchor="middle" fill={NEUT}>tamaño real oculto</T>
    </Frame>
  ),
  // Point of Control — the price with the most traded volume (intraday magnet)
  poc: (
    <Frame label="volume profile POC">
      {[['', 12, 40], ['', 26, 66], ['POC', 40, 128, true], ['VA', 54, 90], ['', 68, 58], ['', 82, 30], ['', 96, 46]].map(
        ([lbl, y, w, hot], i) => (
          <g key={i}>
            <rect x="20" y={y - 5} width={w} height="10"
                  fill={hot ? HOT : NEUT} opacity={hot ? 0.9 : 0.5} rx="1" />
            {lbl && <T x={24 + w} y={y + 3} fill={hot ? HOT : MUT}>{lbl}</T>}
          </g>
        )
      )}
      <rect x="14" y="49" width="200" height="42" fill={HOT} opacity="0.06" />
      <T x="196" y="104" fill={MUT}>área de valor</T>
    </Frame>
  ),
};

export function hasOrderFlowVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function OrderFlowVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
