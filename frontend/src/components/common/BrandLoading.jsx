/**
 * Indicadores de espera con la marca.
 *
 * Sustituyen al círculo genérico que traía shadcn (`<Loader2 className="animate-spin" />`,
 * 85 usos): es de lo que más veces se mira en una sesión —cada consulta a la
 * cadena, cada refresco del escáner— y no llevaba nada del producto.
 *
 * No hay logotipo nuevo ni forma nueva: se anima el que ya existe. La
 * geometría se IMPORTA de `BrandMark.jsx`, que es la fuente; copiarla aquí
 * garantizaría que las dos versiones divergieran a la primera corrección.
 * El movimiento vive en `src/index.css` (`tcpro-imprimir`, `tcpro-cinta`,
 * `tcpro-latido`).
 *
 * Cuál va dónde:
 *
 *   CargaVelas      14-24 px   dentro de botones y junto a etiquetas
 *   CargaProgreso   40-72 px   SÓLO con avance medido de verdad
 *   CargaMarca      56-96 px   arranque de pantalla o ruta comprobando sesión
 *   CintaCarga      2 px alto  cambio de ruta y refrescos de fondo
 *   EsqueletoVelas  según fila tablas y cadenas mientras llegan los datos
 *
 * ACCESIBILIDAD. Los SVG van siempre `aria-hidden`: son decoración: quien no
 * ve la pantalla no necesita saber que hay tres rectángulos moviéndose,
 * necesita saber que se está esperando. Eso lo dice `role="status"` con
 * `etiqueta`. Pásala SÓLO cuando el indicador esté solo; si va dentro de un
 * botón que ya dice «Calculando…», repetirlo hace que el lector lo lea dos
 * veces.
 *
 * MOVIMIENTO REDUCIDO. La regla global del proyecto deja toda animación en
 * 0,01 ms; sobre estas velas eso las congelaría a media impresión, dos casi
 * transparentes, con pinta de adorno roto. Por eso `index.css` les QUITA la
 * animación en vez de acelerarla y las deja quietas y a plena opacidad —
 * el mismo trato que ya recibía `.marquesina`.
 */
import { Velas, VELAS_VIEWBOX, ARCO, ARCO_VIEWBOX, MARCA_VIEWBOX, Monograma } from '@/components/common/BrandMark';
import { cn } from '@/lib/utils';

/** Envuelve un indicador con su anuncio para lectores de pantalla. */
function ConEstado({ etiqueta, className, children }) {
  if (!etiqueta) return children;
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      {children}
      <span className="sr-only">{etiqueta}</span>
    </span>
  );
}

/**
 * En línea · 14-24 px. El sustituto directo de `Loader2`.
 *
 * Las velas imprimen por turno, así que se lee como una cinta que va
 * llegando — que es exactamente lo que está pasando por debajo.
 *
 * Hereda el color del texto (`currentColor`), de modo que dentro de un botón
 * primario sale del color de su texto y no del verde de marca: un verde de
 * marca sobre fondo verde no se vería.
 */
export function CargaVelas({ className = 'w-3.5 h-[18px]', etiqueta }) {
  return (
    <ConEstado etiqueta={etiqueta}>
      <svg viewBox={VELAS_VIEWBOX} className={className} aria-hidden="true" focusable="false">
        <Velas fill="currentColor" base="tc-vela" />
      </svg>
    </ConEstado>
  );
}

/**
 * Progreso real · 40-72 px.
 *
 * `valor` va de 0 a 100 y SÓLO debe pasarse cuando el avance se mide de
 * verdad —una subida de fichero, un backtest por lotes—. Fingir un porcentaje
 * es la versión visual de inventarse un dato, y este proyecto no lo hace ni
 * con los números ni con los píxeles: si no sabes cuánto queda, usa
 * `CargaVelas`.
 */
