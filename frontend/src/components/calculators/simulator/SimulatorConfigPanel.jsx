import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FlaskConical, Play, ChevronDown, ChevronUp,
  Layers, Percent, Scissors, TrendingUp, Lock,
} from 'lucide-react';
import SectionCard from '@/components/common/SectionCard';
import PhaseCard from './PhaseCard';
import { useTranslation } from '@/lib/i18n';

const DEFAULT_LEGS = [{ r: 1, pct: 50 }, { r: 2, pct: 30 }, { r: 3, pct: 20 }];

/**
 * Configuración de SimulatorPro, ordenada POR IMPORTANCIA — el mismo patrón que
 * el panel de opciones y el escáner de estructura:
 *
 *   1 modo  →  2 capital  →  3 config del modo activo  →  accesorio plegado  →  ejecutar
 *
 * El modo va PRIMERO porque decide todo lo que viene después: compuesto trabaja
 * con fases, riesgo fijo con una cantidad por operación. Antes iba en tercer
 * lugar, después de leer una caja de ayuda y el capital inicial, así que el
 * usuario configuraba cosas antes de haber elegido de qué modo eran.
 *
 * Lo accesorio —costes y salidas parciales— va en `SectionCard` **plegado**, no
 * como campos de primer nivel: son ajustes finos que la mayoría no toca, y
 * ocupaban el mismo peso visual que la tasa de acierto.
 *
 * Componente controlado: el estado vive en `SimulatorPro`, agrupado por modo.
 */
