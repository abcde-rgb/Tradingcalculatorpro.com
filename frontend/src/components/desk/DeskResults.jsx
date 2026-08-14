import React from 'react';
import { AlertTriangle, ShieldAlert, Skull } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fmtMoney, fmtNum, fmtPct, fmtPrice } from '@/components/performance/form/productMeta';
import { MARGIN_MODE_META } from './deskMeta';

/**
 * Todo lo que se puede calcular de la posición, una vez decidido el tamaño.
 *
 * Cuatro bloques y en este orden, que es el orden en que hacen falta:
 *
 *   1. **Tamaño** — nocional, margen, capital libre, exposición. Contesta a
 *      "¿es esto grande?", que es la pregunta anterior a todas las demás.
 *   2. **Riesgo y recompensa** — lo que se pierde, lo que se gana, el R:B y
 *      dónde está el punto en que la operación deja de perder con las
 *      comisiones ya pagadas.
 *   3. **Movimiento** — cuánto vale un punto, un pip o un tick con ESTE
 *      tamaño. Es el número que traduce "el stop está a 30 pips" en dinero.
 *   4. **Liquidación** — sólo si el producto tiene margen, siempre con el modo
 *      y siempre etiquetada como estimación.
 *
 * Todo lo que no se puede calcular se pinta como raya. Ningún cero de relleno:
 * un R:B de 0 y un R:B desconocido llevan a decisiones opuestas.
 */
