import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation, languages } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import {
  User, Mail, Crown, Calendar, LogOut, Key, Bell, Trash2, AlertTriangle, Eye, EyeOff,
  Settings2, Download, Shield, LayoutGrid, SlidersHorizontal, Check, Sun, Moon, Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/lib/store';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import TwoFactorCard from '@/components/settings/TwoFactorCard';
import PasskeysCard from '@/components/settings/PasskeysCard';
import { useCloudPref } from '@/lib/cloudPrefs';
import { CargaVelas } from '@/components/common/BrandLoading';
import { useThemeStore, PREMIUM_THEMES } from '@/lib/theme';
import { riskBudget, RISK_HARD_CAP_PCT, RISK_ADVISED_PCT } from '@/lib/deskMath';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Las seis secciones del panel, en el orden del rail.
//
// El `id` es también el valor de `?s=` en la URL: una sección de Ajustes se
// puede enlazar desde un correo de soporte o desde el propio producto, que es
// justo lo que un panel superpuesto no permite. Cambiar un id rompe esos
// enlaces, así que no se tocan a la ligera.
const SECCIONES = [
  { id: 'perfil',       icon: User,              tituloKey: 'settingsProfileTitle', leadKey: 'settingsLeadProfile' },
  { id: 'seguridad',    icon: Shield,            tituloKey: 'settingsNavSecurity',  leadKey: 'settingsLeadSecurity' },
  { id: 'suscripcion',  icon: Crown,             tituloKey: 'subscription',         leadKey: 'settingsLeadSubscription' },
  { id: 'mesa',         icon: LayoutGrid,        tituloKey: 'settingsNavDesk',      leadKey: 'settingsLeadDesk' },
  { id: 'preferencias', icon: SlidersHorizontal, tituloKey: 'preferencesTitle',     leadKey: 'settingsLeadPreferences' },
  { id: 'datos',        icon: Download,          tituloKey: 'settingsNavData',      leadKey: 'settingsLeadData' },
];
const IDS = SECCIONES.map((s) => s.id);

const TEMAS_BASE = [
  { id: 'light',  icon: Sun,   labelKey: 'lightMode' },
  { id: 'dark',   icon: Moon,  labelKey: 'darkMode' },
  { id: 'system', icon: Globe, labelKey: 'systemMode' },
];

export default function SettingsPage() {
  useSEO({ titleKey: 'seoSettingsTitle', descriptionKey: 'seoSettingsDesc', canonicalPath: '/settings', noindex: true });
  const { t, locale, setLocale } = useTranslation();
  const deleteWord = t('deleteConfirmWord');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  // Admins are redirected here by ProtectedRoute when they lack 2FA — say why,
  // otherwise landing on Settings out of nowhere looks like a bug.
  const need2fa = location.state?.need2fa === true;

  // ── Sección activa ───────────────────────────────────────────────────────
  // Manda la URL (`?s=seguridad`), y si no dice nada manda el motivo por el que
  // se ha llegado: a quien le exigen el 2FA se le abre Seguridad, no Perfil.
  // Antes esto no hacía falta porque todo estaba en la misma columna; ahora sí,
  // y sin ello el administrador redirigido aquí volvería a quedarse sin salida
  // (BUG-076, otra vez, por la puerta del rediseño).
  const seccionUrl = new URLSearchParams(location.search).get('s');
  const [seccion, setSeccion] = useState(() => {
    if (IDS.includes(seccionUrl)) return seccionUrl;
    return need2fa ? 'seguridad' : 'perfil';
  });
  useEffect(() => {
    if (IDS.includes(seccionUrl) && seccionUrl !== seccion) setSeccion(seccionUrl);
    // `seccion` fuera de deps a propósito: esto sincroniza URL → estado (atrás
    // y adelante del navegador). El sentido contrario lo hace `irA`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionUrl]);

  const irA = useCallback((id) => {
    setSeccion(id);
    navigate(`/settings?s=${id}`, { replace: true, state: location.state });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate, location.state]);

  // ── Perfil (rectificación, art. 16 RGPD) ─────────────────────────────────
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePicture, setProfilePicture] = useState(user?.picture || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // El formulario se resincroniza cuando cambia `user`, y hace falta.
  //
  // `useState(user?.name)` sólo corre en el PRIMER render. Al recargar, el
  // token no se persiste: `SessionBoot` dispara `silentRefresh()` y el `user`
  // llega DESPUÉS de montar esta pantalla, así que los campos se quedaban con
  // lo que hubiera —o vacíos— y el usuario veía sus datos «saltar» a lo
  // anterior. Lo mismo tras guardar, porque `handleSaveProfile` llama a
  // `refreshUser()` y reemplaza el objeto entero.
  //
  // Sólo se pisa lo que el usuario NO está editando: si el campo difiere de lo
  // que había en `user`, es que lo ha tocado, y una respuesta que llega tarde
  // no puede borrarle lo que está escribiendo.
  const nombreServidor = user?.name || '';
  const fotoServidor = user?.picture || '';
  useEffect(() => { setProfileName(nombreServidor); }, [nombreServidor]);
  useEffect(() => { setProfilePicture(fotoServidor); }, [fotoServidor]);
  const profileDirty =
    profileName !== (user?.name || '') || profilePicture !== (user?.picture || '');

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileName.trim(),
          picture: profilePicture.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.message || `Error ${res.status}`);
      }
      await useAuthStore.getState().refreshUser();
      toast.success(t('settingsProfileSavedToast'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

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
  // Guardadas en la cuenta, no en el navegador: el aviso «preferencias
  // guardadas» se enseñaba desde el principio, pero hasta ahora no salían de
  // este equipo. `useCloudPref` escribe local y sube (ver `lib/cloudPrefs.js`).
  const [prefs, setPrefs] = useCloudPref('settingsPrefs');

  const updatePref = (key, value) => {
    setPrefs((current) => ({ ...current, [key]: value }));
    toast.success(t('preferencesSavedToast'));
  };

  // Tema e idioma viajaban ya con la cuenta (`PREF_SLICES.theme` / `.language`)
  // pero sólo se podían cambiar desde el menú de la cabecera, que es donde
  // nadie los busca. Aquí se tocan los MISMOS almacenes: no hay un segundo
  // sitio donde se guarde el tema.
  const { theme, setTheme } = useThemeStore();

  // ── Mesa y riesgo ────────────────────────────────────────────────────────
  // La misma preferencia que usa la mesa de cálculo (`deskAccount`), no una
  // copia: el capital es la misma cifra en todas partes y duplicarlo es
  // exactamente el bug que `cloudPrefs` existe para no tener.
  const [cuenta, setCuenta] = useCloudPref('deskAccount');
  const actualizaCuenta = (parche) => setCuenta((actual) => ({ ...actual, ...parche }));

  const presupuesto = useMemo(() => riskBudget({
    capital: cuenta?.capital,
    riskPct: cuenta?.riskPct,
    riskMoney: cuenta?.riskMoney,
    mode: cuenta?.riskMode === 'money' ? 'money' : 'pct',
  }), [cuenta?.capital, cuenta?.riskPct, cuenta?.riskMoney, cuenta?.riskMode]);

  const numero = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    [locale],
  );

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
      const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, { credentials: 'include',
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
      const res = await fetch(`${BACKEND_URL}/api/auth/account`, { credentials: 'include',
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

  const dosPasosActivo = user.two_factor_enabled === true;
  const activa = SECCIONES.find((s) => s.id === seccion) || SECCIONES[0];

  // El rail no es sólo navegación: dice el estado de cada sección sin entrar.
  // Un punto ámbar en Seguridad es lo que convierte el 2FA —el ajuste que nadie
  // toca— en algo visible desde la primera pantalla.
  const avisoDe = (id) => {
    if (id === 'seguridad' && !dosPasosActivo) return t('settingsNeedsAttention');
    if (id === 'perfil' && emailUnverified) return t('verifyEmailBannerTitle');
    return null;
  };
  const notaDe = (id) => {
    if (id === 'suscripcion') return user.is_premium ? user.subscription_plan : t('settingsPlanFree');
    if (id === 'mesa' && presupuesto.capital !== null) return numero.format(presupuesto.capital);
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-2xl">{t('configuracion_1a0150')}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {user.name} · {user.email}
              </p>
            </div>
            {profileDirty && seccion === 'perfil' && (
              <span className="text-xs font-semibold text-warn">{t('settingsUnsaved')}</span>
            )}
          </div>

          {emailUnverified && (
            <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/25 px-4 py-3">
              <Mail className="w-5 h-5 text-warn shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-warn dark:text-warn">{t('verifyEmailBannerTitle')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('verifyEmailBannerDesc')}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleResendVerification} disabled={resendingVerify} className="shrink-0">
                {resendingVerify && <CargaVelas className="w-3.5 h-3.5 mr-1.5" />}
                {t('verifyEmailResendBtn')}
              </Button>
            </div>
          )}

          <div className="grid lg:grid-cols-[232px_minmax(0,1fr)] gap-6 items-start">
            {/* ── Rail de secciones ──────────────────────────────────────── */}
            <nav
              aria-label={t('configuracion_1a0150')}
              className="rounded-lg border border-border bg-card p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:sticky lg:top-24"
            >
              {SECCIONES.map(({ id, icon: Icono, tituloKey }) => {
                const aviso = avisoDe(id);
                const nota = notaDe(id);
                const act = id === seccion;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => irA(id)}
                    data-testid={`settings-nav-${id}`}
                    aria-current={act ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-left whitespace-nowrap border-l-2 transition-colors ${
                      act
                        ? 'bg-secondary text-foreground border-primary font-medium'
                        : 'text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'
                    }`}
                  >
                    <Icono className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{t(tituloKey)}</span>
                    {aviso && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-warn shrink-0"
                        role="img"
                        aria-label={aviso}
                        title={aviso}
                      />
                    )}
                    {!aviso && nota && (
                      <span className="text-[11px] font-mono text-muted-foreground capitalize hidden lg:inline">{nota}</span>
                    )}
                  </button>
                );
              })}
              <div className="hidden lg:block pt-2 mt-1 border-t border-border">
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  data-testid="logout-btn-rail"
                >
                  <LogOut className="w-4 h-4 mr-2" /> {t('logout')}
                </Button>
              </div>
            </nav>

            {/* ── Panel de trabajo ───────────────────────────────────────── */}
            <div className="min-w-0 space-y-5" data-testid={`settings-section-${seccion}`}>
              <div className="pb-4 border-b border-border">
                <h2 className="text-xl font-semibold">{t(activa.tituloKey)}</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-[62ch]">{t(activa.leadKey)}</p>
              </div>

              {seccion === 'perfil' && (
                <>
                  <Card className="bg-card border-border">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {user.picture
                            ? <img src={user.picture} alt="" className="w-full h-full object-cover" />
                            : <User className="w-8 h-8 text-primary" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-lg truncate">{user.name}</p>
                          <p className="text-muted-foreground flex items-center gap-2 text-sm min-w-0">
                            <Mail className="w-4 h-4 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </p>
                        </div>
                      </div>

                      {/* Rectificación (art. 16 RGPD). La Política de Privacidad ya
                          prometía que esto se podía hacer «desde los ajustes de tu
                          cuenta»; hasta ahora no existía ni el formulario ni el
                          endpoint, así que el derecho se anunciaba y no se podía
                          ejercer. El correo no se edita aquí a propósito: es el
                          identificador de la cuenta y cambiarlo exige reverificación. */}
                      <div className="pt-4 border-t border-border grid sm:grid-cols-2 gap-4 items-start">
                        <div className="space-y-2">
                          <Label htmlFor="profile-name">{t('settingsProfileNameLabel')}</Label>
                          <Input
                            id="profile-name"
                            value={profileName}
                            maxLength={80}
                            onChange={(e) => setProfileName(e.target.value)}
                            data-testid="profile-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-picture">{t('settingsProfilePictureLabel')}</Label>
                          <Input
                            id="profile-picture"
                            value={profilePicture}
                            maxLength={500}
                            placeholder="https://…"
                            onChange={(e) => setProfilePicture(e.target.value)}
                            data-testid="profile-picture-input"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={savingProfile || !profileName.trim() || !profileDirty}
                          data-testid="profile-save-button"
                        >
                          {savingProfile && <CargaVelas className="w-4 h-4 mr-2" />}
                          {t('settingsProfileSave')}
                        </Button>
                        {profileDirty && (
                          <Button
                            variant="ghost"
                            onClick={() => { setProfileName(nombreServidor); setProfilePicture(fotoServidor); }}
                          >
                            {t('settingsDiscard')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('settingsSummaryTitle')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-border pt-0">
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{t('subscription')}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {user.is_premium ? user.subscription_plan : t('settingsPlanFree')}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => irA('suscripcion')}>{t('manageSubscriptionBtn')}</Button>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{t('twoFactorTitle')}</p>
                          <p className={`text-xs ${dosPasosActivo ? 'text-muted-foreground' : 'text-warn'}`}>
                            {dosPasosActivo ? t('settingsTwoFactorOn') : t('settingsTwoFactorOff')}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => irA('seguridad')}>{t('settingsNavSecurity')}</Button>
                      </div>
                      {user.created_at && (
                        <div className="flex items-center justify-between gap-4 py-3">
                          <p className="text-sm font-medium">{t('memberSince')}</p>
                          <p className="text-xs font-mono text-muted-foreground">{formatDate(user.created_at)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {seccion === 'seguridad' && (
                <>
                  {/* Estaba condicionada a `auth_provider === 'password'`, y eso dejaba
                      SIN SALIDA al administrador que entra con Google o con enlace
                      mágico: la guarda del panel lo mandaba aquí a activar el 2FA y
                      aquí no había nada que activar. El backend nunca puso esa
                      condición —`/auth/2fa/setup`, `/enable` y `/disable` van por
                      `require_user`, no miran el proveedor—, así que la restricción
                      sólo existía en esta línea. Ver BUG-076. */}
                  {need2fa && (
                    <div
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3"
                      data-testid="admin-2fa-notice"
                    >
                      <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">{t('admin2faRequiredTitle')}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {t('admin2faRequiredBody')}
                        </p>
                      </div>
                    </div>
                  )}

                  <TwoFactorCard />

                  {/* Passkeys: para cualquier cuenta, también las de Google */}
                  <PasskeysCard />

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
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={showCurrent ? t('hidePassword') : t('showPassword')}
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
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={showNew ? t('hidePassword') : t('showPassword')}
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
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={showConfirm ? t('hidePassword') : t('showPassword')}
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
                </>
              )}

              {seccion === 'suscripcion' && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-6 space-y-4">
                    {user.is_premium ? (
                      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-caution" />
                          <span className="font-semibold text-caution">{t('premiumActivo_433549')}</span>
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
              )}

              {seccion === 'mesa' && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4 items-start">
                      <div className="space-y-2">
                        <Label htmlFor="desk-capital">{t('brkCapital')}</Label>
                        <Input
                          id="desk-capital"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          className="font-mono"
                          value={cuenta?.capital ?? ''}
                          onChange={(e) => actualizaCuenta({ capital: e.target.value })}
                          data-testid="desk-capital-input"
                        />
                        <p className="text-xs text-muted-foreground">{t('settingsDeskCapitalHelp')}</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="desk-risk">{t('deskRiskLabel')}</Label>
                        <div className="flex gap-2">
                          <Input
                            id="desk-risk"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            className="font-mono"
                            value={(cuenta?.riskMode === 'money' ? cuenta?.riskMoney : cuenta?.riskPct) ?? ''}
                            onChange={(e) => actualizaCuenta(
                              cuenta?.riskMode === 'money'
                                ? { riskMoney: e.target.value }
                                : { riskPct: e.target.value },
                            )}
                            data-testid="desk-risk-input"
                          />
                          <div className="flex rounded-sm border border-border overflow-hidden shrink-0">
                            {[['pct', '%'], ['money', t('deskRiskMoneyShort')]].map(([modo, etiqueta]) => (
                              <button
                                key={modo}
                                type="button"
                                onClick={() => actualizaCuenta({ riskMode: modo })}
                                aria-pressed={(cuenta?.riskMode === 'money' ? 'money' : 'pct') === modo}
                                className={`px-3 text-sm ${
                                  (cuenta?.riskMode === 'money' ? 'money' : 'pct') === modo
                                    ? 'bg-primary text-primary-foreground font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {etiqueta}
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('settingsDeskRiskHelp', { cap: RISK_HARD_CAP_PCT, adv: RISK_ADVISED_PCT })}
                        </p>
                      </div>
                    </div>

                    {/* Lo que significa lo que acaba de escribir, con la MISMA
                        función que usa la mesa. Un segundo cálculo aquí sería un
                        sitio más donde el tope del 10 % puede desviarse. */}
                    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                      {presupuesto.blocked && presupuesto.reason === 'no_capital' ? (
                        <p className="text-sm text-muted-foreground">{t('settingsDeskNoCapital')}</p>
                      ) : presupuesto.amount === null ? (
                        <p className="text-sm text-muted-foreground">{t('deskRiskNeedBoth')}</p>
                      ) : (
                        <>
                          <p className="text-sm">
                            {t('settingsDeskRiskAmount', { money: numero.format(presupuesto.amount) })}
                            {cuenta?.riskMode === 'money' && (
                              <span className="text-muted-foreground font-mono ml-2">
                                {numero.format(presupuesto.pct)} %
                              </span>
                            )}
                          </p>
                          {presupuesto.blocked && (
                            <p className="text-xs text-short mt-1.5">
                              {t('deskRiskOverCapInline', { cap: RISK_HARD_CAP_PCT })}
                            </p>
                          )}
                          {!presupuesto.blocked && presupuesto.warn && (
                            <p className="text-xs text-warn mt-1.5">
                              {t('deskRiskWarnBody', { pct: `${numero.format(presupuesto.pct)} %`, adv: RISK_ADVISED_PCT })}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border">
                      <p className="text-sm font-medium mb-1">{t('settingsDeskStartView')}</p>
                      <p className="text-xs text-muted-foreground mb-3">{t('settingsDeskStartViewDesc')}</p>
                      <div className="flex flex-wrap gap-2">
                        {[['desk', t('deskModeDesk')], ['basic', t('deskModeBasic')]].map(([modo, etiqueta]) => {
                          const act = (cuenta?.mode === 'basic' ? 'basic' : 'desk') === modo;
                          return (
                            <Button
                              key={modo}
                              type="button"
                              variant={act ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => actualizaCuenta({ mode: modo })}
                            >
                              {act && <Check className="w-4 h-4 mr-1.5" />}
                              {etiqueta}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {seccion === 'preferencias' && (
                <>
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        {t('preferencesTitle')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between gap-4">
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

                      <div className="flex items-center justify-between gap-4">
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

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-base">{t('theme')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{t('settingsThemeDesc')}</p>
                      <div className="flex flex-wrap gap-2">
                        {TEMAS_BASE.map(({ id, icon: Icono, labelKey }) => (
                          <Button
                            key={id}
                            type="button"
                            size="sm"
                            variant={theme === id ? 'default' : 'outline'}
                            onClick={() => setTheme(id)}
                            data-testid={`settings-theme-${id}`}
                          >
                            <Icono className="w-4 h-4 mr-1.5" />
                            {t(labelKey)}
                          </Button>
                        ))}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          {t('premiumThemes')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PREMIUM_THEMES.map((th) => (
                            <Button
                              key={th.id}
                              type="button"
                              size="sm"
                              variant={theme === th.id ? 'default' : 'outline'}
                              onClick={() => setTheme(th.id)}
                              data-testid={`settings-theme-${th.id}`}
                            >
                              <span
                                className="w-4 h-4 mr-1.5 rounded-full border border-border shrink-0"
                                style={{ background: th.sw }}
                              />
                              {t(th.labelKey)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-base">{t('language')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{t('settingsLanguageDesc')}</p>
                      <div className="flex flex-wrap gap-2">
                        {languages.map((lang) => (
                          <Button
                            key={lang.code}
                            type="button"
                            size="sm"
                            variant={locale === lang.code ? 'default' : 'outline'}
                            onClick={() => setLocale(lang.code)}
                            data-testid={`settings-lang-${lang.code}`}
                          >
                            <span className="mr-1.5" aria-hidden="true">{lang.flag}</span>
                            {lang.name}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {seccion === 'datos' && (
                <>
                  <Card className="bg-card border-border">
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <Button
                          onClick={handleDownloadMyData}
                          disabled={downloadingData}
                          variant="outline"
                          className="w-full justify-start"
                        >
                          {downloadingData
                            ? <CargaVelas className="w-4 h-4 mr-2" />
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
                      <CardTitle className="flex items-center gap-2 text-short">
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
                        className="border-red-800 text-short hover:bg-red-950 hover:text-short w-full sm:w-auto"
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
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0f0f0f] border-red-900/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-short">
              <AlertTriangle className="w-5 h-5" />
              {t('confirmDeleteAccountTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
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
            <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
            <p className="text-xs text-warn dark:text-warn leading-relaxed">
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
