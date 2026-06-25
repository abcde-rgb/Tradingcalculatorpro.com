import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCookieConsent } from "@/components/common/CookieBanner";

const GA_ID = process.env.REACT_APP_GA4_MEASUREMENT_ID;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function initAnalytics() {
  if (!GA_ID || typeof window === "undefined") return false;
  if (getCookieConsent() !== 'all') return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };

  const existingScript = document.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"]`);
  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
  }

  if (!window.__gaInitialized) {
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: false, anonymize_ip: true });
    window.__gaInitialized = true;
  }

  return true;
}

// First-party, privacy-conscious view ping that powers the admin usage heatmap
// ("qué miran más los usuarios"). Only fires with full cookie consent and when a
// backend is configured. Sends the pathname only — no query string, no PII.
// Best-effort and fire-and-forget; never blocks navigation.
function trackView(pathname) {
  if (!BACKEND_URL || typeof window === "undefined") return;
  if (getCookieConsent() !== 'all') return;
  try {
    fetch(`${BACKEND_URL}/api/analytics/track`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch (_) { /* no-op */ }
}

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // GA4 pageview (respects consent inside initAnalytics)
    if (initAnalytics()) {
      window.gtag?.("config", GA_ID, {
        page_path: `${location.pathname}${location.search}`,
        page_title: document.title,
        page_location: window.location.href,
      });
    }

    // First-party heatmap ping (independent of GA being configured)
    trackView(location.pathname);
  }, [location]);

  return null;
}
