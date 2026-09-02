import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useNavigate, Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { usePlanPrices } from '@/hooks/usePlanPrices';
import { useAuthStore } from '../lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  AlertCircle, CheckCircle, Calendar, CreditCard,
  Download, ExternalLink, ArrowRightLeft, Crown, Loader2,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';

const API = process.env.REACT_APP_BACKEND_URL;

const formatDate = (timestamp) =>
  new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

const formatDateISO = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const formatAmount = (amount, currency) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: (currency || 'EUR').toUpperCase(),
  }).format((amount || 0) / 100);

function StatusBadge({ status }) {
  const map = {
    active:   { label: 'Activa',    variant: 'default',     icon: CheckCircle },
    trialing: { label: 'Prueba',    variant: 'secondary',   icon: AlertCircle },
    canceled: { label: 'Cancelada', variant: 'destructive', icon: AlertCircle },
    past_due: { label: 'Vencida',   variant: 'destructive', icon: AlertCircle },
  };
  const { label, variant, icon: Icon } = map[status] || { label: status, variant: 'outline', icon: AlertCircle };
  return (
    <Badge variant={variant} className="flex items-center gap-1 text-xs">
      <Icon className="h-3 w-3" /> {label}
    </Badge>
  );
}

/**
 * Los planes entre los que se puede cambiar sin pasar por caja.
 *
 * El vitalicio no está: es un pago único, no una cuota. Meterlo aquí es lo que
 * habría creado en Stripe un precio recurrente de 500 € AL MES — ver la guarda
 * de `change_plan_real` en `backend/missing_apis.py` y su test.
 */
const PLANES_CAMBIABLES = ['monthly', 'quarterly', 'annual'];

