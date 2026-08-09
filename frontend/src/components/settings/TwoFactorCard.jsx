import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Loader2, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Two-step verification (TOTP) management: enable with an authenticator app,
// or disable with a current code. Only shown for password accounts.
export default function TwoFactorCard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const enabled = user?.two_factor_enabled === true;

  const [mode, setMode] = useState('idle'); // idle | enrolling | disabling
  const [setup, setSetup] = useState(null); // { secret, otpauth_uri }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${useAuthStore.getState().token}`,
    'Content-Type': 'application/json',
  });

  const refreshUser = () => useAuthStore.getState().refreshUser?.();

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/2fa/setup`, {
        method: 'POST', credentials: 'include', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '');
      setSetup(data);
      setMode('enrolling');
    } catch (e) {
      toast.error(e.message || t('twoFactorErrorToast'));
    } finally { setBusy(false); }
  };

  const confirmEnable = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/2fa/enable`, {
        method: 'POST', credentials: 'include', headers: authHeaders(),
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '');
      toast.success(t('twoFactorEnabledToast'));
      setMode('idle'); setSetup(null); setCode('');
      refreshUser();
    } catch (e) {
      toast.error(e.message || t('twoFactorErrorToast'));
    } finally { setBusy(false); }
  };

  const confirmDisable = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/2fa/disable`, {
        method: 'POST', credentials: 'include', headers: authHeaders(),
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '');
      toast.success(t('twoFactorDisabledToast'));
      setMode('idle'); setCode('');
      refreshUser();
    } catch (e) {
      toast.error(e.message || t('twoFactorErrorToast'));
    } finally { setBusy(false); }
  };

  const copySecret = () => {
    if (!setup?.secret) return;
    navigator.clipboard?.writeText(setup.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const CodeInput = (
    <Input
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="000000"
      className="text-center text-xl tracking-[0.4em] font-mono max-w-[200px]"
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {enabled ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <ShieldAlert className="w-5 h-5 text-muted-foreground" />}
          {t('twoFactorSettingsTitle')}
          <Badge variant={enabled ? 'default' : 'outline'} className="ml-1 text-xs">
            {enabled ? t('twoFactorEnabledBadge') : t('twoFactorDisabledBadge')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('twoFactorSettingsDesc')}</p>

        {/* Enabled → offer disable */}
        {enabled && mode !== 'disabling' && (
          <Button variant="outline" onClick={() => { setMode('disabling'); setCode(''); }}>
            {t('twoFactorDisableBtn')}
          </Button>
        )}

        {enabled && mode === 'disabling' && (
          <div className="space-y-3">
            <p className="text-sm">{t('twoFactorDisablePrompt')}</p>
            {CodeInput}
            <div className="flex gap-2">
              <Button variant="destructive" onClick={confirmDisable} disabled={busy || code.length < 6}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{t('twoFactorDisableBtn')}
              </Button>
              <Button variant="ghost" onClick={() => { setMode('idle'); setCode(''); }} disabled={busy}>
                {t('twoFactorCancelBtn')}
              </Button>
            </div>
          </div>
        )}

        {/* Disabled → offer enable */}
        {!enabled && mode !== 'enrolling' && (
          <Button onClick={startSetup} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{t('twoFactorEnableBtn')}
          </Button>
        )}

        {!enabled && mode === 'enrolling' && setup && (
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-3">{t('twoFactorSetupInstructions')}</p>

              {/* El QR se genera EN EL CLIENTE, nunca con un servicio externo
                  (api.qrserver.com, chart.googleapis.com y similares): la URI
                  lleva el secreto TOTP dentro, así que pedirle la imagen a un
                  tercero es entregarle el segundo factor de cada usuario.
                  `qrcode.react` dibuja un SVG en local y no hace red.

                  La URI la monta el backend con `pyotp.provisioning_uri` y
                  llega en `otpauth_uri`; no se reconstruye aquí para que no
                  haya dos fuentes que puedan divergir en emisor o parámetros.
                  Hasta ahora el texto de arriba prometía un código QR que no
                  se dibujaba en ninguna parte: sólo se veía la clave. */}
              {setup.otpauth_uri && (
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-lg bg-white inline-block" data-testid="totp-qr">
                    <QRCodeSVG value={setup.otpauth_uri} size={180} level="M" marginSize={0} />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-1.5">{t('twoFactorManualKey')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-md bg-muted/50 border font-mono text-sm break-all">{setup.secret}</code>
                <Button variant="outline" size="icon" onClick={copySecret} aria-label="Copy">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm mb-2">{t('twoFactorEnterCode')}</p>
              {CodeInput}
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmEnable} disabled={busy || code.length < 6}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{t('twoFactorConfirmBtn')}
              </Button>
              <Button variant="ghost" onClick={() => { setMode('idle'); setSetup(null); setCode(''); }} disabled={busy}>
                {t('twoFactorCancelBtn')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
