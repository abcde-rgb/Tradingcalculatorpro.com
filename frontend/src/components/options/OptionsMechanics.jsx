import React, { useState, useMemo } from 'react';
import {
  BookOpen, Layers, ArrowRightLeft, RefreshCw, AlertTriangle, Check, X,
  TrendingUp, ChevronRight,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getOptionsMechanics } from '@/lib/optionsMechanicsContent';
import RollCalculator from './RollCalculator';

/**
 * OptionsMechanics — the plumbing of options trading, in four sections:
 * how the premium is priced, real leverage, open/close actions and rolling.
 *
 * Content comes from lib/optionsMechanicsContent.js (es + en, English fallback
 * for the other locales). No i18n keys are added for the prose; only the four
 * tab labels, which are short and go through t().
 */

const Card = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>{children}</div>
);

const H = ({ children }) => (
  <h4 className="text-sm font-bold text-foreground mb-2">{children}</h4>
);

const Bullets = ({ items, icon: Icon = ChevronRight, tone = 'text-primary' }) => (
  <ul className="space-y-1.5">
    {items.map((it) => (
      <li key={it} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
        <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${tone}`} />
        <span>{it}</span>
      </li>
    ))}
  </ul>
);

/* ── Order-flow diagram: you → broker → market maker → book ── */
const OrderFlowDiagram = ({ steps }) => (
  <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
    {steps.map((s, i) => (
      <React.Fragment key={s}>
        <div className="flex-1 min-w-[110px] rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
            {String(i + 1).padStart(2, '0')}
          </div>
          <div className="text-xs font-semibold leading-tight">{s}</div>
        </div>
        {i < steps.length - 1 && (
          <div className="flex items-center text-muted-foreground shrink-0">
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

/* ── Live notional vs effective leverage ─────────────────────── */
const LeverageLab = ({ es }) => {
  const [spot, setSpot] = useState(100);
  const [mult, setMult] = useState(100);
  const [premium, setPremium] = useState(2);
  const [delta, setDelta] = useState(0.5);

  const { notional, cost, nominal, effective } = useMemo(() => {
    const n = spot * mult;
    const c = premium * mult;
    const nl = c > 0 ? n / c : 0;
    return { notional: n, cost: c, nominal: nl, effective: nl * delta };
  }, [spot, mult, premium, delta]);

  const F = ({ label, value, onChange, step = 1 }) => (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="mt-1 w-full h-8 rounded-md border border-border bg-background px-2 font-mono text-sm"
      />
    </label>
  );

  return (
    <Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
        <F label={es ? 'Subyacente' : 'Underlying'} value={spot} onChange={setSpot} />
        <F label={es ? 'Multiplicador' : 'Multiplier'} value={mult} onChange={setMult} />
        <F label={es ? 'Prima' : 'Premium'} value={premium} onChange={setPremium} step={0.1} />
        <F label="Delta" value={delta} onChange={setDelta} step={0.05} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          [es ? 'Nocional' : 'Notional', notional.toLocaleString(undefined, { maximumFractionDigits: 0 }), false],
          [es ? 'Coste' : 'Cost', cost.toLocaleString(undefined, { maximumFractionDigits: 0 }), false],
          [es ? 'Apal. nocional' : 'Notional lev.', `${nominal.toFixed(1)}×`, false],
          [es ? 'Apal. efectivo' : 'Effective lev.', `${effective.toFixed(1)}×`, true],
        ].map(([k, v, accent]) => (
          <div
            key={k}
            className={`rounded-lg border p-2.5 ${accent ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'}`}
          >
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className={`font-mono font-bold ${accent ? 'text-primary' : ''}`}>{v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const OptionsMechanics = () => {
  const { locale, t } = useTranslation();
  const lang = locale === 'es' ? 'es' : 'en';
  const es = lang === 'es';
  const C = getOptionsMechanics(lang);
  const [tab, setTab] = useState('pricing');

  const TABS = [
    { id: 'pricing', icon: BookOpen, label: t('omTabPricing') },
    { id: 'leverage', icon: TrendingUp, label: t('omTabLeverage') },
    { id: 'openclose', icon: Layers, label: t('omTabOpenClose') },
    { id: 'rolling', icon: RefreshCw, label: t('omTabRolling') },
  ];

  return (
    <section className="mb-10" data-testid="options-mechanics">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{t('omTitle')}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4 max-w-2xl">{t('omIntro')}</p>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            data-testid={`om-tab-${id}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
              tab === id
                ? 'bg-primary/15 text-primary border-primary/40'
                : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* 1 · Premium pricing */}
      {tab === 'pricing' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{C.pricing.lead}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {C.pricing.venues.map((v) => (
              <Card key={v.k}>
                <H>{v.k}</H>
                <p className="text-xs text-muted-foreground leading-relaxed">{v.v}</p>
              </Card>
            ))}
          </div>

          <Card>
            <H>{C.pricing.formula.title}</H>
            <div className="space-y-2.5">
              {C.pricing.formula.parts.map((p) => (
                <div key={p.k} className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-primary shrink-0 w-40">{p.k}</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{p.v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <H>{C.pricing.flow.title}</H>
            <OrderFlowDiagram steps={C.pricing.flow.steps} />
            <p className="text-xs text-muted-foreground leading-relaxed mt-3">{C.pricing.flow.note}</p>
          </Card>

          <Card>
            <H>{C.pricing.delta.title}</H>
            <p className="text-xs text-muted-foreground leading-relaxed">{C.pricing.delta.v}</p>
          </Card>
        </div>
      )}

      {/* 2 · Leverage */}
      {tab === 'leverage' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{C.leverage.lead}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[C.leverage.nominal, C.leverage.effective].map((b, i) => (
              <Card key={b.title} className={i === 1 ? 'border-primary/40' : ''}>
                <H>{b.title}</H>
                <code className="block text-[11px] font-mono bg-muted/50 rounded px-2 py-1.5 mb-2 text-primary">
                  {b.formula}
                </code>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.v}</p>
              </Card>
            ))}
          </div>

          <LeverageLab es={es} />

          <Card className="border-amber-500/40 bg-amber-500/5">
            <div className="flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{C.leverage.warning}</p>
            </div>
          </Card>
        </div>
      )}

      {/* 3 · Open / close */}
      {tab === 'openclose' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{C.openClose.lead}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {C.openClose.actions.map((a) => {
              const opening = a.dir === 'open';
              const credit = /cr[eé]dit/i.test(a.flow);
              return (
                <Card
                  key={a.code}
                  className={opening ? 'border-primary/40' : 'border-blue-500/40'}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        opening ? 'bg-primary/15 text-primary' : 'bg-blue-500/15 text-blue-500'
                      }`}
                    >
                      {a.code}
                    </span>
                    <span className="text-sm font-semibold">{es ? a.es : a.en}</span>
                    <span
                      className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        credit ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'
                      }`}
                    >
                      {a.flow}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{a.v}</p>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <H>{C.openClose.howToOpen.title}</H>
              <ol className="space-y-1.5">
                {C.openClose.howToOpen.steps.map((s, i) => (
                  <li key={s} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="font-mono font-bold text-primary shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
            <Card>
              <H>{C.openClose.howToClose.title}</H>
              <div className="space-y-2 mb-3">
                {C.openClose.howToClose.ways.map((w) => (
                  <div key={w.k}>
                    <div className="text-xs font-semibold text-foreground">{w.k}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{w.v}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/60">
                {C.openClose.howToClose.partial}
              </p>
            </Card>
          </div>

          <Card className="border-red-500/30">
            <H>{C.openClose.risks.title}</H>
            <Bullets items={C.openClose.risks.items} icon={AlertTriangle} tone="text-red-500" />
          </Card>
        </div>
      )}

      {/* 4 · Rolling */}
      {tab === 'rolling' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{C.rolling.lead}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {C.rolling.futuresVsOptions.map((b) => (
              <Card key={b.k}>
                <H>{b.k}</H>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.v}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {C.rolling.types.map((ty) => (
              <Card key={ty.k}>
                <div className="text-xs font-bold text-primary mb-1">{ty.k}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ty.v}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <H>{C.rolling.when.title} — {es ? 'futuros' : 'futures'}</H>
              <Bullets items={C.rolling.when.futures} />
            </Card>
            <Card>
              <H>{C.rolling.when.title} — {es ? 'opciones' : 'options'}</H>
              <Bullets items={C.rolling.when.options} />
            </Card>
          </div>

          <Card className="border-amber-500/40">
            <H>{C.rolling.cost.title}</H>
            <Bullets items={C.rolling.cost.items} tone="text-amber-500" />
            <p className="text-xs text-foreground leading-relaxed mt-3 pt-3 border-t border-border/60 font-medium">
              {C.rolling.cost.key}
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <H>{C.rolling.checklist.title} — {es ? 'futuros' : 'futures'}</H>
              <Bullets items={C.rolling.checklist.futures} icon={Check} tone="text-emerald-500" />
            </Card>
            <Card>
              <H>{C.rolling.checklist.title} — {es ? 'opciones' : 'options'}</H>
              <Bullets items={C.rolling.checklist.options} icon={Check} tone="text-emerald-500" />
            </Card>
          </div>

          <Card className="border-red-500/30">
            <H>{C.rolling.mistakes.title}</H>
            <Bullets items={C.rolling.mistakes.items} icon={X} tone="text-red-500" />
            <p className="text-xs text-foreground leading-relaxed mt-3 pt-3 border-t border-border/60 font-medium">
              {C.rolling.mistakes.big}
            </p>
          </Card>

          {/* The theory above is only useful if you can price the roll. */}
          <RollCalculator />
        </div>
      )}
    </section>
  );
};

export default OptionsMechanics;
