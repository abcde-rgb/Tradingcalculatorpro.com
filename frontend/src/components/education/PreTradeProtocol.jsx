import React, { useState, useMemo } from 'react';
import {
  Shield, ListChecks, Brain, CheckCircle2, AlertTriangle, XCircle,
  RotateCcw, Gauge, Circle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';

// "Pre-trade protocol" — three interactive discipline tools shown as one module:
//   1. Stop rules (circuit breakers): daily/weekly/streak loss limits in R + currency.
//   2. Pre-trade checklist: 8 go/no-go conditions → traffic-light verdict.
//   3. Emotional readiness: 7 honest questions → "are you fit to trade today?".
// Verdict colours are STATUS colours (good/warning/critical) and always ship with
// an icon + label, never colour alone.

const GO = '#22c55e';    // good
const WAIT = '#f59e0b';  // warning
const STOP = '#ef4444';  // critical

const fmt = (n) =>
  Number.isFinite(n) ? n.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—';

// ── Shared verdict banner ──────────────────────────────────────────────
function Verdict({ tone, Icon, name, desc }) {
  const color = tone === 'go' ? GO : tone === 'wait' ? WAIT : STOP;
  return (
    <div
      className="flex items-start gap-3 rounded-lg border p-3.5"
      style={{ borderColor: `${color}55`, background: `${color}14` }}
      data-testid={`verdict-${tone}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} />
      <div>
        <p className="text-sm font-bold" style={{ color }}>{name}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ── Shared score meter (status-coloured, with numeric label) ───────────
function Meter({ pct, color }) {
  return (
    <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ═══ 1 · STOP RULES ════════════════════════════════════════════════════
function StopRules() {
  const { t } = useTranslation();
  const [capital, setCapital] = useState(1000);
  const [riskPct, setRiskPct] = useState(1);
  const [dailyR, setDailyR] = useState(3);
  const [weeklyR, setWeeklyR] = useState(6);
  const [consec, setConsec] = useState(3);
  const [maxTrades, setMaxTrades] = useState(4);

  const oneR = useMemo(() => (capital * riskPct) / 100, [capital, riskPct]);
  const daily = oneR * dailyR;
  const weekly = oneR * weeklyR;

  const sliders = [
    { id: 'dailyR', label: t('brkDaily'), val: dailyR, set: setDailyR, min: 1, max: 6, suffix: 'R' },
    { id: 'weeklyR', label: t('brkWeekly'), val: weeklyR, set: setWeeklyR, min: 2, max: 15, suffix: 'R' },
    { id: 'consec', label: t('brkConsec'), val: consec, set: setConsec, min: 2, max: 6, suffix: '' },
    { id: 'maxTrades', label: t('brkTrades'), val: maxTrades, set: setMaxTrades, min: 1, max: 12, suffix: '' },
  ];

  const rules = [
    t('brkRuleR', { r: fmt(oneR) }),
    t('brkRuleDaily', { v: fmt(daily), n: dailyR }),
    t('brkRuleWeekly', { v: fmt(weekly), n: weeklyR }),
    t('brkRuleConsec', { n: consec }),
    t('brkRuleTrades', { n: maxTrades }),
  ];

  return (
    <Card className="bg-card border-border" data-testid="stop-rules">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-5 h-5 text-short" />
          {t('brkTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t('brkIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('brkCapital')}</span>
            <Input type="number" min={0} value={capital}
                   onChange={(e) => setCapital(Math.max(0, parseFloat(e.target.value) || 0))}
                   className="mt-1 font-mono" data-testid="brk-capital" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('brkRisk')} (%)</span>
            <Input type="number" min={0.1} max={5} step={0.1} value={riskPct}
                   onChange={(e) => setRiskPct(Math.max(0.1, Math.min(5, parseFloat(e.target.value) || 0.1)))}
                   className="mt-1 font-mono" data-testid="brk-risk" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {sliders.map((s) => (
            <div key={s.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-mono font-bold text-foreground">{s.val}{s.suffix}</span>
              </div>
              <input type="range" min={s.min} max={s.max} step={1} value={s.val}
                     onChange={(e) => s.set(parseInt(e.target.value))}
                     className="w-full accent-primary" data-testid={`brk-${s.id}`} />
            </div>
          ))}
        </div>

        {/* Rulebook */}
        <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-3.5" data-testid="brk-rulebook">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-short mb-2">{t('brkRulebook')}</p>
          <ul className="space-y-1.5">
            {rules.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                <Circle className="w-1.5 h-1.5 mt-1.5 flex-shrink-0 fill-red-500 text-short" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed italic">{t('brkNote')}</p>
      </CardContent>
    </Card>
  );
}

// ═══ 2 · PRE-TRADE CHECKLIST ═══════════════════════════════════════════
const CHECK_ITEMS = ['pckItem1', 'pckItem2', 'pckItem3', 'pckItem4', 'pckItem5', 'pckItem6', 'pckItem7', 'pckItem8'];

function PreTradeChecklist() {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(() => new Set());
  const toggle = (i) => setChecked((prev) => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });
  const score = checked.size;
  const total = CHECK_ITEMS.length;
  const pct = (score / total) * 100;
  const tone = score >= 7 ? 'go' : score >= 5 ? 'wait' : 'stop';
  const color = tone === 'go' ? GO : tone === 'wait' ? WAIT : STOP;
  const verdict = {
    go: { Icon: CheckCircle2, name: t('pckGoName'), desc: t('pckGoDesc') },
    wait: { Icon: AlertTriangle, name: t('pckWaitName'), desc: t('pckWaitDesc') },
    stop: { Icon: XCircle, name: t('pckSkipName'), desc: t('pckSkipDesc') },
  }[tone];

  return (
    <Card className="bg-card border-border" data-testid="pre-trade-checklist">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="w-5 h-5 text-primary" />
          {t('pckTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t('pckIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          {CHECK_ITEMS.map((k, i) => {
            const on = checked.has(i);
            return (
              <button key={k} type="button" onClick={() => toggle(i)}
                      className={`w-full flex items-start gap-2.5 text-left rounded-md border px-3 py-2 transition-colors ${
                        on ? 'border-primary/40 bg-primary/10' : 'border-border bg-background/40 hover:bg-muted/40'
                      }`}
                      data-testid={`pck-item-${i}`}>
                {on ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                <span className={`text-sm leading-snug ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{t(k)}</span>
              </button>
            );
          })}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground uppercase tracking-wider">{t('pckScore')}</span>
            <span className="font-mono font-bold" style={{ color }}>{score}/{total}</span>
          </div>
          <Meter pct={pct} color={color} />
        </div>

        <Verdict tone={tone} {...verdict} />

        <button type="button" onClick={() => setChecked(new Set())}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="pck-reset">
          <RotateCcw className="w-3 h-3" /> {t('pckReset')}
        </button>
      </CardContent>
    </Card>
  );
}

