/**
 * Los ajustes del usuario viajan con la CUENTA, no con el navegador.
 *
 * Hasta ahora sólo persistía en la base de datos lo transaccional: cuenta,
 * suscripción, diario, alertas y el estado de las calculadoras. Todo lo que el
 * usuario *ajustaba* —tema, idioma, preferencias, activos favoritos, progreso
 * de la Academia y, sobre todo, los setups de su sistema de trading— vivía en
 * `localStorage` y por tanto en UN navegador. Entrar desde el móvil era empezar
 * de cero, y vaciar la caché era perder los setups escritos a mano.
 *
 * Este módulo no sustituye `localStorage`: lo respalda. El navegador sigue
 * siendo la copia inmediata (funciona sin red, sin cuenta y en modo demo) y el
 * servidor es la copia que cruza dispositivos. Todo va en UN documento de
 * `user_states` (`preferences_v1`), así que sincronizar cuesta una lectura y
 * una escritura, no una por ajuste.
 *
 * Dos decisiones que parecen detalles y no lo son:
 *
 *   1. **Cada ajuste lleva su propia fecha.** Con una sola fecha por documento,
 *      cambiar el tema en el ordenador borraría los setups escritos en el móvil
 *      diez minutos antes. Gana el más reciente DE CADA AJUSTE por separado.
 *
 *   2. **El documento local recuerda de quién es.** Dos cuentas en el mismo
 *      navegador es el caso que ya rompió el diario legado (ver el store
 *      congelado en `store.js`). Si el dueño del `localStorage` no es quien
 *      acaba de entrar, lo local no compite: manda la cuenta, y lo que la
 *      cuenta no tenga vuelve a su valor por defecto en vez de quedarse
 *      enseñando los setups del anterior.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useThemeStore, ALL_THEMES } from '@/lib/theme';
import { useI18nStore, languages } from '@/lib/i18n';
import { useAssetsStore } from '@/lib/assets';
import { loadSystem, saveSystem, emptySystem, onSystemChange } from '@/lib/tradingSystem';
import { planMerge } from '@/lib/prefsMerge';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : null;

const DEMO_TOKEN = 'demo-token';

/** Un único documento por usuario en `user_states`. */
export const STATE_ID = 'preferences_v1';
/** Dónde guarda este navegador las fechas y el dueño. No se sincroniza. */
export const META_KEY = 'tcp-prefs-meta';
export const DOC_VERSION = 1;

const PUSH_DEBOUNCE_MS = 1200;

// ── localStorage sin excepciones ────────────────────────────────────────────
// En modo privado de algunos navegadores `localStorage` lanza. Un ajuste que no
// se puede guardar no es motivo para tumbar la página.

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (_) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* no-op */ }
}

function dropKey(key) {
  try { localStorage.removeItem(key); } catch (_) { /* no-op */ }
}

// ── Los ajustes que viajan ──────────────────────────────────────────────────
// Cada uno sabe leerse, aplicarse y (si procede) volver a su valor por defecto.
// `resettable: false` es para lo que es pura apariencia del dispositivo: que
// entre otra cuenta no tiene por qué cambiarte el tema ni el idioma de golpe,
// y ninguno de los dos revela nada de la cuenta anterior.

/**
 * Un ajuste guardado en `localStorage`, con su forma comprobada.
 *
 * `isValid` no es paranoia: lo que llega del servidor lo escribió otra versión
 * del frontend, y una lista que llegue como objeto haría reventar la página que
 * la recorre. Un valor con la forma equivocada se trata como si no existiera.
 */
function lsSlice(key, fallback, isValid) {
  const ok = (v) => (typeof isValid === 'function' ? isValid(v) : v !== undefined);
  return {
    storageKey: key,
    resettable: true,
    defaults: () => fallback,
    read: () => {
      const v = readJSON(key, fallback);
      return ok(v) ? v : fallback;
    },
    apply: (value) => { if (ok(value)) writeJSON(key, value); },
    reset: () => { dropKey(key); },
  };
}

const isList = (v) => Array.isArray(v);
const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

// Los mismos que estrena `useAssetsStore`. Aquí porque el reseteo tiene que
// dejar la lista EXACTAMENTE como la encontraría una cuenta recién creada.
const DEFAULT_ASSET_FAVORITES = ['BTC', 'ETH', 'EURUSD', 'XAUUSD', 'SPX'];