export function CargaProgreso({ valor, className = 'w-14 h-14', etiqueta }) {
  const pct = Math.min(100, Math.max(0, Number(valor) || 0));
  const largo = 2 * Math.PI * ARCO.r;
  return (
    <ConEstado etiqueta={etiqueta}>
      <svg
        viewBox={ARCO_VIEWBOX}
        className={className}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={etiqueta}
        focusable="false"
      >
        <circle
          cx={ARCO.cx} cy={ARCO.cy} r={ARCO.r} fill="none"
          stroke="currentColor" strokeOpacity=".12" strokeWidth={ARCO.grosor}
        />
        <circle
          cx={ARCO.cx} cy={ARCO.cy} r={ARCO.r} fill="none"
          stroke="hsl(var(--primary))" strokeWidth={ARCO.grosor}
          strokeDasharray={largo}
          strokeDashoffset={largo * (1 - pct / 100)}
          transform={`rotate(-90 ${ARCO.cx} ${ARCO.cy})`}
          style={{ transition: 'stroke-dashoffset 320ms cubic-bezier(.65,0,.35,1)' }}
        />
      </svg>
    </ConEstado>
  );
}

/**
 * Arranque de pantalla · 56-96 px.
 *
 * Aquí sí cabe el monograma, así que se pinta entero y sólo las velas se
 * mueven. Si se mueve todo, no se mira nada.
 */
export function CargaMarca({ className = 'w-16 h-16', etiqueta }) {
  return (
    <ConEstado etiqueta={etiqueta}>
      <svg viewBox={MARCA_VIEWBOX} className={className} aria-hidden="true" focusable="false">
        <Monograma baseVelas="tc-vela" />
      </svg>
    </ConEstado>
  );
}

/**
 * Cinta superior · 2 px de alto.
 *
 * Para cambios de ruta y refrescos de fondo: la espera que no merece tapar la
 * pantalla, pero que sin señal parece que el clic no ha hecho nada. Se ancla
 * al contenedor con `position` propio; en pantalla completa va con `fixed`.
 *
 * Se mueve con `transform`, nunca con `width`: `width` recalcula el diseño en
 * cada fotograma.
 */
export function CintaCarga({ activa = true, className, etiqueta }) {
  if (!activa) return null;
  return (
    <div
      className={cn('pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden z-50', className)}
      role="status"
      aria-live="polite"
    >
      <div className="tc-cinta-barra h-full w-full bg-primary" />
      {etiqueta && <span className="sr-only">{etiqueta}</span>}
    </div>
  );
}

/**
 * Esqueleto de tabla · según fila.
 *
 * Una barra gris genérica se lee como «algo falla»; unas velas a media altura,
 * como «viene una tabla». Y las alturas son ESTABLES por posición, no
 * aleatorias: un esqueleto que baila en cada renderizado marea y delata que es
 * de mentira. De ahí la aritmética de `alturaDe` en vez de un `Math.random()`.
 *
 * `fila` es el índice de la fila, y basta con que sea estable dentro de la
 * tabla: es lo que hace que la misma fila salga siempre igual.
 */
const alturaDe = (i, fila) => 38 + ((i * 37 + fila * 19) % 62);

export function EsqueletoVelas({ barras = 7, fila = 0, className }) {
  return (
    <div className={cn('flex items-end justify-end gap-[5px] h-4', className)} aria-hidden="true">
      {Array.from({ length: barras }, (_, i) => (
        <span
          key={i}
          className="tc-esqueleto block w-[5px] rounded-sm bg-primary/50"
          style={{ height: `${alturaDe(i, fila)}%`, animationDelay: `${(i % 6) * 0.11}s` }}
        />
      ))}
    </div>
  );
}

/**
 * Las filas de esqueleto de una tabla que aún no tiene datos.
 *
 * Va dentro de un `<tbody>` y ocupa el sitio que ocuparán los datos, en vez
 * de una única celda centrada con un indicador: así la tabla no da el salto
 * de alto al llegar la respuesta. La primera columna alinea a la izquierda
 * porque es la etiqueta; el resto a la derecha, como las cifras que vienen.
 */
export function FilasEsqueleto({ columnas, filas = 4 }) {
  return Array.from({ length: filas }, (_, f) => (
    <tr key={f} className="border-b border-border/40">
      {Array.from({ length: columnas }, (_, c) => (
        <td key={c} className="px-3 py-3">
          <EsqueletoVelas
            barras={c === 0 ? 6 : 4}
            fila={f * columnas + c}
            className={c === 0 ? 'justify-start' : undefined}
          />
        </td>
      ))}
    </tr>
  ));
}

export default CargaVelas;
