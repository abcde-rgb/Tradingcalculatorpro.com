/**
 * Monograma de marca (TC + velas), en línea, y la GEOMETRÍA de la que salen
 * también los indicadores de espera de `BrandLoading.jsx`.
 *
 * Va inline y no como <img> para que herede el tamaño por clase y no dispare
 * una petición extra en la cabecera, que es lo primero que pinta la web.
 *
 * El wordmark NO vive aquí: el pack de marca lo trae en un SVG con `<text>` y
 * una pila de fuentes del sistema, así que se vería con Inter en un equipo y
 * con Helvetica en otro. La cabecera lo escribe con la fuente real del sitio
 * (`font-unbounded`), que es lo correcto hasta que ese SVG esté con el texto
 * convertido a curvas.
 *
 * Geometría y colores calcados de `public/tcpro-icono-512.svg`. Este fichero
 * es la ÚNICA copia: los indicadores importan `Velas`/`Monograma` en vez de
 * repetir las coordenadas, porque dos copias de un logotipo divergen a la
 * primera corrección.
 */

/** Verde de las velas del icono. No es el verde de P&L (`--long`): aquel
 *  significa «ganancia» y éste es identidad de marca. No los mezcles. */
export const VERDE_VELA = '#17CF63';

/** Lienzo completo del icono, con su cuadrado redondeado. */
export const MARCA_VIEWBOX = '0 0 512 512';

/** Recorte ceñido a las tres velas, en las coordenadas ya escaladas del
 *  monograma. Es el que usan los indicadores pequeños: a 16 px el monograma
 *  entero no se lee y las velas sí. */
export const VELAS_VIEWBOX = '81 15 39 52';

/** La «C» del monograma es un arco de radio 34 centrado aquí. El anillo de
 *  progreso se dibuja sobre esta misma circunferencia, así que no hay forma
 *  geométrica nueva en toda la familia de indicadores. */
export const ARCO = { cx: 105, cy: 42, r: 34, grosor: 16 };

/** Recorte ceñido al arco, para el anillo de progreso. */
export const ARCO_VIEWBOX = '63 0 84 84';

/** Las tres velas ascendentes, en las coordenadas internas del monograma
 *  (las del grupo `translate(56.3,123.9) scale(3.1446)` del SVG original). */
export const VELAS = [
  { mecha: { x: 87, y: 33, w: 2.5, h: 32 }, cuerpo: { x: 83, y: 39, w: 9, h: 21 } },
  { mecha: { x: 100, y: 26, w: 2.5, h: 33 }, cuerpo: { x: 96, y: 32, w: 9, h: 22 } },
  { mecha: { x: 113, y: 17, w: 2.5, h: 36 }, cuerpo: { x: 109, y: 24, w: 9, h: 24 } },
];

/**
 * Las tres velas sueltas.
 *
 * `base` es el prefijo de clase que lleva la animación: las velas 2ª y 3ª
 * reciben además `${base}--2` y `${base}--3`, que es donde vive el desfase
 * que las hace imprimirse por turno en vez de a la vez.
 */
export function Velas({ fill = VERDE_VELA, base }) {
  return VELAS.map(({ mecha, cuerpo }, i) => (
    <g key={i} fill={fill} className={base && (i === 0 ? base : `${base} ${base}--${i + 1}`)}>
      <rect x={mecha.x} y={mecha.y} width={mecha.w} height={mecha.h} />
      <rect x={cuerpo.x} y={cuerpo.y} width={cuerpo.w} height={cuerpo.h} />
    </g>
  ));
}

/**
 * El monograma completo dentro de su cuadrado: la «T» inclinada, la «C» —que
 * es un arco de 34 de radio— y las tres velas.
 */
export function Monograma({ baseVelas }) {
  return (
    <>
      <rect x="1.5" y="1.5" width="509" height="509" rx="120.3" fill="#0F0F0F" stroke="#262626" strokeWidth="3" />
      <g transform="translate(56.3,123.9) scale(3.1446)">
        <polygon points="8,7 60,7 60,23 0,23" fill="#F2F2F2" />
        <rect x="24" y="23" width="16" height="54" fill="#F2F2F2" />
        <path d="M105 14 A 34 34 0 1 0 105 70" fill="none" stroke="#F2F2F2" strokeWidth="16" />
        <Velas base={baseVelas} />
      </g>
    </>
  );
}

export default function BrandMark({ className = 'w-9 h-9', title = 'TradingCalculator.pro' }) {
  return (
    <svg
      viewBox={MARCA_VIEWBOX}
      // `tc-marca-viva` sólo arma el hover: al pasar el ratón por el logotipo,
      // o al llegar con el tabulador, las velas se reimprimen UNA vez (780 ms).
      // En reposo no se mueve nada — una cabecera que late permanentemente se
      // convierte en ruido a los diez segundos.
      className={`tc-marca-viva ${className}`}
      role="img"
      aria-label={title}
      focusable="false"
    >
      <title>{title}</title>
      <Monograma baseVelas="tc-v" />
    </svg>
  );
}
