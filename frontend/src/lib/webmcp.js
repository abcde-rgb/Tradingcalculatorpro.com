/**
 * webmcp.js — expone herramientas de cálculo a agentes de IA en el navegador
 * vía `navigator.modelContext` (WebMCP, W3C Web Machine Learning Community
 * Group, origin trial desde Chrome 149).
 *
 * En vez de que un agente interprete la pantalla a base de píxeles y clics,
 * el sitio publica funciones tipadas con su JSON Schema: el agente llama a
 * `calcular_tamano_posicion` con números y recibe números, sin pasar por el
 * DOM. La API es experimental — no existe en la mayoría de navegadores
 * todavía — así que todo aquí se degrada a un no-op si `navigator.modelContext`
 * no está.
 *
 * SÓLO se exponen aquí las 14 calculadoras sueltas cuya aritmética YA es la
 * de la mesa (`deskMath.js` + `instruments.js`, la fuente verificada y con
 * `engine-check`). Las calculadoras sueltas del modo básico (`LotSizeCalculator`,
 * `PositionSizeCalculator`…) siguen teniendo su propia matemática incorrecta
 * (G-33 — 10 $/pip fijo, símbolo pintado a mano) y NO se exponen como tool:
 * darle a un agente un número mal calculado con apariencia de API oficial es
 * peor que no dársela, porque el agente confía en la respuesta sin verla.
 *
 * Nada de lo que hay aquí toca red, cuenta ni el diario: son las mismas
 * funciones puras que ya corren en el navegador para pintar la mesa.
 */
// Imports relativos (no el alias `@/`) a propósito: así `engine-check.js`
// puede importar este módulo con `import()` de Node puro, igual que ya hace
// con `deskMath.js`/`instruments.js`/`crossMargin.js`.
import {
  resolveSpec, contractSizeFor, positionMetrics, SELECTABLE_PRODUCTS,
} from './instruments.js';
import { riskBudget, maxSizes, pipValue } from './deskMath.js';

const DISCLAIMER = 'Contenido informativo, no es asesoramiento financiero. Operar conlleva riesgo de pérdida.';

// Productos con motor de aritmética correcto y verificado en `deskMath.js`/
// `instruments.js`. 'option' se excluye a propósito: una pata suelta no es la
// pérdida máxima de una estructura (G-34), y publicarlo como tool induciría a
// un agente a confiar en un número que no representa el riesgo real.
const TOOL_PRODUCTS = SELECTABLE_PRODUCTS.filter((p) => p !== 'option');

