import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCookieConsent } from "@/components/common/CookieBanner";

const GA_ID = process.env.REACT_APP_GA4_MEASUREMENT_ID;

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

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!initAnalytics()) return;

    window.gtag?.("config", GA_ID, {
      page_path: `${location.pathname}${location.search}`,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [location]);

  return null;
}
