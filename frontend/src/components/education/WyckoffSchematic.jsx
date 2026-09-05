import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Repeat } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Labeled SVG schematics of the classic Wyckoff ranges for the Wyckoff tab:
 *   • Accumulation  — PS, SC, AR, ST, Spring, Test, SOS, LPS → markup
 *   • Distribution  — PSY, BC, AR, ST, UT, UTAD, SOW, LPSY → markdown
 * Point abbreviations are language-neutral; a legend (built from t()) explains
 * each one. Phases A–E are drawn as background bands.
 */

const W = 640;
const H = 300;

// ---- Accumulation: lower y = higher price (SVG y grows downward) ----
const ACC = {
  support: 206,
  resistance: 96,
  path: [
    [12, 60], [70, 150], [120, 212], [180, 92], [240, 198],
    [300, 120], [352, 228], [392, 188], [452, 84], [504, 132], [600, 40],
  ],
  marks: [
    { x: 70, y: 150, l: 'PS', up: true },
    { x: 120, y: 212, l: 'SC', up: false },
    { x: 180, y: 92, l: 'AR', up: true },
    { x: 240, y: 198, l: 'ST', up: false },
    { x: 352, y: 228, l: 'Spring', up: false },
    { x: 452, y: 84, l: 'SOS', up: true },
    { x: 504, y: 132, l: 'LPS', up: false },
  ],
  phases: [
    { x: 40, w: 92, label: 'A' },
    { x: 132, w: 200, label: 'B' },
    { x: 332, w: 78, label: 'C' },
    { x: 410, w: 110, label: 'D' },
    { x: 520, w: 110, label: 'E' },
  ],
};

// ---- Distribution: vertical mirror of accumulation ----
const DIST = {
  support: 200,
  resistance: 90,
  path: [
    [12, 236], [70, 146], [120, 60], [180, 180], [240, 70],
    [300, 150], [352, 50], [392, 36], [452, 188], [504, 140], [600, 250],
  ],
  marks: [
    { x: 70, y: 146, l: 'PSY', up: true },
    { x: 120, y: 60, l: 'BC', up: true },
    { x: 180, y: 180, l: 'AR', up: false },
    { x: 240, y: 70, l: 'ST', up: true },
    { x: 352, y: 50, l: 'UT', up: true },
    { x: 392, y: 36, l: 'UTAD', up: true },
    { x: 452, y: 188, l: 'SOW', up: false },
    { x: 504, y: 140, l: 'LPSY', up: true },
  ],
  phases: [
    { x: 40, w: 92, label: 'A' },
    { x: 132, w: 200, label: 'B' },
    { x: 332, w: 78, label: 'C' },
    { x: 410, w: 110, label: 'D' },
    { x: 520, w: 110, label: 'E' },
  ],
};

function Schematic({ data, color, title }) {
  const pts = data.path.map((p) => p.join(',')).join(' ');
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title} className="rounded-lg bg-muted/20">
        {/* phase bands */}
        {data.phases.map((ph, i) => (
          <g key={ph.label}>
            <rect x={ph.x} y={28} width={ph.w} height={232} fill="currentColor" className="text-muted-foreground" opacity={i % 2 === 0 ? 0.05 : 0.1} />
            <text x={ph.x + ph.w / 2} y={278} textAnchor="middle" fontSize="11" className="fill-muted-foreground" fontFamily="monospace">{ph.label}</text>
          </g>
        ))}
        {/* support / resistance */}
        <line x1="40" y1={data.resistance} x2="600" y2={data.resistance} stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.55" />
        <line x1="40" y1={data.support} x2="600" y2={data.support} stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.55" />
        {/* price path */}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {/* marks */}
        {data.marks.map((m) => (
          <g key={m.l}>
            <circle cx={m.x} cy={m.y} r="3.5" fill={color} />
            <text
              x={m.x}
              y={m.up ? m.y - 8 : m.y + 16}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="700"
              fill={color}
              fontFamily="monospace"
            >
              {m.l}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const WyckoffSchematic = () => {
  const { t } = useTranslation();

  const accLegend = [
    ['PS', t('wyckoffPsName')], ['SC', t('wyckoffScName')], ['AR', t('wyckoffArName')],
    ['ST', t('wyckoffStName')], ['Spring', t('wyckoffSpringName')], ['SOS', t('wyckoffSosName')],
    ['LPS', t('wyckoffLPSName')],
  ];
  const distLegend = [
    ['PSY', t('wyckoffPSYName')], ['BC', t('wyckoffBCName')], ['AR', t('wyckoffArName')],
    ['ST', t('wyckoffStName')], ['UT', t('wyckoffUTName')], ['UTAD', t('wyckoffUtadName')],
    ['SOW', t('wyckoffSowName')], ['LPSY', t('wyckoffLPSYName')],
  ];

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/10" data-testid="wyckoff-schematic">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Layers className="w-5 h-5 text-warn" />
          {t('wyckoffSchematicTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('wyckoffSchematicIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Schematic data={ACC} color="#22c55e" title={t('wyckoffAccSchematic')} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {accLegend.map(([abbr, name]) => (
                <span key={abbr}><span className="font-mono font-semibold text-long">{abbr}</span> {name}</span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Schematic data={DIST} color="#ef4444" title={t('wyckoffDistSchematic')} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {distLegend.map(([abbr, name]) => (
                <span key={abbr}><span className="font-mono font-semibold text-short">{abbr}</span> {name}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Re-accumulation vs re-distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Repeat className="w-4 h-4 text-long" />
              <span className="font-semibold text-sm">{t('wyckoffReaccName')}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('wyckoffReaccDesc')}</p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Repeat className="w-4 h-4 text-short" />
              <span className="font-semibold text-sm">{t('wyckoffRedistName')}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('wyckoffRedistDesc')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WyckoffSchematic;
