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
 * La diferencia no es de estilo. Un bróker de CFDs dirigido a minoristas de la
 * UE sólo se puede enlazar con su advertencia normalizada al lado, con el
 * porcentaje real de cuentas perdedoras de ESE bróker y recalculado cada
 * trimestre. Eso no cabe en una constante del frontend: caduca. Por eso
 * `/api/brokers` sólo devuelve los que hoy cumplen —autorización en la UE,
 * porcentaje dentro de la ventana, enlace configurado— y esta sección no puede
 * pintar uno que no cumpla, porque no lo recibe.
 *
 * Detalle: no hay logos. Los de los seis brókers son marcas registradas y no
 * los tengo; una tarjeta con el nombre y la entidad dice más que un logo
 * inventado, y quien va a abrir cuenta necesita saber que «Axi» es la marca y
 * Solaris EMEA Ltd quien firma.
 */
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

        <div className="flex flex-wrap justify-center gap-6">
          {PARTNERS.map((partner) => (
            <motion.a
              key={partner.id}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              {...FADE_UP_VIEW}
              className="group block w-full sm:w-72 rounded-xl overflow-hidden border border-border bg-background hover:border-primary/50 transition-colors"
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
              className="group block w-full sm:w-72 rounded-xl overflow-hidden border border-border bg-background hover:border-primary/50 transition-colors"
              data-testid={`partner-card-${b.id}`}
            >
              {/* Sin logo: el nombre y la entidad, que es lo que de verdad hace
                  falta saber. Un logo que no tengo no se inventa. */}
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
              <div className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold">{b.nombre}</h3>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                {/* La advertencia normalizada, en la tarjeta y al tamaño del
                    cuerpo. Va ANTES de la etiqueta de afiliado y no se recorta:
                    ESMA pide que sea tan prominente como la promoción, y una
                    tarjeta de portada es promoción. */}
                {b.advertencia && (
                  <div className="flex items-start gap-1.5 mb-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30"
                       data-testid={`partner-advertencia-${b.id}`}>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-base leading-snug text-amber-200/90">{b.advertencia}</p>
                  </div>
                )}

                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t('sponsoredLabel')}
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
