import { useState, useEffect } from 'react';
import { Gift, Copy, Share2, Users, DollarSign, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

const IS_PREVIEW = !process.env.REACT_APP_BACKEND_URL;

const MOCK_REFERRAL_CODE = 'V3HJ0QW4';

const MOCK_STATS = {
  total_referidos: 12,
  pagos_confirmados: 8,
  ganancias_totales: 96,
  saldo_disponible: 24,
};

const MOCK_REFERRALS = [
  { id: 1, email: 'use***@gmail.com', fecha: '2024-12-01', estado: 'confirmado', comision: 12 },
  { id: 2, email: 'tra***@hotmail.com', fecha: '2024-12-05', estado: 'confirmado', comision: 12 },
  { id: 3, email: 'joh***@yahoo.com', fecha: '2024-12-10', estado: 'confirmado', comision: 12 },
  { id: 4, email: 'mar***@gmail.com', fecha: '2024-12-14', estado: 'confirmado', comision: 12 },
  { id: 5, email: 'car***@outlook.com', fecha: '2024-12-18', estado: 'confirmado', comision: 12 },
  { id: 6, email: 'and***@gmail.com', fecha: '2024-12-22', estado: 'confirmado', comision: 12 },
  { id: 7, email: 'luc***@proton.me', fecha: '2024-12-28', estado: 'confirmado', comision: 12 },
  { id: 8, email: 'ana***@gmail.com', fecha: '2025-01-03', estado: 'confirmado', comision: 12 },
  { id: 9, email: 'rod***@icloud.com', fecha: '2025-01-07', estado: 'pendiente', comision: 12 },
  { id: 10, email: 'pau***@gmail.com', fecha: '2025-01-10', estado: 'pendiente', comision: 12 },
  { id: 11, email: 'fer***@yahoo.com', fecha: '2025-01-14', estado: 'pendiente', comision: 12 },
  { id: 12, email: 'sof***@gmail.com', fecha: '2025-01-18', estado: 'pendiente', comision: 12 },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Share2,
    title: 'Comparte tu código',
    description: 'Comparte tu código único de referido con amigos, seguidores o en redes sociales.',
  },
  {
    step: 2,
    icon: Users,
    title: 'Tu referido se registra y suscribe',
    description: 'Cuando alguien usa tu código y se suscribe a Trading Calculator PRO, queda vinculado a ti.',
  },
  {
    step: 3,
    icon: DollarSign,
    title: 'Ganas comisión',
    description: 'Recibes una comisión por cada pago confirmado de tus referidos. ¡Acumula y retira cuando quieras!',
  },
];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ReferralsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_PREVIEW) {
      setReferralCode(MOCK_REFERRAL_CODE);
      setStats(MOCK_STATS);
      setReferrals(MOCK_REFERRALS);
      setLoading(false);
      return;
    }

    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    const token = user?.token || localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    Promise.all([
      fetch(`${backendUrl}/api/referrals/code`, { headers }).then(r => r.json()),
      fetch(`${backendUrl}/api/referrals/stats`, { headers }).then(r => r.json()),
      fetch(`${backendUrl}/api/referrals`, { headers }).then(r => r.json()),
    ])
      .then(([codeData, statsData, referralsData]) => {
        setReferralCode(codeData.code || '');
        setStats(statsData);
        setReferrals(referralsData.referrals || referralsData || []);
      })
      .catch(() => {
        toast.error('Error al cargar los datos de referidos.');
      })
      .finally(() => setLoading(false));
  }, [user]);

  const shareUrl = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      toast.success('Código copiado al portapapeles');
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Enlace de referido copiado');
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Trading Calculator PRO',
        text: `Únete con mi código de referido: ${referralCode}`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleRedeem = () => {
    if (IS_PREVIEW) {
      toast.info('Demo: En producción aquí podrás retirar tu saldo disponible.');
      return;
    }
    toast.info('Funcionalidad de retiro próximamente disponible.');
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <h1 className="font-unbounded text-2xl font-bold">Programa de Referidos</h1>
              </div>
              <p className="text-zinc-400 text-sm max-w-lg">
                Invita a otros traders y gana comisión por cada suscripción confirmada. Comparte tu código único y empieza a generar ingresos pasivos.
              </p>
            </div>
            {IS_PREVIEW && (
              <Badge variant="outline" className="border-yellow-500/40 text-yellow-400 bg-yellow-500/10 text-xs px-3 py-1 self-start">
                Demo data
              </Badge>
            )}
          </div>

          {/* Referral Code Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="w-4 h-4 text-primary" />
                Tu código de referido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-4 py-3">
                    <span className="font-mono text-xl font-bold tracking-widest text-primary flex-1">
                      {loading ? '········' : referralCode}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopy}
                      disabled={loading}
                      className="text-zinc-400 hover:text-primary"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  disabled={loading}
                  className="border-border text-zinc-300 hover:text-primary hover:border-primary/50 gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </Button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Enlace de referido</p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={loading ? '' : shareUrl}
                    className="bg-background border-border text-zinc-400 text-xs font-mono"
                    onClick={e => e.target.select()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    disabled={loading}
                    className="border-border text-zinc-400 hover:text-primary shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-500">Total referidos</p>
                  <Users className="w-4 h-4 text-zinc-500" />
                </div>
                <p className="text-2xl font-bold font-unbounded">
                  {loading ? '—' : stats?.total_referidos ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-500">Pagos confirmados</p>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold font-unbounded">
                  {loading ? '—' : stats?.pagos_confirmados ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-500">Ganancias totales</p>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold font-unbounded text-primary">
                  {loading ? '—' : `$${stats?.ganancias_totales ?? 0}`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-500">Saldo disponible</p>
                  <DollarSign className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold font-unbounded text-yellow-400">
                  {loading ? '—' : `$${stats?.saldo_disponible ?? 0}`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How it works */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Cómo funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {HOW_IT_WORKS.map(({ step, icon: Icon, title, description }) => (
                  <div key={step} className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-primary text-xs font-bold">{step}</span>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-zinc-400" />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1">{title}</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Referrals Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Referidos recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-6 py-10 text-center text-zinc-500 text-sm">Cargando...</div>
              ) : referrals.length === 0 ? (
                <div className="px-6 py-10 text-center text-zinc-500 text-sm">
                  Aún no tienes referidos. ¡Comparte tu código para empezar!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Email</th>
                        <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Fecha</th>
                        <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Estado</th>
                        <th className="text-right px-6 py-3 text-xs text-zinc-500 font-medium">Comisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((ref, idx) => (
                        <tr
                          key={ref.id ?? idx}
                          className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-3 font-mono text-zinc-300">{ref.email}</td>
                          <td className="px-6 py-3 text-zinc-400">{formatDate(ref.fecha)}</td>
                          <td className="px-6 py-3">
                            {ref.estado === 'confirmado' ? (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 gap-1 text-xs">
                                <CheckCircle className="w-3 h-3" />
                                Confirmado
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 gap-1 text-xs">
                                <Clock className="w-3 h-3" />
                                Pendiente
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right font-semibold text-primary">
                            ${ref.comision}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Redeem Button */}
          <div className="flex items-center justify-between gap-4 p-5 rounded-xl bg-card border border-border">
            <div>
              <p className="font-semibold">Retirar saldo disponible</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Saldo acumulado listo para retirar:{' '}
                <span className="text-yellow-400 font-semibold">
                  ${loading ? '...' : stats?.saldo_disponible ?? 0}
                </span>
              </p>
            </div>
            <Button
              onClick={handleRedeem}
              disabled={loading || (!IS_PREVIEW && (stats?.saldo_disponible ?? 0) <= 0)}
              className="bg-primary hover:bg-primary/90 text-black font-semibold gap-2 shrink-0"
            >
              <DollarSign className="w-4 h-4" />
              Retirar saldo
            </Button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
