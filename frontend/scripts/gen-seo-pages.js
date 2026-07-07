#!/usr/bin/env node
/* eslint-disable */
/**
 * Genera páginas estáticas indexables (una por calculadora y por tema) dentro de
 * `build/`, para que Google vea ~decenas de páginas con contenido REAL en el HTML
 * (no un SPA vacío). Cada página: SEO completo + contenido + CTA a la app + enlaces
 * internos + JSON-LD. Se ejecuta como `postbuild` (tras `craco build`).
 *
 * También regenera build/sitemap.xml incluyendo todas estas URLs.
 *
 * ⚠️ DOMINIO: debe coincidir con useSEO.js / robots.txt / gen-sitemap.js.
 */
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://abcde-rgb.github.io/Tradingcalculatorpro.com';
const BUILD = path.join(__dirname, '..', 'build');
const OG_IMAGE = `${DOMAIN}/og-image.png`;
const LASTMOD = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─────────────────────────────────────────────────────────────
// Datos: calculadoras (intención comercial — las que más convierten)
// app: deep-link /dashboard?tab=<value> ; kw: keyword objetivo
// ─────────────────────────────────────────────────────────────
const CALCS = [
  { slug: 'calculadora-tamano-posicion', tab: 'position', kw: 'calculadora de tamaño de posición',
    title: 'Calculadora de Tamaño de Posición — Gratis y Profesional',
    lead: 'Calcula exactamente cuántas unidades, lotes o contratos operar para arriesgar solo el porcentaje de tu cuenta que decidas por operación. La regla de oro de la gestión de riesgo, en segundos.',
    formula: 'Tamaño = (Capital × %Riesgo) ÷ Distancia al stop',
    points: ['Arriesga siempre un % fijo y controlado (1-2 %)', 'Funciona con acciones, forex, cripto, índices y futuros', 'Te evita el error nº1 que quema cuentas: el sobreapalancamiento'] },
  { slug: 'calculadora-de-lotes-forex', tab: 'lotsize', kw: 'calculadora de lotes forex',
    title: 'Calculadora de Lotes de Forex — Tamaño de Lote y Valor del Pip',
    lead: 'Convierte tu riesgo en euros/dólares al tamaño de lote correcto (estándar, mini o micro) según tu par, tu stop en pips y tu capital. Sin cálculos manuales ni errores.',
    formula: 'Lotes = Riesgo($) ÷ (Stop en pips × Valor del pip)',
    points: ['Lotes estándar, mini y micro', 'Valor del pip por par de divisas', 'Ajustado a tu % de riesgo por operación'] },
  { slug: 'calculadora-de-apalancamiento', tab: 'leverage', kw: 'calculadora de apalancamiento',
    title: 'Calculadora de Apalancamiento — Exposición y Margen',
    lead: 'Descubre tu apalancamiento real, el margen que necesitas y la exposición total de tu posición. Entiende cuánto arriesgas de verdad antes de abrir la operación.',
    formula: 'Apalancamiento = Exposición total ÷ Capital',
    points: ['Margen requerido y exposición nocional', 'Apalancamiento efectivo vs. ofrecido', 'Válido para forex, cripto, CFDs y futuros'] },
  { slug: 'calculadora-de-futuros', tab: 'futures', kw: 'calculadora de futuros',
    title: 'Calculadora de Futuros — Margen, Tick y Nocional',
    lead: 'Traduce el tamaño del contrato, el multiplicador y el margen en exposición real: cuánto vale cada tick en dinero y cuál es el valor nocional total de tu posición en futuros.',
    formula: 'Valor por tick = Tamaño del contrato × Tamaño del tick',
    points: ['Valor del tick y del punto', 'Margen inicial y de mantenimiento', 'Exposición nocional real de la posición'] },
  { slug: 'calculadora-precio-objetivo', tab: 'target', kw: 'calculadora de precio objetivo',
    title: 'Calculadora de Precio Objetivo — Take Profit y R:R',
    lead: 'Fija tu take profit según el ratio riesgo/beneficio que buscas y comprueba al instante si la operación merece la pena antes de entrar.',
    formula: 'Objetivo = Entrada ± (Riesgo × Ratio R:R)',
    points: ['Precio objetivo por ratio R:R', 'Beneficio potencial en % y en dinero', 'Valida el R:R mínimo antes de operar'] },
  { slug: 'calculadora-porcentaje-trading', tab: 'percentage', kw: 'calculadora de porcentaje de trading',
    title: 'Calculadora de Porcentaje — Ganancias, Pérdidas y ROI',
    lead: 'Calcula el cambio porcentual entre dos precios, tu ganancia o pérdida y lo que necesitas recuperar tras un drawdown. La matemática básica que todo trader debe dominar.',
    formula: '% = (Precio final − Precio inicial) ÷ Precio inicial × 100',
    points: ['Variación % entre dos precios', 'ROI de la operación', 'Cuánto necesitas para recuperar una pérdida'] },
  { slug: 'calculadora-precio-medio', tab: 'spot', kw: 'calculadora de precio medio',
    title: 'Calculadora de Precio Medio (DCA) — Coste Promedio',
    lead: 'Calcula tu precio de entrada promedio al comprar en varias veces (promediado / DCA) y sabe exactamente a qué precio quedas y qué necesitas para salir en positivo.',
    formula: 'Precio medio = Σ(precio × cantidad) ÷ Σ cantidad',
    points: ['Precio medio ponderado de varias compras', 'Break-even tras promediar', 'Ideal para estrategias DCA en cripto y acciones'] },
  { slug: 'calculadora-fibonacci', tab: 'fibonacci', kw: 'calculadora de fibonacci',
    title: 'Calculadora de Fibonacci — Retrocesos y Extensiones',
    lead: 'Genera automáticamente los niveles de retroceso (23,6 %, 38,2 %, 50 %, 61,8 %) y de extensión de Fibonacci entre dos puntos, para encontrar soportes, resistencias y objetivos.',
    formula: 'Nivel = Máximo − (Rango × ratio Fibonacci)',
    points: ['Retrocesos y extensiones automáticos', 'Zonas de entrada y objetivos', 'Alcista y bajista'] },
  { slug: 'calculadora-patrones-trading', tab: 'pattern', kw: 'calculadora de patrones de trading',
    title: 'Calculadora de Patrones — Entrada, Stop y Objetivo',
    lead: 'A partir de un patrón chartista, calcula la entrada, el stop-loss y el objetivo medido, con su ratio riesgo/beneficio, para operar patrones con reglas y no a ojo.',
    formula: 'Objetivo = ruptura + altura del patrón',
    points: ['Entrada, stop y objetivo medido', 'Ratio R:R del patrón', 'Gestión de riesgo integrada'] },
  { slug: 'simulador-monte-carlo-risk-of-ruin', tab: 'montecarlo', kw: 'simulador monte carlo risk of ruin',
    title: 'Simulador Monte Carlo y Risk of Ruin — Probabilidad de Quiebra',
    lead: 'Simula miles de secuencias de operaciones con tu win rate y tu R:R para ver la distribución de resultados, la peor racha esperada y tu probabilidad real de arruinar la cuenta.',
    formula: 'Miles de simulaciones aleatorias de tu sistema',
    points: ['Probabilidad de ruina según tu riesgo', 'Peor racha de pérdidas esperada', 'Valida si tu sistema es sostenible'] },
  { slug: 'simulador-de-trading', tab: 'simulator', kw: 'simulador de trading',
    title: 'Simulador de Trading — Proyección de Cuenta por Fases',
    lead: 'Proyecta cómo evoluciona tu cuenta con tu win rate, R:R, comisiones e interés compuesto a lo largo de cientos de operaciones. Descubre si tu plan es realista antes de arriesgar dinero real.',
    formula: 'Crecimiento compuesto operación a operación',
    points: ['Proyección por fases con interés compuesto', 'Incluye comisiones y slippage', 'Curva de equity esperada'] },
  { slug: 'calculadora-interes-compuesto-trading', tab: 'compound', kw: 'calculadora de interés compuesto trading',
    title: 'Calculadora de Interés Compuesto para Trading',
    lead: 'Ve cómo crece tu capital reinvirtiendo las ganancias mes a mes con un rendimiento porcentual objetivo. La octava maravilla del mundo aplicada a tu cuenta de trading.',
    formula: 'Capital final = Capital × (1 + %mensual)^meses',
    points: ['Crecimiento compuesto con aportaciones', 'Hitos y gráfico de evolución', 'Expectativas realistas de rentabilidad'] },
];

