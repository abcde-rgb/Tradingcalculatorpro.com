import "@/App.css";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useI18nStore, languages } from "@/lib/i18n";
import { REF_STORAGE_KEY } from "@/lib/store";
import { startCloudPrefsSync } from "@/lib/cloudPrefs";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";
import GoogleIntegrations from "@/components/integrations/GoogleIntegrations";
import AnalyticsTracker from "@/components/integrations/AnalyticsTracker";
import CookieBanner from "@/components/common/CookieBanner";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { reloadFreshShell } from "@/lib/appShell";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ProfileCompletionPrompt from "@/components/auth/ProfileCompletionPrompt";

// Eagerly loaded — visible immediately on first paint
import LandingPage from "@/pages/LandingPage";
import NotFoundPage from "@/pages/NotFoundPage";

// After each deploy the old hashed chunks disappear from GitHub Pages; a
// browser holding a stale index.html then 404s when lazy-loading a route
// (ChunkLoadError) and the page never renders. Reload once (guarded against
// loops) so the browser picks up the fresh index.html and its live chunks.
const lazyRetry = (importer) =>
  lazy(() =>
    importer().catch((err) => {
      // sessionStorage throws in some privacy modes; a throw HERE would replace
      // the ChunkLoadError with a SecurityError and skip the recovery entirely.
      let last = 0;
      try { last = Number(sessionStorage.getItem("chunk_reload_at") || 0); } catch { /* no-op */ }
      if (Date.now() - last > 30_000) {
        try { sessionStorage.setItem("chunk_reload_at", String(Date.now())); } catch { /* no-op */ }
        // Drop the service worker and its caches before reloading: a plain
        // reload can be answered with the SAME stale shell, which 404s the same
        // chunk again and drops the user on the error screen.
        reloadFreshShell();
        return new Promise(() => {}); // reloading — never resolves
      }
      throw err; // second failure inside 30s → surface to the ErrorBoundary
    })
  );

