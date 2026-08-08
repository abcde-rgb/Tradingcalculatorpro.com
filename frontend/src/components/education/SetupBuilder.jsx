import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Settings2, Save, Copy, Check, Trash2, Plus, Clock, Layers, Wrench, Shield,
  Target, Crosshair, ShieldAlert, ListChecks, AlertTriangle, Pencil, X, Wallet,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getChartPatterns, getCandlestickPatterns, CANDLE_PATTERN_STATS } from '@/lib/tradingEducationContent';
import {
  loadSystem, saveSystem, makeSetup, setupHasContent, missingEssentials,
  onSystemChange, EMPTY_SYSTEM_RULES,
} from '@/lib/tradingSystem';

// {id} is stored; {k} is an i18n key, {s} a static (language-neutral) label.
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'];
const SETUP_TYPES = [
  { id: 'trend', k: 'tsysTypeTrend' }, { id: 'reversal', k: 'tsysTypeReversal' },
  { id: 'breakout', k: 'tsysTypeBreakout' }, { id: 'range', k: 'tsysTypeRange' },
];
const ASSETS = [
  { id: 'forex', k: 'tsysAssetForex' }, { id: 'stocks', k: 'tsysAssetStocks' },
  { id: 'crypto', k: 'tsysAssetCrypto' }, { id: 'indices', k: 'tsysAssetIndices' },
  { id: 'commodities', k: 'tsysAssetCommodities' }, { id: 'options', k: 'tsysAssetOptions' },
  { id: 'futures', k: 'tsysAssetFutures' },
];
const STYLES = [
  { id: 'scalping', k: 'gl64t' }, { id: 'day', k: 'setupStyleDay' },
  { id: 'swing', k: 'gl63t' }, { id: 'position', k: 'setupStylePosition' },
];
const SESSIONS = [
  { id: 'asia', k: 'tsysSessionAsia' }, { id: 'london', k: 'tsysSessionLondon' },
  { id: 'ny', k: 'tsysSessionNY' }, { id: 'overlap', k: 'tsysSessionOverlap' },
  { id: 'any', k: 'tsysSessionAny' },
];
const APPROACHES = [
  { id: 'wyckoff', s: 'Wyckoff' }, { id: 'ict', s: 'Smart Money / ICT' },
  { id: 'sr', k: 'setupApSR' }, { id: 'elliott', s: 'Elliott' },
  { id: 'ichimoku', s: 'Ichimoku' }, { id: 'dow', k: 'dowTheoryTitle' },
  { id: 'priceaction', s: 'Price Action' }, { id: 'volumeprofile', s: 'Volume Profile' },
  { id: 'vwap', s: 'VWAP' }, { id: 'harmonics', k: 'harmonicPatternsTab' },
];
const TOOLS = [
  { id: 'ema', s: 'EMA / SMA' }, { id: 'rsi', s: 'RSI' }, { id: 'macd', s: 'MACD' },
  { id: 'bollinger', s: 'Bollinger' }, { id: 'fib', s: 'Fibonacci' }, { id: 'volume', k: 'gl37t' },
  { id: 'atr', s: 'ATR' }, { id: 'stoch', s: 'Stochastic' }, { id: 'pivots', s: 'Pivots' },
  { id: 'vwap', s: 'VWAP' }, { id: 'volprofile', s: 'Volume Profile' },
];
// How the level is located. "S/R" as one chip among ten approaches hides the
// fact that WHERE you draw the level changes the entire setup.
const SR_METHODS = [
  { id: 'swing', k: 'tsysSrSwing' }, { id: 'round', k: 'tsysSrRound' },
  { id: 'prevday', k: 'tsysSrPrevDay' }, { id: 'vwap', k: 'tsysSrVwap' },
  { id: 'volprofile', k: 'tsysSrVolProfile' }, { id: 'fib', k: 'tsysSrFib' },
];
const STOP_RULES = [
  { id: 'structural', k: 'tsysStopStructural' }, { id: 'atr', k: 'tsysStopAtr' },
  { id: 'fixed', k: 'tsysStopFixed' },
];
const MANAGEMENT = [
  { id: 'be-1r', k: 'tsysMgmtBe' }, { id: 'partial-tp1', k: 'tsysMgmtPartial' },
  { id: 'trail-structure', k: 'tsysMgmtTrail' }, { id: 'time-stop', k: 'tsysMgmtTime' },
];
const NO_TRADE = [
  { id: 'high-impact-news', k: 'tsysNoNews' }, { id: 'ranging-market', k: 'tsysNoRanging' },
  { id: 'outside-session', k: 'tsysNoSession' }, { id: 'after-max-loss', k: 'tsysNoAfterLoss' },
  { id: 'revenge', k: 'tsysNoRevenge' }, { id: 'unwell', k: 'tsysNoUnwell' },
];

