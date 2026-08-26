import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, ExternalLink, ShieldCheck, Info } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import TablaComparativa from '@/components/brokers/TablaComparativa';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : null;

// La jurisdicción, traducida por código; el texto del servidor es el respaldo.
const JURISDICCION = { ue: 'jurisdUe', svg: 'jurisdSvg' };

// Los dos socios que NO son brókers y por eso no vienen de `/api/brokers`.
// Aquí sólo están su id y su nombre: sus hechos comparables llegan igual del
// servidor, en `comparativa`, para que no haya un segundo sitio donde puedan
// desviarse. Ver `RecommendedTools.jsx`, que es de donde salen.
const SOCIOS = [
  { id: 'margex', nombre: 'Margex' },
  { id: 'hyperliquid', nombre: 'Hyperliquid' },
];

/**
 * Los brókers a los que referimos.
 *
 * Todo lo que decide qué se pinta aquí vive en el servidor
 * (`backend/brokers_referidos.py`). Esta página no filtra ni decide: recibe la
 * lista ya resuelta y la pinta. Lo único que el servidor **bloquea** es un
 * enlace de referido cuyo destino no se ha leído, porque enseñar una ficha
 * legal que no corresponde al sitio al que lleva el botón es peor que no
 * enlazar.
 *
 * El público es INTERNACIONAL, y eso decide qué se enseña:
 *
 *   · la entidad va **con la jurisdicción a la que sirve**. Una marca tiene una
 *     entidad por región; «Solaris EMEA Ltd · CySEC» a secas le afirma a un
 *     lector de Chile que ése es su bróker, y no lo es;
 *   · el porcentaje de pérdidas va **con el nombre de la entidad que lo
 *     publicó**, no atribuido al bróker entero — Swissquote publica 55,05 % en
 *     la UE y 78,23 % en Reino Unido;
 *   · a quién NO admite el alta se dice **antes del botón**, no después de que
 *     haya rellenado el formulario.
 *
 * Y lo que no cambia por ser internacional:
 *
 *   · la advertencia va **igual de visible que el enlace**, no en una nota al
 *     pie;
 *   · la relación de afiliación se declara arriba del todo (Directiva Omnibus);
 *   · los enlaces salen con `rel="sponsored"`, que es lo que son.
 *
 * Y no hay comparativa. Decir «el más barato» o «el mejor» exigiría datos de
 * comisiones que no puedo verificar, y este producto no publica cifras que no
 * ha medido. Lo que se publica es lo comprobable: quién es la entidad, quién la
 * regula, con qué número, qué porcentaje publica y a quién no acepta.
 */

/**
 * La advertencia normalizada de ESMA, EN EL IDIOMA DEL LECTOR.
 *
 * El backend la componía en castellano (`brokers_referidos.py:
 * `advertencia_esma()`) y esta página volcaba esa prosa tal cual, así que un
 * lector alemán, japonés o árabe recibía el aviso de riesgo OBLIGATORIO en un
 * idioma que puede no entender. Un aviso incomprensible no cumple su función,
 * que es justo lo que la norma persigue.
 *
 * Es el mismo arreglo que ya tenía `RecommendedTools.jsx:advertenciaEnIdioma`
 * para la versión corta: se hizo allí y no aquí.
 *
 * La regla de honestidad se conserva entera: sin porcentaje publicable NO se
 * inventa uno — se usa el aviso genérico sin cifra. `perdidaPct == null`
 * significa «no lo sé», no «cero».
 */
function avisoEsma(b, t) {
  if (!b.ofreceCfdMinorista) return null;
  if (b.perdidaPct == null || !b.perdidaPctEntidad) return t('brokersAvisoApalancado');
  return t('brokersAvisoLargo', { pct: b.perdidaPct, entidad: b.perdidaPctEntidad });
}


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

  // Las OCHO filas de la comparativa: los seis brókers del backend más los dos
  // socios. Se construye aquí y no en la tabla para que el componente reciba
  // una lista ya resuelta y no tenga que saber de dónde sale cada mitad.
  const filas = useMemo(() => {
    const comp = datos?.comparativa || {};
    const deBrokers = (datos?.brokers || []).map((b) => ({
      id: b.id,
      nombre: b.nombre,
      comp: comp[b.id],
      perdidaPct: b.perdidaPct,
      perdidaPctEntidad: b.perdidaPctEntidad,
    }));
    const yaEstan = new Set(deBrokers.map((f) => f.id));
    const socios = SOCIOS
      .filter((s) => !yaEstan.has(s.id) && comp[s.id])
      .map((s) => ({ ...s, comp: comp[s.id], perdidaPct: null, perdidaPctEntidad: null }));
    return [...deBrokers, ...socios];
  }, [datos]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-24 pb-14">
        <h1 className="text-3xl font-bold mb-3">{t('brokersTitle')}</h1>
        <p className="text-muted-foreground mb-6">{t('brokersIntro')}</p>

        {/* La declaración de afiliación, arriba y antes de cualquier enlace. */}
        <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50 border border-border mb-6"
             data-testid="brokers-afiliacion">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm">{t('brokersAfiliacion')}</p>
        </div>

        {cargando && <p className="text-sm text-muted-foreground">{t('loading')}</p>}

        {!cargando && filas.length > 0 && <TablaComparativa filas={filas} />}

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
                    {/* A qué público sirve esa entidad. El sitio se dirige a
                        público internacional, y una marca tiene una entidad
                        por región: sin esta línea la ficha le está diciendo a
                        quien lee que ésa es la suya, y para la mayoría no. */}
                    {b.jurisdiccion && (
                      <p className="text-xs text-muted-foreground/80 mt-1"
                         data-testid={`broker-jurisdiccion-${b.id}`}>
                        {t('brokersEntidadPara')}{' '}
                        {(JURISDICCION[b.jurisdiccionCodigo] && t(JURISDICCION[b.jurisdiccionCodigo]))
                          || b.jurisdiccion}
                      </p>
                    )}
                    {/* A quién no admite el alta, antes del botón. */}
                    {b.noAdmiteResidentes?.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1"
                         data-testid={`broker-noadmite-${b.id}`}>
                        <Ban className="w-3.5 h-3.5 shrink-0 mt-px" />
                        <span>{t('brokersNoAdmite')} {b.noAdmiteResidentes.join(', ')}</span>
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

                {/* La advertencia, en la misma tarjeta y MÁS GRANDE que el
                    botón (16 px frente a 14). ESMA pide que sea tan prominente
                    como la promoción; empequeñecerla es incumplir con estilo, e
                    igualarla deja la discusión abierta por un píxel. Un párrafo
                    legal a 16 px pesa en la página — que es exactamente lo que
                    la norma quiere que pese. */}
                {avisoEsma(b, t) && (
                  <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                       data-testid={`broker-advertencia-${b.id}`}>
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-base leading-snug text-amber-200/90 dark:text-amber-200/90">{avisoEsma(b, t)}</p>
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
