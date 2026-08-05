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
 * Kept free of React so it can be unit-tested and reused. It lives in `lib/`
 * (it used to sit inside `components/education/`) because the setups are not an
 * Academy topic: they are defined in the Academy and *used* in the journal, so
 * both sides import the same model rather than one reaching into the other's
 * folder. Verified by `scripts/engine-check.js`.
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

// ── The system judges the trade ─────────────────────────────────────────────
// El diario avisaba con dos constantes (R:R < 1,5 y riesgo > 2 %) mientras el
// usuario tenía escrito en su propio setup "R:R mínimo 2, riesgo 1 %". Dos
// reglas distintas para la misma operación: la que el trader se puso y la que
// le juzgaba. Manda la suya; las constantes son sólo el respaldo de quien no ha
// definido nada, y la interfaz dice cuál de las dos está aplicando.

/** Respaldo para quien no tiene la regla escrita en su setup. */
export const DEFAULT_MIN_RR = 1.5;
export const DEFAULT_MAX_RISK_PCT = 2;

const numeric = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Las reglas que aplican a una operación etiquetada con `names`.
 *
 * Con varios setups gana **el más estricto** de cada regla (el R:R más alto y
 * el riesgo más bajo): si la operación responde a dos condiciones, tiene que
 * cumplir las dos. `source` distingue una regla propia de un valor por defecto,
 * porque presentar el respaldo como si fuera decisión del usuario es lo que
 * hace que un aviso se ignore.
 */
export function setupRulesFor(system, names) {
  const picked = (Array.isArray(names) ? names : [])
    .map((n) => (system?.setups || []).find((s) => normName(s.name) === normName(n)))
    .filter(Boolean);

  const rrs = picked.map((s) => numeric(s.rr)).filter(Boolean);
  const risks = picked.map((s) => numeric(s.riskPerTrade)).filter(Boolean);

  return {
    minRR: rrs.length ? Math.max(...rrs) : DEFAULT_MIN_RR,
    maxRiskPct: risks.length ? Math.min(...risks) : DEFAULT_MAX_RISK_PCT,
    rrSource: rrs.length ? 'setup' : 'default',
    riskSource: risks.length ? 'setup' : 'default',
    from: picked.map((s) => s.name).filter(Boolean),
  };
}

// ── The system meets the journal ────────────────────────────────────────────
// A setup you cannot measure is a wish. The journal stores `setup` as a plain
// string and the backend groups analytics by that string, so the join key is
// the setup NAME — matched case-insensitively and trimmed, because "Ruptura NY"
// and "ruptura ny " are one setup being typed twice, not two setups.

/** What the backend uses as the group name for a trade with no setup. */
export const UNLABELLED_GROUP = '—';

/**
 * Separator between the setups of one trade in the legacy `setup` string.
 *
 * A trade can answer to more than one setup, so the field is a LIST
 * (`trade.setups`). The joined string survives for everything that already read
 * one text — CSV, the coach prompt, the journal table — and the padded dot is
 * chosen so it will not show up inside a single setup name. Must match
 * `SETUP_SEPARATOR` in `backend/performance.py`.
 */
export const SETUP_SEPARATOR = ' · ';
export const MAX_SETUPS_PER_TRADE = 5;

const normName = (s) => String(s || '').trim().toLowerCase();

/** The setups of a trade, from the list or from the old joined string. */
export function tradeSetups(trade) {
  if (Array.isArray(trade?.setups)) return trade.setups.filter(Boolean);
  return splitSetups(trade?.setup);
}

/** Split a joined string, trimming and dropping blanks. */
export function splitSetups(text) {
  return String(text || '')
    .split(SETUP_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Add a setup to a list: trimmed, de-duplicated case-insensitively and capped.
 * The separator is stripped from the name — left in, it would come back as two
 * setups the next time the string is read.
 */
export function addSetup(list, name) {
  const clean = String(name || '').replace(SETUP_SEPARATOR, ' ').trim();
  const current = Array.isArray(list) ? list : [];
  if (!clean || current.length >= MAX_SETUPS_PER_TRADE) return current;
  if (current.some((s) => normName(s) === normName(clean))) return current;
  return [...current, clean];
}

/**
 * Cross the setup library with the journal's by-setup analytics.
 *
 * Returns three buckets, and the difference between them is the whole point:
 *
 *   `defined`     — setups in the system. `stats` is null when none has been
 *                   traded yet: NO SAMPLE, which is not the same as a 0 % win
 *                   rate and must never be drawn as one.
 *   `offSystem`   — setups that appear in trades but not in the system. Either
 *                   a typo or a trade taken outside the plan; both are worth
 *                   seeing, and neither should be quietly folded into the
 *                   totals of a setup that was actually defined.
 *   `unlabelled`  — closed trades logged with no setup at all. Not a failure of
 *                   discipline, just missing data, so it is counted apart.
 */
export function joinSetupPerformance(setups, bySetup) {
  const rows = Array.isArray(bySetup) ? bySetup : [];
  const byName = new Map();
  let unlabelled = null;
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    if (r.group === UNLABELLED_GROUP || !normName(r.group)) {
      unlabelled = r;
      continue;
    }
    // Un grupo puede venir ya partido (backend nuevo) o como la cadena unida de
    // un trade con varios setups (backend anterior a `setups`). En los dos
    // casos, ese trade es evidencia sobre CADA uno de sus setups, así que se
    // suma en todos: es lo mismo que calcula el backend actual.
    for (const name of splitSetups(r.group)) {
      const key = normName(name);
      const acc = byName.get(key);
      if (acc) {
        acc.n += r.n || 0;
        acc.wins += r.wins || 0;
        acc.pnl = Math.round((acc.pnl + (r.pnl || 0)) * 100) / 100;
        acc.win_rate = acc.n ? Math.round((acc.wins / acc.n) * 1000) / 10 : 0;
      } else {
        byName.set(key, {
          group: name, n: r.n || 0, wins: r.wins || 0,
          pnl: r.pnl || 0, win_rate: r.win_rate ?? 0,
        });
      }
    }
  }

  const used = new Set();
  const defined = (Array.isArray(setups) ? setups : []).map((s) => {
    const key = normName(s?.name);
    const stats = key ? byName.get(key) : undefined;
    if (stats) used.add(key);
    return { setup: s, stats: stats || null };
  });

  const offSystem = [];
  for (const [key, stats] of byName) {
    if (!used.has(key)) offSystem.push(stats);
  }
  offSystem.sort((a, b) => (b.n || 0) - (a.n || 0));

  return {
    defined,
    offSystem,
    unlabelled,
    counts: {
      defined: defined.length,
      traded: defined.filter((d) => d.stats).length,
      untraded: defined.filter((d) => !d.stats).length,
      offSystem: offSystem.length,
      offSystemTrades: offSystem.reduce((acc, r) => acc + (r.n || 0), 0),
    },
  };
}
