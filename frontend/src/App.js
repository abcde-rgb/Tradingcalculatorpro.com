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

// Lazy loaded — split into separate chunks, only downloaded when navigated to
const DashboardPage    = lazy(() => import("@/pages/DashboardPage"));
const PricingPage      = lazy(() => import("@/pages/PricingPage"));
const SettingsPage     = lazy(() => import("@/pages/SettingsPage"));
const EducationPage    = lazy(() => import("@/pages/EducationPage"));
const SubscriptionPage = lazy(() => import("@/pages/SubscriptionPage"));
const OptionsPage      = lazy(() => import("@/pages/OptionsPage"));
const PerformancePage  = lazy(() => import("@/pages/PerformancePage"));
const AdminPage        = lazy(() => import("@/pages/AdminPage"));
const LegalPage        = lazy(() => import("@/pages/LegalPage"));
const ContactPage      = lazy(() => import("@/pages/ContactPage"));
const AboutPage        = lazy(() => import("@/pages/AboutPage"));
// Named exports from multi-export files — each becomes its own chunk entry point
const LoginPage          = lazy(() => import("@/pages/AuthPages").then(m => ({ default: m.LoginPage })));
const RegisterPage       = lazy(() => import("@/pages/AuthPages").then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/AuthPages").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage  = lazy(() => import("@/pages/AuthPages").then(m => ({ default: m.ResetPasswordPage })));
const MagicPage          = lazy(() => import("@/pages/AuthPages").then(m => ({ default: m.MagicPage })));
const PaymentSuccessPage = lazy(() => import("@/pages/PaymentPages").then(m => ({ default: m.PaymentSuccessPage })));
const PaymentCancelPage  = lazy(() => import("@/pages/PaymentPages").then(m => ({ default: m.PaymentCancelPage })));
const VerifyEmailPage    = lazy(() => import("@/pages/VerifyEmailPage"));

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
