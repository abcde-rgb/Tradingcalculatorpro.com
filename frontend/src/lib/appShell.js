/**
 * Recovering from a STALE APP SHELL after a deploy.
 *
 * Every deploy replaces the hashed chunks on GitHub Pages and deletes the old
 * ones. A browser still holding the previous `index.html` — an open tab, the
 * bfcache, an edge-cached HTML response, or the service worker's shell — then
 * asks for a chunk that no longer exists, the lazy route never resolves, and
 * the user sees "Algo salió mal". It bites hardest right after logging in,
 * because that is the first navigation to a lazy route.
 *
 * Reloading is only half the cure. If the reload is served the SAME stale
 * shell, the chunk 404s again and the user is back on the error screen — which
 * is exactly what happens when the service worker answers the navigation from
 * its cache. So the service worker and its caches are dropped FIRST, and only
 * then do we reload: that guarantees the next document comes from the network.
 */

/** Drop the service worker and every cache it owns. Best effort, never throws. */
export async function purgeAppShell() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
  } catch { /* private mode / unsupported — carry on */ }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('tcp-')).map((k) => caches.delete(k).catch(() => {}))
      );
    }
  } catch { /* best effort */ }
}

/** Purge, then reload from the network. Does not return. */
export async function reloadFreshShell() {
  await purgeAppShell();
  window.location.reload();
}

/**
 * The site root. NOT `/`: on GitHub Pages the app is served under
 * `/Tradingcalculatorpro.com/`, so a hardcoded `/` lands on a 404 — and it did,
 * from the error screen's own "back home" button.
 */
export function homeUrl() {
  return process.env.PUBLIC_URL || '/';
}
