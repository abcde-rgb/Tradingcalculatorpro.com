import { Link } from 'react-router-dom';
import { BarChart3, Target, Brain, Activity, TrendingUp, LineChart } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import CalculatorPage from '@/components/options/CalculatorPage';
import { useIsPremium } from '@/lib/premium';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';

/**
 * OptionsPage — integrates the full OPTIONS Calculator as a sub-section
 * inside Trading Calculator PRO, gated behind Premium subscription.
 */
export default function OptionsPage() {
  const isPremium = useIsPremium();
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  // El workspace es premium: no se indexa. Lo indexable es el hub público de
  // `/options` y las fichas de estrategia, que es donde vive la referencia.
  useSEO({
    titleKey: 'seoOptionsTitle',
    descriptionKey: 'seoOptionsDesc',
    canonicalPath: '/options/calculator',
    noindex: true,
  });

  // Premium Gate - Block non-authenticated OR non-premium users
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background" data-testid="options-page-gated">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh] px-4 pt-16">
          <div className="max-w-2xl w-full text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <LineChart className="h-24 w-24 text-primary mx-auto relative" />
            </div>

            <h1 className="text-4xl font-bold">{t('optionsSuiteTitle')} Premium</h1>
            <p className="text-xl text-muted-foreground">
              {t('optionsGateDescription')}
            </p>

            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">{t('optionsGateIncludedTitle')}</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                <li className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  <span>{t('optionsChainRealtime')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span>{t('optionsStrategyOptimizer')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span>{t('optionsAICoach')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span>{t('optionsFlowScanner')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>{t('optionsGreeksPortfolio')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>{t('optionsUnusualActivity')}</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {!isAuthenticated ? (
                <>
                  <Link to="/login">
                    <Button size="lg" className="w-full sm:w-auto" data-testid="options-gate-login-btn">
                      {t('login')}
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="options-gate-pricing-btn">
                      {t('viewPremiumPlans')}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/pricing">
                    <Button size="lg" className="w-full sm:w-auto" data-testid="options-gate-pricing-btn">
                      {t('viewPremiumPlans')}
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="options-gate-home-btn">
                      {t('backHome')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="options-page">
      <Header />
      <div className="pt-16">
        <CalculatorPage />
      </div>
      <Footer />
    </div>
  );
}
