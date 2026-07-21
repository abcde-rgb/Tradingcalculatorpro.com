import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Check, CreditCard, Wallet, ArrowRight, Loader2, Building, ShoppingCart, Zap, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import AnimatedHeroChart from '@/components/landing/AnimatedHeroChart';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import { toast } from 'sonner';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const API = process.env.REACT_APP_BACKEND_URL;

// Framer Motion variants — extracted to prevent re-creation per render
const HOVER_SCALE_UP = { scale: 1.02 };

// Plans will use t() for dynamic translation
const PLANS_DATA = [
  { id: 'monthly', popular: false },
  { id: 'quarterly', popular: false },
  { id: 'annual', popular: true },
  { id: 'lifetime', popular: false }
];

// Payment methods will use t() for dynamic translation
const PAYMENT_METHODS_DATA = [
  { id: 'card',    icon: CreditCard,  color: 'text-blue-500',   nameKey: 'creditDebitCard', descKey: 'creditCardDesc', lifetimeOnly: false },
  { id: 'sepa',    icon: Building,    color: 'text-emerald-500', nameKey: 'sepaDebit',       descKey: 'sepaDesc',       lifetimeOnly: false },
  { id: 'klarna',  icon: ShoppingCart,color: 'text-pink-500',   nameKey: 'klarnaPayment',   descKey: 'klarnaDesc',     lifetimeOnly: true  },
  { id: 'paypal',  icon: Wallet,      color: 'text-blue-400',   nameKey: 'paypalPayment',   descKey: 'paypalDesc',     lifetimeOnly: false },
  { id: 'nowpayments', icon: Coins,   color: 'text-amber-400',  nameKey: 'nowPaymentsPayment', descKey: 'nowPaymentsDesc', lifetimeOnly: false },
  { id: 'revolut', icon: Zap,         color: 'text-indigo-400', nameKey: 'revolutPayment',  descKey: 'revolutDesc',    lifetimeOnly: false },
];

