import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import LandingDemoCalculator from '@/components/landing/LandingDemoCalculator';
import AnimatedHeroChart from '@/components/landing/AnimatedHeroChart';
import AppComingSoon from '@/components/landing/AppComingSoon';
import { 
  TrendingUp, Calculator, Shield, Crown, ArrowRight, Check, 
  CandlestickChart, History, Bell, BookOpen, Wallet, Target, 
  Scale, FlaskConical, BarChart3, Globe, Moon, Sun, 
  LineChart, PieChart, DollarSign, Percent, Users, Award,
  ChevronRight, Play, Star, Briefcase, GraduationCap, ChevronDown,
  Sigma, MessageSquare, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RecommendedTools } from '@/components/common/RecommendedTools';
import { useAuthStore } from '@/lib/store';
import { useTranslation, languages } from '@/lib/i18n';
import { SITE_FACTS } from '@/lib/siteFacts';
import { useSEO } from '@/hooks/useSEO';
import { useThemeStore } from '@/lib/theme';

// ===== Motion variants (module-level constants to avoid inline-object re-renders) =====
const MOTION_FADE_UP = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const MOTION_FADE_UP_VIEW = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } };
const MOTION_SLIDE_RIGHT_VIEW = { initial: { opacity: 0, x: -20 }, whileInView: { opacity: 1, x: 0 } };
const MOTION_SLIDE_LEFT_VIEW = { initial: { opacity: 0, x: 20 }, whileInView: { opacity: 1, x: 0 } };
const MOTION_SCALE_IN_VIEW = { initial: { opacity: 0, scale: 0.9 }, whileInView: { opacity: 1, scale: 1 } };
const MOTION_SCALE_UP_VIEW = { initial: { opacity: 0, scale: 0.95 }, whileInView: { opacity: 1, scale: 1 } };
const TRANSITION_HERO = { duration: 0.6 };
const TRANSITION_STAGGER_SM = { delay: 0.05 };
const TRANSITION_STAGGER_MD = { delay: 0.1 };

// Features will use t() in component  
// Sin `color` por feature. Eran ocho chips de ocho colores distintos (verde,
// naranja, azul, morado, amarillo, rojo, cian, rosa): un arcoíris de categorías
// donde el color no codificaba nada, así que decoraba sin informar. Ahora el
// icono va monocromo en el color de marca.
const featuresData = [
  { icon: Calculator, key: 'professionalCalculators' },
  { icon: Sigma, key: 'optionsSuite' },
  { icon: CandlestickChart, key: 'tradingViewCharts' },
  { icon: BookOpen, key: 'tradingJournal' },
  { icon: PieChart, key: 'portfolioManagement' },
  { icon: Bell, key: 'emailAlerts' },
  { icon: FlaskConical, key: 'monteCarloSimulator' },
  { icon: GraduationCap, key: 'educationCenter' },
];

// Asset types will use t() in component
const assetTypesData = [
  { icon: TrendingUp, key: 'crypto' },
  { icon: DollarSign, key: 'forex' },
  { icon: Briefcase, key: 'stocks' },
  { icon: BarChart3, key: 'indices' },
  { icon: Award, key: 'commodities' },
  { icon: LineChart, key: 'futures' },
];

// Calculators will use t() in component
const calculatorsData = [
  { key: 'lotSizeCalculator' },
  { key: 'leverageCalculator' },
  { key: 'positionSizeCalculator' },
  { key: 'fibonacciCalculator' },
  { key: 'targetPriceCalculator' },
  { key: 'percentRequiredCalculator' },
  { key: 'optionsCalculator' },
  { key: 'monteCarloCalculator' },
  { key: 'simulatorProCalculator' },
];

// Coming soon — features being built (no dates promised, just teaser)
const comingSoonData = [
  { icon: MessageSquare, key: 'comingSoonForum' },
  { icon: Briefcase, key: 'comingSoonPortfolios' },
];

// Discipline features will use t() in component
const disciplineFeaturesData = [
  { icon: Target, key: 'advancedMetrics' },
  { icon: Shield, key: 'disciplineRules' },
  { icon: GraduationCap, key: 'professionalTrack' },
];

// Plans will use t() in component
const plansData = [
  { id: 'monthly' },
  { id: 'quarterly' },
  { id: 'annual', popular: true },
  { id: 'lifetime' },
];

