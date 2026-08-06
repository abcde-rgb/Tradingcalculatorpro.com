import React, { useEffect, useState } from 'react';
import { BellRing, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SectionCard from '@/components/options/SectionCard';
import { useTranslation } from '@/lib/i18n';
import { getNotifyChannels } from '@/services/performanceApi';

const CHANNELS = [
  { id: 'inapp', labelKey: 'tfChannelInapp' },
  { id: 'email', labelKey: 'tfChannelEmail' },
  { id: 'sms',   labelKey: 'tfChannelSms' },
];

const LEVELS = [
  { id: 'sl', labelKey: 'tradeSL' },
  { id: 'tp', labelKey: 'tradeTP' },
];

/**
 * Avisar cuando el precio llega al stop o al objetivo de una posición ABIERTA.
 *
 * No monta un vigilante nuevo: escribe en la misma colección de alertas que ya
 * recorre el poller, con el `trade_id` puesto. Editar el stop mueve el aviso, y
 * cerrar la operación lo retira — un aviso de un nivel que ya no existe es peor
 * que ninguno.
 *
 * Lo importante de esta sección es lo que dice cuando **no** puede: consulta qué
 * canales están operativos de verdad y marca los que no lo están. Un canal de
 * avisos que falla en silencio hace que el usuario cuente con una llamada que no
 * va a recibir; decirlo antes es la mitad de la funcionalidad.
 */
export default function AlertSection({ notify, onChange, status, hasLevels }) {
  const { t } = useTranslation();
  const [channels, setChannels] = useState(null);

  useEffect(() => {
    let alive = true;
    getNotifyChannels()
      .then((data) => { if (alive) setChannels(data); })
      .catch(() => { if (alive) setChannels(null); });   // sin respuesta: se ofrece todo
    return () => { alive = false; };
  }, []);

  const value = notify || { enabled: false, channels: ['inapp'], on: ['sl', 'tp'], phone: '' };
  const patch = (p) => onChange({ ...value, ...p });
  const toggleIn = (key, id) => patch({
    [key]: value[key]?.includes(id)
      ? value[key].filter((x) => x !== id)
      : [...(value[key] || []), id],
  });

  const available = (id) => channels?.[id]?.available !== false;
  const smsOn = value.channels?.includes('sms');

  return (
    <SectionCard
      icon={<BellRing className="w-4 h-4" />}
      title={t('tfAlert')}
      subtitle={t('tfAlertHint')}
      accent="blue"
      badge={value.enabled ? (
        <span className="px-1.5 py-0.5 rounded bg-[#3b82f6]/15 text-[#60a5fa] text-[10px] font-bold uppercase">
          {t('tfAlertOn')}
        </span>
      ) : null}
      testid="trade-alert-section"
    >
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
          className="w-4 h-4 accent-primary"
          data-testid="trade-alert-enabled"
        />
        <span className="text-sm font-semibold">{t('tfAlertEnable')}</span>
      </label>

      {value.enabled && (
        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('tfAlertLevels')}
            </Label>
            <div className="mt-1 flex gap-1.5">
              {LEVELS.map((lv) => (
                <Chip
                  key={lv.id}
                  active={value.on?.includes(lv.id)}
                  onClick={() => toggleIn('on', lv.id)}
                  testid={`trade-alert-level-${lv.id}`}
                >
                  {t(lv.labelKey)}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('tfAlertChannels')}
            </Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {CHANNELS.map((c) => (
                <Chip
                  key={c.id}
                  active={value.channels?.includes(c.id)}
                  muted={!available(c.id)}
                  onClick={() => toggleIn('channels', c.id)}
                  testid={`trade-alert-channel-${c.id}`}
                >
                  {t(c.labelKey)}
                  {!available(c.id) && ` · ${t('tfChannelUnavailable')}`}
                </Chip>
              ))}
            </div>
          </div>

          {smsOn && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tfAlertPhone')}
              </Label>
              <Input
                value={value.phone || ''}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="+34600000000"
                className="mt-1 max-w-xs"
                data-testid="trade-alert-phone"
              />
              <div className="text-[10px] text-muted-foreground mt-0.5">{t('tfAlertPhoneHint')}</div>
              {!available('sms') && (
                <p className="text-[11px] text-[#f59e0b] mt-1.5 flex items-start gap-1">
                  <Info className="w-3 h-3 shrink-0 mt-0.5" />
                  {t('tfSmsUnavailable')}
                </p>
              )}
            </div>
          )}

          {status !== 'open' && (
            <p className="text-[11px] text-muted-foreground">{t('tfAlertOnlyOpen')}</p>
          )}
          {!hasLevels && (
            <p className="text-[11px] text-[#f59e0b]">{t('tfAlertNeedsLevels')}</p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function Chip({ active, muted, onClick, children, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
        active
          ? 'bg-primary/15 text-primary border-primary/40'
          : `border-border hover:text-foreground ${muted ? 'text-muted-foreground/60' : 'text-muted-foreground'}`
      }`}
    >
      {children}
    </button>
  );
}
