import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, History, ShieldCheck, Save, Send, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n';
import { useIsPremium } from '@/lib/premium';
import { RISK_HARD_CAP_PCT } from '@/lib/deskMath';
import { fmtMoney, fmtNum } from '@/components/performance/form/productMeta';
import {
  getActivePlan, getPlanHistory, publishPlan, savePlanDraft, getPlanCompliance,
} from '@/services/planApi';

const ESTILOS = ['scalp', 'day', 'swing', 'position'];
const CADENCIAS = ['weekly', 'monthly', 'quarterly'];

/** El plan vacío, con la misma forma que el backend normaliza. */
const PLAN_VACIO = {
  name: '', style: 'day', markets: [], sessions: [],
  timeframes: { context: '', entry: '' },
  approaches: [], tools: [], entry_rules: [], invalidation: '', no_trade_conditions: [],
  risk: {
    max_risk_pct_per_trade: 1, min_rr: 1.5, max_exposure_multiple: 10,
    max_daily_loss_r: null, max_weekly_loss_r: null, max_open_risk_r: null,
    max_consecutive_losses: null, max_trades_per_day: null, max_correlated_positions: null,
    require_stop_loss: true,
  },
  management: {
    breakeven_at_r: null, partials: [], trailing: '', time_stop_bars: null,
    close_before_events: false,
  },
  review: { cadence: 'monthly', min_sample_before_change: 30, kill_criteria: '' },
};

const listaATexto = (v) => (Array.isArray(v) ? v.join('\n') : '');
const textoALista = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
const nz = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * El plan de trading escrito, versionado y medido.
 *
 * `backend/trading_plan.py` lleva desde el 2026-07-30 escrito y probado —564
 * líneas, cinco rutas, versionado con motivo de cambio obligatorio y un informe
 * de cumplimiento que ordena las reglas rotas POR DINERO— y no había una sola
 * pantalla que lo llamara. Era la mitad del hueco G-14.
 *
 * Tres decisiones que vienen del backend y no se negocian aquí:
 *
 *   · **Publicar una versión nueva exige escribir por qué.** A partir de la v2
 *     el backend responde 422 sin motivo. Los planes no se abandonan de golpe:
 *     se erosionan a base de excepciones sin registrar, y tener que escribir una
 *     frase es el freno más barato que existe.
 *   · **El borrador se guarda aparte del plan activo.** Un plan a medio escribir
 *     no puede gobernar operaciones, así que hay `PATCH /plan/draft` para que el
 *     formulario sobreviva a una recarga sin activar nada.
 *   · **El cumplimiento se cuenta en dinero, no en veces.** «Rompiste esto 6
 *     veces» invita a encogerse de hombros; «esto te costó 412 €» no. Y la
 *     casilla peligrosa es *rompiste el plan y ganaste*: el mercado acaba de
 *     pagar la indisciplina, que es justo la que se repite.
 *
 * Lo que esta pantalla NO hace: no calcula nada. El recorte, la validación y el
 * informe son del backend, que es el único que ve todas las operaciones.
 */
