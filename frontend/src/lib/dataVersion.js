import { create } from 'zustand';
import { useEffect } from 'react';

/**
 * Live-data bus: "something was written, whoever shows it should reload".
 *
 * THE PROBLEM IT SOLVES
 * Each card fetched once on mount and never again. Log a trade from the Position
 * Size calculator and the journal stats on the dashboard kept the old numbers
 * until a full page reload; import 200 trades and the analytics stayed empty.
 * The data was correct on the server and stale on screen — which reads as broken.
 *
 * HOW IT WORKS
 * Writers call `bumpData('trades')`. Readers use `useDataVersion('trades')` in
 * their effect's dependency array, so the effect re-runs on every write. One
 * counter per topic, so saving a calculation doesn't refetch the journal.
 *
 * Deliberately NOT a websocket or a poll: this only reflects writes made by this
 * user in this tab, which is exactly the "I entered data, show it" case. Nothing
 * here fires network traffic on its own.
 */

/** Known topics. Keep the list closed so typos surface immediately. */
export const DATA_TOPICS = [
  'trades',        // journal / performance entries
  'calculations',  // calculator history
  'alerts',        // price alerts
  'watchlist',     // watchlist symbols
  'positions',     // saved option positions
  'portfolio',     // portfolio holdings
];

const initial = Object.fromEntries(DATA_TOPICS.map((k) => [k, 0]));

export const useDataVersionStore = create((set) => ({
  versions: initial,
  bump: (topic) =>
    set((s) => {
      if (!DATA_TOPICS.includes(topic)) {
        console.warn(`[dataVersion] unknown topic "${topic}"`);
        return s;
      }
      return { versions: { ...s.versions, [topic]: s.versions[topic] + 1 } };
    }),
}));

/**
 * Signal that `topic` changed. Safe to call from anywhere, including outside
 * React (API helpers, stores).
 */
export function bumpData(topic) {
  useDataVersionStore.getState().bump(topic);
}

/** Version counter for `topic`. Put it in a dependency array to auto-refresh. */
export function useDataVersion(topic) {
  return useDataVersionStore((s) => s.versions[topic] ?? 0);
}

/**
 * Run `fn` on mount and again on every write to `topic`.
 * Convenience wrapper so callers don't hand-roll the effect each time.
 */
export function useRefreshOn(topic, fn, extraDeps = []) {
  const version = useDataVersion(topic);
  useEffect(() => {
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...extraDeps]);
}
