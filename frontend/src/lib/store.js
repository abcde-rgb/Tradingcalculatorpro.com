import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useI18nStore } from '@/lib/i18n';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

const DEMO_USER = { id: 'demo', name: 'Demo Trader', email: 'demo@btccalc.pro', plan: 'premium', is_admin: true, is_premium: true, subscription_plan: 'lifetime' };
const DEMO_TOKEN = 'demo-token';

const t = (key) => useI18nStore.getState().t(key);

function trackEvent(eventName, params = {}) {
  try { window.gtag?.('event', eventName, params); } catch (_) {}
}

async function safeJson(res) {
  const clone = res.clone();
  try {
    return await res.json();
  } catch {
    const text = await clone.text();
    throw new Error(text || `Error HTTP ${res.status}`);
  }
}

function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
    .catch((err) => {
      if (err.name === 'AbortError') throw new Error('La solicitud tardó demasiado. El servidor puede estar iniciando, inténtalo de nuevo.');
      throw err;
    });
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        if (email === 'demo@btccalc.pro' && password === '1234') {
          set({ user: DEMO_USER, token: DEMO_TOKEN, isAuthenticated: true, isLoading: false });
          return { success: true };
        }
        if (!API) {
          return { success: false, error: t('backendNotConfigured') };
        }
        set({ isLoading: true });
        try {
          const res = await fetchWithTimeout(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || t('invalidCredentials'));
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          trackEvent('login', { method: 'email' });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const msg = (error.name === 'TypeError' || error.message === 'Failed to fetch')
            ? 'No se puede conectar al servidor. Comprueba tu conexión o intenta de nuevo.'
            : error.message;
          return { success: false, error: msg };
        }
      },

      register: async (name, email, password) => {
        if (!API) {
          return { success: false, error: t('backendNotConfigured') };
        }
        set({ isLoading: true });
        try {
          const res = await fetchWithTimeout(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || t('registrationError'));
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          trackEvent('sign_up', { method: 'email' });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      loginWithGoogle: async (credential) => {
        if (!API) {
          return { success: false, error: t('backendNotConfigured') };
        }
        set({ isLoading: true });
        try {
          const res = await fetch(`${API}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || t('googleLoginError'));
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          trackEvent('login', { method: 'google' });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        const token = get().token;
        if (API && token && token !== DEMO_TOKEN) {
          try {
            await fetch(`${API}/auth/logout`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
            });
          } catch (_) {}
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        const token = get().token;
        if (!token || !API || token === DEMO_TOKEN) return;
        try {
          const res = await fetch(`${API}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const user = await safeJson(res);
            set({ user });
          }
        } catch (_) {}
      }
    }),
    {
      name: 'btc-auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export const usePriceStore = create((set) => ({
  prices: null,
  isLoading: false,

  fetchPrices: async () => {
    if (!API) return;
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/prices`);
      const data = await safeJson(res);
      set({ prices: data, isLoading: false });
    } catch (_) {
      set({ isLoading: false });
    }
  }
}));

export const useCalculatorStore = create((set, get) => ({
  history: [],
  isLoading: false,

  saveCalculation: async (calculatorType, inputs, results) => {
    const token = useAuthStore.getState().token;
    if (!token || !API || token === DEMO_TOKEN) return;
    try {
      await fetch(`${API}/calculations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ calculator_type: calculatorType, inputs, results })
      });
    } catch (_) {}
  },

  fetchHistory: async () => {
    const token = useAuthStore.getState().token;
    if (!token || !API || token === DEMO_TOKEN) return;
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/calculations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeJson(res);
      set({ history: data, isLoading: false });
    } catch (_) {
      set({ isLoading: false });
    }
  }
}));

export const useTradingJournalStore = create(
  persist(
    (set, get) => ({
      trades: [],

      addTrade: (trade) => {
        set({ trades: [{ id: Date.now().toString(), ...trade, createdAt: new Date().toISOString() }, ...get().trades] });
      },

      updateTrade: (id, updates) => {
        set({ trades: get().trades.map(t => t.id === id ? { ...t, ...updates } : t) });
      },

      deleteTrade: (id) => {
        set({ trades: get().trades.filter(t => t.id !== id) });
      },

      getStats: () => {
        const trades = get().trades.filter(t => t.status === 'closed');
        const wins = trades.filter(t => t.pnl > 0);
        const losses = trades.filter(t => t.pnl <= 0);
        return {
          totalTrades: trades.length,
          wins: wins.length,
          losses: losses.length,
          winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
          totalPnl: trades.reduce((s, t) => s + (t.pnl || 0), 0),
          avgWin: wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
          avgLoss: losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0
        };
      }
    }),
    { name: 'trading-journal-storage' }
  )
);
