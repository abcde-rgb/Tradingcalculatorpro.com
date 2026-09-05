import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  isPasskeySupported, registerPasskey, listPasskeys, deletePasskey, isCancellation,
} from '@/lib/passkeys';
import { CargaVelas } from '@/components/common/BrandLoading';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Alta y baja de passkeys.
 *
 * A diferencia del 2FA, se ofrece a CUALQUIER cuenta, también a las de Google:
 * una passkey no sustituye a la contraseña, es otra forma de demostrar quién
 * eres, y quien entró con Google también gana con tener una.
 */
export default function PasskeysCard() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const token = () => useAuthStore.getState().token;

  const refresh = useCallback(async () => {
    try {
      const d = await listPasskeys(token());
      setItems(d.passkeys || []);
    } catch { /* sin sesión válida no hay nada que listar */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!API || !isPasskeySupported()) { setLoaded(true); return; }
    let alive = true;
    fetch(`${API}/api/auth/passkey/available`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.available) { setAvailable(true); refresh(); } else setLoaded(true); })
      .catch(() => setLoaded(true));
    return () => { alive = false; };
  }, [refresh]);

  // El navegador no lo soporta o el servidor no lo ofrece: no se pinta una
  // tarjeta que sólo puede frustrar.
  if (!available || !loaded) return null;

  const add = async () => {
    setBusy(true);
    try {
      await registerPasskey(token(), navigator.platform || 'Passkey');
      toast.success(t('passkeyAdded'));
      await refresh();
    } catch (err) {
      if (!isCancellation(err)) toast.error(t('passkeyAddError'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await deletePasskey(token(), id);
      toast.success(t('passkeyRemoved'));
      await refresh();
    } catch {
      toast.error(t('passkeyAddError'));
    }
  };

  return (
    <Card className="bg-card border-border" data-testid="passkeys-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-primary" />
          {t('passkeysTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('passkeysHint')}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('passkeysEmpty')}</p>
        )}
        {items.map((p) => (
          <div key={p.id}
               className="flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-background">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              {p.last_used_at && (
                <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                  {t('passkeyLastUsed')}: {new Date(p.last_used_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(p.id)}
                    data-testid={`passkey-delete-${p.id}`}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button onClick={add} disabled={busy} className="w-full" data-testid="passkey-add">
          {busy ? <CargaVelas className="mr-2 w-4 h-4" />
                : <Fingerprint className="mr-2 w-4 h-4" />}
          {t('passkeyAdd')}
        </Button>
      </CardContent>
    </Card>
  );
}
