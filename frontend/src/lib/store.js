import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useI18nStore } from '@/lib/i18n';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

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
  // Always include credentials so httpOnly cookies are sent cross-origin
  return fetch(url, { credentials: 'include', ...options, signal: controller.signal })
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
      _isRefreshing: false,

      login: async (email, password) => {
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
          // 2FA enabled: password verified but a TOTP code is still required.
          if (data.totp_required && data.pending_token) {
            set({ isLoading: false });
            return { success: false, totpRequired: true, pendingToken: data.pending_token };
          }
          if (!data.token || !data.user) throw new Error(t('invalidCredentials'));
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

      verify2fa: async (pendingToken, code) => {
        if (!API) return { success: false, error: t('backendNotConfigured') };
        set({ isLoading: true });
        try {
          const res = await fetchWithTimeout(`${API}/auth/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pending_token: pendingToken, code }),
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || 'Código incorrecto');
          if (!data.token || !data.user) throw new Error('Código incorrecto');
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          trackEvent('login', { method: 'email_2fa' });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
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
          if (!data.token || !data.user) throw new Error(t('registrationError'));
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
          const res = await fetchWithTimeout(`${API}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || t('googleLoginError'));
          if (!data.token || !data.user) throw new Error(t('googleLoginError'));
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
        if (API) {
          try {
            await fetchWithTimeout(`${API}/auth/logout`, {
              method: 'POST',
              headers: token && token !== DEMO_TOKEN ? { 'Authorization': `Bearer ${token}` } : {},
            });
          } catch (_) {}
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      // Silently exchange refresh_token for a new access token.
      // Relies exclusively on the httpOnly refresh_token cookie — no localStorage exposure.
      // Returns the new access token string, or null on failure.
      silentRefresh: async () => {
        const { _isRefreshing, isAuthenticated } = get();
        if (!API || !isAuthenticated || _isRefreshing) return null;
        set({ _isRefreshing: true });
        try {
          const res = await fetchWithTimeout(`${API}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Send empty body: backend reads refresh token from httpOnly cookie only.
            body: JSON.stringify({}),
          });
          if (!res.ok) {
            set({ user: null, token: null, isAuthenticated: false, _isRefreshing: false });
            return null;
          }
          const data = await safeJson(res);
          set({
            token: data.token,
            user: data.user || get().user,
            isAuthenticated: true,
            _isRefreshing: false,
          });
          return data.token;
        } catch (err) {
          // Network timeout or abort — do not clear isAuthenticated (may be transient).
          // But if it was an auth/server error disguised as a network error, leave state
          // consistent so the next attempt can retry via the cookie.
          set({ _isRefreshing: false });
          return null;
        }
      },

      refreshUser: async () => {
        if (!API) return;
        let token = get().token;
        const { isAuthenticated } = get();

        // On page reload token is null (not persisted) but isAuthenticated may be true.
        // Attempt silent refresh via httpOnly cookie before giving up.
        if (!token && isAuthenticated && token !== DEMO_TOKEN) {
          token = await get().silentRefresh();
          if (!token) return;
        }

        if (!token || token === DEMO_TOKEN) return;
        try {
          const res = await fetchWithTimeout(`${API}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.status === 401) {
            const newToken = await get().silentRefresh();
            if (!newToken) return;
            const res2 = await fetchWithTimeout(`${API}/auth/me`, {
              headers: { 'Authorization': `Bearer ${newToken}` },
            });
            if (res2.ok) set({ user: await safeJson(res2) });
            return;
          }
          if (res.ok) {
            const user = await safeJson(res);
            set({ user });
          }
        } catch (_) {}
      }
    }),
    {
      name: 'btc-auth-storage',
      // Neither token is persisted — both live in httpOnly cookies sent by the backend.
      // Only non-sensitive UI state is kept in localStorage.
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
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
        set({ trades: [{ id: crypto.randomUUID(), ...trade, createdAt: new Date().toISOString() }, ...get().trades] });
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
