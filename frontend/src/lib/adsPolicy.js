/**
 * Política de anuncios: QUIÉN ve publicidad y DÓNDE.
 *
 * Módulo puro y SIN imports a propósito. Es la única fuente de verdad de la
 * regla, y lo consumen tres sitios que no comparten runtime:
 *   - `lib/ads.js`            → el hook de React que decide en la SPA.
 *   - `scripts/gen-seo-pages.js` → las páginas estáticas del postbuild, que no
 *     tienen React y llevan una copia del criterio en JavaScript plano.
 *   - `scripts/ads-check.js`  → verificador offline que fija estas reglas.
 *
 * Las dos reglas que no se negocian:
 *   1. **Quien paga no ve anuncios en NINGUNA parte**, tampoco cuando lee el
 *      contenido gratuito. No basta con no pintar el `<ins>`: con `shouldShowAds`
 *      en `false` ni siquiera se descarga el script de AdSense, así que el
 *      navegador de un suscriptor no habla con la red publicitaria.
 *   2. **Lista blanca de rutas.** Un anuncio sólo puede aparecer donde diga
 *      `AD_SURFACES`. Si mañana alguien suelta un `<AdSlot>` en el dashboard,
 *      no se pinta: hay que declararlo aquí primero, y eso obliga a pensarlo.
 */

/** localStorage: elección del banner de cookies ('all' | 'essential' | null). */
export const CONSENT_KEY = 'tcp-cookie-consent';

/**
 * localStorage: 'off' cuando el visitante tiene suscripción activa.
 * Lo escribe la SPA (ver `useAdFreeMarker`) y lo leen las páginas ESTÁTICAS
 * del postbuild, que no tienen sesión ni pueden preguntar al backend. Es el
 * único modo de que un premium que aterrice en `/learn/...` desde Google
 * tampoco vea anuncios.
 */
export const AD_FREE_KEY = 'tcp-ads';

/**
 * Rutas de la SPA donde se permite publicidad: la referencia pública de
 * opciones. Todo lo demás queda fuera por defecto, y en particular:
 *   - el workspace de pago (`/options/calculator`, `/dashboard`, `/performance`)
 *   - las páginas de conversión y de trámite (`/pricing`, `/login`, `/payment/*`)
 *   - las legales (`/legal`, `/contact`, `/about`), que además son texto fino y
 *     AdSense penaliza los anuncios sobre páginas sin contenido propio.
 */
export const AD_SURFACES = [
  /^\/options\/?$/,
  /^\/options\/strategies\/?$/,
  /^\/options\/strategies\/[^/]+\/?$/,
];

/** ¿Esta ruta admite anuncios? Deniega por defecto. */
export function isAdSurface(pathname) {
  if (typeof pathname !== 'string' || !pathname) return false;
  const clean = pathname.split('?')[0].split('#')[0];
  return AD_SURFACES.some((re) => re.test(clean));
}

/**
 * Decisión única. Todas las condiciones son necesarias.
 *
 * @param {string}  clientId  ID de editor de AdSense (`ca-pub-…`). Vacío = ads apagados.
 * @param {string}  consent   Valor guardado del banner de cookies.
 * @param {boolean} isPremium Suscripción activa (incluye el trial).
 * @param {boolean} isAdmin   Administrador: se le trata como premium.
 * @param {boolean} resolved  ¿Se conoce ya el estado de la sesión? Si hay sesión
 *                            pero aún no se sabe si paga, NO se pintan anuncios:
 *                            un premium no puede ver ni un parpadeo.
 * @param {string}  pathname  Ruta actual.
 * @param {string}  cmp       'google' si la gestión del consentimiento la lleva
 *                            la plataforma de mensajes de Google (CMP
 *                            certificada); entonces es ella quien bloquea, no
 *                            nuestro banner.
 */
export function shouldShowAds({
  clientId = '',
  consent = null,
  isPremium = false,
  isAdmin = false,
  resolved = true,
  pathname = '',
  cmp = '',
} = {}) {
  if (!clientId) return false;
  if (!resolved) return false;
  if (isPremium || isAdmin) return false;
  if (!isAdSurface(pathname)) return false;
  return consent === 'all' || cmp === 'google';
}

/** ¿Este visitante es de los que nunca ven publicidad? */
export function isAdFree({ isPremium = false, isAdmin = false } = {}) {
  return Boolean(isPremium || isAdmin);
}
