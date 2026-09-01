import React from 'react';
import CandleSVG from './CandleSVG';

/**
 * OHLC blueprints (logical 0..100 price space) for every candlestick
 * pattern referenced in tradingEducationContent.js.
 *
 * Each pattern is an array of { o, h, l, c } candles. Order is left-to-right.
 * Values are designed to match the canonical visual shape of each pattern
 * (e.g. hammer = small body up high + long lower wick; engulfing = the 2nd
 * body fully wraps the 1st). The shapes are intentionally compact so the
 * illustrations stay small inside their cards.
 */
const PATTERN_BLUEPRINTS = {
  // ----- Bullish (single & multi) -----
  hammer: [{ o: 65, h: 72, l: 25, c: 70 }],
  'bullish-engulfing': [
    { o: 70, h: 75, l: 50, c: 55 }, // small bearish
    { o: 50, h: 85, l: 48, c: 80 }, // bigger bullish that engulfs body
  ],
  'morning-star': [
    { o: 80, h: 82, l: 45, c: 50 }, // big bearish
    { o: 42, h: 48, l: 38, c: 44 }, // small body (star)
    { o: 50, h: 90, l: 48, c: 85 }, // big bullish recovers
  ],
  'dragonfly-doji': [{ o: 75, h: 76, l: 30, c: 75 }],
  'three-white-soldiers': [
    { o: 30, h: 50, l: 28, c: 48 },
    { o: 47, h: 68, l: 45, c: 65 },
    { o: 64, h: 88, l: 62, c: 86 },
  ],
  'bullish-harami': [
    { o: 78, h: 82, l: 35, c: 40 }, // big bearish
    { o: 52, h: 60, l: 48, c: 58 }, // small bullish inside prior body
  ],
  'inverted-hammer': [{ o: 30, h: 78, l: 27, c: 36 }], // small body low, long upper wick
  'three-inside-up': [
    { o: 80, h: 84, l: 42, c: 46 }, // big bearish
    { o: 55, h: 64, l: 52, c: 62 }, // bullish harami inside
    { o: 60, h: 90, l: 56, c: 86 }, // confirmation closes above first open
  ],
  'morning-doji-star': [
    { o: 80, h: 82, l: 48, c: 52 }, // big bearish
    { o: 40, h: 45, l: 36, c: 40 }, // doji gapped down
    { o: 50, h: 88, l: 47, c: 84 }, // big bullish recovers
  ],
  'bullish-marubozu': [{ o: 25, h: 85, l: 25, c: 85 }], // full body, no wicks
  'bullish-kicker': [
    { o: 55, h: 58, l: 35, c: 38 }, // bearish
    { o: 60, h: 88, l: 58, c: 85 }, // bullish gaps up above prior open
  ],
  'piercing-line': [
    { o: 75, h: 78, l: 40, c: 45 }, // bearish (body 45..75, midpoint 60)
    { o: 38, h: 70, l: 36, c: 65 }, // bullish gaps down, closes above midpoint
  ],
  'tweezer-bottom': [
    { o: 60, h: 65, l: 30, c: 38 }, // bearish, low at 30
    { o: 38, h: 62, l: 30, c: 58 }, // bullish, identical low at 30
  ],
  'bullish-belt-hold': [{ o: 20, h: 82, l: 20, c: 80 }], // opens at the low, tiny upper wick only
  'bullish-abandoned-baby': [
    { o: 80, h: 82, l: 45, c: 50 }, // big bearish
    { o: 42, h: 44, l: 40, c: 42.5 }, // doji, gapped BELOW the first candle's low
    { o: 48, h: 90, l: 47, c: 85 }, // big bullish, gapped ABOVE the doji's high
  ],

  // ----- Bearish (single & multi) -----
  'shooting-star': [{ o: 35, h: 80, l: 33, c: 38 }],
  'bearish-engulfing': [
    { o: 50, h: 70, l: 48, c: 65 }, // small bullish
    { o: 70, h: 72, l: 40, c: 45 }, // big bearish engulfs
  ],
  'evening-star': [
    { o: 20, h: 55, l: 18, c: 50 }, // big bullish
    { o: 56, h: 60, l: 52, c: 58 }, // star body small
    { o: 50, h: 52, l: 15, c: 18 }, // big bearish drop
  ],
  'gravestone-doji': [{ o: 25, h: 70, l: 24, c: 25 }],
  'three-black-crows': [
    { o: 70, h: 72, l: 50, c: 52 },
    { o: 53, h: 55, l: 32, c: 35 },
    { o: 36, h: 38, l: 12, c: 14 },
  ],
  'bearish-harami': [
    { o: 35, h: 82, l: 32, c: 78 }, // big bullish
    { o: 58, h: 62, l: 50, c: 52 }, // small bearish inside prior body
  ],
  'hanging-man': [{ o: 65, h: 72, l: 25, c: 60 }], // small body high, long lower wick
  'three-inside-down': [
    { o: 42, h: 84, l: 38, c: 80 }, // big bullish
    { o: 64, h: 68, l: 55, c: 58 }, // bearish harami inside
    { o: 60, h: 64, l: 36, c: 40 }, // confirmation closes below first open
  ],
  'evening-doji-star': [
    { o: 30, h: 60, l: 28, c: 56 }, // big bullish
    { o: 66, h: 70, l: 62, c: 66 }, // doji gapped up
    { o: 58, h: 60, l: 25, c: 28 }, // big bearish drop
  ],
  'bearish-marubozu': [{ o: 85, h: 85, l: 25, c: 25 }], // full body, no wicks
  'bearish-kicker': [
    { o: 45, h: 65, l: 42, c: 62 }, // bullish
    { o: 40, h: 42, l: 15, c: 18 }, // bearish gaps down below prior open
  ],
  'dark-cloud-cover': [
    { o: 30, h: 62, l: 28, c: 58 }, // bullish (body 30..58, midpoint 44)
    { o: 65, h: 68, l: 35, c: 40 }, // bearish gaps up, closes below midpoint
  ],
  'tweezer-top': [
    { o: 40, h: 75, l: 35, c: 68 }, // bullish, high at 75
    { o: 65, h: 75, l: 40, c: 45 }, // bearish, identical high at 75
  ],
  'bearish-belt-hold': [{ o: 80, h: 80, l: 18, c: 20 }], // opens at the high, tiny lower wick only
  'in-neck': [
    { o: 75, h: 78, l: 40, c: 45 }, // long bearish
    { o: 37, h: 46.5, l: 35, c: 46 }, // gaps below the low, closes barely above the prior close
  ],
  'bearish-abandoned-baby': [
    { o: 20, h: 55, l: 18, c: 50 }, // big bullish
    { o: 58, h: 60, l: 56, c: 58.1 }, // doji, gapped ABOVE the first candle's high
    { o: 50, h: 52, l: 15, c: 18 }, // big bearish, gapped BELOW the doji's low
  ],

  // ----- Neutral / Indecision -----
  doji: [{ o: 50, h: 75, l: 25, c: 50 }],
  'spinning-top': [{ o: 48, h: 75, l: 25, c: 52 }],
  'long-legged-doji': [{ o: 50, h: 90, l: 12, c: 50 }], // doji with very long wicks
  'high-wave': [{ o: 45, h: 92, l: 10, c: 55 }], // small body, very long wicks both sides
};

