import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { Bitcoin, Mail, Lock, User, ArrowRight, KeyRound, CheckCircle, Zap, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

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

export const LoginPage = () => {
  useSEO({ titleKey: 'seoLoginTitle', descriptionKey: 'seoLoginDesc', canonicalPath: '/login' });
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [emailErr, setEmailErr]   = useState('');
  const [loginError, setLoginError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!EMAIL_RE.test(email)) { setEmailErr(t('emailInvalid')); return; }
    const result = await login(email, password);
    if (result.success) {
      toast.success(t('bienvenido_b33c1f'));
      navigate('/dashboard');
    } else {
      setLoginError(result.error);
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bitcoin className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-unbounded">{t('iniciarSesion_9faefe')}</CardTitle>
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

          <GoogleSignInButton />

          {/* Magic Link */}
          <MagicLinkButton />

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('noTienesCuenta_ba7c96')} </span>
            <Link to="/register" className="text-primary hover:underline">{t('registrate_48a11f')}</Link>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
};

export const RegisterPage = () => {
  useSEO({ titleKey: 'seoRegisterTitle', descriptionKey: 'seoRegisterDesc', canonicalPath: '/register' });
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [emailErr, setEmailErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) { setEmailErr(t('emailInvalid')); return; }
    if (password.length < 8) {
      toast.error(t('passwordMinChars'));
      return;
    }
    const result = await register(name, email, password);
    if (result.success) {
      toast.success(t('cuentaCreadaExitosamente_f4aa3e'));
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bitcoin className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-unbounded">{t('crearCuenta_f32c7c')}</CardTitle>
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

          <GoogleSignInButton />
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('yaTienesCuenta_7e833c')} </span>
            <Link to="/login" className="text-primary hover:underline">{t('iniciaSesion_0e195f')}</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 8) { setError('Mínimo 8 caracteres'); return; }
    if (!API) { setError('Backend no configurado'); return; }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-unbounded">Nueva contraseña</CardTitle>
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
    </div>
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
      await new Promise(r => setTimeout(r, 600));
      setSent(true);
      setIsLoading(false);
      return;
    }
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (_) {}
    setSent(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-unbounded">Recuperar contraseña</CardTitle>
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
    </div>
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
      const res = await fetch(`${API}/auth/magic-link`, {
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
        const res = await fetch(`${API}/auth/magic-link/verify`, {
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
          localStorage.setItem('auth_token', data.access_token);
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-10 h-10 text-yellow-400" />
          </div>
          <CardTitle className="text-2xl font-unbounded">Magic Link</CardTitle>
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
    </div>
  );
};
