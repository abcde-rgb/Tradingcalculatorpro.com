import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Rewind, ExternalLink, BookOpen, AlertTriangle, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';

/** La herramienta incrustada. Es de StrategyTune, no nuestra: la URL vive aquí
 *  arriba y en un solo sitio para que cambiarla —o retirarla— sea una línea. */
const STRATEGYTUNE_URL = 'https://strategytune.com/app';

/** Si el marco no ha dicho `load` en este tiempo, damos por hecho que no va a
 *  cargar. No se puede preguntar a un iframe de otro origen si lo han
 *  bloqueado —la política de mismo origen lo impide—, así que el reloj es la
 *  única señal honesta que tenemos. */
const ESPERA_MS = 12_000;

export default function BacktestingPage() {
  const { t } = useTranslation();
  // 'inactivo' → nada de terceros cargado · 'cargando' → marco montado
  // · 'listo' → ha disparado load · 'fallo' → se agotó la espera
  const [estado, setEstado] = useState('inactivo');
  const reloj = useRef(null);

  useSEO({
    titleKey: 'seoBacktestingTitle',
    descriptionKey: 'seoBacktestingDesc',
    canonicalPath: '/backtesting',
    // Una página cuyo contenido principal es de otro dominio no aporta nada al
    // índice y sí puede restar por contenido pobre.
    noindex: true,
  });

  useEffect(() => () => clearTimeout(reloj.current), []);

  const cargar = () => {
    setEstado('cargando');
    clearTimeout(reloj.current);
    reloj.current = setTimeout(() => {
      setEstado((e) => (e === 'cargando' ? 'fallo' : e));
    }, ESPERA_MS);
  };

  const montado = estado === 'cargando' || estado === 'listo';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* El header es `fixed` con `h-16`: sin este `pt-24` la primera línea de
          la página queda debajo de la barra y no se lee. */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-24 pb-14">
        <header className="border-b border-rule pb-6 mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">
            {t('btEyebrow')}
          </p>
          <h1 className="font-display text-3xl md:text-4xl leading-tight mb-3">
            {t('btTitle')}
          </h1>
          <p className="text-muted-foreground max-w-2xl">{t('btLede')}</p>
        </header>

        {/* Qué es y qué no es — la distinción que evita que alguien espere
            aquí el motor de reglas y se marche pensando que falta. */}
        <section className="grid gap-4 md:grid-cols-2 mb-8">
          <div className="bg-card border border-rule rounded-lg p-5">
            <Rewind className="w-5 h-5 text-muted-foreground mb-3" aria-hidden="true" />
            <h2 className="font-semibold mb-1.5">{t('btWhatManualTitle')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('btWhatManual')}</p>
          </div>
          <div className="bg-card border border-rule rounded-lg p-5">
            <Play className="w-5 h-5 text-muted-foreground mb-3" aria-hidden="true" />
            <h2 className="font-semibold mb-1.5">{t('btWhatAutoTitle')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('btWhatAuto')}</p>
          </div>
        </section>

        {/* El marco. Barra propia siempre visible: identifica de quién es la
            herramienta y ofrece la salida a pestaña nueva, que es lo único que
            funciona con seguridad si el otro dominio prohíbe incrustarse. */}
        <section className="bg-card border border-rule rounded-lg overflow-hidden mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-rule">
            <p className="text-sm">
              <span className="font-semibold">StrategyTune</span>
              <span className="text-muted-foreground"> · {t('btThirdParty')}</span>
            </p>
            <a
              href={STRATEGYTUNE_URL}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              data-testid="backtesting-open-tab"
            >
              {t('btOpenTab')}
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>

          {estado === 'inactivo' && (
            <div className="px-5 py-12 text-center">
              <h2 className="font-semibold mb-2">{t('btConsentTitle')}</h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
                {t('btConsentDesc')}
              </p>
              <Button onClick={cargar} data-testid="backtesting-load">
                {t('btLoadButton')}
              </Button>
            </div>
          )}

          {estado === 'fallo' && (
            <div className="px-5 py-12 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
              <h2 className="font-semibold mb-2">{t('btBlockedTitle')}</h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
                {t('btBlockedDesc')}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild>
                  <a href={STRATEGYTUNE_URL} target="_blank" rel="noopener noreferrer nofollow">
                    {t('btOpenTab')}
                  </a>
                </Button>
                <Button variant="outline" onClick={cargar} className="gap-2">
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  {t('btRetry')}
                </Button>
              </div>
            </div>
          )}

          {montado && (
            <div className="relative">
              {estado === 'cargando' && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  {t('btLoading')}
                </p>
              )}
              {/* `allow-same-origin` junto a `allow-scripts` sólo sería un
                  agujero si el marco fuese de NUESTRO origen; siendo de otro
                  dominio, conserva el suyo y su app puede guardar sesiones. */}
              <iframe
                src={STRATEGYTUNE_URL}
                title="StrategyTune"
                onLoad={() => setEstado('listo')}
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                className="w-full h-[70vh] min-h-[520px] border-0 bg-background"
                data-testid="backtesting-frame"
              />
            </div>
          )}

          {estado === 'listo' && (
            <p className="px-5 py-3 border-t border-rule text-xs text-muted-foreground">
              {t('btEmptyHint')}
            </p>
          )}
        </section>

        {/* Lo que la incrustación NO hace. Escrito antes de que alguien pierda
            una sesión entera creyendo que se guardaba en su cuenta. */}
        <section className="border-t border-rule pt-6 flex flex-wrap items-start gap-4 justify-between">
          <div className="max-w-2xl">
            <h2 className="font-semibold mb-1.5 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              {t('btJournalTitle')}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('btJournalDesc')}</p>
            <p className="text-xs text-muted-foreground mt-3">{t('btNotAffiliated')}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/performance">{t('btJournalCta')}</Link>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
