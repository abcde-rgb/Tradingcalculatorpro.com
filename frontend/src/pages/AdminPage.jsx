import { useEffect, useMemo, useState, useRef, useCallback, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Crown, DollarSign, TrendingUp, Search, Download,
  Shield, ShieldOff, RefreshCw, Mail, Globe2, Calendar,
  Plug, Check, X, Plus, Pencil, Trash2, KeyRound, Save, Loader2,
  Eye, EyeOff, History, FileText, Tag, Activity, UserCheck,
  Zap, TrendingDown, Percent, AlertCircle, ChevronDown, ChevronUp,
  Send, Languages, CreditCard, UserMinus, Share2, Package,
  Construction, Bug, Gauge, Lock, Settings, Database, ToggleLeft,
  Layers, Gift, Wallet, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import { Header } from '@/components/layout/Header';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;
const DEMO_TOKEN = 'demo-token';

const PLAN_OPTIONS = [
  { value: 'none',      label: 'Free' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual',    label: 'Annual' },
  { value: 'lifetime',  label: 'Lifetime' },
];

const PLAN_COLORS = { none: '#6b7280', free: '#6b7280', monthly: '#3b82f6', quarterly: '#8b5cf6', annual: '#10b981', lifetime: '#f59e0b' };


/**
 * /admin — gated by `is_admin === true`.
 * Provides:
 *   - Global metrics + filters + CSV export
 *   - Google integrations editor (GA4, GTM, GSC, AdSense, Bing) saved to DB
 *   - Full user CRUD: create, edit, delete, reset password, promote/demote
 */
export default function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuthStore();

  useSEO({ title: 'Admin', description: 'Panel administrativo', canonicalPath: '/admin', noindex: true });

  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('all');
  const [provider, setProvider] = useState('all');
  const [locale] = useState('all');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token],
  );

  const loadAll = async () => {
    if (!API || token === DEMO_TOKEN) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // After a page refresh the access token is not persisted — silently renew it
    // before making any API calls, otherwise we'd send "Bearer null" and get 401.
    let currentToken = token;
    if (!currentToken) {
      currentToken = await useAuthStore.getState().silentRefresh();
      if (!currentToken) {
        toast.error('Tu sesión ha caducado. Vuelve a iniciar sesión.', { duration: 6000 });
        navigate('/login');
        return;
      }
    }

    const freshHeaders = { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' };

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (plan !== 'all')     params.set('plan', plan);
    if (provider !== 'all') params.set('provider', provider);
    if (locale !== 'all')   params.set('locale', locale);
    params.set('limit', '500');

    try {
      const [mRes, uRes] = await Promise.all([
        fetch(`${API}/admin/metrics`, { headers: freshHeaders, credentials: 'include' }),
        fetch(`${API}/admin/users?${params.toString()}`, { headers: freshHeaders, credentials: 'include' }),
      ]);
      if (mRes.status === 401 || uRes.status === 401) {
        toast.error('Tu sesión ha caducado. Vuelve a iniciar sesión.', { duration: 6000 });
        try { useAuthStore.getState().logout(); } catch { /* ignore */ }
        navigate('/login');
        return;
      }
      if (mRes.status === 403 || uRes.status === 403) {
        toast.error(t('adminAccessDenied'));
        navigate('/dashboard');
        return;
      }
      if (!mRes.ok || !uRes.ok) {
        throw new Error(`metrics=${mRes.status} users=${uRes.status}`);
      }
      setMetrics(await mRes.json());
      const data = await uRes.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('[admin loadAll]', err);
      toast.error(err.message || 'Error cargando datos del admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) {
      navigate('/dashboard');
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAuthenticated || !user?.is_admin) return null;

  const handleExportCsv = async () => {
    try {
      const res = await fetch(`${API}/admin/users.csv`, { headers, credentials: 'include' });
      if (!res.ok) throw new Error('csv export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tcp-users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('adminCsvExported'));
    } catch {
      toast.error(t('adminCsvExportError'));
    }
  };

  const togglePromote = async (email, currentlyAdmin) => {
    try {
      const res = await fetch(`${API}/admin/promote`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ email, is_admin: !currentlyAdmin }),
      });
      if (!res.ok) throw new Error('promote failed');
      toast.success(currentlyAdmin ? t('adminDemoteOk') : t('adminPromoteOk'));
      loadAll();
    } catch {
      toast.error('Error');
    }
  };

  const deleteUser = async (u) => {
    try {
      const res = await fetch(`${API}/admin/users/${u.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'delete failed');
      toast.success(`Usuario ${u.email} eliminado`);
      setConfirmDelete(null);
      loadAll();
    } catch (err) {
      toast.error(err.message || 'Error eliminando usuario');
    }
  };

  const handleImpersonate = async (u) => {
    try {
      const res = await fetch(`${API}/admin/impersonate/${u.id}`, { method: 'POST', headers, credentials: 'include' });
      if (!res.ok) throw new Error('impersonate failed');
      const data = await res.json();
      await navigator.clipboard?.writeText(data.token).catch(() => {});
      toast.success(`Token de ${u.email} copiado al portapapeles (válido 1h)`);
    } catch {
      toast.error('Error al impersonar usuario');
    }
  };

  if (!isAuthenticated || !user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader><CardTitle>{t('adminAccessDenied')}</CardTitle></CardHeader>
          <CardContent>
            <Link to="/dashboard"><Button>{t('volverAlDashboard')}</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20" data-testid="admin-page">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Demo mode banner */}
        {token === DEMO_TOKEN && (
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 flex items-center gap-3 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Modo demo — los datos reales requieren el backend conectado. Las acciones están deshabilitadas.</span>
          </div>
        )}
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-unbounded text-3xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" /> {t('adminPanelTitle')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('adminPanelSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={loadAll} className="gap-2" data-testid="admin-refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('adminRefresh')}
            </Button>
            <Button onClick={handleExportCsv} variant="outline" className="gap-2" data-testid="admin-export-csv">
              <Download className="w-4 h-4" /> {t('adminExportCsv')}
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2" data-testid="admin-new-user">
              <Plus className="w-4 h-4" /> Nuevo usuario
            </Button>
          </div>
        </div>

        {/* Metrics grid */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard icon={Users} label={t('adminMetricUsers')}
              value={metrics.total_users} testId="metric-total-users" />
            <MetricCard icon={Crown} label={t('adminMetricPremium')}
              value={metrics.premium_users} valueClass="text-primary" testId="metric-premium" />
            <MetricCard icon={DollarSign} label="MRR"
              value={`$${metrics.mrr_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              valueClass="text-green-500" testId="metric-mrr" />
            <MetricCard icon={TrendingUp} label={t('adminMetricNew30d')}
              value={metrics.new_users_30d} testId="metric-new-30d" />
            <MetricCard icon={Globe2} label={t('adminMetricLocales')}
              value={metrics.by_locale.length} testId="metric-locales" />
          </div>
        )}

        {/* Google integrations editor */}
        <IntegrationsEditor headers={headers} t={t} />

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('adminSearchPlaceholder')}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadAll()}
                  className="pl-10"
                  data-testid="admin-search-input"
                />
              </div>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger data-testid="admin-filter-plan"><SelectValue placeholder={t('adminFilterPlan')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminFilterPlan')}: {t('adminAll')}</SelectItem>
                  <SelectItem value="none">Free</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger data-testid="admin-filter-provider"><SelectValue placeholder={t('adminFilterProvider')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminFilterProvider')}: {t('adminAll')}</SelectItem>
                  <SelectItem value="password">Email + Password</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadAll} className="gap-2" data-testid="admin-apply-filters">
                {t('adminApplyFilters')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('adminUsersTable')}</CardTitle>
              <Badge variant="outline">{total} {t('adminTotal')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-users-table">              <thead className="bg-muted/40">
                <tr className="text-left">
                  <Th><Mail className="w-3 h-3 inline" /> Email</Th>
                  <Th>{t('adminColName')}</Th>
                  <Th>{t('adminColPlan')}</Th>
                  <Th>{t('adminColStatus')}</Th>
                  <Th>{t('adminColProvider')}</Th>
                  <Th><Calendar className="w-3 h-3 inline" /> {t('adminColCreated')}</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === user?.id;
                  return (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                      <td className="px-3 py-2">{u.name}</td>
                      <td className="px-3 py-2">
                        <Badge style={{ background: `${PLAN_COLORS[u.subscription_plan || 'free']}30`, color: PLAN_COLORS[u.subscription_plan || 'free'], border: `1px solid ${PLAN_COLORS[u.subscription_plan || 'free']}50` }}>
                          {u.subscription_plan || 'free'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={u.is_premium ? 'default' : 'secondary'}
                          className={u.is_premium ? 'bg-green-500/15 text-green-600' : ''}>
                          {u.is_premium ? 'active' : (u.subscription_status || '—')}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-muted-foreground">{u.auth_provider || 'password'}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {u.created_at ? u.created_at.slice(0, 10) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => setEditing(u)}
                            className="gap-1 h-7" data-testid={`admin-edit-${u.email}`}>
                            <Pencil className="w-3 h-3" /> Editar
                          </Button>
                          {!isSelf && (
                            <Button size="sm" variant="outline"
                              onClick={() => handleImpersonate(u)}
                              className="gap-1 h-7 text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                              data-testid={`admin-impersonate-${u.email}`}>
                              <UserCheck className="w-3 h-3" /> Ver como
                            </Button>
                          )}
                          <Button size="sm" variant={u.is_admin ? 'destructive' : 'outline'}
                            onClick={() => togglePromote(u.email, u.is_admin)}
                            className="gap-1 h-7" data-testid={`admin-toggle-${u.email}`}>
                            {u.is_admin
                              ? <><ShieldOff className="w-3 h-3" /> {t('adminDemote')}</>
                              : <><Shield className="w-3 h-3" /> {t('adminPromote')}</>}
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => setResetting(u)}
                            className="gap-1 h-7" data-testid={`admin-reset-${u.email}`}>
                            <KeyRound className="w-3 h-3" /> Reset
                          </Button>
                          {!isSelf && (
                            <Button size="sm" variant="destructive"
                              onClick={() => setConfirmDelete(u)}
                              className="gap-1 h-7" data-testid={`admin-delete-${u.email}`}>
                              <Trash2 className="w-3 h-3" /> Borrar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      {loading ? t('loading') : t('adminNoUsers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {/* Audit Log */}
        <AuditLogPanel headers={headers} />

        {/* Revenue Analytics */}
        <RevenueAnalyticsCard metrics={metrics} headers={headers} />

        {/* Plan Distribution + Usage side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlanDistributionCard metrics={metrics} />
          <UsageAnalyticsCard headers={headers} />
        </div>

        {/* Usage Heatmap — qué miran más los usuarios */}
        <PaymentReconciliationCard headers={headers} />
        <UsageHeatmapCard headers={headers} />

        {/* Coupon Manager */}
        <CouponManagerCard headers={headers} />

        {/* Feature Flags */}
        <FeatureFlagsCard headers={headers} />

        {/* Stripe Webhook Logs */}
        <WebhookLogsCard headers={headers} />

        {/* ── NEW FEATURES ── */}
        <MaintenanceModeCard headers={headers} />
        <EmailCampaignsCard headers={headers} />
        <PaymentHistoryCard headers={headers} />
        <ChurnSurveyCard headers={headers} />
        <CohortAnalysisCard headers={headers} />
        <ReferralManagerCard headers={headers} />
        <AffiliatePayoutRequestsCard headers={headers} />
        <AffiliatesAdminCard headers={headers} />
        <AffiliatePayoutsCard headers={headers} />
        <PlansEditorCard headers={headers} />
        <I18nManagerCard headers={headers} />
        <ErrorMonitorCard headers={headers} />
        <RateLimitingCard headers={headers} />
        <GDPRExportCard headers={headers} />
      </main>

      {/* MODALS */}
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)}
        headers={headers} onCreated={loadAll} />      <EditUserDialog user={editing} onClose={() => setEditing(null)}
        headers={headers} onSaved={loadAll} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} headers={headers} />
      <ConfirmDeleteDialog user={confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteUser(confirmDelete)} />
    </div>
  );
}

const Th = ({ children }) => (
  <th className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{children}</th>
);

const MetricCard = ({ icon: Icon, label, value, valueClass = '', testId }) => (
  <Card className="bg-card border-border" data-testid={testId}>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

/* ============================================================
 *  GOOGLE / STRIPE / PAYPAL / MISC INTEGRATIONS EDITOR
 * ============================================================ */

const INTEGRATION_SECTIONS = [
  {
    id: 'google',
    title: 'Google (Identity Platform, Analytics, Ads, SEO)',
    description:
      'Google Identity Platform usa el OAuth Client ID + Client Secret para login con Google. ' +
      'Recuerda añadir esta URL como JavaScript Origin autorizado en Google Cloud Console.',
    fields: [
      { id: 'google_client_id',     label: 'OAuth Client ID',         secret: false, placeholder: '704...apps.googleusercontent.com', hint: 'console.cloud.google.com → Credentials' },
      { id: 'google_client_secret', label: 'OAuth Client Secret',     secret: true,  placeholder: 'GOCSPX-...',                       hint: 'Same screen as the Client ID' },
      { id: 'ga4_measurement_id',   label: 'Analytics 4 Measurement', secret: false, placeholder: 'G-XXXXXXXXXX',                      hint: 'analytics.google.com → Admin → Data Streams' },
      { id: 'gtm_id',               label: 'Tag Manager Container',   secret: false, placeholder: 'GTM-XXXXXXX',                       hint: 'tagmanager.google.com → workspace overview' },
      { id: 'gsc_verification',     label: 'Search Console (meta)',   secret: false, placeholder: 'AbC123…',                           hint: 'search.google.com/search-console → HTML tag' },
      { id: 'adsense_publisher_id', label: 'AdSense Publisher ID',    secret: false, placeholder: 'ca-pub-XXXXXXXXXXXXXXXX',          hint: 'adsense.google.com → Account' },
    ],
  },
  {
    id: 'stripe',
    title: 'Stripe (pagos con tarjeta y SEPA)',
    description: 'Las claves se aplican en caliente al runtime — no necesitas reiniciar el backend.',
    fields: [
      { id: 'stripe_publishable_key', label: 'Publishable Key',  secret: false, placeholder: 'pk_live_… o pk_test_…', hint: 'dashboard.stripe.com → Developers → API keys' },
      { id: 'stripe_secret_key',      label: 'Secret Key',       secret: true,  placeholder: 'sk_live_… o sk_test_…', hint: 'NUNCA la expongas al frontend; sólo backend' },
      { id: 'stripe_webhook_secret',  label: 'Webhook Signing Secret', secret: true, placeholder: 'whsec_…',           hint: 'Webhooks → Add endpoint → Reveal signing secret' },
    ],
  },
  {
    id: 'paypal',
    title: 'PayPal',
    description: 'Configura sandbox para pruebas y live para producción.',
    fields: [
      { id: 'paypal_client_id',     label: 'Client ID',     secret: false, placeholder: 'AYS…',                hint: 'developer.paypal.com → Apps & Credentials' },
      { id: 'paypal_client_secret', label: 'Client Secret', secret: true,  placeholder: 'EJX…',                hint: 'Mismo dashboard, dentro de cada app' },
      { id: 'paypal_mode',          label: 'Mode',          secret: false, placeholder: 'sandbox | live',      hint: 'Usa "sandbox" para pruebas, "live" en producción' },
    ],
  },
  {
    id: 'revolut',
    title: 'Revolut Pay (incluye Apple Pay y Google Pay)',
    description: 'Pasarela independiente de Stripe. Su checkout muestra Revolut Pay + tarjeta, y Apple/Google Pay en dispositivos compatibles. Crea el webhook apuntando a /api/webhook/revolut y pega aquí su Signing Secret. Sandbox="true" para pruebas.',
    fields: [
      { id: 'revolut_api_key',        label: 'Secret API Key',         secret: true,  placeholder: 'sk_… (sandbox o live)', hint: 'business.revolut.com → Merchant API → API keys (Secret key)' },
      { id: 'revolut_webhook_secret', label: 'Webhook Signing Secret',  secret: true,  placeholder: 'wsk_…',                 hint: 'Se genera al crear el webhook (endpoint /api/webhook/revolut). NO es la API key.' },
      { id: 'revolut_sandbox',        label: 'Sandbox',                 secret: false, placeholder: 'true | false',          hint: 'Usa "true" para el sandbox de pruebas, "false" en producción' },
    ],
  },
  {
    id: 'nowpayments',
    title: 'NOWPayments (pagos con criptomonedas)',
    description: 'Pasarela cripto no custodial (el dinero va a tu wallet). Crea el webhook/IPN apuntando a /api/webhook/nowpayments y pega aquí su IPN Secret. Sandbox="true" para pruebas.',
    fields: [
      { id: 'nowpayments_api_key',    label: 'API Key',     secret: true,  placeholder: 'XXXXXXX-XXXXXXX-…', hint: 'nowpayments.io → Store settings → API keys' },
      { id: 'nowpayments_ipn_secret', label: 'IPN Secret',  secret: true,  placeholder: '…',                 hint: 'nowpayments.io → Store settings → IPN → firma el webhook. NO es la API key.' },
      { id: 'nowpayments_sandbox',    label: 'Sandbox',     secret: false, placeholder: 'true | false',      hint: 'Usa "true" para el sandbox de pruebas, "false" en producción' },
    ],
  },
  {
    id: 'others',
    title: 'Otras integraciones (SEO, Email, Reviews)',
    description: '',
    fields: [
      { id: 'sendgrid_api_key',       label: 'SendGrid API Key',          secret: true,  placeholder: 'SG.…',         hint: 'app.sendgrid.com → Settings → API Keys' },
      { id: 'trustpilot_business_id', label: 'Trustpilot Business URL',   secret: false, placeholder: 'midominio.com', hint: 'business.trustpilot.com — usa el slug de la URL' },
      { id: 'clarity_project_id',     label: 'Microsoft Clarity Project', secret: false, placeholder: 'a1b2c3d4',     hint: 'clarity.microsoft.com → Settings → Setup' },
      { id: 'bing_verification',      label: 'Bing Webmaster meta',       secret: false, placeholder: 'XXXXX…',       hint: 'bing.com/webmasters → Meta tag verification' },
    ],
  },
];

function IntegrationField({ field, value, isSet, onChange }) {
  const [show, setShow] = useState(false);
  // Secret already saved → input is shown empty; placeholder communicates
  // that there is a stored value. Typing here writes a fresh secret only.
  const placeholder = field.secret && isSet
    ? '•••••••• (ya hay un valor guardado — escribe uno nuevo para reemplazarlo)'
    : (field.placeholder || '');

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2"
      data-testid={`integration-${field.id}`}>
      <div className="flex items-start justify-between gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">{field.label}</Label>
        {(isSet || (!field.secret && value))
          ? <Badge className="bg-green-500/15 text-green-500 gap-1"><Check className="w-3 h-3" /> Connected</Badge>
          : <Badge variant="outline" className="text-muted-foreground gap-1"><X className="w-3 h-3" /> Not configured</Badge>}
      </div>
      <div className="flex gap-1">
        <Input
          id={field.id}
          type={field.secret && !show ? 'password' : 'text'}
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          data-testid={`input-${field.id}`}
          autoComplete="off"
        />
        {field.secret && (
          <>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
              onClick={() => setShow((s) => !s)}
              title={show ? 'Hide' : 'Show'}>
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            {isSet && (
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 text-destructive"
                onClick={() => onChange('__CLEAR__')}
                title="Wipe this secret">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {field.hint}
        {field.secret && isSet && (
          <span className="ml-1 italic">— el valor está cifrado en servidor; este campo está vacío para evitar duplicarlo. Escribe un nuevo valor para reemplazar, o usa 🗑 para borrar.</span>
        )}
      </p>
    </div>
  );
}

function IntegrationsEditor({ headers, t }) {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API}/admin/settings`, { credentials: 'include', headers });
      if (res.status === 401) {
        // Let the parent auth flow handle session expiry — don't redirect here.
        return;
      }
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err && err.detail) detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setSettings(data);
      // Build draft = current displayed values for every known field.
      // CRITICAL: for secret fields, we DROP the masked value (••••XXXX) from the
      // draft. Otherwise users would type after the bullets and produce corrupted
      // secrets ("••••XXXXmy_new_key") which get either silently skipped (if the
      // result starts with •) OR — worse — saved with bullets inside. Empty draft
      // + placeholder + green "Connected" badge is the safe pattern.
      const d = {};
      INTEGRATION_SECTIONS.forEach((sec) => sec.fields.forEach((f) => {
        const raw = data[f.id] || '';
        if (f.secret && (raw.startsWith('•') || data[`${f.id}_set`])) {
          d[f.id] = '';
        } else {
          d[f.id] = raw;
        }
      }));
      setDraft(d);
    } catch (err) {
      console.error('[admin/settings GET]', err);
      toast.error(`No se pudieron cargar las settings: ${err?.message || 'fallo desconocido'}`, { duration: 8000 });
    }
  };

  useEffect(() => {
    const bearer = headers?.Authorization?.replace('Bearer ', '');
    // Skip when token is null ("Bearer null") — silentRefresh will update headers
    // and this effect will re-run automatically via the [headers] dependency.
    if (API && bearer && bearer !== 'null' && !bearer.includes(DEMO_TOKEN)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  const save = async () => {
    setSaving(true);
    try {
      // Build the body: send fields the admin actually changed, plus explicit
      // "__CLEAR__" wipes for secrets.
      const body = {};
      const errors = [];
      INTEGRATION_SECTIONS.forEach((sec) => sec.fields.forEach((f) => {
        const cur = (draft[f.id] ?? '').toString();

        if (f.secret) {
          // Secrets: draft is empty if a value already exists on the server
          // (we cleared the mask in load()). Only send when admin typed
          // something fresh OR the explicit __CLEAR__ sentinel.
          if (cur === '') return;                       // no change
          if (cur === '__CLEAR__') {
            body[f.id] = '__CLEAR__';
            return;
          }
          if (cur.startsWith('•')) {
            // Defensive: if mask leaked through, refuse to corrupt the secret.
            errors.push(`${f.label}: limpia el campo y escribe el valor completo`);
            return;
          }
          body[f.id] = cur;
        } else {
          // Public field: send if changed (allows clearing too).
          const orig = settings?.[f.id] ?? '';
          if (cur === orig) return;
          body[f.id] = cur;
        }
      }));

      if (errors.length) {
        toast.error(errors.join(' · '));
        setSaving(false);
        return;
      }
      if (Object.keys(body).length === 0) {
        toast.info('Sin cambios');
        setSaving(false);
        return;
      }
      const res = await fetch(`${API}/admin/settings`, { credentials: 'include',
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        toast.error('Tu sesión ha caducado. Vuelve a iniciar sesión.', { duration: 6000 });
        setSaving(false);
        return;
      }
      if (!res.ok) {
        // Bubble the backend's detail to the user (instead of the generic toast)
        let detail = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err && err.detail) detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
        } catch { /* ignore */ }
        // Log to console so the user can copy it for debugging
        console.error('[admin/settings PUT failed]', res.status, detail, 'body sent:', body);
        toast.error(`No se guardó: ${detail}`, { duration: 8000 });
        setSaving(false);
        return;
      }
      const fresh = await res.json();
      setSettings(fresh);
      // Rebuild draft from fresh response — same masking rules.
      const d = {};
      INTEGRATION_SECTIONS.forEach((sec) => sec.fields.forEach((f) => {
        const raw = fresh[f.id] || '';
        if (f.secret && (raw.startsWith('•') || fresh[`${f.id}_set`])) {
          d[f.id] = '';
        } else {
          d[f.id] = raw;
        }
      }));
      setDraft(d);
      toast.success('APIs guardadas. Recarga la página para activar las integraciones del frontend.');
    } catch (err) {
      console.error('[admin/settings save] network error', err);
      toast.error(`Error de red guardando settings: ${err?.message || 'fallo desconocido'}`, { duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border" data-testid="integrations-editor">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Plug className="w-4 h-4 text-primary" />
          Integraciones &amp; APIs
        </CardTitle>
        {settings?.updated_at && (
          <p className="text-[11px] text-muted-foreground">
            Última actualización: {settings.updated_at.slice(0, 19).replace('T', ' ')}
            {settings.updated_by ? ` por ${settings.updated_by}` : ''}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        {INTEGRATION_SECTIONS.map((sec) => (
          <section key={sec.id} className="space-y-2" data-testid={`integration-section-${sec.id}`}>
            <div>
              <h4 className="text-sm font-semibold">{sec.title}</h4>
              {sec.description && <p className="text-xs text-muted-foreground">{sec.description}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sec.fields.map((f) => (
                <IntegrationField
                  key={f.id}
                  field={f}
                  value={draft[f.id]}
                  isSet={f.secret ? !!settings?.[`${f.id}_set`] : !!draft[f.id]}
                  onChange={(v) => setDraft({ ...draft, [f.id]: v })}
                />
              ))}
            </div>
          </section>
        ))}
        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={save} disabled={saving} className="gap-2" data-testid="settings-save">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar todas las APIs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 *  CREATE USER DIALOG
 * ============================================================ */
function CreateUserDialog({ open, onClose, headers, onCreated }) {
  const [form, setForm] = useState({
    email: '', name: '', password: '',
    subscription_plan: 'none',
    is_premium: false, is_admin: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm({ email: '', name: '', password: '', subscription_plan: 'none', is_premium: false, is_admin: false });
  }, [open]);

  const submit = async () => {
    if (!form.email || !form.password || !form.name) {
      toast.error('Email, nombre y contraseña son obligatorios');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/admin/users`, { credentials: 'include',
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          subscription_plan: form.subscription_plan === 'none' ? null : form.subscription_plan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'create failed');
      toast.success(`Usuario ${data.user.email} creado`);
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error creando usuario');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-testid="create-user-dialog">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>Crea una cuenta directamente desde el panel admin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email *</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@dominio.com" data-testid="create-email" />
          </div>
          <div>
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="create-name" />
          </div>
          <div>
            <Label>Contraseña *</Label>
            <Input type="text" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 4 caracteres" data-testid="create-password" />
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={form.subscription_plan} onValueChange={(v) => setForm({ ...form, subscription_plan: v })}>
              <SelectTrigger data-testid="create-plan"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="is_premium">Premium</Label>
            <Switch id="is_premium" checked={form.is_premium}
              onCheckedChange={(v) => setForm({ ...form, is_premium: v })}
              data-testid="create-premium" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="is_admin">Administrador</Label>
            <Switch id="is_admin" checked={form.is_admin}
              onCheckedChange={(v) => setForm({ ...form, is_admin: v })}
              data-testid="create-admin" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} data-testid="create-submit">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 *  EDIT USER DIALOG
 * ============================================================ */
function EditUserDialog({ user, onClose, headers, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email || '',
        name: user.name || '',
        subscription_plan: user.subscription_plan || 'none',
        subscription_end: user.subscription_end ? user.subscription_end.slice(0, 10) : '',
        subscription_status: user.subscription_status || '',
        is_premium: !!user.is_premium,
        is_admin: !!user.is_admin,
      });
    }
  }, [user]);

  if (!user) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        name: form.name,
        email: form.email,
        subscription_plan: form.subscription_plan === 'none' ? null : form.subscription_plan,
        subscription_end: form.subscription_end ? new Date(form.subscription_end).toISOString() : null,
        subscription_status: form.subscription_status || null,
        is_premium: form.is_premium,
        is_admin: form.is_admin,
      };
      const res = await fetch(`${API}/admin/users/${user.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'update failed');
      toast.success('Usuario actualizado');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error actualizando usuario');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-testid="edit-user-dialog">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription className="font-mono text-xs">{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="edit-email" />
          </div>
          <div>
            <Label>Nombre</Label>
            <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="edit-name" />
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={form.subscription_plan || 'none'}
              onValueChange={(v) => setForm({ ...form, subscription_plan: v })}>
              <SelectTrigger data-testid="edit-plan"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fin de suscripción (opcional)</Label>
            <Input type="date" value={form.subscription_end || ''}
              onChange={(e) => setForm({ ...form, subscription_end: e.target.value })}
              data-testid="edit-sub-end" />
          </div>
          <div>
            <Label>Estado de suscripción</Label>
            <Select value={form.subscription_status || 'none'}
              onValueChange={(v) => setForm({ ...form, subscription_status: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— (sin estado)</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="canceled">canceled</SelectItem>
                <SelectItem value="past_due">past_due</SelectItem>
                <SelectItem value="expired">expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit_premium">Premium</Label>
            <Switch id="edit_premium" checked={!!form.is_premium}
              onCheckedChange={(v) => setForm({ ...form, is_premium: v })} data-testid="edit-premium" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit_admin">Administrador</Label>
            <Switch id="edit_admin" checked={!!form.is_admin}
              onCheckedChange={(v) => setForm({ ...form, is_admin: v })} data-testid="edit-admin" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} data-testid="edit-submit">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 *  RESET PASSWORD DIALOG
 * ============================================================ */
function ResetPasswordDialog({ user, onClose, headers }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) setPw(''); }, [user]);

  if (!user) return null;

  const submit = async () => {
    if (pw.length < 4) { toast.error('Mínimo 4 caracteres'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ new_password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'reset failed');
      toast.success(`Contraseña actualizada para ${user.email}`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error reseteando');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" data-testid="reset-password-dialog">
        <DialogHeader>
          <DialogTitle>Resetear contraseña</DialogTitle>
          <DialogDescription className="font-mono text-xs">{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Nueva contraseña</Label>
          <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="Mínimo 4 caracteres" data-testid="reset-input" />
          <p className="text-xs text-muted-foreground">
            El usuario podrá iniciar sesión con esta contraseña inmediatamente.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} data-testid="reset-submit">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
            Resetear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 *  CONFIRM DELETE DIALOG
 * ============================================================ */
function ConfirmDeleteDialog({ user, onClose, onConfirm }) {
  if (!user) return null;
  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" data-testid="delete-user-dialog">
        <DialogHeader>
          <DialogTitle className="text-destructive">¿Eliminar usuario?</DialogTitle>
          <DialogDescription>
            Vas a borrar permanentemente <span className="font-mono">{user.email}</span> y todos sus datos asociados.
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} data-testid="confirm-delete">
            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 *  AUDIT LOG PANEL — every admin write is recorded server-side and
 *  surfaced here for transparency / GDPR / forensics.
 * ============================================================ */

const ACTION_LABELS = {
  'user.create':         { label: 'Usuario creado',       color: 'bg-green-500/15 text-green-600' },
  'user.update':         { label: 'Usuario editado',      color: 'bg-blue-500/15 text-blue-500'   },
  'user.delete':         { label: 'Usuario eliminado',    color: 'bg-red-500/15 text-red-500'     },
  'user.reset_password': { label: 'Password reseteada',   color: 'bg-amber-500/15 text-amber-500' },
  'user.promote':        { label: 'Promovido a admin',    color: 'bg-purple-500/15 text-purple-500' },
  'user.demote':         { label: 'Admin removido',       color: 'bg-slate-500/15 text-slate-400' },
  'settings.update':     { label: 'Settings guardadas',   color: 'bg-indigo-500/15 text-indigo-500' },
};

function AuditLogPanel({ headers }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');
  const [emailFilter, setEmailFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (actionFilter !== 'all') params.set('action', actionFilter);
    if (emailFilter.trim()) params.set('target_email', emailFilter.trim());
    try {
      const res = await fetch(`${API}/admin/audit-log?${params.toString()}`, { credentials: 'include', headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRows(data.logs || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Error cargando audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <Card className="bg-card border-border" data-testid="audit-log-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Audit log
            <Badge variant="outline" className="ml-2">{total}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-44 h-8 text-xs" data-testid="audit-filter-action">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Filtrar por email afectado"
              className="w-56 h-8 text-xs"
              data-testid="audit-filter-email"
            />
            <Button size="sm" variant="outline" onClick={load} className="gap-2 h-8" data-testid="audit-apply">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Aplicar
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Cada acción admin se registra automáticamente con IP, agente y detalles. Auto-purga a 180 días.
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <Th>Fecha</Th>
              <Th>Acción</Th>
              <Th>Admin</Th>
              <Th>Afectado</Th>
              <Th>IP</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = ACTION_LABELS[r.action] || { label: r.action, color: 'bg-muted text-muted-foreground' };
              const isOpen = expanded === r.id;
              return (
                <Fragment key={r.id}>
                  <tr className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {r.timestamp ? r.timestamp.slice(0, 19).replace('T', ' ') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={meta.color}>{meta.label}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.admin_email}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.target_email || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.ip || '—'}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="ghost"
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        className="gap-1 h-7" data-testid={`audit-toggle-${r.id}`}>
                        <FileText className="w-3 h-3" /> {isOpen ? 'Ocultar' : 'Detalles'}
                      </Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-muted/10">
                      <td colSpan={6} className="px-3 py-3">
                        <pre className="text-[11px] font-mono bg-background border border-border rounded p-2 overflow-x-auto">
{JSON.stringify(r.details || {}, null, 2)}
                        </pre>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          User-Agent: <span className="font-mono">{r.user_agent || '—'}</span>
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  {loading ? 'Cargando…' : 'Sin registros'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 *  REVENUE ANALYTICS
 * ============================================================ */
function RevenueAnalyticsCard({ metrics, headers }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ churn: null, conversion: null, ltv: {} });

  useEffect(() => {
    fetch(`${API}/admin/revenue`, { credentials: 'include', headers }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.history) setHistory(d.history);
      if (d?.churn !== undefined) setStats(s => ({ ...s, churn: d.churn, conversion: d.conversion, ltv: d.ltv || {} }));
    }).catch(() => {});
  }, []); // eslint-disable-line

  const currentMrr = history[history.length - 1]?.mrr || 0;
  const prevMrr = history[history.length - 2]?.mrr || 0;
  const growth = prevMrr ? (((currentMrr - prevMrr) / prevMrr) * 100).toFixed(1) : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Revenue Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">MRR actual</p>
            <p className="text-xl font-bold text-green-500">${currentMrr.toLocaleString()}</p>
            <p className={`text-xs ${growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {growth >= 0 ? '+' : ''}{growth}% vs mes anterior
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Churn rate</p>
            <p className="text-xl font-bold text-red-400">{stats.churn != null ? `${stats.churn}%` : '—'}</p>
            <p className="text-xs text-muted-foreground">mensual</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Conversión Free→Premium</p>
            <p className="text-xl font-bold text-blue-400">{stats.conversion != null ? `${stats.conversion}%` : '—'}</p>
            <p className="text-xs text-muted-foreground">este mes</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">LTV Lifetime</p>
            <p className="text-xl font-bold text-amber-400">{stats.ltv?.lifetime != null ? `$${stats.ltv.lifetime}` : '—'}</p>
            <p className="text-xs text-muted-foreground">pago único</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Evolución MRR (6 meses)</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => [`$${v}`, 'MRR']} contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
              <Area type="monotone" dataKey="mrr" stroke="#10b981" fill="url(#mrrGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">LTV por plan</p>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(stats.ltv).map(([plan, ltv]) => (
              <div key={plan} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: PLAN_COLORS[plan] || '#6b7280' }} />
                <span className="text-xs capitalize">{plan}: <strong>${ltv}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 *  PLAN DISTRIBUTION
 * ============================================================ */
function PlanDistributionCard({ metrics }) {
  // El backend devuelve by_plan como LISTA [{plan, count}]; tratarlo como dict
  // (Object.entries) renderizaba objetos como hijos de React y tiraba TODO el
  // panel admin (React #31) en cuanto había un usuario con plan.
  const prettyPlan = (plan) =>
    !plan || plan === 'null' || plan === 'free' ? 'Free' : plan.charAt(0).toUpperCase() + plan.slice(1);
  const rawDist = Array.isArray(metrics?.by_plan)
    ? metrics.by_plan.map(({ plan, count }) => ({ plan: prettyPlan(plan), count: Number(count) || 0 }))
    : metrics?.by_plan
    ? Object.entries(metrics.by_plan).map(([plan, count]) => ({ plan: prettyPlan(plan), count: Number(count) || 0 }))
    : [];

  const total = rawDist.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="w-4 h-4 text-primary" /> Distribución de Planes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={rawDist} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={70} label={({ plan, percent }) => `${plan} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {rawDist.map((entry) => (
                  <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan.toLowerCase()] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {rawDist.map(({ plan, count }) => (
              <div key={plan} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: PLAN_COLORS[plan.toLowerCase()] || '#6b7280' }} />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="capitalize">{plan}</span>
                    <span className="font-medium">{count} <span className="text-muted-foreground text-xs">({total ? ((count / total) * 100).toFixed(0) : 0}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${total ? (count / total) * 100 : 0}%`, background: PLAN_COLORS[plan.toLowerCase()] || '#6b7280' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 *  USAGE ANALYTICS
 * ============================================================ */
function UsageAnalyticsCard({ headers }) {
  const [data, setData] = useState([]);
  const [activeUsers, setActiveUsers] = useState({ day: null, week: null, month: null });

  useEffect(() => {
    fetch(`${API}/admin/usage`, { credentials: 'include', headers }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.calc_usage) setData(d.calc_usage);
      if (d?.active_users) setActiveUsers(d.active_users);
    }).catch(() => {});
  }, []); // eslint-disable-line

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Analytics de Uso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[['DAU', activeUsers.day], ['WAU', activeUsers.week], ['MAU', activeUsers.month]].map(([label, val]) => (
            <div key={label} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{val != null ? val.toLocaleString() : '—'}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Calculadoras más usadas</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} width={90} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
              <Bar dataKey="usos" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 *  USAGE HEATMAP — qué miran más los usuarios
 * ============================================================ */

/**
 * PaymentReconciliationCard — money taken vs premium granted.
 *
 * The failure it exists for is silent: a customer pays, the webhook is lost,
 * and the first signal is a complaint. Nothing errors, so nothing shows up in
 * the logs. This puts the discrepancy on screen and lets an admin repair it in
 * one click (the backend only allows it for genuinely paid transactions).
 */
function PaymentReconciliationCard({ headers }) {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState(null);

  const bearerReady = (h) => {
    const b = h?.Authorization || '';
    // Right after a refresh the token is briefly 'Bearer null'.
    return !!API && !!b && !b.endsWith('null') && !b.includes(DEMO_TOKEN);
  };

  const load = useCallback(() => {
    if (!bearerReady(headers)) return;
    fetch(`${API}/admin/payments/reconciliation`, { headers, credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(setData).catch(() => {});
    fetch(`${API}/admin/payments/webhook-health`, { headers, credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(setHealth).catch(() => {});
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  const grant = async (txId) => {
    setBusy(txId);
    try {
      const res = await fetch(`${API}/admin/payments/${txId}/grant`, {
        method: 'POST', headers, credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || `Error ${res.status}`);
      toast.success(body.already_premium ? 'El usuario ya era premium' : 'Premium concedido');
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const c = data?.counts || {};
  const alerts = (health?.providers || []).filter(p => p.alert);

  return (
    <Card className="bg-card border-border" data-testid="payment-reconciliation">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Conciliación de pagos
        </CardTitle>
        <Button size="sm" variant="outline" onClick={load}>Actualizar</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Pagados sin premium', c.paid_not_premium, 'text-red-500'],
            ['Pendientes antiguos', c.stale_pending, 'text-amber-500'],
            ['Premium sin pago', c.premium_no_payment, 'text-muted-foreground'],
          ].map(([label, n, tone]) => (
            <div key={label} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className={`font-mono font-bold text-xl ${n > 0 ? tone : ''}`}>{n ?? '—'}</div>
            </div>
          ))}
        </div>

        {alerts.length > 0 && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3">
            <div className="text-xs font-semibold text-red-500 mb-1">
              Sin webhooks recientes: {alerts.map(a => a.provider).join(', ')}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Hay {health?.active_paid_subscriptions} suscripciones de pago activas y no llega ningún
              webhook desde hace más de {health?.silence_threshold_hours} h. Las renovaciones podrían
              no estar registrándose.
            </p>
          </div>
        )}

        {(data?.paid_not_premium || []).length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1.5">
              Han pagado y NO tienen premium
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {data.paid_not_premium.map(tx => (
                <div
                  key={tx.transaction_id}
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{tx.user_email}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {tx.plan_id} · {tx.amount} {tx.currency} · {tx.payment_method}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={busy === tx.transaction_id}
                    onClick={() => grant(tx.transaction_id)}
                  >
                    {busy === tx.transaction_id ? '…' : 'Conceder'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && c.paid_not_premium === 0 && (
          <p className="text-xs text-muted-foreground">
            Sin discrepancias: todo el que ha pagado tiene su premium.
            {' '}{data.transactions_scanned} transacciones revisadas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UsageHeatmapCard({ headers }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const bearer = headers?.Authorization || '';
    // After a page refresh the token is briefly 'Bearer null'; skip until it's real.
    // Depending on [headers] makes the fetch re-run once the token is refreshed.
    if (!API || !bearer || bearer.endsWith('null') || bearer.includes(DEMO_TOKEN)) return;
    fetch(`${API}/admin/usage-heatmap?days=${days}`, { headers, credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setData(d))
      .catch(() => {});
  }, [days, headers]); // eslint-disable-line

  const heatmap = data?.heatmap || [];
  const maxCell = Math.max(1, ...heatmap.flat());
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" /> Mapa de calor de uso
        </CardTitle>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 días</SelectItem>
            <SelectItem value="30">30 días</SelectItem>
            <SelectItem value="90">90 días</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
            <p className="text-xs text-muted-foreground">Vistas totales</p>
            <p className="text-xl font-bold">{data?.total_views != null ? data.total_views.toLocaleString() : '—'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
            <p className="text-xs text-muted-foreground">Visitantes únicos</p>
            <p className="text-xl font-bold">{data?.unique_visitors != null ? data.unique_visitors.toLocaleString() : '—'}</p>
          </div>
        </div>

        {/* Páginas / secciones más vistas */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Páginas / secciones más vistas</p>
          {data?.top_paths?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.top_paths} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} width={130} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                <Bar dataKey="views" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Aún no hay datos de uso. Se registran cuando los usuarios navegan (con
              consentimiento de cookies aceptado).
            </p>
          )}
        </div>

        {/* Heatmap día × hora (UTC) */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Actividad por día y hora (UTC)</p>
          <div className="overflow-x-auto">
            <div className="inline-block">
              {dayLabels.map((dl, dow) => (
                <div key={dl} className="flex items-center">
                  <div className="w-9 text-[10px] text-muted-foreground">{dl}</div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const v = heatmap[dow]?.[h] || 0;
                    const o = v === 0 ? 0 : 0.15 + 0.85 * (v / maxCell);
                    return (
                      <div
                        key={h}
                        title={`${dl} ${h}:00 UTC — ${v} vistas`}
                        className="w-3.5 h-3.5 m-px rounded-sm border border-border/30"
                        style={{ backgroundColor: v ? `rgba(16,185,129,${o})` : 'transparent' }}
                      />
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center mt-1">
                <div className="w-9" />
                {[0, 6, 12, 18].map((h) => (
                  <div key={h} className="text-[9px] text-muted-foreground" style={{ width: '90px' }}>{h}h</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 *  COUPON MANAGER
 * ============================================================ */
function CouponManagerCard({ headers }) {
  const [coupons, setCoupons] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ id: '', discount: 20, type: 'percent', max_uses: '', expires: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch(`${API}/admin/coupons`, { credentials: 'include', headers }).catch(() => null);
    if (res?.ok) { const d = await res.json(); setCoupons(d.coupons || []); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const create = async () => {
    if (!form.id) return toast.error('Introduce un código');
    setBusy(true);
    const res = await fetch(`${API}/admin/coupons`, { credentials: 'include', method: 'POST', headers, body: JSON.stringify(form) }).catch(() => null);
    setBusy(false);
    if (res?.ok) { load(); setCreateOpen(false); toast.success('Cupón creado'); }
    else toast.error('Error creando cupón');
  };

  const toggle = async (coupon) => {
    await fetch(`${API}/admin/coupons/${coupon.id}/toggle`, { credentials: 'include', method: 'POST', headers }).catch(() => null);
    load();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Cupones y Descuentos
          </CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1 h-7">
            <Plus className="w-3 h-3" /> Nuevo cupón
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              {['Código', 'Descuento', 'Usos', 'Máx.', 'Expira', 'Estado', ''].map(h => (
                <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-mono font-bold text-primary">{c.id}</td>
                <td className="px-3 py-2">{c.discount}{c.type === 'percent' ? '%' : '$'}</td>
                <td className="px-3 py-2">{c.uses}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.max_uses ?? '∞'}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{c.expires ?? '—'}</td>
                <td className="px-3 py-2">
                  <Badge className={c.active ? 'bg-green-500/15 text-green-500' : 'bg-muted text-muted-foreground'}>
                    {c.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggle(c)}>
                    {c.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
      <Dialog open={createOpen} onOpenChange={v => !v && setCreateOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Crear cupón</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Código *</Label><Input value={form.id} onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })} placeholder="PROMO20" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Descuento</Label><Input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: +e.target.value })} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percent">%</SelectItem><SelectItem value="fixed">$ fijo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Máx. usos (vacío = ilimitado)</Label><Input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} /></div>
            <div><Label>Fecha expiración (opcional)</Label><Input type="date" value={form.expires} onChange={e => setForm({ ...form, expires: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={create} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ============================================================
 *  FEATURE FLAGS
 * ============================================================ */
function FeatureFlagsCard({ headers }) {
  const [flags, setFlags] = useState([]);

  const load = async () => {
    const res = await fetch(`${API}/admin/feature-flags`, { credentials: 'include', headers }).catch(() => null);
    if (res?.ok) { const d = await res.json(); setFlags(d.flags || []); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const toggle = async (flag) => {
    const updated = flags.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f);
    setFlags(updated);
    await fetch(`${API}/admin/feature-flags/${flag.id}`, { credentials: 'include', method: 'PATCH', headers, body: JSON.stringify({ enabled: !flag.enabled }) }).catch(() => {});
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Feature Flags
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">Activa o desactiva funcionalidades sin desplegar código.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {flags.map(flag => (
            <div key={flag.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{flag.label}</span>
                  <Badge variant="outline" className="text-[10px]">{flag.plans}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{flag.desc}</p>
              </div>
              <Switch checked={flag.enabled} onCheckedChange={() => toggle(flag)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 *  STRIPE WEBHOOK LOGS
 * ============================================================ */
const WEBHOOK_COLORS = {
  'payment_intent.succeeded': 'bg-green-500/15 text-green-500',
  'customer.subscription.created': 'bg-blue-500/15 text-blue-400',
  'customer.subscription.deleted': 'bg-red-500/15 text-red-400',
  'invoice.payment_failed': 'bg-red-500/20 text-red-500',
  'invoice.paid': 'bg-green-500/15 text-green-500',
};

function WebhookLogsCard({ headers }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API}/admin/webhooks?limit=20`, { credentials: 'include', headers }).catch(() => null);
    setLoading(false);
    if (res?.ok) { const d = await res.json(); setLogs(d.logs || []); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const retry = async (id) => {
    await fetch(`${API}/admin/webhooks/${id}/retry`, { credentials: 'include', method: 'POST', headers }).catch(() => null);
    toast.success('Webhook reenviado');
    load();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" /> Stripe Webhook Logs
          </CardTitle>
          <Button size="sm" variant="outline" onClick={load} className="gap-1 h-7">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refrescar
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Últimos eventos recibidos de Stripe.</p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              {['Evento', 'Importe', 'Customer', 'Fecha', 'Estado', ''].map(h => (
                <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Badge className={`text-[10px] ${WEBHOOK_COLORS[log.type] || 'bg-muted text-muted-foreground'}`}>
                    {log.type}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{log.amount ? `$${(log.amount / 100).toFixed(2)}` : '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{log.customer}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{log.created?.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-3 py-2">
                  <Badge className={log.status === 'ok' ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}>
                    {log.status === 'ok' ? 'OK' : 'Error'}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  {log.status !== 'ok' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => retry(log.id)}>Reintentar</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAINTENANCE MODE CARD
═══════════════════════════════════════════════════════════════════════════ */
function MaintenanceModeCard({ headers }) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/maintenance`, { credentials: 'include', headers });
      if (!res.ok) return;
      const d = await res.json();
      setEnabled(!!d.enabled);
      setMessage(d.message || '');
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (API) load(); else setLoading(false); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/maintenance`, { credentials: 'include',
        method: 'POST', headers,
        body: JSON.stringify({ enabled, message }),
      });
      if (!res.ok) throw new Error();
      toast.success(enabled ? 'Modo mantenimiento ACTIVADO' : 'Modo mantenimiento desactivado');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  return (
    <Card className={`border-border ${enabled ? 'border-orange-500/50 bg-orange-500/5' : 'bg-card'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Construction className="w-4 h-4 text-orange-500" /> Modo Mantenimiento
          </CardTitle>
          <div className="flex items-center gap-3">
            {enabled && <Badge className="bg-orange-500/15 text-orange-500 animate-pulse">ACTIVO</Badge>}
            <Switch checked={enabled} onCheckedChange={setEnabled} disabled={loading} />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Muestra un banner de mantenimiento a todos los usuarios.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Mensaje para los usuarios</Label>
          <textarea
            className="w-full mt-1 h-20 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Estamos realizando tareas de mantenimiento. Volvemos en breve..."
          />
        </div>
        {enabled && (
          <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/20 text-sm text-orange-600">
            <strong>Vista previa:</strong> {message || 'Estamos realizando tareas de mantenimiento. Volvemos en breve...'}
          </div>
        )}
        <Button onClick={save} disabled={saving} size="sm" className={enabled ? 'bg-orange-500 hover:bg-orange-600' : ''}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          &nbsp;Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL CAMPAIGNS CARD
═══════════════════════════════════════════════════════════════════════════ */
const CAMPAIGN_SEGMENTS = [
  { value: 'all',     label: 'Todos los usuarios' },
  { value: 'free',    label: 'Solo usuarios free' },
  { value: 'premium', label: 'Solo usuarios premium' },
  { value: 'expired', label: 'Suscripción expirada' },
];

function EmailCampaignsCard({ headers }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', body_html: '', segment: 'all' });
  const [sending, setSending] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/campaigns`, { credentials: 'include', headers });
      if (res.ok) { const d = await res.json(); setCampaigns(d.campaigns || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (API) load(); else setLoading(false); }, []);

  const createCampaign = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/campaigns`, { credentials: 'include', method: 'POST', headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success('Campaña creada');
      setShowCreate(false);
      setForm({ name: '', subject: '', body_html: '', segment: 'all' });
      load();
    } catch { toast.error('Error al crear campaña'); }
    finally { setSaving(false); }
  };

  const sendCampaign = async (id) => {
    if (!window.confirm('¿Enviar esta campaña ahora? Esta acción no se puede deshacer.')) return;
    setSending(id);
    try {
      const res = await fetch(`${API}/admin/campaigns/${id}/send`, { credentials: 'include', method: 'POST', headers });
      if (!res.ok) throw new Error();
      const d = await res.json();
      toast.success(`Enviado a ${d.sent_count} usuarios`);
      load();
    } catch { toast.error('Error al enviar campaña'); }
    finally { setSending(null); }
  };

  const STATUS_CLS = { draft: 'bg-muted text-muted-foreground', sent: 'bg-green-500/15 text-green-500', sending: 'bg-blue-500/15 text-blue-500' };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Campañas de Email
          </CardTitle>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1 h-7">
            <Plus className="w-3 h-3" /> Nueva
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Envía emails segmentados vía SendGrid.</p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              {['Nombre', 'Asunto', 'Segmento', 'Estado', 'Enviados', 'Creada', ''].map(h => (
                <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium text-xs">{c.name}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px] truncate">{c.subject}</td>
                <td className="px-3 py-2"><Badge className="text-[10px] bg-primary/10 text-primary">{CAMPAIGN_SEGMENTS.find(s => s.value === c.segment)?.label || c.segment}</Badge></td>
                <td className="px-3 py-2"><Badge className={`text-[10px] ${STATUS_CLS[c.status] || 'bg-muted text-muted-foreground'}`}>{c.status}</Badge></td>
                <td className="px-3 py-2 text-xs text-center">{c.sent_count ?? 0}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{c.created_at?.slice(0, 10)}</td>
                <td className="px-3 py-2">
                  {c.status === 'draft' && (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={!!sending} onClick={() => sendCampaign(c.id)}>
                      {sending === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Enviar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && campaigns.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Sin campañas aún. Crea la primera.</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva campaña de email</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Nombre interno</Label><Input className="mt-1" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Ej: Retención Q1 2025" /></div>
            <div><Label className="text-xs">Asunto del email</Label><Input className="mt-1" value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} placeholder="¡Bienvenido a Trading Calculator PRO!" /></div>
            <div>
              <Label className="text-xs">Segmento</Label>
              <Select value={form.segment} onValueChange={v => setForm(f => ({...f, segment: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CAMPAIGN_SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Contenido HTML</Label>
              <textarea className="w-full mt-1 h-28 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none" value={form.body_html} onChange={e => setForm(f => ({...f, body_html: e.target.value}))} placeholder="<h1>Hola!</h1><p>Contenido del email...</p>" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={createCampaign} disabled={!form.name || !form.subject || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar campaña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAYMENT HISTORY CARD
═══════════════════════════════════════════════════════════════════════════ */
function PaymentHistoryCard({ headers }) {
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchUser = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API}/admin/users?q=${encodeURIComponent(query)}&limit=10`, { credentials: 'include', headers });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setUserResults(d.users || []);
      setPayments([]);
      setUserId(null);
    } catch { toast.error('Error al buscar usuario'); }
    finally { setSearching(false); }
  };

  const loadPayments = async (uid) => {
    setUserId(uid);
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users/${uid}/payments`, { credentials: 'include', headers });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPayments(d.transactions || []);
    } catch { toast.error('Error al cargar pagos'); }
    finally { setLoading(false); }
  };

  const STATUS_CLS = { completed: 'bg-green-500/15 text-green-500', failed: 'bg-red-500/15 text-red-500', pending: 'bg-yellow-500/15 text-yellow-500' };
  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Historial de Pagos por Usuario</CardTitle>
        <p className="text-[11px] text-muted-foreground">Consulta todas las transacciones de un usuario específico.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUser()} placeholder="Buscar por email o nombre..." className="flex-1" />
          <Button onClick={searchUser} disabled={searching} size="sm" variant="outline" className="gap-1">
            {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} Buscar
          </Button>
        </div>

        {userResults.length > 0 && !userId && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{userResults.length} resultado(s) — selecciona un usuario:</p>
            {userResults.map(u => (
              <button key={u.id} onClick={() => loadPayments(u.id)} className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted/60 flex items-center justify-between border border-border">
                <span className="font-mono text-xs">{u.email}</span>
                <Badge variant="outline" className="text-[10px]">{u.subscription_plan || 'free'}</Badge>
              </button>
            ))}
          </div>
        )}

        {userId && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{payments.length} transacción(es) · Total: <strong>${total.toFixed(2)}</strong></p>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setUserId(null); setUserResults([]); setPayments([]); setQuery(''); }}>← Volver</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    {['Fecha', 'Plan', 'Importe', 'Estado', 'ID Stripe'].map(h => (
                      <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin transacciones registradas</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{p.created_at?.slice(0, 16).replace('T', ' ')}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{p.plan || '—'}</Badge></td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold">${(p.amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-2"><Badge className={`text-[10px] ${STATUS_CLS[p.status] || 'bg-muted text-muted-foreground'}`}>{p.status}</Badge></td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{p.stripe_payment_intent_id || p.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHURN SURVEY CARD
═══════════════════════════════════════════════════════════════════════════ */
const CHURN_REASONS = { price: 'Precio alto', no_use: 'No lo usaba', missing_feature: 'Falta una función', bug: 'Bug/Problema', competitor: 'Migré a competidor', other: 'Otro' };
const CHURN_COLORS_ARR = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

function ChurnSurveyCard({ headers }) {
  const [surveys, setSurveys] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followUp, setFollowUp] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/churn-surveys`, { credentials: 'include', headers });
      if (!res.ok) return;
      const d = await res.json();
      setSurveys(d.surveys || []);
      setSummary(Object.entries(d.by_reason || {}).map(([reason, count]) => ({ reason, count })));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (API) load(); else setLoading(false); }, []);

  const saveFollowUp = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/churn-surveys/${followUp.id}/follow-up`, { credentials: 'include',
        method: 'POST', headers, body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error();
      toast.success('Nota guardada');
      setFollowUp(null);
      setNote('');
      load();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><UserMinus className="w-4 h-4 text-red-500" /> Encuestas de Cancelación (Churn)</CardTitle>
          <Button size="sm" variant="outline" onClick={load} className="gap-1 h-7"><RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Motivos de cancelación reportados por usuarios.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Por motivo</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={70} label={e => CHURN_REASONS[e.reason] || e.reason}>
                    {summary.map((_, i) => <Cell key={i} fill={CHURN_COLORS_ARR[i % CHURN_COLORS_ARR.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, CHURN_REASONS[n] || n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Distribución</p>
            {summary.map((s, i) => {
              const tot = summary.reduce((a, b) => a + b.count, 0);
              const pct = tot > 0 ? Math.round((s.count / tot) * 100) : 0;
              return (
                <div key={s.reason} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHURN_COLORS_ARR[i % CHURN_COLORS_ARR.length] }} />
                  <span className="text-xs flex-1">{CHURN_REASONS[s.reason] || s.reason}</span>
                  <span className="text-xs font-mono text-muted-foreground">{s.count} ({pct}%)</span>
                </div>
              );
            })}
            {summary.length === 0 && !loading && <p className="text-xs text-muted-foreground">Sin datos aún.</p>}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                {['Email', 'Motivo', 'Comentario', 'Fecha', 'Seguimiento', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {surveys.slice(0, 20).map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">{s.email}</td>
                  <td className="px-3 py-2"><Badge className="text-[10px] bg-red-500/10 text-red-500">{CHURN_REASONS[s.reason] || s.reason}</Badge></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{s.comment || '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s.created_at?.slice(0, 10)}</td>
                  <td className="px-3 py-2">{s.follow_up_note ? <Badge className="bg-green-500/10 text-green-500 text-[10px]">Resuelto</Badge> : <Badge className="bg-muted text-muted-foreground text-[10px]">Pendiente</Badge>}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFollowUp(s); setNote(s.follow_up_note || ''); }}>Nota</Button>
                  </td>
                </tr>
              ))}
              {!loading && surveys.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Sin encuestas aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={!!followUp} onOpenChange={() => setFollowUp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nota de seguimiento — {followUp?.email}</DialogTitle></DialogHeader>
          <textarea className="w-full h-24 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none" value={note} onChange={e => setNote(e.target.value)} placeholder="Acción tomada, resolución..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUp(null)}>Cancelar</Button>
            <Button onClick={saveFollowUp} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar nota'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COHORT ANALYSIS CARD
═══════════════════════════════════════════════════════════════════════════ */
function CohortAnalysisCard({ headers }) {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!API) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/admin/cohorts`, { credentials: 'include', headers });
        if (res.ok) { const d = await res.json(); setCohorts(d.cohorts || []); }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const chartData = cohorts.map(c => ({ month: c.month?.slice(0, 7), tasa: Math.round(c.conversion_rate || 0) }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Análisis de Cohortes</CardTitle>
        <p className="text-[11px] text-muted-foreground">Tasa de conversión free→premium por mes de registro.</p>
      </CardHeader>
      <CardContent>
        {loading ? <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={v => [`${v}%`, 'Conversión']} />
                  <Bar dataKey="tasa" fill="var(--primary)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    {['Mes', 'Usuarios', 'Convierten', 'Tasa', 'Días medio'].map(h => (
                      <th key={h} className="px-2 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map(c => (
                    <tr key={c.month} className="border-t border-border hover:bg-muted/20">
                      <td className="px-2 py-2 text-xs font-mono">{c.month?.slice(0, 7)}</td>
                      <td className="px-2 py-2 text-xs text-center">{c.total_users}</td>
                      <td className="px-2 py-2 text-xs text-center">{c.converted}</td>
                      <td className="px-2 py-2 text-xs text-center">
                        <Badge className={`text-[10px] ${(c.conversion_rate || 0) > 10 ? 'bg-green-500/15 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                          {Math.round(c.conversion_rate || 0)}%
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-xs text-center text-muted-foreground">{c.avg_days_to_convert ? `${Math.round(c.avg_days_to_convert)}d` : '—'}</td>
                    </tr>
                  ))}
                  {cohorts.length === 0 && <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">Sin datos de cohortes</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REFERRAL MANAGER CARD
═══════════════════════════════════════════════════════════════════════════ */
function ReferralManagerCard({ headers }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!API) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/admin/referrals/leaderboard`, { credentials: 'include', headers });
        if (res.ok) { const d = await res.json(); setLeaderboard(d.leaderboard || []); setStats(d.stats || null); }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> Programa de Referidos</CardTitle>
        <p className="text-[11px] text-muted-foreground">Top referidores y métricas del programa.</p>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Total referidos', value: stats.total_referrals },
              { label: 'Convertidos', value: stats.total_conversions },
              { label: 'Tasa conversión', value: `${Math.round(stats.conversion_rate || 0)}%` },
            ].map(m => (
              <div key={m.label} className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xl font-bold">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              {['#', 'Referidor', 'Referidos', 'Conversiones'].map(h => (
                <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : leaderboard.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Sistema de referidos no configurado aún</td></tr>
            ) : leaderboard.map((r, i) => (
              <tr key={r.email} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 text-xs font-bold text-muted-foreground">#{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.email}</td>
                <td className="px-3 py-2 text-xs text-center">{r.referrals}</td>
                <td className="px-3 py-2 text-xs text-center"><Badge className="bg-green-500/10 text-green-500 text-[10px]">{r.conversions}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AFFILIATE PAYOUT REQUESTS — notificación: afiliados que piden su pago
═══════════════════════════════════════════════════════════════════════════ */
function AffiliatePayoutRequestsCard({ headers }) {
  const [reqs, setReqs] = useState([]);
  const [pending, setPending] = useState(0);
  const [amount, setAmount] = useState(0);
  const toasted = useRef(false);

  const bearer = headers?.Authorization || '';
  const ready = bearer && !bearer.includes('null');

  const fetchReqs = async () => {
    if (!API || !ready) return;
    try {
      const res = await fetch(`${API}/admin/affiliates/payout-requests?status=pending`, { credentials: 'include', headers });
      if (res.ok) {
        const d = await res.json();
        setReqs(d.requests || []); setPending(d.pending_count || 0); setAmount(d.pending_amount_eur || 0);
        if ((d.pending_count || 0) > 0 && !toasted.current) {
          toasted.current = true;
          toast.warning(`Tienes ${d.pending_count} solicitud(es) de pago de afiliados pendientes — ${d.pending_amount_eur} €`,
            { duration: 8000 });
        }
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchReqs(); /* eslint-disable-next-line */ }, [headers]);

  const action = async (id, verb) => {
    let ref = '';
    if (verb === 'mark-paid') ref = window.prompt('Referencia del pago (opcional):') || '';
    try {
      const res = await fetch(`${API}/admin/affiliates/payout-requests/${id}/${verb}`, { credentials: 'include',
        method: 'POST', headers, body: verb === 'mark-paid' ? JSON.stringify({ payout_reference: ref }) : undefined });
      if (res.ok) { toast.success('OK'); fetchReqs(); } else toast.error('Error');
    } catch { toast.error('Error'); }
  };

  if (pending === 0) return null;   // solo aparece cuando hay algo que pagar

  return (
    <Card className="bg-yellow-500/5 border-yellow-500/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
          <AlertCircle className="w-4 h-4" /> Solicitudes de pago pendientes ({pending}) — {amount} €
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">Afiliados que han solicitado su pago. Haz la transferencia y márcala como pagada.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40"><tr className="text-left">
              {['Email', 'Importe', 'Activos', 'Bloques', 'Fecha', ''].map(h => (
                <th key={h} className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {reqs.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-2 py-2 font-mono text-xs">{r.email}</td>
                  <td className="px-2 py-2 text-center text-xs font-bold">{r.amount_eur} €</td>
                  <td className="px-2 py-2 text-center text-xs">{r.active_count}</td>
                  <td className="px-2 py-2 text-center text-xs">{r.blocks}</td>
                  <td className="px-2 py-2 text-center text-[10px] text-muted-foreground">{(r.created_at || '').slice(0, 10)}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" className="h-7 text-xs mr-1" onClick={() => action(r.id, 'mark-paid')}>Marcar pagado</Button>
                    <button onClick={() => action(r.id, 'reject')} title="Rechazar" className="p-1 text-red-500 hover:bg-red-500/10 rounded"><X className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AFFILIATES ADMIN CARD — lista SEPARADA de clientes, con/sin referidos,
   orden por activos/bloques/importe (de 1000 en 1000), ficha con sus referidos.
═══════════════════════════════════════════════════════════════════════════ */
function AffiliatesAdminCard({ headers }) {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState('all');
  const [sort, setSort] = useState('active_desc');
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);

  const bearer = headers?.Authorization || '';
  const ready = bearer && !bearer.includes('null');

  const fetchList = async () => {
    if (!API || !ready) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/affiliates?segment=${segment}&sort=${sort}`, { credentials: 'include', headers });
      if (res.ok) { const d = await res.json(); setRows(d.affiliates || []); setTotals(d.totals || null); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [headers, segment, sort]);

  const act = async (id, verb) => {
    try {
      const res = await fetch(`${API}/admin/affiliates/${id}/${verb}`, { credentials: 'include', method: 'POST', headers });
      if (res.ok) { toast.success('OK'); fetchList(); } else { toast.error('Error'); }
    } catch { toast.error('Error'); }
  };

  const toggle = async (id) => {
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
    setExpanded(id); setDetail(null);
    try {
      const res = await fetch(`${API}/admin/affiliates/${id}`, { credentials: 'include', headers });
      if (res.ok) setDetail(await res.json());
    } catch { /* ignore */ }
  };

  const badge = (s) => {
    const map = { approved: 'bg-green-500/10 text-green-500', pending: 'bg-yellow-500/10 text-yellow-600',
      rejected: 'bg-red-500/10 text-red-500', suspended: 'bg-muted text-muted-foreground' };
    return <Badge className={`${map[s] || 'bg-muted'} text-[10px]`}>{s}</Badge>;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Afiliados</CardTitle>
        <p className="text-[11px] text-muted-foreground">Clientes que traen referidos (separado de la lista de usuarios). Pago por bloques de 1000.</p>
      </CardHeader>
      <CardContent>
        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Afiliados', value: totals.affiliates },
              { label: 'Con referidos', value: totals.with_referrals },
              { label: 'Suscriptores activos', value: totals.active_subscribers },
              { label: 'Estimado/mes', value: `${totals.estimated_month_eur} €` },
            ].map(m => (
              <div key={m.label} className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {[['all', 'Todos'], ['with_referrals', 'Con referidos'], ['without_referrals', 'Sin referidos']].map(([v, l]) => (
            <button key={v} onClick={() => setSegment(v)}
              className={`px-3 py-1 rounded-full text-xs ${segment === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{l}</button>
          ))}
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="ml-auto h-7 rounded-md border border-input bg-background px-2 text-xs">
            <option value="active_desc">Ordenar: activos</option>
            <option value="blocks_desc">Ordenar: bloques</option>
            <option value="amount_desc">Ordenar: importe</option>
            <option value="registered_desc">Ordenar: registrados</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                {['Email', 'Estado', 'Registrados', 'Activos', 'Bloques', 'Lifetime', '€/mes', ''].map(h => (
                  <th key={h} className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Aún no hay afiliados.</td></tr>
              ) : rows.map(r => (
                <Fragment key={r.id}>
                  <tr className="border-t border-border hover:bg-muted/20">
                    <td className="px-2 py-2 font-mono text-xs">{r.email}</td>
                    <td className="px-2 py-2">{badge(r.status)}</td>
                    <td className="px-2 py-2 text-center text-xs">{r.registered}</td>
                    <td className="px-2 py-2 text-center text-xs font-medium">{r.active_paying}</td>
                    <td className="px-2 py-2 text-center text-xs">{r.blocks}</td>
                    <td className="px-2 py-2 text-center text-xs">{r.lifetime_active}</td>
                    <td className="px-2 py-2 text-center text-xs font-bold">{r.estimated_month_eur} €</td>
                    <td className="px-2 py-2 whitespace-nowrap text-right">
                      {r.status !== 'approved' && (
                        <button onClick={() => act(r.id, 'approve')} title="Aprobar" className="p-1 text-green-500 hover:bg-green-500/10 rounded"><Check className="w-4 h-4" /></button>
                      )}
                      {r.status === 'approved' && (
                        <button onClick={() => act(r.id, 'suspend')} title="Suspender" className="p-1 text-muted-foreground hover:bg-muted rounded"><ShieldOff className="w-4 h-4" /></button>
                      )}
                      {r.status === 'pending' && (
                        <button onClick={() => act(r.id, 'reject')} title="Rechazar" className="p-1 text-red-500 hover:bg-red-500/10 rounded"><X className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => toggle(r.id)} title="Ver referidos" className="p-1 text-primary hover:bg-primary/10 rounded">
                        {expanded === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="bg-muted/20">
                      <td colSpan={8} className="px-3 py-3">
                        {!detail ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Código <span className="font-mono">{detail.affiliate.code}</span> · Cobro: {detail.affiliate.payout_method || '—'} {detail.affiliate.payout_details ? `(${detail.affiliate.payout_details})` : ''}
                            </p>
                            {detail.referrals.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Sin referidos todavía.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead><tr className="text-left text-muted-foreground">
                                  <th className="py-1 pr-3">Email</th><th className="py-1 pr-3">Estado</th><th className="py-1 pr-3">Plan</th><th className="py-1">Desde</th>
                                </tr></thead>
                                <tbody>
                                  {detail.referrals.slice(0, 100).map((rr, i) => (
                                    <tr key={i} className="border-t border-border/40">
                                      <td className="py-1 pr-3 font-mono">{rr.email}</td>
                                      <td className="py-1 pr-3">{rr.status}</td>
                                      <td className="py-1 pr-3">{rr.plan || '—'}</td>
                                      <td className="py-1 text-muted-foreground">{(rr.since || '').slice(0, 10)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AFFILIATE PAYOUTS CARD — liquidación mensual manual (bloques + bonus lifetime)
═══════════════════════════════════════════════════════════════════════════ */
function AffiliatePayoutsCard({ headers }) {
  const nowPeriod = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(nowPeriod);
  const [run, setRun] = useState(null);
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);

  const bearer = headers?.Authorization || '';
  const ready = bearer && !bearer.includes('null');

  const loadRunDetail = async (rid) => {
    try {
      const res = await fetch(`${API}/admin/affiliates/payout-runs/${rid}`, { credentials: 'include', headers });
      if (res.ok) { const d = await res.json(); setRun(d.run); setLines(d.lines || []); }
    } catch { /* ignore */ }
  };

  const generate = async () => {
    if (!API || !ready) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/admin/affiliates/payout-run?period=${period}`, { credentials: 'include', method: 'POST', headers });
      if (res.ok) { const d = await res.json(); await loadRunDetail(d.run.id); toast.success('Liquidación generada'); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.detail || 'Error'); }
    } catch { toast.error('Error'); }
    finally { setBusy(false); }
  };

  const finalize = async () => {
    if (!run) return;
    try {
      const res = await fetch(`${API}/admin/affiliates/payout-run/${run.id}/finalize`, { credentials: 'include', method: 'POST', headers });
      if (res.ok) { toast.success('Finalizada'); loadRunDetail(run.id); } else { toast.error('Error'); }
    } catch { toast.error('Error'); }
  };

  const markPaid = async (lid) => {
    const ref = window.prompt('Referencia del pago (opcional):') || '';
    try {
      const res = await fetch(`${API}/admin/affiliates/payout-lines/${lid}/mark-paid`, { credentials: 'include',
        method: 'POST', headers, body: JSON.stringify({ payout_reference: ref }),
      });
      if (res.ok) { toast.success('Marcado como pagado'); loadRunDetail(run.id); } else { toast.error('Error'); }
    } catch { toast.error('Error'); }
  };

  const exportCsv = async () => {
    if (!run) return;
    try {
      const res = await fetch(`${API}/admin/affiliates/payout-runs/${run.id}/export.csv`, { credentials: 'include', headers });
      if (!res.ok) { toast.error('Error'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `afiliados_${run.period}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Error'); }
  };

  const payable = lines.filter(l => l.status !== 'zero');

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Liquidación de afiliados</CardTitle>
        <p className="text-[11px] text-muted-foreground">Genera el importe a pagar por mes. Los pagos los haces tú y los marcas aquí.</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="YYYY-MM" className="w-32 h-8 text-sm" />
          <Button size="sm" onClick={generate} disabled={busy}>{busy ? '…' : 'Generar liquidación'}</Button>
          {run && (
            <>
              <Badge className="bg-muted text-muted-foreground text-[10px]">{run.status}</Badge>
              <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1"><Download className="w-3.5 h-3.5" /> CSV</Button>
              {run.status === 'draft' && <Button size="sm" variant="outline" onClick={finalize}>Finalizar</Button>}
            </>
          )}
        </div>

        {run && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {[
                { label: 'A pagar', value: `${run.totals?.payable_eur ?? 0} €` },
                { label: 'Afiliados con pago', value: run.totals?.affiliates_paid ?? 0 },
                { label: 'Bloques', value: run.totals?.total_blocks ?? 0 },
                { label: 'Bonus lifetime', value: `${run.totals?.lifetime_bonus_total_eur ?? 0} €` },
              ].map(m => (
                <div key={m.label} className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40"><tr className="text-left">
                  {['Email', 'Activos', 'Bloques', 'Lifetime', 'Importe', 'Estado', ''].map(h => (
                    <th key={h} className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {payable.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Ningún afiliado alcanza un bloque este periodo.</td></tr>
                  ) : payable.map(l => (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-2 py-2 font-mono text-xs">{l.affiliate_email}</td>
                      <td className="px-2 py-2 text-center text-xs">{l.active_count}</td>
                      <td className="px-2 py-2 text-center text-xs">{l.blocks}</td>
                      <td className="px-2 py-2 text-center text-xs">{l.lifetime_new_count}</td>
                      <td className="px-2 py-2 text-center text-xs font-bold">{l.net_eur} €</td>
                      <td className="px-2 py-2 text-center">
                        <Badge className={`${l.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-600'} text-[10px]`}>{l.status}</Badge>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {l.status !== 'paid' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markPaid(l.id)}>Marcar pagado</Button>}
                        {l.status === 'paid' && l.payout_reference && <span className="text-[10px] text-muted-foreground">{l.payout_reference}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLANS EDITOR CARD
═══════════════════════════════════════════════════════════════════════════ */
function PlansEditorCard({ headers }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/plans`, { credentials: 'include', headers });
      if (res.ok) { const d = await res.json(); setPlans(d.plans || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (API) load(); else setLoading(false); }, []);

  const savePlan = async (planId) => {
    const edit = edits[planId];
    if (!edit) return;
    setSaving(planId);
    try {
      const res = await fetch(`${API}/admin/plans/${planId}`, { credentials: 'include', method: 'POST', headers, body: JSON.stringify(edit) });
      if (!res.ok) throw new Error();
      toast.success('Plan actualizado');
      setEdits(e => { const n = {...e}; delete n[planId]; return n; });
      load();
    } catch { toast.error('Error al guardar plan'); }
    finally { setSaving(null); }
  };

  const updateEdit = (planId, field, value) => setEdits(e => ({ ...e, [planId]: { ...(e[planId] || {}), [field]: value } }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Editor de Planes</CardTitle>
          <Button size="sm" variant="outline" onClick={load} className="h-7 gap-1"><RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Modifica precios y etiquetas sin necesidad de redeploy.</p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              {['Plan', 'Precio ($)', 'Días', 'Etiqueta', 'Stripe Price ID', ''].map(h => (
                <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
            ) : plans.map(p => {
              const edit = edits[p.id] || {};
              return (
                <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2"><Badge variant="outline" className="capitalize text-[10px]">{p.id}</Badge></td>
                  <td className="px-3 py-2">
                    <Input className="h-7 text-xs w-24" type="number" step="0.01"
                      value={edit.price ?? p.price} onChange={e => updateEdit(p.id, 'price', parseFloat(e.target.value))} />
                  </td>
                  <td className="px-3 py-2">
                    <Input className="h-7 text-xs w-20" type="number"
                      value={edit.days ?? p.days} onChange={e => updateEdit(p.id, 'days', parseInt(e.target.value))} />
                  </td>
                  <td className="px-3 py-2">
                    <Input className="h-7 text-xs w-32" value={edit.label ?? (p.label || p.id)}
                      onChange={e => updateEdit(p.id, 'label', e.target.value)} />
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{p.stripe_price_id || '—'}</td>
                  <td className="px-3 py-2">
                    {edits[p.id] && (
                      <Button size="sm" className="h-7 text-xs gap-1" disabled={saving === p.id} onClick={() => savePlan(p.id)}>
                        {saving === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-[10px] text-muted-foreground/60">⚠ Cambiar el Stripe Price ID requiere actualizar también en el dashboard de Stripe.</p>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   I18N MANAGER CARD
═══════════════════════════════════════════════════════════════════════════ */
function I18nManagerCard({ headers }) {
  const [keys, setKeys] = useState([]);
  const [filter, setFilter] = useState('');
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/i18n`, { credentials: 'include', headers });
      if (res.ok) { const d = await res.json(); setKeys(d.keys || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (API) load(); else setLoading(false); }, []);

  const saveKey = async (key) => {
    const edit = edits[key];
    if (!edit) return;
    setSaving(key);
    try {
      const res = await fetch(`${API}/admin/i18n`, { credentials: 'include', method: 'POST', headers, body: JSON.stringify({ key, ...edit }) });
      if (!res.ok) throw new Error();
      toast.success(`Clave "${key}" actualizada`);
      setEdits(e => { const n = {...e}; delete n[key]; return n; });
      load();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(null); }
  };

  const updateEdit = (key, lang, value) => setEdits(e => ({ ...e, [key]: { ...(e[key] || {}), [lang]: value } }));
  const filtered = keys.filter(k => !filter || k.key.includes(filter) || (k.es || '').includes(filter) || (k.en || '').includes(filter));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Languages className="w-4 h-4 text-primary" /> Gestor de Traducciones (i18n)</CardTitle>
          <Badge variant="outline" className="text-[10px]">{keys.length} claves sobreescritas</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">Edita textos de la app sin redeploy.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por clave o texto..." className="h-8" />
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr className="text-left">
                {['Clave', 'Español (ES)', 'Inglés (EN)', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">{filter ? 'Sin resultados' : 'No hay sobreescrituras activas'}</td></tr>
              ) : filtered.map(k => {
                const edit = edits[k.key] || {};
                return (
                  <tr key={k.key} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground align-top pt-3">{k.key}</td>
                    <td className="px-3 py-2"><Input className="h-7 text-xs" value={edit.es ?? (k.es || '')} onChange={e => updateEdit(k.key, 'es', e.target.value)} placeholder="Texto en español..." /></td>
                    <td className="px-3 py-2"><Input className="h-7 text-xs" value={edit.en ?? (k.en || '')} onChange={e => updateEdit(k.key, 'en', e.target.value)} placeholder="Text in English..." /></td>
                    <td className="px-3 py-2 align-top pt-2">
                      {edits[k.key] && (
                        <Button size="sm" className="h-7 text-xs" disabled={saving === k.key} onClick={() => saveKey(k.key)}>
                          {saving === k.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR MONITOR CARD
═══════════════════════════════════════════════════════════════════════════ */
function ErrorMonitorCard({ headers }) {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unresolved');
  const [resolving, setResolving] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [showNote, setShowNote] = useState(null);

  const load = async (f = filter) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/errors?status=${f}&limit=50`, { credentials: 'include', headers });
      if (res.ok) { const d = await res.json(); setErrors(d.errors || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (API) load(); else setLoading(false); }, []);

  const resolve = async (id) => {
    setResolving(id);
    try {
      const res = await fetch(`${API}/admin/errors/${id}/resolve`, { credentials: 'include',
        method: 'POST', headers, body: JSON.stringify({ note: resolveNote }),
      });
      if (!res.ok) throw new Error();
      toast.success('Error marcado como resuelto');
      setShowNote(null);
      setResolveNote('');
      load();
    } catch { toast.error('Error al resolver'); }
    finally { setResolving(null); }
  };

  const SEV_CLS = { 5: 'bg-red-500/15 text-red-500', 4: 'bg-orange-500/15 text-orange-500', 3: 'bg-yellow-500/15 text-yellow-600' };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Bug className="w-4 h-4 text-red-400" /> Monitor de Errores</CardTitle>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={v => { setFilter(v); load(v); }}>
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unresolved">Sin resolver</SelectItem>
                <SelectItem value="resolved">Resueltos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => load()} className="h-7 gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Errores recientes capturados por el backend.</p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              {['Código', 'Tipo', 'Mensaje', 'Endpoint', 'Fecha', 'Estado', ''].map(h => (
                <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
            ) : errors.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{filter === 'unresolved' ? '✓ Sin errores pendientes' : 'Sin errores registrados'}</td></tr>
            ) : errors.map(e => {
              const sev = Math.floor((e.status_code || 500) / 100);
              return (
                <tr key={e.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2"><Badge className={`text-[10px] ${SEV_CLS[sev] || 'bg-muted text-muted-foreground'}`}>{e.status_code}</Badge></td>
                  <td className="px-3 py-2 font-mono text-[10px]">{e.type || '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate" title={e.message}>{e.message}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{e.method} {e.endpoint}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{e.created_at?.slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-3 py-2">{e.resolved ? <Badge className="bg-green-500/10 text-green-500 text-[10px]">Resuelto</Badge> : <Badge className="bg-red-500/10 text-red-500 text-[10px]">Abierto</Badge>}</td>
                  <td className="px-3 py-2">
                    {!e.resolved && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNote(e)}>Resolver</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>

      <Dialog open={!!showNote} onOpenChange={() => setShowNote(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Resolver error</DialogTitle><DialogDescription className="font-mono text-xs">{showNote?.message}</DialogDescription></DialogHeader>
          <textarea className="w-full h-20 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none" value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="Descripción de la solución aplicada..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNote(null)}>Cancelar</Button>
            <Button onClick={() => resolve(showNote?.id)} disabled={!!resolving}>{resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Marcar resuelto'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RATE LIMITING DASHBOARD CARD
═══════════════════════════════════════════════════════════════════════════ */
function RateLimitingCard({ headers }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!API) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/admin/rate-limits`, { credentials: 'include', headers });
        if (res.ok) setData(await res.json());
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" /> Rate Limiting Dashboard</CardTitle>
        <p className="text-[11px] text-muted-foreground">Configuración de límites y violaciones recientes.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <div className="py-8 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div> : (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Límites configurados</p>
              <table className="w-full text-sm">
                <thead className="bg-muted/40"><tr className="text-left">
                  {['Endpoint / Grupo', 'Límite', 'Ventana'].map(h => <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>)}
                </tr></thead>
                <tbody>
                  {(data?.limits || []).map((l, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-xs">{l.endpoint}</td>
                      <td className="px-3 py-2 text-xs font-semibold">{l.limit}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{l.window}</td>
                    </tr>
                  ))}
                  {!data?.limits?.length && <tr><td colSpan={3} className="px-3 py-4 text-center text-xs text-muted-foreground">Sin límites configurados</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Violaciones recientes</p>
              <table className="w-full text-sm">
                <thead className="bg-muted/40"><tr className="text-left">
                  {['IP', 'Endpoint', 'Fecha'].map(h => <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>)}
                </tr></thead>
                <tbody>
                  {(data?.recent_violations || []).map((v, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-xs text-red-400">{v.ip}</td>
                      <td className="px-3 py-2 font-mono text-xs">{v.endpoint}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{v.created_at?.slice(0, 16).replace('T', ' ')}</td>
                    </tr>
                  ))}
                  {!data?.recent_violations?.length && <tr><td colSpan={3} className="px-3 py-4 text-center text-xs text-muted-foreground">Sin violaciones recientes</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GDPR EXPORT CARD
═══════════════════════════════════════════════════════════════════════════ */
function GDPRExportCard({ headers }) {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/gdpr-exports`, { credentials: 'include', headers });
      if (res.ok) { const d = await res.json(); setExports(d.exports || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (API) load(); else setLoading(false); }, []);

  const deliver = async (id) => {
    setDelivering(id);
    try {
      const res = await fetch(`${API}/admin/gdpr-exports/${id}/deliver`, { credentials: 'include', method: 'POST', headers });
      if (!res.ok) throw new Error();
      const d = await res.json();
      toast.success(d.sent_email ? 'Datos enviados por email' : 'Export procesado (sin SendGrid configurado)');
      load();
    } catch { toast.error('Error al entregar export'); }
    finally { setDelivering(null); }
  };

  const STATUS_CLS = { pending: 'bg-yellow-500/15 text-yellow-600', delivered: 'bg-green-500/15 text-green-500', failed: 'bg-red-500/15 text-red-500' };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Solicitudes GDPR (Export de datos)</CardTitle>
          <Button size="sm" variant="outline" onClick={load} className="h-7 gap-1"><RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Solicitudes de portabilidad de datos (RGPD/GDPR).</p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              {['Email', 'Estado', 'Solicitado', 'Entregado', ''].map(h => (
                <th key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
            ) : exports.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Sin solicitudes de export</td></tr>
            ) : exports.map(ex => (
              <tr key={ex.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{ex.email}</td>
                <td className="px-3 py-2"><Badge className={`text-[10px] ${STATUS_CLS[ex.status] || 'bg-muted text-muted-foreground'}`}>{ex.status}</Badge></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{ex.created_at?.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{ex.delivered_at?.slice(0, 16).replace('T', ' ') || '—'}</td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={delivering === ex.id} onClick={() => deliver(ex.id)}>
                    {delivering === ex.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Entregar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
