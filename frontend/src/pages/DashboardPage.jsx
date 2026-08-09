import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TradingViewChart } from '@/components/charts/TradingViewChart';
import StructureScanner from '@/components/charts/StructureScanner';
import { PercentageCalculator } from '@/components/calculators/PercentageCalculator';
import { TargetPriceCalculator } from '@/components/calculators/TargetPriceCalculator';
import { LeverageCalculator } from '@/components/calculators/LeverageCalculator';
import { SpotCalculator } from '@/components/calculators/SpotCalculator';
import { PositionSizeCalculator } from '@/components/calculators/PositionSizeCalculator';
import { LotSizeCalculator } from '@/components/calculators/LotSizeCalculator';
import { PartialExitCalculator } from '@/components/calculators/PartialExitCalculator';
import { FibonacciCalculator } from '@/components/calculators/FibonacciCalculator';
import { MonteCarloSimulator } from '@/components/calculators/MonteCarloSimulator';
import { SimulatorPro } from '@/components/calculators/SimulatorPro';
import { PatternTradingCalculator } from '@/components/calculators/PatternTradingCalculator';
import { FuturesCalculator } from '@/components/calculators/FuturesCalculator';
import { CompoundCalculator } from '@/components/calculators/CompoundCalculator';
import { Watchlist } from '@/components/dashboard/Watchlist';
import { EconomicCalendar } from '@/components/dashboard/EconomicCalendar';
import { NextDataCountdown } from '@/components/dashboard/NextDataCountdown';
import { SpeakersWatch } from '@/components/dashboard/SpeakersWatch';
import { TargetMeasurementTool } from '@/components/tools/TargetMeasurementTool';
import { TradingJournal } from '@/components/tools/TradingJournal';
import { PriceAlerts } from '@/components/dashboard/PriceAlerts';
import { CalculationHistory } from '@/components/dashboard/CalculationHistory';
import { JournalStats } from '@/components/dashboard/JournalStats';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useAuthStore, usePriceStore } from '@/lib/store';
import { useIsPremium } from '@/lib/premium';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/useSEO';
import OnboardingModal from '@/components/common/OnboardingModal';
import {
  Calculator, Target, FlaskConical, Star, Clock, Search,
  BookOpen, Scale, TrendingUp, DollarSign, BarChart3
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Subtle entrance animation reused across the dashboard blocks.
const RISE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const { user, refreshUser, isAuthenticated } = useAuthStore();
  const { fetchPrices } = usePriceStore();
  const { t } = useTranslation();
  const isPremium = useIsPremium();
  const [activeTab, setActiveTab] = useState('position');
  const [searchParams] = useSearchParams();

  // Calculator workstation — 12 tools grouped by function, broker-terminal
  // style: one accent colour, two-level nav (group row + tool row).
  const CALC_NAV = [
    { id: 'risk', label: t('calcCatRisk'), Icon: Scale, items: [
      { value: 'position', label: t('positionSize') },
      { value: 'lotsize', label: t('lotSize') },
      { value: 'partial-exit', label: t('pxcTitle') },
      { value: 'leverage', label: t('leverage') },
      { value: 'futures', label: t('futuresTabLabel') },
    ]},
    { id: 'price', label: t('calcCatPrice'), Icon: Target, items: [
      { value: 'target', label: t('targetPrice') },
      { value: 'percentage', label: t('percentageRequired') },
      { value: 'spot', label: t('spot') },
      { value: 'measure', label: t('measureTarget') },
    ]},
    { id: 'tech', label: t('calcCatTech'), Icon: TrendingUp, items: [
      { value: 'fibonacci', label: t('fibonacci') },
      { value: 'pattern', label: t('patternTrading') },
    ]},
    { id: 'sim', label: t('calcCatSim'), Icon: FlaskConical, items: [
      { value: 'montecarlo', label: t('monteCarlo') },
      { value: 'simulator', label: t('simulator') },
      { value: 'compound', label: t('cmpTitle') },
    ]},
  ];
  const activeCalcGroup = CALC_NAV.find(g => g.items.some(it => it.value === activeTab)) || CALC_NAV[0];
  const ALL_CALC_TOOLS = CALC_NAV.flatMap(g => g.items);

  // Quick access: starred favourites + auto-tracked recents (localStorage).
  const [calcFavs, setCalcFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tcp-calc-favs') || '[]'); } catch { return []; }
  });
  const [calcRecents, setCalcRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tcp-calc-recents') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    setCalcRecents(prev => {
      const next = [activeTab, ...prev.filter(v => v !== activeTab)].slice(0, 4);
      try { localStorage.setItem('tcp-calc-recents', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [activeTab]);
  const toggleCalcFav = (value) => {
    setCalcFavs(prev => {
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value].slice(0, 6);
      try { localStorage.setItem('tcp-calc-favs', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const quickAccess = [
    ...calcFavs.map(v => ({ value: v, fav: true })),
    ...calcRecents.filter(v => !calcFavs.includes(v) && v !== activeTab).map(v => ({ value: v, fav: false })),
  ].filter(q => ALL_CALC_TOOLS.some(it => it.value === q.value)).slice(0, 6);

  // Filtro de la barra lateral. Con 14 herramientas repartidas en 4 grupos, leer
  // la lista entera cuesta más que teclear tres letras — el mismo motivo por el
  // que la barra de la Academia lleva buscador.
  const [calcQuery, setCalcQuery] = useState('');
  // `idx` es la posición en el índice COMPLETO, no en el resultado filtrado: el
  // número identifica al grupo, así que «Análisis técnico» es el 03 tanto si se
  // ve la lista entera como si es lo único que ha sobrevivido a la búsqueda.
  // `total` es el tamaño real del grupo por el mismo motivo.
  const calcNavFiltered = CALC_NAV
    .map((g, i) => ({
      ...g,
      idx: i,
      total: g.items.length,
      items: g.items.filter(it =>
        !calcQuery || it.label.toLowerCase().includes(calcQuery.trim().toLowerCase())),
    }))
    .filter(g => g.items.length > 0);

  useSEO({
    titleKey: 'seoDashboardTitle',
    descriptionKey: 'seoDashboardDesc',
    canonicalPath: '/dashboard',
    noindex: true,   // página premium tras login — no indexar
  });

  // Allow deep-linking to a calculator from outside (e.g. /dashboard?tab=leverage).
  useEffect(() => {
    const requested = searchParams.get('tab');
    const allowed = [
      'percentage', 'target', 'leverage', 'position', 'lotsize',
      'fibonacci', 'spot', 'pattern', 'montecarlo', 'simulator', 'measure',
      'futures', 'compound', 'partial-exit',
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
              fetch(`${backendUrl}/api/auth/resend-verification`, { credentials: 'include',
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
        {/* 2xl+: ultrawide screens left ~50% of the viewport empty. The
            data-dense blocks below benefit from the extra width. */}
        <div className="max-w-7xl 2xl:max-w-[1720px] mx-auto space-y-6">
          {/* Welcome */}
          <motion.div {...RISE} transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex items-center justify-between flex-wrap gap-4">
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
          </motion.div>
          
          {/* Stats Row */}
          {isPremium && (
            <motion.div {...RISE} transition={{ duration: 0.4, ease: 'easeOut' }}>
              <JournalStats />
            </motion.div>
          )}

          {/* Main Content - Full Width. Calculators first: they ARE the product. */}
          <div className="space-y-6">
            {/* Calculator workstation — 12 tools grouped by function, one accent */}
            <motion.div {...RISE} transition={{ duration: 0.45, delay: 0.06, ease: 'easeOut' }}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* La estación es un layout de dos columnas: el índice de herramientas
                vive en una barra lateral fija (mismo patrón que la Academia) y la
                calculadora activa ocupa el resto. Antes eran dos filas de chips
                con scroll horizontal encima del contenido: con 14 herramientas
                obligaban a arrastrar para ver qué había, y empujaban la
                calculadora hacia abajo en cada cambio de grupo. */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8" data-testid="calc-workstation">

              {/* ── Barra lateral (desktop) ───────────────────────────── */}
              <aside className="hidden lg:block w-60 xl:w-64 flex-shrink-0" data-testid="calc-sidebar">
                <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-8 space-y-5">
                  <div>
                    <h2 className="flex items-center gap-2 px-1 mb-3 text-sm font-bold">
                      <Calculator className="w-4 h-4 text-primary" />
                      {t('calcWorkstationTitle')}
                      <span className="ml-auto font-mono text-[11px] font-normal text-muted-foreground tabular-nums">
                        {ALL_CALC_TOOLS.length}
                      </span>
                    </h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        value={calcQuery}
                        onChange={(e) => setCalcQuery(e.target.value)}
                        placeholder={t('calcSearchTool')}
                        className="pl-9 h-9 text-sm"
                        data-testid="calc-tool-search"
                      />
                    </div>
                  </div>

                  {/* Acceso rápido: favoritos y luego recientes. Se oculta al
                      buscar — teclear ya ES el atajo, y dejarlo compite con los
                      resultados. */}
                  {!calcQuery && quickAccess.length > 0 && (
                    <div data-testid="calc-quick-access">
                      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        {t('calcQuickAccess')}
                      </p>
                      <div className="space-y-0.5">
                        {quickAccess.map(q => {
                          const tool = ALL_CALC_TOOLS.find(it => it.value === q.value);
                          const QIcon = q.fav ? Star : Clock;
                          return (
                            <button
                              key={q.value}
                              type="button"
                              onClick={() => setActiveTab(q.value)}
                              className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                              <QIcon
                                className={`w-3 h-3 flex-shrink-0 ${q.fav ? 'text-primary' : 'opacity-60'}`}
                                fill={q.fav ? 'currentColor' : 'none'}
                              />
                              <span className="min-w-0 truncate">{tool?.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {calcNavFiltered.length === 0 && (
                    <p className="px-3 text-[13px] text-muted-foreground" data-testid="calc-no-matches">
                      {t('calcNoMatches')}
                    </p>
                  )}

                  {calcNavFiltered.map((g) => {
                    const GIcon = g.Icon;
                    return (
                      <div key={g.id} data-testid={`calcgroup-${g.id}`}>
                        <p className="flex items-center gap-2 px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                          <span className="font-mono text-primary/70 tabular-nums">
                            {String(g.idx + 1).padStart(2, '0')}
                          </span>
                          <GIcon className="w-3 h-3 flex-shrink-0 opacity-70" />
                          <span className="min-w-0 truncate">{g.label}</span>
                          <span className="ml-auto font-mono normal-case tracking-normal opacity-70 tabular-nums">
                            {calcQuery ? `${g.items.length}/${g.total}` : g.total}
                          </span>
                        </p>
                        <div className="space-y-0.5">
                          {g.items.map(it => {
                            const isActive = activeTab === it.value;
                            const isFav = calcFavs.includes(it.value);
                            return (
                              <div key={it.value} className="group/tool relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveTab(it.value)}
                                  data-testid={`tab-${it.value}`}
                                  className={`w-full flex items-center gap-2 text-left pl-3 pr-8 py-1.5 rounded-md text-[13px] leading-snug transition-colors border-l-2 ${
                                    isActive
                                      ? 'border-primary bg-primary/10 text-primary font-medium'
                                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                  }`}
                                >
                                  <span className="min-w-0 truncate">{it.label}</span>
                                </button>
                                {/* Fijar cualquier herramienta, no solo la abierta:
                                    antes había que abrirla para poder marcarla. */}
                                <button
                                  type="button"
                                  onClick={() => toggleCalcFav(it.value)}
                                  title={t('calcFavToggle')}
                                  data-testid={`calc-fav-${it.value}`}
                                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity ${
                                    isFav
                                      ? 'text-primary opacity-100'
                                      : 'text-muted-foreground opacity-0 group-hover/tool:opacity-100 focus-visible:opacity-100 hover:text-foreground'
                                  }`}
                                >
                                  <Star className="w-3 h-3" fill={isFav ? 'currentColor' : 'none'} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              {/* ── Navegación móvil: dos niveles, igual que la Academia ── */}
              <div className="lg:hidden space-y-2" data-testid="calc-mobile-nav">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <Calculator className="w-4 h-4 text-primary" />
                  {t('calcWorkstationTitle')}
                </h2>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {CALC_NAV.map(g => {
                    const GIcon = g.Icon;
                    const isActive = activeCalcGroup.id === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveTab(g.items[0].value)}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold border transition-colors ${
                          isActive
                            ? 'border-primary text-primary bg-primary/10'
                            : 'bg-background text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        <GIcon className="w-3.5 h-3.5" /> {g.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {activeCalcGroup.items.map(it => (
                    <button
                      key={it.value}
                      type="button"
                      onClick={() => setActiveTab(it.value)}
                      data-testid={`tabm-${it.value}`}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs border transition-colors ${
                        activeTab === it.value
                          ? 'border-primary text-primary bg-primary/10 font-medium'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Calculadora activa ────────────────────────────────── */}
              <div className="min-w-0 flex-1">
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
              <TabsContent value="partial-exit">
                <PartialExitCalculator />
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
              <TabsContent value="futures">
                <FuturesCalculator />
              </TabsContent>
              <TabsContent value="montecarlo">
                <MonteCarloSimulator />
              </TabsContent>
              <TabsContent value="simulator">
                <SimulatorPro />
              </TabsContent>
              <TabsContent value="compound">
                <CompoundCalculator />
              </TabsContent>
              </div>
            </div>
            </Tabs>
            </motion.div>

            {/* TradingView Chart */}
            <motion.div {...RISE} transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}>
              <TradingViewChart />
            </motion.div>

            {/* Price-action structure scanner — reads the SAME asset as the chart above */}
            <motion.div {...RISE} transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}>
              <StructureScanner />
            </motion.div>

            {/* Watchlist, Price Alerts and Calculation History */}
            <motion.div {...RISE} transition={{ duration: 0.45, delay: 0.14, ease: 'easeOut' }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Watchlist />
              <PriceAlerts />
              <CalculationHistory />
            </motion.div>

            {/* Macro block: countdown to the next release + who is speaking,
                with the full TradingView calendar beside them. */}
            <motion.div {...RISE} transition={{ duration: 0.45, delay: 0.18, ease: 'easeOut' }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <NextDataCountdown />
              <SpeakersWatch />
              <EconomicCalendar />
            </motion.div>

            {/* Trading Journal */}
            <TradingJournal />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
