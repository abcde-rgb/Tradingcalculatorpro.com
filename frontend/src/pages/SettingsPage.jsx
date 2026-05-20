import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import { User, Mail, Crown, Calendar, LogOut, Key, Bell, Trash2, AlertTriangle, Eye, EyeOff, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/lib/store';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PREFS_KEY = 'tcp-preferences';

export default function SettingsPage() {
  useSEO({ titleKey: 'seoSettingsTitle', descriptionKey: 'seoSettingsDesc', canonicalPath: '/settings' });
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // ── Change Password ──────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // ── Preferences ──────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState({ emailNotifications: true, compactMode: false });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch (_) {}
  }, []);

  const updatePref = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    toast.success('Preferencias guardadas');
  };

  // ── Delete Account ───────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    toast.success(t('sesionCerrada_f86688'));
    navigate('/');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }

    setChangingPassword(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.message || `Error ${res.status}`);
      }

      toast.success('Contraseña cambiada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (!BACKEND_URL || err.message.includes('fetch')) {
        toast.error('No se pudo conectar con el servidor. Inténtalo más tarde.');
      } else {
        toast.error(err.message || 'No se pudo cambiar la contraseña');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para confirmar');
      return;
    }

    setDeletingAccount(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${BACKEND_URL}/api/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.message || `Error ${res.status}`);
      }

      toast.success('Cuenta eliminada. Hasta pronto.');
      logout();
      navigate('/');
    } catch (err) {
      setDeleteDialogOpen(false);
      if (!BACKEND_URL || err.message.includes('fetch') || err.name === 'TypeError') {
        toast.error(
          'No se pudo eliminar la cuenta automáticamente. Envía un email a contact@tradingcalculator.pro con asunto "Solicitud de eliminación de cuenta" desde tu email registrado.',
          { duration: 10000 }
        );
      } else {
        toast.error(err.message || 'No se pudo eliminar la cuenta. Contacta con soporte.');
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="font-unbounded text-2xl font-bold">{t('configuracion_1a0150')}</h1>

          {/* Profile Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{user.name}</p>
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" /> {user.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Suscripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.is_premium ? (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-yellow-500">{t('premiumActivo_433549')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Plan: <span className="text-foreground capitalize">{user.subscription_plan}</span>
                  </p>
                  {user.subscription_plan !== 'lifetime' && user.subscription_end && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Expira: {formatDate(user.subscription_end)}
                    </p>
                  )}
                  <Link to="/subscription">
                    <Button variant="outline" size="sm" className="mt-1">
                      <Settings2 className="w-4 h-4 mr-2" />
                      {t('manageSubscriptionBtn')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                  <p className="text-sm text-muted-foreground">{t('noTienesUnaSuscripcionActiva_84a892')}</p>
                  <Link to="/pricing">
                    <Button className="bg-yellow-500 text-black hover:bg-yellow-400">
                      <Crown className="w-4 h-4 mr-2" /> Ver Planes Premium
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Cambiar contraseña
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Tu contraseña actual"
                      className="pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={changingPassword} className="w-full sm:w-auto">
                  {changingPassword ? 'Guardando...' : 'Cambiar contraseña'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preferences Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Preferencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base">
                    Notificaciones por email
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe actualizaciones y novedades en tu bandeja de entrada
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={prefs.emailNotifications}
                  onCheckedChange={(v) => updatePref('emailNotifications', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-mode" className="text-base">
                    Modo compacto
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Reduce el espaciado para ver más información en pantalla
                  </p>
                </div>
                <Switch
                  id="compact-mode"
                  checked={prefs.compactMode}
                  onCheckedChange={(v) => updatePref('compactMode', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
              </Button>
            </CardContent>
          </Card>

          {/* Delete Account Card (RGPD) */}
          <Card className="bg-card border-red-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Zona de peligro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Eliminar tu cuenta es una acción permanente e irreversible. Todos tus datos, cálculos
                y suscripciones serán eliminados conforme al RGPD.
              </p>
              <Button
                variant="outline"
                className="border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300 w-full sm:w-auto"
                onClick={() => {
                  setDeleteConfirmText('');
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar mi cuenta permanentemente
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0f0f0f] border-red-900/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Confirmar eliminacion de cuenta
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-2">
              Esta acción es <span className="font-semibold text-foreground">permanente e irreversible</span>.
              Todos tus datos serán eliminados. Escribe{' '}
              <span className="font-mono font-bold text-foreground">ELIMINAR</span> para confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Escribe ELIMINAR"
              className="font-mono border-red-900/40 focus-visible:ring-red-800"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingAccount}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'ELIMINAR' || deletingAccount}
              className="bg-red-700 hover:bg-red-600"
            >
              {deletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