// ═══ 3 · EMOTIONAL READINESS ═══════════════════════════════════════════
// healthy = the answer (true=yes) that indicates good condition to trade.
const READY_Q = [
  { k: 'rdyQ1', healthy: true },
  { k: 'rdyQ2', healthy: false },
  { k: 'rdyQ3', healthy: false },
  { k: 'rdyQ4', healthy: false },
  { k: 'rdyQ5', healthy: true },
  { k: 'rdyQ6', healthy: false },
  { k: 'rdyQ7', healthy: true },
];

function EmotionalReadiness() {
  const { t } = useTranslation();
  const [ans, setAns] = useState({}); // idx -> true(yes)/false(no)
  const answered = Object.keys(ans).length;
  const healthy = READY_Q.reduce((n, q, i) => n + (i in ans && ans[i] === q.healthy ? 1 : 0), 0);
  const total = READY_Q.length;
  const pct = (healthy / total) * 100;
  const tone = healthy >= 6 ? 'go' : healthy >= 4 ? 'wait' : 'stop';
  const color = tone === 'go' ? GO : tone === 'wait' ? WAIT : STOP;
  const verdict = {
    go: { Icon: CheckCircle2, name: t('rdyGoName'), desc: t('rdyGoDesc') },
    wait: { Icon: AlertTriangle, name: t('rdyWaitName'), desc: t('rdyWaitDesc') },
    stop: { Icon: XCircle, name: t('rdyStopName'), desc: t('rdyStopDesc') },
  }[tone];

  return (
    <Card className="bg-card border-border" data-testid="emotional-readiness">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="w-5 h-5 text-info" />
          {t('rdyTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t('rdyIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          {READY_Q.map((q, i) => (
            <div key={q.k} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
              <span className="text-sm text-muted-foreground leading-snug min-w-0">{t(q.k)}</span>
              <div className="flex gap-1 flex-shrink-0">
                {[{ v: true, l: t('rdyYes') }, { v: false, l: t('rdyNo') }].map((opt) => {
                  const sel = ans[i] === opt.v;
                  return (
                    <button key={String(opt.v)} type="button"
                            onClick={() => setAns((p) => ({ ...p, [i]: opt.v }))}
                            className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${
                              sel ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                            }`}
                            data-testid={`rdy-${i}-${opt.v ? 'yes' : 'no'}`}>
                      {opt.l}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground uppercase tracking-wider">{t('rdyScore')}</span>
            <span className="font-mono font-bold" style={{ color }}>{healthy}/{total}</span>
          </div>
          <Meter pct={pct} color={color} />
        </div>

        {answered === total && <Verdict tone={tone} {...verdict} />}

        <button type="button" onClick={() => setAns({})}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="rdy-reset">
          <RotateCcw className="w-3 h-3" /> {t('rdyReset')}
        </button>
      </CardContent>
    </Card>
  );
}

// ═══ WRAPPER ═══════════════════════════════════════════════════════════
export default function PreTradeProtocol() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6" data-testid="pre-trade-protocol">
      <Card className="bg-gradient-to-br from-red-500/5 via-card to-primary/5 border-foreground/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
            <Gauge className="w-5 h-5 text-primary" />
            {t('protoTitle')}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('protoIntro')}</p>
        </CardHeader>
      </Card>
      <StopRules />
      <PreTradeChecklist />
      <EmotionalReadiness />
    </div>
  );
}
