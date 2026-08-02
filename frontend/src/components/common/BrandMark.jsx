/**
 * Monograma de marca (TC + velas), en línea.
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
export default function BrandMark({ className = 'w-9 h-9', title = 'TradingCalculator.pro' }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label={title}
      focusable="false"
    >
      <title>{title}</title>
      <rect x="1.5" y="1.5" width="509" height="509" rx="120.3" fill="#0F0F0F" stroke="#262626" strokeWidth="3" />
      <g transform="translate(56.3,123.9) scale(3.1446)">
        <polygon points="8,7 60,7 60,23 0,23" fill="#F2F2F2" />
        <rect x="24" y="23" width="16" height="54" fill="#F2F2F2" />
        <path d="M105 14 A 34 34 0 1 0 105 70" fill="none" stroke="#F2F2F2" strokeWidth="16" />
        <rect x="87" y="33" width="2.5" height="32" fill="#17CF63" />
        <rect x="83" y="39" width="9" height="21" fill="#17CF63" />
        <rect x="100" y="26" width="2.5" height="33" fill="#17CF63" />
        <rect x="96" y="32" width="9" height="22" fill="#17CF63" />
        <rect x="113" y="17" width="2.5" height="36" fill="#17CF63" />
        <rect x="109" y="24" width="9" height="24" fill="#17CF63" />
      </g>
    </svg>
  );
}
