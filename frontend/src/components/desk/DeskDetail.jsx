import React, { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fmtMoney, fmtNum, fmtPct, fmtPrice } from '@/components/performance/form/productMeta';
import { sizingLabelKey } from '@/lib/instruments';
import { MARGIN_MODE_META, BINDING_META } from './deskMeta';

/**
 * El desglose: la verificación, no la respuesta.
 *
 * Estas catorce cifras existían antes en la pantalla principal, todas del mismo
 * tamaño y todas a la vez. Eso convertía la respuesta en un ejercicio de
 * búsqueda. Aquí siguen enteras —quien quiere comprobar el nocional, la
 * exposición o el valor del tick lo tiene— pero **detrás de un clic**, que es
 * donde va lo que se consulta y no lo que se pregunta.
 *
 * Tres avisos rompen esa regla y salen SIEMPRE, abierto o cerrado, porque no
 * son verificación sino motivos para no mandar la orden:
 *
 *   · la exposición por encima del tope,
 *   · el R:B por debajo de 1:1,
 *   · el stop más allá de la liquidación (te cierra el bróker antes).
 *
 * Un aviso que hay que desplegar para verlo llega tarde.
 */
export default function DeskDetail({ resultado }) {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);

  const {
    metrics: m = {}, spec, liquidation, steps, breakEvenPrice, fees,
    freeCapital, leverageNeeded, sizes, minimo, marginMode, entry,
  } = resultado || {};

  const unidad = t(sizingLabelKey(spec));

  /**
   * «3 lotes» y «300.000 $» son la misma frase para quien opera, pero sólo la
   * segunda se compara con la cuenta. El precio de entrada y el tamaño de
   * contrato ya están aquí, así que no hay excusa para no decirlo.
   */
  const enDinero = (cantidad) => {
    if (cantidad == null || entry == null || !spec?.contractSize) return unidad;
    return `${unidad} · ${fmtMoney(cantidad * entry * spec.contractSize)}`;
  };
  const dp = spec?.sizing === 'contracts' || spec?.sizing === 'shares' ? 0 : 4;
  const modeMeta = marginMode ? MARGIN_MODE_META[marginMode] : null;
  const bind = sizes?.binding ? BINDING_META[sizes.binding] : null;

  const avisos = [
    m.exposureExceeded && t('tfExposureOver')
      .replace('{x}', fmtNum(m.exposureMultiple, 1))
      .replace('{notional}', fmtMoney(m.notional))
      .replace('{n}', String(m.maxExposureMultiple ?? 10)),
    m.rrBelowFloor && t('tfRRFloorWarn').replace('{v}', fmtNum(m.rr, 2)),
    liquidation?.stopBeforeLiquidation === false && t('tfLiqBeforeStop'),
    minimo?.tooRisky && t('deskMinTicketTooRisky'),
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-rule bg-card overflow-hidden" data-testid="desk-detail">
      {/* Los avisos, fuera del plegado */}
      {avisos.length > 0 && (
        <ul className="divide-y divide-rule" data-testid="desk-warnings">
          {avisos.map((texto, i) => (
            <li key={i} className="flex items-start gap-2 px-4 py-2.5 bg-short/10 text-short text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        data-testid="desk-detail-toggle"
      >
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${abierto ? 'rotate-180' : ''}`} />
        <span className="text-xs font-semibold uppercase tracking-wider">{t('deskDetailTitle')}</span>
        {bind && (
          <span className="ml-auto text-[11px] text-muted-foreground truncate">
            {t('deskBoundBy')} {t(bind.labelKey)}
          </span>
        )}
      </button>

      {abierto && (
        <div className="border-t border-rule" data-testid="desk-detail-body">
          <Bloque titulo={t('deskBlockSize')}>
            <Dato etiqueta={t('tfNotional')} valor={fmtMoney(m.notional)} nota={t('tfNotionalHint')} testid="desk-notional" />
            <Dato etiqueta={t('deskFreeCapital')} valor={fmtMoney(freeCapital)} nota={t('deskFreeCapitalHint')}
              malo={freeCapital != null && freeCapital < 0} testid="desk-free" />
            <Dato etiqueta={t('tfExposure')}
              valor={m.exposureMultiple == null ? '—' : `${fmtNum(m.exposureMultiple, 1)}×`}
              nota={t('tfExposureHint').replace('{n}', String(m.maxExposureMultiple ?? 10))}
              malo={m.exposureExceeded} testid="desk-exposure" />
            <Dato etiqueta={t('deskLeverageNeeded')}
              valor={leverageNeeded == null ? '—' : `${fmtNum(leverageNeeded, 2)}×`}
              nota={t('deskLeverageNeededHint')} testid="desk-lev-needed" />
          </Bloque>

          <Bloque titulo={t('deskBlockLimits')}>
            {/* Los topes decían «1 contratos» y punto. Un tope que no dice
                cuánto dinero es no se puede comparar con la cuenta, que es
                justo para lo que sirve un tope. La unidad y el capital que
                representa van en la misma nota. */}
            <Dato etiqueta={t('deskMaxByRisk')} valor={fmtNum(sizes?.byRisk, dp)}
              nota={enDinero(sizes?.byRisk)}
              destacado={sizes?.binding === 'risk'} testid="desk-cap-risk" />
            <Dato etiqueta={t('deskMaxByMargin')} valor={fmtNum(sizes?.byMargin, dp)}
              nota={enDinero(sizes?.byMargin)}
              destacado={sizes?.binding === 'margin'} testid="desk-cap-margin" />
            <Dato etiqueta={t('deskMaxByExposure')} valor={fmtNum(sizes?.byExposure, dp)}
              nota={enDinero(sizes?.byExposure)}
              destacado={sizes?.binding === 'exposure'} testid="desk-cap-exposure" />
            <Dato etiqueta={t('deskMinTicket')}
              valor={minimo?.quantity == null ? '—' : fmtNum(minimo.quantity, dp)}
              nota={minimo?.risk != null ? `${t('deskMinTicketRisk')} ${fmtMoney(minimo.risk)}` : unidad}
              malo={minimo?.tooRisky || minimo?.affordable === false}
              testid="desk-min-ticket" />
          </Bloque>

          <Bloque titulo={t('deskBlockMove')}>
            <Dato etiqueta={t('deskPerPoint')} valor={fmtMoney(steps?.perPoint)} nota={t('deskPerPointHint')} testid="desk-per-point" />
            <Dato etiqueta={t('deskPerPip')} valor={steps?.perPip == null ? '—' : fmtMoney(steps.perPip)}
              nota={spec?.pipSize ? t('deskPerPipHint').replace('{v}', String(spec.pipSize)) : t('deskNoPips')}
              testid="desk-per-pip" />
            <Dato etiqueta={t('deskPerTick')} valor={steps?.perTick == null ? '—' : fmtMoney(steps.perTick)}
              nota={spec?.tickSize ? t('deskPerTickHint').replace('{v}', String(spec.tickSize)) : t('deskNoTicks')}
              testid="desk-per-tick" />
            <Dato etiqueta={t('deskBreakEven')} valor={fmtPrice(breakEvenPrice, spec?.tickSize)}
              nota={fees ? t('deskBreakEvenFees').replace('{v}', fmtMoney(fees)) : t('deskBreakEvenNoFees')}
              testid="desk-breakeven" />
          </Bloque>

          {modeMeta && (
            <Bloque titulo={`${t('deskBlockLiquidation')} · ${t(modeMeta.labelKey)}`}>
              <Dato etiqueta={t('deskLiqDistance')}
                valor={liquidation?.distancePct == null ? '—' : fmtPct(liquidation.distancePct, 2)}
                nota={t('deskLiqDistanceHint')} testid="desk-liq-distance" />
              <Dato etiqueta={t('deskLiqBuffer')} valor={fmtMoney(liquidation?.buffer)}
                nota={t(liquidation?.bufferSource === 'capital' ? 'deskLiqBufferCapital' : 'deskLiqBufferMargin')}
                testid="desk-liq-buffer" />
              <Dato etiqueta={t('deskLiqStopSafe')}
                valor={liquidation?.stopBeforeLiquidation == null ? '—'
                  : t(liquidation.stopBeforeLiquidation ? 'deskLiqStopOk' : 'deskLiqStopKo')}
                nota={t('deskLiqStopHint')}
                malo={liquidation?.stopBeforeLiquidation === false} testid="desk-liq-stop" />
              <p className="col-span-2 md:col-span-4 text-[10px] text-muted-foreground leading-relaxed">
                {t('deskLiqAssumptions')}
              </p>
            </Bloque>
          )}
        </div>
      )}
    </div>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div className="border-b border-rule last:border-b-0">
      <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {titulo}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-2 pb-3">{children}</div>
    </div>
  );
}

function Dato({ etiqueta, valor, nota, malo, destacado, testid }) {
  return (
    <div className="min-w-0" data-testid={testid}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{etiqueta}</p>
      <p className={`font-mono text-sm font-bold tabular-nums mt-0.5 ${
        malo ? 'text-short' : destacado ? 'text-primary' : ''
      }`}>
        {valor}
      </p>
      {nota && <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{nota}</p>}
    </div>
  );
}
