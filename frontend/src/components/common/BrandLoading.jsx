/**
 * Indicadores de carga hechos con el logotipo.
 *
 * Por qué existe
 * --------------
 * El repo tenía 85 `Loader2` de lucide con `animate-spin`: el círculo genérico
 * que trae shadcn. Es de lo que más veces se mira en una sesión de trabajo
 * —cada consulta a la cadena de opciones, cada refresco del escáner, cada
 * cálculo— y no llevaba nada de la marca. Una espera es tiempo de pantalla
 * regalado: si algo va a hacerse mirar veinte veces al día, que sea tuyo.
 *
 * De dónde sale la geometría
 * --------------------------
 * De `BrandMark.jsx`, que a su vez está calcada de `public/tcpro-icono-512.svg`.
 * Aquí NO se redibuja el logotipo: se anima el que ya hay, con sus mismas
 * coordenadas. Si el icono cambia, esto hay que revisarlo — y por eso las
 * constantes viven arriba y no repartidas por el archivo.
 *
 * Las tres velas son la parte REDUCIBLE de la marca: a 16 px el monograma «TC»
 * ya no se lee y las velas sí. Por eso son ellas las que cargan, y el
 * monograma sólo aparece a partir de 40 px.
 *
 * Las animaciones viven en `index.css` (`tcpro-imprimir`, `tcpro-arco`,
 * `tcpro-cinta`, `tcpro-latido`) porque tienen que poder saltarse la regla
 * global de `prefers-reduced-motion`, que las congelaría a media impresión.
 * Ahí está explicado.
 */
import { useTranslation } from '@/lib/i18n';
// La geometría NO se copia: sale del propio logotipo.
import {
  VelasMarca, ARCO_C, CAJA_ARCO, CAJA_VELAS, TINTA_MARCA, VERDE_MARCA,
} from '@/components/common/BrandMark';

const VERDE = VERDE_MARCA;
const TINTA = TINTA_MARCA;
const ARCO = ARCO_C;

/** Las tres velas del logotipo, imprimiendo por turno. */
function TresVelas() {
  return <VelasMarca clase="tc-vela" />;
}

/**
 * El indicador de línea. Sustituto directo de `<Loader2 className="animate-spin" />`.
 *
 * Las tres velas imprimen por turno, de izquierda a derecha. Se lee como una
 * cinta que va llegando, que es exactamente lo que está pasando por debajo.
 */
export function CargaVelas({ className = 'w-4 h-4', etiqueta }) {
  const { t } = useTranslation();
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <svg viewBox={CAJA_VELAS} className={className} aria-hidden="true" focusable="false">
        <TresVelas />
      </svg>
      <span className="sr-only">{etiqueta || t('loading')}</span>
    </span>
  );
}

/**
 * El arco de la «C» girando. Para esperas que ocupan una sección entera, donde
 * un indicador de 16 px se pierde.
 */
export function CargaArco({ className = 'w-8 h-8', etiqueta }) {
  const { t } = useTranslation();
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <svg viewBox={CAJA_ARCO} className={className} aria-hidden="true" focusable="false">
        {/* La pista, para que el arco se lea como una porción y no como una raya
            suelta girando en el vacío. */}
        <circle cx="105" cy="42" r="34" fill="none" stroke={TINTA} strokeOpacity="0.12" strokeWidth="16" />
        <path className="tc-arco" d={ARCO} fill="none" stroke={VERDE} strokeWidth="16" strokeLinecap="butt" />
      </svg>
      <span className="sr-only">{etiqueta || t('loading')}</span>
    </span>
  );
}

/**
 * El arco como progreso REAL, con porcentaje.
 *
 * Sólo se usa cuando se conoce el avance de verdad (una subida de fichero, un
 * backtest por lotes). Fingir un porcentaje que no se mide es la versión visual
 * de inventarse un dato, y este producto no lo hace en ningún otro sitio.
 */
export function CargaProgreso({ valor, className = 'w-10 h-10' }) {
  const pct = Math.max(0, Math.min(100, Number(valor) || 0));
  const largo = Math.PI * 2 * 34;
  return (
    <span
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="inline-flex items-center"
    >
      <svg viewBox={CAJA_ARCO} className={className} aria-hidden="true" focusable="false">
        <circle cx="105" cy="42" r="34" fill="none" stroke={TINTA} strokeOpacity="0.12" strokeWidth="16" />
        <circle
          cx="105" cy="42" r="34" fill="none" stroke={VERDE} strokeWidth="16"
          strokeDasharray={largo}
          strokeDashoffset={largo * (1 - pct / 100)}
          transform="rotate(-90 105 42)"
          style={{ transition: 'stroke-dashoffset 320ms cubic-bezier(0.65, 0, 0.35, 1)' }}
        />
      </svg>
    </span>
  );
}

/**
 * La marca completa mientras arranca una pantalla.
 *
 * Aquí sí cabe el monograma, así que se pinta el icono entero y las velas son
 * lo único que se mueve. El resto queda quieto: si se mueve todo, no se mira nada.
 */
export function CargaMarca({ className = 'w-16 h-16', texto, etiqueta }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
        <rect x="1.5" y="1.5" width="509" height="509" rx="120.3" fill="#0F0F0F" stroke="#262626" strokeWidth="3" />
        <g transform="translate(56.3,123.9) scale(3.1446)">
          <polygon points="8,7 60,7 60,23 0,23" fill={TINTA} />
          <rect x="24" y="23" width="16" height="54" fill={TINTA} />
          <path d={ARCO} fill="none" stroke={TINTA} strokeWidth="16" />
          <TresVelas />
        </g>
      </svg>
      {texto ? <p className="text-sm text-muted-foreground">{texto}</p> : null}
      <span className="sr-only">{etiqueta || t('loading')}</span>
    </div>
  );
}

/**
 * Cinta de progreso indeterminado, pegada al borde superior.
 *
 * Se mueve con `transform`, nunca con `width`: animar el ancho fuerza layout en
 * cada fotograma, y esto vive por encima de pantallas con tablas de cientos de
 * filas.
 */
export function CintaCarga({ etiqueta }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 h-0.5 overflow-hidden z-[60] bg-transparent"
    >
      <div className="tc-cinta-barra h-full w-full" style={{ background: VERDE }} />
      <span className="sr-only">{etiqueta || t('loading')}</span>
    </div>
  );
}

/**
 * Esqueleto con forma de vela, para las filas de una tabla que aún no ha llegado.
 *
 * Un esqueleto con la silueta del dato que va a aparecer se lee como «viene una
 * tabla»; una barra gris genérica, como «algo falla».
 */
export function EsqueletoVelas({ n = 12, className = 'h-10' }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className={`flex items-end gap-1.5 ${className}`}>
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="tc-esqueleto block w-1.5 rounded-sharp bg-primary/50"
          style={{
            // Alturas estables por posición, no aleatorias: un esqueleto que
            // baila en cada renderizado marea y delata que es de mentira.
            height: `${38 + ((i * 37) % 62)}%`,
            animationDelay: `${(i % 6) * 0.11}s`,
          }}
        />
      ))}
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
}

export default CargaVelas;
