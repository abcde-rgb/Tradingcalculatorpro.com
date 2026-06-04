import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

// Client ID configurado vía REACT_APP_GOOGLE_CLIENT_ID en .env
const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

/**
 * Google sign-in button. Drops next to the email/password form on the
 * login & register pages. Renders Google's official <GoogleLogin> button
 * (rendered inside an iframe by Google Identity Services), and on success
 * forwards the returned ID token to our backend for verification.
 *
 * The button auto-themes (dark/light) and resizes responsively.
 *
 * REQUISITOS para que funcione:
 *   1. Backend: variable GOOGLE_CLIENT_ID en backend/.env
 *   2. Frontend: variable REACT_APP_GOOGLE_CLIENT_ID en frontend/.env
 *   3. Google Console: añadir la URL del frontend como "Authorized JavaScript origin"
 *      en el OAuth 2.0 Client ID (no se necesita redirect URI).
 */
export default function GoogleSignInButton() {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const { loginWithGoogle } = useAuthStore();
  const [busy, setBusy] = useState(false);

  // Si el Client ID no está configurado, mostrar aviso en desarrollo
  // y no renderizar el botón (evita error de GoogleOAuthProvider con clientId vacío)
  if (!GOOGLE_CLIENT_ID) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400 text-center">
          ⚠️ Google OAuth no configurado.<br />
          Añade <code className="font-mono bg-black/30 px-1 rounded">REACT_APP_GOOGLE_CLIENT_ID</code> en <code className="font-mono bg-black/30 px-1 rounded">frontend/.env</code>
        </div>
      );
    }
    // En producción: no renderizar nada si falta la config (oculto limpiamente)
    return null;
  }

  // Map our short locale codes to Google's supported locale strings.
  const googleLocaleMap = {
    es: 'es', en: 'en', de: 'de', fr: 'fr',
    ru: 'ru', zh: 'zh_CN', ja: 'ja', ar: 'ar',
  };
  const googleLocale = googleLocaleMap[locale] || 'en';

  const handleSuccess = async (response) => {
    if (busy) return;
    setBusy(true);
    const result = await loginWithGoogle(response.credential);
    setBusy(false);
    if (result.success) {
      toast.success(t('bienvenido_b33c1f'));
      navigate('/dashboard');
    } else {
      toast.error(result.error || t('googleSignInError'));
    }
  };

  const handleError = () => {
    toast.error(
      t('googleSignInError') ||
      'Error al iniciar sesión con Google. Verifica que la URL del sitio esté autorizada en Google Console.'
    );
  };

  return (
    <div className="space-y-3" data-testid="google-signin-block">
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {t('orContinueWith') || 'o continúa con'}
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
      <div className="flex justify-center" data-testid="google-signin-button">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          theme="filled_black"
          size="large"
          shape="rectangular"
          width="320"
          locale={googleLocale}
          useOneTap={false}
        />
      </div>
    </div>
  );
}