export default function TradingPlanPage() {
  const { t } = useTranslation();
  const esPremium = useIsPremium();

  const [plan, setPlan] = useState(PLAN_VACIO);
  const [activo, setActivo] = useState(null);
  const [historia, setHistoria] = useState(null);
  const [cumplimiento, setCumplimiento] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [pideMotivo, setPideMotivo] = useState(false);

  const esPrimeraVersion = !activo;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [p, h] = await Promise.all([getActivePlan(), getPlanHistory().catch(() => null)]);
      if (p) { setActivo(p); setPlan({ ...PLAN_VACIO, ...p }); }
      setHistoria(h);
    } catch {
      toast.error(t('planLoadError'));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!esPremium) return undefined;
    let vivo = true;
    getPlanCompliance().then((c) => { if (vivo) setCumplimiento(c); }).catch(() => {});
    return () => { vivo = false; };
  }, [esPremium, activo]);

  const set = (camino) => (valor) => setPlan((p) => {
    const [a, b] = camino.split('.');
    return b ? { ...p, [a]: { ...p[a], [b]: valor } } : { ...p, [a]: valor };
  });

  const guardarBorrador = async () => {
    setGuardando(true);
    try {
      await savePlanDraft(plan);
      toast.success(t('planDraftSaved'));
    } catch {
      toast.error(t('planDraftError'));
    } finally {
      setGuardando(false);
    }
  };

  const publicar = async () => {
    setGuardando(true);
    try {
      const { plan: nuevo, warning } = await publishPlan(plan, motivo);
      setActivo(nuevo);
      setPideMotivo(false);
      setMotivo('');
      toast.success(t('planPublished').replace('{v}', String(nuevo?.version ?? '')));
      // El backend avisa cuando se cambia el plan antes de tener muestra: es un
      // aviso, no un bloqueo. Cambiar pronto es decisión del usuario; que quede
      // registrada y visible, no.
      if (warning) toast.warning(warning);
      getPlanHistory().then(setHistoria).catch(() => {});
    } catch (err) {
      if (err?.motivoRequerido) {
        setPideMotivo(true);
        toast.error(t('planReasonRequired'));
      } else {
        toast.error(t('planPublishError'));
      }
    } finally {
      setGuardando(false);
    }
  };

  const riesgoSobreTope = useMemo(
    () => Number(plan?.risk?.max_risk_pct_per_trade) > RISK_HARD_CAP_PCT,
    [plan?.risk?.max_risk_pct_per_trade],
  );

  const Campo = ({ etiqueta, valor, onChange, tipo = 'text', paso, ayuda, testid }) => (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{etiqueta}</Label>
      <Input
        type={tipo} step={paso} value={valor ?? ''}
        onChange={(e) => onChange(tipo === 'number' ? nz(e.target.value) : e.target.value)}
        className="font-mono" data-testid={testid}
      />
      {ayuda && <p className="text-[10px] text-muted-foreground leading-snug">{ayuda}</p>}
    </div>
  );

  const Lista = ({ etiqueta, valor, onChange, ayuda, testid }) => (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{etiqueta}</Label>
      <Textarea
        rows={4} value={listaATexto(valor)}
        onChange={(e) => onChange(textoALista(e.target.value))}
        className="font-mono text-sm" data-testid={testid}
      />
      <p className="text-[10px] text-muted-foreground">{ayuda || t('planOnePerLine')}</p>
    </div>
  );

  if (cargando) {
    return <div className="p-8 text-muted-foreground" data-testid="plan-loading">{t('loading')}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6" data-testid="trading-plan-page">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-primary" />
          {t('planTitle')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
          {t('planSubtitle')}
        </p>
        {activo && (
          <p className="text-xs text-muted-foreground mt-2" data-testid="plan-active-version">
            {t('planActiveVersion').replace('{v}', String(activo.version))}
          </p>
        )}
      </div>

      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor" data-testid="plan-tab-editor">{t('planTabEditor')}</TabsTrigger>
          <TabsTrigger value="historia" data-testid="plan-tab-history">{t('planTabHistory')}</TabsTrigger>
          <TabsTrigger value="cumplimiento" data-testid="plan-tab-compliance">{t('planTabCompliance')}</TabsTrigger>
        </TabsList>

        {/* ── 1 · El editor ─────────────────────────────────────────── */}
        <TabsContent value="editor" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('planSecIdentity')}</CardTitle>
              <CardDescription className="text-xs">{t('planSecIdentityHint')}</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <Campo etiqueta={t('planName')} valor={plan.name} onChange={set('name')} testid="plan-name" />
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('planStyle')}</Label>
                <select
                  value={plan.style} onChange={(e) => set('style')(e.target.value)}
                  className="w-full h-10 bg-muted border border-rule rounded-sharp px-2 text-sm"
                  data-testid="plan-style"
                >
                  {ESTILOS.map((s) => <option key={s} value={s}>{t(`planStyle_${s}`)}</option>)}
                </select>
              </div>
              <Lista etiqueta={t('planMarkets')} valor={plan.markets} onChange={set('markets')} testid="plan-markets" />
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta={t('planTfContext')} valor={plan.timeframes?.context}
                  onChange={set('timeframes.context')} testid="plan-tf-context" />
                <Campo etiqueta={t('planTfEntry')} valor={plan.timeframes?.entry}
                  onChange={set('timeframes.entry')} testid="plan-tf-entry" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('planSecSetup')}</CardTitle>
              <CardDescription className="text-xs">{t('planSecSetupHint')}</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <Lista etiqueta={t('planEntryRules')} valor={plan.entry_rules} onChange={set('entry_rules')} testid="plan-entry-rules" />
              <Lista etiqueta={t('planNoTrade')} valor={plan.no_trade_conditions} onChange={set('no_trade_conditions')} testid="plan-no-trade" />
              <Lista etiqueta={t('planApproaches')} valor={plan.approaches} onChange={set('approaches')} testid="plan-approaches" />
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('planInvalidation')}</Label>
                <Textarea rows={4} value={plan.invalidation || ''}
                  onChange={(e) => set('invalidation')(e.target.value)}
                  className="text-sm" data-testid="plan-invalidation" />
                <p className="text-[10px] text-muted-foreground">{t('planInvalidationHint')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('planSecRisk')}</CardTitle>
              <CardDescription className="text-xs">{t('planSecRiskHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Campo etiqueta={t('planMaxRiskPct')} tipo="number" paso="0.1"
                  valor={plan.risk?.max_risk_pct_per_trade} onChange={set('risk.max_risk_pct_per_trade')}
                  testid="plan-max-risk" />
                <Campo etiqueta={t('planMinRR')} tipo="number" paso="0.1"
                  valor={plan.risk?.min_rr} onChange={set('risk.min_rr')} testid="plan-min-rr" />
                <Campo etiqueta={t('planMaxExposure')} tipo="number" paso="1"
                  valor={plan.risk?.max_exposure_multiple} onChange={set('risk.max_exposure_multiple')}
                  testid="plan-max-exposure" />
              </div>
              {riesgoSobreTope && (
                <p className="text-xs text-short font-semibold" data-testid="plan-risk-over-cap">
                  {t('planRiskOverCap').replace('{cap}', String(RISK_HARD_CAP_PCT))}
                </p>
              )}
              {/* Un límite sin declarar es una regla CALLADA, no un cero. El
                  campo vacío se envía como null y el motor de reglas no la
                  aplica; poner 0 significaría «no puedes perder nada». */}
              <div className="grid md:grid-cols-3 gap-4">
                <Campo etiqueta={t('planMaxDailyLossR')} tipo="number" paso="0.5"
                  valor={plan.risk?.max_daily_loss_r} onChange={set('risk.max_daily_loss_r')}
                  ayuda={t('planUnsetIsSilent')} testid="plan-max-daily" />
                <Campo etiqueta={t('planMaxConsecLosses')} tipo="number" paso="1"
                  valor={plan.risk?.max_consecutive_losses} onChange={set('risk.max_consecutive_losses')}
                  ayuda={t('planUnsetIsSilent')} testid="plan-max-consec" />
                <Campo etiqueta={t('planMaxTradesDay')} tipo="number" paso="1"
                  valor={plan.risk?.max_trades_per_day} onChange={set('risk.max_trades_per_day')}
                  ayuda={t('planUnsetIsSilent')} testid="plan-max-trades" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(plan.risk?.require_stop_loss)}
                  onChange={(e) => set('risk.require_stop_loss')(e.target.checked)}
                  data-testid="plan-require-sl" />
                {t('planRequireStop')}
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('planSecReview')}</CardTitle>
              <CardDescription className="text-xs">{t('planSecReviewHint')}</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('planCadence')}</Label>
                <select value={plan.review?.cadence} onChange={(e) => set('review.cadence')(e.target.value)}
                  className="w-full h-10 bg-muted border border-rule rounded-sharp px-2 text-sm"
                  data-testid="plan-cadence">
                  {CADENCIAS.map((c) => <option key={c} value={c}>{t(`planCadence_${c}`)}</option>)}
                </select>
              </div>
              <Campo etiqueta={t('planMinSample')} tipo="number" paso="1"
                valor={plan.review?.min_sample_before_change} onChange={set('review.min_sample_before_change')}
                ayuda={t('planMinSampleHint')} testid="plan-min-sample" />
              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('planKillCriteria')}</Label>
                <Textarea rows={3} value={plan.review?.kill_criteria || ''}
                  onChange={(e) => set('review.kill_criteria')(e.target.value)}
                  className="text-sm" data-testid="plan-kill" />
              </div>
            </CardContent>
          </Card>

          {/* ── Publicar ──────────────────────────────────────────── */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {!esPrimeraVersion && (
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('planChangeReason')}
                  </Label>
                  <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                    className={`text-sm ${pideMotivo && !motivo.trim() ? 'border-short' : ''}`}
                    data-testid="plan-change-reason" />
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {t('planChangeReasonHint')}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={guardarBorrador} disabled={guardando}
                  data-testid="plan-save-draft">
                  <Save className="w-4 h-4 mr-2" /> {t('planSaveDraft')}
                </Button>
                <Button onClick={publicar} disabled={guardando} data-testid="plan-publish">
                  <Send className="w-4 h-4 mr-2" />
                  {esPrimeraVersion ? t('planPublishFirst') : t('planPublishNew')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 2 · La historia ───────────────────────────────────────── */}
        <TabsContent value="historia" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" /> {t('planTabHistory')}
              </CardTitle>
              <CardDescription className="text-xs">{t('planHistoryHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!historia?.versions?.length ? (
                <p className="text-sm text-muted-foreground" data-testid="plan-history-empty">
                  {t('planHistoryEmpty')}
                </p>
              ) : (
                <div className="space-y-2" data-testid="plan-history-list">
                  {historia.versions.map((v) => (
                    <div key={v.version} className="p-3 rounded-lg bg-muted/50 border border-rule">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono font-bold">v{v.version}</span>
                        <span className="text-xs text-muted-foreground">
                          {/* Una versión con 4 operaciones debajo se abandonó antes
                              de poder decir nada, y eso se lee aquí en vez de
                              tener que deducirlo. */}
                          {t('planTradesUnder').replace('{n}', String(v.trades_under_plan ?? 0))}
                        </span>
                      </div>
                      {v.change_reason && (
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">{v.change_reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 3 · El cumplimiento ───────────────────────────────────── */}
        <TabsContent value="cumplimiento" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {t('planTabCompliance')}
              </CardTitle>
              <CardDescription className="text-xs">{t('planComplianceHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!esPremium ? (
                <p className="text-sm text-muted-foreground" data-testid="plan-compliance-locked">
                  {t('planCompliancePremium')}
                </p>
              ) : !cumplimiento ? (
                <p className="text-sm text-muted-foreground" data-testid="plan-compliance-empty">
                  {t('planComplianceEmpty')}
                </p>
              ) : (
                <div className="space-y-4" data-testid="plan-compliance">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {t('planComplianceRate')}
                      </p>
                      {/* Sin operaciones bajo el plan la tasa es INDEFINIDA, no
                          0 %: un cero diría «lo incumples todo». */}
                      <p className="font-mono text-2xl font-bold">
                        {cumplimiento.compliance_rate === null ? '—' : `${fmtNum(cumplimiento.compliance_rate, 1)}%`}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {t('planTradesUnderPlan')}
                      </p>
                      <p className="font-mono text-2xl font-bold">{cumplimiento.trades_under_plan ?? 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {t('planNextReview')}
                      </p>
                      <p className="font-mono text-sm font-bold">{cumplimiento.next_review_due || '—'}</p>
                    </div>
                  </div>

                  {cumplimiento.sample_warning && (
                    <p className="text-xs text-primary flex gap-2" data-testid="plan-sample-warning">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {t('planSampleWarning').replace('{n}', String(cumplimiento.min_sample_before_change))}
                    </p>
                  )}

                  {Boolean(cumplimiento.by_rule?.length) && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        {t('planByRule')}
                      </p>
                      <div className="space-y-1" data-testid="plan-by-rule">
                        {cumplimiento.by_rule.map((r) => (
                          <div key={r.code} className="flex justify-between items-baseline p-2 rounded bg-muted/50 text-sm">
                            <span>{r.code}</span>
                            <span className="font-mono">
                              <span className="text-muted-foreground mr-3">×{r.count}</span>
                              <span className={r.pnl_impact < 0 ? 'text-short font-semibold' : ''}>
                                {fmtMoney(r.pnl_impact)}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cumplimiento.adherence_vs_result && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        {t('planAdherenceMatrix')}
                      </p>
                      <div className="grid grid-cols-2 gap-2" data-testid="plan-matrix">
                        {['followed_won', 'followed_lost', 'broke_won', 'broke_lost'].map((k) => {
                          const c = cumplimiento.adherence_vs_result[k] || { n: 0, pnl: 0 };
                          // La casilla peligrosa es «rompiste el plan y ganaste»:
                          // el mercado acaba de pagar la indisciplina.
                          const peligrosa = k === 'broke_won';
                          return (
                            <div key={k} className={`p-3 rounded-lg border ${
                              peligrosa ? 'border-primary/50 bg-primary/10' : 'border-rule bg-muted/50'
                            }`}>
                              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                                {t(`planCell_${k}`)}
                              </p>
                              <p className="font-mono text-lg font-bold">{c.n}</p>
                              <p className="font-mono text-xs text-muted-foreground">{fmtMoney(c.pnl)}</p>
                              {peligrosa && c.n > 0 && (
                                <p className="text-[10px] text-primary mt-1 leading-snug">{t('planBrokeWonWarn')}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
