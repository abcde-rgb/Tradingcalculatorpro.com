import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { PATTERN_NAME_KEY, BEHAVIOR_KEY } from '@/lib/candlePatternMeta';
import { DAY_MS } from '@/lib/structureLog';
import { DIR_UI, fmtPrice } from './scannerMeta';

const relTime = (ts, t) => {
  const diff = Date.now() - ts;
  if (diff < 60 * 60 * 1000) return t('structLogJustNow');
  if (diff < DAY_MS) return t('structLogHoursAgo').replace('{h}', String(Math.floor(diff / (60 * 60 * 1000))));
  return t('structLogDaysAgo').replace('{d}', String(Math.floor(diff / DAY_MS)));
};

/**
 * Registro persistente: lo que el escáner ha ido detectando en ESTE activo y
 * ESTA temporalidad, y que sobrevive a recargar la página.
 *
 * Guardado por activo **y temporalidad**: antes se guardaba solo por activo,
 * así que una detección de 15 minutos y una diaria caían en la misma lista sin
 * nada que las distinguiera. El registro respondía a una pregunta distinta de
 * la que el usuario estaba mirando.
 */
export default function ScanLog({ log, onClear }) {
  const { t } = useTranslation();
  if (!log || log.length === 0) return null;

  const patternName = (id) => (PATTERN_NAME_KEY[id] ? t(PATTERN_NAME_KEY[id]) : id);
  const behaviorLabel = (b) => (BEHAVIOR_KEY[b] ? t(BEHAVIOR_KEY[b]) : b);

  return (
    <div data-testid="struct-log">
      <div className="flex items-center justify-end mb-2">
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-short transition-colors"
          data-testid="struct-log-clear"
        >
          <Trash2 className="w-3 h-3" />
          {t('structLogClear')}
        </button>
      </div>
      <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
        {log.map((e) => {
          const dir = DIR_UI[e.dir];
          const isNew = Date.now() - e.ts < DAY_MS;
          const label = e.cat === 'candle'
            ? patternName(e.pid)
            : t(e.kind === 'CHoCH' ? 'structChoch' : 'structBos');
          return (
            <div
              key={e.id}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                isNew ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              {isNew && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                  title={t('structLogNew').replace('{n}', '')}
                />
              )}
              <span className="font-semibold truncate max-w-[130px]">{label}</span>
              {e.tf && (
                <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-primary/15 text-primary shrink-0">
                  {e.tf}
                </span>
              )}
              {e.cat === 'candle' && e.behavior && (
                <span className="text-[9px] text-muted-foreground uppercase">{behaviorLabel(e.behavior)}</span>
              )}
              {dir && <span className={`font-mono ${dir.color}`}>{dir.icon}</span>}
              {e.price != null && <span className="font-mono text-muted-foreground">{fmtPrice(e.price)}</span>}
              <span className="font-mono text-muted-foreground text-[10px] ml-auto shrink-0">{e.date}</span>
              <span className="text-[9px] text-muted-foreground shrink-0 hidden sm:inline">· {relTime(e.ts, t)}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed pt-1.5">
        {t('structLogNote')} {t('structLogScopeNote')}
      </p>
    </div>
  );
}
