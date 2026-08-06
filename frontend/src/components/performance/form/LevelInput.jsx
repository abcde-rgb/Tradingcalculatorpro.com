import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { UNIT_META, unitsFor, fmtPrice } from './productMeta';

/**
 * Un stop (o un objetivo) escrito en la unidad que use el trader.
 *
 * El que piensa en pips no quiere traducir a precio para poder apuntarlo, y el
 * que piensa en "no arriesgo más de 100 €" tampoco. Pero lo que se GUARDA es
 * siempre un nivel de precio: es lo que hace que el resto de la analítica —R,
 * drawdown, MAE/MFE, distribución— siga midiendo exactamente lo mismo que
 * medía, sin enterarse de que existen unidades.
 *
 * Por eso debajo del campo se enseña el nivel resuelto: la conversión ocurre a
 * la vista, no por detrás. Si sale un precio que no es el que el trader esperaba
 * lo ve al momento, que es cuando se puede corregir.
 */
export default function LevelInput({
  kind,              // 'sl' | 'tp'
  label,
  spec,
  unit,
  value,
  onUnitChange,
  onValueChange,
  resolvedPrice,
  testid,
}) {
  const { t } = useTranslation();
  const units = unitsFor(spec, kind);
  const active = units.includes(unit) ? unit : 'price';

  return (
    <div data-testid={testid}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1 flex gap-1">
        <Input
          type="number"
          step="any"
          value={value ?? ''}
          onChange={(e) => onValueChange(e.target.value)}
          className="flex-1"
          data-testid={`${testid}-value`}
        />
        <select
          value={active}
          onChange={(e) => onUnitChange(e.target.value)}
          className="bg-muted border border-border rounded-md px-1.5 text-[11px] font-semibold max-w-[86px]"
          aria-label={t('tfUnit')}
          data-testid={`${testid}-unit`}
        >
          {units.map((u) => (
            <option key={u} value={u}>{UNIT_META[u].short}</option>
          ))}
        </select>
      </div>
      {/* El precio al que aterriza lo escrito. Con la unidad en `price` sería
          repetir el mismo número, así que ahí no se pinta. */}
      {active !== 'price' && (
        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono" data-testid={`${testid}-resolved`}>
          {resolvedPrice == null
            ? t('tfLevelUnresolved')
            : `→ ${fmtPrice(resolvedPrice, spec?.tickSize)}`}
        </div>
      )}
    </div>
  );
}
