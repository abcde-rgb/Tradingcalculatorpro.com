import { motion } from 'framer-motion';
import {
  TrendingDown, AlertTriangle, BookOpen, Activity, Brain, DollarSign,
  PieChart, BarChart3, Clock, Target, Layers, Award, ArrowRight,
  Sparkles, Eye, Repeat, FileText, ChevronRight, Lock, Mail, Rewind, ClipboardList,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import { useAuthStore } from '@/lib/store';
import TradeJournal from '@/components/performance/TradeJournal';
import AnalyticsDashboard from '@/components/performance/AnalyticsDashboard';
import SetupPerformance from '@/components/performance/SetupPerformance';
import SetupBuilder from '@/components/education/SetupBuilder';
import ProjectionPanel from '@/components/performance/ProjectionPanel';
import ReplayEmbed from '@/components/backtesting/ReplayEmbed';
import TradingPlanPage from '@/pages/TradingPlanPage';

// Animation tokens (reused from LandingPage style)
const FADE_UP = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
};

export default function PerformancePage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState(isAuthenticated ? 'journal' : 'overview');
  const [refreshKey, setRefreshKey] = useState(0);
  // Setup → sus operaciones: el marcador de la pestaña Setups y el desglose de
  // la analítica llevan al diario ya filtrado, para que las tres pestañas
  // hablen de la misma muestra en vez de dar cada una un número suelto.
  const [journalSetup, setJournalSetup] = useState(null);
  const onChange = () => setRefreshKey((k) => k + 1);
  const showSetupTrades = (name) => {
    setJournalSetup(name);
    setTab('journal');
  };

  useSEO({
    titleKey: 'seoPerformanceTitle',
    descriptionKey: 'seoPerformanceDesc',
    canonicalPath: '/performance',
    // Era la ÚNICA ruta privada sin `noindex`, y además la única en el sitemap.
    // La combinación es la receta del resultado "URL sin descripción": el
    // sitemap le dice a Google que la indexe, robots.txt le impide rastrearla,
    // y sin rastreo nunca llega a leer un noindex. Las otras cuatro privadas
    // (dashboard, ajustes, admin, suscripción) sí lo llevaban.
    noindex: true,
  });

  // ─── Hero stats — eye-opening trader statistics with real sources ───
  const heroStats = [
    {
      value: '90%',
      labelKey: 'perfStat1Label',
      sourceKey: 'perfStat1Source',
      color: 'text-short',
      icon: TrendingDown,
    },
    {
      value: '3×',
      labelKey: 'perfStat2Label',
      sourceKey: 'perfStat2Source',
      color: 'text-long',
      icon: Activity,
    },
    {
      value: '65%',
      labelKey: 'perfStat3Label',
      sourceKey: 'perfStat3Source',
      color: 'text-warn',
      icon: Brain,
    },
    {
      value: '2.5%',
      labelKey: 'perfStat4Label',
      sourceKey: 'perfStat4Source',
      color: 'text-info',
      icon: Award,
    },
  ];

  // ─── Why traders fail — 6 concrete reasons ───
  const whyFailReasons = [
    { icon: BookOpen,       key: 'perfReason1' },
    { icon: AlertTriangle,  key: 'perfReason2' },
    { icon: Brain,          key: 'perfReason3' },
    { icon: DollarSign,     key: 'perfReason4' },
    { icon: Clock,          key: 'perfReason5' },
    { icon: Target,         key: 'perfReason6' },
  ];

  // ─── Coming soon features ───
  const upcomingFeatures = [
    { icon: BookOpen,    key: 'perfFeatJournal'      },
    // La repetición manual ya existe (herramienta externa, en /backtesting);
    // `to` es lo que distingue una tarjeta que se puede pulsar de una promesa.
    { icon: BarChart3,   key: 'perfFeatBacktesting', to: '/backtesting' },
    { icon: Eye,         key: 'perfFeatReplay'       },
    { icon: PieChart,    key: 'perfFeatAnalytics'    },
    { icon: Layers,      key: 'perfFeatPlaybook'     },
    { icon: FileText,    key: 'perfFeatReports'      },
  ];

  // ─── Educational insights — curated data points ───
  const educationalInsights = [
    {
      title: 'perfInsight1Title',
      desc: 'perfInsight1Desc',
      stat: 'perfInsight1Stat',
    },
    {
      title: 'perfInsight2Title',
      desc: 'perfInsight2Desc',
      stat: 'perfInsight2Stat',
    },
    {
      title: 'perfInsight3Title',
      desc: 'perfInsight3Desc',
      stat: 'perfInsight3Stat',
    },
    {
      title: 'perfInsight4Title',
      desc: 'perfInsight4Desc',
      stat: 'perfInsight4Stat',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* UNA sola raíz de pestañas para la barra y los paneles. Con dos raíces,
          los ids que genera Radix no coinciden y el `aria-controls` de cada
          pestaña apunta a un panel inexistente (axe: aria-valid-attr-value). */}
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1">
      {/* Tab navigation — sticky-ish under header */}
      {/* Barra de pestañas opaca, sin desenfoque: al hacer scroll, lo que pasa
          por debajo se veía borroso a través de ella. Fondo sólido y ya. */}
      <div className="border-b border-border bg-background sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
            {/* max-w-full + overflow-x-auto: tabs scroll inside the pill on
                narrow screens instead of widening the page (mobile +99px) */}
            <TabsList data-testid="performance-tabs" className="max-w-full justify-start overflow-x-auto [scrollbar-width:thin]">
              <TabsTrigger value="overview" data-testid="perftab-overview">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> {t('perfTabOverview')}
              </TabsTrigger>
              {/* Antes del diario a propósito: primero se ensaya sobre el
                  histórico, luego se anota lo que se operó de verdad. */}
              <TabsTrigger value="backtesting" data-testid="perftab-backtesting">
                <Rewind className="w-3.5 h-3.5 mr-1.5" /> {t('backtesting')}
              </TabsTrigger>
              <TabsTrigger value="journal" data-testid="perftab-journal">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> {t('perfTabJournal')}
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="perftab-analytics">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> {t('perfTabAnalytics')}
              </TabsTrigger>
              <TabsTrigger value="plan" data-testid="perftab-plan">
                <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> {t('perfTabPlan')}
              </TabsTrigger>
              <TabsTrigger value="setups" data-testid="perftab-setups">
                <Layers className="w-3.5 h-3.5 mr-1.5" /> {t('perfTabSetups')}
              </TabsTrigger>
              <TabsTrigger value="projection" data-testid="perftab-projection">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {t('perfTabProjection')}
              </TabsTrigger>
            </TabsList>
        </div>
      </div>

        {/* Backtesting de repetición. Sin `AuthRequired`: la herramienta es
            gratuita y de terceros, así que aquí no se cobra por ella. */}
        <TabsContent value="backtesting" className="px-4 pt-24 pb-12 max-w-6xl mx-auto w-full">
          <ReplayEmbed titular={false} enlaceDiario={false} />
        </TabsContent>

        {/* Journal tab — pt-24 clears fixed header (h-16) + sticky tab bar (~58px) */}
        <TabsContent value="journal" className="px-4 pt-24 pb-12 max-w-6xl mx-auto w-full">
          {!isAuthenticated ? (
            <AuthRequired t={t} />
          ) : (
            <TradeJournal
              refreshKey={refreshKey}
              onChange={onChange}
              setupFilter={journalSetup}
              onClearSetupFilter={() => setJournalSetup(null)}
            />
          )}
        </TabsContent>

        {/* Analytics tab */}
        <TabsContent value="analytics" className="px-4 pt-24 pb-12 max-w-6xl mx-auto w-full">
          {!isAuthenticated ? (
            <AuthRequired t={t} />
          ) : (
            <AnalyticsDashboard
              refreshKey={refreshKey}
              onGoToJournal={() => setTab('journal')}
              onGoToSetups={() => setTab('setups')}
              onPickSetup={showSetupTrades}
            />
          )}
        </TabsContent>

        {/* Setups tab — where the system meets the numbers it produced.
            Primero el marcador (qué ha hecho cada setup en el diario) y debajo
            el constructor con el que se definen: medir antes que editar, porque
            lo que se viene a mirar aquí es si el setup funciona. Es el MISMO
            componente que la Academia monta en su lección, leyendo el mismo
            almacén, así que definir un setup en cualquiera de los dos sitios lo
            deja disponible en el otro. */}
        {/* El plan vive aquí y no en la barra: fija las reglas con las que el
            diario juzga cada operación, así que se lee al lado de lo que mide.
            Un séptimo enlace arriba ya desbordó la barra en japonés una vez. */}
        <TabsContent value="plan" className="px-4 pt-24 pb-12 w-full">
          {!isAuthenticated ? <AuthRequired t={t} /> : <TradingPlanPage />}
        </TabsContent>

        <TabsContent value="setups" className="px-4 pt-24 pb-12 max-w-6xl mx-auto w-full">
          {!isAuthenticated ? (
            <AuthRequired t={t} />
          ) : (
            <div className="space-y-8">
              <SetupPerformance
                refreshKey={refreshKey}
                onPickSetup={showSetupTrades}
                onGoToJournal={() => setTab('journal')}
                onDefineSetups={() => {
                  document.getElementById('setup-builder')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
              <div id="setup-builder" className="scroll-mt-32">
                <SetupBuilder onSaved={onChange} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Projection tab — el futuro, calculado sobre el pasado REAL.
            Va la última a propósito: proyectar antes de tener diario y
            analítica es exactamente el error que este panel intenta evitar. */}
        <TabsContent value="projection" className="px-4 pt-24 pb-12 max-w-6xl mx-auto w-full">
          {!isAuthenticated ? (
            <AuthRequired t={t} />
          ) : (
            <ProjectionPanel refreshKey={refreshKey} onGoToJournal={() => setTab('journal')} />
          )}
        </TabsContent>

        {/* Overview tab — the original educational content */}
        <TabsContent value="overview">

      {/* ─── Hero — punchy headline + 4 demolishing stats ─── */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden">
        {/* Subtle red→orange gradient suggesting urgency */}
        <div className="absolute inset-0 bg-gradient-to-b from-short/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 30%, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <motion.div {...FADE_UP} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-short/10 border border-short/30">
              <AlertTriangle className="w-3.5 h-3.5 text-short" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-short">
                {t('perfHeroBadge')}
              </span>
            </div>

            <h1 className="font-unbounded text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {t('perfHeroTitle1')}{' '}
              <span className="text-short">{t('perfHeroTitle2')}</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-10">
              {t('perfHeroSubtitle')}
            </p>
          </motion.div>

          {/* 4 demolishing stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {heroStats.map((stat, i) => {
              const Ic = stat.icon;
              return (
                <motion.div
                  key={stat.labelKey}
                  {...FADE_UP}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary/40 transition-colors"
                  data-testid={`perf-hero-stat-${i}`}
                >
                  <Ic className={`w-6 h-6 mb-3 ${stat.color}`} />
                  <div className={`text-3xl md:text-4xl font-bold mb-1 ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-foreground font-semibold mb-2">
                    {t(stat.labelKey)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {t(stat.sourceKey)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Why the 90% fails — 6 reasons ─── */}
      <section className="py-20 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">
              {t('perfWhyFailTitle')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('perfWhyFailSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {whyFailReasons.map((r, i) => {
              const Ic = r.icon;
              return (
                <motion.div
                  key={r.key}
                  {...FADE_UP}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-6 hover:border-short/30 transition-colors group"
                  data-testid={`perf-reason-${i}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-short/10 flex items-center justify-center mb-3 group-hover:bg-short/20 transition-colors">
                    <Ic className="w-5 h-5 text-short" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{t(`${r.key}Title`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`${r.key}Desc`)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Educational Insights ─── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/10 border border-primary/30">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {t('perfInsightsBadge')}
              </span>
            </div>
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">
              {t('perfInsightsTitle')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('perfInsightsSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {educationalInsights.map((insight, i) => (
              <motion.div
                key={insight.title}
                {...FADE_UP}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 flex items-start gap-4"
                data-testid={`perf-insight-${i}`}
              >
                <div className="text-2xl md:text-3xl font-bold text-primary flex-shrink-0 min-w-[80px]">
                  {t(insight.stat)}
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1">{t(insight.title)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(insight.desc)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Coming features preview ─── */}
      <section className="py-20 px-4 bg-gradient-to-b from-card/30 to-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/10 border border-primary/30">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {t('perfUpcomingBadge')}
              </span>
            </div>
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">
              {t('perfUpcomingTitle')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('perfUpcomingSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingFeatures.map((f, i) => {
              const Ic = f.icon;
              return (
                <motion.div
                  key={f.key}
                  {...FADE_UP}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="relative bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-colors group overflow-hidden"
                  data-testid={`perf-upcoming-${i}`}
                >
                  {f.to && (
                    <Link
                      to={f.to}
                      className="absolute inset-0 z-10"
                      aria-label={t(`${f.key}Title`)}
                      data-testid={`perf-upcoming-link-${i}`}
                    />
                  )}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-primary/10 border border-primary/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                      {t(f.to ? 'perfAvailableBadgeShort' : 'comingSoonBadgeShort')}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Ic className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{t(`${f.key}Title`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`${f.key}Desc`)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA — waitlist / register ─── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/30 rounded-2xl p-10 text-center">
            <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">
              {t('perfCTATitle')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              {t('perfCTADesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button size="lg" className="gap-2" data-testid="perf-cta-register">
                  {t('perfCTARegister')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/education">
                <Button size="lg" variant="outline" className="gap-2" data-testid="perf-cta-education">
                  {t('perfCTAEducation')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-6 italic">
              {t('perfCTAFooter')}
            </p>
          </div>
        </div>
      </section>
        </TabsContent>
      </Tabs>

      <Footer />
    </div>
  );
}

const AuthRequired = ({ t }) => (
  <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl max-w-xl mx-auto">
    <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
    <h3 className="font-bold text-lg mb-2">{t('perfAuthRequiredTitle')}</h3>
    <p className="text-sm text-muted-foreground mb-6">{t('perfAuthRequiredDesc')}</p>
    <div className="flex justify-center gap-2">
      <Link to="/login">
        <Button variant="outline">{t('login')}</Button>
      </Link>
      <Link to="/register">
        <Button>{t('register')}</Button>
      </Link>
    </div>
  </div>
);
