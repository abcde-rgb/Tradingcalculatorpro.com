#!/usr/bin/env node
/* eslint-disable */
/**
 * Genera páginas estáticas indexables (SEO) dentro de `build/`, MULTI-IDIOMA:
 *   - Educación: 1 página por tema × 8 idiomas, con el título+intro REALES ya
 *     traducidos en los archivos i18n (src/lib/i18n/*.js). Contenido de calidad
 *     sin inventar.
 *   - Calculadoras: 1 página por calculadora en es + en (páginas comerciales).
 *
 * URLs: es = /tools|/learn (por defecto). Otros idiomas = /<lang>/tools|/<lang>/learn.
 * Cada página lleva hreflang a todas sus versiones de idioma + x-default.
 * Se ejecuta como `postbuild` (tras craco build) y regenera build/sitemap.xml.
 *
 * ⚠️ DOMINIO: debe coincidir con useSEO.js / robots.txt.
 */
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://abcde-rgb.github.io/Tradingcalculatorpro.com';
const BUILD = path.join(__dirname, '..', 'build');
const I18N_DIR = path.join(__dirname, '..', 'src', 'lib', 'i18n');
const OG_IMAGE = `${DOMAIN}/og-image.png`;
const LASTMOD = new Date().toISOString().slice(0, 10);

// idioma → prefijo de ruta ('' para es) y código hreflang
const LANGS = [
  ['es', '', 'es'], ['en', '/en', 'en'], ['de', '/de', 'de'], ['fr', '/fr', 'fr'],
  ['ru', '/ru', 'ru'], ['zh', '/zh', 'zh-CN'], ['ja', '/ja', 'ja'], ['ar', '/ar', 'ar'],
];
const RTL = new Set(['ar']);

