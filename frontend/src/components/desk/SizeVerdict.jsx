import React from 'react';
import { AlertOctagon, ArrowDownToLine, ArrowUpToLine, Ban, Info } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fmtMoney, fmtNum, fmtPct } from '@/components/performance/form/productMeta';
import { sizingLabelKey } from '@/lib/instruments';
import { BINDING_META } from './deskMeta';

/**
 * El veredicto de tamaño: **cuánto puedes comprar y por qué no más**.
 *
 * Es la pantalla entera resumida en un número, así que se pinta en grande y
 * arriba. Debajo, los tres topes que compiten por decidirlo — riesgo, margen y
 * exposición — con el que ha ganado marcado. Ese "por qué" no es adorno: "no
 * puedes por margen" se arregla metiendo dinero o bajando la palanca, y "no
 * puedes por riesgo" se arregla acercando el stop. Un tamaño a secas deja al
 * trader adivinando cuál de las dos cosas hacer.
 *
 * Y cuando NO hay tamaño posible, se dice el motivo en vez de pintar un cero.
 * Un cero aquí se lee como "no operes", cuando lo que pasa casi siempre es que
 * falta el stop o el capital.
 */
export default function SizeVerdict({
  sizes, minimum, spec, budget, quantityUsed, sizeMode, riskOfUsed,
}) {
  const { t } = useTranslation();
  const unit = t(sizingLabelKey(spec));
  const dp = spec?.sizing === 'contracts' || spec?.sizing === 'shares' ? 0 : 4;

  const blocked = budget?.blocked === true;
  const bindingMeta = sizes?.binding ? BINDING_META[sizes.binding] : null;

  // ── El tope de riesgo se lleva por delante todo lo demás ────────
  if (blocked) {
    return (
      <div
        className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-4"
        data-testid="desk-size-blocked"
      >
        <div className="flex items-start gap-3">
          <Ban className="w-5 h-5 text-[#f87171] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#f87171]">
              {budget.reason === 'over_cap' ? t('deskRiskBlockedTitle') : t('deskSizeIncomplete')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {budget.reason === 'over_cap'
                ? t('deskRiskBlockedBody')
                  .replace('{pct}', fmtPct(budget.pct, 1))
                  .replace('{cap}', String(budget.capPct))
                  .replace('{max}', fmtMoney(budget.maxAmount))
                : t(budget.reason === 'no_capital' ? 'deskNeedCapital' : 'deskNeedRisk')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/40 overflow-hidden" data-testid="desk-size-verdict">
      {/* ── El número ──────────────────────────────────────────────── */}
      <div className="p-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {sizeMode === 'manual' ? t('deskSizeYours') : t('deskSizeSuggested')}
          </p>
          <p
            className="font-mono text-3xl md:text-4xl font-bold text-primary leading-none mt-1"
            data-testid="desk-size-value"
          >
            {quantityUsed == null ? '—' : fmtNum(quantityUsed, dp)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">{unit}</span>
          </p>
          {quantityUsed == null && (
            <p className="mt-1.5 text-xs text-muted-foreground">{t('deskSizeIncompleteHint')}</p>
          )}
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {t('deskRiskOnThis')}
          </p>
          <p className="font-mono text-xl font-bold text-[#f87171]" data-testid="desk-size-risk">
            {fmtMoney(riskOfUsed?.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {riskOfUsed?.pct == null
              ? t('deskRiskNoStop')
              : `${fmtPct(riskOfUsed.pct, 2)} ${t('deskOfAccount')}`}
          </p>
        </div>
      </div>

      {/* ── Quién ha puesto el techo ───────────────────────────────── */}
      {sizes?.binding && sizeMode !== 'manual' && (
        <div
          className={`px-4 py-2 flex items-center gap-2 text-[11px] border-t border-border ${
            bindingMeta?.tone === 'warn' ? 'bg-[#f59e0b]/10 text-[#fbbf24]' : 'bg-primary/5 text-muted-foreground'
          }`}
          data-testid="desk-size-binding"
        >
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>{t('deskBoundBy')} <strong>{t(bindingMeta.labelKey)}</strong></span>
        </div>
      )}

      {/* ── Los tres techos, siempre visibles ──────────────────────── */}
      <div className="grid grid-cols-3 border-t border-border divide-x divide-border">
        <Cap
          label={t('deskMaxByRisk')}
          value={sizes?.byRisk}
          dp={dp}
          active={sizes?.binding === 'risk'}
          testid="desk-cap-risk"
        />
        <Cap
          label={t('deskMaxByMargin')}
          value={sizes?.byMargin}
          dp={dp}
          active={sizes?.binding === 'margin'}
          testid="desk-cap-margin"
        />
        <Cap
          label={t('deskMaxByExposure')}
          value={sizes?.byExposure}
          dp={dp}
          active={sizes?.binding === 'exposure'}
          testid="desk-cap-exposure"
        />
      </div>

      {/* ── El billete mínimo, cuando el instrumento tiene escalón ─── */}
      {minimum?.quantity != null && (
        <div
          className={`px-4 py-2.5 border-t border-border flex items-start gap-2 text-[11px] ${
            minimum.tooRisky || minimum.affordable === false
              ? 'bg-[#ef4444]/10 text-[#f87171]'
              : 'text-muted-foreground'
          }`}
          data-testid="desk-min-ticket"
        >
          {minimum.tooRisky || minimum.affordable === false
            ? <AlertOctagon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            : <ArrowDownToLine className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
          <span className="leading-relaxed">
            <strong>{t('deskMinTicket')}:</strong>{' '}
            {fmtNum(minimum.quantity, dp)} {unit}
            {minimum.risk != null && <> · {t('deskMinTicketRisk')} {fmtMoney(minimum.risk)}</>}
            {minimum.riskPct != null && <> ({fmtPct(minimum.riskPct, 1)})</>}
            {minimum.margin != null && <> · {t('deskMinTicketMargin')} {fmtMoney(minimum.margin)}</>}
            {minimum.affordable === false && <> — <strong>{t('deskMinTicketUnaffordable')}</strong></>}
            {minimum.affordable !== false && minimum.tooRisky && <> — <strong>{t('deskMinTicketTooRisky')}</strong></>}
          </span>
        </div>
      )}
    </div>
  );
}

function Cap({ label, value, dp, active, testid }) {
  return (
    <div className={`px-3 py-2.5 ${active ? 'bg-primary/10' : ''}`} data-testid={testid}>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <ArrowUpToLine className="w-3 h-3 shrink-0 opacity-60" />
        <span className="min-w-0 truncate">{label}</span>
      </p>
      <p className={`font-mono text-sm font-bold mt-0.5 ${active ? 'text-primary' : ''}`}>
        {value == null ? '—' : fmtNum(value, dp)}
      </p>
    </div>
  );
}
