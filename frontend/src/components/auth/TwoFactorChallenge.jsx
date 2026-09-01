import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

/**
 * El segundo factor, una sola vez.
 *
 * El backend exige TOTP en TODAS las vías que abren sesión —contraseña, Google
 * y enlace mágico— y las tres responden lo mismo: `{totp_required, pending_token}`
 * con HTTP 200 y sin `token`. Sólo el formulario de contraseña sabía leerlo; las
 * otras dos trataban esa respuesta como un fallo, así que quien tenía el 2FA
 * activo no podía entrar con Google («Error con Google») ni con un enlace mágico
 * («enlace inválido»), sin ninguna pista de que le faltaba el código.
 *
 * Por eso el reto vive aquí y no dentro de una pantalla: es el mismo paso para
 * las tres, y tenerlo escrito tres veces es tener dos copias que se olvidan.
 */
export default function TwoFactorChallenge({ pendingToken, onCancel, redirectTo = '/dashboard' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { verify2fa, isLoading } = useAuthStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await verify2fa(pendingToken, code.trim());
    if (result.success) {
      toast.success(t('bienvenido_b33c1f'));
      navigate(redirectTo);
    } else {
      setError(result.error);
      toast.error(result.error);
    }
  };

  return (
    <div data-testid="two-factor-challenge">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          aria-label={t('twoFactorPrompt')}
          placeholder="000000"
          className="text-center text-2xl tracking-[0.5em] font-mono bg-black/50 border-white/10"
          data-testid="totp-code"
        />
        <Button
          type="submit"
          disabled={isLoading || code.length < 6}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="totp-submit"
        >
          {isLoading
            ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />{t('loading') || '...'}</>
            : t('twoFactorVerifyBtn')}
        </Button>
        {error && !isLoading && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive text-center">
            {error}
          </div>
        )}
      </form>
      {onCancel && (
        <button
          type="button"
          onClick={() => { setCode(''); setError(''); onCancel(); }}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {t('twoFactorBackToLogin')}
        </button>
      )}
    </div>
  );
}