// Cargar traducciones de cada idioma (mismo truco que la auditoría i18n)
const T = {};
for (const [lang] of LANGS) {
  const src = fs.readFileSync(path.join(I18N_DIR, lang + '.js'), 'utf8').replace(/export\s+default\s+/, 'return ');
  T[lang] = new Function(src)();
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (s) => String(s).replace(/^\w/, (m) => m.toUpperCase());

// ─── UI localizada mínima (breadcrumb, CTAs, etc.) ────────────────
const UI = {
  es: { home:'Inicio', learn:'Aprender', prices:'Precios', calcs:'Calculadoras', useCalc:'Usar la calculadora', openModule:'Abrir el módulo completo', whatGet:'Qué obtienes', whatLearn:'Qué aprenderás', formula:'Fórmula', otherCalcs:'Otras calculadoras', moreTopics:'Más temas', free:'Gratis · 8 idiomas', disc:'TradingCalculator.Pro — herramientas y formación de trading. Contenido informativo, no es asesoramiento financiero. Operar conlleva riesgo de pérdida.' },
  en: { home:'Home', learn:'Learn', prices:'Pricing', calcs:'Calculators', useCalc:'Use the calculator', openModule:'Open the full module', whatGet:'What you get', whatLearn:'What you will learn', formula:'Formula', otherCalcs:'Other calculators', moreTopics:'More topics', free:'Free · 8 languages', disc:'TradingCalculator.Pro — trading tools and education. Informational content, not financial advice. Trading involves risk of loss.' },
  de: { home:'Start', learn:'Lernen', prices:'Preise', calcs:'Rechner', useCalc:'Rechner öffnen', openModule:'Vollständiges Modul öffnen', whatGet:'Was du bekommst', whatLearn:'Was du lernst', formula:'Formel', otherCalcs:'Weitere Rechner', moreTopics:'Weitere Themen', free:'Kostenlos · 8 Sprachen', disc:'TradingCalculator.Pro — Trading-Tools und -Ausbildung. Informativ, keine Finanzberatung. Trading birgt Verlustrisiko.' },
  fr: { home:'Accueil', learn:'Apprendre', prices:'Tarifs', calcs:'Calculatrices', useCalc:'Utiliser la calculatrice', openModule:'Ouvrir le module complet', whatGet:'Ce que vous obtenez', whatLearn:'Ce que vous apprendrez', formula:'Formule', otherCalcs:'Autres calculatrices', moreTopics:'Plus de thèmes', free:'Gratuit · 8 langues', disc:'TradingCalculator.Pro — outils et formation de trading. Contenu informatif, pas un conseil financier. Le trading comporte un risque de perte.' },
  ru: { home:'Главная', learn:'Обучение', prices:'Цены', calcs:'Калькуляторы', useCalc:'Открыть калькулятор', openModule:'Открыть полный модуль', whatGet:'Что вы получите', whatLearn:'Чему вы научитесь', formula:'Формула', otherCalcs:'Другие калькуляторы', moreTopics:'Ещё темы', free:'Бесплатно · 8 языков', disc:'TradingCalculator.Pro — инструменты и обучение трейдингу. Информационный контент, не инвестсовет. Торговля сопряжена с риском убытков.' },
  zh: { home:'首页', learn:'学习', prices:'价格', calcs:'计算器', useCalc:'使用计算器', openModule:'打开完整模块', whatGet:'你将获得', whatLearn:'你将学到', formula:'公式', otherCalcs:'其他计算器', moreTopics:'更多主题', free:'免费 · 8 种语言', disc:'TradingCalculator.Pro — 交易工具与教育。仅供参考，非投资建议。交易有亏损风险。' },
  ja: { home:'ホーム', learn:'学ぶ', prices:'料金', calcs:'計算ツール', useCalc:'計算ツールを使う', openModule:'モジュール全体を開く', whatGet:'得られるもの', whatLearn:'学べること', formula:'計算式', otherCalcs:'他の計算ツール', moreTopics:'他のテーマ', free:'無料 · 8言語', disc:'TradingCalculator.Pro — トレーディングのツールと教育。情報提供のみで投資助言ではありません。取引には損失リスクがあります。' },
  ar: { home:'الرئيسية', learn:'تعلّم', prices:'الأسعار', calcs:'الحاسبات', useCalc:'استخدم الحاسبة', openModule:'افتح الوحدة كاملة', whatGet:'ما ستحصل عليه', whatLearn:'ما ستتعلمه', formula:'الصيغة', otherCalcs:'حاسبات أخرى', moreTopics:'مواضيع أخرى', free:'مجاني · 8 لغات', disc:'TradingCalculator.Pro — أدوات وتعليم التداول. محتوى إعلامي وليس نصيحة مالية. التداول ينطوي على مخاطر خسارة.' },
};

// ─── Calculadoras: es + en (páginas comerciales) ──────────────────
// tab = deep-link /dashboard?tab=<tab>. formula es casi universal (notación).
const CALCS = [
  { slug: 'calculadora-tamano-posicion', tab: 'position', formula: 'Size = (Capital × Risk%) ÷ Stop distance',
    es: { title:'Calculadora de Tamaño de Posición — Gratis y Profesional', kw:'calculadora de tamaño de posición', lead:'Calcula exactamente cuántas unidades, lotes o contratos operar para arriesgar solo el porcentaje de tu cuenta que decidas por operación.', pts:['Arriesga siempre un % fijo y controlado (1-2 %)','Acciones, forex, cripto, índices y futuros','Evita el error nº1: el sobreapalancamiento'] },
    en: { title:'Position Size Calculator — Free & Professional', kw:'position size calculator', lead:'Work out exactly how many units, lots or contracts to trade so you risk only the percentage of your account you choose per trade.', pts:['Always risk a fixed, controlled % (1-2%)','Stocks, forex, crypto, indices and futures','Avoids the #1 account killer: overleverage'] } },
  { slug: 'calculadora-de-lotes-forex', tab: 'lotsize', formula: 'Lots = Risk($) ÷ (Stop in pips × Pip value)',
    es: { title:'Calculadora de Lotes de Forex — Tamaño de Lote y Pip', kw:'calculadora de lotes forex', lead:'Convierte tu riesgo en euros/dólares al tamaño de lote correcto (estándar, mini o micro) según tu par, tu stop en pips y tu capital.', pts:['Lotes estándar, mini y micro','Valor del pip por par','Ajustado a tu % de riesgo'] },
    en: { title:'Forex Lot Size Calculator — Lot Size & Pip Value', kw:'forex lot size calculator', lead:'Turn your risk in dollars into the correct lot size (standard, mini or micro) based on your pair, your stop in pips and your capital.', pts:['Standard, mini and micro lots','Pip value per currency pair','Matched to your risk % per trade'] } },
  { slug: 'calculadora-de-apalancamiento', tab: 'leverage', formula: 'Leverage = Total exposure ÷ Capital',
    es: { title:'Calculadora de Apalancamiento — Exposición y Margen', kw:'calculadora de apalancamiento', lead:'Descubre tu apalancamiento real, el margen que necesitas y la exposición total de tu posición antes de abrirla.', pts:['Margen requerido y exposición nocional','Apalancamiento efectivo vs. ofrecido','Forex, cripto, CFDs y futuros'] },
    en: { title:'Leverage Calculator — Exposure & Margin', kw:'leverage calculator', lead:'See your real leverage, the margin you need and the total exposure of your position before you open it.', pts:['Required margin and notional exposure','Effective vs. offered leverage','Forex, crypto, CFDs and futures'] } },
  { slug: 'calculadora-de-futuros', tab: 'futures', formula: 'Tick value = Contract size × Tick size',
    es: { title:'Calculadora de Futuros — Margen, Tick y Nocional', kw:'calculadora de futuros', lead:'Traduce el tamaño del contrato, el multiplicador y el margen en exposición real: cuánto vale cada tick y el nocional total.', pts:['Valor del tick y del punto','Margen inicial y de mantenimiento','Exposición nocional real'] },
    en: { title:'Futures Calculator — Margin, Tick & Notional', kw:'futures calculator', lead:'Translate contract size, multiplier and margin into real exposure: what each tick is worth and the total notional value.', pts:['Tick and point value','Initial and maintenance margin','Real notional exposure'] } },
  { slug: 'calculadora-precio-objetivo', tab: 'target', formula: 'Target = Entry ± (Risk × R:R ratio)',
    es: { title:'Calculadora de Precio Objetivo — Take Profit y R:R', kw:'calculadora de precio objetivo', lead:'Fija tu take profit según el ratio riesgo/beneficio que buscas y comprueba si la operación merece la pena antes de entrar.', pts:['Precio objetivo por ratio R:R','Beneficio potencial en % y en dinero','Valida el R:R mínimo'] },
    en: { title:'Target Price Calculator — Take Profit & R:R', kw:'target price calculator', lead:'Set your take profit from the risk/reward ratio you want and check if the trade is worth it before you enter.', pts:['Target price by R:R ratio','Potential profit in % and money','Validate your minimum R:R'] } },
  { slug: 'calculadora-porcentaje-trading', tab: 'percentage', formula: '% = (End − Start) ÷ Start × 100',
    es: { title:'Calculadora de Porcentaje — Ganancias, Pérdidas y ROI', kw:'calculadora de porcentaje de trading', lead:'Calcula el cambio porcentual entre dos precios, tu ganancia o pérdida y cuánto necesitas recuperar tras un drawdown.', pts:['Variación % entre dos precios','ROI de la operación','Cuánto recuperar tras una pérdida'] },
    en: { title:'Trading Percentage Calculator — Gain, Loss & ROI', kw:'trading percentage calculator', lead:'Work out the percentage change between two prices, your gain or loss, and how much you need to recover after a drawdown.', pts:['% change between two prices','Trade ROI','Recovery needed after a loss'] } },
  { slug: 'calculadora-precio-medio', tab: 'spot', formula: 'Avg = Σ(price × qty) ÷ Σ qty',
    es: { title:'Calculadora de Precio Medio (DCA) — Coste Promedio', kw:'calculadora de precio medio', lead:'Calcula tu precio de entrada promedio al comprar en varias veces (DCA) y sabe a qué precio quedas y qué necesitas para salir en positivo.', pts:['Precio medio ponderado','Break-even tras promediar','Ideal para DCA en cripto y acciones'] },
    en: { title:'Average Price Calculator (DCA) — Cost Basis', kw:'average price calculator', lead:'Work out your average entry price when buying in several parts (DCA) and know your break-even to exit in profit.', pts:['Weighted average price','Break-even after averaging','Ideal for DCA in crypto and stocks'] } },
  { slug: 'calculadora-fibonacci', tab: 'fibonacci', formula: 'Level = High − (Range × Fib ratio)',
    es: { title:'Calculadora de Fibonacci — Retrocesos y Extensiones', kw:'calculadora de fibonacci', lead:'Genera los niveles de retroceso (38,2 %, 50 %, 61,8 %) y de extensión de Fibonacci entre dos puntos, para encontrar soportes, resistencias y objetivos.', pts:['Retrocesos y extensiones automáticos','Zonas de entrada y objetivos','Alcista y bajista'] },
    en: { title:'Fibonacci Calculator — Retracements & Extensions', kw:'fibonacci calculator', lead:'Generate Fibonacci retracement (38.2%, 50%, 61.8%) and extension levels between two points to find support, resistance and targets.', pts:['Automatic retracements and extensions','Entry zones and targets','Bullish and bearish'] } },
  { slug: 'calculadora-patrones-trading', tab: 'pattern', formula: 'Target = breakout + pattern height',
    es: { title:'Calculadora de Patrones — Entrada, Stop y Objetivo', kw:'calculadora de patrones de trading', lead:'A partir de un patrón chartista, calcula la entrada, el stop-loss y el objetivo medido con su ratio riesgo/beneficio.', pts:['Entrada, stop y objetivo medido','Ratio R:R del patrón','Gestión de riesgo integrada'] },
    en: { title:'Chart Pattern Calculator — Entry, Stop & Target', kw:'chart pattern calculator', lead:'From a chart pattern, work out the entry, stop-loss and measured target with its risk/reward ratio.', pts:['Entry, stop and measured target','Pattern R:R ratio','Built-in risk management'] } },
  { slug: 'simulador-monte-carlo-risk-of-ruin', tab: 'montecarlo', formula: 'Thousands of random simulations of your system',
    es: { title:'Simulador Monte Carlo y Risk of Ruin — Probabilidad de Quiebra', kw:'simulador monte carlo risk of ruin', lead:'Simula miles de secuencias de operaciones con tu win rate y R:R para ver tu probabilidad real de arruinar la cuenta y la peor racha esperada.', pts:['Probabilidad de ruina según tu riesgo','Peor racha de pérdidas esperada','Valida si tu sistema es sostenible'] },
    en: { title:'Monte Carlo & Risk of Ruin Simulator — Blow-up Probability', kw:'risk of ruin calculator', lead:'Simulate thousands of trade sequences with your win rate and R:R to see your real probability of blowing up the account and the worst losing streak.', pts:['Risk of ruin for your bet size','Worst expected losing streak','Validate if your system is sustainable'] } },
  { slug: 'simulador-de-trading', tab: 'simulator', formula: 'Compound growth trade by trade',
    es: { title:'Simulador de Trading — Proyección de Cuenta por Fases', kw:'simulador de trading', lead:'Proyecta cómo evoluciona tu cuenta con tu win rate, R:R, comisiones e interés compuesto a lo largo de cientos de operaciones.', pts:['Proyección por fases con compuesto','Incluye comisiones y slippage','Curva de equity esperada'] },
    en: { title:'Trading Simulator — Account Projection by Phases', kw:'trading simulator', lead:'Project how your account grows with your win rate, R:R, fees and compounding across hundreds of trades.', pts:['Phased projection with compounding','Includes fees and slippage','Expected equity curve'] } },
  { slug: 'calculadora-interes-compuesto-trading', tab: 'compound', formula: 'Final = Capital × (1 + monthly%)^months',
    es: { title:'Calculadora de Interés Compuesto para Trading', kw:'calculadora de interés compuesto trading', lead:'Ve cómo crece tu capital reinvirtiendo las ganancias mes a mes con un rendimiento porcentual objetivo.', pts:['Crecimiento compuesto con aportaciones','Hitos y gráfico de evolución','Expectativas realistas de rentabilidad'] },
    en: { title:'Compound Interest Calculator for Trading', kw:'trading compound interest calculator', lead:'See how your capital grows by reinvesting profits month after month at a target percentage return.', pts:['Compound growth with contributions','Milestones and growth chart','Realistic return expectations'] } },
];

// ─── Temas de educación: título+intro desde i18n (8 idiomas) ──────
// {value (?topic=), slug, titleKey, introKey}
const TOPICS = [
  { v:'start-here', slug:'como-hacer-tu-primera-operacion', tk:'shTitle', ik:'shIntro' },
  { v:'fundamentals', slug:'fundamentos-del-trading', tk:'fundTitle', ik:'fundIntro' },
  { v:'mechanics', slug:'mecanica-del-mercado', tk:'mechTitle', ik:'mechIntro' },
  { v:'styles', slug:'estilos-de-trading', tk:'stylesTitle', ik:'stylesIntro' },
  { v:'fund-analysis', slug:'analisis-fundamental', tk:'fundAnalTitle', ik:'fundAnalIntro' },
  { v:'company-valuation', slug:'como-valorar-una-empresa', tk:'cvTitle', ik:'cvIntro' },
  { v:'broker-safety', slug:'brokers-regulacion-estafas', tk:'bkrTitle', ik:'bkrIntro' },
  { v:'pfof', slug:'pfof-brokers-sin-comisiones-coste-real', tk:'pfofTitle', ik:'pfofIntro' },
  { v:'evidence-based', slug:'trading-basado-en-evidencia', tk:'evTitle', ik:'evIntro' },
  { v:'funded-truth', slug:'verdad-sobre-cuentas-de-fondeo', tk:'fdTitle', ik:'fdIntro' },
  { v:'trader-journey', slug:'cuanto-se-tarda-en-ser-trader-rentable', tk:'tjTitle', ik:'tjIntro' },
  { v:'long-invest', slug:'inversion-a-largo-plazo', tk:'liTitle', ik:'liIntro' },
  { v:'taxes', slug:'fiscalidad-del-trading', tk:'txTitle', ik:'txIntro' },
  { v:'tech-analysis', slug:'analisis-tecnico', tk:'techTitle', ik:'techIntro' },
  { v:'moving-averages', slug:'medias-moviles-sma-ema-cruces', tk:'mavTitle', ik:'mavIntro' },
  { v:'price-action', slug:'price-action-barra-interior-exterior', tk:'pacTitle', ik:'pacIntro' },
  { v:'dow-theory', slug:'teoria-de-dow', tk:'dowTheoryTitle', ik:'dowTheoryIntro' },
  { v:'market-structure', slug:'estructura-de-mercado-bos-choch', tk:'msTitle', ik:'msIntro' },
  { v:'wyckoff', slug:'metodo-wyckoff', tk:'wyckoffTitle', ik:'wyckoffIntro' },
  { v:'alt-charts', slug:'tipos-de-grafico', tk:'altChartTitle', ik:'altChartIntro' },
  { v:'elliott', slug:'ondas-de-elliott', tk:'ewTitle', ik:'ewIntro' },
  { v:'ichimoku', slug:'ichimoku-kinko-hyo', tk:'ichiTitle', ik:'ichiIntro' },
  { v:'harmonic-patterns', slug:'patrones-armonicos', tk:'harmonicPatternsTab', ik:'harmonicPatternsIntro' },
  { v:'smc', slug:'smart-money-concepts-ict', tk:'smcTitle', ik:'smcIntro' },
  { v:'order-flow', slug:'order-flow-lectura-de-cinta', tk:'ofTitle', ik:'ofIntro' },
  { v:'session-timing', slug:'horarios-sesiones-y-estacionalidad', tk:'hzTitle', ik:'hzIntro' },
  { v:'advanced-ta', slug:'analisis-tecnico-avanzado', tk:'advTaTitle', ik:'advTaIntro' },
  { v:'sentiment', slug:'sentimiento-de-mercado', tk:'smTitle', ik:'smIntro' },
  { v:'intermarket', slug:'analisis-intermercado', tk:'imTitle', ik:'imIntro' },
  { v:'forex-deep', slug:'forex-a-fondo', tk:'fxTitle', ik:'fxIntro' },
  { v:'commodities', slug:'materias-primas', tk:'cmTitle', ik:'cmIntro' },
  { v:'crypto-deep', slug:'cripto-a-fondo', tk:'cyTitle', ik:'cyIntro' },
  { v:'indices', slug:'indices-y-nasdaq', tk:'ixTitle', ik:'ixIntro' },
  { v:'macro', slug:'macro-ciclo-tipos-y-rotacion-sectorial', tk:'mcTitle', ik:'mcIntro' },
  { v:'net-liquidity', slug:'liquidez-macro-fed-tga-repo-inverso', tk:'liqTitle', ik:'liqIntro' },
  { v:'breadth-cycles', slug:'amplitud-y-ciclos', tk:'bcTitle', ik:'bcIntro' },
  { v:'cot', slug:'informe-cot', tk:'cotTitle', ik:'cotIntro' },
  { v:'capital', slug:'gestion-del-capital', tk:'capitalManagementTitle', ik:'capitalManagementIntro' },
  { v:'margin-liq', slug:'margen-y-liquidacion', tk:'mlqTitle', ik:'mlqIntro' },
  { v:'probability', slug:'probabilidad-y-estadistica', tk:'probabilityStatsTitle', ik:'probabilityStatsIntro' },
  { v:'tail-risk', slug:'colas-gordas-cisnes-negros-riesgo-de-cola', tk:'tailTitle', ik:'tailIntro' },
  { v:'psychology', slug:'psicologia-del-trading', tk:'tradingPsychologyTitle', ik:'tradingPsychologyIntro' },
  { v:'time-impact', slug:'tiempo-vs-impacto-en-el-trading', tk:'tviTitle', ik:'tviIntro' },
  { v:'pre-trade-protocol', slug:'protocolo-antes-de-operar', tk:'protoTitle', ik:'protoIntro' },
  { v:'pro-discipline', slug:'disciplina-profesional', tk:'discTitle', ik:'discIntro' },
  { v:'craft', slug:'el-oficio-del-trader', tk:'craftTitle', ik:'craftIntro' },
  { v:'strategies', slug:'estrategias-de-trading', tk:'tradingStrategiesTitle', ik:'tradingStrategiesIntro' },
  { v:'option-greeks', slug:'griegas-de-opciones', tk:'gkTitle', ik:'gkIntro' },
  { v:'options-strat', slug:'estrategias-con-opciones', tk:'optTitle', ik:'optIntro' },
  { v:'options-income', slug:'opciones-ingresos-y-asignacion', tk:'oiTitle', ik:'oiIntro' },
  { v:'options-vol', slug:'opciones-volatilidad', tk:'ovTitle', ik:'ovIntro' },
  { v:'gamma-exposure', slug:'gamma-dealers-gex-vanna-opex', tk:'gexTitle', ik:'gexIntro' },
  { v:'news-trading', slug:'operar-noticias', tk:'ntTitle', ik:'ntIntro' },
  { v:'algo-trading', slug:'trading-algoritmico', tk:'atTitle', ik:'atIntro' },
  { v:'copy-trading', slug:'copy-y-social-trading', tk:'cpTitle', ik:'cpIntro' },
  { v:'inst-desk', slug:'mesa-institucional', tk:'ideskTitle', ik:'ideskIntro' },
  { v:'business', slug:'el-negocio-del-trading', tk:'tbizTitle', ik:'tbizIntro' },
];

// ─── Plantilla HTML ───────────────────────────────────────────────
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

function render({ lang, url, alts, title, description, h1, kw, ui, sectionLabel, sectionUrl, lead, formula, points, ctaUrl, ctaLabel, related, sectionKind, jsonld }) {
  const dir = RTL.has(lang) ? ' dir="rtl"' : '';
  const hreflang = alts.map(([hl, u]) => `<link rel="alternate" hreflang="${hl}" href="${esc(u)}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${esc(alts.find(a => a[0] === 'es') ? alts.find(a => a[0] === 'es')[1] : url)}">`;
  const pointsHtml = (points || []).map(p => `<li>${esc(p)}</li>`).join('');
  const relatedHtml = related.map(r => `<li><a href="${esc(r.url)}">${esc(r.label)}</a></li>`).join('');
  return `<!doctype html>
<html lang="${lang}"${dir}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
${hreflang}
<meta property="og:type" content="website">
<meta property="og:site_name" content="TradingCalculator.Pro">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(OG_IMAGE)}">
<meta property="og:locale" content="${lang}">
<meta name="twitter:card" content="summary_large_image">
${ld(jsonld)}
${ld({ '@context':'https://schema.org','@type':'BreadcrumbList', itemListElement:[
  { '@type':'ListItem', position:1, name: ui.home, item: DOMAIN + '/' },
  { '@type':'ListItem', position:2, name: sectionLabel, item: sectionUrl },
  { '@type':'ListItem', position:3, name: h1, item: url },
] })}
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#e5e5e5;line-height:1.65}
a{color:#34d399;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.top{border-bottom:1px solid #1e1e1e;padding:16px 0}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{font-weight:800;color:#fff;font-size:18px}.brand span{color:#34d399}
nav.top a{color:#a3a3a3;font-size:14px;margin-inline-start:16px}
.crumb{font-size:13px;color:#737373;padding:18px 0 0}.crumb a{color:#737373}
h1{font-size:30px;line-height:1.25;color:#fff;margin:14px 0 6px}
.lead{font-size:18px;color:#c7c7c7;margin:0 0 22px}
.cta{display:inline-block;background:#22c55e;color:#04120a;font-weight:800;padding:14px 26px;border-radius:10px;margin:10px 0 6px;font-size:16px}.cta:hover{background:#16a34a;text-decoration:none}
.card{background:#141414;border:1px solid #262626;border-radius:12px;padding:18px 20px;margin:20px 0}
.card h2{font-size:18px;color:#fff;margin:0 0 10px}
.formula{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0f1a12;border:1px solid #14361f;color:#7ee2a8;padding:12px 14px;border-radius:8px;display:block;font-size:15px;overflow-x:auto;direction:ltr}
ul{padding-inline-start:20px;margin:8px 0}li{margin:6px 0}
.free{display:inline-block;background:#14361f;color:#4ade80;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em}
footer{border-top:1px solid #1e1e1e;margin-top:40px;padding:24px 0;color:#737373;font-size:13px}
footer a{color:#a3a3a3;margin-inline-end:16px}.disc{margin-top:12px;font-size:12px;color:#525252}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="${DOMAIN}/">Trading Calculator <span>PRO</span></a>
  <nav class="top"><a href="${DOMAIN}/">${esc(ui.home)}</a><a href="${DOMAIN}/education">${esc(ui.learn)}</a><a href="${DOMAIN}/pricing">${esc(ui.prices)}</a></nav>
</div></header>
<main class="wrap">
  <div class="crumb"><a href="${DOMAIN}/">${esc(ui.home)}</a> › <a href="${esc(sectionUrl)}">${esc(sectionLabel)}</a> › ${esc(h1)}</div>
  <span class="free">${esc(ui.free)}</span>
  <h1>${esc(h1)}</h1>
  <p class="lead">${esc(lead)}</p>
  <a class="cta" href="${esc(ctaUrl)}">${esc(ctaLabel)} →</a>
  ${formula ? `<div class="card"><h2>${esc(ui.formula)}</h2><code class="formula">${esc(formula)}</code></div>` : ''}
  ${points && points.length ? `<div class="card"><h2>${esc(sectionKind === 'tools' ? ui.whatGet : ui.whatLearn)}</h2><ul>${pointsHtml}</ul></div>` : ''}
  <a class="cta" href="${esc(ctaUrl)}">${esc(ctaLabel)} →</a>
  <div class="related card"><h2>${esc(sectionKind === 'tools' ? ui.otherCalcs : ui.moreTopics)}</h2><ul>${relatedHtml}</ul></div>
</main>
<footer><div class="wrap">
  <div><a href="${DOMAIN}/">${esc(ui.home)}</a><a href="${DOMAIN}/education">${esc(ui.learn)}</a><a href="${DOMAIN}/legal">Legal</a></div>
  <div class="disc">${esc(ui.disc)}</div>
</div></footer>
</body>
</html>`;
}

function write(rel, html) {
  const full = path.join(BUILD, rel);
  fs.mkdirSync(full, { recursive: true });
  fs.writeFileSync(path.join(full, 'index.html'), html, 'utf8');
}

const sitemapUrls = [];

// ── Calculadoras (es + en) ──
const CALC_LANGS = [['es', ''], ['en', '/en']];
CALCS.forEach((c, i) => {
  CALC_LANGS.forEach(([lang, pref]) => {
    const d = c[lang];
    const rel = `${pref ? pref.slice(1) + '/' : ''}tools/${c.slug}`;
    const url = `${DOMAIN}/${rel}/`;
    const alts = CALC_LANGS.map(([l, p]) => [l === 'es' ? 'es' : 'en', `${DOMAIN}/${p ? p.slice(1) + '/' : ''}tools/${c.slug}/`]);
    const ui = UI[lang];
    const related = CALCS.filter((_, j) => j !== i).slice(0, 6).map(r => ({ url: `${DOMAIN}/${pref ? pref.slice(1) + '/' : ''}tools/${r.slug}/`, label: cap(r[lang].kw) }));
    const description = d.lead.slice(0, 158);
    const html = render({
      lang, url, alts, title: d.title, description, h1: cap(d.kw), kw: d.kw, ui,
      sectionLabel: ui.calcs, sectionUrl: `${DOMAIN}/dashboard`, lead: d.lead, formula: c.formula, points: d.pts,
      ctaUrl: `${DOMAIN}/dashboard?tab=${c.tab}`, ctaLabel: ui.useCalc, related, sectionKind: 'tools',
      jsonld: { '@context':'https://schema.org','@type':'SoftwareApplication', name: d.title, applicationCategory:'FinanceApplication', operatingSystem:'Web', url, inLanguage: lang, offers:{ '@type':'Offer', price:'0', priceCurrency:'EUR' }, description },
    });
    write(rel, html);
    sitemapUrls.push([`/${rel}/`, '0.8']);
  });
});

// ── Educación (8 idiomas, contenido desde i18n) ──
let learnCount = 0;
TOPICS.forEach((tp, i) => {
  LANGS.forEach(([lang, pref]) => {
    const title = T[lang][tp.tk];
    const intro = T[lang][tp.ik];
    if (!title || !intro) return; // salta si falta contenido en ese idioma
    const rel = `${pref ? pref.slice(1) + '/' : ''}learn/${tp.slug}`;
    const url = `${DOMAIN}/${rel}/`;
    const ui = UI[lang];
    // hreflang: solo idiomas que tienen el contenido
    const alts = LANGS.filter(([l]) => T[l][tp.tk] && T[l][tp.ik]).map(([l, p, hl]) => [hl, `${DOMAIN}/${p ? p.slice(1) + '/' : ''}learn/${tp.slug}/`]);
    const related = TOPICS.filter((_, j) => j !== i).filter(r => T[lang][r.tk]).slice(0, 6).map(r => ({ url: `${DOMAIN}/${pref ? pref.slice(1) + '/' : ''}learn/${r.slug}/`, label: T[lang][r.tk] }));
    const description = String(intro).slice(0, 158);
    const html = render({
      lang, url, alts, title: `${title} | TradingCalculator.Pro`, description, h1: title, kw: title, ui,
      sectionLabel: ui.learn, sectionUrl: `${DOMAIN}/education`, lead: intro, formula: null, points: null,
      ctaUrl: `${DOMAIN}/education?topic=${tp.v}`, ctaLabel: ui.openModule, related, sectionKind: 'learn',
      jsonld: { '@context':'https://schema.org','@type':'LearningResource', name: title, url, inLanguage: lang, description, provider:{ '@type':'Organization', name:'TradingCalculator.Pro', url: DOMAIN + '/' } },
    });
    write(rel, html);
    sitemapUrls.push([`/${rel}/`, '0.7']);
    learnCount++;
  });
});

// ── Sitemap ──
const MAIN = [['/','1.0'],['/options','0.9'],['/education','0.9'],['/performance','0.8'],['/pricing','0.85'],['/about','0.7'],['/contact','0.6'],['/legal','0.4']];
const all = [...MAIN, ...sitemapUrls];
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  all.map(([p, pr]) => `  <url><loc>${DOMAIN}${p}</loc><lastmod>${LASTMOD}</lastmod><priority>${pr}</priority></url>`).join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(BUILD, 'sitemap.xml'), sitemap, 'utf8');

console.log(`✅ Calculadoras: ${CALCS.length} × ${CALC_LANGS.length} idiomas = ${CALCS.length * CALC_LANGS.length} páginas`);
console.log(`✅ Educación: ${learnCount} páginas (hasta ${TOPICS.length} temas × 8 idiomas)`);
console.log(`✅ sitemap.xml: ${all.length} URLs`);
