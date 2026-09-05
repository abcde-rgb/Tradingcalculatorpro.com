import { useState, useEffect, useCallback } from 'react';
import { Users, Copy, Check, Wallet, Share2, MessageCircle, Send, Mail, Clock, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/store';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;
const DEMO_TOKEN = 'demo-token';

/**
 * Lo que gana CUALQUIER cliente por traer clientes: el 10 % de lo que pague
 * cada uno, desde el primero.
 *
 * Por qué existe este componente
 * ------------------------------
 * `GET /api/referrals/me` estaba entero desde hacía meses —código, enlace,
 * comisión, lista de a quién ha traído, monedero— y **ninguna pantalla lo
 * llamaba**. El cliente acumulaba dinero sin forma de verlo ni de pedirlo, y
 * `RUTAS_MUERTAS.md` ya decía que su sitio natural era esta página.
 *
 * No se confunde con el PROGRAMA DE AFILIADOS, que vive arriba en la misma
 * página: aquél paga por bloques de 1000 suscriptores activos y hay que
 * solicitarlo y que lo aprueben. Éste paga desde el primer referido y lo tiene
 * todo el mundo. El backend ya evita el doble pago: si quien refiere es
 * afiliado aprobado, `credit_referrer_for_payment` no toca el monedero.
 *
 * Cobrar es PEDIRLO: no hay pagos automáticos. El admin paga por fuera y marca
 * la solicitud, y sólo entonces baja el saldo.
 */
export default function ReferralPanel() {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pidiendo, setPidiendo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    if (!API || !token || token === DEMO_TOKEN) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/referrals/me`, {
        credentials: 'include', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch { /* la tarjeta simplemente no se pinta */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const solicitar = async () => {
    setPidiendo(true);
    try {
      const res = await fetch(`${API}/referrals/request-payout`, {
        method: 'POST', credentials: 'include',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || t('refPayoutError'));
      toast.success(t('refPayoutSent'));
      await cargar();
    } catch (e) {
      toast.error(e.message || t('refPayoutError'));
    } finally { setPidiendo(false); }
  };

  if (loading || !data) return null;

  const enlace = `${window.location.origin}${data.share_link_path}`;
  const mensaje = `${t('refShareText', { pct: data.commission_pct })} ${enlace}`;
  const s = data.stats || {};
  const pago = data.payout || {};

  const copiar = () => {
    navigator.clipboard?.writeText(enlace);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
    toast.success(t('refCopied'));
  };

  return (
    <Card className="bg-card border-border" data-testid="referral-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="w-5 h-5 text-primary" />
          {t('refTitle', { pct: data.commission_pct })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('refIntro', { pct: data.commission_pct })}
        </p>

        {/* ── El enlace, que es lo único que el cliente tiene que hacer ── */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('refYourLink')}</p>
          <div className="flex gap-2">
            <Input readOnly value={enlace} data-testid="referral-link" className="font-mono text-sm" />
            <Button variant="outline" onClick={copiar} className="gap-2 shrink-0">
              {copiado ? <Check className="w-4 h-4 text-long" /> : <Copy className="w-4 h-4" />}
              {t('refCopy')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" asChild className="gap-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" /> WhatsApp</a>
            </Button>
            <Button size="sm" variant="outline" asChild className="gap-2">
              <a href={`https://t.me/share/url?url=${encodeURIComponent(enlace)}&text=${encodeURIComponent(t('refShareText', { pct: data.commission_pct }))}`} target="_blank" rel="noopener noreferrer">
                <Send className="w-4 h-4" /> Telegram</a>
            </Button>
            <Button size="sm" variant="outline" asChild className="gap-2">
              <a href={`mailto:?subject=${encodeURIComponent(t('refShareSubject'))}&body=${encodeURIComponent(mensaje)}`}>
                <Mail className="w-4 h-4" /> {t('refByEmail')}</a>
            </Button>
          </div>
        </div>

        {/* ── Las tres cifras que importan ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl font-bold leading-none">{s.total_signups ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('refStatSignups')}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl font-bold leading-none text-long">{s.total_paid ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('refStatPaid')}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl font-bold leading-none text-primary" data-testid="referral-balance">
              {(s.wallet_balance ?? 0).toFixed(2)} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('refStatBalance')}</p>
          </div>
        </div>

        {/* ── Cobrar: se PIDE, y lo paga una persona ── */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">{t('refPayoutTitle')}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('refPayoutHow', { min: pago.minimo_eur })}
          </p>
          {pago.solicitud_abierta ? (
            <div className="flex items-center gap-2 text-sm" data-testid="referral-payout-open">
              <Clock className="w-4 h-4 text-warn" />
              <span>{t('refPayoutPending', { amount: (pago.solicitud_abierta.amount_eur ?? 0).toFixed(2) })}</span>
            </div>
          ) : (
            <Button onClick={solicitar} disabled={!pago.puede_solicitar || pidiendo}
                    data-testid="referral-payout-btn">
              {pidiendo ? '…' : t('refPayoutAsk')}
            </Button>
          )}
        </div>

        {/* ── A quién ha traído: la lista, no un número suelto ── */}
        {(data.recent_referrals || []).length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('refListTitle')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="referral-list">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3 font-medium">{t('refColClient')}</th>
                    <th className="py-2 pr-3 font-medium">{t('refColStatus')}</th>
                    <th className="py-2 font-medium text-right">{t('refColEarned')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_referrals.map((r, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{r.referee_email}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={r.status === 'paid' ? 'default' : 'outline'} className="text-xs">
                          {r.status === 'paid' ? t('refRowPaid') : t('refRowPending')}
                        </Badge>
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {/* Un referido que aún no ha pagado NO ha generado nada:
                            va una raya, no un 0,00 € que parece un cobro. */}
                        {r.status === 'paid' ? `${(r.commission_amount ?? 0).toFixed(2)} €` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <Users className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t('refEmpty')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
