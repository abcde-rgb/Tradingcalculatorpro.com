import React from 'react';

/**
 * Diagramas SVG EN CÓDIGO para los 42 patrones CHARTISTAS de getChartPatterns
 * (HCH, dobles/triples, cuñas, triángulos, banderas, canales, taza, etc.).
 *
 * Sustituyen en la UI a los PNG externos alojados en customer-assets.
 * emergentagent.com (residuo de la plataforma de origen, pueden desaparecer):
 * son nítidos a cualquier tamaño, funcionan offline y con cualquier tema.
 *
 * Convención (igual que CandlePatternFigure / MarketStructureVisual):
 *  - Espacio lógico 100×60. Las specs se escriben con y = PRECIO (0 abajo,
 *    60 arriba) y se voltea al renderizar (SVG crece hacia abajo).
 *  - `p`  : polilínea del precio [[x,y],...]
 *  - `g`  : líneas de estructura discontinuas (neckline, directrices, rangos)
 *  - `b`  : 'up' | 'down' | null → colorea el tramo de ruptura + flecha
 *  - `bi` : índice de `p` donde empieza el tramo de ruptura (por defecto, el último)
 * Las variantes bajistas se derivan por espejo vertical (mirror) de la alcista.
 */

const UP = '#22c55e';
const DOWN = '#ef4444';
const MUT = '#94a3b8';

const mirror = ({ p, g = [], b = null, bi }) => ({
  p: p.map(([x, y]) => [x, 60 - y]),
  g: g.map((seg) => seg.map(([x, y]) => [x, 60 - y])),
  b: b === 'up' ? 'down' : b === 'down' ? 'up' : null,
  bi,
});

