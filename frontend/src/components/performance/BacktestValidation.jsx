import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Loader2, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';
import { listarEstrategias, validar } from '@/services/backtestApi';

/**
 * La interfaz que le faltaba a `backend/backtest.py`.
 *
 * El módulo llevaba escrito desde el 2026-08-22 —división dentro/fuera de
 * muestra, walk-forward y corrección por data snooping (Deflated Sharpe)— con
 * sus dos rutas marcadas CONSTRUIR en `docs/RUTAS_MUERTAS.md` y ninguna
 * pantalla que las llamara. Es el hueco G-14.
 *
 * Por qué el veredicto se redacta AQUÍ y no se pinta el del backend
 * ----------------------------------------------------------------
 * `deflated_sharpe` y `walk_forward` devuelven un campo `verdict` en inglés,
 * escrito a mano. Pintarlo tal cual dejaría la conclusión —lo único que el
 * usuario va a leer de verdad— en un solo idioma dentro de una web que tiene
 * diez. Así que se usan los campos ESTRUCTURADOS (`significant`, `low_power`,
 * `walk_forward_efficiency`, `sharpe_degradation_pct`) y la frase se compone
 * con `t()`. Los números salen del backend; la frase, del diccionario.
 */
const MODOS = ['validated', 'walk_forward'];

