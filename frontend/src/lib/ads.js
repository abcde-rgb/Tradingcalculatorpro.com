/**
 * Google AdSense en la SPA: configuración, consentimiento y carga del script.
 *
 * La regla de quién ve anuncios vive en `adsPolicy.js` (módulo puro). Aquí sólo
 * se le da a esa función los datos de React: sesión, consentimiento y ruta.
 *
 * Si `REACT_APP_ADSENSE_CLIENT` no está definido, TODO esto queda inerte: no se
 * inyecta script, no se pinta hueco y no hay diferencia visible con la web de
 * antes. Es el estado por defecto en local y en cualquier build sin la variable.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from './store';
import { useIsPremium } from './premium';
import {
  AD_FREE_KEY,
  CONSENT_KEY,
  isAdFree,
  shouldShowAds,
} from './adsPolicy';

/** ID de editor (`ca-pub-…`). El `.trim()` no es cosmético: un `\n` al final del secreto rompe la URL del script. */
export const ADSENSE_CLIENT = (process.env.REACT_APP_ADSENSE_CLIENT || '').trim();

/**
 * `google` cuando el consentimiento lo gestiona la CMP certificada de Google
 * (AdSense → Privacidad y mensajes). Vacío = manda nuestro banner de cookies.
 */
export const ADSENSE_CMP = (process.env.REACT_APP_ADSENSE_CMP || '').trim().toLowerCase();

/**
 * Bloques de anuncio creados en el panel de AdSense. Un hueco sin ID configurado
 * simplemente no se pinta, así que se puede desplegar posición a posición.
 */
export const AD_SLOTS = {
  article: (process.env.REACT_APP_ADSENSE_SLOT_ARTICLE || '').trim(),
  bottom: (process.env.REACT_APP_ADSENSE_SLOT_BOTTOM || '').trim(),
};

/** Evento propio: el banner de cookies avisa de un cambio de consentimiento. */
export const CONSENT_EVENT = 'tcp:consent';

export function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

/** Consentimiento actual, reactivo al banner y a otras pestañas. */
export function useConsent() {
  const [consent, setConsent] = useState(readConsent);

  useEffect(() => {
    const sync = (e) => {
      if (e && e.type === 'storage' && e.key && e.key !== CONSENT_KEY) return;
      setConsent(readConsent());
    };
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return consent;
}

/**
 * Inyecta el script de AdSense una sola vez, y sólo cuando ya se ha decidido
 * que este visitante puede ver anuncios. Cargarlo "por si acaso" desde
 * `index.html` sería exactamente lo que no queremos: un suscriptor acabaría
 * hablando con la red publicitaria sin ver un solo anuncio.
 */
export function loadAdSenseScript() {
  if (!ADSENSE_CLIENT || typeof document === 'undefined') return;
  if (document.querySelector('script[data-tcp-ads]')) return;

  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
  s.setAttribute('data-tcp-ads', '1');
  document.head.appendChild(s);
}

/**
 * Estado de sesión relevante para la publicidad.
 * `resolved` es `false` mientras hay sesión iniciada pero todavía no se sabe si
 * paga (recarga de página + refresh silencioso): hasta saberlo, no hay anuncios.
 */
function useAdAudience() {
  const { user, isAuthenticated } = useAuthStore();
  const isPremium = useIsPremium();
  return {
    isPremium,
    isAdmin: Boolean(user?.is_admin),
    resolved: !isAuthenticated || Boolean(user),
  };
}

/**
 * ¿Se pinta este hueco? Devuelve también el `slot` para no repetir la búsqueda.
 * @param {'article'|'bottom'} placement
 */
export function useAdsEnabled(placement = 'article') {
  const { pathname } = useLocation();
  const consent = useConsent();
  const { isPremium, isAdmin, resolved } = useAdAudience();

  const slot = AD_SLOTS[placement] || '';
  const allowed = shouldShowAds({
    clientId: ADSENSE_CLIENT,
    consent,
    isPremium,
    isAdmin,
    resolved,
    pathname,
    cmp: ADSENSE_CMP,
  });

  return { enabled: Boolean(allowed && slot), slot };
}

/**
 * Deja constancia en `localStorage` de si este dispositivo es de un suscriptor.
 * Las páginas estáticas del postbuild (`/tools/…`, `/learn/…`, `/markets/…`,
 * `/options/estrategias/…`) no tienen sesión: esta marca es lo único que les
 * permite respetar la promesa de "premium sin anuncios" cuando el usuario
 * aterriza en ellas desde un buscador.
 */
export function useAdFreeMarker() {
  const { isPremium, isAdmin, resolved } = useAdAudience();

  const sync = useCallback(() => {
    if (!resolved) return; // no se sabe: no se toca la marca previa
    try {
      localStorage.setItem(AD_FREE_KEY, isAdFree({ isPremium, isAdmin }) ? 'off' : 'on');
    } catch {
      /* modo privado sin almacenamiento: el peor caso es ver anuncios */
    }
  }, [isPremium, isAdmin, resolved]);

  useEffect(sync, [sync]);
}