// ── Specs base (autoradas en "precio": y alto = precio alto) ──────────────
const headShoulders = {
  p: [[2, 16], [14, 36], [22, 24], [34, 50], [46, 24], [58, 36], [70, 24], [80, 8]],
  g: [[[16, 24], [76, 24]]],
  b: 'down', bi: 5,
};
const doubleTop = {
  p: [[2, 12], [16, 44], [26, 26], [38, 44], [50, 26], [60, 8]],
  g: [[[12, 44], [42, 44]], [[22, 26], [56, 26]]],
  b: 'down', bi: 3,
};
const tripleTop = {
  p: [[2, 12], [12, 42], [20, 26], [30, 42], [38, 26], [48, 42], [58, 26], [68, 8]],
  g: [[[8, 42], [52, 42]], [[16, 26], [64, 26]]],
  b: 'down', bi: 5,
};
const risingWedge = {
  p: [[2, 10], [14, 30], [22, 20], [34, 38], [42, 28], [54, 44], [62, 36], [74, 18]],
  g: [[[8, 27], [60, 47]], [[0, 9], [58, 34]]],
  b: 'down', bi: 6,
};
const ascBroadeningWedge = {
  p: [[2, 20], [12, 30], [20, 22], [32, 38], [40, 24], [54, 46], [62, 24], [74, 10]],
  g: [[[8, 28], [58, 48]], [[4, 19], [66, 25]]],
  b: 'down', bi: 5,
};
const broadeningDescBullRev = {
  p: [[2, 44], [12, 34], [20, 42], [32, 26], [40, 38], [54, 18], [64, 34], [76, 50]],
  g: [[[6, 43], [62, 35]], [[8, 33], [58, 15]]],
  b: 'up', bi: 5,
};
const broadeningDescBearRev = {
  p: [[2, 44], [12, 34], [20, 42], [32, 26], [42, 40], [54, 18], [62, 28], [74, 6]],
  g: [[[6, 43], [60, 36]], [[8, 33], [58, 15]]],
  b: 'down', bi: 5,
};
const descBroadeningWedge = {
  p: [[2, 48], [14, 38], [22, 44], [34, 28], [44, 40], [56, 16], [66, 32], [78, 52]],
  g: [[[8, 46], [62, 38]], [[10, 36], [60, 12]]],
  b: 'up', bi: 5,
};
const vBottomReversal = {
  p: [[4, 52], [28, 12], [32, 8], [36, 12], [62, 52]],
  b: 'up', bi: 2,
};
const vTop = {
  p: [[4, 8], [28, 48], [32, 52], [36, 48], [62, 8]],
  b: 'down', bi: 2,
};
const vBottomContinuation = {
  p: [[2, 26], [16, 44], [28, 14], [32, 12], [36, 14], [50, 44], [62, 56]],
  b: 'up', bi: 4,
};
const saucer = {
  p: [[2, 40], [12, 26], [24, 16], [36, 12], [48, 14], [60, 22], [70, 34], [80, 48]],
  g: [[[4, 40], [76, 40]]],
  b: 'up', bi: 6,
};
const roundedBottom = {
  p: [[2, 42], [14, 28], [26, 17], [38, 13], [50, 15], [62, 24], [72, 36], [82, 50]],
  b: 'up', bi: 6,
};
const bullishDiamond = {
  p: [[2, 24], [12, 32], [20, 20], [30, 40], [42, 14], [52, 34], [60, 24], [72, 44]],
  g: [[[8, 28], [36, 46]], [[36, 46], [64, 28]], [[8, 20], [36, 6]], [[36, 6], [64, 18]]],
  b: 'up', bi: 6,
};
const symBroadeningBull = {
  p: [[2, 30], [12, 38], [22, 24], [34, 44], [46, 18], [58, 50], [68, 22], [80, 54]],
  g: [[[6, 34], [64, 54]], [[6, 26], [64, 10]]],
  b: 'up', bi: 6,
};
const rightAngleAscBroadening = {
  p: [[2, 24], [12, 32], [20, 22], [32, 40], [40, 22], [52, 48], [60, 22], [72, 8]],
  g: [[[8, 22], [64, 22]], [[8, 30], [56, 50]]],
  b: 'down', bi: 6,
};
const ascTriangle = {
  p: [[2, 14], [12, 34], [20, 20], [32, 34], [40, 26], [50, 34], [56, 30], [66, 48]],
  g: [[[8, 34], [60, 34]], [[4, 12], [58, 30]]],
  b: 'up', bi: 6,
};
const symTriangle = {
  p: [[2, 30], [12, 44], [22, 18], [32, 40], [42, 24], [52, 36], [60, 30], [72, 30]],
  g: [[[8, 44], [66, 31]], [[8, 16], [66, 29]]],
  b: null,
};
const symTriangleBull = {
  p: [[2, 30], [12, 44], [22, 18], [32, 40], [42, 24], [52, 36], [60, 30], [72, 50]],
  g: [[[8, 44], [64, 31]], [[8, 16], [64, 29]]],
  b: 'up', bi: 6,
};
const bullFlag = {
  p: [[2, 6], [12, 42], [18, 36], [24, 40], [30, 34], [36, 38], [46, 56]],
  g: [[[12, 44], [38, 38]], [[14, 33], [40, 27]]],
  b: 'up', bi: 5,
};
const pennant = {
  p: [[2, 8], [12, 42], [18, 32], [24, 40], [30, 35], [38, 37]],
  g: [[[12, 44], [40, 38]], [[12, 30], [40, 35]]],
  b: null,
};
const bullPennant = {
  p: [[2, 8], [12, 42], [18, 32], [24, 40], [30, 35], [36, 37], [46, 56]],
  g: [[[12, 44], [38, 38]], [[12, 30], [38, 35]]],
  b: 'up', bi: 5,
};
const ascChannel = {
  p: [[2, 14], [14, 32], [24, 20], [36, 38], [46, 26], [58, 44], [68, 32], [80, 50]],
  g: [[[4, 26], [76, 56]], [[4, 8], [76, 38]]],
  b: 'up', bi: 6,
};
const horzChannel = {
  p: [[2, 26], [12, 40], [22, 20], [32, 40], [42, 20], [52, 40], [62, 20], [72, 30]],
  g: [[[6, 42], [70, 42]], [[6, 18], [70, 18]]],
  b: null,
};
const horzChannelBull = {
  p: [[2, 30], [10, 40], [18, 20], [26, 40], [34, 20], [42, 40], [50, 20], [58, 40], [70, 56]],
  g: [[[4, 41], [62, 41]], [[4, 19], [62, 19]]],
  b: 'up', bi: 7,
};
const cupHandle = {
  p: [[2, 42], [10, 28], [20, 16], [32, 12], [44, 16], [54, 28], [62, 42], [66, 36], [70, 32], [74, 36], [82, 54]],
  g: [[[4, 42], [78, 42]]],
  b: 'up', bi: 9,
};
const bullBroadeningCont = {
  p: [[2, 14], [12, 30], [20, 38], [30, 24], [42, 46], [54, 20], [66, 50], [78, 58]],
  g: [[[16, 36], [70, 54]], [[26, 22], [60, 16]]],
  b: 'up', bi: 6,
};

