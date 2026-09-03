import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveForumProfile } from '@/services/forumApi';

/**
 * Elegir seudónimo. Es la puerta de entrada a publicar, y es deliberado.
 *
 * El backend nunca devuelve el correo ni el nombre real de nadie, pero el
 * usuario no tiene forma de saberlo. Obligarle a elegir cómo quiere que se le
 * llame ANTES de su primer mensaje convierte esa promesa en algo que ve: si
 * escribe «swing_trader», sabe que eso es lo que va a aparecer.
 */
export default function SeudonimoDialogo({ abierto, perfil, onCerrar, onGuardado }) {
  const { t } = useTranslation();
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setHandle(perfil?.handle || '');
      setBio(perfil?.bio || '');
      setError('');
    }
  }, [abierto, perfil]);

  if (!abierto) return null;

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const guardado = await saveForumProfile({ handle, bio });
      onGuardado?.(guardado);
    } catch (err) {
      if (err.enUso) setError(t('comunidadSeudonimoEnUso'));
      else if (err.invalido) setError(err.detalle || t('comunidadSeudonimoInvalido'));
      else setError(t('comunidadErrorGenerico'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('comunidadSeudonimoTitulo')}
    >
      <form
        onSubmit={guardar}
        className="w-full max-w-md rounded-lg border border-rule bg-card p-5"
      >
        <h2 className="text-lg font-semibold">{t('comunidadSeudonimoTitulo')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('comunidadSeudonimoIntro')}</p>

        <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="foro-handle">
          {t('comunidadSeudonimoEtiqueta')}
        </label>
        <Input
          id="foro-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="swing_trader"
          autoComplete="off"
          maxLength={24}
          className="mt-1 font-mono"
        />
        <p className="mt-1 text-[11.5px] text-muted-foreground">{t('comunidadSeudonimoPista')}</p>

        <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="foro-bio">
          {t('comunidadBioEtiqueta')}
        </label>
        <Textarea
          id="foro-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={2}
          className="mt-1"
          placeholder={t('comunidadBioPlaceholder')}
        />

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCerrar}>{t('comunidadCancelar')}</Button>
          <Button type="submit" disabled={guardando || handle.trim().length < 3}>
            {guardando ? t('comunidadGuardando') : t('comunidadGuardar')}
          </Button>
        </div>
      </form>
    </div>
  );
}
