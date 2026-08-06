import axios from 'axios';
import { useAuthStore } from '@/lib/store';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

const client = axios.create({ baseURL: API || undefined, timeout: 15000, withCredentials: true });

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

export async function fetchAnalytics() {
  const { data } = await client.get('/performance/analytics');
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
