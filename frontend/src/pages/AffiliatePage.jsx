import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Gift, Link2, Copy, Check, TrendingUp, Wallet, Crown, Clock, Layers, Share2, MessageCircle, Send, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/useSEO';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/store';
import ReferralPanel from '@/components/affiliate/ReferralPanel';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;
const DEMO_TOKEN = 'demo-token';

const STATUS_KEY = {
  active: 'affStatusActive',
  lifetime: 'affStatusLifetime',
  registered: 'affStatusRegistered',
  trial: 'affStatusTrial',
  premium_other: 'affStatusPremiumOther',
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <span className={`inline-flex w-10 h-10 rounded-lg items-center justify-center ${accent || 'bg-primary/10'}`}>
            <Icon className="w-5 h-5 text-primary" />
          </span>
          <div>
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AffiliatePage() {
  useSEO({ title: 'Programa de afiliados', noindex: true, canonicalPath: '/affiliate' });
  const { t } = useTranslation();
  const { token, isAuthenticated } = useAuthStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accept, setAccept] = useState(false);
  const [method, setMethod] = useState('bank');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const authedFetch = useCallback(async (path, options = {}) => {
    if (!API || token === DEMO_TOKEN) return null;
    let currentToken = token;
    if (!currentToken && isAuthenticated) {
      currentToken = await useAuthStore.getState().silentRefresh();
    }
    if (!currentToken) return null;
    const headers = {
      Authorization: `Bearer ${currentToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    return fetch(`${API}${path}`, { credentials: 'include', ...options, headers });
  }, [token, isAuthenticated]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch('/affiliate/me');
      if (res && res.ok) setData(await res.json());
    } catch (_) { /* ignore */ }
    setLoading(false);
  }, [authedFetch]);

  useEffect(() => { load(); }, [load]);

  async function handleApply() {
    if (!accept) { toast.error(t('affMustAccept')); return; }
    setSubmitting(true);
    try {
      const res = await authedFetch('/affiliate/apply', {
        method: 'POST',
        body: JSON.stringify({ accept_terms: true, payout_method: method, payout_details: details || null }),
      });
      if (res && res.ok) {
        toast.success(t('affApplySent'));
        await load();
      } else {
        toast.error(t('affApplyError'));
      }
    } catch (_) { toast.error(t('affApplyError')); }
    setSubmitting(false);
  }

  async function saveDetails() {
    setSubmitting(true);
    try {
      const res = await authedFetch('/affiliate/payout-details', {
        method: 'PUT',
        body: JSON.stringify({ payout_method: method, payout_details: details }),
      });
      if (res && res.ok) toast.success(t('affSaved'));
    } catch (_) { /* ignore */ }
    setSubmitting(false);
  }

  async function requestPayout() {
    setSubmitting(true);
    try {
      const res = await authedFetch('/affiliate/request-payout', { method: 'POST' });
      if (res && res.ok) { toast.success(t('affRequestSent')); await load(); }
      else {
        const e = res ? await res.json().catch(() => ({})) : {};
        toast.error(e.detail || t('affNoBalance'));
      }
    } catch (_) { toast.error(t('affNoBalance')); }
    setSubmitting(false);
  }

  const shareLink = data?.code
    ? `${window.location.origin}${process.env.PUBLIC_URL || ''}/?ref=${data.code}`
    : '';
  const shareMsg = `${t('affShareText')} ${shareLink}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMsg)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(t('affShareText'))}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(t('affShareEmailSubject'))}&body=${encodeURIComponent(shareMsg)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMsg)}`;

  function copyText(text, setter) {
    navigator.clipboard?.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 1800);
    }).catch(() => {});
  }
  function nativeShare() {
    navigator.share?.({ title: 'TradingCalculator.Pro', text: t('affShareText'), url: shareLink }).catch(() => {});
  }

  const cfg = data?.config || {};
  const size = cfg.block_size || 1000;
  const reward = cfg.block_reward_eur || 1000;
  const bonus = cfg.lifetime_bonus_eur || 50;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-12 px-4 text-center border-b border-border">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <Users className="w-7 h-7 text-primary" />
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{t('affTitle')}</h1>
            <p className="text-muted-foreground text-lg">{t('affIntro')}</p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
          {/* Lo que tiene TODO cliente, sin solicitar nada ni esperar
              aprobación. Va primero a propósito: el programa de afiliados de
              abajo exige plan de pago y aprobación manual, así que para la
              mayoría de quien entra aquí esto es lo único accionable. */}
          <ReferralPanel />

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* ── How it works (always visible) ── */}
          {!loading && (
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-lg">{t('affHowTitle')}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="flex gap-2"><Layers className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t('affRuleBlocks', { reward, size })}</p>
                <p className="flex gap-2"><Gift className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t('affRuleLifetime', { bonus })}</p>
                <p className="flex gap-2"><TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t('affRuleFree')}</p>
              </CardContent>
            </Card>
          )}

          {/* ── Not paying → must be a paying subscriber (not during trial) ── */}
          {!loading && data && !data.is_affiliate && !data.eligible && (
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2">
                <Crown className="w-5 h-5 text-caution" /> {t('affNeedPaidTitle')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('affNeedPaid')}</p>
                <Button asChild><Link to="/pricing">{t('affGoPremium')}</Link></Button>
              </CardContent>
            </Card>
          )}

          {/* ── Paying but not an affiliate yet → apply ── */}
          {!loading && data && !data.is_affiliate && data.eligible && (
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-lg">{t('affJoinCta')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('affMethodOptional')}</Label>
                  <div className="flex gap-2">
                    <select value={method} onChange={(e) => setMethod(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="bank">{t('affMethodBank')}</option>
                      <option value="paypal">PayPal</option>
                    </select>
                    <Input placeholder={t('affDetailsPlaceholder')} value={details}
                      onChange={(e) => setDetails(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)}
                    className="mt-1" data-testid="affiliate-accept" />
                  <span>{t('affAcceptTerms')}</span>
                </label>
                <Button onClick={handleApply} disabled={submitting || !accept} data-testid="affiliate-apply-btn">
                  {submitting ? '…' : t('affJoinCta')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Affiliate but not approved ── */}
          {!loading && data && data.is_affiliate && data.status !== 'approved' && (
            <Card className="bg-card border-border">
              <CardContent className="py-6 flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <p className="text-sm">
                  {data.status === 'pending' && t('affStatePending')}
                  {data.status === 'rejected' && t('affStateRejected')}
                  {data.status === 'suspended' && t('affStateSuspended')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Approved dashboard ── */}
          {!loading && data && data.is_affiliate && data.status === 'approved' && (
            <>
              {/* Share: code + link + quick share buttons */}
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary" /> {t('affYourLink')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Código */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-muted-foreground">{t('affYourCode')}:</span>
                    <code className="text-lg font-bold tracking-widest bg-muted px-3 py-1 rounded" data-testid="affiliate-code">{data.code}</code>
                    <Button size="sm" variant="ghost" onClick={() => copyText(data.code, setCodeCopied)} className="gap-1">
                      {codeCopied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  {/* Enlace */}
                  <div className="flex gap-2">
                    <Input readOnly value={shareLink} data-testid="affiliate-link" className="font-mono text-sm" />
                    <Button variant="outline" onClick={() => copyText(shareLink, setCopied)} className="gap-2 shrink-0">
                      {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      {copied ? t('affLinkCopied') : t('affCopyLink')}
                    </Button>
                  </div>
                  {/* Compartir rápido */}
                  <div className="flex flex-wrap gap-2">
                    <a href={waUrl} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="gap-2"><MessageCircle className="w-4 h-4 text-long" /> WhatsApp</Button></a>
                    <a href={tgUrl} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="gap-2"><Send className="w-4 h-4 text-info" /> Telegram</Button></a>
                    <a href={mailUrl}><Button variant="outline" size="sm" className="gap-2"><Mail className="w-4 h-4" /> Email</Button></a>
                    <a href={xUrl} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="gap-2"><span className="font-bold text-sm leading-none">𝕏</span></Button></a>
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <Button variant="outline" size="sm" className="gap-2" onClick={nativeShare}><Share2 className="w-4 h-4" /> {t('affShareNative')}</Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('affShareHelp')}</p>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard icon={Users} label={t('affStatRegistered')} value={data.stats.registered} />
                <StatCard icon={TrendingUp} label={t('affStatActive')} value={data.stats.active_paying} />
                <StatCard icon={Layers} label={t('affStatBlocks', { size })} value={data.stats.blocks} />
                <StatCard icon={Crown} label={t('affStatLifetime')} value={data.stats.lifetime_active} />
                <StatCard icon={Wallet} label={t('affStatEstimated')} value={`${data.stats.estimated_month_eur} €`} accent="bg-primary/15" />
                <StatCard icon={Gift} label={t('affStatTotalPaid')} value={`${data.stats.total_paid_eur} €`} />
              </div>

              {/* Request payout */}
              <Card className="bg-card border-border">
                <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div>
                    <p className="font-semibold">{t('affStatEstimated')}: <span className="text-primary">{data.stats.estimated_month_eur} €</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('affRequestHint')}</p>
                  </div>
                  {data.open_request ? (
                    <Badge className="bg-yellow-500/10 text-caution gap-1 py-1.5 px-3">
                      <Clock className="w-3.5 h-3.5" /> {t('affRequestPending')} · {data.open_request.amount_eur} €
                    </Badge>
                  ) : (
                    <Button onClick={requestPayout} disabled={submitting || data.stats.estimated_month_eur <= 0}
                      data-testid="affiliate-request-payout" className="gap-2 shrink-0">
                      <Wallet className="w-4 h-4" /> {t('affRequestPayout')}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Referrals */}
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-lg">{t('affReferralsTitle')}</CardTitle></CardHeader>
                <CardContent>
                  {(!data.referrals || data.referrals.length === 0) ? (
                    <p className="text-sm text-muted-foreground">{t('affNoReferrals')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="py-2 pr-3">Email</th>
                            <th className="py-2 pr-3">{t('affColStatus')}</th>
                            <th className="py-2 pr-3">{t('affColPlan')}</th>
                            <th className="py-2">{t('affColSince')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.referrals.map((r, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2 pr-3 font-mono text-xs">{r.masked_email}</td>
                              <td className="py-2 pr-3">{t(STATUS_KEY[r.status] || 'affStatusRegistered')}</td>
                              <td className="py-2 pr-3">{r.plan || '—'}</td>
                              <td className="py-2 text-xs text-muted-foreground">{(r.since || '').slice(0, 10)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payout history */}
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-lg">{t('affPayoutsTitle')}</CardTitle></CardHeader>
                <CardContent>
                  {(!data.payouts || data.payouts.length === 0) ? (
                    <p className="text-sm text-muted-foreground">{t('affNoPayouts')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="py-2 pr-3">{t('affColPeriod')}</th>
                            <th className="py-2 pr-3">{t('affColAmount')}</th>
                            <th className="py-2">{t('affColRef')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.payouts.map((p, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2 pr-3">{p.period}</td>
                              <td className="py-2 pr-3 font-medium">{p.net_eur} €</td>
                              <td className="py-2 text-xs text-muted-foreground">{p.payout_reference || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payout details */}
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-lg">{t('affPayoutDetailsTitle')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <select value={method} onChange={(e) => setMethod(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="bank">{t('affMethodBank')}</option>
                      <option value="paypal">PayPal</option>
                    </select>
                    <Input placeholder={t('affDetailsPlaceholder')} value={details}
                      onChange={(e) => setDetails(e.target.value)} className="flex-1" />
                    <Button onClick={saveDetails} disabled={submitting} className="shrink-0">{t('affSave')}</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('affPrivacyNote')}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
