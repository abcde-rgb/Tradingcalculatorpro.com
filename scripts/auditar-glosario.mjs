#!/usr/bin/env node
/* ============================================================================
   auditar-glosario.mjs — cobertura terminológica de TradingCalculator.Pro
   ----------------------------------------------------------------------------
   ¿Qué términos del inventario canónico puede BUSCAR el usuario, cuáles están
   explicados en alguna parte y cuáles se le sueltan en pantalla sin explicar?

   Uso, desde la raíz del repo:

     node scripts/auditar-glosario.mjs             # informe en pantalla
     node scripts/auditar-glosario.mjs --md        # además escribe cobertura.md
     node scripts/auditar-glosario.mjs --tier 1    # solo el nivel 1

   ----------------------------------------------------------------------------
   POR QUÉ NO CUENTA APARICIONES EN EL CÓDIGO

   La primera versión de este script recorría todo `frontend/src` contando
   subcadenas y daba 92 % de cobertura. Era mentira, por tres motivos:

     1. Contaba identificadores. `delta`, `gamma` y `theta` aparecen cientos de
        veces en `options_math` y en el motor del frontend porque son NOMBRES DE
        VARIABLE. Que el código calcule la delta no explica al usuario qué es.
     2. Contaba clases de Tailwind. `gap` salía «cubierto» por los `gap-3` del
        layout; `prima`, por `primary`; `premium`, por el muro de pago.
     3. Trataba cualquier archivo con «content» o «education» en la ruta como
        contenido, así que UNA aparición de pasada bastaba para marcar CUBIERTO.

   Este script sólo mira TEXTO QUE VE EL USUARIO (los literales de i18n y de los
   módulos de contenido) y distingue tres superficies distintas, porque son tres
   problemas distintos:

     EN GLOSARIO  hay una entrada propia: el usuario puede buscarlo
     EN PROSA     se explica dentro de la Academia, pero no es buscable
     SOLO UI      aparece en la interfaz y NO se explica en ninguna parte
     AUSENTE      no aparece

   SOLO UI es la categoría que importa: son los términos que la web usa dando
   por supuesto que el lector los conoce. Es deuda ya contraída.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';

/* --------------------------------------------------------------------------
   INVENTARIO CANÓNICO
   Construido a partir de lo que un trader necesita para usar ESTAS
   calculadoras (opciones US, forex, futuros, cripto).
   Cada entrada: [término, variantes de búsqueda]
   -------------------------------------------------------------------------- */

