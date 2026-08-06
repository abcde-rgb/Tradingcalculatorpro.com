import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, AlertTriangle, RotateCcw, Dice5, Target, Gauge, CalendarRange, PiggyBank, Route,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fetchAnalytics } from '@/services/performanceApi';
import { loadSystem, setupRulesFor, cashflowRules } from '@/lib/tradingSystem';
import {
  project, sensitivity, breakevenWinRate, hitRates, cashflowCost, routesToTarget,
  MIN_SAMPLE_FOR_PROJECTION, MIN_SAMPLE_TO_PROJECT_AT_ALL, RUIN_THRESHOLD,
} from '@/lib/projection';

const money = (v) => `${v > 0 ? '+' : ''}$${Number(v || 0).toFixed(0)}`;
const pct = (v) => `${v > 0 ? '+' : ''}${Number(v || 0).toFixed(1)}%`;
const tone = (v) => (v > 0 ? 'text-[#22c55e]' : v < 0 ? 'text-[#ef4444]' : 'text-foreground');

/** Un campo variable, con lo que mide el diario detrás. */
const VarField = ({ label, value, onChange, measured, source, sample, suffix, step = '0.1', t }) => (
  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
        {label}
      </span>
      {/* Medido o supuesto: una proyección sobre supuestos es una hipótesis, y
          confundirla con una medición es lo que hace que alguien dimensione
          una cuenta real contra un número inventado. */}
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
          source === 'measured'
            ? 'bg-[#22c55e]/15 text-[#22c55e]'
            : 'bg-[#f59e0b]/15 text-[#f59e0b]'
        }`}
        title={source === 'measured'
          ? t('projFromJournalTip').replace('{n}', String(sample ?? 0))
          : t('projAssumedTip')}
      >
        {source === 'measured' ? t('projMeasured') : t('projAssumed')}
      </span>
    </div>
    <div className="flex items-center gap-1 mt-1">
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent font-mono font-bold text-sm outline-none"
      />
      {suffix && <span className="text-[11px] text-muted-foreground shrink-0">{suffix}</span>}
      {measured != null && Number(value) !== Number(measured) && (
        <button
          type="button"
          onClick={() => onChange(String(measured))}
          title={t('projResetToMeasured').replace('{v}', String(measured))}
          className="text-muted-foreground hover:text-primary shrink-0"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  </div>
);

const Stat = ({ label, value, sub, color = 'text-foreground', testid }) => (
  <div className="rounded-lg border border-border bg-card px-3 py-2" data-testid={testid}>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
      {label}
    </div>
    <div className={`font-mono font-bold text-base ${color}`}>{value}</div>
    {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
  </div>
);

/**
 * Proyección a futuro sobre la operativa REAL.
 *
 * Todo es variable, pero cada variable arranca en lo que mide el diario y
 * declara si sigue siendo una medición o ya es un supuesto del usuario. Lo que
 * se proyecta es una DISTRIBUCIÓN de miles de secuencias remuestreadas, no una
 * línea: la media de un proceso con rachas no es lo que le pasa a nadie.
 */
export default function ProjectionPanel({ refreshKey, onGoToJournal }) {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');       // '' = todas
  const [overrides, setOverrides] = useState({});
  // Las reglas de caja se escriben en el sistema (pestaña Setups → Reglas) y se
  // leen aquí: el usuario las define una vez y la proyección las aplica.
  const [cash, setCash] = useState(() => cashflowRules(loadSystem()));
  // Periodo con el que se lee el rendimiento y objetivo contra el que medirlo.
  // Un objetivo mensual sólo se puede juzgar mirando la distribución de MESES:
  // el total de la proyección no dice si ese 10 % se toca alguna vez.
  const [period, setPeriod] = useState('month');
  const [target, setTarget] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Releer el sistema en cada refresco: el constructor está en la pestaña de
    // al lado y las reglas pueden haber cambiado hace un segundo.
    setCash(cashflowRules(loadSystem()));
    fetchAnalytics()
      .then((d) => { if (!cancelled) setAnalytics(d?.analytics || null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const group = useMemo(
    () => (analytics?.by_setup || []).find((g) => g.group === groupName) || null,
    [analytics, groupName],
  );

  // El riesgo por operación sale del SETUP elegido cuando lo tiene escrito:
  // es la regla que el usuario se puso, no una constante nuestra.
  const setupRisk = useMemo(() => {
    if (!groupName) return null;
    const rules = setupRulesFor(loadSystem(), [groupName]);
    return rules.riskSource === 'setup' ? rules.maxRiskPct : null;
  }, [groupName]);

  // Al cambiar de muestra se sueltan los supuestos: si no, los números de un
  // setup se quedarían pegados a los de otro sin avisar.
  useEffect(() => { setOverrides({}); }, [groupName]);

  const result = useMemo(() => {
    if (!analytics) return null;
    const seeded = { ...overrides };
    if (seeded.riskPct == null && setupRisk != null) {
      seeded.riskPct = setupRisk;
      seeded.riskSource = 'measured';
    }
    // El saldo de AHORA, no el del primer día: se proyecta desde donde está
    // la cuenta, no desde donde estaba.
    if (seeded.balance == null && analytics.current_balance) {
      seeded.balance = analytics.current_balance;
      seeded.balanceSource = 'measured';
    }
    if (seeded.trades == null) {
      seeded.trades = Math.max(20, group ? group.n : (analytics.closed_trades || 100));
    }
    // Reglas de caja del sistema, salvo que el usuario las esté moviendo aquí.
    if (seeded.contribution == null && cash.monthlyContribution != null) {
      seeded.contribution = cash.monthlyContribution;
      seeded.contributionSource = 'measured';
    }
    if (seeded.capPct == null && cash.monthlyProfitCapPct != null) {
      seeded.capPct = cash.monthlyProfitCapPct;
      seeded.capSource = 'measured';
    }
    if (seeded.withdrawAbove == null && cash.withdrawAboveBalance != null) {
      seeded.withdrawAbove = cash.withdrawAboveBalance;
      seeded.withdrawSource = 'measured';
    }
    return project(analytics, { group, overrides: seeded });
  }, [analytics, group, overrides, setupRisk, cash]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t('loading')}…</div>;
  if (!result) return null;

  const { inputs, measured, expectancyR: eR, expectancyMoney, sample, distribution } = result;
  const be = breakevenWinRate(inputs.payoff.value);
  const edge = be != null && inputs.winRate.value != null ? inputs.winRate.value - be : null;
  const sens = sensitivity(inputs.winRate.value, inputs.payoff.value);
  const set = (k) => (v) => setOverrides((p) => ({ ...p, [k]: v === '' ? null : Number(v) }));
  // El objetivo por defecto es el tope mensual si lo hay: es el número que el
  // usuario ya ha declarado querer.
  const targetPct = target === '' ? (inputs.capPct.value ?? null) : Number(target);
  const hits = distribution ? hitRates(distribution, targetPct) : null;
  const per = distribution?.periods?.[period] || null;
  // Modo objetivo: la ecuación del puente leída al revés. Sólo se calcula si
  // hay un objetivo escrito, porque son tres proyecciones más.
  const routes = (result.ok && targetPct) ? routesToTarget(analytics, {
    group,
    overrides: {
      ...overrides,
      balance: inputs.balance.value,
      riskPct: inputs.riskPct.value,
      trades: inputs.trades.value,
      tradesPerMonth: inputs.tradesPerMonth.value,
    },
    targetMonthlyPct: targetPct,
  }) : null;
  const cost = result.ok ? cashflowCost(analytics, {
    group,
    overrides: {
      ...overrides,
      balance: inputs.balance.value,
      riskPct: inputs.riskPct.value,
      trades: inputs.trades.value,
      tradesPerMonth: inputs.tradesPerMonth.value,
      contribution: inputs.contribution.value,
      capPct: inputs.capPct.value,
      withdrawAbove: inputs.withdrawAbove.value,
    },
  }) : null;

  return (
    <div className="space-y-4" data-testid="projection-panel">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> {t('projTitle')}
        </h3>
        <select
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="text-xs bg-muted border border-border rounded-md px-2 py-1"
          data-testid="proj-sample"
        >
          <option value="">{t('projAllTrades')}</option>
          {(analytics?.by_setup || [])
            .filter((g) => g.group !== '—')
            .map((g) => (
              <option key={g.group} value={g.group}>{g.group} ({g.n})</option>
            ))}
        </select>
      </div>

      {/* La muestra manda: una previsión sobre cuatro operaciones no es una
          previsión con mucho error, es ruido con formato de gráfico. */}
      {sample < MIN_SAMPLE_TO_PROJECT_AT_ALL ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center"
             data-testid="proj-no-sample">
          <Dice5 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t('projNoSample')
              .replace('{n}', String(sample))
              .replace('{min}', String(MIN_SAMPLE_TO_PROJECT_AT_ALL))}
          </p>
          {onGoToJournal && (
            <button type="button" onClick={onGoToJournal} className="text-primary text-xs hover:underline mt-3">
              {t('setupPerfGoToJournal')}
            </button>
          )}
        </div>
      ) : (
        <>
          {sample < MIN_SAMPLE_FOR_PROJECTION && (
            <div className="flex items-start gap-2 rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/5 px-3 py-2"
                 data-testid="proj-thin-sample">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#f59e0b] leading-relaxed">
                {t('projThinSample')
                  .replace('{n}', String(sample))
                  .replace('{min}', String(MIN_SAMPLE_FOR_PROJECTION))}
              </p>
            </div>
          )}

          {/* 1 · Las variables */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <VarField
              t={t} label={t('projWinRate')} suffix="%" step="1"
              value={inputs.winRate.value} onChange={set('winRate')}
              measured={measured.winRate.value} source={inputs.winRate.source}
              sample={inputs.winRate.sample}
            />
            <VarField
              t={t} label={t('projPayoff')} suffix="R"
              value={inputs.payoff.value} onChange={set('payoff')}
              measured={measured.payoff.value} source={inputs.payoff.source}
              sample={inputs.payoff.sample}
            />
            <VarField
              t={t} label={t('projRiskPct')} suffix="%"
              value={inputs.riskPct.value} onChange={set('riskPct')}
              measured={setupRisk} source={inputs.riskPct.source}
            />
            <VarField
              t={t} label={t('projTrades')} step="10"
              value={inputs.trades.value} onChange={set('trades')}
              measured={null} source={inputs.trades.source}
            />
            <VarField
              t={t} label={t('projBalance')} suffix="$" step="100"
              value={inputs.balance.value} onChange={set('balance')}
              measured={analytics?.current_balance ?? null} source={inputs.balance.source}
            />
            <VarField
              t={t} label={t('projTradesPerMonth')} step="1"
              value={inputs.tradesPerMonth.value} onChange={set('tradesPerMonth')}
              measured={measured.tradesPerMonth} source={inputs.tradesPerMonth.source}
              sample={sample}
            />
            <label className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(overrides.compound)}
                onChange={(e) => setOverrides((p) => ({ ...p, compound: e.target.checked }))}
              />
              <span className="text-[11px] font-semibold">{t('projCompound')}</span>
            </label>
          </div>

          {/* 1b · Reglas de caja: lo que entra y sale cada mes. Se definen en
              el sistema (Setups → Reglas) y se pueden probar aquí sin tocarlo. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <VarField
              t={t} label={t('projContribution')} suffix="$" step="50"
              value={inputs.contribution.value} onChange={set('contribution')}
              measured={cash.monthlyContribution} source={inputs.contribution.source}
            />
            <VarField
              t={t} label={t('projMonthlyCap')} suffix="%" step="0.5"
              value={inputs.capPct.value} onChange={set('capPct')}
              measured={cash.monthlyProfitCapPct} source={inputs.capPct.source}
            />
            <VarField
              t={t} label={t('projWithdrawAbove')} suffix="$" step="100"
              value={inputs.withdrawAbove.value} onChange={set('withdrawAbove')}
              measured={cash.withdrawAboveBalance} source={inputs.withdrawAbove.source}
            />
          </div>

          {/* 2 · La cuenta que decide si el resto importa */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat
              label={t('projExpectancy')}
              value={eR == null ? '—' : `${eR > 0 ? '+' : ''}${eR} R`}
              sub={expectancyMoney == null ? undefined : t('projPerTrade').replace('{v}', money(expectancyMoney))}
              color={tone(eR)}
              testid="proj-expectancy"
            />
            <Stat
              label={t('projBreakeven')}
              value={be == null ? '—' : `${be}%`}
              sub={t('projBreakevenSub')}
              testid="proj-breakeven"
            />
            <Stat
              label={t('projEdge')}
              value={edge == null ? '—' : `${edge > 0 ? '+' : ''}${edge.toFixed(1)} pts`}
              sub={t('projEdgeSub')}
              color={tone(edge)}
              testid="proj-edge"
            />
            <Stat
              label={t('projSampleLabel')}
              value={`${sample}`}
              sub={t('projSampleSub')}
              testid="proj-sample-size"
            />
          </div>

          {/* 3 · La distribución */}
          {distribution && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid="proj-distribution">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {t('projDistTitle').replace('{n}', String(inputs.trades.value))}
                </h4>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                  {t('projPaths').replace('{n}', String(distribution.iterations))}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Stat
                  label={t('projMedian')} color={tone(distribution.roi.p50)}
                  value={pct(distribution.roi.p50)}
                  sub={money(distribution.finalBalance.p50 - inputs.balance.value)}
                />
                <Stat
                  label={t('projBadRun')} color={tone(distribution.roi.p5)}
                  value={pct(Math.max(-100, distribution.roi.p5))}
                  sub={t('projPercentile5')}
                />
                <Stat
                  label={t('projGoodRun')} color={tone(distribution.roi.p95)}
                  value={pct(distribution.roi.p95)}
                  sub={t('projPercentile95')}
                />
                <Stat
                  label={t('projMaxDD')}
                  value={`${distribution.maxDrawdown.p50.toFixed(1)}%`}
                  sub={t('projMaxDDSub').replace('{v}', distribution.maxDrawdown.p95.toFixed(1))}
                  color="text-[#f59e0b]"
                />
                <Stat
                  label={t('projProfitable')}
                  value={`${distribution.probabilityOfProfit.toFixed(0)}%`}
                  sub={t('projProfitableSub')}
                  color={distribution.probabilityOfProfit >= 50 ? 'text-[#22c55e]' : 'text-[#f59e0b]'}
                />
                <Stat
                  label={t('projRuin')}
                  value={`${distribution.probabilityOfRuin.toFixed(1)}%`}
                  sub={t('projRuinSub').replace('{v}', String(RUIN_THRESHOLD * 100))}
                  color={distribution.probabilityOfRuin > 5 ? 'text-[#ef4444]' : 'text-muted-foreground'}
                />
                {/* Perder la mitad del patrimonio y quedarse sin cuenta con la
                    que operar son sucesos distintos: al trader le importan los
                    dos, y quien retira el exceso puede sufrir el segundo sin el
                    primero. */}
                <Stat
                  label={t('projAccountWiped')}
                  value={`${distribution.probabilityOfAccountWiped.toFixed(1)}%`}
                  sub={t('projAccountWipedSub')}
                  color={distribution.probabilityOfAccountWiped > 5 ? 'text-[#ef4444]' : 'text-muted-foreground'}
                />
              </div>

              {/* Caja: sin esto, retirar el exceso parece empeorar el
                  resultado cuando lo que hace es ponerlo a salvo. */}
              {(distribution.contributed.p50 > 0 || distribution.withdrawn.p50 > 0
                || distribution.monthsCapped.p50 > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1" data-testid="proj-cashflow">
                  <Stat
                    label={t('projContributed')}
                    value={money(distribution.contributed.p50)}
                    sub={t('projOverMonths').replace('{n}', String(distribution.months.p50))}
                  />
                  <Stat
                    label={t('projWithdrawn')}
                    value={money(distribution.withdrawn.p50)}
                    sub={t('projWithdrawnSub')}
                    color="text-[#22c55e]"
                  />
                  <Stat
                    label={t('projNetWorth')}
                    value={`$${distribution.netWorth.p50.toFixed(0)}`}
                    sub={t('projNetWorthSub')}
                    color={tone(distribution.netWorth.p50 - inputs.balance.value)}
                  />
                  <Stat
                    label={t('projMonthsCapped')}
                    value={`${distribution.monthsCapped.p50}`}
                    sub={t('projMonthsCappedSub')}
                    color={distribution.monthsCapped.p50 > 0 ? 'text-[#f59e0b]' : 'text-muted-foreground'}
                  />
                </div>
              )}

              {distribution.roi.p5 <= -100 && (
                <p className="text-[10px] text-[#ef4444] leading-relaxed">{t('projBelowZeroNote')}</p>
              )}
            </div>
          )}


          {/* 3b · POR PERIODO — mes, trimestre y año.
              Es la lectura que decide si un objetivo mensual es realista: la
              media puede salir de dos meses excelentes y diez planos, y eso no
              se ve en el total. */}
          {per && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid="proj-periods">
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarRange className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider">{t('projPeriodTitle')}</h4>
                <div className="ml-auto flex gap-1 bg-muted rounded-md border border-border p-0.5">
                  {['month', 'quarter', 'year'].map((k) => (
                    <button
                      type="button"
                      key={k}
                      onClick={() => setPeriod(k)}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        period === k ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`proj-period-${k}`}
                    >
                      {t(`projPeriod_${k}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label={t('projPeriodTypical')} value={pct(per.p50)} color={tone(per.p50)}
                  sub={t('projPeriodTypicalSub')} />
                <Stat label={t('projPeriodBad')} value={pct(per.p5)} color={tone(per.p5)}
                  sub={t('projPercentile5')} />
                <Stat label={t('projPeriodGood')} value={pct(per.p95)} color={tone(per.p95)}
                  sub={t('projPercentile95')} />
                <Stat label={t('projPeriodRed')} value={`${per.negativeRate}%`}
                  color={per.negativeRate > 33 ? 'text-[#ef4444]' : 'text-[#f59e0b]'}
                  sub={t('projPeriodRedSub')} />
              </div>

              {/* ¿Cada cuánto llego de verdad al objetivo? Y qué estoy pidiendo
                  en trimestre y año cuando pido ese número al mes. */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-muted-foreground">{t('projTargetLabel')}</span>
                <input
                  type="number"
                  step="0.5"
                  value={target === '' ? (inputs.capPct.value ?? '') : target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="10"
                  className="w-20 bg-muted border border-border rounded-md px-2 py-1 text-xs font-mono"
                  data-testid="proj-target"
                />
                <span className="text-[11px] text-muted-foreground">%</span>
              </div>
              {hits && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2" data-testid="proj-hitrates">
                  {['month', 'quarter', 'year'].map((k) => (
                    <div key={k} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {t(`projPeriod_${k}`)} · {pct(hits[k].target)}
                      </div>
                      <div className={`font-mono font-bold text-base ${
                        (hits[k].rate ?? 0) >= 50 ? 'text-[#22c55e]' : (hits[k].rate ?? 0) >= 20 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                      }`}
                      >
                        {hits[k].rate == null ? '—' : `${hits[k].rate}%`}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t('projHitSub')}</div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/80 leading-relaxed">{t('projTargetNote')}</p>
            </div>
          )}


          {/* 3d · MODO OBJETIVO — la ecuación leída al revés.
              Tres caminos al mismo sitio, y sólo uno es barato. */}
          {routes && !routes.alreadyThere && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3" data-testid="proj-routes">
              <div className="flex items-center gap-2 flex-wrap">
                <Route className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t('projRoutesTitle').replace('{target}', String(routes.target))}
                </h4>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {t('projRoutesNow').replace('{v}', String(routes.current ?? '—'))}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t('projBridgeEquation')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  {
                    k: 'edge',
                    label: t('projRouteEdge'),
                    need: routes.edge.feasible
                      ? t('projRouteEdgeNeed')
                        .replace('{r}', String(routes.edge.needed))
                        .replace('{wr}', String(routes.edge.neededWinRate))
                        .replace('{cur}', String(routes.edge.currentWinRate))
                      : t('projRouteImpossible'),
                    o: routes.edge.outcome,
                    hint: t('projRouteEdgeHint'),
                  },
                  {
                    k: 'frequency',
                    label: t('projRouteFrequency'),
                    need: t('projRouteFrequencyNeed')
                      .replace('{n}', String(routes.frequency.needed))
                      .replace('{cur}', String(routes.frequency.current)),
                    o: routes.frequency.outcome,
                    hint: t('projRouteFrequencyHint'),
                  },
                  {
                    k: 'risk',
                    label: t('projRouteRisk'),
                    need: t('projRouteRiskNeed')
                      .replace('{v}', String(routes.risk.needed))
                      .replace('{cur}', String(routes.risk.current)),
                    o: routes.risk.outcome,
                    hint: t('projRouteRiskHint'),
                  },
                ].map(({ k, label, need, o, hint }) => (
                  <div key={k} className="rounded-lg border border-border bg-card p-3" data-testid={`proj-route-${k}`}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
                    <div className="text-sm font-bold font-mono mt-0.5">{need}</div>
                    {o && (
                      <div className="mt-2 space-y-0.5 text-[11px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('projRouteHit')}</span>
                          <span className={o.hitRate >= 50 ? 'text-[#22c55e]' : 'text-[#f59e0b]'}>{o.hitRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('projRouteDD')}</span>
                          <span className={o.drawdownP95 > 25 ? 'text-[#ef4444]' : o.drawdownP95 > 15 ? 'text-[#f59e0b]' : 'text-[#22c55e]'}>
                            {o.drawdownP95}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('projRouteRed')}</span>
                          <span className={o.redMonths > 20 ? 'text-[#ef4444]' : 'text-muted-foreground'}>{o.redMonths}%</span>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-2">{hint}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#f59e0b] leading-relaxed">{t('projRoutesLesson')}</p>
            </div>
          )}

          {/* 3c · EL PRECIO DE LA CAJA — la comparación que decide una vida de
              trading y que casi nadie hace. */}
          {cost && cost.ratio && cost.ratio > 1.05 && (
            <div className="rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/5 p-4" data-testid="proj-cashflow-cost">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="w-4 h-4 text-[#f59e0b]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
                  {t('projCostTitle')}
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Stat label={t('projCostWithRules')} value={`$${cost.withRules.toFixed(0)}`} sub={t('projCostWithRulesSub')} />
                <Stat label={t('projCostCompounded')} value={`$${cost.compounded.toFixed(0)}`} sub={t('projCostCompoundedSub')} color="text-[#22c55e]" />
                <Stat label={t('projCostRatio')} value={`×${cost.ratio}`} sub={t('projCostRatioSub').replace('{n}', String(cost.months))} color="text-[#f59e0b]" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">{t('projCostNote')}</p>
            </div>
          )}

          {/* 4 · Qué pasa si la decisión cambia */}
          <div className="rounded-xl border border-border bg-card p-4" data-testid="proj-sensitivity">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider">{t('projSensTitle')}</h4>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">{t('projSensIntro')}</p>
            <div className="flex flex-wrap gap-1.5">
              {sens.map((s) => (
                <div
                  key={s.deltaWinRate}
                  className={`px-2 py-1 rounded-md border text-[11px] font-mono ${
                    s.deltaWinRate === 0 ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'
                  }`}
                >
                  <span className="text-muted-foreground">{s.winRate}% → </span>
                  <span className={tone(s.expectancyR)}>
                    {s.expectancyR > 0 ? '+' : ''}{s.expectancyR} R
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="text-[10px] text-muted-foreground/80 leading-relaxed">{t('projDisclaimer')}</p>
    </div>
  );
}
