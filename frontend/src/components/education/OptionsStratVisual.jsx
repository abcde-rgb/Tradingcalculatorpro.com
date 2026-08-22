import React from 'react';
import { C, Ejes, Frame, Line, Marca, T, Zona } from './figuras';

/**
 * El diagrama de pago de cada estrategia, que es su DEFINICIÓN.
 *
 * Un iron condor descrito sólo con palabras no se distingue de un butterfly:
 * las dos son «vendes en el medio y compras en los extremos». Lo que las separa
 * es la forma, y la forma no cabe en un párrafo. De todos los huecos de la
 * academia éste era el más claro — aquí la figura no ilustra el texto, lo
 * sustituye.
 *
 * Convención de lectura, la misma en las siete:
 *   · eje horizontal  precio del subyacente al vencimiento
 *   · línea gruesa    el resultado de la posición
 *   · verde / rojo    zona de beneficio / de pérdida
 *   · punto naranja   punto de equilibrio (donde la línea cruza el cero)
 *   · vertical `K`    el strike (K1, K2… cuando hay varios)
 *
 * Sin texto traducible: los rótulos son K, +, − y símbolos. La academia se
 * sirve en diez idiomas y los componentes antiguos hornean español dentro del
 * SVG, que es un fallo que ningún verificador ve porque no pasa por `t()`.
 */

const CERO = 60;   // el eje de resultado nulo
const TOPE = 22;   // techo de beneficio dibujable
const SUELO = 98;  // suelo de pérdida dibujable

/** El cero, punteado, para que «por encima gano / por debajo pierdo» se lea. */
const Cero = () => <Line pts={`20,${CERO} 228,${CERO}`} c={C.mut} w={1} dash="3 3" />;

/** Punto de equilibrio. */
const BE = ({ x }) => <circle cx={x} cy={CERO} r="2.6" fill={C.hot} />;

