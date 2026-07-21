// Persistent "registro" for the Dashboard structure scanner.
//
// The scanner re-fetches fresh data from Yahoo on every scan, so on its own it
// only ever shows the *current* snapshot. This module keeps a small, per-asset
// history in localStorage: structure breaks (BOS/CHoCH) and directional candle
// signals the scanner has seen, so "what happened" stays recorded across page
// reloads. Each entry keeps its first-seen timestamp, which powers the
// "last 24h" highlight.

export const LOG_KEY = 'tcp_struct_log_v1';
export const LOG_CAP = 60;
export const DAY_MS = 24 * 60 * 60 * 1000;

// ── Pure core (unit-tested; no browser APIs) ────────────────────────────────
// Merge freshly detected `candidates` into `prev`. Existing ids keep their
// original ts (first-seen); new ids are stamped with `now`. Result is sorted
// newest-bar-first, then most-recently-seen-first, and capped at LOG_CAP.
export const mergeEntries = (prev, candidates, now) => {
  const byId = new Map((prev || []).map((e) => [e.id, e]));
  for (const cand of candidates || []) {
    const existing = byId.get(cand.id);
    byId.set(cand.id, existing ? { ...cand, ts: existing.ts } : { ...cand, ts: now });
  }
  return Array.from(byId.values())
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts))
    .slice(0, LOG_CAP);
};

// ── localStorage wrappers (guarded — private mode / quota safe) ──────────────
const readStore = () => {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '{}') || {}; } catch { return {}; }
};

export const loadLogFor = (symbol) => {
  if (!symbol) return [];
  const store = readStore();
  return Array.isArray(store[symbol]) ? store[symbol] : [];
};

export const mergeLogFor = (symbol, candidates, now = Date.now()) => {
  if (!symbol) return [];
  const store = readStore();
  const prev = Array.isArray(store[symbol]) ? store[symbol] : [];
  const merged = mergeEntries(prev, candidates, now);
  try {
    store[symbol] = merged;
    localStorage.setItem(LOG_KEY, JSON.stringify(store));
  } catch { /* no-op */ }
  return merged;
};

export const clearLogFor = (symbol) => {
  if (!symbol) return;
  const store = readStore();
  delete store[symbol];
  try { localStorage.setItem(LOG_KEY, JSON.stringify(store)); } catch { /* no-op */ }
};