export const PREF_SLICES = {
  theme: {
    resettable: false,
    read: () => useThemeStore.getState().theme,
    apply: (value) => {
      if (typeof value === 'string' && ALL_THEMES.includes(value)) {
        useThemeStore.getState().setTheme(value);
      }
    },
    reset: () => {},
  },

  language: {
    resettable: false,
    read: () => useI18nStore.getState().locale,
    apply: async (value) => {
      if (typeof value === 'string' && languages.some((l) => l.code === value)) {
        await useI18nStore.getState().setLocale(value);
      }
    },
    reset: () => {},
  },

  assetFavorites: {
    resettable: true,
    defaults: () => [...DEFAULT_ASSET_FAVORITES],
    read: () => useAssetsStore.getState().favorites,
    apply: (value) => {
      if (Array.isArray(value)) useAssetsStore.setState({ favorites: value });
    },
    reset: () => useAssetsStore.setState({ favorites: [...DEFAULT_ASSET_FAVORITES] }),
  },

  settingsPrefs: lsSlice('tcp-preferences', { emailNotifications: true, compactMode: false }, isPlainObject),
  calcFavorites: lsSlice('tcp-calc-favs', [], isList),
  calcRecents: lsSlice('tcp-calc-recents', [], isList),
  eduProgress: lsSlice('tcp-edu-progress', [], isList),
  optionsRecents: lsSlice('opc_recents', [], isList),

  tradingSystem: {
    resettable: true,
    defaults: () => emptySystem(),
    read: () => loadSystem(),
    // `silent`: repintar sí, pero esto viene del servidor, no es una edición
    // que haya que volver a subir.
    apply: (value) => { if (value && typeof value === 'object') saveSystem(value, undefined, { silent: true }); },
    reset: () => { saveSystem(emptySystem(), undefined, { silent: true }); },
  },
};

export const SLICE_NAMES = Object.keys(PREF_SLICES);

// ── Avisos a los componentes montados ───────────────────────────────────────

const listeners = new Map();

function emit(name) {
  const set = listeners.get(name);
  if (!set) return;
  for (const fn of set) {
    try { fn(); } catch (_) { /* un suscriptor roto no rompe al resto */ }
  }
}

export function subscribePref(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => {
    const set = listeners.get(name);
    if (set) set.delete(fn);
  };
}

// ── Fechas y dueño ──────────────────────────────────────────────────────────

function readMeta() {
  const raw = readJSON(META_KEY, null);
  const at = raw && typeof raw.at === 'object' && raw.at ? raw.at : {};
  return { owner: raw && typeof raw.owner === 'string' ? raw.owner : null, at: { ...at } };
}

function writeMeta(meta) {
  writeJSON(META_KEY, { owner: meta.owner || null, at: meta.at || {} });
}

// ── Lectura y escritura de un ajuste ────────────────────────────────────────

export function getPref(name) {
  const slice = PREF_SLICES[name];
  return slice ? slice.read() : undefined;
}

/** Registrar que este ajuste ha cambiado AQUÍ y programar la subida. */
export function touchPref(name) {
  if (!PREF_SLICES[name]) return;
  const meta = readMeta();
  meta.at[name] = Date.now();
  writeMeta(meta);
  snapshot(name);
  emit(name);
  schedulePush();
}

/**
 * Cambiar un ajuste: se aplica, se marca y se sube.
 *
 * Poner el valor que ya estaba NO es un cambio y no marca fecha. Importa más de
 * lo que parece: hay pantallas que reescriben su ajuste al montarse (el panel
 * de calculadoras apunta la pestaña activa en cuanto aparece), y sin esta
 * salida cada visita marcaría el ajuste como recién editado — bastante para
 * que la copia de este navegador le ganara a otra más nueva de la cuenta.
 */
export function setPref(name, value) {
  const slice = PREF_SLICES[name];
  if (!slice) return;
  let before;
  let after;
  try {
    before = JSON.stringify(slice.read() ?? null);
    after = JSON.stringify(value ?? null);
  } catch (_) {
    before = undefined;
    after = null;
  }
  if (before !== undefined && before === after) return;
  slice.apply(value);
  touchPref(name);
}

/**
 * El usuario ELIGE un idioma (selector de la cabecera o del pie).
 *
 * Es el único camino que marca fecha. `detectBrowserLanguage` también cambia el
 * idioma, pero eso es una suposición del navegador, no una decisión: si contara
 * como preferencia, el idioma adivinado en un móvil recién estrenado pisaría el
 * que el usuario eligió a mano en su cuenta. Un `?lang=` tampoco cuenta: un
 * enlace compartido cambia lo que ves, no lo que has elegido.
 */
export async function pickLocale(code) {
  await PREF_SLICES.language.apply(code);
  if (useI18nStore.getState().locale === code) touchPref('language');
}

