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

// Dealer gamma exposure. The backend returns { gex: null, synthetic: true }
// when the chain is modelled — callers must show that instead of a number.
export async function fetchGammaExposure(symbol, expirationIdx = 3) {
  if (!api) return null;
  try {
    const res = await api.get(`/options/gex/${symbol}`, {
      params: { expiration_idx: expirationIdx },
    });
    return res.data;
  } catch (e) {
    return null;
  }
}

export default api;
