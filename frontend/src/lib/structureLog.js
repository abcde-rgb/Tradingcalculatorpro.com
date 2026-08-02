// Persistent "registro" for the Dashboard structure scanner.
//
// The scanner re-fetches fresh data on every scan, so on its own it only ever
// shows the *current* snapshot. This module keeps a small history in
// localStorage: structure breaks (BOS/CHoCH) and directional candle signals,
// so "what happened" stays recorded across page reloads. Each entry keeps its
// first-seen timestamp, which powers the "last 24h" highlight.
//
// KEYED BY ASSET **AND TIMEFRAME**. It used to be keyed by asset alone, so a
// 15-minute detection and a daily one landed in the same list with nothing to
// tell them apart: the log announced "three white soldiers", the user checked
// the chart on the timeframe they had open, and there was nothing there. Same
// asset, different candle — the log was mixing two answers to two different
// questions. The v1 store is abandoned rather than migrated: its entries have
// no timeframe recorded, so there is no honest way to assign one.

export const LOG_KEY = 'tcp_struct_log_v2';
const LEGACY_KEYS = ['tcp_struct_log_v1'];

/** Storage key for one asset on one timeframe. */
export const scopeKey = (symbol, interval) => `${symbol}|${interval || '1d'}`;
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

export const loadLogFor = (symbol, interval) => {
  if (!symbol) return [];
  const store = readStore();
  const rows = store[scopeKey(symbol, interval)];
  return Array.isArray(rows) ? rows : [];
};

export const mergeLogFor = (symbol, interval, candidates, now = Date.now()) => {
  if (!symbol) return [];
  const key = scopeKey(symbol, interval);
  const store = readStore();
  const prev = Array.isArray(store[key]) ? store[key] : [];
  const merged = mergeEntries(prev, candidates, now);
  try {
    store[key] = merged;
    localStorage.setItem(LOG_KEY, JSON.stringify(store));
  } catch { /* no-op */ }
  return merged;
};

/** Clear one timeframe of one asset (what the "clear" button does). */
export const clearLogFor = (symbol, interval) => {
  if (!symbol) return;
  const store = readStore();
  delete store[scopeKey(symbol, interval)];
  try { localStorage.setItem(LOG_KEY, JSON.stringify(store)); } catch { /* no-op */ }
};

/** Drop the pre-timeframe store; its entries cannot be assigned a timeframe. */
export const purgeLegacyLogs = () => {
  for (const key of LEGACY_KEYS) {
    try { localStorage.removeItem(key); } catch { /* no-op */ }
  }
};
