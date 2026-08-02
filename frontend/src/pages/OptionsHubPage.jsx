import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Target, Brain, Activity, BarChart3, TrendingUp, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { STRATEGIES, STRATEGY_CATEGORIES, strategySlug, isMultiExpiryStrategy } from '@/data/mockData';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';

/** Rejilla del catálogo, compartida por el hub y por `/options/strategies`. */
function StrategyCatalog({ byCategory }) {
  const { t } = useTranslation();
  return (
    <>
      {STRATEGY_CATEGORIES.map((cat) => (
        <div key={cat}>
          <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-2">
            {cat} · {byCategory[cat].length}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {byCategory[cat].map((s) => (
              <li key={s.id}>
                <Link
                  to={`/options/strategies/${strategySlug(s)}`}
                  className="flex items-center justify-between gap-2 bg-card border border-border rounded-lg px-3 py-2 hover:border-primary/40 transition-colors"
                >
                  <span className="text-sm font-medium truncate">{t(s.name)}</span>
                  {isMultiExpiryStrategy(s) && (
                    <span className="text-[9px] uppercase tracking-wider text-[#a78bfa] font-bold flex-shrink-0">
                      {t('optHubMultiExpiryTag')}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function groupByCategory() {
  const map = {};
  for (const cat of STRATEGY_CATEGORIES) {
    map[cat] = STRATEGIES.filter((s) => s.category === cat);
  }
  return map;
}

/** `/options/strategies` — el índice completo, con su propia URL canónica. */
export function OptionsStrategiesIndexPage() {
  const { t } = useTranslation();
  const byCategory = useMemo(groupByCategory, []);

  useSEO({
    title: t('optStrategiesSection'),
    description: t('optStrategiesIndexLead'),
    canonicalPath: '/options/strategies',
  });

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="options-strategies-index">
      <Header />
      <main className="pt-20 pb-16 px-4 max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">{t('optStrategiesSection')}</h1>
          <p className="text-muted-foreground">{t('optStrategiesIndexLead')}</p>
        </header>
        <div className="space-y-6">
          <StrategyCatalog byCategory={byCategory} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

/**
 * `/options` — la puerta de entrada PÚBLICA a la sección de opciones.
 *
 * Antes, `/options` era directamente el muro de pago: una única URL, sin nada
 * indexable detrás, con el catálogo de estrategias y todo el material
 * educativo encerrados dentro. Se estaba cobrando por leer qué es una mariposa,
 * que es exactamente el contenido con el que la competencia capta su tráfico.
 *
 * El reparto ahora es el que tiene sentido: la referencia (qué estructuras
 * existen, cómo se montan, cuándo se usan) es pública y tiene URL propia; el
 * workspace en vivo —cadena real, optimizador, coach, flujo— sigue siendo
 * premium y vive en `/options/calculator`.
 */
export default function OptionsHubPage() {
  const { t } = useTranslation();

  useSEO({
    titleKey: 'seoOptionsTitle',
    descriptionKey: 'seoOptionsDesc',
    canonicalPath: '/options',
  });

  const byCategory = useMemo(groupByCategory, []);

  const premiumFeatures = [
    { icon: LineChart, label: t('optionsChainRealtime') },
    { icon: Target, label: t('optionsStrategyOptimizer') },
    { icon: Brain, label: t('optionsAICoach') },
    { icon: Activity, label: t('optionsFlowScanner') },
    { icon: BarChart3, label: t('optionsGreeksPortfolio') },
    { icon: TrendingUp, label: t('optionsUnusualActivity') },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="options-hub">
      <Header />
      <main className="pt-20 pb-16 px-4 max-w-6xl mx-auto space-y-12">
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold">{t('optHubTitle')}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t('optHubLead')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/options/calculator">
              <Button size="lg" data-testid="options-hub-workspace-btn">
                {t('optHubOpenWorkspace')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/options/strategies">
              <Button size="lg" variant="outline" data-testid="options-hub-strategies-btn">
                {t('optHubBrowseStrategies', { count: STRATEGIES.length })}
              </Button>
            </Link>
          </div>
        </section>

        {/* El catálogo completo, público y enlazable. Cada tarjeta lleva a una
            URL propia que un buscador puede indexar. */}
        <section className="space-y-6" data-testid="options-hub-catalog">
          <h2 className="text-2xl font-bold">{t('optHubCatalogTitle')}</h2>
          <StrategyCatalog byCategory={byCategory} />
        </section>


        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('optionsGateIncludedTitle')}</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {premiumFeatures.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 pt-2">
            <Link to="/options/calculator">
              <Button data-testid="options-hub-cta">{t('optHubOpenWorkspace')}</Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline">{t('viewPremiumPlans')}</Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
