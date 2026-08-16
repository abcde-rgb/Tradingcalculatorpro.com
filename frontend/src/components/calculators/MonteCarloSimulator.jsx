import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { FlaskConical, Play, AlertTriangle, Crown, Trash2, Dice5, BookOpen } from 'lucide-react';
import { useIsPremium } from '@/lib/premium';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { usePersistedState } from '@/hooks/usePersistedState';
import { listTrades } from '@/services/performanceApi';
import { runMonteCarlo } from '@/lib/monteCarlo';

/** Cuántas operaciones del diario se traen como muestra para remuestrear. */
const MAX_TRADES_MUESTRA = 500;

const dinero = (v) =>
  v === null || v === undefined ? '—' : `$${Math.round(v).toLocaleString('en-US')}`;
const pct = (v, d = 1) => (v === null || v === undefined ? '—' : `${v.toFixed(d)}%`);

export function MonteCarloSimulator() {
  const isPremium = useIsPremium();
  const { t } = useTranslation();
  const [corriendo, setCorriendo] = useState(false);
  const [results, setResults] = useState(null);
  const [muestra, setMuestra] = useState(null);   // P&L reales del diario
  const [avisoDiario, setAvisoDiario] = useState(null);

  const [datos, setDatos, borrarDatos] = usePersistedState('montecarlo_simulator', {
    mode: 'fixed',            // fixed · percent · journal
    winRate: 55,
    avgWin: '100',
    avgLoss: '-50',
    riskPct: '1',
    payoff: '2',
    compound: false,
    dispersion: 40,           // % de desviación típica relativa
    initialCapital: '10000',
    numTrades: 100,
    numSimulations: 2000,
    seed: 1,
  });

  const set = (k) => (v) => setDatos((p) => ({ ...p, [k]: Array.isArray(v) ? v[0] : v }));
  const {
    mode, winRate, avgWin, avgLoss, riskPct, payoff, compound,
    dispersion, initialCapital, numTrades, numSimulations, seed,
  } = datos;

  /** Trae las operaciones cerradas del diario para remuestrearlas. */
  const cargarDiario = useCallback(async () => {
    setAvisoDiario(null);
    try {
      const data = await listTrades({ limit: MAX_TRADES_MUESTRA });
      const lista = Array.isArray(data) ? data : (data?.trades || []);
      const pnls = lista
        .map((tr) => Number(tr.pnl))
        .filter((v) => Number.isFinite(v) && v !== 0);
      if (!pnls.length) {
        setMuestra(null);
        setAvisoDiario('vacio');
        return;
      }
      setMuestra(pnls);
      set('mode')('journal');
    } catch {
      setMuestra(null);
      setAvisoDiario('error');
    }
    // `set` se recrea en cada render pero no captura nada mutable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ejecutar = () => {
    if (!isPremium) return;
    setCorriendo(true);
    const base = {
      capital: initialCapital,
      trades: numTrades,
      iterations: numSimulations,
      seed,
      dispersion: dispersion / 100,
    };
    const cfg =
      mode === 'journal' ? { ...base, sample: muestra || [] }
      : mode === 'percent' ? { ...base, winRate, sizing: 'percent', riskPct, payoff, compound }
      : { ...base, winRate, sizing: 'fixed', avgWin, avgLoss };

    setResults(runMonteCarlo(cfg));
    setCorriendo(false);
  };

  const nuevaSemilla = () => set('seed')(Math.floor(Math.random() * 1e9) + 1);

  if (!isPremium) {
    return (
      <Card className="bg-card border-border" data-testid="monte-carlo-locked">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-primary" />
            </div>
            {t('monteCarlo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Crown className="w-10 h-10 mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground mb-4">{t('monteCarloDescription')}</p>
          <Button asChild><Link to="/pricing">{t('unlockPremium')}</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const st = results?.statistics;

  return (
    <Card className="bg-card border-border" data-testid="monte-carlo-simulator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-primary" />
          </div>
          {t('monteCarlo')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── De dónde salen los resultados ────────────────────── */}
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('mcSourceLabel')}</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="mc-mode">
            {[
              { id: 'fixed', label: t('mcModeFixed') },
              { id: 'percent', label: t('mcModePercent') },
              { id: 'journal', label: t('mcModeJournal') },
            ].map((m) => (
              <button
                type="button" key={m.id}
                onClick={() => (m.id === 'journal' && !muestra ? cargarDiario() : set('mode')(m.id))}
                className={`px-3 py-2 rounded-sharp text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                  mode === m.id ? 'bg-primary/15 text-primary border-primary/50'
                                : 'border-rule text-muted-foreground hover:text-foreground'}`}
                data-testid={`mc-mode-${m.id}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === 'journal' && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5" data-testid="mc-journal-state">
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              {muestra
                ? t('mcJournalReady').replace('{n}', String(muestra.length))
                : avisoDiario === 'vacio' ? t('mcJournalEmpty')
                : avisoDiario === 'error' ? t('mcJournalError')
                : t('mcJournalLoading')}
            </p>
          )}
        </div>

        {/* ── Parámetros de la estrategia ──────────────────────── */}
        {mode !== 'journal' && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t('winRate')}</Label>
                <span className="text-sm font-semibold text-primary tabular-nums">{winRate}%</span>
              </div>
              <Slider value={[winRate]} onValueChange={set('winRate')} min={1} max={99} step={1}
                data-testid="winrate-slider" />
            </div>

            {mode === 'fixed' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{t('avgProfit')} ($)</Label>
                  <Input type="number" value={avgWin} onChange={(e) => set('avgWin')(e.target.value)}
                    className="tabular-nums" data-testid="avg-win-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('avgLoss')} ($)</Label>
                  <Input type="number" value={avgLoss} onChange={(e) => set('avgLoss')(e.target.value)}
                    className="tabular-nums" data-testid="avg-loss-input" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">{t('mcRiskPct')}</Label>
                    <Input type="number" step="0.1" value={riskPct} onChange={(e) => set('riskPct')(e.target.value)}
                      className="tabular-nums" data-testid="mc-risk-pct" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{t('mcPayoff')}</Label>
                    <Input type="number" step="0.1" value={payoff} onChange={(e) => set('payoff')(e.target.value)}
                      className="tabular-nums" data-testid="mc-payoff" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!compound}
                    onChange={(e) => set('compound')(e.target.checked)} data-testid="mc-compound" />
                  {t('mcCompound')}
                </label>
              </>
            )}

            {/* La dispersión es el cambio que más mueve el percentil 5 y el
                drawdown, así que se explica en la propia pantalla. */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t('mcDispersion')}</Label>
                <span className="text-sm font-semibold text-primary tabular-nums">{dispersion}%</span>
              </div>
              <Slider value={[dispersion]} onValueChange={set('dispersion')} min={0} max={150} step={5}
                data-testid="mc-dispersion" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {dispersion === 0 ? t('mcDispersionZero') : t('mcDispersionHint')}
              </p>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">{t('initialBalance')} ($)</Label>
            <Input type="number" value={initialCapital} onChange={(e) => set('initialCapital')(e.target.value)}
              className="tabular-nums" data-testid="capital-input" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t('numTrades')}</Label>
            <Input type="number" value={numTrades} onChange={(e) => set('numTrades')(e.target.value)}
              className="tabular-nums" data-testid="num-trades-input" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('simulations')}</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{numSimulations.toLocaleString()}</span>
          </div>
          <Slider value={[numSimulations]} onValueChange={set('numSimulations')} min={100} max={10000} step={100}
            data-testid="simulations-slider" />
        </div>

        {/* La semilla a la vista: es lo que hace que un resultado se pueda
            compartir y volver a comprobar. */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label className="text-sm">{t('mcSeed')}</Label>
            <Input type="number" value={seed} onChange={(e) => set('seed')(e.target.value)}
              className="tabular-nums" data-testid="mc-seed" />
          </div>
          <Button variant="outline" onClick={nuevaSemilla} className="gap-2" data-testid="mc-new-seed">
            <Dice5 className="w-4 h-4" /> {t('mcNewSeed')}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{t('mcSeedHint')}</p>

        <Button onClick={ejecutar} className="w-full gap-2" disabled={corriendo}
          data-testid="run-simulation-btn">
          <Play className="w-4 h-4" />
          {corriendo ? t('simulating') : t('runSimulations').replace('{n}', numSimulations.toLocaleString())}
        </Button>

        <Button onClick={borrarDatos} variant="outline" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" /> {t('clearData')}
        </Button>

        {/* ── Resultado ────────────────────────────────────────── */}
        {results?.error && (
          <p className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="mc-error">
            {t(`mcError_${results.error}`)}
          </p>
        )}

        {st && (
          <div className="mt-4 space-y-4" data-testid="mc-results">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-xs text-muted-foreground">{t('avgBalanceResult')}</p>
                <p className="text-xl font-bold text-primary tabular-nums" data-testid="avg-balance">
                  {dinero(st.avgFinalBalance)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-long/10 text-center">
                <p className="text-xs text-muted-foreground">{t('profitProbability')}</p>
                <p className="text-xl font-bold text-long tabular-nums" data-testid="profit-prob">
                  {pct(st.profitProbability)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-3">{t('distribucionDeResultados_032fd8')}</p>
              <div className="space-y-2 text-sm">
                {[
                  ['p5', t('worstFivePct_p015'), 'text-short'],
                  ['p25', t('mcP25'), 'text-muted-foreground'],
                  ['p50', t('medianFiftyPct_p016'), 'text-foreground'],
                  ['p75', t('mcP75'), 'text-muted-foreground'],
                  ['p95', t('mejor5_4e0b8a'), 'text-long'],
                ].map(([k, etiqueta, tono]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className={tono}>{etiqueta}</span>
                    <span className="font-mono font-semibold tabular-nums" data-testid={`mc-${k}`}>{dinero(st[k])}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-destructive/10 text-center">
                <p className="text-xs text-muted-foreground">{t('riesgoDeRuina_ce3690')}</p>
                <p className="text-lg font-bold text-destructive flex items-center justify-center gap-1 tabular-nums"
                  data-testid="ruin-risk">
                  {st.riskOfRuin > 10 && <AlertTriangle className="w-4 h-4" />}
                  {pct(st.riskOfRuin, 2)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {st.medianRuinTrade === null
                    ? t('mcRuinNone')
                    : t('mcRuinAt').replace('{n}', String(st.medianRuinTrade))}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">{t('avgDrawdown_p017')}</p>
                <p className="text-lg font-bold tabular-nums" data-testid="avg-dd">{pct(st.avgMaxDrawdown)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t('mcWorstDd').replace('{pct}', pct(st.worstMaxDrawdown))}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid="mc-footnote">
              {t('mcFootnote')
                .replace('{sims}', st.iterations.toLocaleString())
                .replace('{ops}', String(st.trades))
                .replace('{seed}', String(results.seed))}
            </p>

            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <p className="font-medium mb-1">{t('interpretacion_1cc069')}</p>
              {st.profitProbability >= 60 ? (
                <p className="text-long">{t('tuEstrategiaTieneUnaVentaja_3ba865')}</p>
              ) : st.profitProbability >= 45 ? (
                <p>{t('ventajaMarginalConsideraOptimizarPa_746aa8')}</p>
              ) : (
                <p className="text-short">{t('altaProbabilidadDePerdidaRevisa_a4b9b2')}</p>
              )}
              {st.riskOfRuin > 5 && (
                <p className="text-short mt-1">
                  {t('highRuinRisk_p018').replace('{pct}', st.riskOfRuin.toFixed(2))}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MonteCarloSimulator;
