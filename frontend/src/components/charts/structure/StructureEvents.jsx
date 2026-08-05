import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { DIR_UI, REASON_KEY, fmtPrice } from './scannerMeta';

/**
 * Rupturas de estructura (BOS / CHoCH).
 *
 * El backend numera las rupturas que caen una y otra vez sobre el MISMO nivel
 * (`repeat` / `repeatOf`). Aquí se muestra una fila por nivel roto —la ruptura
 * más reciente— con un contador «×N». Antes se listaban las N por separado, y
 * tres cruces del mismo máximo se leían como tres pruebas independientes de
 * fuerza cuando son justo lo contrario: un nivel que ya no frena a nadie.
 */
export default function StructureEvents({ events, limit = 8 }) {
  const { t } = useTranslation();
  if (!events || events.length === 0) return null;

  // Newest first, one row per (level, direction) group.
  const seen = new Map();
  for (const e of [...events].reverse()) {
    const key = `${e.repeatOf ?? e.index}|${e.direction}`;
    if (!seen.has(key)) seen.set(key, { ...e, times: e.repeat || 1 });
  }
  const rows = Array.from(seen.values()).slice(0, limit);

  const reasonList = (codes) => (codes || [])
    .map((code) => (REASON_KEY[code] ? t(REASON_KEY[code]) : code))
    .join(' · ');

  return (
    <div className="space-y-1.5" data-testid="struct-events">
      {rows.map((e, i) => {
        const dir = DIR_UI[e.direction] || DIR_UI.bullish;
        const isChoch = e.kind === 'CHoCH';
        const conf = e.confirmation || {};
        return (
          <div
            key={`${e.date}-${e.index}-${i}`}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
          >
            <span className={`font-semibold ${isChoch ? 'text-[#f59e0b]' : 'text-primary'}`}>
              {t(isChoch ? 'structChoch' : 'structBos')}
            </span>
            <span className={`font-mono ${dir.color}`}>{dir.icon} {t(`structDir_${e.direction}`)}</span>
            {e.times > 1 && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[#f59e0b]"
                title={t('structRepeatTip').replace('{n}', String(e.times))}
                data-testid="struct-event-repeat"
              >
                {t('structRepeatTag').replace('{n}', String(e.times))}
              </span>
            )}
            {/* Un cierre un tick por encima de un máximo no es una ruptura de
                estructura. La etiqueta dice si la evidencia está; el tooltip,
                cuál exactamente. */}
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                conf.confirmed ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-muted text-muted-foreground'
              }`}
              title={`${t('structEvidence')}: ${conf.score ?? 0}/100${conf.reasons?.length ? ` — ${reasonList(conf.reasons)}` : ''}`}
            >
              {conf.confirmed ? `✓ ${t('structConfirmedTag')}` : t('structUnconfirmedTag')}
            </span>
            <span className="font-mono text-muted-foreground ml-auto">{fmtPrice(e.price)}</span>
            <span className="font-mono text-muted-foreground/70 text-[10px]">{e.date}</span>
          </div>
        );
      })}
    </div>
  );
}