/**
 * Estado de React respaldado por un ajuste sincronizado.
 *
 * Se comporta como `useState` —admite valor o función— y además se entera de
 * los cambios que vengan de otro componente de esta pestaña o del servidor.
 * Entre PESTAÑAS distintas no se reparte en vivo: la segunda pestaña ve lo
 * nuevo al recargar o al volver a conciliar. Arreglarlo es escuchar el evento
 * `storage`, y no está hecho.
 */
export function useCloudPref(name) {
  const [value, setValue] = useState(() => getPref(name));

  useEffect(() => {
    setValue(getPref(name));
    return subscribePref(name, () => setValue(getPref(name)));
  }, [name]);

  const update = useCallback((next) => {
    // Se resuelve contra lo que hay GUARDADO, no contra el estado capturado en
    // el closure: si acaba de llegar un valor del servidor, el actualizador
    // funcional tiene que partir de ese.
    const resolved = typeof next === 'function' ? next(getPref(name)) : next;
    setPref(name, resolved);
    setValue(resolved);
    return resolved;
  }, [name]);

  return [value, update];
}

// ── Quién gana: lo de este navegador o lo de la cuenta ──────────────────────
// Las reglas viven en `prefsMerge.js`, sin importaciones, para poder probarlas
// sin navegador (`scripts/engine-check.js`).

function canonical(slices) {
  const keys = Object.keys(slices || {}).sort();
  return JSON.stringify(keys.map((k) => [k, slices[k].at, slices[k].value]));
}

// ── Red ─────────────────────────────────────────────────────────────────────

function identity() {
  if (!API) return null;
  const { token, user, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !token || token === DEMO_TOKEN) return null;
  const userId = user && user.id ? String(user.id) : null;
  if (!userId) return null;
  return { token, userId };
}

/**
 * Petición autenticada con un reintento tras refrescar el token.
 * Mismo patrón que `performanceApi.js`: en una recarga el token en memoria es
 * null hasta que la cookie lo repone, y sin el reintento el primer 401 dejaba
 * los ajustes sin sincronizar hasta la siguiente navegación.
 */
async function authedFetch(path, init, token) {
  const send = (bearer) => fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...(init && init.headers), Authorization: `Bearer ${bearer}` },
  });

  let res = await send(token);
  if (res.status === 401) {
    const fresh = await useAuthStore.getState().silentRefresh();
    if (!fresh) return res;
    res = await send(fresh);
  }
  return res;
}

function buildDoc() {
  const meta = readMeta();
  const slices = {};
  for (const name of SLICE_NAMES) {
    const at = meta.at[name];
    if (!Number.isFinite(at) || at <= 0) continue;
    slices[name] = { at, value: getPref(name) };
  }
  return { v: DOC_VERSION, slices, updated_at: new Date().toISOString() };
}

let pushTimer = null;
let pushInFlight = false;
let pushQueued = false;

async function pushNow(options) {
  const who = identity();
  if (!who) return false;
  if (pushInFlight) { pushQueued = true; return false; }
  pushInFlight = true;
  try {
    const res = await authedFetch('/user-states/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state_id: STATE_ID, state: buildDoc() }),
      keepalive: Boolean(options && options.keepalive),
    }, who.token);
    return res.ok;
  } catch (_) {
    return false;
  } finally {
    pushInFlight = false;
    if (pushQueued) {
      pushQueued = false;
      schedulePush();
    }
  }
}

export function schedulePush() {
  if (!identity()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; pushNow(); }, PUSH_DEBOUNCE_MS);
}

/** Subir ya lo que esté pendiente (al cerrar la pestaña o al ocultarse). */
export function flushPrefs() {
  if (!pushTimer) return;
  clearTimeout(pushTimer);
  pushTimer = null;
  pushNow({ keepalive: true });
}

// ── Conciliación ────────────────────────────────────────────────────────────

// Último valor conocido de cada ajuste, serializado.
//
// No basta con recordar lo que acabamos de aplicar desde el servidor: hay
// escrituras locales que tampoco son cambios. `SetupBuilder` reguarda el
// sistema entero nada más montarse (`useEffect(..., [system])` con el valor que
// acaba de leer), y sin esta comparación abrir la pestaña marcaría el sistema
// como "editado ahora mismo" — suficiente para que la copia vieja de este
// navegador le ganara a la buena que hay en la cuenta y la machacara.
const lastSeen = {};

function snapshot(name, value) {
  try {
    lastSeen[name] = JSON.stringify((value === undefined ? getPref(name) : value) ?? null);
  } catch (_) {
    delete lastSeen[name];
  }
}

function onStoreChanged(name) {
  let current;
  try { current = JSON.stringify(getPref(name) ?? null); } catch (_) { current = undefined; }
  if (current !== undefined && lastSeen[name] === current) return;  // nada ha cambiado de verdad
  lastSeen[name] = current;
  touchPref(name);
}

