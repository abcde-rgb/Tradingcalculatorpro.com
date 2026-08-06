import React, { useEffect, useMemo, useState } from 'react';
import { Layers, AlertTriangle, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fetchAnalytics } from '@/services/performanceApi';
import {
  loadSystem, joinSetupPerformance, missingEssentials, setupRulesFor,
} from '@/lib/tradingSystem';
import { expectancyR, monthlyFromEdge } from '@/lib/projection';

const pnlColor = (v) => (v > 0 ? 'text-[#22c55e]' : v < 0 ? 'text-[#ef4444]' : 'text-muted-foreground');
const money = (v) => `${v > 0 ? '+' : ''}$${Number(v || 0).toFixed(2)}`;

/**
 * Rendimiento por setup: la librería del sistema cruzada con el diario.
 *
 * El desglose por setup ya existía en la analítica, pero agrupaba **texto
 * libre**: cada operación traía el setup tecleado a mano, así que "Ruptura NY",
 * "ruptura ny" y "Rupt NY" salían como tres grupos, ninguno con muestra
 * suficiente para decir nada. Y al revés: un setup definido con todo detalle en
 * el sistema no aparecía por ningún lado hasta que alguien escribía su nombre
 * exacto.
 *
 * Aquí se juntan los dos lados y se separan tres cosas que NO son lo mismo:
 *
 *   · definido y operado      → sus números
 *   · definido y sin operar   → **sin muestra**, que no es un 0 % de acierto
 *   · operado sin estar en el sistema → o es una errata, o es una operación
 *     fuera del plan; en ambos casos hay que verlo, no sumarlo a otra cosa
 */
