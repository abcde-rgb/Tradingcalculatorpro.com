import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, EyeOff, Waves, Snowflake } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Order-book visual primer for the Market Mechanics tab.
 *
 * 1. A small SVG limit order book (asks above, bids below the spread) where
 *    bar length = resting volume — so a reader can SEE what "depth", "spread"
 *    and "liquidity" actually mean.
 * 2. Cards explaining ICEBERG and HIDDEN / RESERVE orders — the institutional
 *    order types that hide true size from this very book.
 */

// price ladder: asks (sell side) on top in red, bids (buy side) below in green.
const ASKS = [
  { price: '100.05', vol: 38 },
  { price: '100.04', vol: 22 },
  { price: '100.03', vol: 64 }, // iceberg level — small visible tip
  { price: '100.02', vol: 15 },
  { price: '100.01', vol: 30 },
];
const BIDS = [
  { price: '99.99', vol: 28 },
  { price: '99.98', vol: 52 },
  { price: '99.97', vol: 18 },
  { price: '99.96', vol: 40 },
  { price: '99.95', vol: 25 },
];

const MAX = 70;
const ROW_H = 22;
const W = 260;
const LABEL_W = 52;
const BAR_W = W - LABEL_W - 8;

function OrderBookSVG({ t }) {
  const rows = [...ASKS, { spread: true }, ...BIDS];
  let y = 0;
  return (
    <svg viewBox={`0 0 ${W} ${rows.length * ROW_H + 4}`} width="100%" className="max-w-[320px]" role="img" aria-label={t('otOrderBookTitle')}>
      {rows.map((r, i) => {
        const cy = y;
        y += ROW_H;
        if (r.spread) {
          return (
            <g key={`sp-${i}`}>
              <rect x="0" y={cy} width={W} height={ROW_H} fill="currentColor" className="text-muted-foreground" opacity="0.12" />
              <text x={LABEL_W / 2} y={cy + ROW_H / 2 + 3} textAnchor="middle" fontSize="9" className="fill-muted-foreground" fontFamily="monospace">
                {t('otSpread')}
              </text>
            </g>
          );
        }
        const isAsk = ASKS.includes(r);
        const barLen = (r.vol / MAX) * BAR_W;
        const color = isAsk ? '#ef4444' : '#22c55e';
        const isIceberg = r.price === '100.03';
        return (
          <g key={r.price}>
            <text x={LABEL_W - 6} y={cy + ROW_H / 2 + 3} textAnchor="end" fontSize="9.5" fontFamily="monospace" fill={color}>
              {r.price}
            </text>
            <rect x={LABEL_W} y={cy + 4} width={barLen} height={ROW_H - 8} rx="2" fill={color} opacity={isIceberg ? 0.45 : 0.8} />
            {isIceberg && (
              <>
                {/* hidden portion of the iceberg shown as a dashed extension */}
                <rect x={LABEL_W + barLen} y={cy + 4} width={BAR_W - barLen} height={ROW_H - 8} rx="2" fill={color} opacity="0.12" stroke={color} strokeDasharray="3 2" strokeWidth="1" />
                <text x={W - 4} y={cy + ROW_H / 2 + 3} textAnchor="end" fontSize="8" className="fill-muted-foreground" fontFamily="monospace">🧊</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const OrderTypesGuide = () => {
  const { t } = useTranslation();

  const advanced = [
    { id: 'iceberg', icon: Snowflake, color: 'text-info', ring: 'border-cyan-500/30 bg-cyan-500/5', name: t('otIcebergName'), desc: t('otIcebergDesc') },
    { id: 'hidden', icon: EyeOff, color: 'text-compare', ring: 'border-purple-500/30 bg-purple-500/5', name: t('otHiddenName'), desc: t('otHiddenDesc') },
    { id: 'oco', icon: Layers, color: 'text-info', ring: 'border-blue-500/30 bg-blue-500/5', name: t('otOcoName'), desc: t('otOcoDesc') },
    { id: 'fokioc', icon: Waves, color: 'text-warn', ring: 'border-amber-500/30 bg-amber-500/5', name: t('otFokIocName'), desc: t('otFokIocDesc') },
  ];

  return (
    <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/10 border-blue-500/30" data-testid="order-types-guide">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Layers className="w-5 h-5 text-info" />
          {t('otGuideTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('otGuideIntro')}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Order book visual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('otOrderBookTitle')}</p>
            <OrderBookSVG t={t} />
          </div>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p><span className="text-short font-semibold">{t('otAsksLabel')}</span> — {t('otAsksDesc')}</p>
            <p><span className="text-long font-semibold">{t('otBidsLabel')}</span> — {t('otBidsDesc')}</p>
            <p><span className="text-foreground font-semibold">{t('otDepthLabel')}</span> — {t('otDepthDesc')}</p>
            <p className="flex items-start gap-1.5"><span>🧊</span><span>{t('otIcebergHint')}</span></p>
          </div>
        </div>

        {/* Advanced / institutional order types */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('otAdvancedTitle')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {advanced.map((o) => {
              const Icon = o.icon;
              return (
                <div key={o.id} className={`rounded-xl border p-4 ${o.ring}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`w-4 h-4 ${o.color}`} />
                    <span className="font-semibold text-sm">{o.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{o.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderTypesGuide;
