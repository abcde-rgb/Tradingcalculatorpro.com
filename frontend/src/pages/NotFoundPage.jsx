import { Link } from 'react-router-dom';
import { TrendingDown, Home, BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useSEO } from '@/hooks/useSEO';
import { useTranslation } from '@/lib/i18n';

export default function NotFoundPage() {
  useSEO({ titleKey: 'seoNotFoundTitle', descriptionKey: 'seoNotFoundDesc', canonicalPath: '/404', noindex: true });
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="text-center max-w-lg mx-auto space-y-6">
          <div className="relative inline-block select-none">
            <p className="text-8xl font-bold text-primary font-unbounded leading-none">404</p>
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingDown
                className="w-14 h-14 text-destructive"
                style={{ animation: 'bounce 2s infinite' }}
              />
            </div>
          </div>

          <h1 className="font-unbounded text-2xl sm:text-3xl font-bold leading-snug">
            {t('nfTitle')}
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            {t('nfBody1')}
            <br />
            {t('nfBody2')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/">
              <Button className="w-full sm:w-auto gap-2">
                <Home className="w-4 h-4" />
                {t('nfHome')}
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <BarChart3 className="w-4 h-4" />
                {t('nfDashboard')}
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" className="w-full sm:w-auto gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                {t('nfPricing')}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
