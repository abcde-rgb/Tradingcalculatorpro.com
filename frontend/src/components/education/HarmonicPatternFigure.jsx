import React from 'react';

/**
 * Diagramas SVG en código para los PATRONES ARMÓNICOS (getHarmonicPatterns):
 * zigzag X-A-B-C-D con etiquetas de pivote (letras universales, sin i18n),
 * los dos triángulos clásicos (XAB y BCD) suavemente rellenos —como los
 * dibujan las plataformas— y flecha de la reversión esperada en D.
 *
 * Mismas convenciones que ChartPatternFigure: espacio lógico 100×60 con
 * y = PRECIO (0 abajo, 60 arriba), volteado al renderizar; variantes
 * bajistas por espejo vertical de la alcista.
 */

const UP = '#22c55e';
const DOWN = '#ef4444';
const MUT = '#94a3b8';
const ACCENT = '#22c55e';

const mirror = ({ pts, labels, b }) => ({
  pts: pts.map(([x, y]) => [x, 60 - y]),
  labels,
  b: b === 'up' ? 'down' : 'up',
});

// ── Specs alcistas (y = precio). D es el punto de giro que se opera. ──────
const gartleyBull = {
  pts: [[6, 8], [30, 52], [48, 29], [64, 45], [84, 17]],
  labels: ['X', 'A', 'B', 'C', 'D'],
  b: 'up',
};
const butterflyBull = {
  pts: [[6, 16], [30, 52], [48, 30], [64, 44], [88, 4]],
  labels: ['X', 'A', 'B', 'C', 'D'],
  b: 'up',
};
const batBull = {
  pts: [[6, 8], [30, 52], [46, 36], [62, 46], [84, 12]],
  labels: ['X', 'A', 'B', 'C', 'D'],
  b: 'up',
};
const crabBull = {
  pts: [[6, 20], [28, 50], [44, 33], [60, 45], [90, 2]],
  labels: ['X', 'A', 'B', 'C', 'D'],
  b: 'up',
};
// Shark (5-0): O-X-A-B-C, con B extendiéndose más allá de X y C profundo.
const shark = {
  pts: [[4, 16], [26, 44], [42, 27], [62, 54], [86, 9]],
  labels: ['O', 'X', 'A', 'B', 'C'],
  b: 'up',
};
const cypherBull = {
  pts: [[6, 10], [28, 42], [44, 27], [66, 54], [86, 21]],
  labels: ['X', 'A', 'B', 'C', 'D'],
  b: 'up',
};

const HARMONIC_SPECS = {
  'gartley-bull': gartleyBull,
  'gartley-bear': mirror(gartleyBull),
  'butterfly-bull': butterflyBull,
  'butterfly-bear': mirror(butterflyBull),
  'bat-bull': batBull,
  'bat-bear': mirror(batBull),
  'crab-bull': crabBull,
  'crab-bear': mirror(crabBull),
  shark,
  'cypher-bull': cypherBull,
  'cypher-bear': mirror(cypherBull),
};

export const hasHarmonicFigure = (patternId) =>
  Object.prototype.hasOwnProperty.call(HARMONIC_SPECS, patternId);

const fy = (y) => 60 - y;

const HarmonicPatternFigure = ({ patternId, className = '' }) => {
  const spec = HARMONIC_SPECS[patternId];
  if (!spec) return null;

  const { pts, labels, b } = spec;
  const P = pts.map(([x, y]) => [x, fy(y)]);
  const zig = P.map(([x, y]) => `${x},${y}`).join(' ');
  const triA = `${P[0]} ${P[1]} ${P[2]}`; // X-A-B
  const triB = `${P[2]} ${P[3]} ${P[4]}`; // B-C-D
  const [dx, dy] = P[P.length - 1];
  const s = b === 'up' ? -1 : 1; // SVG: y crece hacia abajo
  const arrowCol = b === 'up' ? UP : DOWN;

  return (
    <svg
      viewBox="0 0 100 60"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label={`${patternId} harmonic pattern illustration`}
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon points={triA} fill={ACCENT} opacity="0.07" />
      <polygon points={triB} fill={ACCENT} opacity="0.07" />
      <polyline
        points={zig} fill="none" stroke={MUT} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round"
      />
      {P.map(([x, y], i) => {
        const isD = i === P.length - 1;
        // etiqueta encima si el pivote es un máximo local, debajo si es mínimo
        const above = (i === 0 ? P[1][1] > y : P[i - 1][1] > y);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="2" fill={isD ? arrowCol : MUT} />
            <text
              x={x} y={above ? y - 4 : y + 8.5}
              fontSize="6.5" fontWeight="700" fill={isD ? arrowCol : MUT}
              textAnchor="middle" fontFamily="ui-monospace, monospace"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
      {/* flecha de la reversión esperada tras completar el patrón en D */}
      <path
        d={`M ${dx + 5} ${dy} L ${dx + 5} ${dy + 9 * s}`}
        fill="none" stroke={arrowCol} strokeWidth="2" strokeLinecap="round"
      />
      <path
        d={`M ${dx + 2.5} ${dy + 5.5 * s} L ${dx + 5} ${dy + 9 * s} L ${dx + 7.5} ${dy + 5.5 * s}`}
        fill="none" stroke={arrowCol} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
};

export default HarmonicPatternFigure;
