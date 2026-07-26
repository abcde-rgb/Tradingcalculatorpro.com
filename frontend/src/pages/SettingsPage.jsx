import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import { User, Mail, Crown, Calendar, LogOut, Key, Bell, Trash2, AlertTriangle, Eye, EyeOff, Settings2, Download, Loader2 } from 'lucide-react';
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
import TwoFactorCard from '@/components/settings/TwoFactorCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PREFS_KEY = 'tcp-preferences';

export default function SettingsPage() {
  useSEO({ titleKey: 'seoSettingsTitle', descriptionKey: 'seoSettingsDesc', canonicalPath: '/settings', noindex: true });
  const { t, locale } = useTranslation();
  const deleteWord = t('deleteConfirmWord');
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
  const [resendingVerify, setResendingVerify] = useState(false);

  const emailUnverified = user?.auth_provider === 'password' && user?.email_verified === false;
  const handleResendVerification = async () => {
    setResendingVerify(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${BACKEND_URL}/api/auth/send-verification-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success(t('verifyEmailSentToast'));
    } catch {
      toast.error(t('verifyEmailSentError'));
    } finally {
      setResendingVerify(false);
    }
  };

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
    toast.success(t('preferencesSavedToast'));
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
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('fillAllFieldsToast'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('passwordTooShortToast'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsDontMatchToast'));
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

      toast.success(t('passwordChangedToast'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (!BACKEND_URL || err.message.includes('fetch')) {
        toast.error(t('serverConnectionErrorToast'));
      } else {
        toast.error(err.message || t('passwordChangeErrorToast'));
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== deleteWord) {
      toast.error(t('typeWordToConfirmToast', { word: deleteWord }));
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

      toast.success(t('accountDeletedToast'));
      logout();
      navigate('/');
    } catch (err) {
      setDeleteDialogOpen(false);
      if (!BACKEND_URL || err.message.includes('fetch') || err.name === 'TypeError') {
        toast.error(t('accountDeleteManualToast'), { duration: 10000 });
      } else {
        toast.error(err.message || t('accountDeleteErrorToast'));
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  const [downloadingData, setDownloadingData] = useState(false);
  const handleDownloadMyData = async () => {
    setDownloadingData(true);
    try {
      const token = useAuthStore.getState().token;
      // credentials:'include' is required for every backend call: the token
      // lives in memory only, so after a page reload it is null and the
      // httpOnly cookie is the ONLY thing that authenticates this request.
      // Without it the download failed with 401 on any reloaded session.
      const res = await fetch(`${BACKEND_URL}/api/auth/my-data`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mis-datos.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('downloadMyData'));
    } catch (err) {
      toast.error(err.message || t('downloadDataErrorToast'));
    } finally {
      setDownloadingData(false);
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

          {emailUnverified && (
            <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/25 px-4 py-3">
              <Mail className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t('verifyEmailBannerTitle')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('verifyEmailBannerDesc')}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleResendVerification} disabled={resendingVerify} className="shrink-0">
                {resendingVerify && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {t('verifyEmailResendBtn')}
              </Button>
            </div>
          )}

          {/* Profile Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('settingsProfileTitle')}
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
                {t('subscription')}
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
                    {t('settingsPlanLabel')} <span className="text-foreground capitalize">{user.subscription_plan}</span>
                  </p>
                  {user.subscription_plan !== 'lifetime' && user.subscription_end && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {t('settingsExpiresLabel')} {formatDate(user.subscription_end)}
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
                      <Crown className="w-4 h-4 mr-2" /> {t('viewPremiumPlans')}
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
                {t('changePasswordTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t('currentPasswordLabel')}</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t('currentPasswordPlaceholder')}
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
                  <Label htmlFor="new-password">{t('newPasswordLabel')}</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('newPasswordPlaceholder')}
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
                  <Label htmlFor="confirm-password">{t('confirmNewPasswordLabel')}</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmNewPasswordPlaceholder')}
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
                  {changingPassword ? t('changingPasswordBtn') : t('changePasswordTitle')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Two-factor authentication (password accounts only) */}
          {user?.auth_provider === 'password' && <TwoFactorCard />}

          {/* Preferences Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t('preferencesTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base">
                    {t('emailNotificationsLabel')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('emailNotificationsDesc')}
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
                    {t('compactModeLabel')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('compactModeDesc')}
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
              <CardTitle>{t('actionsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button
                  onClick={handleDownloadMyData}
                  disabled={downloadingData}
                  variant="outline"
                  className="w-full justify-start"
                >
                  {downloadingData
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Download className="w-4 h-4 mr-2" />}
                  {t('downloadMyData')}
                </Button>
                <p className="text-xs text-muted-foreground mt-1 ml-1">{t('downloadMyDataDesc')}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" /> {t('logout')}
              </Button>
            </CardContent>
          </Card>

          {/* Delete Account Card (RGPD) */}
          <Card className="bg-card border-red-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                {t('dangerZoneTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('deleteAccountWarning')}
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
                {t('deleteAccountBtn')}
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
              {t('confirmDeleteAccountTitle')}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-2">
              {(() => {
                const [before, after] = t('confirmDeleteAccountDesc').split('{confirmWord}');
                return (
                  <>
                    {before}
                    <span className="font-mono font-bold text-foreground">{deleteWord}</span>
                    {after}
                  </>
                );
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              {t('deleteAccountCancelsSubNote')}
            </p>
          </div>

          <div className="py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={t('typeWordPlaceholder', { word: deleteWord })}
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
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== deleteWord || deletingAccount}
              className="bg-red-700 hover:bg-red-600"
            >
              {deletingAccount ? t('deletingAccountBtn') : t('deleteAccountConfirmBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
