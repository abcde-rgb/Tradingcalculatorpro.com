import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useNavigate, Link } from 'react-router-dom';
import { Bitcoin, Mail, Lock, User, ArrowRight, KeyRound, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      toast.success(t('bienvenido_b33c1f'));
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
          <CardTitle className="text-2xl font-unbounded">{t('iniciarSesion_9faefe')}</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">{t('accedeABtcTradingCalculator_119926')}</p>
        </CardHeader>
        <CardContent>
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
                  data-testid="login-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('contrasena_6e7bc0')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-black/50 border-white/10"
                  required
                  data-testid="login-password"
                />
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
              {isLoading ? t('loading') : t('iniciarSesion_9faefe')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          <GoogleSignInButton />

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('noTienesCuenta_ba7c96')} </span>
            <Link to="/register" className="text-primary hover:underline">{t('registrate_48a11f')}</Link>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-muted-foreground">
            <p className="font-semibold mb-1">{t('demoUsaLasCredenciales_a06869')}</p>
            <p>Email: demo@btccalc.pro</p>
            <p>Password: 1234</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 4) {
      toast.error(t('laContrasenaDebeTenerAl_47b500'));
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
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nombre</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
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
                  data-testid="register-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('contrasena_6e7bc0')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('minimo4Caracteres_793e1d')}
                  className="pl-10 bg-black/50 border-white/10"
                  required
                  data-testid="register-password"
                />
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

export const ForgotPasswordPage = () => {
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
              {!API && (
                <p className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-2 rounded-lg">
                  Modo preview — en producción se enviaría un email real.
                </p>
              )}
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
