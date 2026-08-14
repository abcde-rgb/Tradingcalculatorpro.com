/**
 * optionSides.js — qué significa comprar y qué significa vender, según el tipo.
 *
 * Existe porque el verde y el rojo mentían. En acciones, comprar es apostar a
 * que sube y vender a que baja, así que pintar BUY de verde y SELL de rojo
 * funciona. **En opciones no**: lo que orienta la posición es la pareja
 * (acción, tipo), y dos de las cuatro combinaciones salen al revés de lo que
 * sugiere el color de una tabla de acciones.
 *
 *   comprar call → ALCISTA · riesgo limitado a la prima
 *   vender  call → BAJISTA · pérdida SIN TECHO si va desnuda
 *   comprar put  → BAJISTA · riesgo limitado a la prima
 *   vender  put  → ALCISTA · pérdida hasta el strike menos la prima
 *
 * Las dos filas de vender son las que sorprenden y las que cuestan dinero:
 * vender es cobrar hoy a cambio de una obligación, así que lo que puedes
 * perder **no lo marca lo que pagaste**. Por eso el color va por la DIRECCIÓN
 * (`tone`) y el aviso de riesgo abierto va por `defined: false`, y no por si
 * la acción es comprar o vender.
 *
 * Lo usan el selector de la mesa (`components/desk/`) y el constructor de
 * patas del panel de opciones (`components/options/LegEditor.jsx`): un solo
 * sitio para una regla que ya se pintaba mal en uno de los dos.
 */
export const OPTION_DIRECTION = {
  buy_call:  { biasKey: 'deskOptBiasBullish', riskKey: 'deskOptRiskPremium',   defined: true,  tone: 'up' },
  sell_call: { biasKey: 'deskOptBiasBearish', riskKey: 'deskOptRiskUnlimited', defined: false, tone: 'down' },
  buy_put:   { biasKey: 'deskOptBiasBearish', riskKey: 'deskOptRiskPremium',   defined: true,  tone: 'down' },
  sell_put:  { biasKey: 'deskOptBiasBullish', riskKey: 'deskOptRiskStrike',    defined: false, tone: 'up' },
};

/** `null` para lo que no es una opción (una pata de acciones, por ejemplo). */
export function optionDirection(action, type) {
  return OPTION_DIRECTION[`${action}_${type}`] || null;
}

/**
 * Clases de color por dirección. Verde = alcista, rojo = bajista — **da igual
 * si se compra o se vende**, que es justo la corrección.
 */
export const DIRECTION_CLASSES = {
  up:   { border: 'border-[#22c55e]/20', bg: 'bg-[#22c55e]/[0.03]', text: 'text-[#4ade80]', chip: 'bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/40' },
  down: { border: 'border-[#ef4444]/20', bg: 'bg-[#ef4444]/[0.03]', text: 'text-[#f87171]', chip: 'bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/40' },
};

/**
 * Lo que se paga o se cobra por la pata. Es lo que de verdad distingue comprar
 * de vender, y por eso el interruptor BUY/SELL se etiqueta con esto en lugar
 * de con un color direccional que ya no le corresponde.
 */
export const flowKey = (action) => (action === 'buy' ? 'optLegDebit' : 'optLegCredit');
