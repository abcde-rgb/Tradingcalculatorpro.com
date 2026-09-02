import { useMemo } from 'react';
import {
  VB, F_INI, F_FIN,
  OBJETIVOS_POR_DEFECTO, arco, punto, ticksCalibre, escalaCalibre,
} from '@/lib/calibreGeo';
import { decimalesUtiles, formatearEnEscala } from '@/lib/escalaTrade';

/**
 * El calibre — la regleta doblada en arco.
 *
 * `components/ui/regleta.jsx` mide el trade en una recta; esto lo mide en una
 * esfera de cronómetro. Misma información y mismos tokens, otra forma: cabe en
 * una tarjeta cuadrada, sostiene una cifra grande en el centro y se lee de un
 * vistazo, que es lo que se le pide a un panel junto a la calculadora.
 *
 * Sale del ejemplar «II · El calibre» de `docs/muestras/portadas/`, donde eran
 * colores fijos sobre negro. Aquí va por tokens, así que funciona en los seis
 * temas y en claro y oscuro.
 *
 * La distancia entrada–stop es 1R por definición, así que los múltiplos que
 * marca —1R, 2R, 3R— NO son objetivos inventados: son esa misma distancia
 * proyectada en la dirección del beneficio. Aritmética sobre lo tecleado.
 *
 * Toda la geometría —y la garantía de que la escala es lineal en R— vive en
 * `lib/calibreGeo.js`, que `scripts/engine-check.js` comprueba sin navegador.
 * Aquí sólo queda pintar.
 *
 * Colores: `--short` para el lado de la pérdida y `--long` para el del
 * beneficio; son los tokens de P&L y esto sí es P&L.
 *
 * @param {number|string} entry     precio de entrada
 * @param {number|string} stop      precio del stop
 * @param {string}   [locale]       para `toLocaleString`
 * @param {number[]} [objetivos]    múltiplos de R a marcar (por defecto 1, 2, 3)
 * @param {object}   [labels]       { stop, entry, unidad, caption, aria, ariaPrefijo }
 * @param {string}   [className]
 */

const COLOR = {
  stop: 'hsl(var(--short))',
  entrada: 'hsl(var(--foreground))',
  objetivo: 'hsl(var(--long))',
};

const TICKS = ticksCalibre();   // no dependen de los datos: se calculan una vez

export function Calibre({
  entry,
  stop,
  locale,
  objetivos = OBJETIVOS_POR_DEFECTO,
  labels = {},
  className = '',
}) {
  const m = useMemo(
    () => escalaCalibre({ entry, stop, objetivos }),
    [entry, stop, objetivos],
  );

  if (!m) return null;

  const { d, fStop, fEntrada, fUlt, marcas } = m;

  // La precisión sale de la unidad de la escala, no de una constante: con dos
  // decimales fijos un EURUSD enseñaba «1R = 0».
  const dec = decimalesUtiles(d);
  const fmt = (n) => formatearEnEscala(n, locale, dec);

  const texto = (k) => {
    if (k.clave === 'stop') return labels.stop || 'STOP';
    if (k.clave === 'entrada') return labels.entry || 'ENTRADA';
    return `${k.r}R`;
  };
  const color = (k) => COLOR[k.clave] || COLOR.objetivo;

  // El `aria-label` lleva las cifras, no sólo el título: un lector de pantalla
  // no puede mirar la esfera, y las marcas del SVG no forman un texto legible.
  const aria = labels.aria || [
    labels.ariaPrefijo || 'Escala del trade.',
    ...marcas.map((k) => `${texto(k)}: ${fmt(k.valor)}.`),
  ].join(' ');

  return (
    <figure className={`m-0 ${className}`} data-testid="calibre">
      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        className="w-full h-auto block overflow-visible"
        role="img"
        aria-label={aria}
      >
        {/* Filete del arco y borde de marcas: la firma del calibre. */}
        <path
          d={arco(F_INI, F_FIN)}
          fill="none"
          stroke="hsl(var(--rule))"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {TICKS.map((t) => (
          <line
            key={t.f.toFixed(2)}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.alto ? 'hsl(var(--muted-foreground))' : 'hsl(var(--rule))'}
            strokeOpacity={t.alto ? 0.55 : 1}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Los dos tramos que importan. Miden lo mismo por cada R, así que su
            grosor sí escala con la pieza: son trazo estructural, no hairline. */}
        <path d={arco(fStop, fEntrada)} fill="none" stroke={COLOR.stop} strokeWidth={3} />
        <path d={arco(fEntrada, fUlt)} fill="none" stroke={COLOR.objetivo} strokeWidth={3} />

        {marcas.map((k) => {
          const [px, py] = punto(k.f);
          const [lx, ly] = punto(k.f, VB.r + 20);
          const [vx, vy] = punto(k.f, VB.r - 30);
          return (
            <g key={k.clave}>
              <circle cx={px.toFixed(1)} cy={py.toFixed(1)} r={4} fill={color(k)} />
              <text
                x={lx.toFixed(1)} y={ly.toFixed(1)}
                textAnchor="middle" dominantBaseline="middle"
                fill={color(k)}
                fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="1.5"
              >
                {texto(k)}
              </text>
              <text
                x={vx.toFixed(1)} y={vy.toFixed(1)}
                textAnchor="middle" dominantBaseline="middle"
                fill="hsl(var(--muted-foreground))"
                fontFamily="ui-monospace, monospace" fontSize="10"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {fmt(k.valor)}
              </text>
            </g>
          );
        })}

        {/* El centro: la única distancia que el usuario ha decidido. Todo lo
            demás de la esfera sale de ella. */}
        <text
          x={VB.cx} y={VB.cy - 18}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontFamily="ui-monospace, monospace" fontSize="26" letterSpacing="-1"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {fmt(d)}
        </text>
        <text
          x={VB.cx} y={VB.cy}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize="9.5" letterSpacing="3"
        >
          {labels.unidad || 'DISTANCIA AL STOP · 1R'}
        </text>
      </svg>

      {labels.caption && (
        <figcaption className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
          {labels.caption.replace('{d}', fmt(d))}
        </figcaption>
      )}
    </figure>
  );
}

export default Calibre;
