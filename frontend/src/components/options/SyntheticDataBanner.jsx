import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Aviso inequívoco de que lo que se está pintando NO son datos de mercado.
 *
 * Cuando el proveedor no devuelve cadena real, el backend cae a
 * `generate_options_chain`: IV de una sonrisa teórica alrededor de un 30 % fijo,
 * spread bid/ask del 2.5 % y volumen e interés abierto GENERADOS. Antes esa
 * respuesta viajaba sin ninguna bandera, así que el usuario podía estar mirando
 * un skew fabricado o recibir una recomendación de iron condor valorada con
 * precios que no existen, sin saberlo.
 *
 * Se renderiza sólo si `synthetic` es cierto: si no, no ocupa nada.
 */
export default function SyntheticDataBanner({ synthetic, className = '' }) {
  const { t } = useTranslation();
  if (!synthetic) return null;

  return (
    <div
      role="alert"
      data-testid="synthetic-data-banner"
      className={`flex items-start gap-3 p-3 rounded-lg border border-[#f59e0b]/50 bg-[#f59e0b]/10 ${className}`}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#f59e0b]" />
      <div className="text-sm">
        <p className="font-semibold text-[#f59e0b]">{t('syntheticDataTitle')}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{t('syntheticDataBody')}</p>
      </div>
    </div>
  );
}
