import axios from 'axios';
import { useAuthStore } from '@/lib/store';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

const api = API ? axios.create({ baseURL: API, timeout: 10000, withCredentials: true }) : null;

if (api) {
  api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token && token !== 'demo-token') {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });
}

export async function fetchStock(symbol) {
  if (!api) return null;
  try {
    const res = await api.get(`/stock/${symbol}`);
    return res.data;
  } catch (e) {
    return null;
  }
}

export async function searchTickersAPI(query) {
  if (!api) return [];
  try {
    const res = await api.get(`/tickers/search`, { params: { q: query } });
    return res.data.results || [];
  } catch (e) {
    return [];
  }
}

export async function universalSearchAPI(query, limit = 30) {
  if (!api) return [];
  try {
    const res = await api.get(`/tickers/universal-search`, { params: { q: query, limit } });
    return res.data.results || [];
  } catch (e) {
    return [];
  }
}

export async function fetchExpirations(symbol) {
  if (!api) return null;
  try {
    const res = await api.get(`/options/expirations/${symbol}`);
    return res.data;
  } catch (e) {
    return null;
  }
}

export async function fetchOptionsChain(symbol, expirationIdx = 3) {
  if (!api) return null;
  try {
    const res = await api.get(`/options/chain/${symbol}`, {
      params: { expiration_idx: expirationIdx },
    });
    return res.data;
  } catch (e) {
    return null;
  }
}

/**
 * Several expirations in one request.
 *
 * A calendar, a diagonal or a PMCC needs quotes from two different expiries at
 * once. Asking for them one at a time meant N round trips just to draw one
 * payoff, and the legs could end up priced against chains fetched seconds
 * apart. Returns the `chains` map keyed by expiration index.
 */
export async function fetchOptionsChains(symbol, expirationIdxs = []) {
  if (!api) return null;
  const idxs = [...new Set(expirationIdxs.filter((i) => Number.isInteger(i) && i >= 0))];
  if (idxs.length === 0) return null;
  try {
    const res = await api.get(`/options/chain/${symbol}`, {
      params: { expiration_idxs: idxs.join(',') },
    });
    return res.data;
  } catch (e) {
    return null;
  }
}

export async function calculatePayoff(legs, stockPrice, priceRange = 0.35, daysToChart = 30) {
  if (!api) return null;
  try {
    const res = await api.post('/calculate/payoff', { legs, stockPrice, priceRange, daysToChart });
    return res.data;
  } catch (e) {
    return null;
  }
}

export async function calculateGreeks(legs, stockPrice) {
  if (!api) return null;
  try {
    const res = await api.post('/calculate/greeks', { legs, stockPrice });
    return res.data;
  } catch (e) {
    return null;
  }
}

// Second-order Greeks (vanna, charm) for the current strategy legs.
export async function calculateAdvancedGreeks(legs, stockPrice) {
  if (!api) return null;
  try {
    const res = await api.post('/calculate/greeks-advanced', { legs, stockPrice });
    return res.data;
  } catch (e) {
    return null;
  }
}

// Observed positioning: max pain, GEX, OI profile, put/call ratio, liquidity.
// One endpoint serves all of them because they are all readings of the same
// open interest — there is no separate GEX route to call.
//
// Honesty contract: on a modelled chain the backend returns every reading as
// null with `synthetic: true`. Callers must render that, never a number.
export async function fetchPositioning(symbol, expirationIdx = 3) {
  if (!api) return null;
  try {
    const res = await api.get(`/options/positioning/${symbol}`, {
      params: { expiration_idx: expirationIdx },
    });
    return res.data;
  } catch (e) {
    return null;
  }
}

export default api;
