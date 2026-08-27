import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { EDU_MODULES, STRATEGIES } from '../../data/mockData';
import { BookOpen, ChevronRight, Zap, ArrowRight } from 'lucide-react';
import OptionsMechanics from './OptionsMechanics';

const BIAS_STYLES = {
  Bullish: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', labelKey: 'alcista_8e20d3', label: 'ALCISTA' },
  Bearish: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', labelKey: 'bajista_ab69a0', label: 'BAJISTA' },
  Neutral: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', labelKey: 'neutral_9e8b6e', label: 'NEUTRAL' },
  Volatile: { color: '#eab308', bg: 'rgba(234,179,8,0.08)', labelKey: 'volTil_9eeb74' },
};

/**
 * Pointer to the ONE canonical explanation of a concept.
 *
 * Delta, Gamma, Theta, Vega, IV and IV Rank were each explained independently
 * in up to six places across the app — the Academy module, this tab's
 * accordion, and this tab's grids, which sit a couple of screens apart in the
 * same scroll. Nothing was wrong; the problem is that nobody owned a single
 * version, so correcting one figure means remembering to touch all six, and
 * whichever one gets forgotten is where the site starts contradicting itself.
 *
 * The Academy modules are the canonical source. These sections keep their
 * practical, desk-level angle and link out for the definition instead of
 * restating it.
 */
const CanonicalLink = ({ topic, label }) => (
  <a
    href={`${process.env.PUBLIC_URL || ''}/education?topic=${topic}`}
    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    data-testid={`canonical-${topic}`}
  >
    {label} <ArrowRight className="w-3 h-3" />
  </a>
);

