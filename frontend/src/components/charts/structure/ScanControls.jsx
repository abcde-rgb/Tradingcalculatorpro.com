import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

/**
 * Paso 1 del escáner: qué vela y cuánto histórico.
 *
 * Las dos filas son dependientes: los históricos ofrecidos son solo los que la
 * vela seleccionada puede servir de verdad. El proveedor rechaza la mayoría de
 * combinaciones, y una combinación rechazada llegaba antes a la pantalla como
 * "sin estructura relevante", que es indistinguible de un gráfico plano.
 */
export default function ScanControls({
  ladder, periods, tfInterval, activePeriod, loading, disabled,
  onInterval, onPeriod, onRescan, lastScanAt,
}) {
  const { t } = useTranslation();
  // Cuánto hace que se leyó. Es la diferencia entre "esto está al día" y
  // "esto lleva media hora congelado", y sin decirlo las dos se ven igual.
  //
  // Hace falta un reloj: calculado sólo al renderizar, el rótulo se congela en
  // «hace menos de un minuto» y no vuelve a moverse mientras nadie toque nada
  // — que es justo cuando el aviso haría falta. Un tic por minuto basta y no
  // repinta más de lo necesario.
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!lastScanAt) return undefined;
    const id = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(id);
  }, [lastScanAt]);
  const ageMin = lastScanAt ? Math.floor((ahora - lastScanAt) / 60000) : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {t('structTfCandle')}
        </span>
        <div className="flex gap-1 bg-muted rounded-md border border-border p-0.5 flex-wrap" role="group">
          {ladder.map((r) => (
            <button
              key={r.interval}
              type="button"
              onClick={() => onInterval(r.interval)}
              className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                tfInterval === r.interval
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`struct-interval-${r.interval}`}
            >
              {r.interval}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {t('structTfHistory')}
        </span>
        <div className="flex gap-1 bg-muted rounded-md border border-border p-0.5 flex-wrap" role="group">
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriod(p)}
              className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                activePeriod === p
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`struct-period-${p}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={onRescan}
        disabled={loading || disabled}
        size="sm"
        variant="outline"
        className="ml-auto"
        data-testid="struct-rescan-btn"
      >
        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? t('livePatternScanning') : t('structScanRescan')}
      </Button>
      {/* De cuándo es lo que se está viendo. Va junto al botón de releer porque
          es la respuesta a la pregunta que hace pulsarlo. */}
      {ageMin != null && !loading && (
        <span className="text-[10px] text-muted-foreground w-full text-right -mt-1" data-testid="struct-scan-age">
          {ageMin < 1 ? t('structScannedJustNow') : t('structScannedAgo').replace('{n}', String(ageMin))}
        </span>
      )}
    </div>
  );
}

/**
 * Los avisos honestos, juntos y encima de los números que modifican:
 * el backend reescribió la petición, la vela se compone en vez de servirse, o
 * la última vela sigue abierta. Los tres cambian lo que significan las cifras
 * de abajo, así que ninguno puede esconderse.
 */
export function ScanNotices({ data }) {
  const { t } = useTranslation();
  if (!data) return null;

  const adjusted = Array.isArray(data.adjustments) && data.adjustments.length > 0;

  return (
    <>
      {adjusted && (
        <div
          className="text-[11px] rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24] px-2.5 py-1.5"
          data-testid="struct-adjusted"
        >
          {t('structAdjustedNotice')
            .replace('{interval}', data.interval || '')
            .replace('{period}', data.period || '')}
        </div>
      )}
      {data.aggregatedFrom && (
        <div
          className="text-[11px] rounded-md border border-border bg-muted/50 text-muted-foreground px-2.5 py-1.5"
          data-testid="struct-aggregated"
        >
          {t('structAggregatedNotice')
            .replace('{interval}', data.interval || '')
            .replace('{from}', data.aggregatedFrom)}
        </div>
      )}
      {data.lastBarForming && (
        <div
          className="text-[11px] rounded-md border border-border bg-muted/50 text-muted-foreground px-2.5 py-1.5"
          data-testid="struct-forming"
        >
          {t('structLastBarForming')}
        </div>
      )}
    </>
  );
}
