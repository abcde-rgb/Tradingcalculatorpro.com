import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Check, CreditCard, Wallet, Bitcoin, ArrowRight, Loader2, Building, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import { toast } from 'sonner';

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
  { id: 'crypto',  icon: Bitcoin,     color: 'text-orange-500', nameKey: 'cryptoPayment',   descKey: 'cryptoDesc',     lifetimeOnly: false },
];

// Processor name displayed in "Secure payment via {processor}" footer
const PAYMENT_PROCESSOR_NAMES = {
  card: 'Stripe',
  crypto: 'Stripe (Crypto)',
  paypal: 'PayPal',
  sepa: 'Stripe (SEPA)',
  klarna: 'Klarna',
};

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, token, user, refreshUser } = useAuthStore();
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || 'annual');
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [isLoading, setIsLoading] = useState(false);

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

      const data = await response.json();

      if (response.ok && data.checkout_url) {
        try { window.gtag?.('event', 'begin_checkout', { plan: selectedPlan, payment_method: selectedPayment }); } catch (_) {}
        window.location.href = data.checkout_url;
      } else {
        toast.error(data.detail || t('checkoutError'));
      }
    } catch (error) {
      toast.error(t('connectionError'));
    }

    setIsLoading(false);
  };

  const selectedPlanData = PLANS_DATA.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
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
          </div>
          
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
                      ) : (
                        <>{t('payButton')} {t(selectedPlan + 'Price')} <ArrowRight className="ml-2" /></>
                      )}
                    </Button>
                    
                    <div className="text-xs text-center text-muted-foreground space-y-1">
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
