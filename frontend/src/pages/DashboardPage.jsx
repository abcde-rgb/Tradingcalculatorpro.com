import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TradingViewChart } from '@/components/charts/TradingViewChart';
import { PercentageCalculator } from '@/components/calculators/PercentageCalculator';
import { TargetPriceCalculator } from '@/components/calculators/TargetPriceCalculator';
import { LeverageCalculator } from '@/components/calculators/LeverageCalculator';
import { SpotCalculator } from '@/components/calculators/SpotCalculator';
import { PositionSizeCalculator } from '@/components/calculators/PositionSizeCalculator';
import { LotSizeCalculator } from '@/components/calculators/LotSizeCalculator';
import { FibonacciCalculator } from '@/components/calculators/FibonacciCalculator';
import { MonteCarloSimulator } from '@/components/calculators/MonteCarloSimulator';
import { SimulatorPro } from '@/components/calculators/SimulatorPro';
import { PatternTradingCalculator } from '@/components/calculators/PatternTradingCalculator';
import { BlackScholesCalculator } from '@/components/calculators/BlackScholesCalculator';
import { TargetMeasurementTool } from '@/components/tools/TargetMeasurementTool';
import { TradingJournal } from '@/components/tools/TradingJournal';
import { PriceAlerts } from '@/components/dashboard/PriceAlerts';
import { CalculationHistory } from '@/components/dashboard/CalculationHistory';
import { JournalStats } from '@/components/dashboard/JournalStats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore, usePriceStore } from '@/lib/store';
import { useIsPremium } from '@/lib/premium';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/useSEO';
import OnboardingModal from '@/components/common/OnboardingModal';
import {
  Calculator, Target, Gauge, Wallet, FlaskConical,
  Ruler, BookOpen, Scale, TrendingUp, DollarSign, BarChart3, Dice1, Hexagon, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, refreshUser, isAuthenticated } = useAuthStore();
  const { fetchPrices } = usePriceStore();
  const { t } = useTranslation();
  const isPremium = useIsPremium();
  const [activeTab, setActiveTab] = useState('percentage');
  const [searchParams] = useSearchParams();

  useSEO({
    titleKey: 'seoDashboardTitle',
    descriptionKey: 'seoDashboardDesc',
    canonicalPath: '/dashboard',
  });

  // Allow deep-linking to a calculator from outside (e.g. /dashboard?tab=leverage).
  useEffect(() => {
    const requested = searchParams.get('tab');
    const allowed = [
      'percentage', 'target', 'leverage', 'position', 'lotsize',
      'fibonacci', 'spot', 'pattern', 'montecarlo', 'simulator', 'measure',
      'black-scholes',
    ];
    if (requested && allowed.includes(requested)) setActiveTab(requested);
  }, [searchParams]);

  useEffect(() => {
    refreshUser();
    fetchPrices();
    
    // Refresh prices every 30 seconds
    const interval = setInterval(() => {
      fetchPrices();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshUser, fetchPrices]); // Fixed: Added all dependencies

  // Premium Gate - Redirect non-premium users (authenticated OR not authenticated)
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="max-w-2xl w-full text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <Calculator className="relative h-24 w-24 text-primary mx-auto" />
            </div>
            
            <h1 className="text-4xl font-bold">{t('dashboardGateTitle')}</h1>
            <p className="text-xl text-muted-foreground">
              {t('dashboardGateDescription')}
            </p>
            
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">{t('dashboardFeaturesTitle')}</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                <li className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>{t('featureTVChart')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <span>{t('featureCalculators')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>{t('featureMonteCarlo')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span>{t('featureFiboAdvanced')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span>{t('featureTradingJournal')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span>{t('featurePriceAlerts')}</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {!isAuthenticated ? (
                <>
                  <Link to="/login">
                    <Button size="lg" className="w-full sm:w-auto">
                      {t('login')}
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      {t('viewPremiumPlans')}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/pricing">
                    <Button size="lg" className="w-full sm:w-auto">
                      {t('viewPremiumPlans')}
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      {t('backHome')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingModal />
      <Header />

      {/* Email verification banner */}
      {user && user.email_verified === false && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 text-center text-sm text-yellow-400 flex items-center justify-center gap-2">
          <span>⚠️ {t('emailNotVerifiedBanner')}</span>
          <button
            className="underline hover:text-yellow-300 ml-2"
            onClick={() => {
              const backendUrl = process.env.REACT_APP_BACKEND_URL;
              if (!backendUrl) return;
              fetch(`${backendUrl}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${useAuthStore.getState().token}` },
              })
                .then(() => toast.success(t('emailVerificationSent')))
                .catch(() => toast.error(t('emailVerificationError')));
            }}
          >
            {t('emailResendVerification')}
          </button>
        </div>
      )}

      <main className="pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-unbounded text-2xl md:text-3xl font-bold" data-testid="dashboard-welcome">
                {user ? `${t('dashboard')}: ${user.name}` : t('dashboard')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('tagline')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/education">
                <Button variant="outline" className="gap-2" data-testid="education-btn">
                  <BookOpen className="w-4 h-4" /> {t('educationCenter')}
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Stats Row */}
          {isPremium && <JournalStats />}
          
          {/* Main Content - Full Width */}
          <div className="space-y-6">
            {/* TradingView Chart */}
            <TradingViewChart />
            
            {/* Price Alerts and Calculation History - Below Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PriceAlerts />
              <CalculationHistory />
            </div>
            
            {/* Calculators Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="bg-card border border-border p-1 h-auto flex-wrap justify-start gap-1">
                <TabsTrigger 
                  value="percentage" 
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                  data-testid="tab-percentage"
                >
                  <Calculator className="w-3 h-3" /> {t('percentageRequired')}
                </TabsTrigger>
                <TabsTrigger 
                  value="target" 
                  className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs"
                  data-testid="tab-target"
                >
                  <Target className="w-3 h-3" /> {t('targetPrice')}
                </TabsTrigger>
                <TabsTrigger 
                  value="leverage" 
                  className="gap-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs"
                  data-testid="tab-leverage"
                >
                  <Gauge className="w-3 h-3" /> {t('leverage')}
                </TabsTrigger>
                <TabsTrigger 
                  value="position" 
                  className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs"
                  data-testid="tab-position"
                >
                  <Scale className="w-3 h-3" /> {t('positionSize')}
                </TabsTrigger>
                <TabsTrigger 
                  value="lotsize" 
                  className="gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-xs"
                  data-testid="tab-lotsize"
                >
                  <DollarSign className="w-3 h-3" /> {t('lotSize')}
                </TabsTrigger>
                <TabsTrigger 
                  value="fibonacci" 
                  className="gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs"
                  data-testid="tab-fibonacci"
                >
                  <TrendingUp className="w-3 h-3" /> {t('fibonacci')}
                </TabsTrigger>
                <TabsTrigger 
                  value="spot" 
                  className="gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white text-xs"
                  data-testid="tab-spot"
                >
                  <Wallet className="w-3 h-3" /> {t('spot')}
                </TabsTrigger>
                <TabsTrigger 
                  value="pattern" 
                  className="gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs"
                  data-testid="tab-pattern"
                >
                  <Hexagon className="w-3 h-3" /> {t('patternTrading')}
                </TabsTrigger>
                <TabsTrigger
                  value="measure"
                  className="gap-2 data-[state=active]:bg-pink-500 data-[state=active]:text-white text-xs"
                  data-testid="tab-measure"
                >
                  <Ruler className="w-3 h-3" /> {t('measureTarget')}
                </TabsTrigger>
                <TabsTrigger
                  value="black-scholes"
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                  data-testid="tab-black-scholes"
                >
                  <Activity className="w-3 h-3" /> {t('bsTabLabel')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="percentage">
                <PercentageCalculator />
              </TabsContent>
              <TabsContent value="target">
                <TargetPriceCalculator />
              </TabsContent>
              <TabsContent value="leverage">
                <LeverageCalculator />
              </TabsContent>
              <TabsContent value="position">
                <PositionSizeCalculator />
              </TabsContent>
              <TabsContent value="lotsize">
                <LotSizeCalculator />
              </TabsContent>
              <TabsContent value="fibonacci">
                <FibonacciCalculator />
              </TabsContent>
              <TabsContent value="spot">
                <SpotCalculator />
              </TabsContent>
              <TabsContent value="pattern">
                <PatternTradingCalculator />
              </TabsContent>
              <TabsContent value="measure">
                <TargetMeasurementTool />
              </TabsContent>
              <TabsContent value="black-scholes">
                <BlackScholesCalculator />
              </TabsContent>
            </Tabs>

            {/* Simulators (Premium) */}
            <Tabs defaultValue="montecarlo" className="space-y-4">
              <TabsList className="bg-card border border-border p-1">
                <TabsTrigger 
                  value="montecarlo" 
                  className="gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white text-xs"
                  data-testid="tab-montecarlo"
                >
                  <Dice1 className="w-3 h-3" /> {t('monteCarlo')}
                </TabsTrigger>
                <TabsTrigger 
                  value="simulator" 
                  className="gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-xs"
                  data-testid="tab-simulator"
                >
                  <FlaskConical className="w-3 h-3" /> {t('simulator')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="montecarlo">
                <MonteCarloSimulator />
              </TabsContent>
              <TabsContent value="simulator">
                <SimulatorPro />
              </TabsContent>
            </Tabs>
            
            {/* Trading Journal */}
            <TradingJournal />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
