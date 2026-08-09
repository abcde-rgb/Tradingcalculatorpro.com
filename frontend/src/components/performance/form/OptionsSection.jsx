import React from 'react';
import { Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SectionCard from '@/components/common/SectionCard';
import { useTranslation } from '@/lib/i18n';
import { OPTION_OUTCOMES } from './productMeta';

/**
 * Lo que una operación de opciones necesita para poder revisarse después, dentro
 * del MISMO formulario que el resto.
 *
 * Un diario de opciones aparte habría sido más fácil de escribir y peor de usar:
 * dos sitios donde apuntar, dos analíticas que no suman y ninguna respuesta a
 * "¿gano más con opciones o con futuros?". Aquí una opción es un producto más;
 * lo único que cambia es que el riesgo no lo marca un stop de precio, lo marca
 * la estructura.
 *
 * De ahí los dos campos que hacen todo el trabajo: **pérdida máxima** y
 * **beneficio máximo**. Con ellos, un spread de crédito (donde no hay stop y el
 * riesgo es anchura − crédito) tiene R, entra en la distribución de R y compara
 * con cualquier otra operación del diario. Sin ellos, era invisible.
 *
 * La volatilidad implícita de entrada y la delta no son adorno: son la única
 * forma de saber, al revisar, si la operación salió por dirección o porque se
 * pagó cara la volatilidad — dos aciertos distintos que se repiten distinto.
 */
export default function OptionsSection({ form, set, isOption }) {
  const { t } = useTranslation();
  if (!isOption) return null;

  return (
    <SectionCard
      icon={<Layers className="w-4 h-4" />}
      title={t('tfOptionsBlock')}
      subtitle={t('tfOptionsBlockHint')}
      accent="purple"
      defaultOpen
      testid="trade-options-section"
    >
      {/* Riesgo definido: lo primero, porque es lo que da R a la operación */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label={t('tfMaxLossField')} hint={t('tfMaxLossFieldHint')}
          value={form.max_loss} onChange={set('max_loss')} testid="trade-max-loss" />
        <Field label={t('tfMaxProfit')} hint={t('tfMaxProfitHint')}
          value={form.max_profit} onChange={set('max_profit')} testid="trade-max-profit" />
        <div className="col-span-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('tfOptionStrategy')}
          </Label>
          <Input
            value={form.option_strategy || ''}
            onChange={(e) => set('option_strategy')(e.target.value)}
            placeholder={t('tfOptionStrategyPlaceholder')}
            className="mt-1"
            data-testid="trade-option-strategy"
          />
          <div className="text-[10px] text-muted-foreground mt-0.5">{t('tfOptionStrategyHint')}</div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 mb-4 leading-relaxed">
        {t('tfDefinedRiskHint')}
      </p>

      {/* Contexto: sin esto no se puede revisar una operación de opciones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
        <Field label={t('tfIvEntry')} hint={t('tfIvEntryHint')}
          value={form.iv_entry} onChange={set('iv_entry')} testid="trade-iv-entry" />
        <Field label={t('tfIvExit')} value={form.iv_exit} onChange={set('iv_exit')} testid="trade-iv-exit" />
        <Field label={t('tfDeltaEntry')} hint={t('tfDeltaEntryHint')}
          value={form.delta_entry} onChange={set('delta_entry')} testid="trade-delta-entry" />
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('tfOptionOutcome')}
          </Label>
          <select
            value={form.option_outcome || ''}
            onChange={(e) => set('option_outcome')(e.target.value)}
            className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
            data-testid="trade-option-outcome"
          >
            <option value="">—</option>
            {OPTION_OUTCOMES.map((o) => (
              <option key={o.id} value={o.id}>{t(o.labelKey)}</option>
            ))}
          </select>
        </div>
        <Field label={t('tfUnderlyingEntry')} hint={t('tfUnderlyingHint')}
          value={form.underlying_entry} onChange={set('underlying_entry')} testid="trade-underlying-entry" />
        <Field label={t('tfUnderlyingExit')}
          value={form.underlying_exit} onChange={set('underlying_exit')} testid="trade-underlying-exit" />
      </div>
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
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{hint}</div>}
    </div>
  );
}
