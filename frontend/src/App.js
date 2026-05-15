import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";
import GoogleIntegrations from "@/components/integrations/GoogleIntegrations";
import AnalyticsTracker from "@/components/integrations/AnalyticsTracker";

// Pages
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import PricingPage from "@/pages/PricingPage";
import SettingsPage from "@/pages/SettingsPage";
import EducationPage from "@/pages/EducationPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import OptionsPage from "@/pages/OptionsPage";
import PerformancePage from "@/pages/PerformancePage";
import AdminPage from "@/pages/AdminPage";
import { LoginPage, RegisterPage } from "@/pages/AuthPages";
import { PaymentSuccessPage, PaymentCancelPage } from "@/pages/PaymentPages";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const AppContent = () => (
  <div className="App">
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/education" element={<EducationPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/options" element={<OptionsPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/payment/cancel" element={<PaymentCancelPage />} />
      </Routes>
    </BrowserRouter>
    <Toaster position="top-right" richColors />
  </div>
);

function App() {
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <GoogleIntegrations />
        <AppContent />
      </GoogleOAuthProvider>
    );
  }
  return <AppContent />;
}

export default App;