const INVENTARIO = {
  1: {
    'Griegas y opciones': [
      ['Delta', ['delta']],
      ['Gamma', ['gamma']],
      ['Theta', ['theta']],
      ['Vega', ['vega']],
      ['Rho', ['rho']],
      ['Volatilidad implícita', ['volatilidad implícita', 'implied volatility', 'IV']],
      ['Volatilidad realizada', ['volatilidad realizada', 'volatilidad histórica', 'realized volatility']],
      ['Valor intrínseco', ['valor intrínseco', 'intrinsic value']],
      ['Valor temporal', ['valor temporal', 'valor extrínseco', 'time value']],
      ['Strike', ['strike', 'precio de ejercicio']],
      ['ITM / ATM / OTM', ['in the money', 'at the money', 'out of the money', 'dentro del dinero', 'ITM', 'OTM']],
      ['Prima', ['prima']],
      ['Open interest', ['open interest', 'interés abierto']],
      ['Asignación', ['asignación', 'assignment']],
      ['Ejercicio temprano', ['ejercicio temprano', 'early exercise']],
      ['Paridad put-call', ['paridad put-call', 'put-call parity']],
      ['Skew de volatilidad', ['skew', 'sonrisa de volatilidad', 'volatility smile']],
      ['Superficie de volatilidad', ['superficie de volatilidad', 'volatility surface']],
      ['Volatility crush', ['volatility crush', 'colapso de volatilidad']],
      ['Black-Scholes', ['black-scholes', 'black scholes']],
      ['Modelo binomial', ['binomial']],
    ],
    'Estrategias con opciones': [
      ['Bull call spread', ['bull call', 'spread alcista']],
      ['Bear put spread', ['bear put', 'spread bajista']],
      ['Straddle', ['straddle']],
      ['Strangle', ['strangle']],
      ['Iron condor', ['iron condor', 'cóndor']],
      ['Mariposa', ['mariposa', 'butterfly']],
      ['Calendar spread', ['calendar', 'spread temporal']],
      ['Backspread', ['backspread']],
      ['Covered call', ['covered call', 'call cubierta']],
      ['Put protectora', ['put protectora', 'protective put']],
    ],
    'Riesgo y dimensionamiento': [
      ['Tamaño de posición', ['tamaño de posición', 'position size']],
      ['Múltiplo R', ['múltiplo R', 'múltiplos de R', '1R']],
      ['Ratio riesgo-beneficio', ['riesgo-beneficio', 'riesgo beneficio', 'risk reward', 'R:R', 'R/R']],
      ['Esperanza matemática', ['esperanza matemática', 'expectancy', 'valor esperado', 'expectativa']],
      ['Win rate', ['win rate', 'tasa de acierto', 'porcentaje de aciertos']],
      ['Payoff medio', ['payoff medio', 'ganancia media', 'pérdida media']],
      ['Drawdown', ['drawdown']],
      ['Drawdown máximo', ['drawdown máximo', 'max drawdown']],
      ['Criterio de Kelly', ['kelly']],
      ['ATR', ['ATR', 'average true range', 'rango verdadero medio']],
      ['Riesgo por operación', ['riesgo por operación', 'riesgo por trade']],
      ['Riesgo de cartera', ['riesgo de cartera', 'riesgo agregado', 'exposición total']],
      ['Correlación entre posiciones', ['correlación']],
      ['Ratio de Sharpe', ['sharpe']],
      ['Ratio de Sortino', ['sortino']],
      ['Profit factor', ['profit factor', 'factor de beneficio']],
    ],
    'Ejecución y microestructura': [
      ['Spread bid-ask', ['bid-ask', 'horquilla', 'diferencial de compraventa', 'spread']],
      ['Slippage', ['slippage', 'deslizamiento']],
      ['Liquidez', ['liquidez']],
      ['Profundidad de mercado', ['profundidad de mercado', 'libro de órdenes', 'order book']],
      ['Orden a mercado', ['orden a mercado', 'market order']],
      ['Orden limitada', ['orden limitada', 'orden límite', 'limit order']],
      ['Orden stop', ['orden stop', 'stop-loss', 'stop loss', 'stop de pérdidas']],
      ['Stop limitada', ['stop limitada', 'stop limit']],
      ['Trailing stop', ['trailing stop', 'stop dinámico']],
      ['Ejecución parcial', ['ejecución parcial', 'partial fill']],
      ['Costes de transacción', ['costes de transacción', 'comisión', 'comisiones', 'coste por operación']],
    ],
    'Apalancamiento y margen': [
      ['Margen inicial', ['margen inicial', 'initial margin']],
      ['Margen de mantenimiento', ['margen de mantenimiento', 'maintenance margin']],
      ['Llamada de margen', ['llamada de margen', 'margin call']],
      ['Apalancamiento', ['apalancamiento', 'leverage']],
      ['Liquidación forzosa', ['liquidación forzosa', 'liquidación automática', 'liquidación']],
      ['Coste de financiación', ['financiación overnight', 'swap', 'coste de mantener']],
    ],
    'Futuros': [
      ['Tamaño del contrato', ['tamaño del contrato', 'contract size', 'multiplicador']],
      ['Tick y valor del tick', ['valor del tick', 'tick value', 'tick size']],
      ['Rollover', ['rollover', 'rolar']],
      ['Contango', ['contango']],
      ['Backwardation', ['backwardation']],
      ['Base', ['base del futuro', 'basis']],
    ],
    'Forex': [
      ['Pip', ['pip']],
      ['Lote', ['lote', 'lot size', 'micro lote', 'mini lote']],
      ['Divisa base y cotizada', ['divisa base', 'divisa cotizada', 'par de divisas']],
      ['Cruce', ['cruce', 'cross']],
    ],
    'Cripto': [
      ['Perpetuo', ['perpetuo', 'perpetual', 'perp']],
      ['Funding rate', ['funding rate', 'tasa de financiación']],
      ['Margen aislado vs cruzado', ['margen aislado', 'margen cruzado', 'isolated margin', 'cross margin']],
      ['Precio de liquidación', ['precio de liquidación', 'liquidation price']],
      ['Mark price', ['mark price', 'precio marcado', 'precio índice']],
    ],
  },

  2: {
    'Macro que mueve el mercado': [
      ['IPC / inflación', ['IPC', 'inflación', 'CPI']],
      ['PCE subyacente', ['PCE']],
      ['Tipos de la Fed', ['Fed', 'Reserva Federal', 'tipos de interés']],
      ['Nóminas no agrícolas', ['nóminas no agrícolas', 'non-farm', 'NFP']],
      ['PMI', ['PMI']],
      ['BCE', ['BCE', 'Banco Central Europeo']],
      ['Curva de tipos', ['curva de tipos', 'yield curve']],
      ['VIX', ['VIX']],
      ['Regla del 16', ['regla del 16', 'rule of 16']],
      ['Estacionalidad', ['estacionalidad', 'seasonality']],
    ],
    'Análisis técnico': [
      ['Soporte y resistencia', ['soporte', 'resistencia']],
      ['Media móvil', ['media móvil', 'moving average', 'SMA', 'EMA']],
      ['RSI', ['RSI']],
      ['MACD', ['MACD']],
      ['Bandas de Bollinger', ['bollinger']],
      ['VWAP', ['VWAP']],
      ['Fibonacci', ['fibonacci']],
      ['Divergencia', ['divergencia']],
      ['Volumen', ['volumen']],
      ['Gap', ['gap', 'hueco']],
    ],
  },
};

