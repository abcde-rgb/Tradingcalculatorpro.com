import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/store';
import { isPasskeySupported, loginWithPasskey, isCancellation } from '@/lib/passkeys';
import { CargaVelas } from '@/components/common/BrandLoading';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Acceso con passkey: huella, cara o PIN del dispositivo.
 *
 * Es el único método de la app que resiste el phishing — el navegador sólo
 * ofrece la credencial al origen que la creó, así que una web clonada no puede
 * pedirla aunque el usuario se la crea.
 *
 * El botón sólo aparece si (a) el navegador lo soporta y (b) el servidor lo
 * tiene operativo. Ofrecer un acceso que va a fallar al pulsarlo es peor que no
 * ofrecerlo: el usuario no sabe si el problema es suyo, del sitio o de su cuenta.
 */
export default function PasskeyButton() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!API || !isPasskeySupported()) return;
    let alive = true;
    fetch(`${API}/api/auth/passkey/available`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.available) setAvailable(true); })
      .catch(() => { /* canal no disponible: el botón simplemente no aparece */ });
    return () => { alive = false; };
  }, []);

  if (!available) return null;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await loginWithPasskey();
      setSession(data.user, data.token);
      toast.success(t('passkeyWelcome'));
      navigate('/dashboard');
    } catch (err) {
      // Cancelar el diálogo del sistema es una decisión del usuario, no un
      // fallo: gritarle un error rojo por cerrar un cuadro es ruido.
      if (!isCancellation(err)) toast.error(t('passkeyLoginError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={busy}
      className="w-full mt-3"
      data-testid="passkey-login"
    >
      {busy
        ? <CargaVelas className="mr-2 w-4 h-4" />
        : <Fingerprint className="mr-2 w-4 h-4" />}
      {t('passkeyLogin')}
    </Button>
  );
}
