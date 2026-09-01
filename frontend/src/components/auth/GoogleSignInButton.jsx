import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import TwoFactorChallenge from '@/components/auth/TwoFactorChallenge';

// Client ID configurado vía REACT_APP_GOOGLE_CLIENT_ID en .env
const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

// Cuánto se espera a que Google pinte su botón antes de dar por hecho que no va
// a llegar. Su script se carga de `accounts.google.com`, así que en una red lenta
// tarda; pasado esto, seguir enseñando un hueco es peor que decirlo.
const ESPERA_BOTON_MS = 5000;

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
 *
 * DOS COSAS QUE NO SE VEN LEYENDO ESTE FICHERO, y que costaron los dos fallos
 * que arregla:
 *
 *   a) El botón lo pinta Google dentro de un iframe, no nosotros. Si su script
 *      no carga —bloqueador de anuncios, cookies de terceros bloqueadas, red
 *      cortada— o si el origen NO está autorizado en la consola de Google, el
 *      contenedor se queda VACÍO y no se lanza ningún error que React pueda
 *      recoger: `onError` sólo cubre el fallo de una credencial ya emitida.
 *      El resultado era un separador «o continúa con» seguido de un agujero en
 *      mitad de la tarjeta, sin una sola palabra que explicara qué pasaba. Por
 *      eso se mide si el contenedor llegó a tener altura, y si no, se dice.
 *
 *   b) Entrar con Google puede NO terminar la sesión: si la cuenta tiene 2FA,
 *      el backend responde 200 con `totp_required` y sin token. Ver
 *      `TwoFactorChallenge`.
 */
export default function GoogleSignInButton({ country, language } = {}) {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const { loginWithGoogle } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [pendingToken, setPendingToken] = useState('');
  // 'esperando' → todavía puede llegar · 'pintado' → Google lo puso ·
  // 'ausente' → se agotó la espera y el contenedor sigue vacío.
  const [estadoBoton, setEstadoBoton] = useState('esperando');
  const contenedor = useRef(null);

  // ¿Llegó a pintarse el botón? Se mira si Google metió ALGO dentro de su
  // contenedor, no la altura.
  //
  // La primera versión medía la altura y no detectaba nada: `<GoogleLogin>`
  // pone `style={{height: 40}}` en su propio div para reservar el sitio, así
  // que el contenedor mide 40 px igual esté vacío o lleno, y el aviso no salía
  // nunca. Se vio con una sonda de navegador contra el build; leyendo el código
  // parecía correcto. El contador de descendientes sí distingue: el div de la
  // librería es el único hijo hasta que Google inyecta su botón dentro.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || pendingToken) return undefined;
    const inicio = Date.now();
    const tic = setInterval(() => {
      const raiz = contenedor.current;
      if (raiz && raiz.querySelectorAll('*').length > 1) {
        setEstadoBoton('pintado');
        clearInterval(tic);
      } else if (Date.now() - inicio >= ESPERA_BOTON_MS) {
        setEstadoBoton('ausente');
        clearInterval(tic);
      }
    }, 250);
    return () => clearInterval(tic);
  }, [pendingToken]);

  // Si el Client ID no está configurado, mostrar aviso en desarrollo
  // y no renderizar el botón (evita error de GoogleOAuthProvider con clientId vacío)
  if (!GOOGLE_CLIENT_ID) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-caution text-center">
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
    // On the register page we pass the pre-selected country/language so a
    // one-click Google sign-up still captures them.
    const result = await loginWithGoogle(response.credential, { country, preferredLocale: language });
    setBusy(false);
    if (result.success) {
      toast.success(t('bienvenido_b33c1f'));
      navigate('/dashboard');
      return;
    }
    // La cuenta tiene 2FA: Google ya probó quién es, falta el segundo factor.
    if (result.totpRequired) {
      setPendingToken(result.pendingToken);
      return;
    }
    toast.error(result.error || t('googleSignInError'));
  };

  const handleError = () => {
    toast.error(
      t('googleSignInError') ||
      'Error al iniciar sesión con Google. Verifica que la URL del sitio esté autorizada en Google Console.'
    );
  };

  const separador = (etiqueta) => (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{etiqueta}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );

  // Segundo factor pendiente: el botón ya cumplió, ahora manda el código.
  if (pendingToken) {
    return (
      <div className="space-y-3" data-testid="google-signin-block">
        {separador(t('twoFactorTitle'))}
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          {t('twoFactorPrompt')}
        </p>
        <TwoFactorChallenge
          pendingToken={pendingToken}
          cancelLabel={t('authCancel')}
          onCancel={() => setPendingToken('')}
        />
      </div>
    );
  }

  // Google no pintó nada. Sin esto quedaba el separador y debajo un hueco.
  if (estadoBoton === 'ausente') {
    return (
      <div
        className="mt-4 p-3 rounded-lg border border-white/10 bg-muted/30 text-xs text-muted-foreground text-center space-y-1"
        data-testid="google-signin-unavailable"
      >
        <p className="text-foreground">{t('authGoogleUnavailable')}</p>
        <p>{t('authGoogleUnavailableHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="google-signin-block">
      {separador(t('orContinueWith') || 'o continúa con')}
      {/* El sitio del botón ya lo reserva `<GoogleLogin>` con su `height: 40`,
          así que la tarjeta no pega un salto cuando Google termina de pintarlo. */}
      <div className="flex justify-center" data-testid="google-signin-button">
        <div ref={contenedor}>
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
    </div>
  );
}
