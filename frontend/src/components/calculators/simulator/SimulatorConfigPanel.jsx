import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FlaskConical, Play, Settings, ChevronDown, ChevronUp,
  Layers, DollarSign, Activity,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Configuration UI for SimulatorPro — global balance, capital-mode selector
 * and either per-phase (compound) or fixed-risk parameter sections.
 *
 * Controlled component: all state lives on the parent SimulatorPro so the
 * engine output stays in sync.
 */
const STRATEGIES = [
  { id: 'scalping',  nameKey: 'scalping' },
  { id: 'daytrading', nameKey: 'daytrading' },
  { id: 'swing',     nameKey: 'swing' },
  { id: 'trend',     nameKey: 'trendFollowing' },
  { id: 'breakout',  nameKey: 'breakout' },
];

export default function SimulatorConfigPanel({
  showConfig, setShowConfig,
  initialBalance, setInitialBalance,
  capitalMode, setCapitalMode,
  // compound mode
  totalPhases, setTotalPhases,
  tradingComm, setTradingComm,
  platformComm, setPlatformComm,
  compoundInterest, setCompoundInterest,
  stopAfterLosses, setStopAfterLosses,
  phases, updatePhase, getOperationRange,
  togglePhasePartial, updatePhaseLeg,
  // fixed risk mode
  fixedCapitalPerOp, setFixedCapitalPerOp,
  fixedTotalOps, setFixedTotalOps,
  fixedTakeProfit, setFixedTakeProfit,
  fixedStopLoss, setFixedStopLoss,
  fixedWinRate, setFixedWinRate,
  fixedPartialTps, setFixedPartialTps,
  fixedPartialLegs, updatePartialLeg,
  fixedPartialCont, setFixedPartialCont,
  fixedPartialPct, setFixedPartialPct,
  // exec
  onExecute, isLoading,
}) {
  const { t } = useTranslation();

  // Sum of close-% across scale-out legs — used to warn when it isn't 100%.
  const legSum = (legs) => (Array.isArray(legs) ? legs : []).reduce((s, l) => s + (parseFloat(l?.pct) || 0), 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-cyan-500" />
            </div>
            {t('simulator')} - {t('phaseConfig')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowConfig(!showConfig)}>
            {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {showConfig && (
        <CardContent className="space-y-6">
          {/* Info box */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
            <Activity className="w-4 h-4 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">{t('simulatorDescription')}</p>
          </div>

          {/* Global Config: Initial Balance */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> {t('generalConfig')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">{t('initialBalance')} (USD)</Label>
                <Input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Math.min(1e12, Math.max(0, parseFloat(e.target.value) || 0)))}
                  min={1}
                  className="font-mono"
                  data-testid="initial-balance"
                />
                <p className="text-xs text-muted-foreground">💡 {t('initialCapitalHint')}</p>
              </div>
            </div>
          </div>

          {/* Capital Mode Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('capitalMode')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={capitalMode === 'compound' ? 'default' : 'outline'}
                onClick={() => setCapitalMode('compound')}
                className={`h-auto py-3 ${capitalMode === 'compound' ? 'bg-primary text-black' : ''}`}
                data-testid="mode-compound"
              >
                <div className="text-left w-full">
                  <p className="font-semibold text-sm">📈 {t('compoundMode')}</p>
                  <p className="text-xs opacity-80">{t('compoundModeDesc')}</p>
                </div>
              </Button>
              <Button
                type="button"
                variant={capitalMode === 'fixed' ? 'default' : 'outline'}
                onClick={() => { setCapitalMode('fixed'); setCompoundInterest(false); }}
                className={`h-auto py-3 ${capitalMode === 'fixed' ? 'bg-accent text-white' : ''}`}
                data-testid="mode-fixed"
              >
                <div className="text-left w-full">
                  <p className="font-semibold text-sm">🔒 {t('fixedRiskMode')}</p>
                  <p className="text-xs opacity-80">{t('fixedRiskModeDesc')}</p>
                </div>
              </Button>
            </div>
          </div>

          {/* Compound settings */}
          {capitalMode === 'compound' && (
            <>
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" /> {t('compoundConfig')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">{t('totalPhases')}</Label>
                    <Input
                      type="number"
                      value={totalPhases}
                      onChange={(e) => setTotalPhases(Math.min(10, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                      min={2} max={10}
                      className="font-mono"
                      data-testid="total-phases"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{t('tradingCommission')} (%)</Label>
                    <Input
                      type="number"
                      value={tradingComm}
                      onChange={(e) => setTradingComm(parseFloat(e.target.value) || 0)}
                      step={0.01} min={0}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{t('platformCommission')} (%)</Label>
                    <Input
                      type="number"
                      value={platformComm}
                      onChange={(e) => setPlatformComm(parseFloat(e.target.value) || 0)}
                      step={0.01} min={0}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="compound"
                    checked={compoundInterest}
                    onCheckedChange={setCompoundInterest}
                  />
                  <Label htmlFor="compound" className="text-sm cursor-pointer">
                    💰 {t('compoundInterest')}
                  </Label>
                </div>

                {/* Optional risk rule: stop after N consecutive losses */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm">{t('stopAfterLosses')}</Label>
                    <Input
                      type="number"
                      value={stopAfterLosses}
                      onChange={(e) => setStopAfterLosses(Math.min(1000, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                      min={0} max={1000} step={1}
                      className="font-mono"
                      data-testid="stop-after-losses"
                    />
                    <p className="text-[11px] text-muted-foreground">{t('stopAfterLossesHint')}</p>
                  </div>
                </div>
              </div>

              {/* Phase cards grid */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> {t('phaseConfig')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {phases.map((phase, idx) => {
                    const range = getOperationRange(idx);
                    const capitalPerOp = (initialBalance * (phase.posSize / 100)).toFixed(2);
                    return (
                      <Card key={phase.id || `phase-${idx}`} className="bg-muted/30 border-border">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-semibold text-sm">{t('phase')} {idx + 1}</h5>
                          </div>
                          <div className="text-xs px-2 py-1.5 rounded bg-primary/10 text-primary">
                            {t('operations')}: {range.start} {t('to')} {range.end}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px]">{t('operations')}</Label>
                              <Input
                                type="number"
                                value={phase.numOps}
                                onChange={(e) => updatePhase(idx, 'numOps', Math.min(500, Math.max(1, parseInt(e.target.value, 10) || 30)))}
                                min={1} max={500}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">{t('positionSizePercent')}</Label>
                              <Input
                                type="number"
                                value={phase.posSize}
                                onChange={(e) => updatePhase(idx, 'posSize', Math.min(1000, Math.max(0.1, parseFloat(e.target.value) || 5)))}
                                step={0.5} min={0.1} max={100}
                                className="h-8 text-sm"
                              />
                              <span className="text-[10px] text-muted-foreground">${capitalPerOp}/op</span>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">{t('takeProfit')} %</Label>
                              <Input
                                type="number"
                                value={phase.tp}
                                onChange={(e) => updatePhase(idx, 'tp', parseFloat(e.target.value) || 2)}
                                step={0.1} min={0.1}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">{t('stopLoss')} %</Label>
                              <Input
                                type="number"
                                value={phase.sl}
                                onChange={(e) => updatePhase(idx, 'sl', parseFloat(e.target.value) || 1)}
                                step={0.1} min={0.1}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px]">{t('winRate')}</Label>
                              <span className="text-xs font-semibold text-primary">{phase.winRate}%</span>
                            </div>
                            <Slider
                              value={[phase.winRate]}
                              onValueChange={(v) => updatePhase(idx, 'winRate', v[0])}
                              min={1} max={100} step={1}
                              className="h-2"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">{t('strategy')}</Label>
                            <Select
                              value={phase.strategy}
                              onValueChange={(v) => updatePhase(idx, 'strategy', v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STRATEGIES.map((s) => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">
                                    {t(s.nameKey)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Per-phase partial take-profits */}
                          <div className="space-y-2 border-t border-border pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={!!phase.partialTps}
                                onCheckedChange={(v) => togglePhasePartial(idx, !!v)}
                                data-testid={`phase-partial-toggle-${idx}`}
                              />
                              <span className="text-[11px] font-semibold">{t('simPartialTps')}</span>
                            </label>
                            {phase.partialTps && (
                              <div className="space-y-1.5" data-testid={`phase-partial-config-${idx}`}>
                                <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">
                                  <span className="w-7" /><span>{t('takeProfit')} %</span><span>{t('pxcClosePct')}</span>
                                </div>
                                {(phase.legs || [{ r: 1, pct: 50 }, { r: 2, pct: 30 }, { r: 3, pct: 20 }]).map((leg, li) => (
                                  <div key={li} className="grid grid-cols-[auto_1fr_1fr] gap-1.5 items-center">
                                    <span className="text-[10px] font-mono text-muted-foreground w-7">TP{li + 1}</span>
                                    <Input type="number" value={leg.r} step={0.1} min={0.1}
                                           onChange={(e) => updatePhaseLeg(idx, li, 'r', e.target.value)} className="h-7 text-xs" />
                                    <Input type="number" value={leg.pct} step={5} min={0} max={100}
                                           onChange={(e) => updatePhaseLeg(idx, li, 'pct', e.target.value)} className="h-7 text-xs" />
                                  </div>
                                ))}
                                {Math.round(legSum(phase.legs)) !== 100 && (
                                  <p className="text-[10px] text-amber-500" data-testid={`phase-legsum-warn-${idx}`}>
                                    ⚠ {t('legSumWarning').replace('{sum}', Math.round(legSum(phase.legs)))}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground flex-1">{t('simContinuation')}</span>
                                  <Input type="number" value={phase.cont ?? 60} step={5} min={0} max={100}
                                         onChange={(e) => updatePhase(idx, 'cont', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                         className="h-7 text-xs w-16" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground flex-1">{t('partialSharePct')}</span>
                                  <Input type="number" value={phase.partialPct ?? 100} step={5} min={0} max={100}
                                         onChange={(e) => updatePhase(idx, 'partialPct', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                         className="h-7 text-xs w-16" data-testid={`phase-partial-pct-${idx}`} />
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Fixed-risk settings */}
          {capitalMode === 'fixed' && (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" /> {t('fixedRiskConfig')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{t('fixedCapitalPerOp')} (USD)</Label>
                  <Input
                    type="number"
                    value={fixedCapitalPerOp}
                    onChange={(e) => setFixedCapitalPerOp(Math.min(1e12, Math.max(0, parseFloat(e.target.value) || 100)))}
                    min={1}
                    className="font-mono"
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">💡 {t('fixedCapitalHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('totalOperationsNumber')}</Label>
                  <Input
                    type="number"
                    value={fixedTotalOps}
                    onChange={(e) => setFixedTotalOps(Math.min(5000, Math.max(1, parseInt(e.target.value, 10) || 100)))}
                    min={1} max={5000}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('takeProfit')} (%)</Label>
                  <Input
                    type="number"
                    value={fixedTakeProfit}
                    onChange={(e) => setFixedTakeProfit(parseFloat(e.target.value) || 2)}
                    min={0.1} step={0.1}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('stopLoss')} (%)</Label>
                  <Input
                    type="number"
                    value={fixedStopLoss}
                    onChange={(e) => setFixedStopLoss(parseFloat(e.target.value) || 1)}
                    min={0.1} step={0.1}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm">{t('winRate')}: {fixedWinRate}%</Label>
                  <Slider
                    value={[fixedWinRate]}
                    onValueChange={(val) => setFixedWinRate(val[0])}
                    min={1} max={100} step={1}
                    className="py-2"
                  />
                </div>

                {/* Partial take-profits (scale-out) */}
                <div className="space-y-3 md:col-span-2 border-t border-border pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={fixedPartialTps} onCheckedChange={(v) => setFixedPartialTps(!!v)} data-testid="sim-partial-toggle" />
                    <span className="text-sm font-semibold">{t('simPartialTps')}</span>
                  </label>
                  {fixedPartialTps && (
                    <div className="space-y-3 pl-1" data-testid="sim-partial-config">
                      <p className="text-xs text-muted-foreground">{t('simPartialHint')}</p>
                      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <span className="w-8" />
                        <span>{t('takeProfit')} (%)</span>
                        <span>{t('pxcClosePct')}</span>
                      </div>
                      {(fixedPartialLegs || []).map((leg, i) => (
                        <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center">
                          <span className="text-xs font-mono text-muted-foreground w-8">TP{i + 1}</span>
                          <Input type="number" value={leg.r} min={0.1} step={0.1}
                                 onChange={(e) => updatePartialLeg(i, 'r', e.target.value)} className="font-mono h-8" />
                          <Input type="number" value={leg.pct} min={0} max={100} step={5}
                                 onChange={(e) => updatePartialLeg(i, 'pct', e.target.value)} className="font-mono h-8" />
                        </div>
                      ))}
                      {Math.round(legSum(fixedPartialLegs)) !== 100 && (
                        <p className="text-[11px] text-amber-500" data-testid="fixed-legsum-warn">
                          ⚠ {t('legSumWarning').replace('{sum}', Math.round(legSum(fixedPartialLegs)))}
                        </p>
                      )}
                      <div className="space-y-1 pt-1">
                        <Label className="text-sm">{t('simContinuation')}: {fixedPartialCont}%</Label>
                        <Slider value={[fixedPartialCont]} onValueChange={(v) => setFixedPartialCont(v[0])}
                                min={0} max={100} step={5} className="py-2" />
                      </div>
                      <div className="space-y-1 pt-1">
                        <Label className="text-sm">{t('partialSharePct')}: {fixedPartialPct}%</Label>
                        <Slider value={[fixedPartialPct]} onValueChange={(v) => setFixedPartialPct(v[0])}
                                min={0} max={100} step={5} className="py-2" data-testid="fixed-partial-pct" />
                        <p className="text-[11px] text-muted-foreground">{t('partialShareHint')}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{t('simPartialNote')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={onExecute}
            className="w-full gap-2 h-12 text-lg"
            disabled={isLoading}
            data-testid="execute-simulation-btn"
          >
            <Play className="w-5 h-5" />
            {isLoading ? t('executing') : `▶ ${t('executeSimulation')}`}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
