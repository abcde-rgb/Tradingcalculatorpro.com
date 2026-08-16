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

/**
 * Cuántos ámbitos (activo × temporalidad) viajan con la cuenta.
 *
 * El registro entero NO cabe en el documento de preferencias: una entrada pesa
 * ~127 bytes, el tope por ámbito son 60, y quien escanee cincuenta pares en
 * varias temporalidades acumula más de 350 KB. Un documento de ajustes que
 * crece sin techo acaba siendo lento de subir, caro de fusionar y, el día que
 * se pase de tamaño, roto para TODO lo demás que viaja con él — el tema, los
 * setups, el capital.
 *
 * Así que se sincronizan los **doce ámbitos tocados más recientemente**, que
 * cubre a quien sigue una lista de activos de verdad, y el resto se queda en
 * el navegador donde se generó. Es un recorte declarado, no un descuido: la
 * alternativa honesta sería una tabla propia con su endpoint, y eso es otro
 * trabajo.
 */
export const SYNC_SCOPE_CAP = 12;

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

/**
 * Quién quiere enterarse de que el registro ha cambiado.
 *
 * Mismo patrón que `onSystemChange` en `tradingSystem.js`, y por el mismo
 * motivo: `cloudPrefs` importa ESTE módulo para leer el registro, así que si
 * este módulo lo importara de vuelta habría un ciclo. Con una suscripción, la
 * dependencia va en una sola dirección y quien avisa no necesita saber a quién.
 */
const oyentes = new Set();
export function onLogChange(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/**
 * Escribe y AVISA de que hay algo nuevo que subir.
 *
 * Sin el aviso el registro seguiría atado al navegador: `cloudPrefs` sólo sube
 * lo que sabe que ha cambiado, y un `localStorage.setItem` suelto no se lo dice
 * a nadie. Es el bug G-25, que el proyecto ya cerró para el resto de ajustes.
 */
const writeStore = (store) => {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(store));
  } catch {
    return;   // modo privado o cuota llena: no hay nada que sincronizar
  }
  for (const fn of oyentes) {
    try { fn(); } catch (_) { /* un oyente roto no rompe el escáner */ }
  }
};

/**
 * El registro recortado a los ámbitos más recientes, para subirlo.
 *
 * «Más reciente» es la marca `ts` más alta de cada ámbito: el que acabas de
 * escanear gana al que miraste hace un mes, que es el orden en el que a
 * cualquiera le importan.
 */
export const scopesToSync = (store, cap = SYNC_SCOPE_CAP) => {
  const entries = Object.entries(store || {}).filter(([, v]) => Array.isArray(v) && v.length);
  entries.sort((a, b) => {
    const ta = Math.max(0, ...a[1].map((e) => e.ts || 0));
    const tb = Math.max(0, ...b[1].map((e) => e.ts || 0));
    return tb - ta;
  });
  return Object.fromEntries(entries.slice(0, cap));
};

/** Lo que `cloudPrefs` lee y aplica. Exportado para poder probarlo sin navegador. */
export const readSyncable = () => scopesToSync(readStore());

/**
 * Funde lo que llega del servidor con lo que hay aquí, ámbito a ámbito.
 *
 * NO se pisa: un móvil que escaneó EURUSD ayer y un ordenador que escaneó ES
 * hoy tienen que acabar los dos con los dos registros. Dentro de un ámbito
 * manda `mergeEntries`, que ya sabe conservar la primera vez que se vio cada
 * señal — y esa marca es la que alimenta el resaltado de «últimas 24 h», así
 * que perderla al sincronizar sería perder información real.
 */
export const applySynced = (remote) => {
  if (!remote || typeof remote !== 'object') return;
  const store = readStore();
  for (const [key, rows] of Object.entries(remote)) {
    if (!Array.isArray(rows)) continue;
    const prev = Array.isArray(store[key]) ? store[key] : [];
    // `now` no se usa aquí: toda entrada remota ya trae su `ts` original.
    store[key] = mergeEntries(prev, rows, 0)
      .map((e) => ({ ...e, ts: e.ts || Date.now() }));
  }
  try { localStorage.setItem(LOG_KEY, JSON.stringify(store)); } catch { /* no-op */ }
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
  store[key] = merged;
  writeStore(store);
  return merged;
};

/** Clear one timeframe of one asset (what the "clear" button does). */
export const clearLogFor = (symbol, interval) => {
  if (!symbol) return;
  const store = readStore();
  delete store[scopeKey(symbol, interval)];
  writeStore(store);
};

/** Drop the pre-timeframe store; its entries cannot be assigned a timeframe. */
export const purgeLegacyLogs = () => {
  for (const key of LEGACY_KEYS) {
    try { localStorage.removeItem(key); } catch { /* no-op */ }
  }
};