/* -------------------------------------------------------------------------- */

const args = process.argv.slice(2);
const WRITE_MD = args.includes('--md');
const tierArg = args.indexOf('--tier');
const ONLY_TIER = tierArg !== -1 ? args[tierArg + 1] : null;

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(REPO, 'frontend', 'src');
const I18N = path.join(SRC, 'lib', 'i18n');

if (!fs.existsSync(I18N)) {
  console.error(`No encuentro ${I18N}. Ejecuta desde la raíz del repo.`);
  process.exit(1);
}

/* --------------------------------------------------------------------------
   CORPUS — sólo texto que ve el usuario.

   Se audita el castellano: el inventario está en castellano y los 10 idiomas
   ya tienen paridad garantizada por `frontend/scripts/i18n-check.js`. Escanear
   los diez multiplicaría los recuentos por diez sin añadir información.
   -------------------------------------------------------------------------- */

/* Literales de cadena de un módulo JS: '…', "…" y `…`. */
function literales(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1] ?? m[2] ?? m[3] ?? '');
  return out;
}

/* El glosario vive como pares gl{n}t / gl{n}d dentro de i18n. */
function leerGlosario() {
  const src = fs.readFileSync(path.join(I18N, 'es.js'), 'utf8');
  const ent = new Map();
  const re = /["']gl(\d+)([td])["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const n = Number(m[1]);
    if (!ent.has(n)) ent.set(n, {});
    ent.get(n)[m[2]] = m[3] ?? m[4] ?? '';
  }
  return [...ent.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, v]) => ({ n, term: v.t ?? '', def: v.d ?? '' }));
}

const GLOSARIO = leerGlosario();

/* Prosa larga: la Academia y los módulos de contenido. */
const PROSA_FILES = [
  path.join(I18N, 'es.edu.js'),
  path.join(SRC, 'lib', 'tradingEducationContent.js'),
  path.join(SRC, 'lib', 'optionsMechanicsContent.js'),
  path.join(SRC, 'lib', 'marketTypesContent.js'),
  path.join(SRC, 'lib', 'candlePatternMeta.js'),
  path.join(SRC, 'lib', 'macroCalendar.js'),
].filter((f) => fs.existsSync(f));

/* Interfaz: las etiquetas de i18n que no son el glosario. */
const UI_TEXT = literales(path.join(I18N, 'es.js')).join('\n');
const PROSA_TEXT = PROSA_FILES.flatMap(literales).join('\n');
const GLOS_TERMS = GLOSARIO.map((g) => g.term).join('\n');
const GLOS_DEFS = GLOSARIO.map((g) => g.def).join('\n');

/* Coincidencia por palabra completa: `atr` no debe casar con «patrón`,
   ni `gap` con «gap-3». Unicode, porque medio inventario lleva tildes. */
function hace(needle, hay) {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'iu');
  return re.test(hay);
}

function contar(needle, hay) {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'giu');
  return (hay.match(re) ?? []).length;
}

function evaluar(variantes) {
  let enGlosario = false, enDef = false, enProsa = false, enUI = 0;
  let entrada = null;

  for (const v of variantes) {
    const needle = v.trim();
    if (!needle) continue;
    if (!enGlosario && hace(needle, GLOS_TERMS)) {
      enGlosario = true;
      entrada = GLOSARIO.find((g) => hace(needle, g.term))?.term ?? null;
    }
    if (hace(needle, GLOS_DEFS)) enDef = true;
    if (hace(needle, PROSA_TEXT)) enProsa = true;
    enUI += contar(needle, UI_TEXT);
  }

  let estado;
  if (enGlosario) estado = 'EN GLOSARIO';
  else if (enProsa || enDef) estado = 'EN PROSA';
  else if (enUI > 0) estado = 'SOLO UI';
  else estado = 'AUSENTE';

  return { estado, entrada, ui: enUI };
}

