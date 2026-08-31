import { Card, CardContent } from '@/components/ui/card';
import { CandlestickChart, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Self-explanatory Ichimoku diagram (candlesticks) + colour legend + when-bullish /
 * when-bearish boxes, so a beginner can connect each coloured element on the chart
 * with what it means. Colours are consistent between the drawing, the legend and the
 * bull/bear rules.
 *   Tenkan = orange · Kijun = blue · Span A = green · Span B = red · cloud fill =
 *   green(bull)/red(bear) · Chikou = purple · price = green/red candles.
 */
const C = { tenkan: '#f59e0b', kijun: '#3b82f6', spanA: '#16a34a', spanB: '#dc2626', chikou: '#a855f7' };
// price → y (viewBox 0 0 460 240). Domain [100,132] mapped to y [220,24].
const py = (p) => 220 - ((p - 100) / 32) * 196;
const CANDLES = [
  [106, 108, 105, 107], [107, 110, 106, 109], [109, 110, 106, 107], [107, 112, 106, 111],
  [111, 114, 110, 113], [113, 114, 110, 111], [111, 116, 110, 116], [116, 119, 115, 118],
  [118, 120, 116, 117], [117, 122, 116, 122], [122, 125, 121, 124], [124, 127, 122, 126],
];
const X0 = 60, STEP = 28, W = 12;
const cx = (i) => X0 + i * STEP;
const SPAN_A = [[40, 104], [160, 108], [290, 113], [430, 116]];
const SPAN_B = [[40, 101], [160, 104], [290, 108], [430, 112]];
const TENKAN = [[60, 107], [144, 112], [228, 114], [340, 120], [424, 126]];
const KIJUN = [[60, 109], [144, 110], [228, 113], [340, 116], [424, 121]];
const toPts = (arr) => arr.map(([x, p]) => `${x},${py(p).toFixed(1)}`).join(' ');
// Chikou = current close plotted ~5 candles back (shifted left)
const CHIKOU = CANDLES.map((c, i) => [cx(Math.max(i - 5, 0)), c[3]]).slice(5).map(([x, p]) => `${x},${py(p).toFixed(1)}`).join(' ');

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

function Sw({ color }) {
  return <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1.5" style={{ background: color }} />;
}

export default function IchimokuVisual() {
  const { t } = useTranslation();
  const cloud = toPts(SPAN_A) + ' ' + toPts([...SPAN_B].reverse());

  return (
    <Card className="border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/10">
      <CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <CandlestickChart className="w-5 h-5 text-short" /> {t('ichiVisTitle')}
        </h3>

        <svg viewBox="0 0 460 240" className="w-full h-auto rounded-lg bg-muted/20" role="img" aria-label={t('ichiVisTitle')}>
          <polygon points={cloud} fill={C.spanA} fillOpacity="0.16" stroke="none" />
          <polyline points={toPts(SPAN_A)} fill="none" stroke={C.spanA} strokeWidth="1" opacity="0.65" />
          <polyline points={toPts(SPAN_B)} fill="none" stroke={C.spanB} strokeWidth="1" opacity="0.65" />
          <polyline points={CHIKOU} fill="none" stroke={C.chikou} strokeWidth="1.6" strokeDasharray="4 3" />
          <polyline points={toPts(KIJUN)} fill="none" stroke={C.kijun} strokeWidth="1.8" />
          <polyline points={toPts(TENKAN)} fill="none" stroke={C.tenkan} strokeWidth="1.8" />
          {CANDLES.map(([o, h, l, c], i) => <Candle key={i} i={i} o={o} h={h} l={l} c={c} />)}
          {/* on-chart labels */}
          <text x="165" y={py(105.4).toFixed(1)} fontSize="11" fontWeight="700" fill={C.spanA}>{t('ichiVisCloud')}</text>
          <text x="360" y={py(128.2).toFixed(1)} fontSize="10" fontWeight="700" fill={C.tenkan}>Tenkan</text>
          <text x="360" y={py(114).toFixed(1)} fontSize="10" fontWeight="700" fill={C.kijun}>Kijun</text>
          <text x="70" y={py(103).toFixed(1)} fontSize="10" fontWeight="700" fill={C.chikou}>Chikou</text>
        </svg>

        {/* colour legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          <span><Sw color={C.tenkan} />{t('ichiVisTenkan')}</span>
          <span><Sw color={C.kijun} />{t('ichiVisKijun')}</span>
          <span><Sw color={C.chikou} />{t('ichiVisChikou')}</span>
          <span><Sw color={C.spanA} />{t('ichiVisCloudLegend')}</span>
        </div>

        {/* when bullish / when bearish */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
            <div className="flex items-center gap-2 mb-1.5 font-semibold text-sm text-long dark:text-long">
              <TrendingUp className="w-4 h-4" /> {t('ichiVisBullTitle')}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{t('ichiVisBullBody')}</p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 mb-1.5 font-semibold text-sm text-short dark:text-short">
              <TrendingDown className="w-4 h-4" /> {t('ichiVisBearTitle')}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{t('ichiVisBearBody')}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <span className="text-warn font-bold">!</span>
          <p className="text-xs text-muted-foreground leading-relaxed">{t('ichiVisNeutral')}</p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{t('ichiVisCaption')}</p>
      </CardContent>
    </Card>
  );
}