export default function DeskResults({
  metrics, spec, marginMode, liquidation, steps, breakEvenPrice,
  feesTotal, freeCapital, leverageNeeded, rrFloor,
}) {
  const { t } = useTranslation();
  const m = metrics || {};
  const modeMeta = marginMode ? MARGIN_MODE_META[marginMode] : null;
  const liqBad = liquidation?.stopBeforeLiquidation === false;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden" data-testid="desk-results">
      {/* 1 · Tamaño */}
      <Block title={t('deskBlockSize')}>
        <Cell label={t('tfNotional')} value={fmtMoney(m.notional)} hint={t('tfNotionalHint')} testid="desk-notional" />
        <Cell label={t('tfMargin')} value={fmtMoney(m.marginUsed)} hint={t('deskMarginHint')} testid="desk-margin" />
        <Cell label={t('deskFreeCapital')} value={fmtMoney(freeCapital)} hint={t('deskFreeCapitalHint')}
          tone={freeCapital != null && freeCapital < 0 ? 'bad' : undefined} testid="desk-free" />
        <Cell
          label={t('tfExposure')}
          value={m.exposureMultiple == null ? '—' : `${fmtNum(m.exposureMultiple, 1)}×`}
          hint={t('tfExposureHint').replace('{n}', String(m.maxExposureMultiple ?? 10))}
          tone={m.exposureExceeded ? 'bad' : undefined}
          testid="desk-exposure"
        />
      </Block>

      {/* 2 · Riesgo y recompensa */}
      <Block title={t('deskBlockRisk')}>
        <Cell label={t('tfRiskAmount')} value={fmtMoney(m.riskAmount)}
          hint={m.riskPctBalance == null ? t('tfRiskNoStop') : `${fmtPct(m.riskPctBalance)} ${t('tfRiskOnBalance')}`}
          tone="bad" testid="desk-risk" />
        <Cell label={t('tfRewardAmount')} value={fmtMoney(m.rewardAmount)}
          hint={t('deskRewardHint')} tone="good" testid="desk-reward" />
        <Cell
          label={t('tradeRR')}
          value={m.rr == null ? '—' : `${fmtNum(m.rr, 2)} : 1`}
          hint={t('tfRRFloor').replace('{n}', String(rrFloor))}
          tone={m.rrBelowFloor ? 'bad' : undefined}
          testid="desk-rr"
        />
        <Cell
          label={t('deskBreakEven')}
          value={fmtPrice(breakEvenPrice, spec?.tickSize)}
          hint={feesTotal ? t('deskBreakEvenFees').replace('{v}', fmtMoney(feesTotal)) : t('deskBreakEvenNoFees')}
          testid="desk-breakeven"
        />
      </Block>

      {/* 3 · Cuánto vale moverse */}
      <Block title={t('deskBlockMove')}>
        <Cell label={t('deskPerPoint')} value={fmtMoney(steps?.perPoint)} hint={t('deskPerPointHint')} testid="desk-per-point" />
        <Cell label={t('deskPerPip')} value={steps?.perPip == null ? '—' : fmtMoney(steps.perPip)}
          hint={spec?.pipSize ? t('deskPerPipHint').replace('{v}', String(spec.pipSize)) : t('deskNoPips')}
          testid="desk-per-pip" />
        <Cell label={t('deskPerTick')} value={steps?.perTick == null ? '—' : fmtMoney(steps.perTick)}
          hint={spec?.tickSize ? t('deskPerTickHint').replace('{v}', String(spec.tickSize)) : t('deskNoTicks')}
          testid="desk-per-tick" />
        <Cell label={t('deskLeverageNeeded')}
          value={leverageNeeded == null ? '—' : `${fmtNum(leverageNeeded, 2)}×`}
          hint={t('deskLeverageNeededHint')} testid="desk-lev-needed" />
      </Block>

      {/* 4 · Liquidación — sólo donde existe */}
      {modeMeta && (
        <div className="border-t border-border" data-testid="desk-liquidation">
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {t('deskBlockLiquidation')}
            </p>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold">
              <modeMeta.icon className="w-3 h-3" />
              {t(modeMeta.labelKey)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pb-3">
            <Cell
              label={t('deskLiqPrice')}
              value={fmtPrice(liquidation?.price, spec?.tickSize)}
              hint={liquidation?.price == null ? t('deskLiqNone') : t(modeMeta.hintKey)}
              tone={liquidation?.price == null ? undefined : 'bad'}
              testid="desk-liq-price"
            />
            <Cell
              label={t('deskLiqDistance')}
              value={liquidation?.distancePct == null ? '—' : `${fmtPct(liquidation.distancePct, 2)}`}
              hint={t('deskLiqDistanceHint')}
              testid="desk-liq-distance"
            />
            <Cell
              label={t('deskLiqBuffer')}
              value={fmtMoney(liquidation?.buffer)}
              hint={t(liquidation?.bufferSource === 'capital' ? 'deskLiqBufferCapital' : 'deskLiqBufferMargin')}
              testid="desk-liq-buffer"
            />
            <Cell
              label={t('deskLiqStopSafe')}
              value={liquidation?.stopBeforeLiquidation == null
                ? '—'
                : t(liquidation.stopBeforeLiquidation ? 'deskLiqStopOk' : 'deskLiqStopKo')}
              hint={t('deskLiqStopHint')}
              tone={liqBad ? 'bad' : undefined}
              testid="desk-liq-stop"
            />
          </div>

          {liqBad && (
            <p className="mx-4 mb-3 flex items-start gap-2 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/30 px-3 py-2 text-[11px] text-[#f87171] leading-relaxed"
              data-testid="desk-liq-warning">
              <Skull className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {t('tfLiqBeforeStop')}
            </p>
          )}

          <p className="mx-4 mb-3 text-[10px] text-muted-foreground leading-relaxed">
            {t('deskLiqAssumptions')}
          </p>
        </div>
      )}

      {/* Avisos que valen para cualquier producto */}
      {(m.exposureExceeded || m.rrBelowFloor) && (
        <div className="px-4 py-2.5 border-t border-border flex flex-wrap gap-4" data-testid="desk-warnings">
          {m.exposureExceeded && (
            <span className="inline-flex items-start gap-1.5 text-[11px] text-[#f87171] leading-relaxed">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {t('tfExposureOver')
                .replace('{x}', fmtNum(m.exposureMultiple, 1))
                .replace('{notional}', fmtMoney(m.notional))
                .replace('{n}', String(m.maxExposureMultiple ?? 10))}
            </span>
          )}
          {m.rrBelowFloor && (
            <span className="inline-flex items-start gap-1.5 text-[11px] text-[#fbbf24] leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {t('tfRRFloorWarn').replace('{v}', fmtNum(m.rr, 2))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div className="border-t border-border first:border-t-0">
      <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-2 pb-3">{children}</div>
    </div>
  );
}

const TONES = { bad: 'text-[#f87171]', good: 'text-[#4ade80]' };

function Cell({ label, value, hint, tone, testid }) {
  return (
    <div className="min-w-0" data-testid={testid}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <p className={`font-mono text-base font-bold mt-0.5 ${TONES[tone] || ''}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}