/**
 * Render the candle illustration for a given pattern id.
 *
 * Sizing strategy:
 *   - Each candle is 24×80 px → very compact.
 *   - 1-candle patterns: 24×80
 *   - 2-candle patterns: 56×80
 *   - 3-candle patterns: 84×80
 */
/** True if a given pattern id has a candle blueprint available. */
export const hasCandleBlueprint = (patternId) =>
  Object.prototype.hasOwnProperty.call(PATTERN_BLUEPRINTS, patternId);

const CandlePatternFigure = ({ patternId, className = '', size = 'sm', showLabels = false }) => {
  const candles = PATTERN_BLUEPRINTS[patternId];
  if (!candles) return null;

  // Two render scales: compact (card) and large (detail modal).
  const dims = size === 'lg'
    ? { candleWidth: 48, gap: 12, height: 200 }
    : { candleWidth: 24, gap: 4,  height: 80 };
  const totalWidth =
    candles.length * dims.candleWidth + (candles.length - 1) * dims.gap;

  return (
    <div
      className={`flex items-end justify-center ${size === 'lg' ? 'gap-3' : 'gap-1'} ${className}`}
      style={{ width: totalWidth, height: dims.height }}
      aria-label={`${patternId} candlestick illustration`}
    >
      {candles.map((c, i) => (
        <CandleSVG
          key={`${patternId}-${i}`}
          o={c.o} h={c.h} l={c.l} c={c.c}
          width={dims.candleWidth} height={dims.height}
          showLabels={showLabels && candles.length === 1}
        />
      ))}
    </div>
  );
};

export default CandlePatternFigure;
