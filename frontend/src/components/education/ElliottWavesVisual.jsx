import { Card, CardContent } from '@/components/ui/card';
import { Waves } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Elliott 5-3 structure diagram: five motive waves (1-5) in the trend direction
 * followed by a three-wave (A-B-C) correction. Labels are minimal and translated;
 * the wave numbers/letters are language-neutral.
 */
const GREEN = '#16a34a';
const RED = '#dc2626';

// Motive 1-5 (net up) then corrective A-B-C (down). viewBox 0 0 460 240, y down = lower price.
const MOTIVE = [[12, 205], [70, 150], [110, 178], [190, 92], [230, 128], [285, 55]];
const CORR = [[285, 55], [330, 120], [368, 88], [430, 150]];
const MOTIVE_LABELS = [
  { x: 70, y: 150, t: '1', up: true }, { x: 110, y: 178, t: '2', up: false },
  { x: 190, y: 92, t: '3', up: true }, { x: 230, y: 128, t: '4', up: false },
  { x: 285, y: 55, t: '5', up: true },
];
const CORR_LABELS = [
  { x: 330, y: 120, t: 'A', up: false }, { x: 368, y: 88, t: 'B', up: true },
  { x: 430, y: 150, t: 'C', up: false },
];

export default function ElliottWavesVisual() {
  const { t } = useTranslation();
  const motive = MOTIVE.map((p) => p.join(',')).join(' ');
  const corr = CORR.map((p) => p.join(',')).join(' ');

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-blue-500/10">
      <CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Waves className="w-5 h-5 text-indigo-500" /> {t('ewVisTitle')}
        </h3>
        <svg viewBox="0 0 460 240" className="w-full h-auto rounded-lg bg-muted/20" role="img" aria-label={t('ewVisTitle')}>
          {/* motive */}
          <polyline points={motive} fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {/* corrective */}
          <polyline points={corr} fill="none" stroke={RED} strokeWidth="2.5" strokeDasharray="1 0" strokeLinejoin="round" strokeLinecap="round" />
          {MOTIVE_LABELS.map((m) => (
            <g key={m.t}>
              <circle cx={m.x} cy={m.y} r="4" fill={GREEN} />
              <text x={m.x} y={m.up ? m.y - 9 : m.y + 16} textAnchor="middle" fontSize="13" fontWeight="700" fill={GREEN}>{m.t}</text>
            </g>
          ))}
          {CORR_LABELS.map((m) => (
            <g key={m.t}>
              <circle cx={m.x} cy={m.y} r="4" fill={RED} />
              <text x={m.x} y={m.up ? m.y - 9 : m.y + 16} textAnchor="middle" fontSize="13" fontWeight="700" fill={RED}>{m.t}</text>
            </g>
          ))}
        </svg>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-2"><span className="w-3 h-1.5 rounded bg-[#16a34a]" />{t('ewVisImpulse')}</span>
          <span className="inline-flex items-center gap-2"><span className="w-3 h-1.5 rounded bg-[#dc2626]" />{t('ewVisCorrective')}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('ewVisCaption')}</p>
      </CardContent>
    </Card>
  );
}