// Processor name displayed in "Secure payment via {processor}" footer
const PAYMENT_PROCESSOR_NAMES = {
  card: 'Stripe',
  nowpayments: 'NOWPayments',
  revolut: 'Revolut',
  paypal: 'PayPal',
  sepa: 'Stripe (SEPA)',
  klarna: 'Klarna',
};

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const gated = location.state?.gated; // llegó redirigido por falta de suscripción
  const { isAuthenticated, token, user, refreshUser } = useAuthStore();
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || 'annual');
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [isLoading, setIsLoading] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState('');

  useSEO({
    titleKey: 'seoPricingTitle',
    descriptionKey: 'seoPricingDesc',
    canonicalPath: '/pricing',
  });

  useEffect(() => {
    const urlPlan = searchParams.get('plan');
    if (urlPlan && PLANS_DATA.find(p => p.id === urlPlan)) {
      setSelectedPlan(urlPlan);
    }
  }, [searchParams]);

  // Auto-deselect Klarna when switching away from lifetime
  useEffect(() => {
    if (selectedPlan !== 'lifetime' && selectedPayment === 'klarna') {
      setSelectedPayment('card');
    }
  }, [selectedPlan, selectedPayment]);

  // Load PayPal client ID from public settings
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/api/public/settings`)
      .then(r => r.ok ? r.json() : {})
      .then(d => { if (d.paypal_client_id) setPaypalClientId(d.paypal_client_id); })
      .catch(() => {});
  }, []);

  // The access token isn't persisted (memory-only). After a reload/deep-link the
  // token is null while isAuthenticated rehydrates true, so repopulate it via a
  // silent refresh — otherwise checkout/PayPal would send 'Bearer null'.
  useEffect(() => {
    if (isAuthenticated && !token) refreshUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isPremium = user?.is_premium;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error(t('mustLoginFirst'));
      navigate('/login');
      return;
    }

    if (isPremium) {
      toast.info(t('alreadyHaveSubscription'));
      return;
    }

    if (!API) {
      toast.error('Backend no configurado. Contacta soporte.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API}/api/checkout/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: selectedPlan,
          payment_method: selectedPayment,
          origin_url: window.location.origin
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.detail || t('checkoutError'));
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      if (data.checkout_url) {
        try { window.gtag?.('event', 'begin_checkout', { plan: selectedPlan, payment_method: selectedPayment }); } catch (_) {}
        window.location.href = data.checkout_url;
      } else {
        toast.error(t('checkoutError'));
      }
    } catch (error) {
      toast.error(t('connectionError'));
    }

    setIsLoading(false);
  };

  // PayPal: called by PayPalButtons to create the order on our backend
  const handlePayPalCreateOrder = async () => {
    if (!isAuthenticated) {
      toast.error(t('mustLoginFirst'));
      navigate('/login');
      throw new Error('not authenticated');
    }
    const response = await fetch(`${API}/api/checkout/create`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ plan_id: selectedPlan, payment_method: 'paypal', origin_url: window.location.origin }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      toast.error(err.detail || t('checkoutError'));
      throw new Error(err.detail || 'checkout failed');
    }
    const data = await response.json();
    if (!data.paypal_order_id) throw new Error('No paypal_order_id returned');
    try { window.gtag?.('event', 'begin_checkout', { plan: selectedPlan, payment_method: 'paypal' }); } catch (_) {}
    return data.paypal_order_id;
  };

  // PayPal: called after payer approves — capture and activate subscription
  const handlePayPalApprove = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/api/paypal/capture/${data.orderID}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.detail || t('checkoutError'));
        return;
      }
      try { window.gtag?.('event', 'purchase', { plan: selectedPlan, payment_method: 'paypal' }); } catch (_) {}
      navigate('/payment/success');
    } catch (err) {
      toast.error(t('connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlanData = PLANS_DATA.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12">
        {/* Banda animada a ancho completo de pantalla, con el MISMO tratamiento visual
            que el hero de la página principal (fade solo arriba, intensidad completa) */}
        <section className="relative overflow-hidden mb-12 py-12 md:py-16 px-4">
          <AnimatedHeroChart />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto text-center relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4">
                <Crown className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-yellow-500 font-medium">Premium</span>
              </div>
              <h1 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('choosePlanTitle')}</h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {t('choosePlanDesc')}
              </p>
              {isPremium && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('alreadyPremiumActive')}</span>
                </div>
              )}
              {gated && !isPremium && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500" data-testid="pricing-gated-notice">
                  <Crown className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('gatedNotice')}</span>
                </div>
              )}
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4">
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {PLANS_DATA.map((plan) => (
              <motion.div
                key={plan.id}
                whileHover={HOVER_SCALE_UP}
                onClick={() => setSelectedPlan(plan.id)}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all relative ${
                  selectedPlan === plan.id 
                    ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' 
                    : 'bg-card border-border hover:border-primary/30'
                }`}
                data-testid={`select-plan-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {t('mostPopular')}
                  </div>
                )}
                <h3 className="font-bold text-lg mb-2">{t(plan.id + 'Plan')}</h3>
                <div className="mb-4">
                  <span className="font-unbounded text-3xl font-bold">{t(plan.id + 'Price')}</span>
                  <span className="text-muted-foreground text-sm">{t(plan.id + 'Period')}</span>
                </div>
                {plan.id !== 'lifetime' && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-3" data-testid={`trial-badge-${plan.id}`}>
                    ✨ {t('trialBadge')}
                  </div>
                )}
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {t('allCalculators')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {t('proSimulator')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {t('backtesting')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {t('optionsSuitePremium')}
                  </li>
                </ul>
              </motion.div>
            ))}
          </div>
          
          {/* Payment Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Methods */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t('paymentMethodTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {PAYMENT_METHODS_DATA.map((method) => {
                  const isKlarnaLocked = method.lifetimeOnly && selectedPlan !== 'lifetime';
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        if (isKlarnaLocked) return;
                        setSelectedPayment(method.id);
                      }}
                      disabled={isKlarnaLocked}
                      title={isKlarnaLocked ? 'Klarna solo disponible en el plan De Por Vida (€500)' : undefined}
                      className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                        isKlarnaLocked
                          ? 'border-border opacity-40 cursor-not-allowed'
                          : selectedPayment === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                      data-testid={`payment-${method.id}`}
                    >
                      <method.icon className={`w-8 h-8 ${method.color}`} />
                      <div className="text-left flex-1">
                        <p className="font-semibold flex items-center gap-2">
                          {t(method.nameKey)}
                          {method.lifetimeOnly && (
                            <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded-full font-normal">
                              Solo Lifetime
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{t(method.descKey)}</p>
                      </div>
                      {selectedPayment === method.id && !isKlarnaLocked && (
                        <Check className="w-5 h-5 text-primary ml-auto" />
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
            
            {/* Order Summary */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t('orderSummaryTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedPlanData && (
                  <>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{t(selectedPlan + 'Plan')}</span>
                        <span className="font-mono text-lg">{t(selectedPlan + 'Price')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{t(selectedPlan + 'Period')}</p>
                    </div>
                    
                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>{t('total')}</span>
                        <span className="font-mono text-primary">{t(selectedPlan + 'Price')}</span>
                      </div>
                    </div>
                    
                    {selectedPayment === 'paypal' && paypalClientId && !isPremium ? (
                      <PayPalScriptProvider
                        options={{
                          clientId: paypalClientId,
                          currency: 'EUR',
                          intent: 'capture',
                          components: 'buttons',
                        }}
                      >
                        <PayPalButtons
                          style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
                          createOrder={handlePayPalCreateOrder}
                          onApprove={handlePayPalApprove}
                          onError={(err) => {
                            // createOrder/onApprove already surface a specific toast and
                            // re-throw, which lands here — don't double-toast. Log only.
                            console.error('[PayPal]', err);
                          }}
                          onCancel={() => toast.info('Pago PayPal cancelado')}
                          disabled={isLoading}
                        />
                      </PayPalScriptProvider>
                    ) : selectedPayment === 'paypal' && !paypalClientId && !isPremium ? (
                      <Button
                        onClick={handleCheckout}
                        disabled={isLoading || isPremium}
                        className="w-full h-14 text-lg bg-blue-500 text-white hover:bg-blue-600"
                        data-testid="checkout-btn"
                      >
                        {isLoading ? (
                          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('processing')}</>
                        ) : (
                          <>Pagar con PayPal <ArrowRight className="ml-2" /></>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCheckout}
                        disabled={isLoading || isPremium}
                        className="w-full h-14 text-lg bg-primary text-primary-foreground hover:bg-primary/90"
                        data-testid="checkout-btn"
                      >
                        {isLoading ? (
                          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('processing')}</>
                        ) : isPremium ? (
                          <>{t('alreadyPremiumButton')}</>
                        ) : selectedPlan !== 'lifetime' ? (
                          <>{t('trialCtaButton')} <ArrowRight className="ml-2" /></>
                        ) : (
                          <>{t('payButton')} {t(selectedPlan + 'Price')} <ArrowRight className="ml-2" /></>
                        )}
                      </Button>
                    )}

                    <div className="text-xs text-center text-muted-foreground space-y-1">
                      {selectedPlan !== 'lifetime' && !isPremium && (
                        <p className="text-primary font-medium" data-testid="trial-reassure">{t('trialReassure')}</p>
                      )}
                      <p>
                        {t('securePayment')} {PAYMENT_PROCESSOR_NAMES[selectedPayment] || 'Stripe'}
                      </p>
                      <p>{t('cancelAnytime')}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Features Comparison */}
          <div className="mt-16">
            <h2 className="font-unbounded text-2xl font-bold text-center mb-8">{t('whatsIncluded')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">{t('optionsSuiteTitle')}</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('optionsChainRealtime')}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('optionsStrategyOptimizer')}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('optionsAICoach')}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('optionsFlowScanner')}
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">{t('advancedSimulators')}</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      Monte Carlo
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('backtesting')}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('proSimulator')}
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">{t('analysisTools')}</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('tradingJournal')}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('completeStatistics')}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('portfolioRebalancing')}
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">{t('premiumSupportTitle')}</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('prioritySupport')}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('earlyAccess')}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      {t('exclusiveUpdates')}
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