// Lazy loaded — split into separate chunks, only downloaded when navigated to
const DashboardPage    = lazyRetry(() => import("@/pages/DashboardPage"));
const PricingPage      = lazyRetry(() => import("@/pages/PricingPage"));
const SettingsPage     = lazyRetry(() => import("@/pages/SettingsPage"));
// The academy strings live in a lazy chunk (see scripts/split-i18n-edu.js).
// Await it alongside the page so the first render can never show a raw key.
const EducationPage    = lazyRetry(() => Promise.all([
  import("@/pages/EducationPage"),
  import("@/lib/i18n").then((m) => m.loadEduDict(useI18nStore.getState().locale)),
]).then(([mod]) => mod));
const SubscriptionPage = lazyRetry(() => import("@/pages/SubscriptionPage"));
const OptionsPage      = lazyRetry(() => import("@/pages/OptionsPage"));
const OptionsHubPage   = lazyRetry(() => import("@/pages/OptionsHubPage"));
const OptionsStrategiesIndexPage = lazyRetry(() =>
  import("@/pages/OptionsHubPage").then((m) => ({ default: m.OptionsStrategiesIndexPage }))
);
const OptionsStrategyPage = lazyRetry(() => import("@/pages/OptionsStrategyPage"));
const NewsPage         = lazyRetry(() => import("@/pages/NewsPage"));
const PerformancePage  = lazyRetry(() => import("@/pages/PerformancePage"));
const TradingPlanPage  = lazyRetry(() => import("@/pages/TradingPlanPage"));
const BacktestingPage  = lazyRetry(() => import("@/pages/BacktestingPage"));
const AdminPage        = lazyRetry(() => import("@/pages/AdminPage"));
const AffiliatePage    = lazyRetry(() => import("@/pages/AffiliatePage"));
const LegalPage        = lazyRetry(() => import("@/pages/LegalPage"));
const ContactPage      = lazyRetry(() => import("@/pages/ContactPage"));
const AboutPage        = lazyRetry(() => import("@/pages/AboutPage"));
// Named exports from multi-export files — each becomes its own chunk entry point
const LoginPage          = lazyRetry(() => import("@/pages/AuthPages").then(m => ({ default: m.LoginPage })));
const RegisterPage       = lazyRetry(() => import("@/pages/AuthPages").then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazyRetry(() => import("@/pages/AuthPages").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage  = lazyRetry(() => import("@/pages/AuthPages").then(m => ({ default: m.ResetPasswordPage })));
const MagicPage          = lazyRetry(() => import("@/pages/AuthPages").then(m => ({ default: m.MagicPage })));
const PaymentSuccessPage = lazyRetry(() => import("@/pages/PaymentPages").then(m => ({ default: m.PaymentSuccessPage })));
const PaymentCancelPage  = lazyRetry(() => import("@/pages/PaymentPages").then(m => ({ default: m.PaymentCancelPage })));
const VerifyEmailPage    = lazyRetry(() => import("@/pages/VerifyEmailPage"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

// Honour an explicit ?lang= in the URL (shareable links + makes the hreflang
// alternates emitted by useSEO truthful). Runs on every route; a bare language
// switch from the selector doesn't add ?lang=, so it never fights the user.
function LangSync() {
  const location = useLocation();
  useEffect(() => {
    const p = new URLSearchParams(location.search).get('lang');
    if (!p) return;
    const st = useI18nStore.getState();
    if (languages.some((l) => l.code === p) && p !== st.locale) {
      st.setLocale(p);
      useI18nStore.setState({ autoDetected: true }); // don't let browser-detect override a shared link
    }
  }, [location.search]);
  return null;
}

// Los ajustes del usuario (tema, idioma, preferencias, favoritos, progreso de
// la Academia y el sistema de trading con sus setups) viajan con la cuenta, no
// con el navegador. Se engancha una sola vez y reacciona a la sesión: en una
// recarga el token no está hasta que la cookie lo repone. Ver `lib/cloudPrefs.js`.
function CloudPrefsSync() {
  useEffect(() => startCloudPrefsSync(), []);
  return null;
}

// Capture a referral code from ?ref=CODE on any landing and remember it, so it can
// be attributed when the visitor registers (see trackReferral in store.js).
function RefCapture() {
  const location = useLocation();
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('ref');
    if (code && /^[A-Za-z0-9]{4,16}$/.test(code)) {
      try { localStorage.setItem(REF_STORAGE_KEY, code.toUpperCase()); } catch (_) {}
    }
  }, [location.search]);
  return null;
}

const AppContent = () => (
  <div className="App">
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <AnalyticsTracker />
      <LangSync />
      <RefCapture />
      <CloudPrefsSync />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                element={<LandingPage />} />
          <Route path="/dashboard"       element={<ProtectedRoute premiumOnly><DashboardPage /></ProtectedRoute>} />
          <Route path="/pricing"         element={<PricingPage />} />
          <Route path="/settings"        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/education"       element={<ProtectedRoute premiumOnly><EducationPage /></ProtectedRoute>} />
          <Route path="/subscription"    element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
          {/* La referencia es pública y tiene URL propia; el workspace en vivo
              sigue siendo premium y se ha movido a /options/calculator. Las
              rutas más específicas van ANTES que /options/:algo para que
              `strategies` no se coma a `calculator`. */}
          <Route path="/options"                    element={<ProtectedRoute premiumOnly><OptionsHubPage /></ProtectedRoute>} />
          <Route path="/options/calculator"         element={<ProtectedRoute premiumOnly><OptionsPage /></ProtectedRoute>} />
          <Route path="/options/strategies"         element={<ProtectedRoute premiumOnly><OptionsStrategiesIndexPage /></ProtectedRoute>} />
          <Route path="/options/strategies/:slug"   element={<ProtectedRoute premiumOnly><OptionsStrategyPage /></ProtectedRoute>} />
          <Route path="/performance"     element={<ProtectedRoute premiumOnly><PerformancePage /></ProtectedRoute>} />
          {/* El plan de trading: escrito, versionado y medido contra el diario. */}
          <Route path="/plan"            element={<ProtectedRoute premiumOnly><TradingPlanPage /></ProtectedRoute>} />
          {/* Sin ProtectedRoute a propósito: lo que hay dentro es una herramienta
              gratuita de terceros y cobrar por ella sería vender lo que no es tuyo. */}
          <Route path="/backtesting"     element={<BacktestingPage />} />
          <Route path="/news"            element={<ProtectedRoute premiumOnly><NewsPage /></ProtectedRoute>} />
          <Route path="/admin"           element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
          <Route path="/affiliate"       element={<ProtectedRoute><AffiliatePage /></ProtectedRoute>} />
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/verify-email"    element={<VerifyEmailPage />} />
          <Route path="/magic"           element={<MagicPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/cancel"  element={<PaymentCancelPage />} />
          <Route path="/legal"           element={<LegalPage />} />
          <Route path="/contact"         element={<ContactPage />} />
          <Route path="/about"           element={<AboutPage />} />
          <Route path="*"                element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <ProfileCompletionPrompt />
      <CookieBanner />
    </BrowserRouter>
    <Toaster position="top-right" richColors />
  </div>
);

function App() {
  const content = GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleIntegrations />
      <AppContent />
    </GoogleOAuthProvider>
  ) : (
    <AppContent />
  );

  return <ErrorBoundary>{content}</ErrorBoundary>;
}

export default App;
