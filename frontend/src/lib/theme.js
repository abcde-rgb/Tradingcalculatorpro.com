// Sistema de temas - Trading Calculator PRO
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark', 'light', 'system'
      
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      
      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyTheme(next);
      },
      
      initTheme: () => {
        const theme = get().theme;
        applyTheme(theme);
      }
    }),
    { name: 'trading-theme-storage' }
  )
);

// Premium named themes — all dark-based (apply .dark + .theme-<name>).
export const NAMED_THEMES = ['gold', 'crypto', 'forex', 'nasdaq'];
export const ALL_THEMES = ['light', 'dark', 'system', ...NAMED_THEMES];
const THEME_CLASSES = ['light', 'dark', 'theme-gold', 'theme-crypto', 'theme-forex', 'theme-nasdaq'];

// Resolve any theme to the effective light/dark mode. Named themes are dark.
// Used by widgets that only accept 'light' | 'dark' (TradingView, etc.).
export function resolveMode(theme) {
  if (theme === 'light') return 'light';
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // 'dark' and all named themes are dark-based
}

function applyTheme(theme) {
  const root = document.documentElement;
  THEME_CLASSES.forEach((c) => root.classList.remove(c));

  const mode = resolveMode(theme);
  root.classList.add(mode); // 'light' or 'dark'
  if (NAMED_THEMES.includes(theme)) {
    root.classList.add(`theme-${theme}`); // overrides the .dark variables
  }
}

// Inicializar tema al cargar
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('trading-theme-storage');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      applyTheme(state?.theme || 'dark');
    } catch {
      applyTheme('dark');
    }
  }
}
