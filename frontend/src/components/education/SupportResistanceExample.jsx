import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Maximize2, Info, Target } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import TopicDetailModal from './TopicDetailModal';

// Geometry of the range (viewBox 0 0 440 220)
const RES_Y = 45;      // resistance level
const SUPPORT_Y = 175; // support level
const PRICE_POINTS = [
  [10, 110], [55, 175], [110, 45], [165, 175],
  [220, 45], [275, 175], [330, 45], [385, 175], [430, 110],
];
const BOUNCES = [[55, 175], [165, 175], [275, 175], [385, 175]];     // green — demand
const REJECTIONS = [[110, 45], [220, 45], [330, 45]];                // red — supply

function SRChart({ showLabels = false }) {
  const { t } = useTranslation();
  const pts = PRICE_POINTS.map((p) => p.join(',')).join(' ');
  return (
    <svg
      viewBox="0 0 440 220"
      className="w-full h-auto"
      role="img"
      aria-label={t('srExampleTitle')}
    >
      {/* Resistance level */}
      <line x1="8" y1={RES_Y} x2="432" y2={RES_Y} stroke="#dc2626" strokeWidth="2" strokeDasharray="6 4" />
      {/* Support level */}
      <line x1="8" y1={SUPPORT_Y} x2="432" y2={SUPPORT_Y} stroke="#16a34a" strokeWidth="2" strokeDasharray="6 4" />
      {/* Price */}
      <polyline
        points={pts}
        fill="none"
        stroke="#64748b"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Rejections (supply) */}
      {REJECTIONS.map(([x, y], i) => (
        <circle key={`rej-${i}`} cx={x} cy={y} r="5" fill="#dc2626" />
      ))}
      {/* Bounces (demand) */}
      {BOUNCES.map(([x, y], i) => (
        <circle key={`bnc-${i}`} cx={x} cy={y} r="5" fill="#16a34a" />
      ))}
      {showLabels && (
        <>
          <text x="12" y={RES_Y - 8} fill="#dc2626" fontSize="13" fontWeight="700">
            {t('srResistance')}
          </text>
          <text x="12" y={SUPPORT_Y + 18} fill="#16a34a" fontSize="13" fontWeight="700">
            {t('srSupport')}
          </text>
        </>
      )}
    </svg>
  );
}

export default function SupportResistanceExample() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Compact, clickable card */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/50 transition-colors p-5 group"
        data-testid="sr-example-card"
        aria-label={t('srExampleTitle')}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{t('srExampleTitle')}</h3>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
            {t('srExampleHint')}
          </span>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <SRChart />
        </div>
      </button>

      {/* Expanded modal */}
      <AnimatePresence>
        {open && (
          <TopicDetailModal
            title={t('srExampleTitle')}
            subtitle={t('srModalSubtitle')}
            onClose={() => setOpen(false)}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Large diagram */}
              <div className="lg:sticky lg:top-20 self-start space-y-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <SRChart showLabels />
                </div>
                {/* Legend */}
                <div className="flex items-center gap-5 justify-center text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-long" />
                    {t('srBounce')}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-short" />
                    {t('srRejection')}
                  </span>
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" /> {t('srHowTitle')}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {t('srHowBody')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> {t('srUseTitle')}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {t('srUseBody')}
                  </p>
                </div>
              </div>
            </div>
          </TopicDetailModal>
        )}
      </AnimatePresence>
    </>
  );
}