// ─────────────────────────────────────────────────────────────
// Datos: temas de educación (informacional). app: /education?topic=<value>
// ─────────────────────────────────────────────────────────────
const LEARN = [
  { slug: 'patrones-velas-japonesas', topic: 'candlesticks', kw: 'patrones de velas japonesas',
    title: 'Patrones de Velas Japonesas — Guía Completa con Fiabilidad',
    lead: 'Aprende a leer los patrones de velas japonesas (martillo, envolvente, doji, estrella…) con su tasa de fiabilidad real y si son de continuación o de reversión.',
    points: ['30+ patrones de vela con estadísticas', 'Reversión vs. continuación', 'Cómo confirmarlos antes de operar'] },
  { slug: 'patrones-chartistas', topic: 'chart-patterns', kw: 'patrones chartistas',
    title: 'Patrones Chartistas — Triángulos, Banderas, HCH y más',
    lead: 'Domina los patrones gráficos clásicos (hombro-cabeza-hombro, triángulos, banderas, dobles techos) con su objetivo medido y su fiabilidad.',
    points: ['Continuación y reversión', 'Objetivo medido de cada patrón', 'Fiabilidad estilo Bulkowski'] },
  { slug: 'gestion-del-riesgo-trading', topic: 'risk', kw: 'gestión del riesgo en trading',
    title: 'Gestión del Riesgo en Trading — La Clave de Sobrevivir',
    lead: 'El riesgo es lo primero. Aprende la regla del 1-2 %, el ratio riesgo/beneficio, el riesgo de ruina y cómo dimensionar cada operación para no reventar la cuenta.',
    points: ['Regla del 1-2 % por operación', 'Ratio R:R y expectativa', 'Riesgo de ruina y drawdown'] },
  { slug: 'psicologia-del-trading', topic: 'psychology', kw: 'psicología del trading',
    title: 'Psicología del Trading — Disciplina, Miedo y Codicia',
    lead: 'La mente es el 80 % del trading. Sesgos, control emocional, tilt, revancha y por qué se queman las cuentas — y cómo un profesional gestiona todo eso.',
    points: ['Sesgos y control emocional', 'Protocolo anti-tilt', 'Proceso sobre resultado'] },
  { slug: 'analisis-tecnico', topic: 'tech-analysis', kw: 'análisis técnico',
    title: 'Análisis Técnico — Soportes, Tendencias e Indicadores',
    lead: 'Aprende a leer gráficos: soportes y resistencias, tendencias, escala logarítmica vs lineal, e indicadores clave para anticipar el movimiento del precio.',
    points: ['Soportes, resistencias y tendencias', 'Escala log vs lineal', 'Indicadores esenciales'] },
  { slug: 'fundamentos-del-trading', topic: 'fundamentals', kw: 'qué es el trading',
    title: 'Fundamentos del Trading — Empieza desde Cero',
    lead: 'Qué es el trading, qué mercados existen (forex, acciones, cripto, índices, materias primas), quién los mueve y en qué sesiones — la base para empezar bien.',
    points: ['Mercados y participantes', 'Sesiones de trading', 'Apalancamiento y básicos'] },
  { slug: 'ondas-de-elliott', topic: 'elliott', kw: 'ondas de elliott',
    title: 'Ondas de Elliott — Teoría y Conteo Práctico',
    lead: 'Entiende la teoría de las ondas de Elliott: las 5 ondas impulsivas, las 3 correctivas y cómo usar la estructura del mercado para anticipar movimientos.',
    points: ['Impulsos y correcciones', 'Reglas del conteo', 'Combinación con Fibonacci'] },
  { slug: 'ichimoku-kinko-hyo', topic: 'ichimoku', kw: 'ichimoku kinko hyo',
    title: 'Ichimoku Kinko Hyo — La Nube Explicada',
    lead: 'El indicador japonés todo-en-uno: Tenkan, Kijun, la nube (Kumo) y cómo leer tendencia, soporte, resistencia y señales de un vistazo.',
    points: ['Componentes de la nube', 'Señales de entrada y salida', 'Tendencia de un vistazo'] },
  { slug: 'smart-money-concepts-ict', topic: 'smc', kw: 'smart money concepts',
    title: 'Smart Money Concepts (ICT) — Order Blocks y Liquidez',
    lead: 'Sigue el rastro del dinero institucional: estructura (BOS/CHoCH), order blocks, imbalances (FVG), barridos de liquidez y zonas de mitigación.',
    points: ['BOS, CHoCH y estructura', 'Order blocks y FVG', 'Barridos de liquidez'] },
  { slug: 'metodo-wyckoff', topic: 'wyckoff', kw: 'método wyckoff',
    title: 'Método Wyckoff — Acumulación y Distribución',
    lead: 'Aprende a identificar las fases de acumulación y distribución del Operador Compuesto, y a operar en armonía con el dinero institucional.',
    points: ['Fases de acumulación/distribución', 'Eventos clave (spring, upthrust)', 'Precio, volumen y tiempo'] },
];