const VISUALS = {
  // ── Covered call: acción larga + call vendida. Techo arriba ──────────
  coveredcall: (
    <Frame label="covered call: beneficio limitado por arriba, pérdida abierta por abajo">
      <Ejes y0={SUELO} />
      <Cero />
      <Zona x={96} y={TOPE} w={132} h={CERO - TOPE} c={C.up} />
      <Zona x={20} y={CERO} w={76} h={SUELO - CERO} c={C.down} />
      <Line pts={`24,${SUELO} 96,${CERO} 150,34 228,34`} c={C.neut} />
      <BE x={96} />
      <Marca x={150} y1={26} y2={SUELO} />
      <T x={150} y={110} textAnchor="middle" fill={C.hot}>K</T>
      <T x={196} y={30} textAnchor="middle" fill={C.up}>+ máx</T>
    </Frame>
  ),

  // ── Cash-secured put: cobras la prima, te pueden asignar ────────────
  cashput: (
    <Frame label="cash-secured put: prima limitada arriba, asignación por debajo del strike">
      <Ejes y0={SUELO} />
      <Cero />
      <Zona x={112} y={TOPE} w={116} h={CERO - TOPE} c={C.up} />
      <Zona x={20} y={CERO} w={92} h={SUELO - CERO} c={C.down} />
      <Line pts={`24,${SUELO} 90,48 112,42 228,42`} c={C.neut} />
      <BE x={104} />
      <Marca x={90} y1={34} y2={SUELO} />
      <T x={90} y={110} textAnchor="middle" fill={C.hot}>K</T>
      <T x={190} y={38} textAnchor="middle" fill={C.up}>+ prima</T>
    </Frame>
  ),

  // ── Spread alcista: las dos puntas acotadas ─────────────────────────
  bullspread: (
    <Frame label="spread alcista: beneficio y pérdida acotados">
      <Ejes y0={SUELO} />
      <Cero />
      <Zona x={132} y={TOPE} w={96} h={CERO - TOPE} c={C.up} />
      <Zona x={20} y={CERO} w={112} h={SUELO - CERO} c={C.down} />
      <Line pts={`24,86 96,86 168,34 228,34`} c={C.neut} />
      <BE x={132} />
      <Marca x={96} y1={26} y2={SUELO} />
      <Marca x={168} y1={26} y2={SUELO} />
      <T x={96} y={110} textAnchor="middle" fill={C.hot}>K1</T>
      <T x={168} y={110} textAnchor="middle" fill={C.hot}>K2</T>
    </Frame>
  ),

  // ── Spread bajista: el espejo ───────────────────────────────────────
  bearspread: (
    <Frame label="spread bajista: el espejo del alcista">
      <Ejes y0={SUELO} />
      <Cero />
      <Zona x={20} y={TOPE} w={96} h={CERO - TOPE} c={C.up} />
      <Zona x={116} y={CERO} w={112} h={SUELO - CERO} c={C.down} />
      <Line pts={`24,34 84,34 156,86 228,86`} c={C.neut} />
      <BE x={116} />
      <Marca x={84} y1={26} y2={SUELO} />
      <Marca x={156} y1={26} y2={SUELO} />
      <T x={84} y={110} textAnchor="middle" fill={C.hot}>K1</T>
      <T x={156} y={110} textAnchor="middle" fill={C.hot}>K2</T>
    </Frame>
  ),

  // ── Iron condor: MESETA entre los dos strikes vendidos ──────────────
  // La diferencia con el butterfly está aquí y sólo aquí: el condor tiene
  // meseta, el butterfly tiene pico. En prosa las dos frases son iguales.
  ironcondor: (
    <Frame label="iron condor: meseta de beneficio entre los dos strikes vendidos">
      <Ejes y0={SUELO} />
      <Cero />
      <Zona x={78} y={TOPE} w={92} h={CERO - TOPE} c={C.up} />
      <Zona x={20} y={CERO} w={58} h={SUELO - CERO} c={C.down} />
      <Zona x={170} y={CERO} w={58} h={SUELO - CERO} c={C.down} />
      <Line pts={`24,84 56,84 92,36 156,36 192,84 228,84`} c={C.neut} />
      <BE x={78} />
      <BE x={170} />
      <T x={124} y={30} textAnchor="middle" fill={C.up}>+ máx (meseta)</T>
      <T x={40} y={78} fill={C.down}>−</T>
      <T x={210} y={78} fill={C.down}>−</T>
    </Frame>
  ),

  // ── Straddle: la V. Gana si se mueve, da igual hacia dónde ──────────
  straddle: (
    <Frame label="straddle: uve, gana con el movimiento en cualquier sentido">
      <Ejes y0={SUELO} />
      <Cero />
      <Zona x={20} y={TOPE} w={52} h={CERO - TOPE} c={C.up} />
      <Zona x={176} y={TOPE} w={52} h={CERO - TOPE} c={C.up} />
      <Zona x={72} y={CERO} w={104} h={SUELO - CERO} c={C.down} />
      <Line pts={`24,28 124,88 228,28`} c={C.neut} />
      <BE x={72} />
      <BE x={176} />
      <Marca x={124} y1={26} y2={SUELO} />
      <T x={124} y={110} textAnchor="middle" fill={C.hot}>K</T>
      <T x={124} y={80} textAnchor="middle" fill={C.down}>− máx</T>
    </Frame>
  ),

  // ── Put protectora: el seguro. Suelo plano por abajo ────────────────
  protectiveput: (
    <Frame label="put protectora: suelo plano de pérdida, subida abierta">
      <Ejes y0={SUELO} />
      <Cero />
      <Zona x={146} y={TOPE} w={82} h={CERO - TOPE} c={C.up} />
      <Zona x={20} y={CERO} w={126} h={SUELO - CERO} c={C.down} />
      <Line pts={`24,84 100,84 146,${CERO} 228,26`} c={C.neut} />
      <BE x={146} />
      <Marca x={100} y1={26} y2={SUELO} />
      <T x={100} y={110} textAnchor="middle" fill={C.hot}>K</T>
      <T x={46} y={78} fill={C.down}>− máx (suelo)</T>
    </Frame>
  ),
};

export default function OptionsStratVisual({ id }) {
  const fig = VISUALS[id];
  if (!fig) return null;
  return (
    <div className="mt-3" data-testid={`payoff-fig-${id}`}>
      {fig}
    </div>
  );
}
