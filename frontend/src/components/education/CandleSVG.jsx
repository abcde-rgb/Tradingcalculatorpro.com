import React from 'react';

/**
 * Single Japanese candle drawn in SVG.
 * All coordinates are in a logical [0, 100] price space (low=0, high=100).
 * Caller controls absolute size via `width` / `height` props.
 *
 * Props:
 *   o, h, l, c   — OHLC values mapped to that 0..100 price space.
 *   width, height — pixel size of the SVG (default 24x80, intentionally small).
 *   showLabels    — if true, draws price labels (open/high/low/close).
 */
const CandleSVG = ({
  o, h, l, c,
  width = 24, height = 80,
  showLabels = false,
  labels = {},
}) => {
  const isBull = c >= o;
  const fill = isBull ? '#22c55e' : '#ef4444';
  const stroke = isBull ? '#16a34a' : '#dc2626';

  // Map [0..100] → [height..0] (SVG y axis is inverted).
  const yOf = (v) => height - (v / 100) * height;

  const cx = width / 2;            // candle center
  const bodyTop = yOf(Math.max(o, c));
  const bodyBottom = yOf(Math.min(o, c));
  const bodyHeight = Math.max(2, bodyBottom - bodyTop); // never collapse to zero
  const bodyWidth = Math.max(8, width * 0.55);
  const bodyX = cx - bodyWidth / 2;

  const wickX = cx;
  const wickTop = yOf(h);
  const wickBottom = yOf(l);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={isBull ? 'Bullish candle' : 'Bearish candle'}
    >
      {/* Wick */}
      <line
        x1={wickX} x2={wickX}
        y1={wickTop} y2={wickBottom}
        stroke={stroke} strokeWidth={1.4} strokeLinecap="round"
      />
      {/* Body */}
      <rect
        x={bodyX} y={bodyTop}
        width={bodyWidth} height={bodyHeight}
        fill={fill} stroke={stroke} strokeWidth={1}
        rx={1.5}
      />

      {showLabels && (
        <>
          {/* High */}
          <text x={cx + bodyWidth / 2 + 4} y={wickTop + 4}
                fontSize={9} fontFamily="IBM Plex Mono, monospace"
                fill="#94a3b8">
            {labels.high || 'H'}
          </text>
          {/* Low */}
          <text x={cx + bodyWidth / 2 + 4} y={wickBottom + 1}
                fontSize={9} fontFamily="IBM Plex Mono, monospace"
                fill="#94a3b8">
            {labels.low || 'L'}
          </text>
          {/* Open */}
          <text x={cx - bodyWidth / 2 - 4} y={yOf(o) + 3}
                fontSize={9} fontFamily="IBM Plex Mono, monospace"
                fill={isBull ? '#94a3b8' : '#fca5a5'} textAnchor="end">
            {labels.open || 'O'}
          </text>
          {/* Close */}
          <text x={cx - bodyWidth / 2 - 4} y={yOf(c) + 3}
                fontSize={9} fontFamily="IBM Plex Mono, monospace"
                fill={isBull ? '#86efac' : '#94a3b8'} textAnchor="end">
            {labels.close || 'C'}
          </text>
        </>
      )}
    </svg>
  );
};

export default CandleSVG;
