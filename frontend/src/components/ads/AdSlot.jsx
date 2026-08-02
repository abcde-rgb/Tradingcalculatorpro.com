import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { ADSENSE_CLIENT, loadAdSenseScript, useAdsEnabled } from '@/lib/ads';

/**
 * Un bloque de AdSense en el contenido gratuito.
 *
 * No se renderiza NADA cuando el visitante no debe ver publicidad (suscriptor,
 * sin consentimiento, ruta fuera de la lista blanca, o build sin ID de editor):
 * ni el hueco, ni la etiqueta, ni el script. Ver `lib/adsPolicy.js`.
 *
 * Va siempre acompañado del enlace a Premium: es el sitio natural para explicar
 * por qué hay anuncios y cómo quitarlos.
 */
export default function AdSlot({ placement = 'article', className = '' }) {
  const { t } = useTranslation();
  const { enabled, slot } = useAdsEnabled(placement);
  const insRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const ins = insRef.current;
    if (!ins || pushed.current) return;
    // AdSense marca el <ins> en cuanto lo ocupa; volver a encolarlo aquí es lo
    // que provoca el "All ins elements in the DOM with class=adsbygoogle
    // already have ads in them" en cada cambio de ruta de una SPA.
    if (ins.getAttribute('data-adsbygoogle-status')) return;

    loadAdSenseScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* bloqueador de anuncios o script caído: el hueco se queda vacío */
    }
  }, [enabled, slot]);

  if (!enabled) return null;

  return (
    <aside className={`my-8 ${className}`} data-testid={`ad-${placement}`}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
          {t('adsLabel')}
        </span>
        <Link
          to="/pricing"
          className="text-[10px] text-muted-foreground/70 hover:text-primary underline underline-offset-2"
        >
          {t('adsRemove')}
        </Link>
      </div>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 100 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
