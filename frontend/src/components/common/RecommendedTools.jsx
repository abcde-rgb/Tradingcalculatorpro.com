import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
// Generado por `scripts/gen-partner-logos.js` a partir de los ficheros que haya
// en `src/assets/partners/`. Ver el comentario largo sobre logos más abajo.
import LOGOS from '@/assets/partners/logos.generated';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : null;

// Affiliate / referral partners. Add new entries here — each renders as a
// clickable card that opens the referral link in a new tab.
const PARTNERS = [
  {
    id: 'margex',
    name: 'Margex',
    url: 'https://margex.com/?rid=44932212',
    descKey: 'partnerMargexDesc',
  },
  {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    // TODO(pendiente): reemplazar por el enlace de referido real de Hyperliquid
    // cuando el usuario lo facilite. Y sustituir el logo placeholder (SVG) por el
    // oficial (hyperliquid-square.png). Ver docs/PENDIENTES.md.
    url: 'https://app.hyperliquid.xyz/',
    descKey: 'partnerHyperliquidDesc',
  },
];

/**
 * Los brókers vienen del SERVIDOR, no de la lista de arriba.
 *
 * La diferencia no es de estilo: la cifra de la advertencia la recalcula cada
 * bróker cada trimestre, así que CADUCA, y un dato que caduca no puede vivir en
 * una constante del frontend. `/api/brokers` la sirve con su fecha detrás.
 */

/*
 * LOGOS — de dónde salen y por qué faltan seis.
 *
 * El mapa lo genera `scripts/gen-partner-logos.js` mirando qué hay en
 * `src/assets/partners/`. **Para añadir un logo no se toca este fichero**:
 * se deja `<id>-square.svg` (o .png) en esa carpeta y se ejecuta el script.
 * Antes esto era un mapa a mano, y un mapa a mano es cómo un logo acaba en la
 * carpeta sin salir en la web porque nadie se acordó del `import`.
 *
 * ⚠️ Hoy sólo están Margex e Hyperliquid, y conviene que conste por qué. Los
 * logos oficiales de los seis brókers son marcas registradas y los sirve cada
 * uno en su media kit de afiliados. Desde este entorno **no se pueden
 * descargar**: el proxy de salida responde 403 —denegación de política, no
 * fallo de red— a los seis dominios, a sus dominios alternativos
 * (axitrader.com, dukascopy.bank, swissquote.ch, saxobank.com, ibkr.com,
 * vtmarkets.net), a Wikimedia, a los CDN de npm y a los servicios de favicon.
 * Y `simple-icons` —3453 iconos de marca, sí accesible— no tiene ninguno de
 * los seis; tiene «Axis Bank» y «Axios», que son otras empresas.
 *
 * Lo que NO se hace mientras tanto es dibujar una imitación: se parecería lo
 * justo para confundir y no sería la suya. La tarjeta pinta una ficha de marca
 * propia —monograma, nombre y supervisor— que es claramente NUESTRA.
 */

// El monograma de la ficha de marca. Explícito y no derivado del nombre porque
// las reglas automáticas dan resultados feos justo donde importa: «Dukascopy
// Europe» sale «DE» y «Interactive Brokers» sale «IN».
const MONOGRAMA = {
  axi: 'AX', dukascopy: 'DK', swissquote: 'SQ',
  saxo: 'SX', ibkr: 'IB', vtmarkets: 'VT',
};

// La descripción de cada bróker, por clave i18n. Vive aquí y no en el registro
// del backend porque es PROSA —hay que traducirla a los diez idiomas—, mientras
// que los hechos (entidad, regulador, licencia, porcentaje) siguen viniendo del
// servidor y de un solo sitio. Mezclar las dos cosas es cómo un dato acaba
// escrito en once ficheros y desfasado en diez.
// La jurisdicción, traducida por CÓDIGO. El texto que manda el servidor va en
// castellano y sirve de respaldo: si aparece una jurisdicción nueva antes de
// tener su clave, sale en castellano —incompleto pero cierto— en vez de salir
// como «jurisd_xx» o como un hueco.
const JURISDICCION = { ue: 'jurisdUe', svg: 'jurisdSvg' };

const DESCRIPCION = {
  axi: 'partnerAxiDesc',
  dukascopy: 'partnerDukascopyDesc',
  swissquote: 'partnerSwissquoteDesc',
  saxo: 'partnerSaxoDesc',
  ibkr: 'partnerIbkrDesc',
  vtmarkets: 'partnerVtmarketsDesc',
};

/**
 * Un tono estable por marca, derivado del id.
 *
 * ⚠️ **No es el color corporativo del bróker**: no lo tengo y no me lo invento.
 * Es decoración nuestra, y lo único que se le pide es ser estable (la misma
 * tarjeta sale siempre igual) y distinguible entre vecinas. Se expresa en HSL
 * con opacidad para que funcione en tema claro y oscuro sin conocer el fondo.
 */
