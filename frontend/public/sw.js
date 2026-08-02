/* eslint-disable no-restricted-globals */
/**
 * TradingCalculator.Pro service worker.
 *
 * Strategy, and why:
 *
 *  - NAVIGATION → network first, cache as fallback.
 *    A cache-first index.html is how you serve a stale shell that then asks for
 *    JS chunks that no longer exist — exactly the ChunkLoadError this project
 *    already had to patch after deploys. Never cache-first the HTML.
 *
 *  - HASHED STATIC ASSETS (/static/**) → cache first.
 *    CRA fingerprints these, so a given URL is immutable by construction.
 *
 *  - EVERYTHING ELSE (API calls, TradingView, market data) → straight to the
 *    network, never touched. Cached prices on a finance site are a liability.
 *
 * Bump CACHE_VERSION to evict everything on the next visit.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `tcp-static-${CACHE_VERSION}`;
const SHELL_CACHE = `tcp-shell-${CACHE_VERSION}`;
const OFFLINE_URL = 'offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('tcp-') && k !== STATIC_CACHE && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only ever touch our own origin. Market data and third-party widgets go
  // straight through, always.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;

  // Navigations: network first, offline page as last resort.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request)
          .then((hit) => hit || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Fingerprinted assets: cache first, they cannot change under a given URL.
  if (url.pathname.includes('/static/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return response;
      }))
    );
  }
});
