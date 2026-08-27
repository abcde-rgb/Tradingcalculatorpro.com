import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useI18nStore } from '@/lib/i18n';
import { bumpData } from '@/lib/dataVersion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

const DEMO_TOKEN = 'demo-token';

const t = (key) => useI18nStore.getState().t(key);

function trackEvent(eventName, params = {}) {
  try { window.gtag?.('event', eventName, params); } catch (_) {}
}

// Apply a user's saved UI language so it follows the account across sessions/devices.
function applyUserLocale(user) {
  try {
    const loc = user?.preferred_locale;
    if (loc) useI18nStore.getState().setLocale(loc);
  } catch (_) { /* non-fatal: keep current locale */ }
}

// Referral attribution: a visitor who lands on /?ref=CODE has the code stored in
// localStorage (see RefCapture in App.js). On a NEW signup we tell the backend so
// the referee gets linked to the referrer (referred_by_id). Best-effort, never blocks signup.
export const REF_STORAGE_KEY = 'tcp_ref_code';

async function trackReferral(email) {
  if (!API || !email) return;
  let code = '';
  try { code = (localStorage.getItem(REF_STORAGE_KEY) || '').trim(); } catch (_) {}
  if (!code) return;
  try {
    const res = await fetchWithTimeout(`${API}/referrals/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, referee_email: email }),
    });
    if (res.ok) { try { localStorage.removeItem(REF_STORAGE_KEY); } catch (_) {} }
  } catch (_) { /* silencioso: nunca bloquea el registro */ }
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
      if (err.name === 'AbortError') throw new Error(t('requestTimedOut'));
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
          applyUserLocale(data.user);
          trackEvent('login', { method: 'email' });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const msg = (error.name === 'TypeError' || error.message === 'Failed to fetch')
            ? t('cannotReachServer')
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
          if (!res.ok) throw new Error(data.detail || t('invalidCode'));
          if (!data.token || !data.user) throw new Error(t('invalidCode'));
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          applyUserLocale(data.user);
          trackEvent('login', { method: 'email_2fa' });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      register: async (name, email, password, opts = {}) => {
        if (!API) {
          return { success: false, error: t('backendNotConfigured') };
        }
        set({ isLoading: true });
        try {
          const body = { name, email, password };
          if (opts.country) body.country = opts.country;
          if (opts.preferredLocale) body.preferred_locale = opts.preferredLocale;
          const res = await fetchWithTimeout(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || t('registrationError'));
          if (!data.token || !data.user) throw new Error(t('registrationError'));
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          trackEvent('sign_up', { method: 'email' });
          await trackReferral(email);
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      loginWithGoogle: async (credential, opts = {}) => {
        if (!API) {
          return { success: false, error: t('backendNotConfigured') };
        }
        set({ isLoading: true });
        try {
          const body = { credential };
          if (opts.country) body.country = opts.country;
          if (opts.preferredLocale) body.preferred_locale = opts.preferredLocale;
          const res = await fetchWithTimeout(`${API}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || t('googleLoginError'));
          if (!data.token || !data.user) throw new Error(t('googleLoginError'));
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          applyUserLocale(data.user);
          trackEvent('login', { method: 'google' });
          if (data.is_new_user) await trackReferral(data.user?.email);
          return { success: true, isNewUser: !!data.is_new_user };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      /**
       * Instala una sesión ya emitida por el backend.
       *
       * Las passkeys hacen su propia ceremonia contra `/auth/passkey/*` (el
       * navegador tiene que manejar `ArrayBuffer`, que no viaja por este store),
       * así que llegan aquí con el usuario y el token ya resueltos. El estado
       * que se fija es EXACTAMENTE el mismo que en `login` y `loginWithGoogle`:
       * si divergiera, media app creería que hay sesión y la otra media no.
       */
      setSession: (user, token) => {
        set({ user, token, isAuthenticated: true, isLoading: false });
        trackEvent('login', { method: 'passkey' });
      },

      // El usuario fija su propio país e idioma de interfaz. Es lo que mueve el
      // paso de «completa tu perfil» de quien entra con Google, que no trae
      // ninguno de los dos.
      // Update the signed-in user's own profile fields (country / UI language).
      // Powers the "complete your profile" step for Google sign-ups.
      updateProfile: async ({ country, preferredLocale } = {}) => {
        const token = get().token;
        if (!API || !token || token === DEMO_TOKEN) {
          return { success: false, error: t('backendNotConfigured') };
        }
        try {
          const body = {};
          if (country !== undefined) body.country = country;
          if (preferredLocale !== undefined) body.preferred_locale = preferredLocale;
          const res = await fetchWithTimeout(`${API}/auth/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            credentials: 'include',
            body: JSON.stringify(body),
          });
          const data = await safeJson(res);
          if (!res.ok) throw new Error(data.detail || t('registrationError'));
          set((s) => ({ user: { ...s.user, country: data.country, preferred_locale: data.preferred_locale } }));
          if (data.preferred_locale) applyUserLocale({ preferred_locale: data.preferred_locale });
          return { success: true };
        } catch (error) {
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
      const res = await fetch(`${API}/prices`, { credentials: 'include' });
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

  // These two used a bare fetch() and so sent no cookies: after a reload the
  // in-memory token is null and both silently no-op'd. fetchWithTimeout always
  // sets credentials:'include' — same fix already applied to PricingPage,
  // UsageHeatmapCard and the GDPR export.
  saveCalculation: async (calculatorType, inputs, results) => {
    const token = useAuthStore.getState().token;
    if (!API || token === DEMO_TOKEN) return;
    try {
      await fetchWithTimeout(`${API}/calculations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ calculator_type: calculatorType, inputs, results })
      });
      // Tell the calculation-history card to reload instead of waiting for a
      // full page refresh.
      bumpData('calculations');
    } catch (_) {}
  },

  fetchHistory: async () => {
    const token = useAuthStore.getState().token;
    if (!API || token === DEMO_TOKEN) return;
    set({ isLoading: true });
    try {
      const res = await fetchWithTimeout(`${API}/calculations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await safeJson(res);
      /* `safeJson` parsea, pero NO mira `res.ok`: con el token caducado la API
         responde 200-menos con `{"detail": ...}`, un objeto. Guardarlo en
         `history` hacía que el `history.map` de la tarjeta de historial lanzara
         «history.map is not a function», lo recogía el ErrorBoundary y el
         usuario veía «Algo salió mal» nada más entrar en el panel — parecía un
         fallo de inicio de sesión cuando el login había ido bien.
         Lo que no es una lista de cálculos se queda como lista vacía. */
      set({ history: Array.isArray(data) ? data : [], isLoading: false });
    } catch (_) {
      set({ isLoading: false });
    }
  }
}));

/**
 * CONGELADO — solo lectura y borrado. Ver `components/tools/TradingJournal.jsx`.
 *
 * Este store guardaba operaciones en `localStorage` bajo una clave global, sin
 * `user_id`: dos cuentas en el mismo navegador compartían el diario. Ya no
 * acepta escrituras (`addTrade` y `updateTrade` retirados a propósito, no por
 * descuido) para que nadie más guarde aquí datos que va a perder. El diario que
 * persiste es `/performance`.
 *
 * `getStats` también se retiró: era una TERCERA implementación de las
 * estadísticas, con el breakeven contando como pérdida (`pnl <= 0`) y sobre un
 * P&L calculado en nocional. Dos pantallas dando cifras distintas de las mismas
 * operaciones es peor que no dar ninguna.
 */
export const useTradingJournalStore = create(
  persist(
    (set) => ({
      trades: [],

      // Se conserva para que el usuario pueda limpiar el navegador DESPUÉS de
      // exportar. Es la única mutación que queda.
      clearAllTrades: () => {
        set({ trades: [] });
      },
    }),
    { name: 'trading-journal-storage' }
  )
);
