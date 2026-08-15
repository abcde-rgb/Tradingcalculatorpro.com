import React from 'react';
import { Ban, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fmtMoney, fmtNum, fmtPct, fmtPrice } from '@/components/performance/form/productMeta';
import { sizingLabelKey } from '@/lib/instruments';

/**
 * La respuesta. Una frase y un número, no una rejilla.
 *
 * La primera versión de esta pantalla contestaba con veinte celdas del mismo
 * tamaño —nocional, margen, exposición, R:B, break-even, valor del punto, del
 * pip, del tick…— y ninguna era **la respuesta**. El usuario tenía que
 * descifrar cuál de las veinte contestaba a lo que había preguntado, que era
 * una sola cosa: *cuánto compro*.
 *
 * Aquí el orden es el de una conversación:
 *
 *   1. **Cuánto**, en grande y en la unidad del producto (contratos, lotes,
 *      acciones, monedas). Es el número que se copia al bróker.
 *   2. **Qué te juegas y qué ganas**, en una frase con las cifras dentro. No
 *      "riesgo: 100 · recompensa: 300" — *"arriesgas 100 € para ganar 300 €"*.
 *   3. **Tres cifras de control** y nada más: margen inmovilizado, R:B y dónde
 *      te liquidan. Lo demás vive en el desglose, que se abre si se quiere.
 *
 * Y cuando NO hay respuesta, se dice qué falta o por qué no se puede, con el
 * mismo tamaño que tendría la respuesta. Un cero o una raya en grande sería
 * peor que no contestar.
 */
export default function DeskAnswer({
  budget, quantity, spec, metrics, liquidation, marginMode,
  symbol, side, blockedReason, isOption,
}) {
  const { t } = useTranslation();
  const unidad = t(sizingLabelKey(spec));
  const dp = spec?.sizing === 'contracts' || spec?.sizing === 'shares' ? 0 : 4;
  const largo = side !== 'short';

  // ── Sin respuesta: el motivo, con el peso de una respuesta ──────
  if (blockedReason) {
    const esTope = blockedReason === 'over_cap';
    return (
      <section
        className="rounded-lg border border-short/40 bg-short/10 p-5 md:p-6"
        data-testid="desk-answer-blocked"
      >
        <div className="flex items-start gap-3">
          <Ban className="w-6 h-6 text-short shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-short">
              {t(esTope ? 'deskRiskBlockedTitle' : 'deskAnswerIncomplete')}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {esTope
                ? t('deskRiskBlockedBody')
                  .replace('{pct}', fmtPct(budget?.pct, 1))
                  .replace('{cap}', String(budget?.capPct ?? 10))
                  .replace('{max}', fmtMoney(budget?.maxAmount))
                : t(`deskMissing_${blockedReason}`)}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const Dir = largo ? TrendingUp : TrendingDown;
  const tono = largo ? 'text-long' : 'text-short';

  return (
    <section
      className="rounded-lg border border-rule bg-card overflow-hidden"
      data-testid="desk-answer"
    >
      {/* ── 1 · Cuánto ───────────────────────────────────────────── */}
      <div className="p-5 md:p-6">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Dir className={`w-4 h-4 ${tono}`} />
          {t(isOption
            ? (largo ? 'deskOptBuy' : 'deskOptSell')
            : (largo ? 'tradeFormSideLong' : 'tradeFormSideShort'))}
          {symbol ? <span className="text-foreground">{symbol}</span> : null}
        </p>

        <p className="mt-2 flex items-baseline gap-3 flex-wrap">
          <span
            className="font-mono text-5xl md:text-6xl font-bold text-primary tabular-nums leading-none"
            data-testid="desk-answer-size"
          >
            {fmtNum(quantity, dp)}
          </span>
          <span className="text-lg text-muted-foreground">{unidad}</span>
        </p>

        {/* ── 2 · Lo que te juegas, en una frase ─────────────────── */}
        <p className="mt-4 text-base md:text-lg leading-relaxed max-w-3xl" data-testid="desk-answer-sentence">
          <Frase
            plantilla={metrics?.rewardAmount != null ? t('deskAnswerRiskReward') : t('deskAnswerRisk')}
            valores={{
              risk: <b className="font-mono font-bold text-short tabular-nums">{fmtMoney(metrics?.riskAmount)}</b>,
              pct: <b className="font-mono font-bold tabular-nums">{fmtPct(metrics?.riskPctBalance, 2)}</b>,
              reward: <b className="font-mono font-bold text-long tabular-nums">{fmtMoney(metrics?.rewardAmount)}</b>,
            }}
          />
        </p>

        {budget?.warn && (
          <p className="mt-2 text-xs text-primary" data-testid="desk-answer-warn">
            {t('deskRiskWarnBody')
              .replace('{pct}', fmtPct(budget.pct, 1))
              .replace('{adv}', String(budget.advisedPct))}
          </p>
        )}
      </div>

      {/* ── 3 · Las tres cifras de control ───────────────────────── */}
      <div className="grid grid-cols-3 border-t border-rule divide-x divide-rule">
        <Control
          etiqueta={t('tfMargin')}
          valor={fmtMoney(metrics?.marginUsed)}
          nota={t('deskMarginHint')}
          testid="desk-key-margin"
        />
        <Control
          etiqueta={t('tradeRR')}
          valor={metrics?.rr == null ? '—' : `${fmtNum(metrics.rr, 2)} : 1`}
          nota={metrics?.rrBelowFloor ? t('deskKeyRRBad') : t('deskKeyRROk')}
          malo={metrics?.rrBelowFloor === true}
          testid="desk-key-rr"
        />
        <Control
          etiqueta={t('deskLiqPrice')}
          valor={marginMode ? fmtPrice(liquidation?.price, spec?.tickSize) : '—'}
          nota={marginMode
            ? (liquidation?.price == null ? t('deskLiqNone') : t('deskKeyLiqNote'))
            : t('deskKeyLiqNone')}
          malo={liquidation?.stopBeforeLiquidation === false}
          testid="desk-key-liq"
        />
      </div>
    </section>
  );
}

/**
 * Rellena una plantilla con marcado en vez de texto plano.
 *
 * Las cifras van dentro de la frase, no en una tabla al lado, y aun así tienen
 * que destacar. `String.replace` no vale porque el valor es un elemento React;
 * partir por los marcadores sí.
 */
function Frase({ plantilla, valores }) {
  const trozos = String(plantilla).split(/(\{[a-z]+\})/gi);
  return (
    <>
      {trozos.map((trozo, i) => {
        const m = /^\{([a-z]+)\}$/i.exec(trozo);
        if (!m) return <React.Fragment key={i}>{trozo}</React.Fragment>;
        return <React.Fragment key={i}>{valores[m[1]] ?? trozo}</React.Fragment>;
      })}
    </>
  );
}

function Control({ etiqueta, valor, nota, malo, testid }) {
  return (
    <div className="px-4 py-3 min-w-0" data-testid={testid}>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground truncate">
        {etiqueta}
      </p>
      <p className={`font-mono text-lg font-bold tabular-nums mt-0.5 ${malo ? 'text-short' : ''}`}>
        {valor}
      </p>
      <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{nota}</p>
    </div>
  );
}