const EducationTab = ({ onSwitchToCalc }) => {
  const { t } = useTranslation();
  const [expandedModule, setExpandedModule] = useState(null);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{t('academiaDeOpciones_930f18')}</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            {t('deCeroAProfesional_c32b2c')}
          </p>
        </div>

        {/* Mechanics: premium pricing, real leverage, open/close, rolling */}
        <OptionsMechanics />

        {/* Education Modules */}
        <div className="grid gap-3 mb-10">
          {EDU_MODULES.map((mod) => (
            <div
              key={mod.title}
              className={`bg-card rounded-xl border transition-all overflow-hidden ${
                expandedModule === mod.title ? 'border-border' : 'border-border hover:border-border'
              }`}
            >
              <button
                onClick={() => setExpandedModule(expandedModule === mod.title ? null : mod.title)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                <span
                  className="text-2xl w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${mod.color}15`, color: mod.color }}
                >
                  {mod.icon}
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground">{t(mod.title)}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t(mod.content)}</p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    expandedModule === mod.title ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {expandedModule === mod.title && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t(mod.content)}</p>
                  <div className="space-y-2">
                    {mod.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-2.5 text-xs bg-muted rounded-lg px-4 py-3 border border-border"
                      >
                        <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: mod.color }} />
                        <span className="text-foreground leading-relaxed">{t(item)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Strategy Reference Table */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="text-primary">◆</span> {t('referenciaDeEstrategias_ed001')}
          </h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted">
                  {[t('estrategia_ed002'), t('bias_ed003'), t('maxProfit_cd2e46'), t('maxLoss_11dd51'), t('cuandoUsar_299994')].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STRATEGIES.map((s, i) => {
                  const bs = BIAS_STYLES[s.category] || BIAS_STYLES.Neutral;
                  return (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{t(s.name)}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: bs.bg, color: bs.color }}
                        >
                          {t(bs.labelKey)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-long">{s.maxProfit ? t(s.maxProfit) : 'Variable'}</td>
                      <td className="px-4 py-2.5 text-short">{s.maxLoss ? t(s.maxLoss) : 'Variable'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.whenToUse ? t(s.whenToUse) : t('verDescripcion_8d4e1f')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Advanced Options Strategies */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
            <span className="text-primary">◆</span> {t('advancedOptionsTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{t('advancedOptionsIntro')}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: t('ironCondorTitle'),
                desc: t('ironCondorDesc'),
                maxProfit: t('ironCondorMaxProfit'),
                maxLoss: t('ironCondorMaxLoss'),
                when: t('ironCondorWhen'),
                tip: t('ironCondorTip'),
              },
              {
                title: t('butterflySpreadTitle'),
                desc: t('butterflySpreadDesc'),
                maxProfit: t('butterflySpreadMaxProfit'),
                maxLoss: t('butterflySpreadMaxLoss'),
                when: t('butterflySpreadWhen'),
                tip: t('butterflySpreadTip'),
              },
              {
                title: t('calendarSpreadTitle'),
                desc: t('calendarSpreadDesc'),
                maxProfit: t('calendarSpreadMaxProfit'),
                maxLoss: t('calendarSpreadMaxLoss'),
                when: t('calendarSpreadWhen'),
                tip: t('calendarSpreadTip'),
                // Needs two different expirations per leg. The leg editor
                // models a single expiration and only takes a strike, so this
                // is the one card here describing something the calculator
                // cannot currently build — say so rather than let the user
                // hunt for a button that does not exist.
                notBuildable: true,
              },
              {
                title: t('diagonalSpreadTitle'),
                desc: t('diagonalSpreadDesc'),
                maxProfit: t('diagonalSpreadMaxProfit'),
                maxLoss: t('diagonalSpreadMaxLoss'),
                when: t('diagonalSpreadWhen'),
                tip: t('diagonalSpreadTip'),
                // Needs two different expirations per leg. The leg editor
                // models a single expiration and only takes a strike, so this
                // is the one card here describing something the calculator
                // cannot currently build — say so rather than let the user
                // hunt for a button that does not exist.
                notBuildable: true,
              },
            ].map((s) => (
              <div key={s.title} className="bg-card rounded-xl border border-border p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                <div className="space-y-1 text-xs">
                  <p className="text-long">{s.maxProfit}</p>
                  <p className="text-short">{s.maxLoss}</p>
                  <p className="text-muted-foreground">{s.when}</p>
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground border border-border">
                  {s.tip}
                </div>
                {s.notBuildable && (
                  <p className="text-[11px] leading-snug text-warn border border-warn/40 bg-warn/10 rounded-lg px-3 py-2">
                    {t('strategyNotBuildable')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Volatility Concepts */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
            <span className="text-primary">◆</span> {t('volatilityConceptsTitle')}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {t('canonicalVolNote')}{' '}
            <CanonicalLink topic="options-vol" label={t('canonicalVolLink')} />
          </p>
          <p className="text-sm text-muted-foreground mb-4">{t('volatilityConceptsIntro')}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: t('ivrTitle'),
                desc: t('ivrDesc'),
                lines: [t('ivrHigh'), t('ivrLow')],
              },
              {
                title: t('ivPercentileTitle'),
                desc: t('ivPercentileDesc'),
                lines: [],
              },
              {
                title: t('volSkewTitle'),
                desc: t('volSkewDesc'),
                lines: [t('volSkewPut'), t('volSkewCall')],
              },
              {
                title: t('vixTitle'),
                desc: t('vixDesc'),
                lines: [t('vixHigh'), t('vixLow')],
              },
            ].map((c) => (
              <div key={c.title} className="bg-card rounded-xl border border-border p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                {c.lines.length > 0 && (
                  <div className="space-y-1">
                    {c.lines.map((line) => (
                      <div key={line} className="flex items-start gap-2 text-xs bg-muted rounded-lg px-3 py-2 border border-border">
                        <span className="text-muted-foreground">{line}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Greeks Deep Dive */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
            <span className="text-primary">◆</span> {t('greeksDeepDiveTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mb-2">{t('greeksDeepDiveIntro')}</p>
          <p className="text-xs text-muted-foreground mb-4">
            {t('canonicalGreeksNote')}{' '}
            <CanonicalLink topic="option-greeks" label={t('canonicalGreeksLink')} />
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: t('deltaHedgingTitle'),
                desc: t('deltaHedgingDesc'),
                note: t('deltaHedgingUse'),
                noteColor: '#3b82f6',
              },
              {
                title: t('gammaRiskTitle'),
                desc: t('gammaRiskDesc'),
                note: t('gammaRiskWarning'),
                noteColor: '#ef4444',
              },
              {
                title: t('thetaDecayTitle'),
                desc: t('thetaDecayDesc'),
                note: t('thetaDecayTarget'),
                noteColor: '#22c55e',
              },
              {
                title: t('vegaIVTitle'),
                desc: t('vegaIVDesc'),
                note: null,
                lines: [t('vegaLong'), t('vegaShort')],
                noteColor: null,
              },
            ].map((g) => (
              <div key={g.title} className="bg-card rounded-xl border border-border p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground">{g.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{g.desc}</p>
                {g.note && (
                  <div
                    className="rounded-lg px-3 py-2 text-xs border"
                    style={{ color: g.noteColor, backgroundColor: `${g.noteColor}15`, borderColor: `${g.noteColor}30` }}
                  >
                    {g.note}
                  </div>
                )}
                {g.lines && (
                  <div className="space-y-1">
                    {g.lines.map((line) => (
                      <div key={line} className="flex items-start gap-2 text-xs bg-muted rounded-lg px-3 py-2 border border-border">
                        <span className="text-muted-foreground">{line}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-muted to-card rounded-xl border border-border p-6 text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">{t('listoParaOperar_98196f')}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
            {t('simuladorDesc_ed004')}
          </p>
          <button
            onClick={onSwitchToCalc}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary/15 border border-primary/40 text-primary rounded-lg text-sm font-semibold hover:bg-primary/25 transition-colors"
          >
            {t('abrirSimulador_ed005')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EducationTab;
