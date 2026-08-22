import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, ShieldCheck, Info } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : null;

/**
 * Los brókers a los que referimos.
 *
 * Todo lo que decide qué se pinta aquí vive en el servidor
 * (`backend/brokers_referidos.py`): un bróker sólo llega a esta pantalla si
 * tiene a la vez autorización en la UE, porcentaje de pérdidas dentro de la
 * ventana trimestral de ESMA y enlace configurado. Esta página **no** puede
 * enseñar uno que no cumpla, porque no los recibe.
 *
 * Lo que sí es responsabilidad de la pantalla, y por eso está escrito aquí:
 *
 *   · la advertencia normalizada va **igual de visible que el enlace**, no en
 *     una nota al pie — es lo que exige la intervención de producto de ESMA;
 *   · la relación de afiliación se declara arriba del todo (Directiva Omnibus);
 *   · los enlaces salen con `rel="sponsored"`, que es lo que son.
 *
 * Y no hay comparativa. Decir «el más barato» o «el mejor» exigiría datos de
 * comisiones que no puedo verificar, y este producto no publica cifras que no
 * ha medido. Lo que se publica es lo comprobable: quién es la entidad, quién la
 * regula y con qué número.
 */
export default function BrokersPage() {
  const { t } = useTranslation();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useSEO({
    titleKey: 'seoBrokersTitle',
    descriptionKey: 'seoBrokersDesc',
    canonicalPath: '/brokers',
    // Una página de enlaces de afiliado es contenido delgado para un buscador,
    // y hoy además está vacía. Cuando tenga acuerdos y algo propio que aportar,
    // se revisa; indexarla vacía sólo resta.
    noindex: true,
  });

  useEffect(() => {
    if (!API) { setCargando(false); return; }
    let vivo = true;
    fetch(`${API}/brokers`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo) setDatos(d); })
      .catch(() => {})
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  const brokers = datos?.brokers || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-24 pb-14">
        <h1 className="text-3xl font-bold mb-3">{t('brokersTitle')}</h1>
        <p className="text-muted-foreground mb-6">{t('brokersIntro')}</p>

        {/* La declaración de afiliación, arriba y antes de cualquier enlace. */}
        <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50 border border-border mb-6"
             data-testid="brokers-afiliacion">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm">{t('brokersAfiliacion')}</p>
        </div>

        {cargando && <p className="text-sm text-muted-foreground">{t('loading')}</p>}

        {!cargando && brokers.length === 0 && (
          // Sin acuerdos todavía. Se dice, en vez de dejar la página muda o
          // —peor— rellenarla con brókers que no cumplen.
          <Card className="bg-card border-border" data-testid="brokers-vacio">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{t('brokersVacio')}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {brokers.map((b) => (
            <Card key={b.id} className="bg-card border-border" data-testid={`broker-${b.id}`}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{b.nombre}</h2>
                    {/* Quién responde ante el cliente NO es la marca. */}
                    {b.entidad && (
                      <p className="text-xs text-muted-foreground mt-0.5">{b.entidad}</p>
                    )}
                    {b.regulador && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        {b.regulador}{b.licencia ? ` · ${b.licencia}` : ''}
                      </p>
                    )}
                  </div>
                  <a
                    href={b.url}
                    target="_blank"
                    // `sponsored` es lo que es; `noopener noreferrer` para no
                    // dejarle el `window.opener` a un tercero.
                    rel="sponsored noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
                    data-testid={`broker-enlace-${b.id}`}
                  >
                    {t('brokersAbrirCuenta')} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* La advertencia, dentro de la misma tarjeta y del mismo
                    tamaño que el resto. ESMA pide que sea tan prominente como
                    la promoción; empequeñecerla es incumplir con estilo. */}
                {b.advertencia && (
                  <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                       data-testid={`broker-advertencia-${b.id}`}>
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200/90 dark:text-amber-200/90">{b.advertencia}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
