import { useTranslation } from '@/lib/i18n';

/**
 * ¿Este precio es de ahora, o es el último que se pudo conseguir?
 *
 * Existe porque la etiqueta verde «LIVE» del panel de opciones estaba escrita a
 * mano y no dependía de nada: se pintaba igual con un precio de hace un segundo
 * que con uno de ayer. Desde que `/api/stock/{symbol}` tiene detrás la cadena de
 * reserva de `market_data.py`, la respuesta puede venir del último valor bueno
 * conocido — y entonces «LIVE» no es un adorno desactualizado, es una
 * afirmación falsa sobre el número con el que el usuario dimensiona la posición.
 *
 * `market_data.py` lo deja escrito en su cabecera: «A price we could not refresh
 * is returned with stale=True and as_of. The caller MUST surface it.» Esto es
 * ese caller.
 */

/** «hace 4 min», «hace 2 h», «hace 3 d» — o null si no hay marca de tiempo. */
export function edadLegible(asOf, ahora = Date.now()) {
  const ts = Number(asOf);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  // El backend manda segundos epoch (`time.time()`); un Date.now() son milis.
  const segundos = Math.floor((ahora - ts * 1000) / 1000);
  if (segundos < 0) return null;          // reloj del cliente adelantado
  if (segundos < 60) return `${segundos}s`;
  if (segundos < 3600) return `${Math.floor(segundos / 60)}min`;
  if (segundos < 86400) return `${Math.floor(segundos / 3600)}h`;
  return `${Math.floor(segundos / 86400)}d`;
}

export default function EstadoPrecio({ stale, asOf, source, className = '' }) {
  const { t } = useTranslation();

  if (!stale) {
    return (
      <span
        className={`flex items-center gap-1.5 text-[11px] font-semibold text-[#22c55e] ${className}`}
        title={t('precioEnVivoRefrescoCada_73be80')}
        data-testid="estado-precio-vivo"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
        </span>
        LIVE
      </span>
    );
  }

  const edad = edadLegible(asOf);
  return (
    <span
      className={`flex items-center gap-1.5 text-[11px] font-semibold text-amber-500 ${className}`}
      // Sin punto que palpita: lo que palpita dice «esto se está actualizando»,
      // y es justo lo que NO está pasando.
      title={t('precioDesfasadoAviso')}
      data-testid="estado-precio-desfasado"
    >
      <span className="inline-flex rounded-full h-2 w-2 bg-amber-500" />
      {t('precioDesfasado')}
      {edad && (
        <span className="font-mono tabular-nums opacity-80" data-testid="estado-precio-edad">
          · {edad}
        </span>
      )}
      {source && <span className="hidden md:inline opacity-60">({source})</span>}
    </span>
  );
}
