import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import margexLogo from '@/assets/partners/margex-square.png';
import hyperliquidLogo from '@/assets/partners/hyperliquid-square.svg';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : null;

const FADE_UP_VIEW = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } };

// Affiliate / referral partners. Add new entries here — each renders as a
// clickable card that opens the referral link in a new tab.
const PARTNERS = [
  {
    id: 'margex',
    name: 'Margex',
    url: 'https://margex.com/?rid=44932212',
    image: margexLogo,
    descKey: 'partnerMargexDesc',
  },
  {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    // TODO(pendiente): reemplazar por el enlace de referido real de Hyperliquid
    // cuando el usuario lo facilite. Y sustituir el logo placeholder (SVG) por el
    // oficial (hyperliquid-square.png). Ver docs/PENDIENTES.md.
    url: 'https://app.hyperliquid.xyz/',
    image: hyperliquidLogo,
    descKey: 'partnerHyperliquidDesc',
  },
];

/**
 * Los brókers vienen del SERVIDOR, no de la lista de arriba.
 *
 * La diferencia no es de estilo: la cifra de la advertencia la recalcula cada
 * bróker cada trimestre, así que CADUCA, y un dato que caduca no puede vivir en
 * una constante del frontend. `/api/brokers` la sirve con su fecha detrás.
 *
 * Sobre los logos: los oficiales son marcas registradas y no los tengo. En
 * cuanto dejes el fichero en `assets/partners/<id>-square.png` (o `.svg`), esta
 * tarjeta lo usa sola. Mientras tanto pinta el nombre y la entidad, que es lo
 * que de verdad necesita saber quien va a abrir cuenta: «Axi» es la marca y
 * quien firma el contrato es Solaris EMEA Ltd. Un logo que no tengo no se
 * inventa.
 */

// Logos de bróker. Para añadir uno: deja el fichero en
// `src/assets/partners/<id>-square.(png|svg)` y añade aquí su import — dos
// líneas. Se hace con imports explícitos y no con `require.context` porque eso
// último es API de webpack, no de ES, y el linter tiene razón en marcarlo.
//
// Vacío a propósito: los logos oficiales de los seis son marcas registradas y
// no los tengo. Sin fichero, la tarjeta pinta el nombre y la entidad.
const LOGOS = {};
function useBrokers() {
  const [brokers, setBrokers] = useState([]);
  useEffect(() => {
    if (!API) return;
    let vivo = true;
    fetch(`${API}/brokers`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d?.brokers) setBrokers(d.brokers); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  return brokers;
}

export const RecommendedTools = () => {
  const { t } = useTranslation();
  const brokers = useBrokers();

  if (PARTNERS.length === 0 && brokers.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-card/50" data-testid="recommended-tools">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('partnersTitle')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t('partnersSubtitle')}</p>
        </div>

        {/* De izquierda a derecha en una sola fila. Con ocho tarjetas, envolver
            las partía en tres filas descuadradas; así se leen en orden y en
            móvil se arrastra. `snap` para que no queden a medias. */}
        {/* ⚠️ Nada de `justify-center` aquí. Sobre un contenedor que DESBORDA,
            centrar recorta el principio y esas tarjetas no se pueden alcanzar
            desplazando: con ocho, Margex e Hyperliquid quedaban inaccesibles.
            Se vio en la captura, no en el código. Va alineado al inicio, y el
            centrado lo da el `max-w-7xl mx-auto` de fuera cuando cabe. */}
        <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory
                        [scrollbar-width:thin] justify-start">
          {PARTNERS.map((partner) => (
            <motion.a
              key={partner.id}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              {...FADE_UP_VIEW}
              className="group block w-72 shrink-0 snap-start rounded-xl overflow-hidden border border-border bg-background hover:border-primary/50 transition-colors"
              data-testid={`partner-card-${partner.id}`}
            >
              <img
                src={partner.image}
                alt={partner.name}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold">{partner.name}</h3>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">{t(partner.descKey)}</p>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t('sponsoredLabel')}
                </span>
              </div>
            </motion.a>
          ))}

          {brokers.map((b) => (
            <motion.a
              key={b.id}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              {...FADE_UP_VIEW}
              className="group block w-72 shrink-0 snap-start rounded-xl overflow-hidden border border-border bg-background hover:border-primary/50 transition-colors"
              data-testid={`partner-card-${b.id}`}
            >
              {LOGOS[b.id] ? (
                <img src={LOGOS[b.id]} alt={b.nombre}
                     className="w-full aspect-square object-cover" loading="lazy" />
              ) : (
                <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-muted/40 px-4 text-center">
                  <span className="font-unbounded text-2xl font-bold">{b.nombre}</span>
                  {b.entidad && (
                    <span className="text-[11px] text-muted-foreground leading-tight">{b.entidad}</span>
                  )}
                  {b.regulador && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      {b.regulador}{b.licencia ? ` · ${b.licencia}` : ''}
                    </span>
                  )}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold">{b.nombre}</h3>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                {/* Línea de información, del mismo tamaño que la de los otros
                    dos socios: quién firma y quién lo regula. */}
                <p className="text-sm text-muted-foreground mb-2">
                  {[b.entidad, b.regulador && `${b.regulador}${b.licencia ? ` · ${b.licencia}` : ''}`]
                    .filter(Boolean).join(' · ')}
                </p>

                {/* El aviso, en la forma ABREVIADA que la propia ESMA admite
                    donde hay límite de espacio, y el texto completo detrás de
                    «leer más» en otra pestaña.
                    ⚠️ La cifra NO se esconde: lo que va detrás del enlace es la
                    explicación larga, no el porcentaje. Un «leer más» que se
                    lleve el dato deja la tarjeta promocionando sin avisar. */}
                {b.advertenciaCorta && (
                  <p className="text-sm leading-snug text-amber-500/90 mb-2 flex items-start gap-1.5"
                     data-testid={`partner-advertencia-${b.id}`}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {b.advertenciaCorta}{' '}
                      <span
                        role="link"
                        tabIndex={0}
                        className="underline whitespace-nowrap hover:text-amber-400"
                        data-testid={`partner-leermas-${b.id}`}
                        onClick={(e) => {
                          // La tarjeta entera es un <a>: sin esto, «leer más»
                          // abriría el bróker en vez de la advertencia.
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(`${process.env.PUBLIC_URL || ''}/brokers`, '_blank', 'noopener');
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                      >
                        {t('brokersLeerMas')}
                      </span>
                    </span>
                  </p>
                )}

                {/* Sólo se llama afiliado a lo que lo es. */}
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {b.esReferido ? t('sponsoredLabel') : t('brokersEnlaceDirecto')}
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendedTools;
