/**
 * PWA plumbing: service-worker registration + install-prompt capture.
 *
 * Registration only happens in production over HTTPS. In development a service
 * worker caching a stale shell is a debugging nightmare, and `localhost` HTTP
 * would only half-work anyway.
 */

let deferredPrompt = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(!!deferredPrompt));

/** Subscribe to "an install prompt is (not) available". Returns an unsubscribe. */
export function onInstallAvailability(fn) {
  listeners.add(fn);
  fn(!!deferredPrompt);
  return () => listeners.delete(fn);
}

export function canPromptInstall() {
  return !!deferredPrompt;
}

/** True when already running as an installed app (so we can hide the CTA). */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/** iOS has no beforeinstallprompt — it needs Share → Add to Home Screen. */
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

/** Show the native install dialog. Resolves to 'accepted' | 'dismissed' | null. */
export async function promptInstall() {
  if (!deferredPrompt) return null;
  const evt = deferredPrompt;
  deferredPrompt = null;
  notify();
  evt.prompt();
  try {
    const { outcome } = await evt.userChoice;
    return outcome;
  } catch (_) {
    return null;
  }
}

export function initPWA() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });

  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;
  if (window.location.protocol !== 'https:') return;

  window.addEventListener('load', () => {
    const url = `${process.env.PUBLIC_URL || ''}/sw.js`;
    navigator.serviceWorker.register(url).catch((err) => {
      // A failed registration must never break the app.
      console.warn('[pwa] service worker registration failed:', err);
    });
  });
}
