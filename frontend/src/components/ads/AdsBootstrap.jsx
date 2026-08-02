import { useAdFreeMarker } from '@/lib/ads';

/**
 * No pinta nada: mantiene al día la marca `tcp-ads` de `localStorage` con el
 * estado de suscripción del visitante.
 *
 * Va montado en toda la app (no sólo donde hay anuncios) porque el sitio en el
 * que un suscriptor se encuentra publicidad no es la SPA —ahí el hook lo sabe
 * todo— sino las páginas estáticas de SEO, que no tienen sesión. Esa marca es
 * el único puente entre ambas. Se escribe siempre que el usuario entra, sale o
 * cambia de plan.
 */
export default function AdsBootstrap() {
  useAdFreeMarker();
  return null;
}
