import { Card, CardContent } from '@/components/ui/card';
import { Crosshair } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Smart Money / ICT schematic drawn with real Japanese candlesticks:
 *  - price sweeps liquidity below a prior low (long lower wick under the line),
 *  - leaves an order block (the last bearish candle before the reversal),
 *  - and a fair value gap (the 3-candle imbalance on the impulse up).
 * Short codes (OB / FVG) sit on the drawing; the legend reuses the glossary terms
 * (gl66t order block, gl67t fair value gap, gl15t liquidity).
 */
// price → y (viewBox 0 0 460 240). Domain [102,126] mapped to y [220,24].
const py = (p) => 220 - ((p - 102) / 24) * 196;

// [o, h, l, c] per candle
const CANDLES = [
  [120, 121, 117, 118], [118, 119, 114, 115], [115, 116, 111, 112], [112, 114, 111, 113],
  [113, 114, 108, 109], [109, 111, 108, 110], [110, 111, 107, 108], [108, 113, 104, 112],
  [112, 116, 111, 116], [116, 122, 115, 121], [121, 124, 120, 123],
];
const X0 = 34, STEP = 36, W = 15;
const cx = (i) => X0 + i * STEP;

const LIQ = 108;   // prior low where liquidity rests
const OB_I = 6;    // order block candle (last bearish before reversal)
const SWEEP_I = 7; // liquidity sweep candle

function Candle({ i, o, h, l, c }) {
  const up = c >= o;
  const color = up ? '#16a34a' : '#dc2626';
  const x = cx(i);
  const top = Math.min(py(o), py(c));
  const bh = Math.max(Math.abs(py(o) - py(c)), 1.5);
  return (
    <g>
      <line x1={x} y1={py(h)} x2={x} y2={py(l)} stroke={color} strokeWidth="1.5" />
      <rect x={x - W / 2} y={top} width={W} height={bh} fill={color} rx="0.5" />
    </g>
  );
}

export default function SmartMoneyVisual() {
  const { t } = useTranslation();

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/10">
      <CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-purple-500" /> {t('smcVisTitle')}
        </h3>
        <svg viewBox="0 0 460 240" className="w-full h-auto rounded-lg bg-muted/20" role="img" aria-label={t('smcVisTitle')}>
          {/* Liquidity resting below a prior low */}
          <line x1="8" y1={py(LIQ).toFixed(1)} x2="452" y2={py(LIQ).toFixed(1)} stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="5 4" />
          <text x="360" y={(py(LIQ) - 5).toFixed(1)} fontSize="10" fontWeight="700" fill="#f59e0b">{t('gl15t')}</text>

          {/* Order block zone (candle OB_I) */}
          <rect x={cx(OB_I) - W / 2 - 3} y={(py(110) - 3).toFixed(1)} width={W + 6} height={(py(108) - py(110) + 6).toFixed(1)} fill="#a855f7" fillOpacity="0.16" stroke="#a855f7" strokeWidth="1" />
          <text x={cx(OB_I)} y={(py(110) - 8).toFixed(1)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#a855f7">OB</text>

          {/* Fair value gap: imbalance between candle 8 high (116) and candle 10 low (120) */}
          <rect x={(cx(8) - W / 2).toFixed(1)} y={py(120).toFixed(1)} width={(cx(10) - cx(8) + W).toFixed(1)} height={(py(116) - py(120)).toFixed(1)} fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 2" />
          <text x={cx(9)} y={(py(120) - 4).toFixed(1)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#3b82f6">FVG</text>

          {/* Candles */}
          {CANDLES.map(([o, h, l, c], i) => <Candle key={i} i={i} o={o} h={h} l={l} c={c} />)}

          {/* Sweep annotation on the long lower wick */}
          <text x={cx(SWEEP_I)} y={(py(104) + 14).toFixed(1)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#dc2626">{t('smcVisSweep')} ↑</text>
        </svg>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span><b className="text-[#a855f7]">OB</b> = {t('gl66t')}</span>
          <span><b className="text-[#3b82f6]">FVG</b> = {t('gl67t')}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('smcVisCaption')}</p>
      </CardContent>
    </Card>
  );
}
