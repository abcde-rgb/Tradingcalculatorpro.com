import { useState, useEffect, useMemo } from 'react';
import { useTranslation, languages } from '@/lib/i18n';
import { getCountryOptions } from '@/lib/countries';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { TrendingUp, Mail, Lock, User, ArrowRight, ArrowLeft, X, KeyRound, CheckCircle, Zap, Loader2, Eye, EyeOff, Shield, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import PasskeyButton from '@/components/auth/PasskeyButton';
import { motion } from 'framer-motion';

// ── Helpers ───────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(pw) {
  if (!pw) return 0;
  if (pw.length < 6) return 1;
  const hasUpper  = /[A-Z]/.test(pw);
  const hasDigit  = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const long      = pw.length >= 12;
  const score     = (pw.length >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSymbol || long ? 1 : 0);
  return Math.min(score, 3);
}

function PasswordStrengthBar({ password, t }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  const labels = ['', t('passwordStrengthWeak'), t('passwordStrengthFair'), t('passwordStrengthGood'), t('passwordStrengthStrong')];
  const colors  = ['', 'bg-red-500', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'];
  const textColors = ['', 'text-red-500', 'text-amber-400', 'text-blue-400', 'text-green-500'];
  return (
    <div className="space-y-1 mt-1" role="status" aria-live="polite" aria-label={`Fortaleza de contraseña: ${labels[strength]}`}>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${strength >= i ? colors[strength] : 'bg-muted'}`} />
        ))}
      </div>
      <p className={`text-xs ${textColors[strength]}`}>{labels[strength]}</p>
    </div>
  );
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

// Decorative animated mini-chart for the auth brand panel (no real data —
// purely aesthetic, draws itself in on mount).
function BrandChartMotif() {
  return (
    <svg viewBox="0 0 320 120" className="w-full h-auto" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="authArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0 96 L40 84 L80 90 L120 58 L160 70 L200 40 L240 52 L280 26 L320 36 L320 120 L0 120 Z"
        fill="url(#authArea)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.4 }}
      />
      <motion.path
        d="M0 96 L40 84 L80 90 L120 58 L160 70 L200 40 L240 52 L280 26 L320 36"
        stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: 'easeInOut' }}
      />
    </svg>
  );
}

// ── Professional split-screen shell ─────────────────────────────────────────
// Brand + value props on the left (desktop only), the auth card on the right.
// On mobile only the card shows, centered. `tr(key, fallback)` renders the
// fallback text whenever a translation key is missing (t() returns the key
// itself when absent), so the panel never shows raw keys.
function AuthShell({ children }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tr = (key, fallback) => { const v = t(key); return v && v !== key ? v : fallback; };
  const goBack = () => (typeof window !== 'undefined' && window.history.length > 1 ? navigate(-1) : navigate('/'));
  const features = [
    tr('authFeatureOptions',  'Calculadora de opciones con griegas en tiempo real'),
    tr('authFeatureStrategy', 'Estrategias multi-leg y diagramas de payoff'),
    tr('authFeatureMarket',   'Datos de mercado en vivo y patrones de velas'),
    tr('authFeatureAlerts',   'Alertas de precio y diario de operaciones'),
  ];
  const trust = [
    { icon: Shield, label: tr('authTrustEncrypted', 'Cifrado de extremo a extremo') },
    { icon: Zap,    label: tr('authTrustNoCard',    'Empieza gratis, sin tarjeta') },
    { icon: Globe,  label: tr('authTrustLangs',     '10 idiomas') },
  ];
  return (
    <div className="min-h-screen flex bg-background">
      {/* Brand panel — desktop only */}
      <aside className="hidden lg:flex lg:w-[46%] relative overflow-hidden border-r border-white/5
                        bg-gradient-to-br from-primary/10 via-background to-background">
        <motion.div aria-hidden
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div aria-hidden
          className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-2.5 w-fit group" aria-label="TradingCalculator PRO">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <span className="font-unbounded font-semibold text-lg">
              TradingCalculator<span className="text-primary"> PRO</span>
            </span>
          </Link>

          <div className="space-y-7 max-w-md">
            <motion.h2
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="text-3xl xl:text-4xl font-unbounded font-bold leading-tight">
              {tr('authHeroTitle', 'La plataforma de trading todo-en-uno para opciones, cripto y forex')}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
              className="rounded-xl border border-white/5 bg-card/30 backdrop-blur-sm p-4">
              <BrandChartMotif />
            </motion.div>

            <ul className="space-y-3.5">
              {features.map((f, i) => (
                <motion.li key={f}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {trust.map(({ icon: Ic, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Ic className="w-3.5 h-3.5 text-primary/70" /> {label}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} TradingCalculator PRO
            </p>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex items-center justify-center p-4 relative">
        {/* Navegación: volver atrás / cerrar (→ inicio) */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={goBack}
            aria-label={t('back') || 'Volver'}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-muted/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('back') || 'Volver'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label={t('close') || 'Cerrar'}
            title={t('close') || 'Cerrar'}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full flex justify-center"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

// Small reassurance line shown under the auth forms.
function SecureFooter() {
  const { t } = useTranslation();
  return (
    <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="w-3 h-3" />
      {t('authSecureNote') || 'Conexión segura · Nunca compartimos tus datos'}
    </p>
  );
}

export const LoginPage = () => {
  useSEO({ titleKey: 'seoLoginTitle', descriptionKey: 'seoLoginDesc', canonicalPath: '/login' });
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, verify2fa, isLoading } = useAuthStore();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [emailErr, setEmailErr]   = useState('');
  const [loginError, setLoginError] = useState('');
  const [totpStep, setTotpStep]   = useState(false);
  const [pendingToken, setPendingToken] = useState('');
  const [totpCode, setTotpCode]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!EMAIL_RE.test(email)) { setEmailErr(t('emailInvalid')); return; }
    const result = await login(email, password);
    if (result.success) {
      toast.success(t('bienvenido_b33c1f'));
      navigate('/dashboard');
    } else if (result.totpRequired) {
      setPendingToken(result.pendingToken);
      setTotpStep(true);
    } else {
      setLoginError(result.error);
      toast.error(result.error);
    }
  };

  const handleVerify2fa = async (e) => {
    e.preventDefault();
    setLoginError('');
    const result = await verify2fa(pendingToken, totpCode.trim());
    if (result.success) {
      toast.success(t('bienvenido_b33c1f'));
      navigate('/dashboard');
    } else {
      setLoginError(result.error);
      toast.error(result.error);
    }
  };

  if (totpStep) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md bg-card/70 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-9 h-9 text-primary" />
            </div>
            <h1 className="font-semibold leading-none tracking-tight text-2xl font-unbounded">{t('twoFactorTitle')}</h1>
            <p className="text-muted-foreground text-sm mt-2">{t('twoFactorPrompt')}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify2fa} className="space-y-4">
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono bg-black/50 border-white/10"
                data-testid="totp-code"
              />
              <Button type="submit" disabled={isLoading || totpCode.length < 6} className="w-full bg-primary text-black hover:bg-primary/90" data-testid="totp-submit">
                {isLoading ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />{t('loading') || '...'}</> : t('twoFactorVerifyBtn')}
              </Button>
              {loginError && !isLoading && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive text-center">
                  {loginError}
                </div>
              )}
            </form>
            <button
              type="button"
              onClick={() => { setTotpStep(false); setTotpCode(''); setLoginError(''); }}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {t('twoFactorBackToLogin')}
            </button>
            <SecureFooter />
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md bg-card/70 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center lg:hidden">
            <TrendingUp className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-semibold leading-none tracking-tight text-2xl font-unbounded">{t('iniciarSesion_9faefe')}</h1>
          <p className="text-muted-foreground text-sm mt-2">{t('accedeABtcTradingCalculator_119926')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailErr(''); }}
                  onBlur={() => { if (email && !EMAIL_RE.test(email)) setEmailErr(t('emailInvalid')); }}
                  placeholder="tu@email.com"
                  className={`pl-10 bg-black/50 border-white/10 ${emailErr ? 'border-destructive' : ''}`}
                  required
                  aria-describedby={emailErr ? 'login-email-err' : undefined}
                  data-testid="login-email"
                />
              </div>
              {emailErr && <p id="login-email-err" className="text-xs text-destructive">{emailErr}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-xs uppercase tracking-wider text-muted-foreground">{t('contrasena_6e7bc0')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-black/50 border-white/10"
                  required
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-black hover:bg-primary/90"
              data-testid="login-submit"
            >
              {isLoading
                ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />{t('loading') || 'Conectando...'}</>
                : <>{t('iniciarSesion_9faefe')}<ArrowRight className="ml-2 w-4 h-4" /></>
              }
            </Button>
            {isLoading && (
              <p className="text-xs text-center text-muted-foreground animate-pulse">
                El servidor puede tardar unos segundos en arrancar…
              </p>
            )}
            {loginError && !isLoading && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive text-center">
                {loginError}
              </div>
            )}
          </form>

          <PasskeyButton />

          <GoogleSignInButton />

          {/* Magic Link */}
          <MagicLinkButton />

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('noTienesCuenta_ba7c96')} </span>
            <Link to="/register" className="text-primary hover:underline">{t('registrate_48a11f')}</Link>
          </div>

          <SecureFooter />
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export const RegisterPage = () => {
  useSEO({ titleKey: 'seoRegisterTitle', descriptionKey: 'seoRegisterDesc', canonicalPath: '/register' });
  const { t, locale, setLocale } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [country, setCountry]   = useState('');       // ISO alpha-2 (empty = not set)
  const [language, setLanguage] = useState(locale);   // UI language, defaults to current

  // Country list localized to the UI language; recomputed only when locale changes.
  const countryOptions = useMemo(() => getCountryOptions(locale), [locale]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) { setEmailErr(t('emailInvalid')); return; }
    if (password.length < 8) {
      toast.error(t('passwordMinChars'));
      return;
    }
    const result = await register(name, email, password, { country, preferredLocale: language });
    if (result.success) {
      // Make the chosen language stick as this client's preferred UI language.
      if (language && language !== locale) { try { setLocale(language); } catch (_) {} }
      toast.success(t('cuentaCreadaExitosamente_f4aa3e'));
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <AuthShell>
      <Card className="w-full max-w-md bg-card/70 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center lg:hidden">
            <TrendingUp className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-semibold leading-none tracking-tight text-2xl font-unbounded">{t('crearCuenta_f32c7c')}</h1>
          <p className="text-muted-foreground text-sm mt-2">{t('registrateEnBtcTradingCalculator_18dbac')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name" className="text-xs uppercase tracking-wider text-muted-foreground">Nombre</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="pl-10 bg-black/50 border-white/10"
                  required
                  data-testid="register-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailErr(''); }}
                  onBlur={() => { if (email && !EMAIL_RE.test(email)) setEmailErr(t('emailInvalid')); }}
                  placeholder="tu@email.com"
                  className={`pl-10 bg-black/50 border-white/10 ${emailErr ? 'border-destructive' : ''}`}
                  required
                  aria-describedby={emailErr ? 'register-email-err' : undefined}
                  data-testid="register-email"
                />
              </div>
              {emailErr && <p id="register-email-err" className="text-xs text-destructive">{emailErr}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password" className="text-xs uppercase tracking-wider text-muted-foreground">{t('contrasena_6e7bc0')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordMinChars')}
                  className="pl-10 pr-10 bg-black/50 border-white/10"
                  required
                  minLength={8}
                  data-testid="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthBar password={password} t={t} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="register-country" className="text-xs uppercase tracking-wider text-muted-foreground">{t('registerCountry')}</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select
                    id="register-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full h-10 rounded-md pl-10 pr-3 bg-black/50 border border-white/10 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    data-testid="register-country"
                  >
                    <option value="" disabled>{t('registerCountryPlaceholder')}</option>
                    {countryOptions.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-language" className="text-xs uppercase tracking-wider text-muted-foreground">{t('registerLanguage')}</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select
                    id="register-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-10 rounded-md pl-10 pr-3 bg-black/50 border border-white/10 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="register-language"
                  >
                    {languages.map((l) => (
                      <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-black hover:bg-primary/90"
              data-testid="register-submit"
            >
              {isLoading ? t('loading') : t('crearCuenta_f32c7c')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          <GoogleSignInButton country={country} language={language} />

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('yaTienesCuenta_7e833c')} </span>
            <Link to="/login" className="text-primary hover:underline">{t('iniciaSesion_0e195f')}</Link>
          </div>

          <SecureFooter />
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  // Token travels in URL hash (# fragment) so it never reaches server logs
  const token = window.location.hash.slice(1) || new URLSearchParams(window.location.search).get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 8) { setError('Mínimo 8 caracteres'); return; }
    if (!API) { setError('Backend no configurado'); return; }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (res.ok) { setDone(true); }
      else { setError(data.detail || 'Error al restablecer la contraseña'); }
    } catch (_) { setError('Error de conexión'); }
    setIsLoading(false);
  };

  return (
    <AuthShell>
      <Card className="w-full max-w-md bg-card/70 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-semibold leading-none tracking-tight text-2xl font-unbounded">Nueva contraseña</h1>
          <p className="text-muted-foreground text-sm mt-2">Elige una nueva contraseña para tu cuenta.</p>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground">Contraseña actualizada correctamente.</p>
              <Button className="w-full bg-primary text-black hover:bg-primary/90" onClick={() => navigate('/login')}>
                Iniciar sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!token && (
                <p className="text-sm text-destructive text-center">Enlace inválido. Solicita uno nuevo.</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="reset-password" className="text-xs uppercase tracking-wider text-muted-foreground">Nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="reset-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" className="pl-10 bg-black/50 border-white/10" required minLength={8} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm" className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="reset-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••" className="pl-10 bg-black/50 border-white/10" required minLength={8} />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isLoading || !token}
                className="w-full bg-primary text-black hover:bg-primary/90">
                {isLoading ? 'Guardando...' : 'Guardar nueva contraseña'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">Volver al inicio de sesión</Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export const ForgotPasswordPage = () => {
  useSEO({ titleKey: 'seoForgotTitle', descriptionKey: 'seoForgotDesc', canonicalPath: '/forgot-password' });
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (!API) {
      // No mentir al usuario: si no hay backend configurado, decirlo claramente
      // en lugar de simular un "email enviado" que nunca llega.
      toast.error('Backend no configurado');
      setIsLoading(false);
      return;
    }
    try {
      await fetch(`${API}/auth/forgot-password`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (_) {}
    setSent(true);
    setIsLoading(false);
  };

  return (
    <AuthShell>
      <Card className="w-full max-w-md bg-card/70 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-semibold leading-none tracking-tight text-2xl font-unbounded">Recuperar contraseña</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Si existe una cuenta con ese email, recibirás un enlace en breve.
              </p>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-10 bg-black/50 border-white/10"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-black hover:bg-primary/90"
              >
                {isLoading ? 'Enviando...' : 'Enviar enlace'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
};

const MagicLinkButton = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!API) { toast.error('Backend no configurado'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/magic-link`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setSent(true); }
      else { const d = await res.json(); toast.error(d.detail || 'Error al enviar el enlace'); }
    } catch (_) { toast.error('Error de conexión'); }
    setIsLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-yellow-400 transition-colors"
      >
        <Zap className="w-4 h-4 text-yellow-400" />
        Iniciar con Magic Link (sin contraseña)
      </button>
    );
  }

  return (
    <div className="mt-3 border border-yellow-400/20 rounded-lg p-4 bg-yellow-400/5">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium text-yellow-400">Magic Link</span>
      </div>
      {sent ? (
        <div className="text-center space-y-2">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
          <p className="text-xs text-muted-foreground">Revisa tu email — el enlace expira en 15 minutos.</p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="pl-10 bg-black/50 border-white/10 h-9 text-sm"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading} size="sm"
              className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300 h-8 text-xs">
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Enviar enlace'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}
              className="h-8 text-xs text-muted-foreground">
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export const MagicPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    if (!API) { setStatus('no-backend'); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/auth/magic-link/verify`, { credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok && data.access_token) {
          useAuthStore.setState({
            token: data.access_token,
            user: data.user,
            isAuthenticated: true,
          });
          toast.success('¡Bienvenido!');
          navigate('/dashboard');
        } else {
          setStatus('invalid');
        }
      } catch (_) {
        setStatus('error');
      }
    })();
  }, [token, navigate]);

  const messages = {
    verifying: { icon: <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />, text: 'Verificando enlace...' },
    invalid: { icon: <KeyRound className="w-12 h-12 text-destructive mx-auto" />, text: 'Enlace inválido o expirado. Solicita uno nuevo.' },
    'no-backend': { icon: <KeyRound className="w-12 h-12 text-destructive mx-auto" />, text: 'Backend no configurado.' },
    error: { icon: <KeyRound className="w-12 h-12 text-destructive mx-auto" />, text: 'Error de conexión. Inténtalo de nuevo.' },
  };

  const msg = messages[status] || messages.error;

  return (
    <AuthShell>
      <Card className="w-full max-w-md bg-card/70 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="font-semibold leading-none tracking-tight text-2xl font-unbounded">Magic Link</h1>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {msg.icon}
          <p className="text-sm text-muted-foreground">{msg.text}</p>
          {status !== 'verifying' && (
            <Button className="w-full bg-primary text-black hover:bg-primary/90" onClick={() => navigate('/login')}>
              Volver al inicio de sesión
            </Button>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
};
