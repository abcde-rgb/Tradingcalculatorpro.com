import { useEffect, useState } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Loads ALL conditional Google integrations the SPA might need:
 *
 *  - Google Analytics 4 (gtag.js)        → ga4_measurement_id
 *  - Google Tag Manager                  → gtm_id
 *  - Google AdSense (auto-ads)           → adsense_publisher_id
 *  - Search Console verification meta    → gsc_verification
 *  - Bing Webmaster verification meta    → bing_verification
 *
 * Resolution order per key:
 *   1. Value saved in DB via /admin/settings (read from /api/public/settings)
 *   2. Fallback to build-time env var (REACT_APP_*)
 *
 * That means the admin can flip any integration on/off from the /admin panel
 * without rebuilding the frontend, but the env vars still work as a safety net.
 *
 * Renders nothing visually; mounted once near the App root.
 */
export default function GoogleIntegrations() {
  const [remote, setRemote] = useState(null);

  // Pull dynamic settings once on mount.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/public/settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => { if (!cancelled) setRemote(data || {}); })
      .catch(() => { if (!cancelled) setRemote({}); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (remote === null) return;  // wait for the fetch to settle (success OR fail)

    const pick = (dbKey, envKey) =>
      (remote && remote[dbKey]) || process.env[envKey] || '';

    const ga    = pick('ga4_measurement_id',   'REACT_APP_GA4_MEASUREMENT_ID');
    const gtm   = pick('gtm_id',               'REACT_APP_GTM_ID');
    const ads   = pick('adsense_publisher_id', 'REACT_APP_ADSENSE_PUBLISHER_ID');
    const gsc   = pick('gsc_verification',     'REACT_APP_GSC_VERIFICATION');
    const bing  = pick('bing_verification',    'REACT_APP_BING_VERIFICATION');

    // ───────── Google Analytics 4 ─────────
    if (ga && !document.getElementById('ga4-loader')) {
      const s = document.createElement('script');
      s.id = 'ga4-loader';
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${ga}`;
      document.head.appendChild(s);
      const init = document.createElement('script');
      init.id = 'ga4-init';
      init.text = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${ga}', { anonymize_ip: true });
      `;
      document.head.appendChild(init);
    }

    // ───────── Google Tag Manager ─────────
    if (gtm && !document.getElementById('gtm-loader')) {
      const s = document.createElement('script');
      s.id = 'gtm-loader';
      s.text = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
        f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');
      `;
      document.head.appendChild(s);
      // GTM noscript fallback — use createElement to avoid innerHTML injection
      if (!document.getElementById('gtm-noscript')) {
        const ns = document.createElement('noscript');
        ns.id = 'gtm-noscript';
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtm)}`;
        iframe.height = '0';
        iframe.width = '0';
        iframe.style.cssText = 'display:none;visibility:hidden';
        ns.appendChild(iframe);
        document.body.prepend(ns);
      }
    }

    // ───────── Google AdSense (auto ads) ─────────
    if (ads && !document.getElementById('adsense-loader')) {
      const s = document.createElement('script');
      s.id = 'adsense-loader';
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads}`;
      document.head.appendChild(s);
    }

    // ───────── Search Console verification meta ─────────
    if (gsc && !document.querySelector('meta[name="google-site-verification"]')) {
      const m = document.createElement('meta');
      m.name = 'google-site-verification';
      m.content = gsc;
      document.head.appendChild(m);
    }

    // ───────── Bing Webmaster verification meta ─────────
    if (bing && !document.querySelector('meta[name="msvalidate.01"]')) {
      const m = document.createElement('meta');
      m.name = 'msvalidate.01';
      m.content = bing;
      document.head.appendChild(m);
    }
  }, [remote]);

  return null;
}

/**
 * Helper: fire a custom GA4 event from anywhere in the app.
 * Safe to call even when GA4 isn't configured — it's a no-op.
 *
 * Usage: trackEvent('subscription_started', { plan: 'monthly' });
 */
export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