export default function BacktestValidation() {
  const { t } = useTranslation();

  const [cfg, setCfg] = usePersistedState('backtest_validation', {
    symbol: 'SPY',
    strategy: '',
    mode: 'validated',
    initialCapital: 10000,
    riskPct: 1,
    commissionPct: 0.05,
    slippagePct: 0.05,
  });
  const set = (k) => (e) => setCfg((p) => ({ ...p, [k]: e.target.value }));

  const [estrategias, setEstrategias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState(null);

  useEffect(() => {
    let vivo = true;
    listarEstrategias()
      .then((d) => {
        if (!vivo) return;
        const lista = d?.strategies || [];
        setEstrategias(lista);
        setCfg((p) => (p.strategy ? p : { ...p, strategy: lista[0]?.id || '' }));
      })
      .catch(() => { if (vivo) setEstrategias([]); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const combinaciones = useMemo(
    () => estrategias.find((e) => e.id === cfg.strategy)?.combinations ?? null,
    [estrategias, cfg.strategy],
  );

  async function lanzar() {
    setCargando(true); setError(''); setRes(null);
    try {
      const d = await validar({
        symbol: String(cfg.symbol || '').trim().toUpperCase(),
        strategy: cfg.strategy,
        mode: cfg.mode,
        initialCapital: Number(cfg.initialCapital),
        riskPct: Number(cfg.riskPct),
        commissionPct: Number(cfg.commissionPct),
        slippagePct: Number(cfg.slippagePct),
      });
      if (d?.error) setError(d.error); else setRes(d);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || t('btvError'));
    }
    setCargando(false);
  }

  const n = (v, d = 2) => (v == null ? '—' : Number(v).toFixed(d));

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-accent" />
            {t('btvTitle')}
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed max-w-3xl">
            {t('btvDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('btvSymbol')}</Label>
              <Input value={cfg.symbol} onChange={set('symbol')}
                     className="font-mono bg-muted border-border uppercase" data-testid="btv-symbol" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('btvStrategy')}</Label>
              <select value={cfg.strategy} onChange={set('strategy')} data-testid="btv-strategy"
                      className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring">
                {estrategias.map((e) => <option key={e.id} value={e.id}>{e.id}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('btvMode')}</Label>
              <select value={cfg.mode} onChange={set('mode')} data-testid="btv-mode"
                      className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {MODOS.map((m) => <option key={m} value={m}>{t(`btvMode_${m}`)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('btvCapital')}</Label>
              <Input type="number" value={cfg.initialCapital} onChange={set('initialCapital')}
                     className="font-mono bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('btvRisk')} (%)</Label>
              <Input type="number" value={cfg.riskPct} onChange={set('riskPct')}
                     className="font-mono bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('btvCommission')} (%)</Label>
              <Input type="number" step="0.01" value={cfg.commissionPct} onChange={set('commissionPct')}
                     className="font-mono bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('btvSlippage')} (%)</Label>
              <Input type="number" step="0.01" value={cfg.slippagePct} onChange={set('slippagePct')}
                     className="font-mono bg-muted border-border" />
            </div>
            <div className="flex items-end">
              <Button onClick={lanzar} disabled={cargando || !cfg.strategy}
                      className="w-full bg-primary text-black hover:bg-primary/90" data-testid="btv-run">
                {cargando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('btvRunning')}</> : t('btvRun')}
              </Button>
            </div>
          </div>

          {combinaciones != null && (
            <p className="text-[11px] text-muted-foreground">
              {t('btvCombinations', { n: combinaciones })}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed">{t('btvCostsNote')}</p>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                 data-testid="btv-error">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {res?.mode === 'validated' && <ResultadoValidado res={res} t={t} n={n} />}
      {res?.mode === 'walk_forward' && <ResultadoWalkForward res={res} t={t} n={n} />}

      {res && (
        <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid="btv-disclaimer">
          {t('btvDisclaimer')}
        </p>
      )}
    </div>
  );
}

/** Dentro vs fuera de muestra, y la corrección por cuánto has buscado. */
function ResultadoValidado({ res, t, n }) {
  const ds = res.data_snooping || {};
  const sig = ds.significant;
  // El veredicto se compone aquí, con los campos estructurados: el `verdict`
  // del backend viene en inglés y ésta es una web de diez idiomas.
  const banner = sig == null
    ? { Icon: ShieldAlert, txt: t('btvSnoopUnknown'), cls: 'text-muted-foreground', bg: 'bg-muted/50 border-border' }
    : sig && ds.low_power
      ? { Icon: ShieldAlert, txt: t('btvSnoopWeak'), cls: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' }
      : sig
        ? { Icon: ShieldCheck, txt: t('btvSnoopPass'), cls: 'text-primary', bg: 'bg-primary/10 border-primary/20' }
        : { Icon: ShieldAlert, txt: t('btvSnoopFail'), cls: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };

  const dentro = res.in_sample || {};
  const fuera = res.out_of_sample || {};
  const deg = res.sharpe_degradation_pct;

  const Fila = ({ etiqueta, a, b, dec = 2 }) => (
    <tr className="border-b border-border/50">
      <td className="py-1.5 pr-4 text-muted-foreground">{etiqueta}</td>
      <td className="py-1.5 pr-4 text-right font-mono">{n(a, dec)}</td>
      <td className="py-1.5 text-right font-mono">{n(b, dec)}</td>
    </tr>
  );

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6 space-y-5">
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${banner.bg}`} data-testid="btv-verdict">
          <banner.Icon className={`w-5 h-5 shrink-0 mt-0.5 ${banner.cls}`} />
          <div>
            <p className={`text-sm font-semibold ${banner.cls}`}>{banner.txt}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t('btvSnoopExplain', {
                n: ds.n_trials ?? '—',
                azar: n(ds.expected_max_sharpe_if_no_edge),
                mejor: n(ds.best_sharpe),
              })}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('btvIsOosTitle')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">{t('btvMetric')}</th>
                  <th className="py-2 pr-4 font-medium text-right">{t('btvInSample')}</th>
                  <th className="py-2 font-medium text-right">{t('btvOutOfSample')}</th>
                </tr>
              </thead>
              <tbody>
                <Fila etiqueta="Sharpe" a={dentro.sharpe} b={fuera.sharpe} />
                <Fila etiqueta={t('btvReturn')} a={dentro.total_return_pct} b={fuera.total_return_pct} />
                <Fila etiqueta={t('btvTrades')} a={dentro.trades} b={fuera.trades} dec={0} />
                <Fila etiqueta={t('btvMaxDd')} a={dentro.max_drawdown_pct} b={fuera.max_drawdown_pct} />
              </tbody>
            </table>
          </div>
          {deg != null && (
            <p className={`text-xs mt-2 ${deg < -50 ? 'text-destructive' : 'text-muted-foreground'}`}
               data-testid="btv-degradation">
              {t('btvDegradation', { pct: n(deg, 1) })}
            </p>
          )}
        </div>

        {Array.isArray(res.all_trials) && res.all_trials.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">
              {t('btvTrialsTitle', { n: res.all_trials.length })}
            </summary>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">{t('btvParams')}</th>
                    <th className="py-2 pr-4 font-medium text-right">Sharpe</th>
                    <th className="py-2 font-medium text-right">{t('btvTrades')}</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {res.all_trials.slice(0, 10).map((tr, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 pr-4 text-xs">{JSON.stringify(tr.params)}</td>
                      <td className="py-1.5 pr-4 text-right">{n(tr.sharpe)}</td>
                      <td className="py-1.5 text-right">{tr.trades}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

/** Reoptimización rodante: la versión honesta de «históricamente funcionaba». */
function ResultadoWalkForward({ res, t, n }) {
  const wfe = res.walk_forward_efficiency;
  const bien = wfe != null && wfe >= 0.5;
  const banner = wfe == null
    ? { Icon: ShieldAlert, txt: t('btvWfUnknown'), cls: 'text-muted-foreground', bg: 'bg-muted/50 border-border' }
    : bien
      ? { Icon: ShieldCheck, txt: t('btvWfHolds'), cls: 'text-primary', bg: 'bg-primary/10 border-primary/20' }
      : { Icon: ShieldAlert, txt: t('btvWfFitted'), cls: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6 space-y-5">
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${banner.bg}`} data-testid="btv-wf-verdict">
          <banner.Icon className={`w-5 h-5 shrink-0 mt-0.5 ${banner.cls}`} />
          <div>
            <p className={`text-sm font-semibold ${banner.cls}`}>{banner.txt}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t('btvWfExplain', { wfe: n(wfe, 2), cons: n(res.consistency_pct, 0), w: res.windows })}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">{t('btvWindow')}</th>
                <th className="py-2 pr-4 font-medium text-right">{t('btvTrainSharpe')}</th>
                <th className="py-2 pr-4 font-medium text-right">{t('btvTestSharpe')}</th>
                <th className="py-2 pr-4 font-medium text-right">{t('btvReturn')}</th>
                <th className="py-2 font-medium text-right">{t('btvTrades')}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {(res.segments || []).map((s) => (
                <tr key={s.window} className="border-b border-border/50">
                  <td className="py-1.5 pr-4">{s.window}</td>
                  <td className="py-1.5 pr-4 text-right text-muted-foreground">{n(s.train_sharpe)}</td>
                  <td className={`py-1.5 pr-4 text-right ${s.test_sharpe < 0 ? 'text-destructive' : ''}`}>
                    {n(s.test_sharpe)}
                  </td>
                  <td className={`py-1.5 pr-4 text-right ${s.test_return_pct < 0 ? 'text-destructive' : ''}`}>
                    {n(s.test_return_pct)}
                  </td>
                  <td className="py-1.5 text-right">{s.test_trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