function tonoDeMarca(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function FichaDeMarca({ id, nombre, imagen, regulador }) {
  if (imagen) {
    return (
      <img src={imagen} alt={nombre} className="w-full aspect-square object-cover" loading="lazy" />
    );
  }
  const h = tonoDeMarca(id);
  return (
    <div
      className="relative w-full aspect-square overflow-hidden flex flex-col items-center justify-center gap-2 px-4 text-center"
      style={{
        background: `linear-gradient(155deg, hsl(${h} 55% 50% / 0.20), hsl(${(h + 45) % 360} 55% 50% / 0.05))`,
      }}
    >
      {/* Un foco desplazado, no centrado: una ficha perfectamente simétrica
          parece un icono de sistema. Decorativo, así que fuera del árbol. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 26% 18%, hsl(${h} 75% 60% / 0.22), transparent 58%)` }}
      />

      {/* `--ficha-l` la pone el tema en `index.css`: el mismo tono que
          contrasta sobre grafito se lava sobre papel hueso. */}
      <span
        className="relative font-unbounded text-5xl font-bold leading-none tracking-tighter"
        style={{ color: `hsl(${h} 60% var(--ficha-l, 62%))` }}
      >
        {MONOGRAMA[id] || nombre.slice(0, 2).toUpperCase()}
      </span>

      <span
        aria-hidden
        className="relative block w-10 h-px"
        style={{ background: `hsl(${h} 60% var(--ficha-l, 62%) / 0.55)` }}
      />

      <span className="relative font-unbounded text-base text-foreground/90">{nombre}</span>

      {/* El regulador, dentro de la ficha. Es lo primero que hay que saber de
          un bróker y aquí ocupa el sitio que en los otros dos socios ocupa el
          logotipo — un hueco decorativo se cambia por un dato. */}
      {regulador && (
        <span className="relative text-[10px] uppercase tracking-widest text-muted-foreground">
          {regulador}
        </span>
      )}
    </div>
  );
}

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

/** Socios y brókers en un solo modelo, para que la marquesina pinte una lista. */
function useTarjetas() {
  const { t } = useTranslation();
  const brokers = useBrokers();

  return useMemo(() => [
    ...PARTNERS.map((p) => ({
      id: p.id,
      nombre: p.name,
      url: p.url,
      // Mismo origen que los brókers: el mapa generado. Que un socio tenga
      // logo y otro no deja de ser un caso especial en el código.
      imagen: LOGOS[p.id] || null,
      descripcion: t(p.descKey),
      info: null,
      regulador: null,
      reguladorCorto: null,
      jurisdiccion: null,
      noAdmite: null,
      advertenciaCorta: null,
      esReferido: true,
    })),
    ...brokers.map((b) => ({
      id: b.id,
      nombre: b.nombre,
      url: b.url,
      imagen: LOGOS[b.id] || null,
      descripcion: DESCRIPCION[b.id] ? t(DESCRIPCION[b.id]) : null,
      info: b.entidad || null,
      regulador: b.regulador ? `${b.regulador}${b.licencia ? ` · ${b.licencia}` : ''}` : null,
      // En la ficha de marca cabe el supervisor, no el número de licencia.
      reguladorCorto: b.regulador || null,
      // A qué público sirve esa entidad. Sin esto, la ficha le dice a un
      // lector de Chile que su bróker es una sociedad chipriota supervisada
      // por CySEC, y no lo es: la marca tiene una entidad por región.
      jurisdiccion: (JURISDICCION[b.jurisdiccionCodigo] && t(JURISDICCION[b.jurisdiccionCodigo]))
        || b.jurisdiccion || null,
      // A quién no admite el alta. Va en la tarjeta, no en la letra pequeña:
      // enterarse después de rellenar el formulario no sirve de nada.
      noAdmite: b.noAdmiteResidentes?.length ? b.noAdmiteResidentes.join(', ') : null,
      advertenciaCorta: b.advertenciaCorta || null,
      esReferido: !!b.esReferido,
    })),
  ], [brokers, t]);
}

function Tarjeta({ tarjeta, clon }) {
  const { t } = useTranslation();
  const {
    id, nombre, url, imagen, descripcion, info, regulador, reguladorCorto,
    jurisdiccion, noAdmite, advertenciaCorta, esReferido,
  } = tarjeta;

  // La segunda copia de la pista existe sólo para que el bucle empalme sin
  // salto. No lleva `data-testid` (duplicarlos rompería cualquier sonda que
  // cuente elementos), y sale del orden de tabulación y del árbol de
  // accesibilidad: quien navega con teclado o con lector no debe recorrer
  // dieciséis tarjetas cuando hay ocho.
  const props = clon
    ? { 'aria-hidden': true, tabIndex: -1 }
    : { 'data-testid': `partner-card-${id}` };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block w-72 shrink-0 mr-6 rounded-xl overflow-hidden border border-border bg-background hover:border-primary/50 transition-colors"
      {...props}
    >
      <FichaDeMarca id={id} nombre={nombre} imagen={imagen} regulador={reguladorCorto} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-bold">{nombre}</h3>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        {descripcion && (
          <p
            className="text-sm text-muted-foreground mb-2 leading-snug"
            {...(clon ? {} : { 'data-testid': `partner-desc-${id}` })}
          >
            {descripcion}
          </p>
        )}

        {/* Quién firma el contrato y quién lo regula. Más pequeño que la
            descripción a propósito: es la letra pequeña, y va en su sitio.

            ⚠️ La jurisdicción va PEGADA a la entidad, no en otra línea. El
            público es internacional: «Solaris EMEA Ltd · CySEC · 433/23» a
            secas le dice a un lector de Chile que ése es su bróker, y no lo
            es. Con «(entidad para la Unión Europea)» la frase es verdad para
            todo el mundo. */}
        {(info || regulador) && (
          <p className="text-xs text-muted-foreground/80 mb-2 flex items-start gap-1 leading-snug"
             {...(clon ? {} : { 'data-testid': `partner-ficha-${id}` })}>
            {regulador && <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px text-primary" />}
            <span>
              {[info, regulador].filter(Boolean).join(' · ')}
              {jurisdiccion && (
                <span className="opacity-80"> — {t('brokersEntidadPara')} {jurisdiccion}</span>
              )}
            </span>
          </p>
        )}

        {/* A quién NO admite. En la tarjeta y antes del botón: enterarse
            después de rellenar el alta no le sirve a nadie. */}
        {noAdmite && (
          <p className="text-xs text-muted-foreground/80 mb-2 leading-snug"
             {...(clon ? {} : { 'data-testid': `partner-noadmite-${id}` })}>
            <Ban className="w-3.5 h-3.5 shrink-0 mt-px inline-block mr-1 align-text-top" />
            {t('brokersNoAdmite')} {noAdmite}
          </p>
        )}

        {/* El aviso, en la forma ABREVIADA que la propia ESMA admite donde hay
            límite de espacio, y el texto completo detrás de «leer más» en otra
            pestaña.
            ⚠️ La cifra NO se esconde: lo que va detrás del enlace es la
            explicación larga, no el porcentaje. Un «leer más» que se lleve el
            dato deja la tarjeta promocionando sin avisar. */}
        {advertenciaCorta && (
          <p
            className="text-sm leading-snug text-amber-500/90 mb-2 flex items-start gap-1.5"
            {...(clon ? {} : { 'data-testid': `partner-advertencia-${id}` })}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {advertenciaCorta}{' '}
              <span
                role="link"
                tabIndex={clon ? -1 : 0}
                className="underline whitespace-nowrap hover:text-amber-400"
                {...(clon ? {} : { 'data-testid': `partner-leermas-${id}` })}
                onClick={(e) => {
                  // La tarjeta entera es un <a>: sin esto, «leer más» abriría
                  // el bróker en vez de la advertencia.
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
          {esReferido ? t('sponsoredLabel') : t('brokersEnlaceDirecto')}
        </span>
      </div>
    </a>
  );
}

export const RecommendedTools = () => {
  const { t } = useTranslation();
  const tarjetas = useTarjetas();

  if (tarjetas.length === 0) return null;

  // Velocidad constante: cada tarjeta tarda lo mismo en cruzar, haya cinco o
  // quince. Un valor fijo haría que añadir socios acelerase la fila entera.
  const duracion = `${tarjetas.length * 7}s`;

  return (
    <section className="py-16 px-4 bg-card/50" data-testid="recommended-tools">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('partnersTitle')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t('partnersSubtitle')}</p>
        </div>
      </div>

      {/* A ancho completo, no dentro del `max-w-7xl`: una marquesina que empieza
          y acaba en el borde de la pantalla se lee como una cinta continua; una
          recortada a la columna del texto, como una caja con algo dentro. */}
      <div className="marquesina" style={{ '--marquesina-duracion': duracion }}>
        <div className="marquesina-pista">
          {tarjetas.map((x) => <Tarjeta key={x.id} tarjeta={x} />)}
          {tarjetas.map((x) => <Tarjeta key={`clon-${x.id}`} tarjeta={x} clon />)}
        </div>
      </div>
    </section>
  );
};

export default RecommendedTools;