function round(n, decimals = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function textResult(text, data) {
  return { content: [{ type: 'text', text }], structuredContent: data };
}

export function calcularTamanoPosicion({
  producto, simbolo, capital, entrada, stop, objetivo,
  riesgo_porcentaje: riskPct, riesgo_dinero: riskMoney,
  lado: side = 'long', apalancamiento,
}) {
  const spec = resolveSpec(producto, simbolo);
  const contractSize = contractSizeFor(producto, simbolo, {});
  const leverage = apalancamiento ?? (spec.usesLeverage ? spec.defaultLeverage : 1);

  // Futuros no tiene apalancamiento por defecto (varía por contrato y bróker,
  // no por producto): calcular con un 1x inventado daría un margen y un tope
  // por margen que no significan nada. Es lo indefinido de verdad, no un 0.
  if (spec.usesLeverage && leverage == null) {
    return textResult(
      `"${producto}" no tiene un apalancamiento por defecto: indica "apalancamiento" explícitamente para calcular el margen.`,
      { blocked: true, reason: 'no_default_leverage' },
    );
  }

  const budget = riskBudget({
    capital,
    riskPct: riskMoney == null ? (riskPct ?? 1) : undefined,
    riskMoney: riskMoney ?? undefined,
    mode: riskMoney == null ? 'pct' : 'money',
  });
  if (budget.blocked) {
    const reason = budget.reason === 'over_cap'
      ? `El riesgo pedido (${round(budget.pct)} %) supera el tope duro del ${budget.capPct} % por operación.`
      : 'Faltan datos: capital o riesgo no son válidos.';
    return textResult(`No se puede dimensionar: ${reason}`, { blocked: true, reason: budget.reason });
  }

  const stopDistance = Math.abs(entrada - stop);
  const sizes = maxSizes({
    entry: entrada, stopDistance, contractSize, riskAmount: budget.amount, capital, leverage, spec,
  });
  if (sizes.quantity === null) {
    return textResult(
      'El capital y el riesgo asumido no llegan ni al tamaño mínimo negociable de este instrumento.',
      { blocked: true, reason: 'below_min_step' },
    );
  }

  const metrics = positionMetrics({
    entry: entrada, quantity: sizes.quantity, contractSize, leverage, balance: capital,
    side, sl: stop, tp: objetivo ?? undefined, spec,
  });

  const bindingLabel = { risk: 'el riesgo asumido', margin: 'el margen disponible', exposure: 'el tope de exposición' }[sizes.binding];
  const parts = [
    `Tamaño: ${sizes.quantity} unidades/contratos (limitado por ${bindingLabel}).`,
    `Nocional: ${round(metrics.notional)}. Margen usado: ${metrics.marginUsed !== null ? round(metrics.marginUsed) : 'no aplica (sin apalancamiento)'}.`,
    `Riesgo: ${metrics.riskAmount !== null ? round(metrics.riskAmount) : '—'} (${metrics.riskPctBalance !== null ? round(metrics.riskPctBalance) + ' % de la cuenta' : ''}).`,
  ];
  if (metrics.rr !== null) parts.push(`Ratio riesgo/beneficio: ${round(metrics.rr, 2)}:1${metrics.rrBelowFloor ? ' (por debajo del mínimo recomendado)' : ''}.`);
  if (metrics.liquidationPrice !== null) parts.push(`Precio de liquidación estimado (margen aislado): ${round(metrics.liquidationPrice)}.`);
  if (!spec.known) parts.push(`Aviso: "${simbolo}" no está en el catálogo verificado de ${producto}; el tamaño de contrato usado es el genérico del producto, no el específico del símbolo.`);
  parts.push(DISCLAIMER);

  return textResult(parts.join(' '), {
    quantity: sizes.quantity, binding: sizes.binding, notional: round(metrics.notional),
    marginUsed: round(metrics.marginUsed), riskAmount: round(metrics.riskAmount),
    riskPctBalance: round(metrics.riskPctBalance), rr: round(metrics.rr, 2),
    liquidationPrice: round(metrics.liquidationPrice), instrumentKnown: spec.known,
  });
}

export function calcularValorPip({ producto, simbolo, cantidad, precio, divisa_cuenta: account = 'USD' }) {
  const spec = resolveSpec(producto, simbolo);
  const contractSize = contractSizeFor(producto, simbolo, {});
  const v = pipValue({ quantity: cantidad, contractSize, spec, price: precio, account });

  if (v.step === null) {
    return textResult(`"${simbolo}" no tiene pip/tick definido para ${producto}: revisa el símbolo o el producto.`, { blocked: true });
  }
  const text = v.account !== null
    ? `1 pip/tick de ${cantidad} en ${simbolo} vale ${round(v.quote)} ${v.quoteCurrency} (${round(v.account)} ${account}). ${DISCLAIMER}`
    : `1 pip/tick de ${cantidad} en ${simbolo} vale ${round(v.quote)} ${v.quoteCurrency}. No se pudo convertir a ${account}: falta el tipo de cambio. ${DISCLAIMER}`;
  return textResult(text, {
    step: v.step, quoteValue: round(v.quote), quoteCurrency: v.quoteCurrency, accountValue: round(v.account),
  });
}

let registered = false;

/** Se llama una vez al arrancar la app. No-op si el navegador no soporta WebMCP. */
export function registerWebMcpTools() {
  if (registered) return;
  if (typeof navigator === 'undefined' || !navigator.modelContext || typeof navigator.modelContext.registerTool !== 'function') return;
  registered = true;

  try {
    navigator.modelContext.registerTool({
      name: 'calcular_tamano_posicion',
      description: 'Calcula cuántas unidades/contratos operar según el capital, el riesgo asumido y la distancia al stop, con el margen, el nocional, el ratio riesgo/beneficio y la liquidación estimada. TradingCalculator.Pro, contenido educativo.',
      inputSchema: {
        type: 'object',
        properties: {
          producto: { type: 'string', enum: TOOL_PRODUCTS, description: 'Tipo de instrumento.' },
          simbolo: { type: 'string', description: 'Símbolo, p. ej. EURUSD, ES, AAPL, BTCUSDT.' },
          capital: { type: 'number', exclusiveMinimum: 0, description: 'Capital total de la cuenta.' },
          entrada: { type: 'number', description: 'Precio de entrada.' },
          stop: { type: 'number', description: 'Precio del stop-loss.' },
          objetivo: { type: 'number', description: 'Precio objetivo (take-profit), opcional.' },
          riesgo_porcentaje: { type: 'number', minimum: 0, maximum: 10, description: 'Porcentaje del capital a arriesgar (por defecto 1). Tope duro: 10.' },
          riesgo_dinero: { type: 'number', exclusiveMinimum: 0, description: 'Riesgo en dinero, alternativa a riesgo_porcentaje.' },
          lado: { type: 'string', enum: ['long', 'short'], description: 'Dirección de la operación (por defecto long).' },
          apalancamiento: { type: 'number', exclusiveMinimum: 0, description: 'Apalancamiento. Si se omite, se usa el estándar del instrumento.' },
        },
        required: ['producto', 'simbolo', 'capital', 'entrada', 'stop'],
      },
      async execute(args) { return calcularTamanoPosicion(args); },
    });

    navigator.modelContext.registerTool({
      name: 'calcular_valor_pip',
      description: 'Calcula cuánto vale un pip o un tick de una cantidad dada de un instrumento, en su divisa cotizada y convertido a la divisa de la cuenta. TradingCalculator.Pro, contenido educativo.',
      inputSchema: {
        type: 'object',
        properties: {
          producto: { type: 'string', enum: TOOL_PRODUCTS },
          simbolo: { type: 'string', description: 'Símbolo, p. ej. EURUSD, ES, XAUUSD.' },
          cantidad: { type: 'number', exclusiveMinimum: 0, description: 'Unidades/lotes/contratos.' },
          precio: { type: 'number', exclusiveMinimum: 0, description: 'Precio actual, para la conversión de divisa.' },
          divisa_cuenta: { type: 'string', description: 'Divisa de la cuenta (por defecto USD).' },
        },
        required: ['producto', 'simbolo', 'cantidad', 'precio'],
      },
      async execute(args) { return calcularValorPip(args); },
    });
  } catch (err) {
    // API experimental: si el navegador la declara pero la llamada falla
    // (forma en evolución del origin trial), no debe tumbar el arranque de la app.
    console.error('[webmcp] registro de herramientas falló:', err);
  }
}
