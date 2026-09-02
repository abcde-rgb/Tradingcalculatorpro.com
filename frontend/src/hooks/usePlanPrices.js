import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * El precio de cada plan, tomado de donde de verdad se cobra.
 *
 * El problema que resuelve
 * -----------------------
 * El importe estaba escrito en **41 sitios**: `SUBSCRIPTION_PLANS` en
 * `backend/server.py` —que es lo que Stripe cobra— y cuatro claves i18n
 * (`monthlyPrice`, `quarterlyPrice`, `annualPrice`, `lifetimePrice`) en los diez
 * idiomas. La página de precios pintaba las claves y **nunca preguntaba al
 * backend**, así que el único importe con autoridad era el único que la web no
 * leía. Subir un precio significaba editar doce ficheros y confiar en no
 * olvidar ninguno; olvidarse de uno es anunciar un precio y cobrar otro.
 *
 * Ahora manda `/api/plans`, que devuelve `SUBSCRIPTION_PLANS` tal cual. Las
 * claves i18n siguen existiendo como **respaldo** para cuando no hay backend
 * (build sin `REACT_APP_BACKEND_URL`, red caída, modo demo): mejor un precio
 * viejo que un hueco donde va el precio. Y para que ese respaldo no se pudra en
 * silencio, `scripts/check-precios.py` falla en CI si deja de coincidir con el
 * backend.
 *
 * Caché a nivel de módulo, como en `useRiskFreeRate`: el precio no cambia
 * durante una sesión y hay tres pantallas que lo piden.
 */

let cached = null;
let inFlight = null;

async function loadPlans() {
  if (cached) return cached;
  if (!API) return null;
  if (!inFlight) {
    inFlight = fetch(`${API}/api/plans`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // Sólo se acepta si trae la forma esperada. Media respuesta es peor que
        // ninguna: dejaría unos planes con precio del servidor y otros del
        // respaldo, que es la incoherencia que veníamos a quitar.
        if (d && typeof d === 'object' && typeof d.monthly?.price === 'number') cached = d;
        return cached;
      })
      .catch(() => null)
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

/** Punto de costura para las pruebas: permite fijar los planes sin red. */
export function __setPlanCache(value) {
  cached = value;
}

/**
 * Formatea un importe en el idioma activo.
 *
 * `-u-nu-latn` fuerza dígitos latinos: sin eso, en árabe `Intl` devuelve
 * ٱلْأَرْقَام العربية y el precio dejaría de casar con el resto de cifras de la web,
 * que van todas en `tabular-nums` latinas.
 */
function formatear(importe, moneda, locale) {
  try {
    return new Intl.NumberFormat(`${locale || 'es'}-u-nu-latn`, {
      style: 'currency',
      currency: moneda || 'EUR',
      minimumFractionDigits: Number.isInteger(importe) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(importe);
  } catch (_) {
    // Motor sin ese locale o moneda desconocida: se pierde el formato, no el dato.
    return `${importe} ${moneda || 'EUR'}`;
  }
}

export function usePlanPrices() {
  const { t, locale } = useTranslation();
  const [planes, setPlanes] = useState(cached);

  useEffect(() => {
    let vivo = true;
    if (!cached) {
      loadPlans().then((d) => { if (vivo && d) setPlanes(d); });
    }
    return () => { vivo = false; };
  }, []);

  /** El precio del plan, ya formateado. Nunca devuelve vacío. */
  const precio = (planId) => {
    const p = planes?.[planId];
    if (p && typeof p.price === 'number') return formatear(p.price, p.currency, locale);
    return t(`${planId}Price`);          // respaldo i18n
  };

  /** El importe crudo, para cuando hace falta el número y no el texto. */
  const importe = (planId) => {
    const p = planes?.[planId];
    return p && typeof p.price === 'number' ? p.price : null;
  };

  return {
    precio,
    importe,
    planes,
    /** false = se está pintando el respaldo i18n, no lo que cobra el backend. */
    delServidor: Boolean(planes),
  };
}

export default usePlanPrices;