// ── Mapa id → spec (los 42 de getChartPatterns) ───────────────────────────
const CHART_SPECS = {
  'head-shoulders': headShoulders,
  'inverse-head-shoulders': mirror(headShoulders),
  'double-top': doubleTop,
  'double-bottom': mirror(doubleTop),
  'triple-top': tripleTop,
  'triple-bottom': mirror(tripleTop),
  'asc-broadening-wedge': ascBroadeningWedge,
  'bear-broadening-bull-rev': broadeningDescBullRev,
  'bear-broadening-bear-rev': broadeningDescBearRev,
  'v-bottom-reversal': vBottomReversal,
  'rising-wedge': risingWedge,
  'falling-wedge': mirror(risingWedge),
  'desc-broadening-wedge': descBroadeningWedge,
  'bullish-diamond': bullishDiamond,
  'bearish-diamond': mirror(bullishDiamond),
  'v-top': vTop,
  saucer,
  'rounded-top': mirror(roundedBottom),
  'rounded-bottom': roundedBottom,
  'symmetric-broadening-bull': symBroadeningBull,
  'symmetric-broadening-bear': mirror(symBroadeningBull),
  'right-angle-asc-broadening': rightAngleAscBroadening,
  'right-angle-desc-broadening': mirror(rightAngleAscBroadening),
  'v-bottom-continuation': vBottomContinuation,
  'ascending-triangle': ascTriangle,
  'descending-triangle': mirror(ascTriangle),
  'symmetrical-triangle': symTriangle,
  'symmetrical-triangle-bullish': symTriangleBull,
  'symmetrical-triangle-bearish': mirror(symTriangleBull),
  'bull-flag': bullFlag,
  'bear-flag': mirror(bullFlag),
  pennant,
  'bull-pennant': bullPennant,
  'bear-pennant': mirror(bullPennant),
  'ascending-channel': ascChannel,
  'descending-channel': mirror(ascChannel),
  'horizontal-channel': horzChannel,
  'horizontal-channel-bullish': horzChannelBull,
  'horizontal-channel-bearish': mirror(horzChannelBull),
  'cup-and-handle': cupHandle,
  'bull-broadening-cont': bullBroadeningCont,
  'bear-broadening-cont': mirror(bullBroadeningCont),
};

export const hasChartFigure = (patternId) =>
  Object.prototype.hasOwnProperty.call(CHART_SPECS, patternId);

const fy = (y) => 60 - y; // precio → coordenada SVG

const toPts = (pts) => pts.map(([x, y]) => `${x},${fy(y)}`).join(' ');

/** Flecha de ruptura en la dirección `dir`, en el último punto del path. */
const Arrow = ({ x, y, dir }) => {
  const c = dir === 'up' ? UP : DOWN;
  const s = dir === 'up' ? -1 : 1; // SVG: y crece hacia abajo
  return (
    <path
      d={`M ${x - 3} ${fy(y) - 4 * s} L ${x} ${fy(y)} L ${x + 3} ${fy(y) - 4 * s}`}
      fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  );
};

const SIZES = {
  sm: { width: 92, height: 55 },
  lg: { width: '100%', height: 'auto' },
};

const ChartPatternFigure = ({ patternId, className = '', size = 'sm' }) => {
  const spec = CHART_SPECS[patternId];
  if (!spec) return null;

  const { p, g = [], b } = spec;
  const bi = spec.bi ?? p.length - 2;
  const pre = b ? p.slice(0, bi + 1) : p;
  const post = b ? p.slice(bi) : [];
  const last = p[p.length - 1];
  const dims = SIZES[size] || SIZES.sm;

  return (
    <svg
      viewBox="0 0 100 60"
      width={dims.width}
      height={dims.height}
      className={className}
      role="img"
      aria-label={`${patternId} chart pattern illustration`}
      preserveAspectRatio="xMidYMid meet"
    >
      {g.map(([[x1, y1], [x2, y2]], i) => (
        <line
          key={i} x1={x1} y1={fy(y1)} x2={x2} y2={fy(y2)}
          stroke={MUT} strokeWidth="1" strokeDasharray="3 2.5" opacity="0.75"
        />
      ))}
      <polyline
        points={toPts(pre)} fill="none" stroke={MUT} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round"
      />
      {b && (
        <>
          <polyline
            points={toPts(post)} fill="none" stroke={b === 'up' ? UP : DOWN}
            strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round"
          />
          <Arrow x={last[0]} y={last[1]} dir={b} />
        </>
      )}
    </svg>
  );
};

export default ChartPatternFigure;
