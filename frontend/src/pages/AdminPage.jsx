import { useEffect, useMemo, useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Crown, DollarSign, TrendingUp, Search, Download,
  Shield, ShieldOff, RefreshCw, Mail, Globe2, Calendar,
  Plug, Check, X, Plus, Pencil, Trash2, KeyRound, Save, Loader2,
  Eye, EyeOff, History, FileText, Tag, Activity, UserCheck,
  Zap, TrendingDown, Percent, AlertCircle, ChevronDown, ChevronUp,
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const IS_PREVIEW = !process.env.REACT_APP_BACKEND_URL;

const PLAN_OPTIONS = [
  { value: 'none',      label: 'Free' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual',    label: 'Annual' },
  { value: 'lifetime',  label: 'Lifetime' },
];

const PLAN_COLORS = { none: '#6b7280', free: '#6b7280', monthly: '#3b82f6', quarterly: '#8b5cf6', annual: '#10b981', lifetime: '#f59e0b' };

const MOCK_MRR_HISTORY = [
  { mes: 'Dic', mrr: 1200 }, { mes: 'Ene', mrr: 1450 },
  { mes: 'Feb', mrr: 1800 }, { mes: 'Mar', mrr: 2100 },
  { mes: 'Abr', mrr: 2400 }, { mes: 'May', mrr: 2850 },
];
const MOCK_PLAN_DIST = [
  { plan: 'Free', count: 145 }, { plan: 'Monthly', count: 42 },
  { plan: 'Quarterly', count: 28 }, { plan: 'Annual', count: 35 },
  { plan: 'Lifetime', count: 12 },
];
const MOCK_CALC_USAGE = [
  { name: 'Lot Size', usos: 4821 }, { name: 'Patrones', usos: 3654 },
  { name: 'Monte Carlo', usos: 2987 }, { name: 'Fibonacci', usos: 2341 },
  { name: 'Position Size', usos: 2156 }, { name: 'Leverage', usos: 1876 },
  { name: 'Opciones', usos: 1543 }, { name: 'Backtest', usos: 987 },
];
const MOCK_COUPONS = [
  { id: 'LAUNCH50', discount: 50, type: 'percent', uses: 23, max_uses: 100, expires: '2026-06-30', active: true },
  { id: 'WELCOME20', discount: 20, type: 'percent', uses: 87, max_uses: null, expires: null, active: true },
  { id: 'SUMMER25', discount: 25, type: 'percent', uses: 45, max_uses: 50, expires: '2026-08-31', active: false },
];
const MOCK_FEATURES = [
  { id: 'ai_coach',      label: 'AI Coach',              desc: 'Análisis de operaciones con IA',      plans: 'Annual / Lifetime', enabled: true },
  { id: 'backtest',      label: 'Backtest histórico',    desc: 'Datos reales yfinance',               plans: 'Premium+',          enabled: true },
  { id: 'ws_alerts',     label: 'Alertas tiempo real',   desc: 'WebSocket push notifications',        plans: 'All Premium',       enabled: true },
  { id: 'excel_export',  label: 'Export Excel',          desc: 'Performance en Excel',                plans: 'All',               enabled: false },
  { id: 'referrals',     label: 'Sistema Referidos',     desc: 'Wallet + leaderboard',                plans: 'All',               enabled: true },
  { id: 'options_suite', label: 'Suite Opciones',        desc: 'Black-Scholes, Kelly, Greeks',        plans: 'Premium+',          enabled: true },
];
const MOCK_WEBHOOKS = [
  { id: 'evt_1', type: 'payment_intent.succeeded',       amount: 1700,  customer: 'cus_QwEr', created: '2026-05-15T10:23:00Z', status: 'ok'    },
  { id: 'evt_2', type: 'customer.subscription.created',  amount: null,  customer: 'cus_AsDf', created: '2026-05-15T09:15:00Z', status: 'ok'    },
  { id: 'evt_3', type: 'invoice.payment_failed',         amount: 1700,  customer: 'cus_ZxCv', created: '2026-05-14T18:42:00Z', status: 'error' },
  { id: 'evt_4', type: 'customer.subscription.deleted',  amount: null,  customer: 'cus_BnMl', created: '2026-05-14T15:30:00Z', status: 'ok'    },
  { id: 'evt_5', type: 'payment_intent.succeeded',       amount: 4500,  customer: 'cus_PoIu', created: '2026-05-13T12:00:00Z', status: 'ok'    },
];

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

  useSEO({ title: 'Admin', description: 'Panel administrativo', canonicalPath: '/admin' });

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
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (plan !== 'all')     params.set('plan', plan);
    if (provider !== 'all') params.set('provider', provider);
    if (locale !== 'all')   params.set('locale', locale);
    params.set('limit', '500');

    try {
      const [mRes, uRes] = await Promise.all([
        fetch(`${API}/admin/metrics`, { headers }),
        fetch(`${API}/admin/users?${params.toString()}`, { headers }),
      ]);
      // Session expired → force re-login with a clear message
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
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error('[admin loadAll]', err);
      toast.error(err.message || 'Error loading admin data');
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

  const handleExportCsv = async () => {
    try {
      const res = await fetch(`${API}/admin/users.csv`, { headers });
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
    if (IS_PREVIEW) {
      toast.info(`[Preview] Entrando como ${u.name || u.email} — en producción abre una sesión temporal.`);
      return;
    }
    try {
      const res = await fetch(`${API}/admin/impersonate/${u.id}`, { method: 'POST', headers });
      if (!res.ok) throw new Error('impersonate failed');
      const data = await res.json();
      toast.success(`Sesión abierta como ${u.email}`);
      navigator.clipboard?.writeText(data.token).catch(() => {});
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
            <Link to="/dashboard"><Button>{t('volverAlDashboard_e3a957') || 'Volver'}</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20" data-testid="admin-page">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-unbounded text-3xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" /> {t('adminPanelTitle')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('adminPanelSubtitle')}</p>
          </div>
          <div className="flex gap-2">
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
                  const isDemo = u.email === 'demo@btccalc.pro';
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
                          {!isSelf && !isDemo && (
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
        <RevenueAnalyticsCard metrics={metrics} />

        {/* Plan Distribution */}
        <PlanDistributionCard metrics={metrics} />

        {/* Usage Analytics */}
        <UsageAnalyticsCard />

        {/* Coupon Manager */}
        <CouponManagerCard headers={headers} />

        {/* Feature Flags */}
        <FeatureFlagsCard headers={headers} />

        {/* Stripe Webhook Logs */}
        <WebhookLogsCard headers={headers} />
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
    id: 'others',
    title: 'Otras integraciones (Crypto, SEO, Email, Reviews)',
    description: '',
    fields: [
      { id: 'coinbase_api_key',       label: 'Coinbase Commerce API Key', secret: true,  placeholder: '0123abcd-…',  hint: 'commerce.coinbase.com → Settings → API Keys' },
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
      const res = await fetch(`${API}/admin/settings`, { headers });
      if (res.status === 401) {
        toast.error('Tu sesión ha caducado. Vuelve a iniciar sesión.', { duration: 6000 });
        try { useAuthStore.getState().logout(); } catch { /* ignore */ }
        // Navigate to /login (window.location to bypass router context)
        if (typeof window !== 'undefined') window.location.href = '/login';
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

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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
      const res = await fetch(`${API}/admin/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        toast.error('Tu sesión ha caducado. Vuelve a iniciar sesión.', { duration: 6000 });
        try { useAuthStore.getState().logout(); } catch { /* ignore */ }
        if (typeof window !== 'undefined') window.location.href = '/login';
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
      const res = await fetch(`${API}/admin/users`, {
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
      const res = await fetch(`${API}/admin/audit-log?${params.toString()}`, { headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRows(data.rows || []);
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
function RevenueAnalyticsCard({ metrics }) {
  const [history, setHistory] = useState(MOCK_MRR_HISTORY);
  const [stats, setStats] = useState({ churn: 3.2, conversion: 8.5, ltv: { monthly: 51, quarterly: 135, annual: 200, lifetime: 299 } });

  useEffect(() => {
    if (IS_PREVIEW) return;
    fetch(`${API}/admin/revenue`, { headers: {} }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.mrr_history) setHistory(d.mrr_history);
      if (d?.churn_rate !== undefined) setStats(s => ({ ...s, churn: d.churn_rate, conversion: d.conversion_rate }));
    }).catch(() => {});
  }, []);

  const currentMrr = history[history.length - 1]?.mrr || 0;
  const prevMrr = history[history.length - 2]?.mrr || 0;
  const growth = prevMrr ? (((currentMrr - prevMrr) / prevMrr) * 100).toFixed(1) : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Revenue Analytics
          {IS_PREVIEW && <Badge variant="outline" className="text-[10px] ml-auto">Demo data</Badge>}
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
            <p className="text-xl font-bold text-red-400">{stats.churn}%</p>
            <p className="text-xs text-muted-foreground">mensual</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Conversión Free→Premium</p>
            <p className="text-xl font-bold text-blue-400">{stats.conversion}%</p>
            <p className="text-xs text-muted-foreground">este mes</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">LTV Lifetime</p>
            <p className="text-xl font-bold text-amber-400">${stats.ltv.lifetime}</p>
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
  const rawDist = metrics?.by_plan
    ? Object.entries(metrics.by_plan).map(([plan, count]) => ({ plan: plan === 'null' || !plan ? 'Free' : plan.charAt(0).toUpperCase() + plan.slice(1), count }))
    : MOCK_PLAN_DIST;

  const total = rawDist.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="w-4 h-4 text-primary" /> Distribución de Planes
          {IS_PREVIEW && <Badge variant="outline" className="text-[10px] ml-auto">Demo data</Badge>}
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
function UsageAnalyticsCard() {
  const [data] = useState(MOCK_CALC_USAGE);
  const [activeUsers] = useState({ day: 124, week: 587, month: 2341 });

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Analytics de Uso
          {IS_PREVIEW && <Badge variant="outline" className="text-[10px] ml-auto">Demo data</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[['DAU', activeUsers.day], ['WAU', activeUsers.week], ['MAU', activeUsers.month]].map(([label, val]) => (
            <div key={label} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{val.toLocaleString()}</p>
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
 *  COUPON MANAGER
 * ============================================================ */
function CouponManagerCard({ headers }) {
  const [coupons, setCoupons] = useState(MOCK_COUPONS);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ id: '', discount: 20, type: 'percent', max_uses: '', expires: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (IS_PREVIEW) return;
    const res = await fetch(`${API}/admin/coupons`, { headers }).catch(() => null);
    if (res?.ok) setCoupons(await res.json());
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const create = async () => {
    if (!form.id) return toast.error('Introduce un código');
    if (IS_PREVIEW) {
      setCoupons(c => [...c, { ...form, uses: 0, active: true, max_uses: form.max_uses || null, expires: form.expires || null }]);
      setCreateOpen(false);
      toast.success(`Cupón ${form.id} creado (preview)`);
      return;
    }
    setBusy(true);
    const res = await fetch(`${API}/admin/coupons`, { method: 'POST', headers, body: JSON.stringify(form) }).catch(() => null);
    setBusy(false);
    if (res?.ok) { load(); setCreateOpen(false); toast.success('Cupón creado'); }
    else toast.error('Error creando cupón');
  };

  const toggle = async (coupon) => {
    if (IS_PREVIEW) {
      setCoupons(c => c.map(x => x.id === coupon.id ? { ...x, active: !x.active } : x));
      return;
    }
    await fetch(`${API}/admin/coupons/${coupon.id}/toggle`, { method: 'POST', headers }).catch(() => null);
    load();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Cupones y Descuentos
            {IS_PREVIEW && <Badge variant="outline" className="text-[10px]">Demo data</Badge>}
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
  const [flags, setFlags] = useState(MOCK_FEATURES);

  const load = async () => {
    if (IS_PREVIEW) return;
    const res = await fetch(`${API}/admin/feature-flags`, { headers }).catch(() => null);
    if (res?.ok) setFlags(await res.json());
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const toggle = async (flag) => {
    const updated = flags.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f);
    setFlags(updated);
    if (IS_PREVIEW) { toast.success(`${flag.label} ${!flag.enabled ? 'activado' : 'desactivado'} (preview)`); return; }
    await fetch(`${API}/admin/feature-flags/${flag.id}`, { method: 'PATCH', headers, body: JSON.stringify({ enabled: !flag.enabled }) }).catch(() => {});
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Feature Flags
          {IS_PREVIEW && <Badge variant="outline" className="text-[10px] ml-auto">Demo data</Badge>}
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
  const [logs, setLogs] = useState(MOCK_WEBHOOKS);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (IS_PREVIEW) return;
    setLoading(true);
    const res = await fetch(`${API}/admin/webhooks?limit=20`, { headers }).catch(() => null);
    setLoading(false);
    if (res?.ok) setLogs(await res.json());
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const retry = async (id) => {
    if (IS_PREVIEW) { toast.info(`[Preview] Reintentando webhook ${id}`); return; }
    await fetch(`${API}/admin/webhooks/${id}/retry`, { method: 'POST', headers }).catch(() => null);
    toast.success('Webhook reenviado');
    load();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" /> Stripe Webhook Logs
            {IS_PREVIEW && <Badge variant="outline" className="text-[10px]">Demo data</Badge>}
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