let reconciling = false;

async function reconcile() {
  const who = identity();
  if (!who || reconciling) return;
  reconciling = true;
  try {
    let remoteSlices = null;
    try {
      const res = await authedFetch(`/user-states/get/${STATE_ID}`, { method: 'GET' }, who.token);
      if (res.ok) {
        const body = await res.json();
        const state = body && body.state;
        if (state && typeof state === 'object' && state.slices && typeof state.slices === 'object') {
          remoteSlices = state.slices;
        } else if (state === null || state === undefined) {
          remoteSlices = {};   // cuenta sin ajustes guardados todavía
        }
      }
    } catch (_) {
      // Sin red no se toca nada: lo local sigue siendo válido y se subirá luego.
      return;
    }
    if (remoteSlices === null) return;   // respuesta ilegible → no arriesgar

    const meta = readMeta();
    const foreign = Boolean(meta.owner) && meta.owner !== who.userId;

    const localValues = {};
    const resettable = {};
    for (const name of SLICE_NAMES) {
      localValues[name] = getPref(name);
      resettable[name] = PREF_SLICES[name].resettable !== false;
    }

    const plan = planMerge(SLICE_NAMES, meta.at, localValues, remoteSlices, { foreign, resettable });

    // La foto se toma ANTES de escribir, con el valor que se va a dejar. Los
    // stores avisan de forma síncrona dentro del propio `apply`, así que una
    // foto tomada después llegaría tarde: el aviso ya habría comparado contra
    // el valor viejo y habría marcado como "editado aquí" algo que acababa de
    // bajar del servidor.
    for (const name of Object.keys(plan.apply)) {
      snapshot(name, plan.apply[name]);
      try { await PREF_SLICES[name].apply(plan.apply[name]); } catch (_) { /* un ajuste ilegible no corta el resto */ }
      snapshot(name);
      emit(name);
    }
    for (const name of plan.reset) {
      const slice = PREF_SLICES[name];
      if (typeof slice.defaults === 'function') snapshot(name, slice.defaults());
      try { slice.reset(); } catch (_) { /* idem */ }
      snapshot(name);
      emit(name);
    }

    writeMeta({ owner: who.userId, at: plan.stamps });

    if (canonical(plan.push) !== canonical(remoteSlices)) await pushNow();
  } finally {
    reconciling = false;
  }
}

// ── Arranque ────────────────────────────────────────────────────────────────

let started = false;

/**
 * Engancha los stores y la sesión. Idempotente: en desarrollo React monta dos
 * veces y una segunda suscripción duplicaría cada subida.
 */
export function startCloudPrefsSync() {
  if (started || typeof window === 'undefined') return () => {};
  started = true;

  // Foto de partida: sin ella, la primera escritura idéntica de cualquier
  // pantalla contaría como edición.
  for (const name of SLICE_NAMES) snapshot(name);

  const offs = [];

  // El tema y los favoritos sólo cambian por acción explícita del usuario, así
  // que basta con escuchar sus stores. El IDIOMA no: `detectBrowserLanguage`
  // lo cambia solo en el primer arranque, y si eso marcara fecha, el idioma
  // adivinado en un móvil nuevo pisaría el que el usuario eligió a mano en su
  // cuenta. Por eso el idioma se marca en el selector (Header/Footer), que es
  // donde hay una elección de verdad.
  offs.push(useThemeStore.subscribe((state, prev) => {
    if (!prev || state.theme !== prev.theme) onStoreChanged('theme');
  }));

  offs.push(useAssetsStore.subscribe((state, prev) => {
    if (!prev || state.favorites !== prev.favorites) onStoreChanged('assetFavorites');
  }));

  offs.push(onSystemChange((ev) => {
    if (ev && ev.silent) return;
    onStoreChanged('tradingSystem');
  }));

  // La sesión llega tarde: en una recarga el token es null hasta que la cookie
  // lo repone, así que hay que reaccionar al cambio, no leerlo una vez.
  let lastKey = '';
  const onAuth = () => {
    const who = identity();
    const key = who ? who.userId : '';
    if (key === lastKey) return;
    lastKey = key;
    if (who) reconcile();
  };
  offs.push(useAuthStore.subscribe(onAuth));
  onAuth();

  const onHide = () => { if (document.visibilityState === 'hidden') flushPrefs(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', flushPrefs);
  offs.push(() => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', flushPrefs);
  });

  return () => {
    offs.forEach((off) => { try { off(); } catch (_) { /* no-op */ } });
    started = false;
  };
}