// ─────────────────────────────────────────────────────────────
// Plantilla HTML (estática, autocontenida, tema oscuro de marca)
// ─────────────────────────────────────────────────────────────
function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

function page({ url, title, description, h1, kw, section, sectionLabel, sectionUrl, lead, formula, points, ctaUrl, ctaLabel, related, ld }) {
  const canonical = url;
  const relatedHtml = related.map(r => `<li><a href="${esc(r.url)}">${esc(r.label)}</a></li>`).join('');
  const pointsHtml = points.map(p => `<li>${esc(p)}</li>`).join('');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(kw)}, trading, calculadora, TradingCalculator.Pro">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" hreflang="es" href="${esc(canonical)}">
<link rel="alternate" hreflang="x-default" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TradingCalculator.Pro">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(OG_IMAGE)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(OG_IMAGE)}">
${jsonLd(ld)}
${jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Inicio', item: DOMAIN + '/' },
  { '@type': 'ListItem', position: 2, name: sectionLabel, item: sectionUrl },
  { '@type': 'ListItem', position: 3, name: h1, item: canonical },
] })}
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#e5e5e5;line-height:1.65}
a{color:#34d399;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.top{border-bottom:1px solid #1e1e1e;padding:16px 0}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{font-weight:800;color:#fff;font-size:18px}
.brand span{color:#34d399}
nav.top a{color:#a3a3a3;font-size:14px;margin-left:16px}
.crumb{font-size:13px;color:#737373;padding:18px 0 0}
.crumb a{color:#737373}
h1{font-size:30px;line-height:1.25;color:#fff;margin:14px 0 6px}
.lead{font-size:18px;color:#c7c7c7;margin:0 0 22px}
.cta{display:inline-block;background:#22c55e;color:#04120a;font-weight:800;padding:14px 26px;border-radius:10px;margin:10px 0 6px;font-size:16px}
.cta:hover{background:#16a34a;text-decoration:none}
.card{background:#141414;border:1px solid #262626;border-radius:12px;padding:18px 20px;margin:20px 0}
.card h2{font-size:18px;color:#fff;margin:0 0 10px}
.formula{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0f1a12;border:1px solid #14361f;color:#7ee2a8;padding:12px 14px;border-radius:8px;display:block;font-size:15px;overflow-x:auto}
ul{padding-left:20px;margin:8px 0}li{margin:6px 0}
.related{margin:28px 0}
.free{display:inline-block;background:#14361f;color:#4ade80;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em}
footer{border-top:1px solid #1e1e1e;margin-top:40px;padding:24px 0;color:#737373;font-size:13px}
footer a{color:#a3a3a3}
footer .links a{margin-right:16px}
.disc{margin-top:12px;font-size:12px;color:#525252}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="${DOMAIN}/">Trading Calculator <span>PRO</span></a>
  <nav class="top"><a href="${DOMAIN}/">Inicio</a><a href="${DOMAIN}/education">Aprender</a><a href="${DOMAIN}/pricing">Precios</a></nav>
</div></header>
<main class="wrap">
  <div class="crumb"><a href="${DOMAIN}/">Inicio</a> › <a href="${esc(sectionUrl)}">${esc(sectionLabel)}</a> › ${esc(h1)}</div>
  <span class="free">Gratis · 8 idiomas</span>
  <h1>${esc(h1)}</h1>
  <p class="lead">${esc(lead)}</p>
  <a class="cta" href="${esc(ctaUrl)}">${esc(ctaLabel)} →</a>
  ${formula ? `<div class="card"><h2>Fórmula</h2><code class="formula">${esc(formula)}</code></div>` : ''}
  <div class="card"><h2>${section === 'tools' ? 'Qué obtienes' : 'Qué aprenderás'}</h2><ul>${pointsHtml}</ul></div>
  <a class="cta" href="${esc(ctaUrl)}">${esc(ctaLabel)} →</a>
  <div class="related card"><h2>${section === 'tools' ? 'Otras calculadoras' : 'Más temas'}</h2><ul>${relatedHtml}</ul></div>
</main>
<footer><div class="wrap">
  <div class="links"><a href="${DOMAIN}/">Inicio</a><a href="${DOMAIN}/education">Centro de aprendizaje</a><a href="${DOMAIN}/options">Opciones</a><a href="${DOMAIN}/legal">Legal</a></div>
  <div class="disc">TradingCalculator.Pro — herramientas y formación de trading. El contenido es informativo y no constituye asesoramiento financiero. Operar conlleva riesgo de pérdida.</div>
</div></footer>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// Generación
// ─────────────────────────────────────────────────────────────
function writePage(dir, html) {
  const full = path.join(BUILD, dir);
  fs.mkdirSync(full, { recursive: true });
  fs.writeFileSync(path.join(full, 'index.html'), html, 'utf8');
}

const urls = []; // para el sitemap

// Calculadoras
CALCS.forEach((c, i) => {
  const url = `${DOMAIN}/tools/${c.slug}/`;
  const related = CALCS.filter((_, j) => j !== i).slice(0, 6).map(r => ({ url: `${DOMAIN}/tools/${r.slug}/`, label: r.kw.replace(/^\w/, m => m.toUpperCase()) }));
  const description = `${c.lead} Gratis, sin registro. Calculadora profesional de TradingCalculator.Pro.`.slice(0, 158);
  const html = page({
    url, title: c.title, description, h1: c.kw.replace(/^\w/, m => m.toUpperCase()), kw: c.kw,
    section: 'tools', sectionLabel: 'Calculadoras', sectionUrl: `${DOMAIN}/dashboard`,
    lead: c.lead, formula: c.formula, points: c.points,
    ctaUrl: `${DOMAIN}/dashboard?tab=${c.tab}`, ctaLabel: 'Usar la calculadora', related,
    ld: { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: c.title,
      applicationCategory: 'FinanceApplication', operatingSystem: 'Web', url,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, description },
  });
  writePage(`tools/${c.slug}`, html);
  urls.push([`/tools/${c.slug}/`, '0.8', 'monthly']);
});

// Educación
LEARN.forEach((c, i) => {
  const url = `${DOMAIN}/learn/${c.slug}/`;
  const related = LEARN.filter((_, j) => j !== i).slice(0, 6).map(r => ({ url: `${DOMAIN}/learn/${r.slug}/`, label: r.kw.replace(/^\w/, m => m.toUpperCase()) }));
  const description = `${c.lead}`.slice(0, 158);
  const html = page({
    url, title: c.title, description, h1: c.kw.replace(/^\w/, m => m.toUpperCase()), kw: c.kw,
    section: 'learn', sectionLabel: 'Aprender', sectionUrl: `${DOMAIN}/education`,
    lead: c.lead, formula: null, points: c.points,
    ctaUrl: `${DOMAIN}/education?topic=${c.topic}`, ctaLabel: 'Abrir el módulo completo', related,
    ld: { '@context': 'https://schema.org', '@type': 'LearningResource', name: c.title,
      url, learningResourceType: 'Guía', inLanguage: 'es', description,
      provider: { '@type': 'Organization', name: 'TradingCalculator.Pro', url: DOMAIN + '/' } },
  });
  writePage(`learn/${c.slug}`, html);
  urls.push([`/learn/${c.slug}/`, '0.7', 'monthly']);
});

// ─────────────────────────────────────────────────────────────
// Sitemap ampliado (rutas principales + todas las páginas SEO)
// ─────────────────────────────────────────────────────────────
const MAIN = [
  ['/', '1.0', 'weekly'], ['/options', '0.9', 'weekly'], ['/education', '0.9', 'weekly'],
  ['/performance', '0.8', 'weekly'], ['/pricing', '0.85', 'monthly'], ['/about', '0.7', 'monthly'],
  ['/contact', '0.6', 'monthly'], ['/legal', '0.4', 'yearly'],
];
const all = [...MAIN, ...urls];
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  all.map(([p, pr, cf]) => `  <url><loc>${DOMAIN}${p}</loc><lastmod>${LASTMOD}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`).join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(BUILD, 'sitemap.xml'), sitemap, 'utf8');

console.log(`✅ SEO pages: ${CALCS.length} calculadoras + ${LEARN.length} temas = ${CALCS.length + LEARN.length} páginas estáticas`);
console.log(`✅ sitemap.xml: ${all.length} URLs`);
