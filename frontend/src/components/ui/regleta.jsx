import { useMemo } from 'react';

/**
 * La regleta — el elemento firma del sistema de diseño (`identidad-visual` §3).
 *
 * Una escala de ticks: filete horizontal con marcas verticales de distinta
 * altura, como el borde de un calibre. No es decoración: codifica escala,
 * distancia y riesgo, que es exactamente lo que vende el producto.
 *
 * Aquí mide el trade que el visitante acaba de dimensionar. La distancia entre
 * entrada y stop es 1R por definición, así que los múltiplos que marca a la
 * derecha —1R, 2R, 3R— NO son objetivos inventados: son esa misma distancia
 * proyectada en la dirección del beneficio. Aritmética sobre lo que el usuario
 * ha tecleado, no un número que nos saquemos.
 *
 * Colores: `--short` para el lado de la pérdida y `--long` para el del
 * beneficio. Aquí sí son los tokens de P&L, porque esto sí es P&L.
 */

const VB_W = 1000;   // ancho del viewBox; el SVG escala al contenedor
const VB_H = 78;
const EJE_Y = 34;    // dónde va el filete horizontal
const N_MENORES = 61;

const fmt = (n, locale) => (Number.isFinite(n)
  ? n.toLocaleString(locale, { maximumFractionDigits: 2 })
  : '—');

export function Regleta({ entry, stop, locale, labels = {}, className = '' }) {
  const m = useMemo(() => {
    const e = Number(entry);
    const s = Number(stop);
    const d = Math.abs(e - s);
    // Sin distancia no hay R, y sin R no hay nada que medir: mejor no pintar
    // una escala que sugiera precisión que no existe.
    if (!Number.isFinite(e) || !Number.isFinite(s) || d <= 0) return null;

    const dir = e > s ? 1 : -1;           // largo si la entrada está sobre el stop
    const objetivos = [1, 2, 3].map((n) => ({ n, v: e + dir * n * d }));
    const puntos = [s, e, ...objetivos.map((o) => o.v)];
    const lo = Math.min(...puntos);
    const hi = Math.max(...puntos);
    const pad = (hi - lo) * 0.06;
    const min = lo - pad;
    const max = hi + pad;
    const x = (v) => ((v - min) / (max - min)) * VB_W;

    return { e, s, d, dir, objetivos, x };
  }, [entry, stop]);

  if (!m) return null;

  const { e, s, d, objetivos, x } = m;
  const xe = x(e);
  const xs = x(s);

  return (
    <figure className={`m-0 ${className}`} data-testid="regleta">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-[78px] overflow-visible"
        role="img"
        aria-label={labels.aria || 'Escala del trade'}
        preserveAspectRatio="none"
      >
        {/* Marcas menores: el borde del calibre. Cada quinta, más alta. */}
        {Array.from({ length: N_MENORES }, (_, i) => {
          const px = (i / (N_MENORES - 1)) * VB_W;
          const alta = i % 5 === 0;
          return (
            <line
              key={i}
              x1={px} x2={px}
              y1={EJE_Y} y2={EJE_Y - (alta ? 7 : 4)}
              stroke="hsl(var(--rule))"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        <line
          x1={0} x2={VB_W} y1={EJE_Y} y2={EJE_Y}
          stroke="hsl(var(--rule))" strokeWidth={1} vectorEffect="non-scaling-stroke"
        />

        {/* El tramo de riesgo: de la entrada al stop. Es la única distancia que
            el usuario ha decidido; todo lo demás se deriva de ella. */}
        <line
          x1={xs} x2={xe} y1={EJE_Y} y2={EJE_Y}
          stroke="hsl(var(--short))" strokeWidth={2} vectorEffect="non-scaling-stroke"
        />

        {objetivos.map((o) => (
          <g key={o.n}>
            <line
              x1={x(o.v)} x2={x(o.v)} y1={EJE_Y + 9} y2={EJE_Y - 11}
              stroke="hsl(var(--long))" strokeWidth={1} strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={x(o.v)} y={EJE_Y - 16} textAnchor="middle"
              fill="hsl(var(--long))" fontSize="12" fontFamily="ui-monospace, monospace"
            >
              {o.n}R
            </text>
          </g>
        ))}

        {/* Stop y entrada, las dos marcas altas. */}
        <line
          x1={xs} x2={xs} y1={EJE_Y + 13} y2={EJE_Y - 13}
          stroke="hsl(var(--short))" strokeWidth={2} vectorEffect="non-scaling-stroke"
        />
        <line
          x1={xe} x2={xe} y1={EJE_Y + 13} y2={EJE_Y - 13}
          stroke="hsl(var(--foreground))" strokeWidth={2} vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Las cifras van en HTML, no en el SVG: con `preserveAspectRatio="none"`
          el trazado se estira al ancho del contenedor y el texto se deformaría.
          Aquí además heredan la tipografía de datos y `tabular-nums`. */}
      <figcaption className="relative h-9 font-mono tabular-nums text-[11px]">
        {/* `opacity-90`, no `opacity-70`. La opacidad baja sobre el rojo de
            `--short` deja el rótulo «Stop» en 3,58:1 en oscuro y 3,80:1 en claro,
            por debajo del 4,5 que la WCAG 2.1 pide para texto pequeño; axe lo
            marcaba como `serious` en la portada. Medido, no estimado: a 0,90
            sube a 5,21 y 5,51. Los dos rótulos comparten valor a propósito —son
            un par y tienen que verse igual de apagados—, aunque el de entrada
            (que hereda `--foreground`) ya pasaba de sobra. */}
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${(xs / VB_W) * 100}%`, color: 'hsl(var(--short))' }}
        >
          <span className="block uppercase tracking-wider opacity-90">{labels.stop || 'Stop'}</span>
          {fmt(s, locale)}
        </span>
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap text-foreground"
          style={{ left: `${(xe / VB_W) * 100}%` }}
        >
          <span className="block uppercase tracking-wider opacity-90">{labels.entry || 'Entrada'}</span>
          {fmt(e, locale)}
        </span>
      </figcaption>

      {labels.caption && (
        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
          {labels.caption.replace('{d}', fmt(d, locale))}
        </p>
      )}
    </figure>
  );
}

export default Regleta;