export default function SimulatorConfigPanel({
  showConfig, setShowConfig,
  initialBalance, setInitialBalance,
  capitalMode, setCapitalMode,
  costs, setCost,
  compound,
  fixed, setFixedField, updatePartialLeg,
  onExecute, isLoading,
}) {
  const { t } = useTranslation();
  const isCompound = capitalMode === 'compound';
  const legs = Array.isArray(fixed.partialLegs) ? fixed.partialLegs : DEFAULT_LEGS;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {/* Icono monocromo en el color de marca: el chip cian era un acento
                fuera del sistema, y el sistema tiene un solo acento. */}
            <FlaskConical className="w-5 h-5 text-primary" strokeWidth={1.5} />
            {t('simulator')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowConfig(!showConfig)}
                  aria-expanded={showConfig}>
            {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {showConfig && (
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">{t('simulatorDescription')}</p>

          {/* ── 1 · MODO. Va primero: decide todo lo demás. ─────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('capitalMode')}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant={isCompound ? 'default' : 'outline'}
                onClick={() => setCapitalMode('compound')}
                className="h-auto py-3 justify-start"
                data-testid="mode-compound"
              >
                <div className="text-left w-full flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{t('compoundMode')}</p>
                    <p className="text-xs opacity-80 font-normal">{t('compoundModeDesc')}</p>
                  </div>
                </div>
              </Button>
              <Button
                type="button"
                variant={!isCompound ? 'default' : 'outline'}
                onClick={() => { setCapitalMode('fixed'); compound.setCompoundInterest(false); }}
                className="h-auto py-3 justify-start"
                data-testid="mode-fixed"
              >
                <div className="text-left w-full flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{t('fixedRiskMode')}</p>
                    <p className="text-xs opacity-80 font-normal">{t('fixedRiskModeDesc')}</p>
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* ── 2 · CAPITAL ────────────────────────────────────────────── */}
          <div className="space-y-2 max-w-xs">
            <Label className="text-sm">{t('initialBalance')} (USD)</Label>
            <Input
              type="number" value={initialBalance} min={1} className="font-mono"
              onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
              data-testid="initial-balance"
            />
            <p className="text-xs text-muted-foreground">{t('initialCapitalHint')}</p>
          </div>

          {/* ── 3 · CONFIGURACIÓN DEL MODO ACTIVO ──────────────────────── */}
          {isCompound ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-2">
                  <Label className="text-sm">{t('totalPhases')}</Label>
                  <Input
                    type="number" value={compound.totalPhases} min={2} max={10} className="font-mono"
                    onChange={(e) => compound.setTotalPhases(
                      Math.min(10, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                    data-testid="total-phases"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      id="compound-interest"
                      checked={compound.compoundInterest}
                      onCheckedChange={compound.setCompoundInterest}
                    />
                    <span className="text-sm">{t('compoundInterest')}</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4 text-primary" strokeWidth={1.5} /> {t('phaseConfig')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {compound.phases.map((phase, idx) => (
                    <PhaseCard
                      key={phase.id || `phase-${idx}`}
                      phase={phase}
                      index={idx}
                      range={compound.getOperationRange(idx)}
                      capitalPerOp={(initialBalance * (phase.posSize / 100)).toFixed(2)}
                      updatePhase={compound.updatePhase}
                      togglePhasePartial={compound.togglePhasePartial}
                      updatePhaseLeg={compound.updatePhaseLeg}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">{t('fixedCapitalPerOp')} (USD)</Label>
                <Input
                  type="number" value={fixed.capitalPerOp} min={1} className="font-mono"
                  onChange={(e) => setFixedField('capitalPerOp', parseFloat(e.target.value) || 100)}
                />
                <p className="text-xs text-muted-foreground">{t('fixedCapitalHint')}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('totalOperationsNumber')}</Label>
                <Input
                  type="number" value={fixed.totalOps} min={1} max={1000} className="font-mono"
                  onChange={(e) => setFixedField('totalOps', parseInt(e.target.value, 10) || 100)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('takeProfit')} (%)</Label>
                <Input
                  type="number" value={fixed.takeProfit} min={0.1} step={0.1} className="font-mono"
                  onChange={(e) => setFixedField('takeProfit', parseFloat(e.target.value) || 2)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('stopLoss')} (%)</Label>
                <Input
                  type="number" value={fixed.stopLoss} min={0.1} step={0.1} className="font-mono"
                  onChange={(e) => setFixedField('stopLoss', parseFloat(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm">
                  {t('winRate')}: <span className="tabular-nums">{fixed.winRate}%</span>
                </Label>
                <Slider
                  value={[fixed.winRate]} min={1} max={100} step={1} className="py-2"
                  onValueChange={(v) => setFixedField('winRate', v[0])}
                />
              </div>
            </div>
          )}

          {/* ── ACCESORIO, PLEGADO ─────────────────────────────────────── */}

          {/* Salidas parciales del modo fijo. En compuesto son por fase y viven
              dentro de cada `PhaseCard`, así que esta sección sólo aplica aquí. */}
          {!isCompound && (
            <SectionCard
              icon={<Scissors className="w-4 h-4" />}
              title={t('simPartialTps')}
              subtitle={t('simPartialHint')}
              badge={fixed.partialTps
                ? <span className="text-[10px] text-primary font-semibold">ON</span>
                : null}
              testid="sim-partial-section"
            >
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={fixed.partialTps}
                    onCheckedChange={(v) => setFixedField('partialTps', !!v)}
                    data-testid="sim-partial-toggle"
                  />
                  <span className="text-sm font-semibold">{t('simPartialTps')}</span>
                </label>

                {fixed.partialTps && (
                  <div className="space-y-3" data-testid="sim-partial-config">
                    <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <span className="w-8" />
                      <span>{t('takeProfit')} (%)</span>
                      <span>{t('pxcClosePct')}</span>
                    </div>
                    {legs.map((leg, i) => (
                      <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center">
                        <span className="text-xs font-mono text-muted-foreground w-8">TP{i + 1}</span>
                        <Input type="number" value={leg.r} min={0.1} step={0.1} className="font-mono h-8"
                               onChange={(e) => updatePartialLeg(i, 'r', e.target.value)} />
                        <Input type="number" value={leg.pct} min={0} max={100} step={5} className="font-mono h-8"
                               onChange={(e) => updatePartialLeg(i, 'pct', e.target.value)} />
                      </div>
                    ))}
                    <div className="space-y-1 pt-1">
                      <Label className="text-sm">
                        {t('simContinuation')}: <span className="tabular-nums">{fixed.partialCont}%</span>
                      </Label>
                      <Slider
                        value={[fixed.partialCont]} min={0} max={100} step={5} className="py-2"
                        onValueChange={(v) => setFixedField('partialCont', v[0])}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{t('simPartialNote')}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Costes: aplican en LOS DOS modos. Estaban dentro del bloque de
              compuesto, así que en riesgo fijo se cobraban sin poder verlos ni
              cambiarlos — el motor mete `(trading + platform)/100` en
              `totalCommRate` sin mirar el modo. */}
          <SectionCard
            icon={<Percent className="w-4 h-4" />}
            title={t('tradingCommission')}
            subtitle={t('simCostsSubtitle')}
            badge={
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {(Number(costs.trading) + Number(costs.platform)).toFixed(2)}%
              </span>
            }
            testid="sim-costs-section"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">{t('tradingCommission')} (%)</Label>
                <Input
                  type="number" value={costs.trading} step={0.01} min={0} className="font-mono"
                  onChange={(e) => setCost('trading', e.target.value)}
                  data-testid="sim-trading-comm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('platformCommission')} (%)</Label>
                <Input
                  type="number" value={costs.platform} step={0.01} min={0} className="font-mono"
                  onChange={(e) => setCost('platform', e.target.value)}
                  data-testid="sim-platform-comm"
                />
              </div>
            </div>
          </SectionCard>

          {/* ── EJECUTAR ───────────────────────────────────────────────── */}
          <Button
            onClick={onExecute}
            className="w-full gap-2 h-12 text-lg"
            disabled={isLoading}
            data-testid="execute-simulation-btn"
          >
            <Play className="w-5 h-5" />
            {isLoading ? t('executing') : t('executeSimulation')}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
