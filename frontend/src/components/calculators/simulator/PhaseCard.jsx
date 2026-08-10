import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/lib/i18n';

const STRATEGIES = [
  { id: 'scalping',   nameKey: 'scalping' },
  { id: 'daytrading', nameKey: 'daytrading' },
  { id: 'swing',      nameKey: 'swing' },
  { id: 'trend',      nameKey: 'trendFollowing' },
  { id: 'breakout',   nameKey: 'breakout' },
];

const DEFAULT_LEGS = [{ r: 1, pct: 50 }, { r: 2, pct: 30 }, { r: 3, pct: 20 }];

/**
 * Una fase del modo compuesto. Vivía dentro de `SimulatorConfigPanel`, donde
 * ocupaba ~120 de sus 425 líneas y hacía que el panel mezclara dos niveles: la
 * configuración general y el detalle de cada fase. Separarlo deja el panel como
 * lo que es —un compositor— y esta tarjeta como lo que es: un formulario.
 */
export default function PhaseCard({
  phase, index, range, capitalPerOp,
  updatePhase, togglePhasePartial, updatePhaseLeg,
}) {
  const { t } = useTranslation();
  const legs = Array.isArray(phase.legs) ? phase.legs : DEFAULT_LEGS;

  return (
    <Card className="bg-muted/30 border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="font-semibold text-sm">{t('phase')} {index + 1}</h5>
          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary tabular-nums">
            {range.start}–{range.end}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">{t('operations')}</Label>
            <Input
              type="number" value={phase.numOps} min={1} max={200}
              onChange={(e) => updatePhase(index, 'numOps', parseInt(e.target.value, 10) || 30)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">{t('positionSizePercent')}</Label>
            <Input
              type="number" value={phase.posSize} step={0.5} min={0.1} max={100}
              onChange={(e) => updatePhase(index, 'posSize', parseFloat(e.target.value) || 5)}
              className="h-8 text-sm"
            />
            <span className="text-[10px] text-muted-foreground tabular-nums">${capitalPerOp}/op</span>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">{t('takeProfit')} %</Label>
            <Input
              type="number" value={phase.tp} step={0.1} min={0.1}
              onChange={(e) => updatePhase(index, 'tp', parseFloat(e.target.value) || 2)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">{t('stopLoss')} %</Label>
            <Input
              type="number" value={phase.sl} step={0.1} min={0.1}
              onChange={(e) => updatePhase(index, 'sl', parseFloat(e.target.value) || 1)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">{t('winRate')}</Label>
            <span className="text-xs font-semibold text-primary tabular-nums">{phase.winRate}%</span>
          </div>
          <Slider
            value={[phase.winRate]} min={1} max={100} step={1} className="h-2"
            onValueChange={(v) => updatePhase(index, 'winRate', v[0])}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px]">{t('strategy')}</Label>
          <Select value={phase.strategy} onValueChange={(v) => updatePhase(index, 'strategy', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STRATEGIES.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{t(s.nameKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 border-t border-border pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={!!phase.partialTps}
              onCheckedChange={(v) => togglePhasePartial(index, !!v)}
              data-testid={`phase-partial-toggle-${index}`}
            />
            <span className="text-[11px] font-semibold">{t('simPartialTps')}</span>
          </label>
          {phase.partialTps && (
            <div className="space-y-1.5" data-testid={`phase-partial-config-${index}`}>
              <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">
                <span className="w-7" /><span>{t('takeProfit')} %</span><span>{t('pxcClosePct')}</span>
              </div>
              {legs.map((leg, li) => (
                <div key={li} className="grid grid-cols-[auto_1fr_1fr] gap-1.5 items-center">
                  <span className="text-[10px] font-mono text-muted-foreground w-7">TP{li + 1}</span>
                  <Input type="number" value={leg.r} step={0.1} min={0.1} className="h-7 text-xs"
                         onChange={(e) => updatePhaseLeg(index, li, 'r', e.target.value)} />
                  <Input type="number" value={leg.pct} step={5} min={0} max={100} className="h-7 text-xs"
                         onChange={(e) => updatePhaseLeg(index, li, 'pct', e.target.value)} />
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground flex-1">{t('simContinuation')}</span>
                <Input type="number" value={phase.cont ?? 60} step={5} min={0} max={100} className="h-7 text-xs w-16"
                       onChange={(e) => updatePhase(index, 'cont', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