export default function SubscriptionPage() {
  useSEO({ titleKey: 'seoSubscriptionTitle', descriptionKey: 'seoSubscriptionDesc', canonicalPath: '/subscription', noindex: true });
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuthStore();

  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const { precio } = usePlanPrices();
  const [cancelOpen, setCancelOpen]     = useState(false);
  const [cambioOpen, setCambioOpen]     = useState(false);
  const [cambiando, setCambiando]       = useState(null);   // id del plan en curso

  const [cancelLoading, setCancelLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [subRes, invRes] = await Promise.all([
        fetch(`${API}/api/subscriptions/current`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/billing/history`,        { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setSubscription(await subRes.json());
      const inv = await invRes.json();
      setInvoices(inv.invoices || []);
    } catch {
      toast.error('No se pudo cargar la información de suscripción');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchData();
  }, [isAuthenticated, navigate, fetchData]);

  /**
   * Cambia el plan de verdad, con prorrateo de Stripe.
   *
   * El botón «Cambiar de plan» llevaba a `/pricing`, o sea, a comprar otra vez:
   * el cliente pagaba el plan nuevo entero sin que se le descontara lo que le
   * quedaba del viejo, y podía acabar con dos suscripciones. `POST
   * /subscriptions/change-plan` ya existía —terminado y sin usar— y hace el
   * cambio sobre la suscripción que ya hay, prorrateando.
   *
   * El vitalicio NO entra aquí: es un pago único, no un cambio de cuota, y el
   * backend lo devuelve al checkout (que además es lo único que sabe cobrarlo
   * bien — ver la guarda en `missing_apis.py`).
   */
  const handleCambioPlan = async (planId) => {
    setCambiando(planId);
    try {
      const res = await fetch(`${API}/api/subscriptions/change-plan`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_plan_id: planId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || '');

      if (data.redirect_to_checkout) {
        // No hay suscripción viva que modificar, o es un pago único: comprar.
        toast.info(data.message || t('cambioPlanAlCheckout'));
        setCambioOpen(false);
        navigate(`/pricing?plan=${planId}`);
        return;
      }
      toast.success(data.message || t('cambioPlanHecho'));
      setCambioOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.message || t('cambioPlanError'));
    } finally {
      setCambiando(null);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch(`${API}/api/subscriptions/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: false }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('suscripcionCanceladaMantendrasElAcc_7621f5'));
      setCancelOpen(false);
      fetchData();
    } catch {
      toast.error(t('errorAlCancelarLaSuscripcion_6a0cfe'));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleResume = async () => {
    setResumeLoading(true);
    try {
      const res = await fetch(`${API}/api/subscriptions/resume`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success(t('suscripcionReactivadaExitosamente_9d30d3'));
      fetchData();
    } catch {
      toast.error(t('errorAlReactivarLaSuscripcion_e38716'));
    } finally {
      setResumeLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`${API}/api/billing/create-portal-session`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: window.location.origin + '/subscription' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error();
    } catch {
      toast.error(t('errorAlAbrirElPortal_8e87c5'));
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="px-4 pt-24 pb-16 max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="rounded-xl border p-6 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-40" />
            </div>
          </div>
          <div className="rounded-xl border p-6 space-y-3">
            <Skeleton className="h-6 w-40" />
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const hasSub = subscription?.has_subscription;
  const isCanceling = subscription?.cancel_at_period_end;
  const isLifetime = subscription?.plan_id === 'lifetime' || user?.subscription_plan === 'lifetime';
  const periodEnd = subscription?.current_period_end;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Page header */}
          <div>
            <h1 className="text-3xl font-bold mb-1">{t('miSuscripcion_6e5d29')}</h1>
            <p className="text-muted-foreground">{t('gestionaTuSuscripcionYFacturacion_2479a9')}</p>
          </div>

          {/* ── Subscription Status Card ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-caution" />
                  {t('estadoDeLaSuscripcion_5c2c42')}
                </CardTitle>
                {subscription?.status && <StatusBadge status={subscription.status} />}
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {hasSub ? (
                <>
                  {/* Info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Plan</p>
                      <p className="font-semibold capitalize">{subscription.plan_id || '—'}</p>
                    </div>

                    {!isLifetime && periodEnd && (
                      <div className="p-4 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                          {isCanceling ? t('subscriptionEndsOn') : t('proximaRenovacion_a01686')}
                        </p>
                        <p className="font-semibold flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(periodEnd)}
                        </p>
                      </div>
                    )}

                    {user?.created_at && (
                      <div className="p-4 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                          {t('memberSince')}
                        </p>
                        <p className="font-semibold">{formatDateISO(user.created_at)}</p>
                      </div>
                    )}
                  </div>

                  {/* Cancellation warning */}
                  {isCanceling && (
                    <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <AlertCircle className="h-5 w-5 text-warn mt-0.5 shrink-0" />
                      <p className="text-sm text-warn dark:text-warn">
                        {t('subscriptionEndsOn')} <strong>{formatDate(periodEnd)}</strong>.{' '}
                        {t('cancelConfirmDesc')}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {/* Cancel / Resume */}
                    {!isLifetime && (
                      isCanceling ? (
                        <Button onClick={handleResume} disabled={resumeLoading}>
                          {resumeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {t('resumeSubscriptionBtn')}
                        </Button>
                      ) : (
                        <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                          {t('cancelSubscriptionBtn')}
                        </Button>
                      )
                    )}

                    {/* Cambio de plan REAL, con prorrateo. Antes esto era un
                        enlace a /pricing: comprar otra vez, sin descontar lo
                        que quedaba del plazo en curso. */}
                    {!isLifetime && (
                      <Button variant="outline" onClick={() => setCambioOpen(true)}>
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        {t('changePlanBtn')}
                      </Button>
                    )}

                    {/* Stripe portal → payment method & invoices */}
                    <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
                      {portalLoading
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <CreditCard className="h-4 w-4 mr-2" />}
                      {t('managePaymentBtn')}
                    </Button>
                  </div>
                </>
              ) : (
                /* No subscription */
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                    <Crown className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">{t('noTienesUnaSuscripcionActiva_84a892')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Suscríbete para acceder a todas las funciones Premium
                    </p>
                  </div>
                  <Button asChild>
                    <Link to="/pricing">
                      <Crown className="h-4 w-4 mr-2" />
                      {t('viewPlansBtn')}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Billing History Card ── */}
          <Card>
            <CardHeader>
              <CardTitle>{t('historialDeFacturacion_91509b')}</CardTitle>
              <CardDescription>Tus pagos y facturas recientes</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{formatAmount(inv.amount, inv.currency)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.created)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                          {inv.status === 'paid' ? 'Pagado' : inv.status}
                        </Badge>
                        {inv.invoice_pdf && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8"
                            aria-label="Descargar PDF"
                            onClick={() => window.open(inv.invoice_pdf, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {inv.hosted_invoice_url && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8"
                            aria-label="Ver factura"
                            onClick={() => window.open(inv.hosted_invoice_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No hay facturas disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
      <Footer />

      {/* ── Cambio de plan ── */}
      <Dialog open={cambioOpen} onOpenChange={setCambioOpen}>
        <DialogContent data-testid="cambio-plan-dialog">
          <DialogHeader>
            <DialogTitle>{t('changePlanBtn')}</DialogTitle>
            <DialogDescription>{t('cambioPlanExplicacion')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {PLANES_CAMBIABLES
              .filter((pid) => pid !== (subscription?.plan_id || user?.subscription_plan))
              .map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => handleCambioPlan(pid)}
                  disabled={cambiando !== null}
                  data-testid={`cambio-plan-${pid}`}
                  className="flex items-center justify-between gap-4 rounded-sharp border border-border
                             bg-card px-4 py-3 text-left transition-colors duration-tick ease-out
                             hover:border-primary/50 disabled:opacity-60"
                >
                  <span className="font-medium">{t(pid)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono tabular-nums">{precio(pid)}</span>
                    {cambiando === pid && <Loader2 className="h-4 w-4 animate-spin" />}
                  </span>
                </button>
              ))}
          </div>
          <p className="text-xs text-muted-foreground">{t('cambioPlanProrrateo')}</p>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Confirmation Dialog ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t('cancelConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              {t('cancelConfirmDesc')}
              {periodEnd && (
                <span className="block mt-2 font-medium text-foreground">
                  {t('subscriptionEndsOn')}: {formatDate(periodEnd)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelLoading}
              className="w-full sm:w-auto"
            >
              {t('keepPlanBtn')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelLoading}
              className="w-full sm:w-auto"
            >
              {cancelLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('confirmCancelBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
