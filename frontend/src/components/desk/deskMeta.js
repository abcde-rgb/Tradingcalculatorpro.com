/**
 * Etiquetas y adornos de la mesa de cálculo.
 *
 * Vive aparte de `deskMath.js` por el mismo motivo que `productMeta.js` vive
 * aparte de `instruments.js`: allí está la aritmética, que se comprueba con
 * números; aquí sólo está cómo se llama cada cosa en pantalla y en los diez
 * idiomas.
 */
import { Lock, Layers3 } from 'lucide-react';

export const MARGIN_MODE_META = {
  isolated: {
    labelKey: 'deskMarginIsolated',
    hintKey: 'deskMarginIsolatedHint',
    icon: Lock,
  },
  cross: {
    labelKey: 'deskMarginCross',
    hintKey: 'deskMarginCrossHint',
    icon: Layers3,
  },
};

/** Qué tope ha decidido el tamaño. El motivo es la mitad de la respuesta. */
export const BINDING_META = {
  risk:      { labelKey: 'deskBindingRisk',      tone: 'ok' },
  margin:    { labelKey: 'deskBindingMargin',    tone: 'warn' },
  exposure:  { labelKey: 'deskBindingExposure',  tone: 'warn' },
};

/**
 * Los cuatro contratos sueltos de opciones, en el orden en que se aprenden.
 *
 * No son estrategias nuevas: son cuatro de las 66 del catálogo, y se listan
 * aparte porque el 90 % de quien abre el selector viene a por una de ellas y no
 * a buscarla entre sesenta y seis tarjetas. La lista sale de los `id` reales
 * del catálogo, así que si alguna se renombra aquí deja de aparecer en el grupo
 * (y sigue estando en su categoría), en vez de duplicarse.
 */
export const SINGLE_LEG_IDS = ['long_call', 'long_put', 'short_call', 'short_put'];

/**
 * Qué significa comprar y qué significa vender, según el tipo de opción.
 *
 * Aquí es donde se aclara la confusión que hace perder dinero: "comprar" no es
 * alcista y "vender" no es bajista. Lo que orienta la posición es el par
 * (acción, tipo):
 *
 *   comprar call → alcista, riesgo limitado a la prima
 *   vender  call → bajista/neutral, pérdida SIN TECHO si va desnuda
 *   comprar put  → bajista, riesgo limitado a la prima
 *   vender  put  → alcista/neutral, pérdida hasta el strike menos la prima
 *
 * Las dos filas de la derecha son las que sorprenden: vender es cobrar hoy a
 * cambio de una obligación, y por eso el riesgo no lo marca lo que pagaste.
 */
export const OPTION_DIRECTION = {
  buy_call:  { biasKey: 'deskOptBiasBullish', riskKey: 'deskOptRiskPremium',  defined: true,  tone: 'up' },
  sell_call: { biasKey: 'deskOptBiasBearish', riskKey: 'deskOptRiskUnlimited', defined: false, tone: 'down' },
  buy_put:   { biasKey: 'deskOptBiasBearish', riskKey: 'deskOptRiskPremium',  defined: true,  tone: 'down' },
  sell_put:  { biasKey: 'deskOptBiasBullish', riskKey: 'deskOptRiskStrike',   defined: false, tone: 'up' },
};

export const optionDirection = (action, type) => OPTION_DIRECTION[`${action}_${type}`] || null;

/**
 * El sesgo de una estructura completa a partir de sus patas.
 *
 * Se deriva de la categoría del catálogo, que ya está revisada, en lugar de
 * recalcularla sumando deltas aproximadas: una delta inventada para pintar una
 * etiqueta es exactamente el tipo de número que este proyecto no publica.
 */
export const CATEGORY_TONE = {
  Bullish: 'up',
  Bearish: 'down',
  Neutral: 'flat',
  Volatile: 'vol',
};

/**
 * Las mismas etiquetas que usa el selector de `/options` (`StrategyBar`). Se
 * reutilizan las claves que ya existen en los diez idiomas en vez de estrenar
 * otras cuatro: dos juegos de traducciones para "Alcistas" acaban divergiendo.
 */
export const CATEGORY_LABEL_KEY = {
  Bullish: 'filterBullish',
  Bearish: 'filterBearish',
  Neutral: 'filterNeutral',
  Volatile: 'filterVolatile',
};
