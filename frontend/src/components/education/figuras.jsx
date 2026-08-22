import React from 'react';

/**
 * Primitivas compartidas para las figuras de la academia.
 *
 * POR QUÉ EXISTE ESTE FICHERO
 * ---------------------------
 * 38 de los 79 componentes visuales repetían `Frame` y `Line` copiados y
 * pegados; al menos seis eran idénticos byte a byte. Añadir figuras nuevas sin
 * extraer esto llevaba la copia a 55, y entonces cambiar el grosor de una línea
 * —o un color que no funciona en oscuro— son 55 ediciones.
 *
 * Los 38 viejos NO se migran aquí de golpe: funcionan, y una migración masiva
 * de SVG es justo el cambio que rompe cosas sin que ningún test lo vea. Lo
 * nuevo nace encima; lo viejo se migra cuando se toque por otra razón.
 *
 * DOS DECISIONES DE DISEÑO
 * ------------------------
 * 1. **Sin texto traducible dentro del SVG, siempre que se pueda.** Los
 *    componentes existentes hornean español (`resistencia`, `tendencia
 *    alcista`) en figuras que se sirven en diez idiomas: un lector japonés ve
 *    la etiqueta en español y no hay verificador que lo cace, porque el texto
 *    no pasa por `t()`. Las figuras nuevas usan símbolos que no se traducen
 *    —Δ, Γ, Θ, K, +, −, flechas— y dejan la explicación al texto del apartado,
 *    que sí está traducido. Cuando no hay símbolo posible, la etiqueta llega
 *    por prop desde el componente, que sí puede llamar a `t()`.
 *
 * 2. **El color va por token del tema, no por hexadecimal suelto**, salvo la
 *    paleta semántica de abajo, que es la misma que usan los 38 existentes y
 *    que se mantiene para que una pantalla con figuras viejas y nuevas no se
 *    vea de dos colores distintos.
 */

// La paleta semántica que ya usan los componentes existentes. No se inventa
// una nueva: mezclar dos paletas en la misma pantalla se nota.
export const C = {
  up: '#22c55e',     // alcista · beneficio · lo que sí está medido
  down: '#ef4444',   // bajista · pérdida · el riesgo
  neut: '#60a5fa',   // neutral · rango · la serie de referencia
  hot: '#f59e0b',    // el evento que importa: ruptura, strike, liquidación
  mut: '#94a3b8',    // contexto, ejes, todo lo que no debe robar atención
};

/**
 * El lienzo. `alto` en clases de Tailwind para que el llamante decida cuánto
 * ocupa sin tocar el viewBox.
 *
 * `aria-label` es obligatorio y no tiene valor por defecto a propósito: una
 * figura sin nombre accesible es invisible para un lector de pantalla, y poner
 * un genérico («figura») sería peor, porque parecería resuelto.
 */
export const Frame = ({ children, label, vb = '0 0 240 118', alto = 'h-auto' }) => (
  // `h-auto` y no una altura fija: con `viewBox` + `width:100%`, dejar que el
  // navegador calcule el alto hace que la figura ocupe TODO el ancho de la
  // tarjeta con su proporción intacta. Con `h-28` fija, `preserveAspectRatio`
  // encajaba el dibujo dentro de 112 px de alto y dejaba dos franjas muertas a
  // los lados: la figura se veía pequeña y centrada en una caja el doble de
  // ancha, que es peor de leer y parece un fallo de maquetación.
  <svg viewBox={vb} className={`w-full ${alto}`} role="img" aria-label={label}
       preserveAspectRatio="xMidYMid meet">
    {children}
  </svg>
);

/** Texto dentro del SVG. Monoespaciado y pequeño: son etiquetas, no prosa. */
export const T = (p) => <text fontSize="8" fontFamily="monospace" {...p} />;

/** Una polilínea. `pts` es la cadena de `points` de SVG tal cual. */
export const Line = ({ pts, c, w = 2, dash, cap = 'round' }) => (
  <polyline points={pts} fill="none" stroke={c} strokeWidth={w}
            strokeLinejoin="round" strokeLinecap={cap} strokeDasharray={dash} />
);

/** Una curva por `path`, para lo que no es una polilínea (campanas, sigmoides). */
export const Curva = ({ d, c, w = 2, dash, fill = 'none' }) => (
  <path d={d} fill={fill} stroke={c} strokeWidth={w} strokeLinejoin="round"
        strokeLinecap="round" strokeDasharray={dash} />
);

/** Ejes en cruz. `y0` es el cero horizontal; `x0` el vertical. */
export const Ejes = ({ x0 = 20, y0 = 96, x1 = 228, y1 = 12 }) => (
  <>
    <Line pts={`${x0},${y1} ${x0},${y0}`} c={C.mut} w={1} />
    <Line pts={`${x0},${y0} ${x1},${y0}`} c={C.mut} w={1} />
  </>
);

/** Una banda sombreada: zona de beneficio, de pérdida, rango de precio… */
export const Zona = ({ x, y, w, h, c, o = 0.16 }) => (
  <rect x={x} y={y} width={w} height={h} fill={c} opacity={o} />
);

/** Una vertical de referencia: el strike, la liquidación, el momento del dato. */
export const Marca = ({ x, y1 = 12, y2 = 96, c = C.hot, dash = '3 3' }) => (
  <Line pts={`${x},${y1} ${x},${y2}`} c={c} w={1} dash={dash} />
);

/**
 * El envoltorio de una figura dentro de una tarjeta de apartado.
 *
 * `pie` es la única cadena que se muestra y llega YA traducida desde el
 * componente que llama: aquí no se llama a `t()` para que este fichero siga
 * siendo puramente de dibujo.
 */
export const Figura = ({ children, pie, testid }) => (
  <figure className="mt-3 mb-0" data-testid={testid}>
    <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
      {children}
    </div>
    {pie ? (
      <figcaption className="mt-1 text-[10px] leading-snug text-muted-foreground">
        {pie}
      </figcaption>
    ) : null}
  </figure>
);
