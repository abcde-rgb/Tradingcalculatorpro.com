import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { PATTERN_NAME_KEY, TYPE_BADGE, BEHAVIOR_KEY, rateColor } from '@/lib/candlePatternMeta';
import CandlePatternFigure from '@/components/education/CandlePatternFigure';
import { BASIS_KEY } from './scannerMeta';

/**
 * Señales de vela con mensaje direccional (reversión / continuación).
 *
 * Cada detección viaja con su temporalidad, sus fechas de apertura y de
 * confirmación y las medidas reales de la vela: es lo que permite contrastar
 * el aviso con el gráfico en vez de creérselo. Se reportó ver "tres soldados
 * blancos" en el registro, ir al gráfico y no encontrarlos — eran de otra
 * temporalidad, y no había forma de saberlo.
 */
export default function CandleSignals({ signals, fallbackInterval, limit = 6 }) {
  const { t } = useTranslation();
  if (!signals || signals.length === 0) return null;

  const patternName = (id) => (PATTERN_NAME_KEY[id] ? t(PATTERN_NAME_KEY[id]) : id);
  const behaviorLabel = (b) => (BEHAVIOR_KEY[b] ? t(BEHAVIOR_KEY[b]) : b);

  return (
    <div className="space-y-1.5" data-testid="struct-candles">
      {signals.slice(0, limit).map((d, i) => {
        const badge = TYPE_BADGE[d.type] || TYPE_BADGE.neutral;
        return (
          <div
            key={`${d.date}-${d.pattern_id}-${i}`}
            className={`flex items-center gap-2.5 rounded-md border ${badge.border} ${badge.bg} px-2.5 py-1.5`}
            data-testid={`struct-candle-${i}`}
          >
            <div className="flex-shrink-0 transform scale-[0.5] origin-left -mr-7 -my-2">
              <CandlePatternFigure patternId={d.pattern_id} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold truncate">{patternName(d.pattern_id)}</span>
                {/* La temporalidad, siempre a la vista. */}
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                  {d.interval || fallbackInterval}
                </span>
                <span className={`text-[10px] font-mono uppercase ${badge.color}`}>{badge.icon} {d.type}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted border border-border">
                  {behaviorLabel(d.behavior)}
                </span>
                {d.basis && BASIS_KEY[d.basis] && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground"
                    title={d.metrics
                      ? t('structBasisTip')
                        .replace('{body}', String(d.metrics.bodyPct))
                        .replace('{up}', String(d.metrics.upperWickPct))
                        .replace('{down}', String(d.metrics.lowerWickPct))
                      : undefined}
                  >
                    {t(BASIS_KEY[d.basis])}
                  </span>
                )}
                {typeof d.rate === 'number' && (
                  <span className={`text-[10px] font-mono font-bold ${rateColor(d.rate)}`}>{d.rate}%</span>
                )}
              </div>
            </div>
            {/* Un patrón de 3 velas ocupa 3 barras: sin la fecha de apertura
                había que contar velas hacia atrás a mano. */}
            <span className="font-mono text-muted-foreground text-[10px] ml-auto shrink-0 text-right leading-tight">
              {d.start_date && d.start_date !== d.date && (
                <>{t('structPatternOpens')} {d.start_date}<br /></>
              )}
              {t('structPatternConfirms')} {d.confirm_date || d.date}
            </span>
          </div>
        );
      })}
    </div>
  );
}
