import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";
import GoogleIntegrations from "@/components/integrations/GoogleIntegrations";
import AnalyticsTracker from "@/components/integrations/AnalyticsTracker";
import CookieBanner from "@/components/common/CookieBanner";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import ProtectedRoute from "@/components/common/ProtectedRoute";

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
      const KEY = "chunk_reload_at";
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
        return new Promise(() => {}); // reloading — never resolves
      }
      throw err; // second failure inside 30s → surface to the ErrorBoundary
    })
  );

// Lazy loaded — split into separate chunks, only downloaded when navigated to
const DashboardPage    = lazyRetry(() => import("@/pages/DashboardPage"));
const PricingPage      = lazyRetry(() => import("@/pages/PricingPage"));
const SettingsPage     = lazyRetry(() => import("@/pages/SettingsPage"));
const EducationPage    = lazyRetry(() => import("@/pages/EducationPage"));
const SubscriptionPage = lazyRetry(() => import("@/pages/SubscriptionPage"));
const OptionsPage      = lazyRetry(() => import("@/pages/OptionsPage"));
const PerformancePage  = lazyRetry(() => import("@/pages/PerformancePage"));
const AdminPage        = lazyRetry(() => import("@/pages/AdminPage"));
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

const AppContent = () => (
  <div className="App">
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <AnalyticsTracker />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                element={<LandingPage />} />
          <Route path="/dashboard"       element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/pricing"         element={<PricingPage />} />
          <Route path="/settings"        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/education"       element={<EducationPage />} />
          <Route path="/subscription"    element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
          <Route path="/options"         element={<OptionsPage />} />
          <Route path="/performance"     element={<ProtectedRoute><PerformancePage /></ProtectedRoute>} />
          <Route path="/admin"           element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
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