// Testimonials data — names and roles preserved across locales (translation keys handle copy)
const TESTIMONIALS = [
  { quoteKey: 'testimonial1Quote_l010', authorKey: 'testimonial1Author_l011', roleKey: 'testimonial1Role_l012', initial: 'C' },
  { quoteKey: 'testimonial2Quote_l020', authorKey: 'testimonial2Author_l021', roleKey: 'testimonial2Role_l022', initial: 'A' },
  { quoteKey: 'testimonial3Quote_l030', authorKey: 'testimonial3Author_l031', roleKey: 'testimonial3Role_l032', initial: 'D' },
];

// FAQ data
const FAQS = [
  { qKey: 'faqQ1_l040', aKey: 'faqA1_l041' },
  { qKey: 'faqQ2_l050', aKey: 'faqA2_l051' },
  { qKey: 'faqQ3_l060', aKey: 'faqA3_l061' },
  { qKey: 'faqQ4_l070', aKey: 'faqA4_l071' },
  { qKey: 'faqQ5_l080', aKey: 'faqA5_l081' },
];

// Stats data will use t() in component

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const { t, detectBrowserLanguage } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const [openFaq, setOpenFaq] = useState(null);

  useSEO({
    titleKey: 'seoLandingTitle',
    descriptionKey: 'seoLandingDesc',
    canonicalPath: '/',
  });

  // Auto-detect browser language on first visit only
  useEffect(() => {
    detectBrowserLanguage();
  }, [detectBrowserLanguage]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 relative overflow-hidden">
        <AnimatedHeroChart />
        {/* Sin degradado ni orbes `blur-3xl`: el "blob difuminado" es el fondo
            genérico de 2023-25 y aquí competía con el gráfico de velas que sí
            dice algo. El hero se sostiene en el instrumento, no en el adorno. */}
        
        <div className="max-w-7xl mx-auto relative">
          <motion.div 
            {...MOTION_FADE_UP}
            transition={TRANSITION_HERO}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary font-medium">{t('tagline')}</span>
            </div>
            
            <h1 className="font-unbounded text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Trading Calculator<br />
              <span className="bg-gradient-to-r from-primary via-green-400 to-emerald-500 bg-clip-text text-transparent">PRO</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              {t('heroDescription')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-lg h-14 px-8" data-testid="hero-cta">
                  {isAuthenticated ? t('goToDashboard') : t('getStartedFree')}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="gap-2 text-lg h-14 px-8" data-testid="view-plans-btn">
                  {/* Sin oro: en el hero conviven este botón y el primario
                      verde, y dos acentos en la misma fila reparten la
                      atención en vez de dirigirla. Ver `identidad-visual` §2. */}
                  <Crown className="w-5 h-5 text-primary" />
                  {t('viewPremiumPlans')}
                </Button>
              </Link>
            </div>
            {!isAuthenticated && (
              <p className="text-sm text-primary font-medium -mt-8 mb-12" data-testid="hero-trial-note">
                {t('trialHeroNote')}
              </p>
            )}
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {/* Cuatro cifras, las cuatro comprobables.
                  Antes eran «24/7 disponible», «50+ activos», los idiomas y
                  «99,9 % de tiempo activo». La de activos se quedó corta —hay
                  186— y la de disponibilidad no la medía nadie: el propio
                  `market_data.py` dice que no hay SLA y devuelve precios con
                  `stale=true`. Un número que no se puede defender no vende, se
                  cae en cuanto alguien pregunta.
                  Las tres primeras salen de `SITE_FACTS`, que `engine-check`
                  contrasta con el código en CI; los idiomas, de la propia lista. */}
              {[
                { value: String(SITE_FACTS.calculators), labelKey: 'statsCalculators', delay: 0.2, icon: Calculator },
                { value: String(SITE_FACTS.assets),      labelKey: 'statsAssets',      delay: 0.3, icon: Layers },
                { value: String(SITE_FACTS.strategies),  labelKey: 'statsStrategies',  delay: 0.4, icon: Sigma },
                { value: String(languages.length),       labelKey: 'statsLanguages',   delay: 0.5, icon: Globe },
              ].map((stat) => {
                const Ic = stat.icon;
                return (
                  <motion.div
                    key={stat.labelKey}
                    {...MOTION_FADE_UP}
                    transition={{ delay: stat.delay }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Ic className="w-5 h-5 text-primary" />
                      <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{t(stat.labelKey)}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Free demo calculator — try before you register. Hidden once logged in:
          authenticated users already have the full Position Size calculator. */}
      {!isAuthenticated && <LandingDemoCalculator />}

      {/* Asset Types Section */}
      <section className="py-16 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('tradeAllMarkets')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('selectYourAssets')}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {assetTypesData.map((asset) => (
              <motion.div
                key={asset.key}
                {...MOTION_SCALE_IN_VIEW}
                transition={TRANSITION_STAGGER_SM}
                className="p-4 rounded-xl bg-background border border-border hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                  <asset.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-sm mb-1">{t(`${asset.key}Name`)}</h3>
                <p className="text-xs text-muted-foreground">{t(`${asset.key}Examples`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('professionalTools')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('professionalToolsDesc')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresData.map((feature) => (
              <motion.div
                key={feature.key}
                {...MOTION_FADE_UP_VIEW}
                transition={TRANSITION_STAGGER_MD}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/40 hover:-translate-y-px transition-[border-color,transform] duration-tick ease-out group"
              >
                <div className="mb-4 text-primary">
                  <feature.icon className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-lg mb-2">{t(feature.key)}</h3>
                <p className="text-muted-foreground text-sm">{t(`${feature.key}Desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculators Grid */}
      <section className="py-16 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('includedCalculators')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('calculatorsSuiteDesc')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calculatorsData.map((calc) => (
              <motion.div
                key={calc.key}
                {...MOTION_SLIDE_RIGHT_VIEW}
                transition={TRANSITION_STAGGER_SM}
                className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{t(calc.key)}</h3>
                  <p className="text-xs text-muted-foreground">{t(`${calc.key}Desc`)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon — Roadmap teaser */}
      <section className="py-20 px-4 bg-gradient-to-b from-background via-background to-card/30 relative overflow-hidden">
        {/* Subtle bg pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/10 border border-primary/30">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {t('comingSoonBadge')}
              </span>
            </div>
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('comingSoonTitle')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('comingSoonDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {comingSoonData.map((item) => {
              const Ic = item.icon;
              return (
                <motion.div
                  key={item.key}
                  {...MOTION_FADE_UP_VIEW}
                  transition={TRANSITION_STAGGER_MD}
                  className="relative p-6 rounded-xl bg-card border border-border hover:border-primary/40 transition-all group overflow-hidden"
                >
                  {/* Soon badge */}
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded bg-primary/10 border border-primary/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                      {t('comingSoonBadgeShort')}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Ic className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl mb-2">{t(item.key)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`${item.key}Desc`)}</p>
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 italic">
            {t('comingSoonFooter')}
          </p>
        </div>
      </section>

      {/* Discipline Features (Like Disciplined.me) */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('disciplinedTrading')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('disciplineDesc')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {disciplineFeaturesData.map((feature) => (
              <motion.div
                key={feature.key}
                {...MOTION_FADE_UP_VIEW}
                transition={TRANSITION_STAGGER_MD}
                className="p-6 rounded-xl bg-card border border-border"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-4">{t(feature.key)}</h3>
                <p className="text-sm text-muted-foreground">{t(`${feature.key}Items`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TradingView Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-card/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              {...MOTION_SLIDE_RIGHT_VIEW}
            >
              <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">
                {t('tradingViewSection')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('tradingViewSectionDesc')}
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>{t('tradingViewFeature1')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>{t('tradingViewFeature2')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>{t('tradingViewFeature3')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>{t('tradingViewFeature4')}</span>
                </li>
              </ul>
              <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                <Button className="gap-2">
                  <Play className="w-4 h-4" /> {t('viewDemo')}
                </Button>
              </Link>
            </motion.div>
            
            <motion.div
              {...MOTION_SLIDE_LEFT_VIEW}
              className="relative"
            >
              <div className="aspect-video rounded-xl bg-card border border-border overflow-hidden shadow-2xl">
                <div className="w-full h-full bg-secondary/40 flex items-center justify-center">
                  <CandlestickChart className="w-24 h-24 text-primary/50" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('premiumPlans')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('unlockPotentialDesc')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plansData.map((plan) => {
              const planKey = plan.id.charAt(0).toUpperCase() + plan.id.slice(1);
              return (
                <motion.div
                  key={plan.id}
                  {...MOTION_FADE_UP_VIEW}
                  transition={TRANSITION_STAGGER_MD}
                  className={`p-6 rounded-xl border relative flex flex-col ${
                    plan.popular 
                      ? 'bg-primary/5 border-primary/50 shadow-lg shadow-primary/10' 
                      : 'bg-card border-border'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {t('mostPopular')}
                    </div>
                  )}
                  
                  <h3 className="font-bold text-xl mb-2">{t(plan.id + 'Plan')}</h3>
                  <div className="mb-1">
                    <span className="font-unbounded text-4xl font-bold">{t(plan.id + 'Price')}</span>
                    <span className="text-muted-foreground text-sm">{t(plan.id + 'Period')}</span>
                  </div>
                  
                  <ul className="space-y-2 mt-4 mb-6 flex-1">
                    {plan.id === 'monthly' && (
                      <>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('allCalculators')}</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('proSimulator')}</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('emailSupport')}</span>
                        </li>
                      </>
                    )}
                    {plan.id === 'quarterly' && (
                      <>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('everythingInMonthly')}</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('save12Percent')}</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('prioritySupport')}</span>
                        </li>
                      </>
                    )}
                    {plan.id === 'annual' && (
                      <>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('earlyAccess')}</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('portfolioRebalancing')}</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('prioritySupport')}</span>
                        </li>
                      </>
                    )}
                    {plan.id === 'lifetime' && (
                      <>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('permanentAccess')}</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('allFutureUpdates')}</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{t('noRecurringPayments')}</span>
                        </li>
                      </>
                    )}
                  </ul>
                  
                  <Link to={`/pricing?plan=${plan.id}`} className="mt-auto">
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`} 
                      variant={plan.popular ? 'default' : 'outline'}
                      data-testid={`plan-${plan.id}-btn`}
                    >
                      {t('selectPlan')}
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Education Preview */}
      <section className="py-16 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('educationCenter')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('educationPreviewDesc')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['reversalPatternsTitle', 'continuationPatternsTitle', 'candlestickPatternsTitle', 'tradingRulesTitle'].map((topicKey) => (
              <motion.div
                key={topicKey}
                {...MOTION_FADE_UP_VIEW}
                transition={TRANSITION_STAGGER_MD}
                className="p-6 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors text-center group"
              >
                <GraduationCap className="w-10 h-10 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold">{t(topicKey)}</h3>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Link to="/education">
              <Button variant="outline" className="gap-2">
                {t('exploreLearningCenter')} <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Recommended Tools / Affiliate Partners */}
      <RecommendedTools />

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2
              {...MOTION_FADE_UP_VIEW}
              className="font-unbounded text-3xl md:text-4xl font-bold mb-4"
            >
              {t('testimonialsTitle_l001')}
            </motion.h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('testimonialsSubtitle_l002')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, idx) => (
              <motion.div
                key={testimonial.authorKey}
                {...MOTION_FADE_UP_VIEW}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors flex flex-col"
                data-testid={`testimonial-${idx}`}
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={`star-${testimonial.authorKey}-${i}`} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90 mb-4 flex-1">
                  "{t(testimonial.quoteKey)}"
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-primary">
                    {testimonial.initial}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t(testimonial.authorKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(testimonial.roleKey)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2
              {...MOTION_FADE_UP_VIEW}
              className="font-unbounded text-3xl md:text-4xl font-bold mb-4"
            >
              {t('faqTitle_l003')}
            </motion.h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('faqSubtitle_l004')}
            </p>
          </div>
          
          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <motion.div
                key={faq.qKey}
                {...MOTION_FADE_UP_VIEW}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl bg-card border border-border overflow-hidden"
                data-testid={`faq-${idx}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition-colors"
                  data-testid={`faq-toggle-${idx}`}
                >
                  <span className="font-semibold text-sm md:text-base">{t(faq.qKey)}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(faq.aKey)}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Install as an app today + stores coming soon */}
      <AppComingSoon />

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            {...MOTION_SCALE_UP_VIEW}
            className="p-8 md:p-12 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/20 text-center"
          >
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">
              {t('readyToPro')}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('joinThousands')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-lg h-14 px-8">
                  {t('startNow')} <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="gap-2 text-lg h-14 px-8">
                  {t('alreadyHaveAccount')}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
