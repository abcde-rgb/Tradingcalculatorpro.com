import React from 'react';
import { Receipt } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SectionCard from '@/components/options/SectionCard';
import { useTranslation } from '@/lib/i18n';
import { fmtMoney } from './productMeta';

/**
 * Lo que cuesta operar y lo que cuesta NO cerrar.
 *
 * Son dos cosas distintas y por eso están separadas. La comisión se paga una vez
 * y la sabe todo el mundo; el coste de mantener la posición abierta se paga
 * mientras dura y casi nadie lo apunta: un perpetuo al 0,01 % cada ocho horas
 * cuesta ~0,9 % del nocional al mes, y con apalancamiento 20× eso es el 18 % del
 * margen. Es la razón número uno de que una posición "plana" acabe en rojo.
 *
 * Se puede rellenar de dos maneras y la sección dice cuál se está usando:
 *   · **El importe** que cobró el bróker — manda siempre; ninguna fórmula
 *     nuestra mejora un extracto.
 *   · **La tasa**, y se estima con las horas o las noches que duró la posición.
 *
 * La sección sólo aparece con los campos que el producto cobra de verdad: un
 * futuro no paga funding y una acción al contado no paga swap, y ofrecer esas
 * casillas invita a rellenarlas con un cero que después se resta del P&L.
 */
export default function CostsSection({ form, set, spec, carry }) {
  const { t } = useTranslation();
  const model = spec?.carry;               // 'funding' | 'swap' | null

  const badge = carry?.total ? (
    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
      {fmtMoney(carry.total)}
    </span>
  ) : null;

  return (
    <SectionCard
      icon={<Receipt className="w-4 h-4" />}
      title={t('tfCosts')}
      subtitle={t(model === 'funding' ? 'tfCostsHintFunding'
        : model === 'swap' ? 'tfCostsHintSwap' : 'tfCostsHintNone')}
      badge={badge}
      accent="amber"
      testid="trade-costs-section"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label={t('tfCommission')} hint={t('tfCommissionHint')}
          value={form.fees} onChange={set('fees')} testid="trade-fees" />

        {model === 'funding' && (
          <>
            <Field label={t('tfFunding')} hint={t('tfFundingDeclaredHint')}
              value={form.funding_fees} onChange={set('funding_fees')} testid="trade-funding" />
            <Field label={t('tfFundingRate')} hint={t('tfFundingRateHint')}
              value={form.funding_rate_pct} onChange={set('funding_rate_pct')} testid="trade-funding-rate" />
            <Field label={t('tfFundingPeriods')} hint={t('tfFundingPeriodsHint')}
              value={form.funding_periods} onChange={set('funding_periods')} testid="trade-funding-periods" />
          </>
        )}

        {model === 'swap' && (
          <>
            <Field label={t('tfSwap')} hint={t('tfSwapDeclaredHint')}
              value={form.swap_fees} onChange={set('swap_fees')} testid="trade-swap" />
            <Field label={t('tfSwapRate')} hint={t('tfSwapRateHint')}
              value={form.swap_rate_pct} onChange={set('swap_rate_pct')} testid="trade-swap-rate" />
            <Field label={t('tfNights')} hint={t('tfNightsHint')}
              value={form.nights_held} onChange={set('nights_held')} testid="trade-nights" />
          </>
        )}
      </div>

      {carry?.total != null && (
        <p className="text-[11px] text-muted-foreground mt-3" data-testid="trade-carry-source">
          {t(carry.source === 'declared' ? 'tfCarryDeclared' : 'tfCarryEstimated')
            .replace('{v}', fmtMoney(carry.total))}
        </p>
      )}
    </SectionCard>
  );
}

function Field({ label, hint, value, onChange, testid }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number" step="any" value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1" data-testid={testid}
      />
      {hint && <div className="text-[10px] text-muted-foreground/80 mt-0.5 leading-tight">{hint}</div>}
    </div>
  );
}
