import { Card, CardContent } from '@/components/ui/card';
import { CandlestickChart } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Simplified Ichimoku diagram: price above a bullish Kumo cloud (Span A over Span B),
 * with Tenkan-sen (fast) and Kijun-sen (slow) lines. Component names stay in the
 * original (language-neutral); only the cloud label and caption are translated.
 */
const SPAN_A = [[10, 150], [120, 140], [230, 132], [340, 122], [450, 112]];
const SPAN_B = [[10, 176], [120, 172], [230, 169], [340, 166], [450, 162]];
const PRICE = [[10, 120], [90, 98], [160, 112], [240, 78], [320, 92], [450, 58]];
const TENKAN = [[10, 128], [120, 108], [230, 100], [340, 90], [450, 72]];
const KIJUN = [[10, 141], [120, 136], [230, 129], [340, 123], [450, 117]];

const line = (pts) => pts.map((p) => p.join(',')).join(' ');

export default function IchimokuVisual() {
  const { t } = useTranslation();
  const cloud = line(SPAN_A) + ' ' + line([...SPAN_B].reverse());

  return (
    <Card className="border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/10">
      <CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <CandlestickChart className="w-5 h-5 text-red-500" /> {t('ichiVisTitle')}
        </h3>
        <svg viewBox="0 0 460 240" className="w-full h-auto rounded-lg bg-muted/20" role="img" aria-label={t('ichiVisTitle')}>
          {/* Kumo cloud (Span A over Span B → bullish, green) */}
          <polygon points={cloud} fill="#16a34a" fillOpacity="0.18" stroke="none" />
          <polyline points={line(SPAN_A)} fill="none" stroke="#16a34a" strokeWidth="1" opacity="0.6" />
          <polyline points={line(SPAN_B)} fill="none" stroke="#dc2626" strokeWidth="1" opacity="0.6" />
          {/* Kijun (slow, blue) + Tenkan (fast, orange) */}
          <polyline points={line(KIJUN)} fill="none" stroke="#3b82f6" strokeWidth="1.8" />
          <polyline points={line(TENKAN)} fill="none" stroke="#f59e0b" strokeWidth="1.8" />
          {/* Price */}
          <polyline points={line(PRICE)} fill="none" stroke="#111827" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" className="dark:stroke-white" />
          {/* Labels */}
          <text x="60" y="160" fontSize="11" fontWeight="700" fill="#16a34a">{t('ichiVisCloud')}</text>
          <text x="360" y="70" fontSize="10" fontWeight="700" fill="#f59e0b">Tenkan</text>
          <text x="360" y="132" fontSize="10" fontWeight="700" fill="#3b82f6">Kijun</text>
        </svg>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('ichiVisCaption')}</p>
      </CardContent>
    </Card>
  );
}