export default function SetupPerformance({ refreshKey, onDefineSetups, onGoToJournal, onPickSetup }) {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState(null);
  const [system, setSystem] = useState(() => loadSystem());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // El sistema vive en el navegador (localStorage) y el constructor está en
    // esta misma pestaña: se relee en cada refresco, no sólo al montar.
    setSystem(loadSystem());
    fetchAnalytics()
      .then((d) => { if (!cancelled) setAnalytics(d?.analytics || null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const joined = useMemo(
    () => joinSetupPerformance(system.setups, analytics?.by_setup),
    [system, analytics],
  );

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{t('loading')}…</div>;
  }

  const { defined, offSystem, unlabelled, counts } = joined;

  if (counts.defined === 0) {
    return (
      <div
        className="text-center py-12 px-4 bg-card border border-dashed border-border rounded-xl"
        data-testid="setupperf-empty"
      >
        <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">{t('setupPerfEmptyTitle')}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{t('setupPerfEmptyBody')}</p>
        {onDefineSetups && (
          <button
            type="button"
            onClick={onDefineSetups}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            data-testid="setupperf-empty-cta"
          >
            {t('setupPerfDefineCta')} <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="setup-performance">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Layers className="w-4 h-4" /> {t('setupPerfTitle')}
        </h3>
        <span className="text-[11px] text-muted-foreground font-mono">
          {t('setupPerfCounts')
            .replace('{traded}', String(counts.traded))
            .replace('{defined}', String(counts.defined))}
        </span>
      </div>

      {/* Una operación con dos setups cuenta en los dos grupos: es lo que
          responde este desglose. Y por eso los totales suman más operaciones de
          las que hay, cosa que se dice en vez de dejar que se deduzca mal. */}
      {analytics?.setups_multi_tagged > 0 && (
        <p className="text-[10px] text-muted-foreground/80 leading-relaxed" data-testid="setupperf-multi-note">
          {t('setupPerfMultiNote').replace('{n}', String(analytics.setups_multi_tagged))}
        </p>
      )}

      {/* Definidos: con números, o con la ausencia de números bien dicha. */}
      <div className="space-y-2">
        {defined.map(({ setup, stats }) => {
          const gaps = missingEssentials(setup);
          // Lo que este setup aporta a la rentabilidad MENSUAL de la cuenta:
          //     esperanza (R) × sus operaciones al mes × riesgo por operación
          // Es lo que convierte la lista en un orden accionable: un setup de
          // 0,4 R que se da dos veces al mes aporta menos que uno de 0,15 R
          // que se da quince, y sin esta línea los dos se leen igual.
          const payoff = (stats?.avg_win != null && stats?.avg_loss)
            ? stats.avg_win / Math.abs(stats.avg_loss) : null;
          const edge = payoff != null ? expectancyR(stats.win_rate, payoff) : null;
          const risk = setupRulesFor(system, [setup.name]).maxRiskPct;
          const contribution = (edge != null && stats?.trades_per_month != null)
            ? monthlyFromEdge(edge, stats.trades_per_month, risk) : null;
          const openTrades = stats && onPickSetup
            ? () => onPickSetup(setup.name)
            : undefined;
          return (
            <div
              key={setup.id}
              className={`bg-card border border-border rounded-xl px-4 py-3 ${
                openTrades ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''
              }`}
              data-testid="setupperf-row"
              // Del número a las operaciones que lo producen: un marcador que no
              // deja abrir su muestra obliga a buscarla a mano en la tabla.
              onClick={openTrades}
              onKeyDown={openTrades ? (e) => { if (e.key === 'Enter') openTrades(); } : undefined}
              role={openTrades ? 'button' : undefined}
              tabIndex={openTrades ? 0 : undefined}
              title={openTrades ? t('setupPerfOpenTrades') : undefined}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">
                  {setup.name || t('setupPerfUnnamed')}
                </span>
                {setup.style && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                    {setup.style}
                  </span>
                )}
                {gaps.length > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[#f59e0b] font-semibold"
                    title={t('setupPerfGapsTip')}
                  >
                    {t('setupPerfGaps').replace('{n}', String(gaps.length))}
                  </span>
                )}
                {stats ? (
                  <span className={`ml-auto font-mono font-bold text-sm ${pnlColor(stats.pnl)}`}>
                    {money(stats.pnl)}
                  </span>
                ) : (
                  <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    {t('setupPerfNoSample')}
                  </span>
                )}
              </div>
              {/* El puente al resultado de la cuenta. Sin ritmo medido o sin
                  payoff todavía, se dice que falta el dato en vez de estimarlo. */}
              {stats && (
                <div className="mt-1.5 text-[11px]" data-testid="setupperf-contribution">
                  {contribution != null ? (
                    <span className={contribution > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}>
                      {t('setupPerfContribution')
                        .replace('{v}', `${contribution > 0 ? '+' : ''}${contribution}`)
                        .replace('{r}', String(edge))
                        .replace('{n}', String(stats.trades_per_month))
                        .replace('{risk}', String(risk))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70">{t('setupPerfContributionUnknown')}</span>
                  )}
                </div>
              )}
              {stats && (
                <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-muted-foreground">
                  <span>{t('setupPerfTrades').replace('{n}', String(stats.n))}</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {stats.win_rate}% · {stats.wins}/{stats.n}
                  </span>
                  {/* Barra de acierto: proporción, no adjetivo. */}
                  <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[160px]">
                    <span
                      className="block h-full bg-[#22c55e]"
                      style={{ width: `${Math.max(0, Math.min(100, stats.win_rate))}%` }}
                    />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Operado fuera del sistema: errata o salto del plan. Las dos importan. */}
      {offSystem.length > 0 && (
        <div
          className="rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/5 px-4 py-3"
          data-testid="setupperf-offsystem"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
              {t('setupPerfOffSystem')}
            </span>
            <span className="ml-auto text-[11px] font-mono text-muted-foreground">
              {t('setupPerfOffSystemCount')
                .replace('{trades}', String(counts.offSystemTrades))
                .replace('{n}', String(counts.offSystem))}
            </span>
          </div>
          <div className="space-y-1">
            {offSystem.slice(0, 6).map((r) => (
              <div
                key={r.group}
                className={`flex items-center gap-3 text-xs ${onPickSetup ? 'cursor-pointer hover:text-foreground' : ''}`}
                onClick={onPickSetup ? () => onPickSetup(r.group) : undefined}
                onKeyDown={onPickSetup ? (e) => { if (e.key === 'Enter') onPickSetup(r.group); } : undefined}
                role={onPickSetup ? 'button' : undefined}
                tabIndex={onPickSetup ? 0 : undefined}
              >
                <span className="truncate max-w-[220px]">{r.group}</span>
                <span className="font-mono text-muted-foreground">
                  {t('setupPerfTrades').replace('{n}', String(r.n))} · {r.win_rate}%
                </span>
                <span className={`ml-auto font-mono ${pnlColor(r.pnl)}`}>{money(r.pnl)}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-2">
            {t('setupPerfOffSystemNote')}
          </p>
        </div>
      )}

      {/* Operaciones sin setup: dato que falta, no indisciplina. */}
      {unlabelled?.n > 0 && (
        <div
          className="flex items-center gap-2 text-[11px] text-muted-foreground rounded-lg border border-border bg-muted/40 px-3 py-2"
          data-testid="setupperf-unlabelled"
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{t('setupPerfUnlabelled').replace('{n}', String(unlabelled.n))}</span>
          {onGoToJournal && (
            <button
              type="button"
              onClick={onGoToJournal}
              className="ml-auto text-primary hover:underline shrink-0"
            >
              {t('setupPerfGoToJournal')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