const Chip = ({ active, onClick, children, testId }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
      active ? 'bg-primary text-primary-foreground border-primary'
             : 'bg-card text-muted-foreground border-border hover:border-primary/50'
    }`}
  >
    {children}
  </button>
);

const Section = ({ icon: Icon, title, hint, children }) => (
  <div className="space-y-2">
    <h3 className="font-semibold text-sm flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-primary" />} {title}
    </h3>
    {hint && <p className="text-xs text-muted-foreground/80 -mt-1">{hint}</p>}
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

/**
 * `onSaved` lo usa Performance: allí este constructor convive con el marcador
 * de rendimiento por setup, que lee el mismo almacén. Sin el aviso, definir un
 * setup no refrescaba la tabla de al lado hasta recargar la página.
 */
export default function SetupBuilder({ onSaved }) {
  const { t } = useTranslation();
  const [system, setSystem] = useState(() => loadSystem());
  const [editingId, setEditingId] = useState(null);
  const [tab, setTab] = useState('setups');   // setups | rules
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const lbl = useCallback((o) => (o.k ? t(o.k) : o.s), [t]);

  // Persist on every change — the library is the user's own plan, losing it to
  // a closed tab is not acceptable.
  useEffect(() => { saveSystem(system); }, [system]);

  // El sistema va con la cuenta, así que puede llegar de OTRO dispositivo con
  // esta pantalla ya abierta (ver `lib/cloudPrefs.js`). Sólo se atienden los
  // avisos `silent`, que son los que vienen de fuera: los propios ya están
  // pintados, y recargarlos aquí borraría la edición a medio escribir.
  useEffect(() => onSystemChange((ev) => {
    if (ev?.silent) setSystem(loadSystem());
  }), []);

  const chartPatterns = useMemo(() => {
    const groups = getChartPatterns(t);
    return Object.values(groups).flat().map((p) => ({ id: p.id, name: p.name }));
  }, [t]);

  const candlePatterns = useMemo(() => {
    const groups = getCandlestickPatterns(t);
    return Object.values(groups).flat()
      .filter((p) => CANDLE_PATTERN_STATS[p.id])
      .map((p) => ({ id: p.id, name: p.name, stats: CANDLE_PATTERN_STATS[p.id] }));
  }, [t]);

  const editing = system.setups.find((s) => s.id === editingId) || null;

  const patchSetup = (patch) => {
    setSystem((sys) => ({
      ...sys,
      setups: sys.setups.map((s) => (s.id === editingId ? { ...s, ...patch } : s)),
    }));
    setSaved(false);
  };

  const toggleIn = (field, id) => {
    if (!editing) return;
    const arr = editing[field] || [];
    patchSetup({ [field]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] });
  };

  const addSetup = () => {
    const s = makeSetup({ name: '' });
    setSystem((sys) => ({ ...sys, setups: [...sys.setups, s] }));
    setEditingId(s.id);
    setTab('setups');
  };

  const deleteSetup = (id) => {
    setSystem((sys) => ({ ...sys, setups: sys.setups.filter((s) => s.id !== id) }));
    if (editingId === id) setEditingId(null);
  };

  const duplicateSetup = (id) => {
    const src = system.setups.find((s) => s.id === id);
    if (!src) return;
    const copy = makeSetup({ ...src, id: undefined, name: `${src.name || t('tsysUntitled')} (2)` });
    setSystem((sys) => ({ ...sys, setups: [...sys.setups, copy] }));
    setEditingId(copy.id);
  };

  const patchRules = (patch) => {
    setSystem((sys) => ({ ...sys, systemRules: { ...sys.systemRules, ...patch } }));
    setSaved(false);
  };

  const toggleNoTrade = (id) => {
    const arr = system.systemRules.noTradeConditions || [];
    patchRules({ noTradeConditions: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] });
  };

  const doSave = () => {
    saveSystem(system);
    onSaved?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setupSummary = (s) => {
    const nameOf = (list, id) => { const f = list.find((x) => x.id === id); return f ? lbl(f) : id; };
    const lines = [];
    lines.push(`★ ${s.name || t('tsysUntitled')}`);
    if (s.setupType) lines.push(`${t('tsysTypeLabel')}: ${nameOf(SETUP_TYPES, s.setupType)}`);
    if ((s.assets || []).length) lines.push(`${t('tsysAssetsLabel')}: ${s.assets.map((a) => nameOf(ASSETS, a)).join(', ')}`);
    if (s.tickers) lines.push(`${t('tsysTickersLabel')}: ${s.tickers}`);
    if (s.htfTimeframe || s.ltfTimeframe) {
      lines.push(`${t('tsysTfLabel')}: ${s.htfTimeframe || '—'} → ${s.ltfTimeframe || '—'}`);
    }
    if (s.style) lines.push(`${t('setupStyleLabel')}: ${nameOf(STYLES, s.style)}`);
    if (s.session) lines.push(`${t('tsysSessionLabel')}: ${nameOf(SESSIONS, s.session)}`);
    if ((s.approaches || []).length) lines.push(`${t('setupApproachLabel')}: ${s.approaches.map((a) => nameOf(APPROACHES, a)).join(', ')}`);
    if (s.chartPattern) lines.push(`${t('tsysChartPatternLabel')}: ${(chartPatterns.find((p) => p.id === s.chartPattern) || {}).name || s.chartPattern}`);
    if ((s.candlePatterns || []).length) {
      lines.push(`${t('tsysCandleLabel')}: ${s.candlePatterns.map((id) => (candlePatterns.find((p) => p.id === id) || {}).name || id).join(', ')}`);
    }
    if (s.srMethod) lines.push(`${t('tsysSrLabel')}: ${nameOf(SR_METHODS, s.srMethod)}`);
    if ((s.tools || []).length) lines.push(`${t('setupToolsLabel')}: ${s.tools.map((x) => nameOf(TOOLS, x)).join(', ')}`);
    if (s.entryTrigger) lines.push(`${t('tsysTriggerLabel')}: ${s.entryTrigger}`);
    if (s.invalidation) lines.push(`${t('tsysInvalidationLabel')}: ${s.invalidation}`);
    if (s.stopRule) lines.push(`${t('tsysStopLabel')}: ${nameOf(STOP_RULES, s.stopRule)}`);
    if (s.riskPerTrade) lines.push(`${t('setupRiskPerTrade')}: ${s.riskPerTrade}%`);
    if (s.rr) lines.push(`${t('setupRR')}: ${s.rr}`);
    if ((s.management || []).length) lines.push(`${t('tsysMgmtLabel')}: ${s.management.map((x) => nameOf(MANAGEMENT, x)).join(', ')}`);
    if (s.maxConcurrent) lines.push(`${t('tsysMaxConcurrentLabel')}: ${s.maxConcurrent}`);
    return lines.join('\n');
  };

  const systemSummary = () => {
    const r = system.systemRules;
    const parts = [`═══ ${t('tsysTitle')} ═══`, ''];
    system.setups.forEach((s) => { parts.push(setupSummary(s), ''); });
    parts.push(`── ${t('tsysRulesTitle')} ──`);
    if (r.maxDailyLossPct) parts.push(`${t('tsysMaxDaily')}: ${r.maxDailyLossPct}%`);
    if (r.maxWeeklyLossPct) parts.push(`${t('tsysMaxWeekly')}: ${r.maxWeeklyLossPct}%`);
    if ((r.noTradeConditions || []).length) {
      parts.push(`${t('tsysNoTradeLabel')}: ${r.noTradeConditions.map((id) => { const f = NO_TRADE.find((x) => x.id === id); return f ? lbl(f) : id; }).join(', ')}`);
    }
    if (r.maxCorrelatedExposure) parts.push(`${t('tsysMaxCorr')}: ${r.maxCorrelatedExposure}%`);
    if (r.checklistEnabled) parts.push(`${t('tsysChecklistOn')}`);
    // La caja también va en el resumen copiable: son reglas del sistema, no
    // ajustes de una pantalla.
    if (r.monthlyContribution) parts.push(`${t('tsysMonthlyContribution')}: ${r.monthlyContribution}`);
    if (r.monthlyProfitCapPct) parts.push(`${t('tsysMonthlyCap')}: ${r.monthlyProfitCapPct}%`);
    if (r.withdrawAboveBalance) parts.push(`${t('tsysWithdrawAbove')}: ${r.withdrawAboveBalance}`);
    return parts.join('\n');
  };

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(systemSummary());
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch (_) { /* clipboard unavailable */ }
  };

  const gaps = editing ? missingEssentials(editing) : [];

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-indigo-500/10" data-testid="setup-builder">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
          <Settings2 className="w-6 h-6 text-primary" /> {t('tsysTitle')}
        </CardTitle>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{t('tsysIntro')}</p>
        <div className="flex gap-2 pt-3">
          <Chip active={tab === 'setups'} onClick={() => setTab('setups')} testId="tsys-tab-setups">
            {t('tsysTabSetups')} ({system.setups.length})
          </Chip>
          <Chip active={tab === 'rules'} onClick={() => setTab('rules')} testId="tsys-tab-rules">
            {t('tsysTabRules')}
          </Chip>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {tab === 'rules' ? (
          <div className="space-y-6 max-w-2xl" data-testid="tsys-rules">
            <p className="text-sm text-muted-foreground">{t('tsysRulesIntro')}</p>

            <Section icon={ShieldAlert} title={t('tsysCircuitTitle')} hint={t('tsysCircuitHint')}>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                {t('tsysMaxDaily')}
                <Input type="number" min="0" step="0.5" className="w-24"
                  value={system.systemRules.maxDailyLossPct}
                  onChange={(e) => patchRules({ maxDailyLossPct: e.target.value })}
                  data-testid="tsys-max-daily" />
              </label>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                {t('tsysMaxWeekly')}
                <Input type="number" min="0" step="0.5" className="w-24"
                  value={system.systemRules.maxWeeklyLossPct}
                  onChange={(e) => patchRules({ maxWeeklyLossPct: e.target.value })} />
              </label>
            </Section>

            <Section icon={AlertTriangle} title={t('tsysNoTradeLabel')} hint={t('tsysNoTradeHint')}>
              {NO_TRADE.map((c) => (
                <Chip key={c.id} active={(system.systemRules.noTradeConditions || []).includes(c.id)}
                  onClick={() => toggleNoTrade(c.id)}>{lbl(c)}</Chip>
              ))}
            </Section>

            <Section icon={Layers} title={t('tsysMaxCorr')} hint={t('tsysMaxCorrHint')}>
              <Input type="number" min="0" step="0.5" className="w-24"
                value={system.systemRules.maxCorrelatedExposure}
                onChange={(e) => patchRules({ maxCorrelatedExposure: e.target.value })} />
            </Section>

            <Section icon={ListChecks} title={t('tsysChecklistTitle')} hint={t('tsysChecklistHint')}>
              <Chip active={system.systemRules.checklistEnabled}
                onClick={() => patchRules({ checklistEnabled: !system.systemRules.checklistEnabled })}>
                {system.systemRules.checklistEnabled ? t('tsysChecklistOn') : t('tsysChecklistOff')}
              </Chip>
            </Section>

            {/* Caja: no son reglas de entrada, son reglas de CUENTA, y mueven el
                resultado tanto como la operativa. La pestaña Proyección las
                aplica, así que dejan de ser una intención y se ven. */}
            <Section icon={Wallet} title={t('tsysCashTitle')} hint={t('tsysCashHint')}>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                {t('tsysMonthlyContribution')}
                <Input type="number" min="0" step="50" className="w-28"
                  value={system.systemRules.monthlyContribution}
                  onChange={(e) => patchRules({ monthlyContribution: e.target.value })}
                  data-testid="tsys-monthly-contribution" />
              </label>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                {t('tsysMonthlyCap')}
                <Input type="number" min="0" step="0.5" className="w-24"
                  value={system.systemRules.monthlyProfitCapPct}
                  onChange={(e) => patchRules({ monthlyProfitCapPct: e.target.value })}
                  data-testid="tsys-monthly-cap" />
              </label>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                {t('tsysWithdrawAbove')}
                <Input type="number" min="0" step="100" className="w-28"
                  value={system.systemRules.withdrawAboveBalance}
                  onChange={(e) => patchRules({ withdrawAboveBalance: e.target.value })}
                  data-testid="tsys-withdraw-above" />
              </label>
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed w-full">
                {t('tsysCashNote')}
              </p>
            </Section>
          </div>
        ) : !editing ? (
          /* ── LIBRARY ─────────────────────────────────────────────── */
          <div className="space-y-4" data-testid="tsys-library">
            {system.setups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">{t('tsysEmptyLibrary')}</p>
                <Button onClick={addSetup} data-testid="tsys-add-first">
                  <Plus className="w-4 h-4 mr-1.5" /> {t('tsysAddSetup')}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {system.setups.map((s) => {
                    const missing = missingEssentials(s);
                    return (
                      <div key={s.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm">{s.name || t('tsysUntitled')}</h4>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(s.id)} aria-label={t('tsysEdit')}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => duplicateSetup(s.id)} aria-label={t('tsysDuplicate')}>
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteSetup(s.id)} aria-label={t('tsysDelete')}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {[s.setupType && t(SETUP_TYPES.find((x) => x.id === s.setupType)?.k),
                            s.htfTimeframe && s.ltfTimeframe && `${s.htfTimeframe}→${s.ltfTimeframe}`,
                            s.riskPerTrade && `${s.riskPerTrade}%`,
                            s.rr && `R:R ${s.rr}`].filter(Boolean).join(' · ') || t('tsysNoDetail')}
                        </p>
                        {missing.length > 0 && (
                          <p className="text-xs text-amber-500 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {t('tsysIncomplete', { n: missing.length })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={addSetup} size="sm" data-testid="tsys-add-setup">
                    <Plus className="w-4 h-4 mr-1.5" /> {t('tsysAddSetup')}
                  </Button>
                  <Button onClick={doSave} size="sm" variant="outline">
                    {saved ? <><Check className="w-4 h-4 mr-1.5" /> {t('setupSaved')}</> : <><Save className="w-4 h-4 mr-1.5" /> {t('setupSave')}</>}
                  </Button>
                  <Button onClick={doCopy} size="sm" variant="outline" data-testid="tsys-copy">
                    {copied ? <><Check className="w-4 h-4 mr-1.5" /> {t('setupCopied')}</> : <><Copy className="w-4 h-4 mr-1.5" /> {t('tsysCopyAll')}</>}
                  </Button>
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground/70">{t('setupSavedHint')}</p>
          </div>
        ) : (
          /* ── EDITOR ──────────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="tsys-editor">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} data-testid="tsys-back">
                  <X className="w-4 h-4 mr-1.5" /> {t('tsysBackToLibrary')}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{t('setupNameLabel')}</h3>
                <Input value={editing.name} onChange={(e) => patchSetup({ name: e.target.value })}
                  placeholder={t('setupNamePh')} maxLength={60} data-testid="setup-name" />
              </div>

              <Section icon={Target} title={t('tsysTypeLabel')} hint={t('tsysTypeHint')}>
                {SETUP_TYPES.map((x) => (
                  <Chip key={x.id} active={editing.setupType === x.id}
                    onClick={() => patchSetup({ setupType: editing.setupType === x.id ? '' : x.id })}>{lbl(x)}</Chip>
                ))}
              </Section>

              <Section icon={Layers} title={t('tsysAssetsLabel')} hint={t('tsysAssetsHint')}>
                {ASSETS.map((x) => (
                  <Chip key={x.id} active={(editing.assets || []).includes(x.id)}
                    onClick={() => toggleIn('assets', x.id)}>{lbl(x)}</Chip>
                ))}
              </Section>
              <Input value={editing.tickers} onChange={(e) => patchSetup({ tickers: e.target.value })}
                placeholder={t('tsysTickersPh')} maxLength={120} />

              <Section icon={Clock} title={t('tsysHtfLabel')} hint={t('tsysHtfHint')}>
                {TIMEFRAMES.map((tf) => (
                  <Chip key={tf} active={editing.htfTimeframe === tf}
                    onClick={() => patchSetup({ htfTimeframe: editing.htfTimeframe === tf ? '' : tf })}>{tf}</Chip>
                ))}
              </Section>

              <Section icon={Clock} title={t('tsysLtfLabel')}>
                {TIMEFRAMES.map((tf) => (
                  <Chip key={tf} active={editing.ltfTimeframe === tf}
                    onClick={() => patchSetup({ ltfTimeframe: editing.ltfTimeframe === tf ? '' : tf })}>{tf}</Chip>
                ))}
              </Section>

              <Section icon={Layers} title={t('setupStyleLabel')}>
                {STYLES.map((s) => (
                  <Chip key={s.id} active={editing.style === s.id}
                    onClick={() => patchSetup({ style: editing.style === s.id ? '' : s.id })}>{lbl(s)}</Chip>
                ))}
              </Section>

              <Section icon={Clock} title={t('tsysSessionLabel')} hint={t('tsysSessionHint')}>
                {SESSIONS.map((s) => (
                  <Chip key={s.id} active={editing.session === s.id}
                    onClick={() => patchSetup({ session: editing.session === s.id ? '' : s.id })}>{lbl(s)}</Chip>
                ))}
              </Section>

              <Section icon={Layers} title={t('setupApproachLabel')}>
                {APPROACHES.map((a) => (
                  <Chip key={a.id} active={(editing.approaches || []).includes(a.id)}
                    onClick={() => toggleIn('approaches', a.id)}>{lbl(a)}</Chip>
                ))}
              </Section>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> {t('tsysChartPatternLabel')}
                </h3>
                <select
                  className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm"
                  value={editing.chartPattern}
                  onChange={(e) => patchSetup({ chartPattern: e.target.value })}
                  data-testid="tsys-chart-pattern"
                >
                  <option value="">{t('tsysNone')}</option>
                  {chartPatterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <Section icon={Layers} title={t('tsysCandleLabel')} hint={t('tsysCandleHint')}>
                {candlePatterns.slice(0, 30).map((p) => (
                  <Chip key={p.id} active={(editing.candlePatterns || []).includes(p.id)}
                    onClick={() => toggleIn('candlePatterns', p.id)}>
                    {p.name} <span className="opacity-60">{p.stats.successRate}%</span>
                  </Chip>
                ))}
              </Section>

              <Section icon={Layers} title={t('tsysSrLabel')} hint={t('tsysSrHint')}>
                {SR_METHODS.map((x) => (
                  <Chip key={x.id} active={editing.srMethod === x.id}
                    onClick={() => patchSetup({ srMethod: editing.srMethod === x.id ? '' : x.id })}>{lbl(x)}</Chip>
                ))}
              </Section>

              <Section icon={Wrench} title={t('setupToolsLabel')}>
                {TOOLS.map((tool) => (
                  <Chip key={tool.id} active={(editing.tools || []).includes(tool.id)}
                    onClick={() => toggleIn('tools', tool.id)}>{lbl(tool)}</Chip>
                ))}
              </Section>

              {/* The trigger — the piece that separates an operable setup from a
                  collection of tags. Without it two traders with identical tags
                  enter at completely different moments. */}
              <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-primary" /> {t('tsysTriggerLabel')}
                </h3>
                <p className="text-xs text-muted-foreground/80">{t('tsysTriggerHint')}</p>
                <Input value={editing.entryTrigger} onChange={(e) => patchSetup({ entryTrigger: e.target.value })}
                  placeholder={t('tsysTriggerPh')} maxLength={160} data-testid="tsys-trigger" />
                <h3 className="font-semibold text-sm pt-2">{t('tsysInvalidationLabel')}</h3>
                <p className="text-xs text-muted-foreground/80">{t('tsysInvalidationHint')}</p>
                <Input value={editing.invalidation} onChange={(e) => patchSetup({ invalidation: e.target.value })}
                  placeholder={t('tsysInvalidationPh')} maxLength={160} data-testid="tsys-invalidation" />
              </div>

              <Section icon={Shield} title={t('tsysStopLabel')} hint={t('tsysStopHint')}>
                {STOP_RULES.map((x) => (
                  <Chip key={x.id} active={editing.stopRule === x.id}
                    onClick={() => patchSetup({ stopRule: editing.stopRule === x.id ? '' : x.id })}>{lbl(x)}</Chip>
                ))}
              </Section>

              <div className="flex flex-wrap gap-3">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  {t('setupRiskPerTrade')}
                  <Input type="number" min="0" step="0.1" className="w-20"
                    value={editing.riskPerTrade} onChange={(e) => patchSetup({ riskPerTrade: e.target.value })} />
                </label>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  {t('setupRR')}
                  <Input type="number" min="0" step="0.1" className="w-20" placeholder="2"
                    value={editing.rr} onChange={(e) => patchSetup({ rr: e.target.value })} />
                </label>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  {t('tsysMaxConcurrentLabel')}
                  <Input type="number" min="0" step="1" className="w-20"
                    value={editing.maxConcurrent} onChange={(e) => patchSetup({ maxConcurrent: e.target.value })} />
                </label>
              </div>

              <Section icon={ListChecks} title={t('tsysMgmtLabel')}>
                {MANAGEMENT.map((x) => (
                  <Chip key={x.id} active={(editing.management || []).includes(x.id)}
                    onClick={() => toggleIn('management', x.id)}>{lbl(x)}</Chip>
                ))}
              </Section>
            </div>

            {/* RIGHT: live summary */}
            <div className="lg:sticky lg:top-20 self-start space-y-3">
              <div className="rounded-xl border border-border bg-card p-5 min-h-[220px]">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" /> {t('setupSummaryLabel')}
                </h3>
                {setupHasContent(editing) ? (
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed" data-testid="setup-summary">
                    {setupSummary(editing)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground/70">{t('setupEmpty')}</p>
                )}
              </div>

              {gaps.length > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4" data-testid="tsys-gaps">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> {t('tsysGapsTitle')}
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    {gaps.map((g) => <li key={g}>{t(`tsysGap_${g}`)}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={doSave} size="sm" data-testid="setup-save">
                  {saved ? <><Check className="w-4 h-4 mr-1.5" /> {t('setupSaved')}</> : <><Save className="w-4 h-4 mr-1.5" /> {t('setupSave')}</>}
                </Button>
                <Button onClick={() => setEditingId(null)} size="sm" variant="outline">
                  {t('tsysBackToLibrary')}
                </Button>
                <Button onClick={() => deleteSetup(editing.id)} size="sm" variant="ghost">
                  <Trash2 className="w-4 h-4 mr-1.5 text-destructive" /> {t('tsysDelete')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { EMPTY_SYSTEM_RULES };
