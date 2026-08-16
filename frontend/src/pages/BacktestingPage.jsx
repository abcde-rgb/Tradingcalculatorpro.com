import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import ReplayEmbed from '@/components/backtesting/ReplayEmbed';
import { useSEO } from '@/hooks/useSEO';

/**
 * La versión con dirección propia de la repetición sobre el histórico. El
 * cuerpo es el mismo componente que monta la pestaña de Performance; aquí
 * existe además como página pública porque la herramienta es gratuita y
 * Performance está tras el muro premium.
 */
export default function BacktestingPage() {
  useSEO({
    titleKey: 'seoBacktestingTitle',
    descriptionKey: 'seoBacktestingDesc',
    canonicalPath: '/backtesting',
    // Una página cuyo contenido principal es de otro dominio no aporta nada al
    // índice y sí puede restar por contenido pobre.
    noindex: true,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      {/* El header es `fixed` con `h-16`: sin este `pt-24` la primera línea de
          la página queda debajo de la barra y no se lee. */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-24 pb-14">
        <ReplayEmbed />
      </main>
      <Footer />
    </div>
  );
}
