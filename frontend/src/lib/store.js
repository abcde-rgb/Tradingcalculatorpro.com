import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

function trackEvent(eventName, params = {}) {
  try { window.gtag?.('event', eventName, params); } catch (_) {}
}

const DEMO_USER = { id: 'demo', name: 'Demo Trader', email: 'demo@btccalc.pro', plan: 'premium', is_admin: true, is_premium: true, subscription_plan: 'lifetime' };
const DEMO_TOKEN = 'demo-token';

// Helper para leer respuesta de forma segura sin error "body stream already read"
async function safeJson(res) {
  const clone = res.clone();
  try {
    return await res.json();
  } catch {
    const text = await clone.text();
    throw new Error(text || `Error HTTP ${res.status}`);
  }
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        if (!API) {
          await new Promise(r => setTimeout(r, 400));
          if (email === 'demo@btccalc.pro' && password === '1234') {
            set({ user: DEMO_USER, token: DEMO_TOKEN, isAuthenticated: true, isLoading: false });
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, error: 'Preview mode: usa demo@btccalc.pro / 1234' };
        }
        try {
          const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || 'Error de login');
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          trackEvent('login', { method: 'email' });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        if (!API) {
          await new Promise(r => setTimeout(r, 400));
          const demoUser = { ...DEMO_USER, name, email };
          set({ user: demoUser, token: DEMO_TOKEN, isAuthenticated: true, isLoading: false });
          return { success: true };
        }
        try {
          const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || 'Error de registro');
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          trackEvent('sign_up', { method: 'email' });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      /**
       * Sign in with the Google ID token returned by `<GoogleLogin>`.
       * Backend verifies the signature against Google's certs, then returns
       * our own JWT and user object — same shape as `login` / `register`.
       */
      loginWithGoogle: async (credential) => {
        set({ isLoading: true });
        if (!API) {
          set({ isLoading: false });
          return { success: false, error: 'Google login no disponible en preview' };
        }
        try {
          const res = await fetch(`${API}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || 'Error con Google');
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
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Auth refresh failed:', error);
          }
        }
      }
    }),
    {
      name: 'btc-auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token === DEMO_TOKEN) {
          state.user = { ...DEMO_USER, ...state.user, ...DEMO_USER };
        }
      },
    }
  )
);

export const usePriceStore = create((set) => ({
  prices: null,
  isLoading: false,

  fetchPrices: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/prices`);
      const data = await safeJson(res);
      set({ prices: data, isLoading: false });
    } catch (error) {
      // ✅ PRODUCTION FIX: Removed console.error
      set({ isLoading: false });
    }
  }
}));

export const useCalculatorStore = create((set, get) => ({
  history: [],
  isLoading: false,

  saveCalculation: async (calculatorType, inputs, results) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      await fetch(`${API}/calculations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ calculator_type: calculatorType, inputs, results })
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error saving calculation:', error);
      }
      // Silent fail for calculation save
    }
  },

  fetchHistory: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/calculations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeJson(res);
      set({ history: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  }
}));

// Store para el diario de trading
export const useTradingJournalStore = create(
  persist(
    (set, get) => ({
      trades: [],
      
      addTrade: (trade) => {
        const newTrade = {
          id: Date.now().toString(),
          ...trade,
          createdAt: new Date().toISOString()
        };
        set({ trades: [newTrade, ...get().trades] });
      },
      
      updateTrade: (id, updates) => {
        set({
          trades: get().trades.map(trade => 
            trade.id === id ? { ...trade, ...updates } : trade
          )
        });
      },
      
      deleteTrade: (id) => {
        set({ trades: get().trades.filter(trade => trade.id !== id) });
      },
      
      getStats: () => {
        const trades = get().trades.filter(t => t.status === 'closed');
        const wins = trades.filter(t => t.pnl > 0);
        const losses = trades.filter(t => t.pnl <= 0);
        const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        
        return {
          totalTrades: trades.length,
          wins: wins.length,
          losses: losses.length,
          winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
          totalPnl,
          avgWin: wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
          avgLoss: losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0
        };
      }
    }),
    { name: 'trading-journal-storage' }
  )
);
