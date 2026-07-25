import { Card, CardContent } from '@/components/ui/card';
import { Crosshair } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Smart Money / ICT schematic: price sweeps liquidity below a prior low, leaves an
 * order block and a fair value gap on the reversal, then moves up. Uses short codes
 * (OB / FVG) on the drawing and a translated legend that reuses the glossary terms
 * (gl66t order block, gl67t fair value gap, gl15t liquidity).
 */
const PRICE = [
  [12, 78], [70, 120], [130, 152], [178, 172],
  [202, 198], [220, 158], [300, 112], [380, 72], [448, 54],
];
const LIQ_Y = 180;

export default function SmartMoneyVisual() {
  const { t } = useTranslation();
  const price = PRICE.map((p) => p.join(',')).join(' ');

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/10">
      <CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-purple-500" /> {t('smcVisTitle')}
        </h3>
        <svg viewBox="0 0 460 240" className="w-full h-auto rounded-lg bg-muted/20" role="img" aria-label={t('smcVisTitle')}>
          {/* Liquidity resting below a prior low */}
          <line x1="8" y1={LIQ_Y} x2="452" y2={LIQ_Y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x="352" y={LIQ_Y - 5} fontSize="10" fontWeight="700" fill="#f59e0b">{t('gl15t')}</text>
          {/* Order block zone (last down move before reversal) */}
          <rect x="186" y="150" width="42" height="42" fill="#a855f7" fillOpacity="0.18" stroke="#a855f7" strokeWidth="1" />
          <text x="207" y="146" textAnchor="middle" fontSize="10" fontWeight="700" fill="#a855f7">OB</text>
          {/* Fair value gap on the up impulse */}
          <rect x="250" y="112" width="52" height="34" fill="#3b82f6" fillOpacity="0.16" stroke="#3b82f6" strokeWidth="1" />
          <text x="276" y="108" textAnchor="middle" fontSize="10" fontWeight="700" fill="#3b82f6">FVG</text>
          {/* Sweep marker */}
          <circle cx="202" cy="198" r="4" fill="#dc2626" />
          <text x="150" y="212" fontSize="10" fontWeight="700" fill="#dc2626">{t('smcVisSweep')} ↓</text>
          {/* Price */}
          <polyline points={price} fill="none" stroke="#111827" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" className="dark:stroke-white" />
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
