import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { STRATEGIES, strategySlug, isMultiExpiryStrategy } from '@/data/mockData';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';

/**
 * `/options/strategies/:slug` — una página por estructura, pública.
 *
 * El contenido no es nuevo: sale del mismo `STRATEGIES` que alimenta la
 * calculadora, así que la ficha y lo que la app construye no pueden decir
 * cosas distintas. La versión estática equivalente la emite `gen-seo-pages.js`
 * en el postbuild para que un buscador no dependa de que el JavaScript corra.
 */

const legLabel = (leg) => {
  const where = leg.type === 'stock'
    ? ''
    : ` @ ATM${(leg.offset || 0) >= 0 ? '+' : ''}${leg.offset || 0}`;
  const exp = leg.expOffset ? ` · exp+${leg.expOffset}` : '';
  return `${leg.action === 'buy' ? 'BUY' : 'SELL'} ${leg.qty}× ${leg.type.toUpperCase()}${where}${exp}`;
};

export default function OptionsStrategyPage() {
  const { slug } = useParams();
  const { t } = useTranslation();

  const strategy = useMemo(
    () => STRATEGIES.find((s) => strategySlug(s) === slug),
    [slug]
  );

  useSEO({
    title: strategy ? `${t(strategy.name)} | ${t('optStrategiesSection')}` : undefined,
    description: strategy ? t(strategy.description) : undefined,
    canonicalPath: strategy ? `/options/strategies/${slug}` : '/options/strategies',
  });

  if (!strategy) return <Navigate to="/options/strategies" replace />;

  const multiExpiry = isMultiExpiryStrategy(strategy);
  const facts = [
    { label: t('optStrategyRisk'), value: t(strategy.risk) },
    { label: t('optStrategyReward'), value: t(strategy.reward) },
    { label: t('optStrategyMaxProfit'), value: t(strategy.maxProfit) },
    { label: t('optStrategyMaxLoss'), value: t(strategy.maxLoss) },
  ];
  const related = STRATEGIES.filter(
    (s) => s.id !== strategy.id && s.category === strategy.category
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="options-strategy-page">
      <Header />
      <main className="pt-20 pb-16 px-4 max-w-4xl mx-auto space-y-8">
        <nav className="text-xs text-muted-foreground">
          <Link to="/options" className="hover:text-foreground">{t('optHubTitle')}</Link>
          {' / '}
          <Link to="/options/strategies" className="hover:text-foreground">{t('optStrategiesSection')}</Link>
        </nav>

        <header className="space-y-3">
          <span
            className="inline-block text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded"
            style={{ color: strategy.color, backgroundColor: `${strategy.color}1a` }}
          >
            {strategy.category}
          </span>
          <h1 className="text-3xl font-bold">{t(strategy.name)}</h1>
          <p className="text-lg text-muted-foreground">{t(strategy.description)}</p>
          {multiExpiry && (
            <p className="flex items-center gap-2 text-sm text-[#a78bfa]" data-testid="multi-expiry-badge">
              <CalendarClock className="h-4 w-4" />
              {t('optStrategyMultiExpiry')}
            </p>
          )}
        </header>

        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">
            {t('optStrategyLegs')}
          </h2>
          <ul className="space-y-1.5">
            {strategy.legs.map((leg, i) => (
              <li
                key={`${leg.type}-${leg.action}-${leg.offset}-${i}`}
                className="font-mono text-sm bg-card border border-border rounded-lg px-3 py-2"
              >
                {legLabel(leg)}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid grid-cols-2 gap-2">
          {facts.map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-lg px-3 py-2">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {label}
              </span>
              <span className="block text-sm font-semibold mt-0.5">{value}</span>
            </div>
          ))}
        </section>

        {/* Entre el contenido y el CTA, con separación propia: un anuncio
            pegado a un botón es la receta del clic accidental (y de la
            suspensión de la cuenta de AdSense). */}

        <section className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            {t('optStrategyWhenToUse')}
          </h2>
          <p>{t(strategy.whenToUse)}</p>
        </section>

        <Link to={`/options/calculator?strategy=${strategy.id}`}>
          <Button size="lg" data-testid="strategy-open-calculator">
            {t('optStrategyOpenInCalculator')} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>

        {related.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">
              {t('optStrategyRelated')}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {related.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/options/strategies/${strategySlug(s)}`}
                    className="block bg-card border border-border rounded-lg px-3 py-2 text-sm hover:border-primary/40 transition-colors"
                  >
                    {t(s.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
}
