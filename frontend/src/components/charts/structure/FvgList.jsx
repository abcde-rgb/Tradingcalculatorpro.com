import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { DIR_UI, fmtPrice } from './scannerMeta';

/**
 * Fair Value Gaps (desequilibrios de tres velas).
 *
 * Los que el backend marca como `sessionGap` son el salto entre el cierre de
 * una sesión y la apertura de la siguiente: pasan el test de tres velas todas
 * las noches y no son un desequilibrio intradía, es el mercado cerrado. Se
 * etiquetan y bajan al final de la lista en vez de desaparecer —el hueco de
 * precio es real y hay quien lo opera—, pero no cuentan como imbalance abierto.
 */
export default function FvgList({ fvgs, limit = 6 }) {
  const { t } = useTranslation();
  if (!fvgs || fvgs.length === 0) return null;

  return (
    <div className="space-y-1.5" data-testid="struct-fvgs">
      {fvgs.slice(0, limit).map((g, i) => {
        const dir = DIR_UI[g.direction] || DIR_UI.bullish;
        return (
          <div
            key={`${g.date}-${g.index}-${i}`}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
          >
            <span className={`font-mono ${dir.color}`}>{dir.icon} {t(`structDir_${g.direction}`)}</span>
            <span className="font-mono text-foreground">{fmtPrice(g.bottom)} – {fmtPrice(g.top)}</span>
            {g.sessionGap && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[#fbbf24]"
                title={t('structFvgSessionGapTip')}
                data-testid="struct-fvg-session"
              >
                {t('structFvgSessionGap')}
              </span>
            )}
            <span
              className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                g.filled ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'
              }`}
            >
              {t(g.filled ? 'structFvgFilled' : 'structFvgOpen')}
            </span>
            <span className="font-mono text-muted-foreground text-[10px]">{g.date}</span>
          </div>
        );
      })}
    </div>
  );
}
