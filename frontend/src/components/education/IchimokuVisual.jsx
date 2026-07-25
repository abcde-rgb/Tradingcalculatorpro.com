import { Card, CardContent } from '@/components/ui/card';
import { CandlestickChart } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Ichimoku diagram drawn with real Japanese candlesticks: price (candles) trading
 * above a bullish Kumo cloud (Span A over Span B), with Tenkan-sen (fast) and
 * Kijun-sen (slow) lines. Component names stay language-neutral; only the cloud
 * label and caption are translated.
 */
// price → y (viewBox 0 0 460 240). Domain [100,132] mapped to y [220,24].
const py = (p) => 220 - ((p - 100) / 32) * 196;

// [o, h, l, c] per candle
const CANDLES = [
  [106, 108, 105, 107], [107, 110, 106, 109], [109, 110, 106, 107], [107, 112, 106, 111],
  [111, 114, 110, 113], [113, 114, 110, 111], [111, 116, 110, 116], [116, 119, 115, 118],
  [118, 120, 116, 117], [117, 122, 116, 122], [122, 125, 121, 124], [124, 127, 122, 126],
];
const X0 = 44, STEP = 30, W = 13;
const cx = (i) => X0 + i * STEP;

const SPAN_A = [[30, 104], [150, 108], [280, 113], [430, 116]];
const SPAN_B = [[30, 101], [150, 104], [280, 108], [430, 112]];
const TENKAN = [[44, 107], [140, 112], [240, 114], [340, 120], [426, 126]];
const KIJUN = [[44, 109], [140, 110], [240, 113], [340, 116], [426, 121]];

const toPts = (arr) => arr.map(([x, p]) => `${x},${py(p).toFixed(1)}`).join(' ');

function Candle({ i, o, h, l, c }) {
  const up = c >= o;
  const color = up ? '#16a34a' : '#dc2626';
  const x = cx(i);
  const top = Math.min(py(o), py(c));
  const bh = Math.max(Math.abs(py(o) - py(c)), 1.5);
  return (
    <g>
      <line x1={x} y1={py(h)} x2={x} y2={py(l)} stroke={color} strokeWidth="1.4" />
      <rect x={x - W / 2} y={top} width={W} height={bh} fill={color} rx="0.5" />
    </g>
  );
}

export default function IchimokuVisual() {
  const { t } = useTranslation();
  const cloud = toPts(SPAN_A) + ' ' + toPts([...SPAN_B].reverse());

  return (
    <Card className="border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/10">
      <CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <CandlestickChart className="w-5 h-5 text-red-500" /> {t('ichiVisTitle')}
        </h3>
        <svg viewBox="0 0 460 240" className="w-full h-auto rounded-lg bg-muted/20" role="img" aria-label={t('ichiVisTitle')}>
          {/* Kumo cloud (Span A over Span B → bullish) */}
          <polygon points={cloud} fill="#16a34a" fillOpacity="0.16" stroke="none" />
          <polyline points={toPts(SPAN_A)} fill="none" stroke="#16a34a" strokeWidth="1" opacity="0.6" />
          <polyline points={toPts(SPAN_B)} fill="none" stroke="#dc2626" strokeWidth="1" opacity="0.6" />
          {/* Kijun (slow, blue) + Tenkan (fast, orange) */}
          <polyline points={toPts(KIJUN)} fill="none" stroke="#3b82f6" strokeWidth="1.8" />
          <polyline points={toPts(TENKAN)} fill="none" stroke="#f59e0b" strokeWidth="1.8" />
          {/* Candles */}
          {CANDLES.map(([o, h, l, c], i) => <Candle key={i} i={i} o={o} h={h} l={l} c={c} />)}
          {/* Labels */}
          <text x="150" y={py(105.2).toFixed(1)} fontSize="11" fontWeight="700" fill="#16a34a">{t('ichiVisCloud')}</text>
          <text x="360" y={py(128).toFixed(1)} fontSize="10" fontWeight="700" fill="#f59e0b">Tenkan</text>
          <text x="360" y={py(114).toFixed(1)} fontSize="10" fontWeight="700" fill="#3b82f6">Kijun</text>
        </svg>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('ichiVisCaption')}</p>
      </CardContent>
    </Card>
  );
}
