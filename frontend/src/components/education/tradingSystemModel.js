/**
 * Data model for "Mi Sistema de Trading".
 *
 * A *setup* is one recognisable market condition worth trading. A *system* is
 * the umbrella: several setups PLUS the rules that apply no matter which one
 * you are trading (max daily loss, when not to trade at all, the pre-trade
 * checklist). The old builder only modelled the first half, and only one of
 * them at a time — `localStorage.setItem('tcp-trading-setup', ...)` was a
 * single key, so saving a second setup destroyed the first.
 *
 * Kept free of React so it can be unit-tested and reused.
 */

export const STORAGE_KEY = 'tcp-trading-system';
/** Pre-v2 key: one setup, overwritten on every save. Migrated, then left alone. */
export const LEGACY_STORAGE_KEY = 'tcp-trading-setup';
export const SCHEMA_VERSION = 2;

export const EMPTY_SETUP = {
  id: '',
  name: '',
  setupType: '',            // trend | reversal | breakout | range
  assets: [],               // forex | stocks | crypto | indices | commodities | options | futures
  tickers: '',              // free text, optional
  htfTimeframe: '',         // where the context is read
  ltfTimeframe: '',         // where the entry is taken
  style: '',                // scalping | day | swing | position
  session: '',              // asia | london | ny | overlap | any
  approaches: [],
  tools: [],
  chartPattern: '',         // id from getChartPatterns
  candlePatterns: [],       // ids from CANDLE_PATTERN_STATS
  srMethod: '',             // how the level is located
  entryTrigger: '',         // the exact moment you pull the trigger
  invalidation: '',         // when the setup is dead, regardless of price
  stopRule: '',             // structural | atr | fixed-pct
  riskPerTrade: '',
  rr: '',
  management: [],           // be-at-1r | partial-tp1 | trail-structure | time-stop
  maxConcurrent: '',
};

export const EMPTY_SYSTEM_RULES = {
  maxDailyLossPct: '',
  maxWeeklyLossPct: '',
  noTradeConditions: [],    // high-impact-news | ranging-market | outside-session | ...
  maxCorrelatedExposure: '',
  checklistEnabled: true,
};

export function emptySystem() {
  return { version: SCHEMA_VERSION, setups: [], systemRules: { ...EMPTY_SYSTEM_RULES } };
}

export function newSetupId() {
  // crypto.randomUUID isn't available on every browser/context this runs in.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `setup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function makeSetup(partial = {}) {
  return { ...EMPTY_SETUP, ...partial, id: partial.id || newSetupId() };
}

/**
 * Bring a v1 single-setup object into the v2 library shape.
 *
 * v1 had one timeframe chip; the Top-Down method the Academy teaches needs two
 * (the frame you read context in, and the frame you enter on). The old value is
 * the frame the user was actually looking at, so it becomes the entry frame.
 */
export function migrateLegacySetup(legacy) {
  if (!legacy || typeof legacy !== 'object') return null;
  const hasContent = legacy.name || legacy.timeframe || legacy.style
    || (legacy.approaches || []).length || (legacy.tools || []).length;
  if (!hasContent) return null;
  return makeSetup({
    name: legacy.name || '',
    ltfTimeframe: legacy.timeframe || '',
    style: legacy.style || '',
    approaches: Array.isArray(legacy.approaches) ? legacy.approaches : [],
    tools: Array.isArray(legacy.tools) ? legacy.tools : [],
    riskPerTrade: legacy.risk || '',
    rr: legacy.rr || '',
  });
}

/** Coerce anything read from storage into a valid system object. */
export function normalizeSystem(raw) {
  const base = emptySystem();
  if (!raw || typeof raw !== 'object') return base;
  const setups = Array.isArray(raw.setups)
    ? raw.setups.filter((s) => s && typeof s === 'object').map((s) => makeSetup(s))
    : [];
  return {
    version: SCHEMA_VERSION,
    setups,
    systemRules: { ...EMPTY_SYSTEM_RULES, ...(raw.systemRules || {}) },
  };
}

/**
 * Load the system, migrating a v1 setup on first run.
 *
 * `storage` is injectable so this can be tested without a browser.
 */
export function loadSystem(storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return emptySystem();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw) return normalizeSystem(JSON.parse(raw));
  } catch (_) { /* corrupt payload — fall through to migration/empty */ }

  try {
    const legacyRaw = store.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const migrated = migrateLegacySetup(JSON.parse(legacyRaw));
      if (migrated) {
        const sys = emptySystem();
        sys.setups = [migrated];
        return sys;
      }
    }
  } catch (_) { /* ignore */ }
  return emptySystem();
}

export function saveSystem(system, storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(normalizeSystem(system)));
    return true;
  } catch (_) {
    return false;
  }
}

/** True when the setup carries enough to be worth saving. */
export function setupHasContent(s) {
  if (!s) return false;
  return Boolean(
    s.name || s.setupType || s.htfTimeframe || s.ltfTimeframe || s.style || s.session
    || s.entryTrigger || s.invalidation || s.srMethod || s.chartPattern
    || (s.assets || []).length || (s.approaches || []).length || (s.tools || []).length
    || (s.candlePatterns || []).length,
  );
}

/**
 * What is missing before this setup is actually operable.
 *
 * The entry trigger is the one that matters most: without it, two traders with
 * identical tags ("Wyckoff + EMA + 4H") can enter at completely different
 * moments, which means the setup isn't a rule, it's a mood.
 */
export function missingEssentials(s) {
  const missing = [];
  if (!s?.name) missing.push('name');
  if (!s?.entryTrigger) missing.push('entryTrigger');
  if (!s?.invalidation) missing.push('invalidation');
  if (!s?.stopRule) missing.push('stopRule');
  if (!s?.riskPerTrade) missing.push('riskPerTrade');
  return missing;
}
