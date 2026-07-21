import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Tarjeta educativa: formaciones SIMÉTRICAS (convergentes — la volatilidad se
 * comprime) vs DISTENDIDAS/ensanchadas (divergentes — la volatilidad crece).
 * Diagramas SVG neutrales de idioma; textos por i18n (svb*).
 */

const UP = '#22c55e';
const DOWN = '#ef4444';
const MUT = '#94a3b8';

const fy = (y) => 60 - y;
const pts = (p) => p.map(([x, y]) => `${x},${fy(y)}`).join(' ');

const ConvergingSVG = () => (
  <svg viewBox="0 0 100 60" className="w-full h-auto" role="img" aria-label="converging pattern">
    <line x1="8" y1={fy(46)} x2="66" y2={fy(32)} stroke={MUT} strokeWidth="1" strokeDasharray="3 2.5" opacity="0.75" />
    <line x1="8" y1={fy(14)} x2="66" y2={fy(28)} stroke={MUT} strokeWidth="1" strokeDasharray="3 2.5" opacity="0.75" />
    <polyline
      points={pts([[4, 30], [12, 44], [22, 18], [32, 40], [42, 24], [52, 35], [60, 29]])}
      fill="none" stroke={MUT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    />
    <polyline
      points={pts([[60, 29], [74, 50]])}
      fill="none" stroke={UP} strokeWidth="2.25" strokeLinecap="round"
    />
    <path d={`M 71 ${fy(50) + 4} L 74 ${fy(50)} L 77 ${fy(50) + 4}`} fill="none" stroke={UP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BroadeningSVG = () => (
  <svg viewBox="0 0 100 60" className="w-full h-auto" role="img" aria-label="broadening pattern">
    <line x1="8" y1={fy(34)} x2="66" y2={fy(54)} stroke={MUT} strokeWidth="1" strokeDasharray="3 2.5" opacity="0.75" />
    <line x1="8" y1={fy(26)} x2="66" y2={fy(8)} stroke={MUT} strokeWidth="1" strokeDasharray="3 2.5" opacity="0.75" />
    <polyline
      points={pts([[4, 30], [14, 36], [24, 23], [36, 44], [48, 16], [60, 52], [68, 20]])}
      fill="none" stroke={MUT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    />
    <polyline
      points={pts([[68, 20], [80, 6]])}
      fill="none" stroke={DOWN} strokeWidth="2.25" strokeLinecap="round"
    />
    <path d={`M 77 ${fy(6) - 4} L 80 ${fy(6)} L 83 ${fy(6) - 4}`} fill="none" stroke={DOWN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SymVsBroadeningCard() {
  const { t } = useTranslation();
  return (
    <Card className="bg-card border-border" data-testid="sym-vs-broadening-card">
      <CardContent className="p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-1.5">
          <Scale className="w-4 h-4 text-primary" /> {t('svbTitle')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{t('svbIntro')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="max-w-[240px] mx-auto"><ConvergingSVG /></div>
            <p className="font-semibold text-sm mt-2">{t('svbSymTitle')}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t('svbSymDesc')}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="max-w-[240px] mx-auto"><BroadeningSVG /></div>
            <p className="font-semibold text-sm mt-2">{t('svbBroadTitle')}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t('svbBroadDesc')}</p>
          </div>
        </div>
        <p className="text-xs text-primary/90 mt-3">💡 {t('svbTip')}</p>
      </CardContent>
    </Card>
  );
}
