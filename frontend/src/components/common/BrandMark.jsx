/**
 * Monograma de marca (TC + velas), en línea.
 *
 * ⚠️ Este archivo es la FUENTE de la geometría de la marca. `BrandLoading.jsx`
 * importa de aquí las coordenadas de las velas y el arco de la «C» en vez de
 * copiarlas: dos copias de un logotipo divergen a la primera corrección, y
 * entonces el indicador de carga deja de ser el logotipo y pasa a ser algo que
 * se le parece.
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
 * Geometría y colores calcados de `public/tcpro-icono-512.svg`.
 */
export const TINTA_MARCA = '#F2F2F2';
export const VERDE_MARCA = '#17CF63';

/** El arco de la «C», y la caja que lo centra para poder girarlo sobre su eje. */
export const ARCO_C = 'M105 14 A 34 34 0 1 0 105 70';
export const CAJA_ARCO = '63 0 84 84';

/** Las tres velas ascendentes: mecha y cuerpo de cada una. */
export const VELAS_MARCA = [
  { mecha: { x: 87, y: 33, w: 2.5, h: 32 }, cuerpo: { x: 83, y: 39, w: 9, h: 21 } },
  { mecha: { x: 100, y: 26, w: 2.5, h: 33 }, cuerpo: { x: 96, y: 32, w: 9, h: 22 } },
  { mecha: { x: 113, y: 17, w: 2.5, h: 36 }, cuerpo: { x: 109, y: 24, w: 9, h: 24 } },
];

/** La caja justa de las tres velas: x de 83 a 118, y de 17 a 65, con un pelo de aire. */
export const CAJA_VELAS = '81 15 39 52';

/**
 * Las tres velas. `clase` permite animarlas desde fuera sin duplicar la
 * geometría — es lo que usan los indicadores de carga.
 */
export function VelasMarca({ clase, color = VERDE_MARCA }) {
  return VELAS_MARCA.map((v, i) => (
    <g key={i} className={clase ? `${clase} ${clase}--${i + 1}` : undefined} fill={color}>
      <rect x={v.mecha.x} y={v.mecha.y} width={v.mecha.w} height={v.mecha.h} />
      <rect x={v.cuerpo.x} y={v.cuerpo.y} width={v.cuerpo.w} height={v.cuerpo.h} />
    </g>
  ));
}

/**
 * @param {boolean} interactivo  Al pasar el ratón (o al recibir foco de
 *   teclado), las tres velas vuelven a imprimirse de izquierda a derecha. Una
 *   sola vez, 780 ms, y sólo el logotipo se mueve. Es la única animación de
 *   hover de toda la cabecera a propósito: si reacciona todo, no destaca nada.
 */
export default function BrandMark({ className = 'w-9 h-9', title = 'TradingCalculator.pro', interactivo = false }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={interactivo ? `${className} tc-marca-viva` : className}
      role="img"
      aria-label={title}
      focusable="false"
    >
      <title>{title}</title>
      <rect x="1.5" y="1.5" width="509" height="509" rx="120.3" fill="#0F0F0F" stroke="#262626" strokeWidth="3" />
      <g transform="translate(56.3,123.9) scale(3.1446)">
        <polygon points="8,7 60,7 60,23 0,23" fill={TINTA_MARCA} />
        <rect x="24" y="23" width="16" height="54" fill={TINTA_MARCA} />
        <path d={ARCO_C} fill="none" stroke={TINTA_MARCA} strokeWidth="16" />
        <VelasMarca clase="tc-v" />
      </g>
    </svg>
  );
}
