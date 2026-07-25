import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings2, Save, Copy, Check, RotateCcw, Clock, Layers, Wrench, Shield } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const STORAGE_KEY = 'tcp-trading-setup';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
// {id} is stored; {k} is an i18n key, {s} a static (language-neutral) label.
const STYLES = [
  { id: 'scalping', k: 'gl64t' }, { id: 'day', k: 'setupStyleDay' },
  { id: 'swing', k: 'gl63t' }, { id: 'position', k: 'setupStylePosition' },
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
];

const EMPTY = { name: '', timeframe: '', style: '', approaches: [], tools: [], risk: '', rr: '' };

export default function SetupBuilder() {
  const { t } = useTranslation();
  const [setup, setSetup] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const lbl = useCallback((o) => (o.k ? t(o.k) : o.s), [t]);

  // Load once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSetup({ ...EMPTY, ...JSON.parse(raw) });
    } catch (_) { /* ignore */ }
  }, []);

  // Auto-persist on change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(setup)); } catch (_) { /* ignore */ }
  }, [setup]);

  const set = (patch) => { setSetup((s) => ({ ...s, ...patch })); setSaved(false); };
  const toggle = (field, id) => setSetup((s) => {
    const arr = s[field].includes(id) ? s[field].filter((x) => x !== id) : [...s[field], id];
    return { ...s, [field]: arr };
  });

  const hasContent = setup.timeframe || setup.style || setup.approaches.length || setup.tools.length;

  const summaryText = () => {
    const styleLbl = STYLES.find((x) => x.id === setup.style);
    const ap = setup.approaches.map((id) => lbl(APPROACHES.find((a) => a.id === id) || { s: id }));
    const tl = setup.tools.map((id) => lbl(TOOLS.find((a) => a.id === id) || { s: id }));
    const lines = [];
    if (setup.name) lines.push(`★ ${setup.name}`);
    if (setup.timeframe) lines.push(`${t('setupTfLabel')}: ${setup.timeframe}`);
    if (styleLbl) lines.push(`${t('setupStyleLabel')}: ${lbl(styleLbl)}`);
    if (ap.length) lines.push(`${t('setupApproachLabel')}: ${ap.join(', ')}`);
    if (tl.length) lines.push(`${t('setupToolsLabel')}: ${tl.join(', ')}`);
    if (setup.risk) lines.push(`${t('setupRiskPerTrade')}: ${setup.risk}%`);
    if (setup.rr) lines.push(`${t('setupRR')}: ${setup.rr}`);
    return lines.join('\n');
  };

  const doSave = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(setup)); } catch (_) {} setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const doReset = () => { setSetup(EMPTY); setSaved(false); };
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(summaryText()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (_) {}
  };

  const Chip = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active ? 'bg-primary text-primary-foreground border-primary'
               : 'bg-card text-muted-foreground border-border hover:border-primary/50'
      }`}
    >
      {children}
    </button>
  );

  const Section = ({ icon: Icon, title, children }) => (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-indigo-500/10" data-testid="setup-builder">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
          <Settings2 className="w-6 h-6 text-primary" /> {t('setupTitle')}
        </CardTitle>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{t('setupIntro')}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: configurador */}
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">{t('setupNameLabel')}</h3>
            <Input value={setup.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('setupNamePh')} maxLength={60} data-testid="setup-name" />
          </div>

          <Section icon={Clock} title={t('setupTfLabel')}>
            {TIMEFRAMES.map((tf) => (
              <Chip key={tf} active={setup.timeframe === tf} onClick={() => set({ timeframe: setup.timeframe === tf ? '' : tf })}>{tf}</Chip>
            ))}
          </Section>

          <Section icon={Layers} title={t('setupStyleLabel')}>
            {STYLES.map((s) => (
              <Chip key={s.id} active={setup.style === s.id} onClick={() => set({ style: setup.style === s.id ? '' : s.id })}>{lbl(s)}</Chip>
            ))}
          </Section>

          <Section icon={Layers} title={t('setupApproachLabel')}>
            {APPROACHES.map((a) => (
              <Chip key={a.id} active={setup.approaches.includes(a.id)} onClick={() => toggle('approaches', a.id)}>{lbl(a)}</Chip>
            ))}
          </Section>

          <Section icon={Wrench} title={t('setupToolsLabel')}>
            {TOOLS.map((tool) => (
              <Chip key={tool.id} active={setup.tools.includes(tool.id)} onClick={() => toggle('tools', tool.id)}>{lbl(tool)}</Chip>
            ))}
          </Section>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> {t('setupRiskLabel')}</h3>
            <div className="flex flex-wrap gap-3">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                {t('setupRiskPerTrade')}
                <Input type="number" min="0" step="0.1" value={setup.risk} onChange={(e) => set({ risk: e.target.value })} className="w-20" />
              </label>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                {t('setupRR')}
                <Input type="number" min="0" step="0.1" value={setup.rr} onChange={(e) => set({ rr: e.target.value })} className="w-20" placeholder="2" />
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT: resumen */}
        <div className="lg:sticky lg:top-20 self-start">
          <div className="rounded-xl border border-border bg-card p-5 min-h-[220px]">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> {t('setupSummaryLabel')}</h3>
            {hasContent || setup.name ? (
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed" data-testid="setup-summary">{summaryText()}</pre>
            ) : (
              <p className="text-sm text-muted-foreground/70">{t('setupEmpty')}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={doSave} size="sm" data-testid="setup-save">
              {saved ? <><Check className="w-4 h-4 mr-1.5" /> {t('setupSaved')}</> : <><Save className="w-4 h-4 mr-1.5" /> {t('setupSave')}</>}
            </Button>
            <Button onClick={doCopy} size="sm" variant="outline" disabled={!hasContent && !setup.name}>
              {copied ? <><Check className="w-4 h-4 mr-1.5" /> {t('setupCopied')}</> : <><Copy className="w-4 h-4 mr-1.5" /> {t('setupCopy')}</>}
            </Button>
            <Button onClick={doReset} size="sm" variant="ghost">
              <RotateCcw className="w-4 h-4 mr-1.5" /> {t('setupReset')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-3">{t('setupSavedHint')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
