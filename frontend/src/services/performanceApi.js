import axios from 'axios';
import { useAuthStore } from '@/lib/store';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

// Se exporta para que otros clientes —el del plan, el de la cartera— reusen
// el interceptor de refresco silencioso en vez de duplicarlo. Un segundo
// axios sin ese interceptor cierra la sesión al primer 401.
export const client = axios.create({ baseURL: API || undefined, timeout: 15000, withCredentials: true });

// Auto-attach the JWT bearer from the auth store
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, attempt a silent token refresh via the httpOnly cookie first.
// Only log out if the refresh also fails (truly expired session).
client.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err?.response?.status === 401 && !err.config?._retried) {
      err.config._retried = true;
      try {
        const newToken = await useAuthStore.getState().silentRefresh?.();
        if (newToken) {
          err.config.headers.Authorization = `Bearer ${newToken}`;
          return client.request(err.config);
        }
      } catch { /* no-op */ }
      // Only log out if the refresh actually invalidated the session. A null from
      // silentRefresh can also mean a refresh is already in flight (concurrent 401s)
      // or a transient network error — keep the session in those cases.
      if (!useAuthStore.getState().isAuthenticated) {
        try { useAuthStore.getState().logout?.(); } catch { /* no-op */ }
      }
    }
    return Promise.reject(err);
  },
);

import { bumpData } from '@/lib/dataVersion';

/**
 * Performance / Trade Journal API client. All endpoints require auth.
 *
 * Every write signals the `trades` topic (lib/dataVersion.js) so anything
 * showing journal data refreshes itself — the dashboard stats, the analytics
 * and the calendar all used to keep stale numbers until a full page reload.
 */

export async function createTrade(payload) {
  const { data } = await client.post('/performance/trades', payload);
  bumpData('trades');
  return data;
}

export async function listTrades(params = {}) {
  const { data } = await client.get('/performance/trades', { params });
  return data;
}

/**
 * El diario completo, en CSV o Excel, generado por el servidor.
 *
 * No es lo mismo que el botón de exportar de siempre. Aquél serializaba lo que
 * el navegador tenía en memoria, y el diario se carga con `limit: 200`: quien
 * tuviera 250 operaciones se descargaba 200 **creyendo que las tenía todas**.
 * Esta ruta las lee en el servidor (hasta 10.000) y además sabe hacer `.xlsx`,
 * que en el cliente habría que implementar.
 *
 * `responseType: 'blob'` es obligatorio: sin él, axios intenta interpretar el
 * binario del Excel como texto y el fichero llega corrupto.
 */
export async function exportTrades({ format = 'csv', ...filtros } = {}) {
  const res = await client.get('/performance/export', {
    params: { format, ...filtros },
    responseType: 'blob',
  });
  // El nombre lo decide el servidor en Content-Disposition; si un proxy se lo
  // come, se compone aquí en vez de dejar al usuario un fichero sin nombre.
  const cd = res.headers?.['content-disposition'] || '';
  const m = /filename="?([^"]+)"?/.exec(cd);
  const sello = new Date().toISOString().slice(0, 10);
  return {
    blob: res.data,
    filename: m ? m[1] : `trade-journal-${sello}.${format === 'excel' ? 'xlsx' : 'csv'}`,
  };
}

export async function getTrade(id) {
  const { data } = await client.get(`/performance/trades/${id}`);
  return data;
}

export async function updateTrade(id, payload) {
  const { data } = await client.put(`/performance/trades/${id}`, payload);
  bumpData('trades');
  return data;
}

export async function deleteTrade(id) {
  const { data } = await client.delete(`/performance/trades/${id}`);
  bumpData('trades');
  return data;
}

/**
 * La analítica del diario. Con `product`, sólo la de ese producto.
 *
 * El filtro viaja al BACKEND en vez de recortar aquí lo recibido, porque las
 * cifras que importan —curva de equity, drawdown, Sharpe— no se pueden
 * recalcular desde el resultado ya agregado: hay que volver a construirlas
 * desde las operaciones de ese producto.
 */
export async function fetchAnalytics(product) {
  const { data } = await client.get('/performance/analytics', {
    params: product ? { product } : undefined,
  });
  return data;
}

export async function bulkCreateTrades(trades) {
  const { data } = await client.post('/performance/trades/bulk', { trades });
  bumpData('trades');
  return data;
}

/**
 * Qué canales de aviso están operativos ahora mismo.
 *
 * El formulario lo pregunta para poder marcar SMS como no disponible en vez de
 * ofrecer una casilla que no hace nada. Si la llamada falla se ofrece todo: la
 * alerta se guarda igual y el resultado por canal queda escrito al dispararse,
 * que es donde de verdad se comprueba.
 */
export async function getNotifyChannels() {
  const { data } = await client.get('/alerts/channels');
  return data;
}

/**
 * ¿El backend que hay delante conoce el catálogo de productos?
 *
 * El frontend se publica solo al mergear a `main`; el backend se despliega a
 * mano. Esa asimetría hace que, durante un rato, el navegador vaya por delante
 * del servidor — y un formulario que ofrece CFD contra un backend que sólo
 * acepta `spot` y `option` no degrada: da 422 y el usuario no puede guardar
 * nada.
 *
 * `GET /performance/instruments` existe **sólo** en la versión que entiende los
 * productos, así que sirve de sonda: es pública, no toca la base de datos y se
 * pregunta una vez por sesión.
 *
 * Sólo un 404/405 —el servidor contesta, pero esa ruta no existe— se interpreta
 * como "backend anterior". Un fallo de red o un 5xx devuelven `null`: no se sabe,
 * y ante la duda se ofrece todo. Recortar la aplicación por un corte de red
 * sería peor que el problema que esto evita.
 */
let _instrumentsSupport = null;   // Promise<boolean|null>, memoizada por sesión

export function backendSupportsProducts() {
  if (!_instrumentsSupport) {
    _instrumentsSupport = client.get('/performance/instruments')
      .then(() => true)
      .catch((err) => ([404, 405].includes(err?.response?.status) ? false : null));
  }
  return _instrumentsSupport;
}
