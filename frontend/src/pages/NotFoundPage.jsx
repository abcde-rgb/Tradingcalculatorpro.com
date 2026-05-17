import { Link } from 'react-router-dom';
import { TrendingDown, Home, BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="text-center max-w-lg mx-auto space-y-6">
          {/* Big 404 */}
          <div className="relative inline-block select-none">
            <p className="text-8xl font-bold text-primary/20 font-unbounded leading-none">404</p>
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingDown
                className="w-14 h-14 text-destructive"
                style={{ animation: 'bounce 2s infinite' }}
              />
            </div>
          </div>

          {/* Heading */}
          <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-white leading-snug">
            Esta posicion entro en stop-loss
          </h1>

          {/* Subtitle */}
          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
            La pagina que buscas no existe o fue movida.
            <br />
            Pero tu portfolio puede recuperarse.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/">
              <Button className="w-full sm:w-auto gap-2">
                <Home className="w-4 h-4" />
                Ir al inicio
              </Button>
            </Link>

            <Link to="/dashboard">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <BarChart3 className="w-4 h-4" />
                Ver dashboard
              </Button>
            </Link>

            <Link to="/pricing">
              <Button variant="ghost" className="w-full sm:w-auto gap-2 text-zinc-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
                Ver precios
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