/* -------------------------------------------------------------------------- */

const resultados = [];
const resumen = { 'EN GLOSARIO': 0, 'EN PROSA': 0, 'SOLO UI': 0, AUSENTE: 0 };

for (const [tier, grupos] of Object.entries(INVENTARIO)) {
  if (ONLY_TIER && tier !== ONLY_TIER) continue;
  for (const [grupo, terminos] of Object.entries(grupos)) {
    for (const [nombre, variantes] of terminos) {
      const r = evaluar(variantes);
      resumen[r.estado]++;
      resultados.push({ tier, grupo, nombre, ...r });
    }
  }
}

const total = resultados.length;
const pct = (n) => `${Math.round((n / total) * 100)}%`.padStart(4);
const linea = '─'.repeat(70);

console.log(`\nCobertura terminológica — glosario de ${GLOSARIO.length} entradas`);
console.log(`${PROSA_FILES.length} módulos de prosa · ${total} términos del inventario`);
console.log(linea);
console.log(`  EN GLOSARIO  ${String(resumen['EN GLOSARIO']).padStart(3)}  ${pct(resumen['EN GLOSARIO'])}   buscable`);
console.log(`  EN PROSA     ${String(resumen['EN PROSA']).padStart(3)}  ${pct(resumen['EN PROSA'])}   explicado, no buscable`);
console.log(`  SOLO UI      ${String(resumen['SOLO UI']).padStart(3)}  ${pct(resumen['SOLO UI'])}   ← en pantalla, sin explicar`);
console.log(`  AUSENTE      ${String(resumen.AUSENTE).padStart(3)}  ${pct(resumen.AUSENTE)}`);
console.log(linea);

/* Sólo se listan los que faltan; lo cubierto no necesita repaso. */
for (const objetivo of ['SOLO UI', 'EN PROSA', 'AUSENTE']) {
  const filas = resultados.filter((r) => r.estado === objetivo);
  if (!filas.length) continue;
  const titulo = { 'SOLO UI': 'EN PANTALLA Y SIN EXPLICAR (deuda ya contraída)',
                   'EN PROSA': 'EXPLICADO EN LA ACADEMIA PERO NO BUSCABLE',
                   AUSENTE: 'AUSENTE' }[objetivo];
  console.log(`\n${titulo}`);
  let grupoActual = null;
  for (const r of filas) {
    if (r.grupo !== grupoActual) {
      grupoActual = r.grupo;
      console.log(`\n  ${grupoActual}  [nivel ${r.tier}]`);
    }
    const nota = r.ui > 0 ? ` (${r.ui}× en la interfaz)` : '';
    console.log(`    ${r.nombre}${nota}`);
  }
}

console.log(`\n${linea}\n`);

if (WRITE_MD) {
  const filas = resultados
    .map((r) => `| ${r.tier} | ${r.grupo} | ${r.nombre} | ${r.estado} | ${r.entrada ?? '—'} | ${r.ui} |`)
    .join('\n');
  const out = path.join(REPO, 'docs', 'historico', `cobertura-glosario-${new Date().toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(
    out,
    `# Cobertura terminológica\n\n` +
      `Foto del ${new Date().toISOString().slice(0, 10)}. Generada con \`node scripts/auditar-glosario.mjs --md\`.\n` +
      `Glosario de ${GLOSARIO.length} entradas; ${total} términos del inventario canónico.\n\n` +
      `| Estado | N | % |\n|---|---|---|\n` +
      `| En glosario (buscable) | ${resumen['EN GLOSARIO']} | ${pct(resumen['EN GLOSARIO']).trim()} |\n` +
      `| En prosa (no buscable) | ${resumen['EN PROSA']} | ${pct(resumen['EN PROSA']).trim()} |\n` +
      `| Solo UI (sin explicar) | ${resumen['SOLO UI']} | ${pct(resumen['SOLO UI']).trim()} |\n` +
      `| Ausente | ${resumen.AUSENTE} | ${pct(resumen.AUSENTE).trim()} |\n\n` +
      `| Nivel | Grupo | Término | Estado | Entrada del glosario | Apariciones en UI |\n|---|---|---|---|---|---|\n${filas}\n`,
    'utf8'
  );
  console.log(`  Escrito ${path.relative(REPO, out)}\n`);
}
