import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fmtMoney, fmtNum, fmtPct, fmtPrice } from './productMeta';

/**
 * El panel que contesta, mientras escribes, a la única pregunta que importa
 * antes de mandar una orden: **¿cuánto mercado tengo delante y qué me juego?**
 *
 * Va arriba, no abajo, y no está plegado. La tentación era meterlo en un
 * acordeón con el resto de lo accesorio; no lo es: el aviso de que la posición
 * vale veinte veces tu cuenta llega tarde si hay que abrir algo para verlo.
 *
 * Tres bloques y en este orden:
 *   1. **Tamaño** — nocional, margen, exposición. Es lo que decide si la
 *      operación es grande, y no el número de la X.
 *   2. **Riesgo** — lo que pierdes si sale mal, en dinero y en las tres
 *      referencias que significan cosas distintas (monto total, cuenta, margen).
 *   3. **Liquidación** — sólo cuando hay apalancamiento, y siempre etiquetada
 *      como estimación.
 *
 * Todo lo que no se puede calcular se pinta como raya. Un cero aquí sería
 * mentir sobre un riesgo que nadie ha medido.
 */
export default function LivePosition({ metrics, spec, costsTotal, rrFloor }) {
  const { t } = useTranslation();
  const m = metrics || {};
  const overExposed = m.exposureExceeded === true;
  const rrBad = m.rrBelowFloor === true;

  return (
    <div
      className="rounded-xl border border-border bg-muted/40 overflow-hidden"
      data-testid="trade-live-position"
    >
      {/* 1 · Tamaño de la posición */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <Cell label={t('tfNotional')} value={fmtMoney(m.notional)} hint={t('tfNotionalHint')} testid="live-notional" />
        <Cell label={t('tfMargin')} value={fmtMoney(m.marginUsed)} hint={t('tfMarginHint')} testid="live-margin" />
        <Cell
          label={t('tfExposure')}
          value={m.exposureMultiple == null ? '—' : `${fmtNum(m.exposureMultiple, 1)}×`}
          hint={t('tfExposureHint').replace('{n}', String(m.maxExposureMultiple ?? 10))}
          tone={overExposed ? 'bad' : undefined}
          testid="live-exposure"
        />
        <Cell
          label={t('tfRiskAmount')}
          value={fmtMoney(m.riskAmount)}
          hint={m.riskPctBalance == null ? t('tfRiskNoStop') : `${fmtPct(m.riskPctBalance)} ${t('tfRiskOnBalance')}`}
          tone={m.riskAmount == null ? 'muted' : undefined}
          testid="live-risk"
        />
      </div>

      {overExposed && (
        <Banner tone="bad" icon={<ShieldAlert className="w-4 h-4" />} testid="live-exposure-warn">
          {t('tfExposureOver')
            .replace('{x}', fmtNum(m.exposureMultiple, 1))
            .replace('{n}', String(m.maxExposureMultiple ?? 10))
            .replace('{notional}', fmtMoney(m.notional, 0))}
        </Banner>
      )}

      {/* 2 · Riesgo y recompensa, medidos sobre la posición abierta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pb-4 border-t border-border pt-3">
        <Cell label={t('tfRewardAmount')} value={fmtMoney(m.rewardAmount)} testid="live-reward" />
        <Cell
          label={t('tradeRR')}
          value={m.rr == null ? '—' : `1:${fmtNum(m.rr)}`}
          hint={t('tfRRFloor').replace('{n}', String(rrFloor))}
          tone={rrBad ? 'bad' : (m.rr != null ? 'good' : undefined)}
          testid="live-rr"
        />
        <Cell
          label={t('tfMaxLoss')}
          value={fmtMoney(m.maxLoss)}
          hint={m.maxLossSource ? t(`tfMaxLossFrom_${m.maxLossSource}`) : t('tfMaxLossUndefined')}
          testid="live-maxloss"
        />
        <Cell
          label={t('tfRiskOnMarginLabel')}
          value={fmtPct(m.riskPctMargin)}
          hint={t('tfRiskOnNotionalShort').replace('{v}', fmtPct(m.riskPctNotional))}
          testid="live-risk-margin"
        />
      </div>

      {rrBad && (
        <Banner tone="bad" icon={<AlertTriangle className="w-4 h-4" />} testid="live-rr-warn">
          {t('tfRRFloorWarn').replace('{v}', fmtNum(m.rr))}
        </Banner>
      )}

      {/* 3 · Liquidación — sólo donde existe */}
      {m.liquidationPrice != null && (
        <div className="px-4 pb-4 pt-3 border-t border-border">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('tfLiquidation')}
            </span>
            <span className={`font-mono font-bold ${m.liquidationBeforeStop ? 'text-[#ef4444]' : 'text-foreground'}`}
              data-testid="live-liquidation"
            >
              {fmtPrice(m.liquidationPrice, spec?.tickSize)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              ({fmtPct(m.liquidationDistancePct, 1)})
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
            {t('tfLiquidationHint')}
          </p>
          {m.liquidationBeforeStop && (
            <p className="text-[11px] text-[#ef4444] font-semibold mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {t('tfLiqBeforeStop')}
            </p>
          )}
        </div>
      )}

      {costsTotal ? (
        <div className="px-4 py-2 border-t border-border text-[11px] text-muted-foreground">
          {t('tfCostsTotal')}: <span className="font-mono font-semibold text-foreground">{fmtMoney(costsTotal)}</span>
        </div>
      ) : null}
    </div>
  );
}

const TONES = {
  bad: 'text-[#ef4444]',
  good: 'text-[#22c55e]',
  muted: 'text-muted-foreground',
};

function Cell({ label, value, hint, tone, testid }) {
  return (
    <div data-testid={testid}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base font-bold font-mono ${TONES[tone] || 'text-foreground'}`}>{value}</div>
      {hint && <div className="text-[9px] text-muted-foreground/80 mt-0.5 leading-tight">{hint}</div>}
    </div>
  );
}

function Banner({ tone, icon, children, testid }) {
  const cls = tone === 'bad'
    ? 'bg-[#ef4444]/10 border-[#ef4444]/40 text-[#ef4444]'
    : 'bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b]';
  return (
    <div className={`flex items-start gap-2 px-4 py-2 border-t text-[11px] font-semibold leading-relaxed ${cls}`}
      data-testid={testid}
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
