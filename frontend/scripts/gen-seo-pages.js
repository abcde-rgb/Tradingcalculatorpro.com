#!/usr/bin/env node
/* eslint-disable */
/**
 * Genera páginas estáticas indexables (SEO) dentro de `build/`, MULTI-IDIOMA:
 *   - Educación: 1 página por tema × N idiomas (ver LANGS), con el título+intro REALES ya
 *     traducidos en los archivos i18n (src/lib/i18n/*.js). Contenido de calidad
 *     sin inventar.
 *   - Calculadoras: 1 página por calculadora en es + en (páginas comerciales).
 *
 * URLs: es = /tools|/learn (por defecto). Otros idiomas = /<lang>/tools|/<lang>/learn.
 * Cada página lleva hreflang a todas sus versiones de idioma + x-default.
 * Se ejecuta como `postbuild` (tras craco build) y regenera build/sitemap.xml.
 *
 * ⚠️ DOMINIO: sale de `SITE_ORIGIN` y debe coincidir con useSEO.js, robots.txt,
 * el canonical de index.html y el PUBLIC_URL del workflow. Cambiarlo solo aquí
 * deja el canonical apuntando a otro sitio. Ver docs/MIGRACION_DOMINIO.md.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEFAULT_ORIGIN = 'https://tradingcalculator.pro';
const DOMAIN = (process.env.SITE_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
const BUILD = path.join(__dirname, '..', 'build');
const I18N_DIR = path.join(__dirname, '..', 'src', 'lib', 'i18n');
const OG_IMAGE = `${DOMAIN}/og-image.png`;
// Último recurso, cuando no hay git o el fichero es nuevo y sin historial
// todavía: la fecha de HOY. Es exactamente lo que había antes en TODAS las
// páginas — la diferencia es que ahora sólo se usa cuando de verdad no hay
// nada mejor que mirar, no siempre.
const LASTMOD = new Date().toISOString().slice(0, 10);

// ─── lastmod real, no la fecha del build ───────────────────────────────────
//
// Las 1.685 URLs llevaban la MISMA fecha porque `LASTMOD` se calculaba una vez
// y se estampaba en todo: cada despliegue afirmaba que las 1.685 páginas
// habían cambiado, aunque la mayoría no lo hicieran. Un buscador que compara
// esa afirmación con el contenido real deja de fiarse del campo — y entonces
// tampoco avisa cuando una página SÍ cambia.
//
// La fecha real es la del último commit que tocó el fichero fuente del
// contenido de esa página — no la del código que la genera, la del texto que
// pinta. `git log -1` sobre varios ficheros a la vez da la fecha del MÁS
// reciente de todos, que es justo la semántica que hace falta cuando el
// contenido de una página sale de más de un sitio (el cuerpo en un fichero,
// el nombre traducido en otro).
//
// Memoizado por la combinación exacta de rutas: con 10 idiomas × 4 tipos de
// página esto son ~25 invocaciones de `git log` en todo el build, no 1.685.
const _fechasGit = new Map();
let _fallosFecha = 0;
function fechaReal(...rutas) {
  const clave = rutas.join('|');
  if (_fechasGit.has(clave)) return _fechasGit.get(clave);
  let fecha = null;
  try {
    // `process.cwd()` es `frontend/` — así se invoca siempre este script (npm
    // postbuild), y las rutas de abajo son relativas a esa raíz.
    // UN SOLO `--`: un segundo `--` no es "otro separador", es un pathspec
    // literal que no casa nada, y git lo tolera en silencio — deja de filtrar
    // por ruta y devuelve el último commit del repo entero. Con más de una
    // ruta (tema = `<lang>.js` + `<lang>.edu.js`, estrategia = `mockData.js` +
    // `<lang>.js`…) eso convertía CADA fecha "real" en la fecha de commit más
    // reciente de todo el repositorio: el mismo lastmod-uniforme que este
    // fichero existe para evitar, sólo que agazapado detrás de fechas que sí
    // cambiaban de un build a otro y por eso no saltaba a la vista.
    const args = rutas.map((r) => JSON.stringify(r)).join(' ');
    const salida = execSync(`git log -1 --format=%cd --date=short -- ${args}`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (salida) fecha = salida;
  } catch {
    // Sin git, sin repositorio, o un clon superficial sin el commit que tocó
    // este fichero. Cae al build-date — igual que antes de este cambio — en
    // vez de romper el build por una fecha que no es crítica.
  }
  if (!fecha) { fecha = LASTMOD; _fallosFecha += 1; }
  _fechasGit.set(clave, fecha);
  return fecha;
}

// idioma → prefijo de ruta ('' para es) y código hreflang
const LANGS = [
  ['es', '', 'es'], ['en', '/en', 'en'], ['de', '/de', 'de'], ['fr', '/fr', 'fr'],
  ['ru', '/ru', 'ru'], ['zh', '/zh', 'zh-CN'], ['ja', '/ja', 'ja'], ['ar', '/ar', 'ar'],
  ['pt', '/pt', 'pt'], ['it', '/it', 'it'],
];
const RTL = new Set(['ar']);
const PREF = new Map(LANGS.map(([l, p]) => [l, p ? `${p.slice(1)}/` : '']));

// ─── Hubs de sección ──────────────────────────────────────────────
// Las 1.640 páginas eran HUÉRFANAS: ni una sola salía enlazada desde la
// aplicación, y entre ellas sólo se citaban seis «relacionadas». Un buscador
// las conocía únicamente por el sitemap, que descubre pero no reparte
// autoridad. Estos índices por idioma y sección son el esqueleto que faltaba:
// cada página enlaza a los cuatro, y cada hub enlaza a todas las suyas.
//
// ⚠️ Ninguna de estas rutas puede pisar una del SPA (`src/App.js`). `/learn`,
// `/tools`, `/markets` y `/strategies` están libres. `/options/strategies` NO
// lo está —es `OptionsStrategiesIndexPage`, premium—, y por eso el hub de
// estrategias vive en `/strategies/` aunque sus fichas cuelguen de
// `/options/strategies/<slug>/`: publicar un fichero ahí le robaría la pantalla
// al cliente que paga cuando recargue la página.
const SECCIONES = ['learn', 'tools', 'markets', 'strategies', 'patterns', 'candles'];
const hub = (lang, seccion) => `${DOMAIN}/${PREF.get(lang) || ''}${seccion}/`;

// Cargar traducciones de cada idioma (mismo truco que la auditoría i18n)
// Academy strings live in `<lang>.edu.js` (lazy chunk at runtime); the static
// page generator needs both halves merged.
const readDict = (file) => {
  if (!fs.existsSync(file)) return {};
  const src = fs.readFileSync(file, 'utf8').replace(/export\s+default\s+/, 'return ');
  return new Function(src)();
};
const T = {};
for (const [lang] of LANGS) {
  T[lang] = {
    ...readDict(path.join(I18N_DIR, lang + '.js')),
    ...readDict(path.join(I18N_DIR, lang + '.edu.js')),
  };
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (s) => String(s).replace(/^\w/, (m) => m.toUpperCase());

// ─── Recorte de la meta description ───────────────────────────────
// Estaba escrito como `.slice(0, 158)` en los cuatro generadores, y partía la
// última palabra por la mitad en las 1.640 páginas. La rusa de `operar-noticias`
// terminaba en «… сгоревшим счётом. И» — la «И» es el arranque de «Используйте».
//
// No es cosmético: un buscador que ve una descripción truncada a media palabra
// la descarta y se inventa el resumen con el texto de la página. En esa página
// el texto que eligió Yandex fue el descargo del pie, que es lo que sale hoy en
// sus resultados como si fuera la descripción del tema.
//
// Se corta en la última frontera de palabra antes del límite, y sólo se añaden
// puntos suspensivos si de verdad se ha cortado algo.
const recortar = (texto, max = 158) => {
  const s = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const corte = s.slice(0, max - 1);
  const ultimo = corte.lastIndexOf(' ');
  // Sin espacios (chino, japonés) no hay frontera que respetar: se corta y ya.
  const base = (ultimo > max * 0.5 ? corte.slice(0, ultimo) : corte).replace(/[\s,;:·—–-]+$/, '');
  // Si el corte cae justo detrás de un punto, la frase ya está cerrada y los
  // puntos suspensivos sobran («… счётом.…» se leía como una errata).
  return /[.!?。！？]$/.test(base) ? base : `${base}…`;
};

// ─── og:locale ────────────────────────────────────────────────────
// Open Graph exige `idioma_TERRITORIO`; el generador emitía el código a secas
// (`content="ru"`), que Facebook, LinkedIn y WhatsApp descartan por inválido.
const OG_LOCALE = {
  es: 'es_ES', en: 'en_US', de: 'de_DE', fr: 'fr_FR', ru: 'ru_RU',
  zh: 'zh_CN', ja: 'ja_JP', ar: 'ar_SA', pt: 'pt_PT', it: 'it_IT',
};
// Caída a `es_ES`, NO al código corto: el código corto es exactamente el valor
// inválido que esto viene a quitar.
const ogLocale = (lang) => OG_LOCALE[lang] || OG_LOCALE.es;

// ─── Iconos ───────────────────────────────────────────────────────
// Ninguna de las 1.640 páginas declaraba un `rel="icon"`. Un buscador que
// indexa una página profunda y no encuentra icono declarado pinta el globo
// genérico en el resultado — que es exactamente lo que le pasa hoy al sitio en
// Yandex. La CSP de estas páginas ya permite `img-src 'self'`, así que no hay
// nada más que abrir.
//
// ⚠️ Rutas RELATIVAS a la raíz, no absolutas. Con `https://tradingcalculator.pro/…`
// el navegador trata el icono como un origen distinto en cuanto la página se
// sirve desde otro sitio, y la CSP de arriba —`img-src 'self'`— lo bloquea:
// la sonda `tests/e2e/navegador/csp.js` lo cazó con 31 violaciones sirviendo el
// build desde `127.0.0.1`. En producción habría funcionado por casualidad, sólo
// mientras el dominio coincidiera; se rompía en el banco de pruebas, en la URL
// de proyecto de GitHub Pages —que se conserva como red de seguridad si cae el
// DNS— y en cualquier previsualización.
//
// Relativas funcionan en los tres casos y son lo que ya hace `public/index.html`
// (`%PUBLIC_URL%/favicon.ico` con `PUBLIC_URL: /`). El `og:image` sí sigue
// siendo absoluto, y debe serlo: no lo carga la página, lo pide Facebook.
const ICONOS = () => `<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#080808">`;

// ─── Slugs por idioma ─────────────────────────────────────────────
// Hasta ahora TODOS los idiomas colgaban del slug español:
// `/ru/learn/operar-noticias/`, `/ja/tools/calculadora-de-apalancamiento/`.
// La URL es una señal de relevancia y ahí no decía nada en el idioma de quien
// busca. El slug se deriva ahora del título ya traducido.
//
// El cirílico se translitera (ГОСТ 7.79-2000 sistema B, el mismo criterio con
// el que Yandex construye sus propias URLs). Los idiomas sin alfabeto latino
// —zh, ja, ar— no dan nada legible al transliterar, así que caen al slug
// inglés: es preferible a una URL percent-encoded de cien caracteres.
//
// ⚠️ `es` NO se deriva: conserva el slug escrito a mano en CALCS/TOPICS. Es el
// único idioma con indexación consolidada y moverlo sería tirarla.
const CIRILICO = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y',
  к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f',
  х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
};

const slugificar = (texto) => String(texto == null ? '' : texto)
  .toLowerCase()
  .replace(/[а-яё]/g, (c) => (c in CIRILICO ? CIRILICO[c] : c))
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quita tildes y diéresis
  .replace(/[ß]/g, 'ss').replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[đ]/g, 'd')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Recorta el slug sin partir una palabra: una URL de 120 caracteres no ayuda a
// nadie y los buscadores sólo pesan las primeras.
const slugCorto = (s, max = 60) => {
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const guion = corte.lastIndexOf('-');
  return (guion > max * 0.5 ? corte.slice(0, guion) : corte).replace(/-+$/, '');
};

/**
 * Slug definitivo de una entrada para un idioma.
 *
 * @param lang     idioma de destino
 * @param base     slug español escrito a mano (el que ya está indexado)
 * @param titulos  { lang: título traducido } para derivar el resto
 * @param usados   Set por (idioma+sección) que garantiza unicidad
 */
function slugPara(lang, base, titulos, usados) {
  // El español no se deriva, pero SÍ se registra: si no, un slug derivado de
  // otro idioma podría chocar con él sin que nadie se entere.
  if (lang === 'es') { usados.add(base); return base; }
  let s = slugCorto(slugificar(titulos[lang] || ''));
  if (!s) s = slugCorto(slugificar(titulos.en || ''));  // zh, ja, ar
  if (!s) s = base;                                     // último recurso
  // Dos temas distintos pueden dar el mismo slug al recortar. El sufijo es
  // determinista: depende sólo del orden del catálogo, así que la URL de una
  // página no cambia porque se añada otra detrás.
  let final = s, n = 2;
  while (usados.has(final)) { final = `${s}-${n}`; n += 1; }
  usados.add(final);
  return final;
}

// Páginas puente para las URLs que se mueven.
//
// GitHub Pages no sirve cabeceras, así que un 301 de verdad es imposible: lo
// más fuerte que se puede publicar es `canonical` + `meta refresh` a cero, que
// Google y Yandex tratan como redirección permanente. NO llevan `noindex`
// —sería contradictorio con el canonical— y NO entran en el sitemap: existen
// para que los enlaces y la indexación viejos no caigan en un 404.
const puentes = [];
function puente(relViejo, urlNueva, etiqueta) {
  puentes.push([relViejo, urlNueva, etiqueta]);
}

// ─── Publicidad (Google AdSense) ──────────────────────────────────
// Estas páginas son HTML plano: no hay React, ni sesión, ni store. Para no
// romper la promesa de "quien paga no ve anuncios" se replica aquí, en
// ─── UI localizada mínima (breadcrumb, CTAs, etc.) ────────────────
const UI = {
  es: { trial:'Empieza 7 días gratis', home:'Inicio', learn:'Aprender', prices:'Precios', calcs:'Calculadoras', useCalc:'Usar la calculadora', openModule:'Abrir el módulo completo', whatGet:'Qué obtienes', whatLearn:'Qué aprenderás', formula:'Fórmula', otherCalcs:'Otras calculadoras', moreTopics:'Más temas', free:'7 días gratis', markets:'Mercados', strategies:'Estrategias de opciones', disc:'TradingCalculator.Pro — herramientas y formación de trading. Contenido informativo, no es asesoramiento financiero. Operar conlleva riesgo de pérdida.' },
  en: { trial:'Start your 7-day free trial', home:'Home', learn:'Learn', prices:'Pricing', calcs:'Calculators', useCalc:'Use the calculator', openModule:'Open the full module', whatGet:'What you get', whatLearn:'What you will learn', formula:'Formula', otherCalcs:'Other calculators', moreTopics:'More topics', free:'7-day free trial', markets:'Markets', strategies:'Options strategies', disc:'TradingCalculator.Pro — trading tools and education. Informational content, not financial advice. Trading involves risk of loss.' },
  de: { trial:'7 Tage gratis starten', home:'Start', learn:'Lernen', prices:'Preise', calcs:'Rechner', useCalc:'Rechner öffnen', openModule:'Vollständiges Modul öffnen', whatGet:'Was du bekommst', whatLearn:'Was du lernst', formula:'Formel', otherCalcs:'Weitere Rechner', moreTopics:'Weitere Themen', free:'7 Tage gratis', markets:'Märkte', strategies:'Optionsstrategien', disc:'TradingCalculator.Pro — Trading-Tools und -Ausbildung. Informativ, keine Finanzberatung. Trading birgt Verlustrisiko.' },
  fr: { trial:'Commencer 7 jours gratuits', home:'Accueil', learn:'Apprendre', prices:'Tarifs', calcs:'Calculatrices', useCalc:'Utiliser la calculatrice', openModule:'Ouvrir le module complet', whatGet:'Ce que vous obtenez', whatLearn:'Ce que vous apprendrez', formula:'Formule', otherCalcs:'Autres calculatrices', moreTopics:'Plus de thèmes', free:'7 jours gratuits', markets:'Marchés', strategies:'Stratégies d’options', disc:'TradingCalculator.Pro — outils et formation de trading. Contenu informatif, pas un conseil financier. Le trading comporte un risque de perte.' },
  ru: { trial:'Начать 7 дней бесплатно', home:'Главная', learn:'Обучение', prices:'Цены', calcs:'Калькуляторы', useCalc:'Открыть калькулятор', openModule:'Открыть полный модуль', whatGet:'Что вы получите', whatLearn:'Чему вы научитесь', formula:'Формула', otherCalcs:'Другие калькуляторы', moreTopics:'Ещё темы', free:'7 дней бесплатно', markets:'Рынки', strategies:'Опционные стратегии', disc:'TradingCalculator.Pro — инструменты и обучение трейдингу. Информационный контент, не инвестсовет. Торговля сопряжена с риском убытков.' },
  zh: { trial:'开始 7 天免费试用', home:'首页', learn:'学习', prices:'价格', calcs:'计算器', useCalc:'使用计算器', openModule:'打开完整模块', whatGet:'你将获得', whatLearn:'你将学到', formula:'公式', otherCalcs:'其他计算器', moreTopics:'更多主题', free:'7 天免费试用', markets:'市场', strategies:'期权策略', disc:'TradingCalculator.Pro — 交易工具与教育。仅供参考，非投资建议。交易有亏损风险。' },
  ja: { trial:'7日間の無料体験を始める', home:'ホーム', learn:'学ぶ', prices:'料金', calcs:'計算ツール', useCalc:'計算ツールを使う', openModule:'モジュール全体を開く', whatGet:'得られるもの', whatLearn:'学べること', formula:'計算式', otherCalcs:'他の計算ツール', moreTopics:'他のテーマ', free:'7日間無料', markets:'マーケット', strategies:'オプション戦略', disc:'TradingCalculator.Pro — トレーディングのツールと教育。情報提供のみで投資助言ではありません。取引には損失リスクがあります。' },
  ar: { trial:'ابدأ 7 أيام مجانًا', home:'الرئيسية', learn:'تعلّم', prices:'الأسعار', calcs:'الحاسبات', useCalc:'استخدم الحاسبة', openModule:'افتح الوحدة كاملة', whatGet:'ما ستحصل عليه', whatLearn:'ما ستتعلمه', formula:'الصيغة', otherCalcs:'حاسبات أخرى', moreTopics:'مواضيع أخرى', free:'7 أيام مجانًا', markets:'الأسواق', strategies:'استراتيجيات الخيارات', disc:'TradingCalculator.Pro — أدوات وتعليم التداول. محتوى إعلامي وليس نصيحة مالية. التداول ينطوي على مخاطر خسارة.' },
  pt: { trial:'Comece 7 dias grátis', home:'Início', learn:'Aprender', prices:'Preços', calcs:'Calculadoras', useCalc:'Usar a calculadora', openModule:'Abrir o módulo completo', whatGet:'O que obtém', whatLearn:'O que vai aprender', formula:'Fórmula', otherCalcs:'Outras calculadoras', moreTopics:'Mais temas', free:'7 dias grátis', markets:'Mercados', strategies:'Estratégias de opções', disc:'TradingCalculator.Pro — ferramentas e formação de trading. Conteúdo informativo, não é aconselhamento financeiro. Operar acarreta risco de perda.' },
  it: { trial:'Inizia 7 giorni gratis', home:'Home', learn:'Impara', prices:'Prezzi', calcs:'Calcolatrici', useCalc:'Usa la calcolatrice', openModule:'Apri il modulo completo', whatGet:'Cosa ottieni', whatLearn:'Cosa imparerai', formula:'Formula', otherCalcs:'Altre calcolatrici', moreTopics:'Altri temi', free:'7 giorni gratis', markets:'Mercati', strategies:'Strategie in opzioni', disc:'TradingCalculator.Pro — strumenti e formazione sul trading. Contenuto informativo, non è consulenza finanziaria. Fare trading comporta il rischio di perdita.' },
};

// ─── Calculadoras: es + en (páginas comerciales) ──────────────────
// tab = deep-link /dashboard?tab=<tab>. formula es casi universal (notación).
const HOWTO = {
 "es": [
  "Cómo se usa",
  "Introduce tus datos: los términos de la fórmula (capital, riesgo, precios y stop).",
  "La calculadora aplica la fórmula y devuelve el resultado en las unidades de tu instrumento.",
  "Comprueba el desglose antes de operar: si un dato no se puede calcular, se muestra vacío, nunca como cero."
 ],
 "en": [
  "How to use it",
  "Enter your inputs: the terms of the formula (capital, risk, prices and stop).",
  "The calculator applies the formula and returns the result in your instrument's units.",
  "Check the breakdown before trading: anything that cannot be computed is shown empty, never as zero."
 ],
 "de": [
  "So wird er benutzt",
  "Gib deine Daten ein: die Terme der Formel (Kapital, Risiko, Kurse und Stopp).",
  "Der Rechner wendet die Formel an und liefert das Ergebnis in den Einheiten deines Instruments.",
  "Prüfe die Aufschlüsselung vor dem Handeln: Was sich nicht berechnen lässt, bleibt leer — nie null."
 ],
 "fr": [
  "Comment l'utiliser",
  "Saisis tes données : les termes de la formule (capital, risque, prix et stop).",
  "La calculatrice applique la formule et renvoie le résultat dans les unités de ton instrument.",
  "Vérifie le détail avant de trader : ce qui ne peut pas être calculé reste vide, jamais zéro."
 ],
 "ru": [
  "Как пользоваться",
  "Введите данные: члены формулы (капитал, риск, цены и стоп).",
  "Калькулятор применяет формулу и выдаёт результат в единицах вашего инструмента.",
  "Проверьте разбор перед сделкой: то, что нельзя вычислить, показывается пустым, а не нулём."
 ],
 "zh": [
  "如何使用",
  "输入你的数据：公式中的各项（资金、风险、价格与止损）。",
  "计算器套用公式，并以你所选品种的单位给出结果。",
  "下单前先看明细：无法计算的项目会留空，而不会显示为零。"
 ],
 "ja": [
  "使い方",
  "データを入力します：計算式の各項（資金、リスク、価格、ストップ）。",
  "計算機が式を適用し、対象銘柄の単位で結果を返します。",
  "発注前に内訳を確認してください。算出できない項目は空欄で表示され、ゼロにはなりません。"
 ],
 "ar": [
  "كيفية الاستخدام",
  "أدخل بياناتك: حدود المعادلة (رأس المال، المخاطرة، الأسعار ووقف الخسارة).",
  "تطبّق الآلة الحاسبة المعادلة وتعيد النتيجة بوحدات أداتك.",
  "راجع التفصيل قبل التداول: ما لا يمكن حسابه يظهر فارغًا، لا صفرًا."
 ],
 "pt": [
  "Como se usa",
  "Introduz os teus dados: os termos da fórmula (capital, risco, preços e stop).",
  "A calculadora aplica a fórmula e devolve o resultado nas unidades do teu instrumento.",
  "Confere o detalhe antes de operar: o que não se pode calcular aparece vazio, nunca como zero."
 ],
 "it": [
  "Come si usa",
  "Inserisci i tuoi dati: i termini della formula (capitale, rischio, prezzi e stop).",
  "La calcolatrice applica la formula e restituisce il risultato nelle unità del tuo strumento.",
  "Controlla il dettaglio prima di operare: ciò che non si può calcolare resta vuoto, mai zero."
 ]
};

const CALCS = [
  { slug: 'calculadora-tamano-posicion', tab: 'position', formula: 'Size = (Capital × Risk%) ÷ Stop distance',
    es: { title:'Calculadora de Tamaño de Posición — Riesgo por Operación', kw:'calculadora de tamaño de posición', lead:'Calcula exactamente cuántas unidades, lotes o contratos operar para arriesgar solo el porcentaje de tu cuenta que decidas por operación.', pts:['Arriesga siempre un % fijo y controlado (1-2 %)','Acciones, forex, cripto, índices y futuros','Evita el error nº1: el sobreapalancamiento'] },
    en: { title:'Position Size Calculator — Risk per Trade', kw:'position size calculator', lead:'Work out exactly how many units, lots or contracts to trade so you risk only the percentage of your account you choose per trade.', pts:['Always risk a fixed, controlled % (1-2%)','Stocks, forex, crypto, indices and futures','Avoids the #1 account killer: overleverage'] } },
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
  { slug: 'calculadora-margen-cruzado', tab: 'cross-margin', formula: 'Margin level = Equity ÷ Used margin × 100',
    es: { title:'Calculadora de Margen Cruzado — Margin Level y Stop-Out', kw:'calculadora de margen cruzado', lead:'Comprueba si tu bróker te dejará abrir el siguiente tramo, cuánto puede moverse el precio en contra antes del stop-out y por qué el margen cruzado puede liquidarte antes que el aislado.', pts:['Margin level, margen libre y precio de stop-out','El tramo que el bróker rechaza, antes de mandarlo','Aislado frente a cruzado sobre la misma posición'] },
    en: { title:'Cross Margin Calculator — Margin Level & Stop-Out', kw:'cross margin calculator', lead:'Check whether your broker will let you open the next rung, how far price can move against you before the stop-out, and why cross margin can liquidate you sooner than isolated.', pts:['Margin level, free margin and stop-out price','The rung the broker rejects, before you send it','Isolated vs cross on the very same position'] } },
  { slug: 'calculadora-interes-compuesto-trading', tab: 'compound', formula: 'Final = Capital × (1 + monthly%)^months',
    es: { title:'Calculadora de Interés Compuesto para Trading', kw:'calculadora de interés compuesto trading', lead:'Ve cómo crece tu capital reinvirtiendo las ganancias mes a mes con un rendimiento porcentual objetivo.', pts:['Crecimiento compuesto con aportaciones','Hitos y gráfico de evolución','Expectativas realistas de rentabilidad'] },
    en: { title:'Compound Interest Calculator for Trading', kw:'trading compound interest calculator', lead:'See how your capital grows by reinvesting profits month after month at a target percentage return.', pts:['Compound growth with contributions','Milestones and growth chart','Realistic return expectations'] } },
];

// ─── Calculadoras: traducciones de/fr/ru/zh/ja/ar (es+en van inline arriba) ──
// Mismos campos que es/en: { title, kw, lead, pts[3] }. Se fusiona en el bucle.
const CALC_I18N = {
  'calculadora-margen-cruzado': {
    de:{ title:`Cross-Margin-Rechner — Margin-Level & Stop-out`, kw:`Cross-Margin-Rechner`, lead:`Prüfe, ob dein Broker die nächste Sprosse zulässt, wie weit sich der Kurs gegen dich bewegen darf, bevor der Stop-out greift, und warum Cross-Margin früher liquidieren kann als isolierte Margin.`, pts:[`Margin-Level, freie Margin und Stop-out-Kurs`,`Die Sprosse, die der Broker ablehnt — vor dem Absenden`,`Isoliert gegen Cross auf derselben Position`] },
    fr:{ title:`Calculateur de Marge Croisée — Niveau de Marge et Stop-out`, kw:`calculateur de marge croisée`, lead:`Vérifiez si votre courtier vous laissera ouvrir l'échelon suivant, de combien le prix peut aller contre vous avant le stop-out, et pourquoi la marge croisée peut liquider plus tôt que la marge isolée.`, pts:[`Niveau de marge, marge libre et prix de stop-out`,`L'échelon que le courtier refuse, avant de l'envoyer`,`Isolée contre croisée sur la même position`] },
    ru:{ title:`Калькулятор кросс-маржи — уровень маржи и стоп-аут`, kw:`калькулятор кросс-маржи`, lead:`Проверьте, позволит ли брокер открыть следующую ступень, насколько цена может уйти против вас до стоп-аута и почему кросс-маржа может ликвидировать раньше изолированной.`, pts:[`Уровень маржи, свободная маржа и цена стоп-аута`,`Ступень, которую брокер отклонит, — до отправки`,`Изолированная против кросс на той же позиции`] },
    zh:{ title:`全仓保证金计算器 — 保证金比例与强平`, kw:`全仓保证金计算器`, lead:`检验经纪商是否允许你开出下一级、价格在强平前还能逆向走多远，以及为什么全仓可能比逐仓更早把你平掉。`, pts:[`保证金比例、可用保证金与强平价格`,`在下单之前就看到会被拒绝的那一级`,`同一笔仓位下逐仓与全仓的对比`] },
    ja:{ title:`クロスマージン計算ツール — 証拠金維持率とストップアウト`, kw:`クロスマージン 計算`, lead:`次の段をブローカーが通すか、ストップアウトまで価格がどこまで逆行できるか、そしてなぜクロスマージンが分離マージンより早くロスカットされうるのかを確認できます。`, pts:[`証拠金維持率・余剰証拠金・ストップアウト価格`,`発注する前にわかる「通らない段」`,`同じポジションでの分離とクロスの比較`] },
    ar:{ title:`حاسبة الهامش المتقاطع — مستوى الهامش والإغلاق الإجباري`, kw:`حاسبة الهامش المتقاطع`, lead:`تحقق مما إذا كان وسيطك سيسمح لك بفتح الدرجة التالية، وكم يمكن للسعر أن يتحرك ضدك قبل الإغلاق الإجباري، ولماذا قد يصفّيك الهامش المتقاطع قبل المعزول.`, pts:[`مستوى الهامش والهامش الحر وسعر الإغلاق الإجباري`,`الدرجة التي يرفضها الوسيط، قبل إرسالها`,`المعزول مقابل المتقاطع على المركز نفسه`] },
    pt:{ title:`Calculadora de Margem Cruzada — Margin Level e Stop-Out`, kw:`calculadora de margem cruzada`, lead:`Verifique se o seu corretor o deixará abrir o degrau seguinte, quanto o preço pode andar contra si antes do stop-out e porque a margem cruzada pode liquidar antes da isolada.`, pts:[`Margin level, margem livre e preço de stop-out`,`O degrau que o corretor rejeita, antes de o enviar`,`Isolada contra cruzada na mesma posição`] },
    it:{ title:`Calcolatrice del Margine Incrociato — Margin Level e Stop-Out`, kw:`calcolatrice margine incrociato`, lead:`Verifica se il tuo broker ti lascerà aprire il gradino successivo, quanto il prezzo può muoversi contro di te prima dello stop-out e perché il margine incrociato può liquidare prima di quello isolato.`, pts:[`Margin level, margine libero e prezzo di stop-out`,`Il gradino che il broker rifiuta, prima di inviarlo`,`Isolato contro incrociato sulla stessa posizione`] },
  },
  'calculadora-tamano-posicion': {
    de:{ title:`Positionsgrößen-Rechner — Kostenlos & Professionell`, kw:`Positionsgrößen-Rechner`, lead:`Berechne genau, wie viele Einheiten, Lots oder Kontrakte du handeln musst, um pro Trade nur den von dir gewählten Prozentsatz deines Kontos zu riskieren.`, pts:[`Riskiere immer einen festen, kontrollierten Prozentsatz (1–2 %)`,`Aktien, Forex, Krypto, Indizes und Futures`,`Vermeidet den häufigsten Fehler: Überhebelung`] },
    fr:{ title:`Calculateur de Taille de Position — Risque par Trade`, kw:`Calculateur de taille de position`, lead:`Calculez exactement combien d'unités, de lots ou de contrats trader pour ne risquer que le pourcentage de votre compte choisi par trade.`, pts:[`Risquez toujours un % fixe et maîtrisé (1–2 %)`,`Actions, forex, crypto, indices et futures`,`Évite l'erreur n°1 : le surlevier`] },
    ru:{ title:`Калькулятор размера позиции — бесплатно и профессионально`, kw:`Калькулятор размера позиции`, lead:`Точно рассчитайте, сколько единиц, лотов или контрактов торговать, чтобы рисковать только выбранным процентом счёта на сделку.`, pts:[`Всегда рискуйте фиксированным контролируемым % (1–2 %)`,`Акции, форекс, крипто, индексы и фьючерсы`,`Избегает ошибки №1 — избыточного плеча`] },
    zh:{ title:`仓位大小计算器 — 免费且专业`, kw:`仓位大小计算器`, lead:`精确计算应交易多少单位、手数或合约，使每笔交易只承担你所选择的账户百分比风险。`, pts:[`始终以固定、可控的百分比（1–2%）承担风险`,`股票、外汇、加密货币、指数和期货`,`避免头号错误：过度杠杆`] },
    ja:{ title:`ポジションサイズ計算ツール — 無料でプロ仕様`, kw:`ポジションサイズ計算`, lead:`1回の取引で口座の決めた割合だけをリスクにするために、何単位・何ロット・何枚を取引すべきかを正確に計算します。`, pts:[`常に一定で管理された割合（1〜2%）でリスクを取る`,`株式・FX・仮想通貨・指数・先物`,`最大の失敗「過剰レバレッジ」を回避`] },
    ar:{ title:`حاسبة حجم المركز — مجانية واحترافية`, kw:`حاسبة حجم المركز`, lead:`احسب بدقة عدد الوحدات أو اللوتات أو العقود التي يجب تداولها لتخاطر فقط بالنسبة المئوية التي تختارها من حسابك في كل صفقة.`, pts:[`خاطر دائمًا بنسبة ثابتة ومنضبطة (1–2%)`,`الأسهم والفوركس والعملات الرقمية والمؤشرات والعقود الآجلة`,`يتجنب الخطأ الأول: الرافعة المفرطة`] },
    pt:{ title:`Calculadora de Tamanho de Posição — Risco por Operação`, kw:`calculadora de tamanho de posição`, lead:`Calcule exatamente quantas unidades, lotes ou contratos operar para arriscar apenas a percentagem da sua conta que decidir por operação.`, pts:[`Arrisque sempre uma % fixa e controlada (1-2 %)`,`Ações, forex, cripto, índices e futuros`,`Evita o erro n.º 1: a sobrealavancagem`] },
    it:{ title:`Calcolatrice della Size di Posizione — Rischio per Operazione`, kw:`calcolatrice size posizione`, lead:`Calcola esattamente quante unità, lotti o contratti operare per rischiare solo la percentuale del tuo conto che decidi per ogni operazione.`, pts:[`Rischia sempre una % fissa e controllata (1-2 %)`,`Azioni, forex, cripto, indici e futures`,`Evita l'errore n.1: la leva eccessiva`] },
  },
  'calculadora-de-lotes-forex': {
    de:{ title:`Forex-Lot-Rechner — Lotgröße & Pip-Wert`, kw:`Forex-Lot-Rechner`, lead:`Rechne dein Risiko in Euro/Dollar in die richtige Lotgröße (Standard, Mini oder Micro) um – anhand deines Paars, deines Stops in Pips und deines Kapitals.`, pts:[`Standard-, Mini- und Micro-Lots`,`Pip-Wert je Währungspaar`,`An dein Risiko-% pro Trade angepasst`] },
    fr:{ title:`Calculateur de Lots Forex — Taille de Lot et Valeur du Pip`, kw:`Calculateur de lots forex`, lead:`Convertissez votre risque en euros/dollars en la bonne taille de lot (standard, mini ou micro) selon votre paire, votre stop en pips et votre capital.`, pts:[`Lots standard, mini et micro`,`Valeur du pip par paire de devises`,`Ajusté à votre % de risque par trade`] },
    ru:{ title:`Калькулятор лотов форекс — размер лота и стоимость пункта`, kw:`Калькулятор лотов форекс`, lead:`Переведите свой риск в долларах в правильный размер лота (стандарт, мини или микро) с учётом пары, стопа в пунктах и капитала.`, pts:[`Стандартные, мини- и микролоты`,`Стоимость пункта по каждой паре`,`С учётом вашего % риска на сделку`] },
    zh:{ title:`外汇手数计算器 — 手数与点值`, kw:`外汇手数计算器`, lead:`根据货币对、以点数计的止损和资金，将你以美元计的风险换算为正确的手数（标准、迷你或微型）。`, pts:[`标准手、迷你手和微型手`,`各货币对的点值`,`匹配你每笔交易的风险百分比`] },
    ja:{ title:`FXロット計算ツール — ロットサイズとpip価値`, kw:`FXロット計算`, lead:`通貨ペア・pip単位のストップ・資金に応じて、ドル建てのリスクを正しいロットサイズ（標準・ミニ・マイクロ）に換算します。`, pts:[`標準・ミニ・マイクロロット`,`通貨ペアごとのpip価値`,`1取引あたりのリスク%に合わせて調整`] },
    ar:{ title:`حاسبة عقود الفوركس (اللوت) — حجم اللوت وقيمة النقطة`, kw:`حاسبة لوت الفوركس`, lead:`حوّل مخاطرتك بالدولار إلى حجم اللوت الصحيح (قياسي أو ميني أو مايكرو) حسب زوجك ووقف الخسارة بالنقاط ورأس مالك.`, pts:[`لوت قياسي وميني ومايكرو`,`قيمة النقطة لكل زوج عملات`,`مضبوط على نسبة مخاطرتك لكل صفقة`] },
    pt:{ title:`Calculadora de Lotes de Forex — Tamanho de Lote e Pip`, kw:`calculadora de lotes forex`, lead:`Converta o seu risco em euros/dólares no tamanho de lote correto (padrão, mini ou micro) consoante o par, o stop em pips e o seu capital.`, pts:[`Lotes padrão, mini e micro`,`Valor do pip por par`,`Ajustado à sua % de risco`] },
    it:{ title:`Calcolatrice di Lotti Forex — Dimensione del Lotto e Valore del Pip`, kw:`calcolatrice lotti forex`, lead:`Converti il tuo rischio in euro/dollari nella dimensione di lotto corretta (standard, mini o micro) in base alla coppia, allo stop in pip e al tuo capitale.`, pts:[`Lotti standard, mini e micro`,`Valore del pip per coppia`,`Adattato alla tua % di rischio`] },
  },
  'calculadora-de-apalancamiento': {
    de:{ title:`Hebel-Rechner — Exposure & Margin`, kw:`Hebel-Rechner`, lead:`Sieh deinen echten Hebel, die benötigte Margin und die Gesamt-Exposure deiner Position, bevor du sie eröffnest.`, pts:[`Benötigte Margin und nominale Exposure`,`Effektiver vs. angebotener Hebel`,`Forex, Krypto, CFDs und Futures`] },
    fr:{ title:`Calculateur d'Effet de Levier — Exposition et Marge`, kw:`Calculateur d'effet de levier`, lead:`Découvrez votre levier réel, la marge nécessaire et l'exposition totale de votre position avant de l'ouvrir.`, pts:[`Marge requise et exposition notionnelle`,`Levier effectif vs proposé`,`Forex, crypto, CFD et futures`] },
    ru:{ title:`Калькулятор кредитного плеча — экспозиция и маржа`, kw:`Калькулятор плеча`, lead:`Узнайте своё реальное плечо, необходимую маржу и полную экспозицию позиции до её открытия.`, pts:[`Необходимая маржа и номинальная экспозиция`,`Эффективное и предлагаемое плечо`,`Форекс, крипто, CFD и фьючерсы`] },
    zh:{ title:`杠杆计算器 — 敞口与保证金`, kw:`杠杆计算器`, lead:`在开仓前查看你的真实杠杆、所需保证金和头寸的总敞口。`, pts:[`所需保证金与名义敞口`,`有效杠杆与提供杠杆`,`外汇、加密货币、差价合约和期货`] },
    ja:{ title:`レバレッジ計算ツール — エクスポージャーと証拠金`, kw:`レバレッジ計算`, lead:`ポジションを建てる前に、実効レバレッジ・必要証拠金・総エクスポージャーを確認できます。`, pts:[`必要証拠金と想定元本エクスポージャー`,`実効レバレッジと提供レバレッジ`,`FX・仮想通貨・CFD・先物`] },
    ar:{ title:`حاسبة الرافعة المالية — الانكشاف والهامش`, kw:`حاسبة الرافعة المالية`, lead:`اعرف رافعتك الحقيقية والهامش المطلوب والانكشاف الكلي لمركزك قبل فتحه.`, pts:[`الهامش المطلوب والانكشاف الاسمي`,`الرافعة الفعلية مقابل المعروضة`,`الفوركس والعملات الرقمية والعقود مقابل الفروقات والعقود الآجلة`] },
    pt:{ title:`Calculadora de Alavancagem — Exposição e Margem`, kw:`calculadora de alavancagem`, lead:`Descubra a sua alavancagem real, a margem de que precisa e a exposição total da sua posição antes de a abrir.`, pts:[`Margem exigida e exposição nocional`,`Alavancagem efetiva vs. oferecida`,`Forex, cripto, CFDs e futuros`] },
    it:{ title:`Calcolatrice della Leva — Esposizione e Margine`, kw:`calcolatrice leva finanziaria`, lead:`Scopri la tua leva reale, il margine che ti serve e l'esposizione totale della tua posizione prima di aprirla.`, pts:[`Margine richiesto ed esposizione nozionale`,`Leva effettiva vs. offerta`,`Forex, cripto, CFD e futures`] },
  },
  'calculadora-de-futuros': {
    de:{ title:`Futures-Rechner — Margin, Tick & Nominalwert`, kw:`Futures-Rechner`, lead:`Übersetze Kontraktgröße, Multiplikator und Margin in echte Exposure: was jeder Tick wert ist und der gesamte Nominalwert.`, pts:[`Tick- und Punktwert`,`Initial- und Erhaltungsmargin`,`Echte nominale Exposure`] },
    fr:{ title:`Calculateur de Futures — Marge, Tick et Notionnel`, kw:`Calculateur de futures`, lead:`Traduisez la taille du contrat, le multiplicateur et la marge en exposition réelle : la valeur de chaque tick et le notionnel total.`, pts:[`Valeur du tick et du point`,`Marge initiale et de maintien`,`Exposition notionnelle réelle`] },
    ru:{ title:`Калькулятор фьючерсов — маржа, тик и номинал`, kw:`Калькулятор фьючерсов`, lead:`Переведите размер контракта, множитель и маржу в реальную экспозицию: сколько стоит каждый тик и полный номинал.`, pts:[`Стоимость тика и пункта`,`Начальная и поддерживающая маржа`,`Реальная номинальная экспозиция`] },
    zh:{ title:`期货计算器 — 保证金、跳动点与名义价值`, kw:`期货计算器`, lead:`将合约规模、乘数和保证金换算为真实敞口：每个跳动点的价值和总名义价值。`, pts:[`跳动点与点值`,`初始保证金与维持保证金`,`真实名义敞口`] },
    ja:{ title:`先物計算ツール — 証拠金・ティック・想定元本`, kw:`先物計算`, lead:`契約サイズ・乗数・証拠金を実際のエクスポージャーに換算：1ティックの価値と総想定元本がわかります。`, pts:[`ティック値と1ポイントの価値`,`当初証拠金と維持証拠金`,`実際の想定元本エクスポージャー`] },
    ar:{ title:`حاسبة العقود الآجلة — الهامش والتِك والقيمة الاسمية`, kw:`حاسبة العقود الآجلة`, lead:`حوّل حجم العقد والمضاعف والهامش إلى انكشاف حقيقي: قيمة كل تِك والقيمة الاسمية الإجمالية.`, pts:[`قيمة التِك والنقطة`,`الهامش المبدئي وهامش الصيانة`,`الانكشاف الاسمي الحقيقي`] },
    pt:{ title:`Calculadora de Futuros — Margem, Tick e Nocional`, kw:`calculadora de futuros`, lead:`Traduza o tamanho do contrato, o multiplicador e a margem em exposição real: quanto vale cada tick e o nocional total.`, pts:[`Valor do tick e do ponto`,`Margem inicial e de manutenção`,`Exposição nocional real`] },
    it:{ title:`Calcolatrice Futures — Margine, Tick e Nozionale`, kw:`calcolatrice futures`, lead:`Traduci dimensione del contratto, moltiplicatore e margine in esposizione reale: quanto vale ogni tick e il nozionale totale.`, pts:[`Valore del tick e del punto`,`Margine iniziale e di mantenimento`,`Esposizione nozionale reale`] },
  },
  'calculadora-precio-objetivo': {
    de:{ title:`Kursziel-Rechner — Take-Profit & CRV`, kw:`Kursziel-Rechner`, lead:`Setze deinen Take-Profit anhand des gewünschten Chance-Risiko-Verhältnisses und prüfe, ob sich der Trade lohnt, bevor du einsteigst.`, pts:[`Kursziel nach CRV`,`Potenzieller Gewinn in % und Geld`,`Prüft dein minimales CRV`] },
    fr:{ title:`Calculateur de Prix Cible — Take Profit et R:R`, kw:`Calculateur de prix cible`, lead:`Fixez votre take profit selon le ratio risque/récompense visé et vérifiez si le trade en vaut la peine avant d'entrer.`, pts:[`Prix cible par ratio R:R`,`Gain potentiel en % et en argent`,`Valide votre R:R minimum`] },
    ru:{ title:`Калькулятор целевой цены — тейк-профит и R:R`, kw:`Калькулятор целевой цены`, lead:`Задайте тейк-профит по нужному соотношению риск/прибыль и проверьте, стоит ли сделка входа.`, pts:[`Целевая цена по соотношению R:R`,`Потенциальная прибыль в % и деньгах`,`Проверка минимального R:R`] },
    zh:{ title:`目标价计算器 — 止盈与盈亏比`, kw:`目标价计算器`, lead:`根据你期望的风险回报比设定止盈，并在入场前判断这笔交易是否值得。`, pts:[`按盈亏比计算目标价`,`以百分比和金额显示潜在利润`,`验证你的最低盈亏比`] },
    ja:{ title:`目標価格計算ツール — 利確とリスクリワード`, kw:`目標価格計算`, lead:`狙うリスクリワード比から利確価格を設定し、エントリー前にそのトレードが割に合うか確認します。`, pts:[`リスクリワード比による目標価格`,`潜在利益を%と金額で表示`,`最低リスクリワード比を検証`] },
    ar:{ title:`حاسبة السعر المستهدف — جني الأرباح ونسبة العائد/المخاطرة`, kw:`حاسبة السعر المستهدف`, lead:`حدّد جني الأرباح حسب نسبة العائد إلى المخاطرة التي تريدها وتحقّق مما إذا كانت الصفقة تستحق قبل الدخول.`, pts:[`السعر المستهدف حسب نسبة العائد/المخاطرة`,`الربح المحتمل بالنسبة والمبلغ`,`يتحقق من الحد الأدنى للعائد/المخاطرة`] },
    pt:{ title:`Calculadora de Preço Objetivo — Take Profit e R:R`, kw:`calculadora de preço objetivo`, lead:`Fixe o seu take profit segundo o rácio risco/benefício que procura e verifique se a operação vale a pena antes de entrar.`, pts:[`Preço objetivo por rácio R:R`,`Lucro potencial em % e em dinheiro`,`Valida o R:R mínimo`] },
    it:{ title:`Calcolatrice del Prezzo Obiettivo — Take Profit e R:R`, kw:`calcolatrice prezzo obiettivo`, lead:`Fissa il tuo take profit in base al rapporto rischio/rendimento che cerchi e verifica se l'operazione vale la pena prima di entrare.`, pts:[`Prezzo obiettivo per rapporto R:R`,`Profitto potenziale in % e in denaro`,`Convalida il R:R minimo`] },
  },
  'calculadora-porcentaje-trading': {
    de:{ title:`Prozent-Rechner — Gewinn, Verlust & ROI`, kw:`Trading-Prozentrechner`, lead:`Berechne die prozentuale Änderung zwischen zwei Kursen, deinen Gewinn oder Verlust und wie viel du nach einem Drawdown aufholen musst.`, pts:[`%-Änderung zwischen zwei Kursen`,`ROI des Trades`,`Nötige Erholung nach einem Verlust`] },
    fr:{ title:`Calculateur de Pourcentage — Gain, Perte et ROI`, kw:`Calculateur de pourcentage trading`, lead:`Calculez la variation en pourcentage entre deux prix, votre gain ou perte et combien vous devez récupérer après un drawdown.`, pts:[`Variation en % entre deux prix`,`ROI du trade`,`Récupération nécessaire après une perte`] },
    ru:{ title:`Калькулятор процентов — прибыль, убыток и ROI`, kw:`Калькулятор процентов трейдинг`, lead:`Рассчитайте процентное изменение между двумя ценами, прибыль или убыток и сколько нужно отыграть после просадки.`, pts:[`Изменение в % между двумя ценами`,`ROI сделки`,`Сколько отыграть после убытка`] },
    zh:{ title:`百分比计算器 — 盈利、亏损与投资回报率`, kw:`交易百分比计算器`, lead:`计算两个价格之间的百分比变化、你的盈亏，以及回撤后需要收回多少。`, pts:[`两个价格之间的百分比变化`,`交易投资回报率`,`亏损后所需的回本幅度`] },
    ja:{ title:`パーセント計算ツール — 利益・損失・ROI`, kw:`トレードパーセント計算`, lead:`2つの価格間の変化率、損益、そしてドローダウン後にどれだけ取り返す必要があるかを計算します。`, pts:[`2つの価格間の変化率`,`トレードのROI`,`損失後に必要な回復幅`] },
    ar:{ title:`حاسبة النسبة المئوية — الربح والخسارة والعائد`, kw:`حاسبة نسبة التداول`, lead:`احسب التغير المئوي بين سعرين وربحك أو خسارتك وكم تحتاج لتعويضه بعد التراجع (drawdown).`, pts:[`التغير المئوي بين سعرين`,`عائد الصفقة (ROI)`,`ما يلزم تعويضه بعد الخسارة`] },
    pt:{ title:`Calculadora de Percentagem — Ganhos, Perdas e ROI`, kw:`calculadora de percentagem de trading`, lead:`Calcule a variação percentual entre dois preços, o seu ganho ou perda e quanto precisa de recuperar depois de um drawdown.`, pts:[`Variação % entre dois preços`,`ROI da operação`,`Quanto recuperar depois de uma perda`] },
    it:{ title:`Calcolatrice di Percentuale — Guadagni, Perdite e ROI`, kw:`calcolatrice percentuale trading`, lead:`Calcola la variazione percentuale tra due prezzi, il tuo guadagno o la tua perdita e quanto ti serve per recuperare dopo un drawdown.`, pts:[`Variazione % tra due prezzi`,`ROI dell'operazione`,`Quanto recuperare dopo una perdita`] },
  },
  'calculadora-precio-medio': {
    de:{ title:`Durchschnittskurs-Rechner (DCA) — Einstandskurs`, kw:`Durchschnittskurs-Rechner`, lead:`Berechne deinen durchschnittlichen Einstiegskurs bei Käufen in mehreren Tranchen (DCA) und kenne deinen Break-even, um im Plus auszusteigen.`, pts:[`Gewichteter Durchschnittskurs`,`Break-even nach dem Nachkaufen`,`Ideal für DCA bei Krypto und Aktien`] },
    fr:{ title:`Calculateur de Prix Moyen (DCA) — Prix de Revient`, kw:`Calculateur de prix moyen`, lead:`Calculez votre prix d'entrée moyen lors d'achats en plusieurs fois (DCA) et connaissez votre seuil de rentabilité pour sortir en profit.`, pts:[`Prix moyen pondéré`,`Seuil de rentabilité après moyenne`,`Idéal pour le DCA en crypto et actions`] },
    ru:{ title:`Калькулятор средней цены (DCA) — себестоимость`, kw:`Калькулятор средней цены`, lead:`Рассчитайте среднюю цену входа при покупках частями (DCA) и узнайте точку безубыточности, чтобы выйти в плюс.`, pts:[`Средневзвешенная цена`,`Безубыток после усреднения`,`Идеально для DCA в крипто и акциях`] },
    zh:{ title:`平均价格计算器（定投）— 成本基础`, kw:`平均价格计算器`, lead:`计算你分批买入（定投/DCA）的平均入场价，并了解保本价以便盈利离场。`, pts:[`加权平均价格`,`摊平后的保本价`,`适合加密货币和股票的定投`] },
    ja:{ title:`平均取得単価計算ツール（ドルコスト平均法）`, kw:`平均取得単価計算`, lead:`複数回に分けて買った場合（ドルコスト平均法）の平均取得単価を計算し、利益で降りるための損益分岐点を把握します。`, pts:[`加重平均取得単価`,`ナンピン後の損益分岐点`,`仮想通貨・株式の積立に最適`] },
    ar:{ title:`حاسبة متوسط السعر (DCA) — تكلفة الشراء`, kw:`حاسبة متوسط السعر`, lead:`احسب متوسط سعر دخولك عند الشراء على دفعات (DCA) واعرف نقطة التعادل للخروج بربح.`, pts:[`متوسط السعر المرجّح`,`نقطة التعادل بعد التوسيط`,`مثالي للشراء الدوري في العملات الرقمية والأسهم`] },
    pt:{ title:`Calculadora de Preço Médio (DCA) — Custo Médio`, kw:`calculadora de preço médio`, lead:`Calcule o seu preço de entrada médio ao comprar em várias vezes (DCA) e saiba a que preço fica e o que precisa para sair em positivo.`, pts:[`Preço médio ponderado`,`Break-even depois de fazer média`,`Ideal para DCA em cripto e ações`] },
    it:{ title:`Calcolatrice del Prezzo Medio (PAC) — Costo Medio`, kw:`calcolatrice prezzo medio`, lead:`Calcola il tuo prezzo medio di ingresso comprando in più tranche (PAC) e scopri a quale prezzo sei e cosa ti serve per uscire in positivo.`, pts:[`Prezzo medio ponderato`,`Break-even dopo la mediazione`,`Ideale per il PAC su cripto e azioni`] },
  },
  'calculadora-fibonacci': {
    de:{ title:`Fibonacci-Rechner — Retracements & Extensionen`, kw:`Fibonacci-Rechner`, lead:`Erzeuge die Fibonacci-Retracements (38,2 %, 50 %, 61,8 %) und -Extensionen zwischen zwei Punkten, um Unterstützungen, Widerstände und Ziele zu finden.`, pts:[`Automatische Retracements und Extensionen`,`Einstiegszonen und Ziele`,`Long und Short`] },
    fr:{ title:`Calculateur de Fibonacci — Retracements et Extensions`, kw:`Calculateur de fibonacci`, lead:`Générez les niveaux de retracement (38,2 %, 50 %, 61,8 %) et d'extension de Fibonacci entre deux points, pour trouver supports, résistances et objectifs.`, pts:[`Retracements et extensions automatiques`,`Zones d'entrée et objectifs`,`Haussier et baissier`] },
    ru:{ title:`Калькулятор Фибоначчи — коррекции и расширения`, kw:`Калькулятор фибоначчи`, lead:`Постройте уровни коррекции (38,2 %, 50 %, 61,8 %) и расширения Фибоначчи между двумя точками, чтобы найти поддержки, сопротивления и цели.`, pts:[`Автоматические коррекции и расширения`,`Зоны входа и цели`,`Лонг и шорт`] },
    zh:{ title:`斐波那契计算器 — 回撤与扩展`, kw:`斐波那契计算器`, lead:`在两点之间生成斐波那契回撤（38.2%、50%、61.8%）和扩展位，寻找支撑、阻力和目标位。`, pts:[`自动回撤与扩展`,`入场区与目标位`,`看涨与看跌`] },
    ja:{ title:`フィボナッチ計算ツール — リトレースメントとエクステンション`, kw:`フィボナッチ計算`, lead:`2点間のフィボナッチ・リトレースメント（38.2%・50%・61.8%）とエクステンションを生成し、サポート・レジスタンス・目標を見つけます。`, pts:[`リトレースメントとエクステンションを自動計算`,`エントリーゾーンと目標`,`上昇・下降の両方に対応`] },
    ar:{ title:`حاسبة فيبوناتشي — التصحيحات والامتدادات`, kw:`حاسبة فيبوناتشي`, lead:`أنشئ مستويات تصحيح فيبوناتشي (38.2% و50% و61.8%) والامتدادات بين نقطتين لإيجاد الدعوم والمقاومات والأهداف.`, pts:[`تصحيحات وامتدادات تلقائية`,`مناطق الدخول والأهداف`,`صاعد وهابط`] },
    pt:{ title:`Calculadora de Fibonacci — Retrocessos e Extensões`, kw:`calculadora de fibonacci`, lead:`Gere os níveis de retrocesso (38,2 %, 50 %, 61,8 %) e de extensão de Fibonacci entre dois pontos, para encontrar suportes, resistências e objetivos.`, pts:[`Retrocessos e extensões automáticos`,`Zonas de entrada e objetivos`,`De alta e de baixa`] },
    it:{ title:`Calcolatrice di Fibonacci — Ritracciamenti ed Estensioni`, kw:`calcolatrice fibonacci`, lead:`Genera i livelli di ritracciamento (38,2 %, 50 %, 61,8 %) e di estensione di Fibonacci tra due punti, per trovare supporti, resistenze e obiettivi.`, pts:[`Ritracciamenti ed estensioni automatici`,`Zone di ingresso e obiettivi`,`Rialzista e ribassista`] },
  },
  'calculadora-patrones-trading': {
    de:{ title:`Chartmuster-Rechner — Einstieg, Stop & Ziel`, kw:`Chartmuster-Rechner`, lead:`Berechne aus einem Chartmuster den Einstieg, den Stop-Loss und das gemessene Ziel mit seinem Chance-Risiko-Verhältnis.`, pts:[`Einstieg, Stop und gemessenes Ziel`,`CRV des Musters`,`Integriertes Risikomanagement`] },
    fr:{ title:`Calculateur de Figures Chartistes — Entrée, Stop et Objectif`, kw:`Calculateur de figures chartistes`, lead:`À partir d'une figure chartiste, calculez l'entrée, le stop-loss et l'objectif mesuré avec son ratio risque/récompense.`, pts:[`Entrée, stop et objectif mesuré`,`Ratio R:R de la figure`,`Gestion du risque intégrée`] },
    ru:{ title:`Калькулятор графических паттернов — вход, стоп и цель`, kw:`Калькулятор паттернов`, lead:`По графическому паттерну рассчитайте вход, стоп-лосс и измеренную цель с соотношением риск/прибыль.`, pts:[`Вход, стоп и измеренная цель`,`R:R паттерна`,`Встроенный риск-менеджмент`] },
    zh:{ title:`图表形态计算器 — 入场、止损与目标`, kw:`图表形态计算器`, lead:`根据图表形态，计算入场、止损和量度目标及其风险回报比。`, pts:[`入场、止损和量度目标`,`形态的盈亏比`,`内置风险管理`] },
    ja:{ title:`チャートパターン計算ツール — エントリー・ストップ・目標`, kw:`チャートパターン計算`, lead:`チャートパターンからエントリー・ストップロス・測定目標をリスクリワード比とともに計算します。`, pts:[`エントリー・ストップ・測定目標`,`パターンのリスクリワード比`,`リスク管理を内蔵`] },
    ar:{ title:`حاسبة النماذج السعرية — الدخول والوقف والهدف`, kw:`حاسبة النماذج السعرية`, lead:`انطلاقًا من نموذج سعري، احسب الدخول ووقف الخسارة والهدف المقاس مع نسبة العائد/المخاطرة.`, pts:[`الدخول والوقف والهدف المقاس`,`نسبة العائد/المخاطرة للنموذج`,`إدارة مخاطر مدمجة`] },
    pt:{ title:`Calculadora de Padrões — Entrada, Stop e Objetivo`, kw:`calculadora de padrões de trading`, lead:`A partir de um padrão chartista, calcule a entrada, o stop-loss e o objetivo medido com o seu rácio risco/benefício.`, pts:[`Entrada, stop e objetivo medido`,`Rácio R:R do padrão`,`Gestão de risco integrada`] },
    it:{ title:`Calcolatrice di Pattern — Ingresso, Stop e Obiettivo`, kw:`calcolatrice pattern grafici`, lead:`Partendo da un pattern grafico, calcola l'ingresso, lo stop-loss e l'obiettivo misurato con il suo rapporto rischio/rendimento.`, pts:[`Ingresso, stop e obiettivo misurato`,`Rapporto R:R del pattern`,`Gestione del rischio integrata`] },
  },
  'simulador-monte-carlo-risk-of-ruin': {
    de:{ title:`Monte-Carlo- & Risk-of-Ruin-Simulator — Blow-up-Wahrscheinlichkeit`, kw:`Risk-of-Ruin-Rechner`, lead:`Simuliere Tausende Trade-Sequenzen mit deiner Trefferquote und deinem CRV, um deine echte Wahrscheinlichkeit für einen Totalverlust und die schlimmste Verluststrähne zu sehen.`, pts:[`Ruin-Wahrscheinlichkeit für deine Positionsgröße`,`Schlimmste erwartete Verluststrähne`,`Prüft, ob dein System tragfähig ist`] },
    fr:{ title:`Simulateur Monte-Carlo et Risque de Ruine — Probabilité de Blow-up`, kw:`Calculateur de risque de ruine`, lead:`Simulez des milliers de séquences de trades avec votre taux de réussite et votre R:R pour voir votre vraie probabilité de griller le compte et la pire série de pertes.`, pts:[`Risque de ruine selon votre mise`,`Pire série de pertes attendue`,`Vérifie si votre système est viable`] },
    ru:{ title:`Симулятор Монте-Карло и риска разорения — вероятность обнуления`, kw:`Калькулятор риска разорения`, lead:`Смоделируйте тысячи последовательностей сделок с вашим винрейтом и R:R, чтобы увидеть реальную вероятность обнулить счёт и худшую серию убытков.`, pts:[`Вероятность разорения при вашем риске`,`Худшая ожидаемая серия убытков`,`Проверяет устойчивость системы`] },
    zh:{ title:`蒙特卡洛与爆仓风险模拟器 — 爆仓概率`, kw:`爆仓风险计算器`, lead:`用你的胜率和盈亏比模拟数千次交易序列，查看你真实的爆仓概率和最糟糕的连亏。`, pts:[`基于你下注规模的破产概率`,`预期最糟糕的连续亏损`,`验证你的系统是否可持续`] },
    ja:{ title:`モンテカルロ＆破産確率シミュレーター — 資金消失の確率`, kw:`破産確率計算`, lead:`勝率とリスクリワード比で数千回の取引シーケンスをシミュレートし、口座を飛ばす本当の確率と最悪の連敗を確認します。`, pts:[`賭け金に応じた破産確率`,`想定される最悪の連敗`,`システムが持続可能か検証`] },
    ar:{ title:`محاكي مونت كارلو واحتمال الإفلاس — احتمال تفجير الحساب`, kw:`حاسبة احتمال الإفلاس`, lead:`حاكِ آلاف تسلسلات الصفقات بنسبة فوزك ونسبة العائد/المخاطرة لترى احتمالك الحقيقي لتفجير الحساب وأسوأ سلسلة خسائر.`, pts:[`احتمال الإفلاس حسب حجم مخاطرتك`,`أسوأ سلسلة خسائر متوقعة`,`يتحقق من استدامة نظامك`] },
    pt:{ title:`Simulador Monte Carlo e Risk of Ruin — Probabilidade de Falência`, kw:`simulador monte carlo risk of ruin`, lead:`Simule milhares de sequências de operações com o seu win rate e R:R para ver a sua probabilidade real de arruinar a conta e a pior série esperada.`, pts:[`Probabilidade de ruína consoante o seu risco`,`Pior série de perdas esperada`,`Valida se o seu sistema é sustentável`] },
    it:{ title:`Simulatore Monte Carlo e Risk of Ruin — Probabilità di Fallimento`, kw:`simulatore monte carlo risk of ruin`, lead:`Simula migliaia di sequenze di operazioni con il tuo win rate e R:R per vedere la tua reale probabilità di bruciare il conto e la peggiore serie attesa.`, pts:[`Probabilità di rovina in base al tuo rischio`,`Peggiore serie di perdite attesa`,`Verifica se il tuo sistema è sostenibile`] },
  },
  'simulador-de-trading': {
    de:{ title:`Trading-Simulator — Kontoprojektion nach Phasen`, kw:`Trading-Simulator`, lead:`Projiziere, wie sich dein Konto mit Trefferquote, CRV, Gebühren und Zinseszins über Hunderte Trades entwickelt.`, pts:[`Phasen-Projektion mit Zinseszins`,`Inklusive Gebühren und Slippage`,`Erwartete Equity-Kurve`] },
    fr:{ title:`Simulateur de Trading — Projection de Compte par Phases`, kw:`Simulateur de trading`, lead:`Projetez l'évolution de votre compte avec votre taux de réussite, votre R:R, les frais et les intérêts composés sur des centaines de trades.`, pts:[`Projection par phases avec composition`,`Inclut frais et slippage`,`Courbe d'equity attendue`] },
    ru:{ title:`Торговый симулятор — прогноз счёта по фазам`, kw:`Торговый симулятор`, lead:`Спрогнозируйте рост счёта с учётом винрейта, R:R, комиссий и сложного процента на сотнях сделок.`, pts:[`Прогноз по фазам со сложным процентом`,`Учитывает комиссии и проскальзывание`,`Ожидаемая кривая эквити`] },
    zh:{ title:`交易模拟器 — 分阶段账户预测`, kw:`交易模拟器`, lead:`用你的胜率、盈亏比、手续费和复利，预测账户在数百笔交易中的增长。`, pts:[`带复利的分阶段预测`,`包含手续费和滑点`,`预期资金曲线`] },
    ja:{ title:`トレードシミュレーター — フェーズ別口座予測`, kw:`トレードシミュレーター`, lead:`勝率・リスクリワード比・手数料・複利をもとに、数百回の取引で口座がどう増えるかを予測します。`, pts:[`複利を含むフェーズ別予測`,`手数料とスリッページを考慮`,`想定されるエクイティカーブ`] },
    ar:{ title:`محاكي التداول — إسقاط الحساب على مراحل`, kw:`محاكي التداول`, lead:`توقّع كيف ينمو حسابك بنسبة فوزك ونسبة العائد/المخاطرة والعمولات والفائدة المركبة عبر مئات الصفقات.`, pts:[`إسقاط على مراحل مع الفائدة المركبة`,`يشمل العمولات والانزلاق السعري`,`منحنى رأس المال المتوقع`] },
    pt:{ title:`Simulador de Trading — Projeção de Conta por Fases`, kw:`simulador de trading`, lead:`Projete como evolui a sua conta com o seu win rate, R:R, comissões e juro composto ao longo de centenas de operações.`, pts:[`Projeção por fases com juro composto`,`Inclui comissões e slippage`,`Curva de equity esperada`] },
    it:{ title:`Simulatore di Trading — Proiezione del Conto per Fasi`, kw:`simulatore di trading`, lead:`Proietta come evolve il tuo conto con il tuo win rate, R:R, commissioni e interesse composto lungo centinaia di operazioni.`, pts:[`Proiezione per fasi con capitalizzazione`,`Include commissioni e slippage`,`Curva di equity attesa`] },
  },
  'calculadora-interes-compuesto-trading': {
    de:{ title:`Zinseszins-Rechner fürs Trading`, kw:`Zinseszins-Rechner Trading`, lead:`Sieh, wie dein Kapital wächst, wenn du die Gewinne Monat für Monat mit einer angestrebten prozentualen Rendite reinvestierst.`, pts:[`Zinseszins-Wachstum mit Einzahlungen`,`Meilensteine und Wachstumsdiagramm`,`Realistische Renditeerwartungen`] },
    fr:{ title:`Calculateur d'Intérêts Composés pour le Trading`, kw:`Calculateur d'intérêts composés trading`, lead:`Voyez comment votre capital croît en réinvestissant les gains mois après mois à un rendement cible.`, pts:[`Croissance composée avec apports`,`Jalons et graphique d'évolution`,`Attentes de rendement réalistes`] },
    ru:{ title:`Калькулятор сложного процента для трейдинга`, kw:`Калькулятор сложного процента трейдинг`, lead:`Посмотрите, как растёт капитал при реинвестировании прибыли месяц за месяцем с целевой доходностью.`, pts:[`Сложный рост с пополнениями`,`Вехи и график роста`,`Реалистичные ожидания доходности`] },
    zh:{ title:`交易复利计算器`, kw:`交易复利计算器`, lead:`查看按目标百分比收益逐月再投资利润，你的资金如何增长。`, pts:[`带追加投入的复利增长`,`里程碑与增长图表`,`现实的收益预期`] },
    ja:{ title:`トレード複利計算ツール`, kw:`トレード複利計算`, lead:`目標とする利回りで毎月利益を再投資したとき、資金がどう増えるかを確認します。`, pts:[`積立を含む複利成長`,`マイルストーンと成長グラフ`,`現実的なリターン期待`] },
    ar:{ title:`حاسبة الفائدة المركبة للتداول`, kw:`حاسبة الفائدة المركبة للتداول`, lead:`شاهد كيف ينمو رأس مالك بإعادة استثمار الأرباح شهرًا بعد شهر بعائد مئوي مستهدف.`, pts:[`نمو مركّب مع الإيداعات`,`مؤشرات ورسم بياني للنمو`,`توقعات عائد واقعية`] },
    pt:{ title:`Calculadora de Juro Composto para Trading`, kw:`calculadora de juro composto trading`, lead:`Veja como cresce o seu capital reinvestindo os ganhos mês a mês com um rendimento percentual objetivo.`, pts:[`Crescimento composto com aportes`,`Marcos e gráfico de evolução`,`Expectativas realistas de rentabilidade`] },
    it:{ title:`Calcolatrice di Interesse Composto per il Trading`, kw:`calcolatrice interesse composto trading`, lead:`Guarda come cresce il tuo capitale reinvestendo i guadagni mese dopo mese con un rendimento percentuale obiettivo.`, pts:[`Crescita composta con versamenti`,`Traguardi e grafico di evoluzione`,`Aspettative di rendimento realistiche`] },
  },
};

// ─── Temas de educación: título+intro desde i18n (todos los idiomas de LANGS) ──────
// {value (?topic=), slug, titleKey, introKey}
const TOPICS = [
  { v:'cross-margin', slug:'margen-cruzado-margin-call-y-stop-out', tk:'xmEduTitle', ik:'xmEduIntro' },
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
  { v:'gann-box', slug:'caja-de-gann-como-se-monta-y-opera', tk:'gannTitle', ik:'gannIntro' },
  { v:'demark', slug:'demark-td-sequential-setup-9-countdown-13', tk:'dmkTitle', ik:'dmkIntro' },
  { v:'ehlers', slug:'indicadores-ehlers-fisher-transform-mama-dsp', tk:'ehlTitle', ik:'ehlIntro' },
  { v:'rrg', slug:'graficos-rotacion-relativa-rrg-cuadrantes', tk:'rrgTitle', ik:'rrgIntro' },
  { v:'pitchfork', slug:'horquilla-de-andrews-linea-mediana', tk:'pfTitle', ik:'pfIntro' },
  { v:'bill-williams', slug:'bill-williams-alligator-fractales-awesome-oscillator', tk:'bwTitle', ik:'bwIntro' },
  { v:'wolfe-waves', slug:'wolfe-waves-patron-5-ondas-objetivo', tk:'wlfTitle', ik:'wlfIntro' },
  { v:'market-profile', slug:'market-profile-teoria-subastas-poc-valor', tk:'mpTitle', ik:'mpIntro' },
  { v:'elder', slug:'sistema-elder-triple-pantalla-force-index', tk:'eldTitle', ik:'eldIntro' },
  { v:'oscillators', slug:'osciladores-raros-coppock-schaff-rsi2-tsi', tk:'oscTitle', ik:'oscIntro' },
  { v:'time-cycles', slug:'tiempo-ciclos-fibonacci-temporal-hurst', tk:'cycTitle', ik:'cycIntro' },
  { v:'psych-solutions', slug:'psicologia-trading-problema-solucion', tk:'pssTitle', ik:'pssIntro' },
  { v:'session-phases', slug:'proceso-emocional-del-trader-fases', tk:'sphTitle', ik:'sphIntro' },
  { v:'system-adherence', slug:'disciplina-cumplir-sistema-trading-siempre', tk:'sysTitle', ik:'sysIntro' },
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
  { v:'grid-martingale', slug:'grid-y-martingala-por-que-no-funcionan', tk:'gmTitle', ik:'gmIntro' },
  { v:'vol-premium', slug:'prima-de-riesgo-de-volatilidad', tk:'vrpTitle', ik:'vrpIntro' },
  { v:'backtest-validation', slug:'validar-un-backtest', tk:'bvlTitle', ik:'bvlIntro' },
];

// ─── Plantilla HTML ───────────────────────────────────────────────
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

// La misma barra en las 1.640 páginas y en los hubs: portada + los cuatro
// índices del idioma. Es lo que convierte un montón de páginas sueltas en un
// sitio con estructura — y lo que permite a un rastreador llegar a cualquiera
// de ellas en dos saltos desde la portada.
const navHubs = (lang, ui) => `<a href="${DOMAIN}/">${esc(ui.home)}</a>`
  + SECCIONES.map((s) => {
    // `chartPatterns`/`candlestickPatterns` son claves de la APLICACIÓN
    // (`T[lang]`), las mismas que usa el detector en vivo — no se reinventan
    // aquí porque no pueden divergir del rótulo que ya ve un suscriptor.
    const etiqueta = {
      learn: ui.learn, tools: ui.calcs, markets: ui.markets, strategies: ui.strategies,
      patterns: T[lang].chartPatterns, candles: T[lang].candlestickPatterns,
    }[s];
    return `<a href="${hub(lang, s)}">${esc(etiqueta)}</a>`;
  }).join('');

function render({ lang, url, alts, title, description, h1, kw, ui, sectionLabel, sectionUrl, lead, formula, points, ctaUrl, ctaLabel, related, sectionKind, jsonld, howto, conceptos, conceptosTitulo }) {
  const dir = RTL.has(lang) ? ' dir="rtl"' : '';
  const conceptosHtml = (conceptos && conceptos.length)
    ? `<div class="card"><h2>${esc(conceptosTitulo || ui.whatLearn)}</h2>`
      + conceptos.map((c) => `<h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p>`).join('')
      + `</div>`
    : '';
  const hreflang = alts.map(([hl, u]) => `<link rel="alternate" hreflang="${hl}" href="${esc(u)}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${esc(alts.find(a => a[0] === 'es') ? alts.find(a => a[0] === 'es')[1] : url)}">`;
  const pointsHtml = (points || []).map(p => `<li>${esc(p)}</li>`).join('');
  const relatedHtml = related.map(r => `<li><a href="${esc(r.url)}">${esc(r.label)}</a></li>`).join('');
  return `<!doctype html>
<html lang="${lang}"${dir}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- CSP de las páginas estáticas. Son autocontenidas —estilo en línea, sin
     script externo ni iframe—, así que aquí sí se puede prohibir el script por
     completo: si alguna vez alguien inyecta uno, el navegador lo bloquea.
     frame-ancestors no funciona en meta, así que el anti-clickjacking sigue
     necesitando cabeceras (ver G-10). -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; base-uri 'none'; form-action 'none'">

<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
${ICONOS()}
${hreflang}
<meta property="og:type" content="website">
<meta property="og:site_name" content="TradingCalculator.Pro">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(OG_IMAGE)}">
<meta property="og:locale" content="${ogLocale(lang)}">
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
.brand{font-weight:800;color:#fff;font-size:18px;display:inline-flex;align-items:center;gap:8px}.brand span{color:#34d399}
.brand .mark{flex:none;vertical-align:middle}
nav.top a{color:#a3a3a3;font-size:14px;margin-inline-start:16px}
.crumb{font-size:13px;color:#737373;padding:18px 0 0}.crumb a{color:#737373}
h1{font-size:30px;line-height:1.25;color:#fff;margin:14px 0 6px}
.lead{font-size:18px;color:#c7c7c7;margin:0 0 22px}
.cta{display:inline-block;background:#22c55e;color:#04120a;font-weight:800;padding:14px 26px;border-radius:10px;margin:10px 0 6px;font-size:16px}.cta:hover{background:#16a34a;text-decoration:none}
.card{background:#141414;border:1px solid #262626;border-radius:12px;padding:18px 20px;margin:20px 0}
.card h2{font-size:18px;color:#fff;margin:0 0 10px}
.card h3{font-size:15px;color:#fff;margin:16px 0 4px}.card h3:first-of-type{margin-top:0}
.card p{margin:0 0 4px;color:#b8b8b8;font-size:14.5px}
.formula{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0f1a12;border:1px solid #14361f;color:#7ee2a8;padding:12px 14px;border-radius:8px;display:block;font-size:15px;overflow-x:auto;direction:ltr}
ul{padding-inline-start:20px;margin:8px 0}li{margin:6px 0}
.sub{margin:2px 0 6px;font-size:14px}.sub a{color:#8f8f8f}
.free{display:inline-block;background:#14361f;color:#4ade80;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em}
footer{border-top:1px solid #1e1e1e;margin-top:40px;padding:24px 0;color:#737373;font-size:13px}
footer a{color:#a3a3a3;margin-inline-end:16px}.disc{margin-top:12px;font-size:12px;color:#525252}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="${DOMAIN}/"><svg class="mark" viewBox="0 0 512 512" width="26" height="26" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="509" height="509" rx="120.3" fill="#0F0F0F" stroke="#262626" stroke-width="3"/><g transform="translate(56.3,123.9) scale(3.1446)"><polygon points="8,7 60,7 60,23 0,23" fill="#F2F2F2"/><rect x="24" y="23" width="16" height="54" fill="#F2F2F2"/><path d="M105 14 A 34 34 0 1 0 105 70" fill="none" stroke="#F2F2F2" stroke-width="16"/><rect x="87" y="33" width="2.5" height="32" fill="#17CF63"/><rect x="83" y="39" width="9" height="21" fill="#17CF63"/><rect x="100" y="26" width="2.5" height="33" fill="#17CF63"/><rect x="96" y="32" width="9" height="22" fill="#17CF63"/><rect x="113" y="17" width="2.5" height="36" fill="#17CF63"/><rect x="109" y="24" width="9" height="24" fill="#17CF63"/></g></svg>Trading Calculator <span>PRO</span></a>
  <nav class="top">${navHubs(lang, ui)}<a href="${DOMAIN}/pricing">${esc(ui.prices)}</a></nav>
</div></header>
<main class="wrap">
  <div class="crumb"><a href="${DOMAIN}/">${esc(ui.home)}</a> › <a href="${esc(sectionUrl)}">${esc(sectionLabel)}</a> › ${esc(h1)}</div>
  <span class="free">${esc(ui.free)}</span>
  <h1>${esc(h1)}</h1>
  <p class="lead">${esc(lead)}</p>
  <a class="cta" href="${DOMAIN}/pricing">${esc(ui.trial)} →</a>
  <p class="sub"><a href="${esc(ctaUrl)}">${esc(ctaLabel)} →</a></p>
  ${formula ? `<div class="card"><h2>${esc(ui.formula)}</h2><code class="formula">${esc(formula)}</code></div>` : ''}
  ${points && points.length ? `<div class="card"><h2>${esc(sectionKind === 'tools' ? ui.whatGet : ui.whatLearn)}</h2><ul>${pointsHtml}</ul></div>` : ''}
  ${conceptosHtml}
  ${howto && howto.length > 1 ? `<div class="card"><h2>${esc(howto[0])}</h2><ol>${howto.slice(1).map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>` : ''}
  <a class="cta" href="${DOMAIN}/pricing">${esc(ui.trial)} →</a>
  <div class="related card"><h2>${esc(sectionKind === 'tools' ? ui.otherCalcs : ui.moreTopics)}</h2><ul>${relatedHtml}</ul></div>
</main>
<footer><div class="wrap">
  <div>${navHubs(lang, ui)}<a href="${DOMAIN}/legal">Legal</a></div>
  <div class="disc">${esc(ui.disc)}</div>
</div></footer>
</body>
</html>`;
}

// Todo lo que este script ha escrito, para que nada pueda pisar nada.
const escritas = new Set();

function write(rel, html) {
  const full = path.join(BUILD, rel);
  fs.mkdirSync(full, { recursive: true });
  fs.writeFileSync(path.join(full, 'index.html'), html, 'utf8');
  escritas.add(rel);
}

const sitemapUrls = [];   // las ~1.640 fichas: la cola larga
const sitemapHubs = [];   // los 40 índices de sección
const sitemapApp  = [];   // las rutas del SPA con fichero propio

/**
 * Tabla de slugs de una sección: id de la entrada → { idioma: slug }.
 *
 * Se construye ENTERA antes de generar nada porque cada página necesita los
 * slugs de las demás: el `hreflang` cita las nueve hermanas de otro idioma y el
 * bloque de relacionadas cita seis vecinas. Calcularlos sobre la marcha
 * obligaría a adivinarlos dos veces y a que las dos adivinaciones coincidieran.
 *
 * @param entradas  lista en orden estable (el orden decide los desempates)
 * @param idDe      entrada → identificador (y slug español de partida)
 * @param titulosDe entrada → { idioma: título traducido }
 */
function tablaDeSlugs(entradas, idDe, titulosDe) {
  const usados = new Map(LANGS.map(([l]) => [l, new Set()]));
  const tabla = new Map();
  for (const e of entradas) {
    const id = idDe(e);
    const titulos = titulosDe(e);
    const porIdioma = {};
    for (const [lang] of LANGS) porIdioma[lang] = slugPara(lang, id, titulos, usados.get(lang));
    tabla.set(id, porIdioma);
  }
  return tabla;
}

// Registra la página puente si el slug se ha movido respecto al español.
const puenteSi = (lang, seccion, base, nuevo, urlNueva, etiqueta) => {
  if (lang === 'es' || nuevo === base) return;
  puente(`${PREF.get(lang)}${seccion}/${base}`, urlNueva, etiqueta);
};

// ── Calculadoras (todos los idiomas de LANGS: es+en inline, resto desde CALC_I18N) ──
const calcData = (c, lang) => c[lang] || (CALC_I18N[c.slug] || {})[lang];
const FECHA_CALCS = fechaReal('scripts/gen-seo-pages.js');
// El slug de cada calculadora en cada idioma, resuelto de una vez.
const SLUG_CALC = tablaDeSlugs(
  CALCS,
  (c) => c.slug,
  (c) => Object.fromEntries(LANGS.map(([l]) => [l, (calcData(c, l) || {}).kw || ''])),
);
const slugCalc = (c, lang) => SLUG_CALC.get(c.slug)[lang];
// Índice de lo generado, para que los hubs sepan a qué enlazar.
const indice = { learn: {}, tools: {}, markets: {}, strategies: {}, patterns: {}, candles: {} };
for (const s of SECCIONES) for (const [l] of LANGS) indice[s][l] = [];

let calcCount = 0;
CALCS.forEach((c, i) => {
  LANGS.forEach(([lang, pref, hl]) => {
    const d = calcData(c, lang);
    if (!d || !d.title) return; // idioma sin traducción → se salta
    const rel = `${PREF.get(lang)}tools/${slugCalc(c, lang)}`;
    const url = `${DOMAIN}/${rel}/`;
    // hreflang: solo idiomas que tienen traducción de esta calculadora
    const alts = LANGS.filter(([l]) => { const dd = calcData(c, l); return dd && dd.title; }).map(([l, p, h]) => [h, `${DOMAIN}/${PREF.get(l)}tools/${slugCalc(c, l)}/`]);
    const ui = UI[lang];
    const related = CALCS.filter((_, j) => j !== i).slice(0, 6).map(r => ({ url: `${DOMAIN}/${PREF.get(lang)}tools/${slugCalc(r, lang)}/`, label: cap((calcData(r, lang) || r.en).kw) }));
    const description = recortar(d.lead);
    const html = render({
      lang, url, alts, title: d.title, description, h1: cap(d.kw), kw: d.kw, ui,
      sectionLabel: ui.calcs, sectionUrl: hub(lang, 'tools'), lead: d.lead, formula: c.formula, points: d.pts,
      ctaUrl: `${DOMAIN}/dashboard?tab=${c.tab}`, ctaLabel: ui.useCalc, related, sectionKind: 'tools',
      // SIN bloque `offers`. Emitia `price:'0'` en las 120 paginas de
      // calculadora mientras `public/index.html` declara 17/45/200 EUR y el
      // dashboard exige suscripcion: le deciamos «gratis» a Google sobre algo
      // de pago. Y una calculadora suelta tampoco se vende por separado, asi
      // que no tiene precio propio que declarar. La oferta real vive donde
      // corresponde, en el `Product` de la portada.
      // Los pasos se PINTAN (ver `howto` en render) y luego se marcan. Un
      // HowTo sin texto visible describe contenido ausente — el mismo motivo
      // por el que las fichas de estrategia no llevan ninguno.
      howto: HOWTO[lang] || HOWTO.en,
      jsonld: { '@context':'https://schema.org', '@graph': [
        { '@type':'SoftwareApplication', name: d.title, applicationCategory:'FinanceApplication', operatingSystem:'Web', url, inLanguage: lang, description },
        { '@type':'HowTo', name: (HOWTO[lang] || HOWTO.en)[0] + ': ' + cap(d.kw), inLanguage: lang,
          step: (HOWTO[lang] || HOWTO.en).slice(1).map((t, n) => ({ '@type':'HowToStep', position: n + 1, name: t.split(':')[0], text: t })) },
      ] },
    });
    write(rel, html);
    // El texto de las 130 fichas está inline en ESTE fichero (CALCS/CALC_I18N
    // más arriba), así que su fecha real es la del propio generador.
    sitemapUrls.push([`/${rel}/`, '0.8', FECHA_CALCS]);
    indice.tools[lang].push({ url, label: cap(d.kw), lead: d.lead, fecha: FECHA_CALCS });
    puenteSi(lang, 'tools', c.slug, slugCalc(c, lang), url, cap(d.kw));
    calcCount++;
  });
});

// ── Educación (todos los idiomas de LANGS, contenido desde i18n) ──
//
// ⚠️ Estas páginas tenían 94 palabras visibles, de las cuales unas 40 eran del
// tema: título, una entradilla y el resto cromo (menú, migas, dos botones,
// seis enlaces y el descargo). 750 páginas casi idénticas con ese fondo son
// contenido delgado en el sentido literal del término, y arrastran la calidad
// percibida del dominio entero, no sólo la suya.
//
// La solución no es escribir texto nuevo —eso sería inventar— sino publicar el
// que YA existe traducido a los diez idiomas. Cada módulo de la academia
// declara sus conceptos como pares `<prefijo><Concepto>Name` /
// `…Desc` en `lib/i18n/*.edu.js`, que es de donde los lee
// `tradingEducationContent.js` para pintar el módulo dentro de la aplicación.
// Aquí se leen los mismos: misma fuente, así que la página pública y el módulo
// no pueden divergir, y `i18n-check.js` ya garantiza que los diez idiomas
// tienen el juego completo.
//
// ─── De dónde salen los conceptos ─────────────────────────────────
//
// De `tradingEducationContent.js`, que es EXACTAMENTE la estructura que la
// aplicación pinta dentro del módulo. Cada tema tiene ahí un `get…(t)` que
// devuelve su contenido con claves i18n; llamándolo con la `t` del idioma que
// toca sale el mismo texto que ve un suscriptor, traducido, sin inventar nada y
// sin posibilidad de divergir del módulo.
//
// El emparejamiento tema → getter **no se escribe a mano**: se descubre
// llamando a cada getter con `t = identidad` y comparando el `title` que
// devuelve con el `tk` del tema. Una tabla de 75 entradas escrita a mano se
// pudre en cuanto alguien renombra un getter, y se pudre EN SILENCIO — la
// página no fallaría, simplemente saldría corta, que es el fallo que este
// generador existe para no cometer.
const EDU_SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'tradingEducationContent.js'), 'utf8');
const EDU = (() => {
  const nombres = [...EDU_SRC.matchAll(/export const (\w+)\s*=/g)].map((m) => m[1]);
  const cuerpo = EDU_SRC.replace(/export\s+const/g, 'const').replace(/export\s+default[^;]*;/g, '');
  return new Function(`${cuerpo}\nreturn {${nombres.join(',')}};`)();
})();

const GETTER_DE_TEMA = (() => {
  const mapa = {};
  for (const [nombre, fn] of Object.entries(EDU)) {
    if (typeof fn !== 'function') continue;
    let forma;
    try { forma = fn((k) => k); } catch { continue; }
    if (forma && !Array.isArray(forma) && typeof forma.title === 'string') mapa[forma.title] = nombre;
  }
  return mapa;
})();

/**
 * Recorre la estructura del módulo y recoge sus pares concepto/explicación.
 *
 * Acepta las dos formas que conviven en el fichero: `{name, desc}` —los módulos
 * compactos— y `{title, description}` —los principios de Dow, los conceptos de
 * gestión de riesgo—. Deduplica, porque hay estructuras que citan el mismo
 * bloque dos veces, y limita la profundidad: ahí dentro hay objetos anidados de
 * varios niveles y un recorrido sin tope se puede ir en un ciclo.
 */
function recogerConceptos(nodo, salida = [], vistos = new Set(), prof = 0) {
  if (!nodo || prof > 6) return salida;
  if (Array.isArray(nodo)) { for (const n of nodo) recogerConceptos(n, salida, vistos, prof + 1); return salida; }
  if (typeof nodo !== 'object') return salida;
  const nombre = nodo.name ?? nodo.title;
  const desc = nodo.desc ?? nodo.description;
  if (typeof nombre === 'string' && typeof desc === 'string' && nombre.trim() && desc.trim()) {
    const clave = `${nombre}|${desc}`;
    if (!vistos.has(clave)) { vistos.add(clave); salida.push({ name: nombre, desc }); }
  }
  for (const v of Object.values(nodo)) if (v && typeof v === 'object') recogerConceptos(v, salida, vistos, prof + 1);
  return salida;
}

// El prefijo sale del propio `tk` del tema (`ntTitle` → `nt`). Cuando dos temas
// comparten principio, gana el prefijo MÁS LARGO: si no, `sm` (sentimiento) se
// llevaría claves de `smc` (smart money concepts).
//
// Esto es el PLAN B, para los temas cuyo contenido no vive en
// `tradingEducationContent.js` sino dentro de su propio componente JSX.
const PREFIJOS_TEMA = TOPICS
  .map((tp) => (tp.tk.match(/^(.*?)(Title|Tab)$/) || [])[1])
  .filter(Boolean)
  .sort((a, b) => b.length - a.length);

function conceptosDe(tp, lang) {
  // 1 · la fuente buena: la estructura que pinta el módulo.
  const getter = GETTER_DE_TEMA[tp.tk];
  if (getter) {
    const conceptos = recogerConceptos(EDU[getter]((k) => T[lang][k] || ''))
      // El primer par suele ser el título y la entradilla del propio módulo,
      // que ya salen como <h1> y `lead` de la página. Repetirlos sería
      // duplicado dentro de la misma página.
      .filter((c) => c.name !== T[lang][tp.tk] && c.desc !== T[lang][tp.ik]);
    if (conceptos.length) return conceptos;
  }

  // 2 · plan B por convenio de claves, para los temas que se pintan con un
  // componente propio y no tienen estructura de datos que leer.
  const prefijo = (tp.tk.match(/^(.*?)(Title|Tab)$/) || [])[1];
  if (!prefijo) return [];
  const re = new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([A-Z0-9]\\w*)Name$`);
  // El orden lo fija SIEMPRE el español: así los diez idiomas presentan los
  // conceptos en la misma secuencia y las traducciones son comparables.
  return Object.keys(T.es)
    .filter((k) => re.test(k))
    // Una clave que también case con un prefijo más largo pertenece a ese otro tema.
    .filter((k) => !PREFIJOS_TEMA.some((p) => p.length > prefijo.length && k.startsWith(p) && /^[A-Z0-9]/.test(k.slice(p.length))))
    .map((k) => ({ name: T[lang][k], desc: T[lang][k.replace(/Name$/, 'Desc')] }))
    .filter((c) => c.name && c.desc);
}

const SLUG_TEMA = tablaDeSlugs(
  TOPICS,
  (tp) => tp.slug,
  (tp) => Object.fromEntries(LANGS.map(([l]) => [l, T[l][tp.tk] || ''])),
);
const slugTema = (tp, lang) => SLUG_TEMA.get(tp.slug)[lang];

let learnCount = 0;
let conceptosPublicados = 0;
TOPICS.forEach((tp, i) => {
  LANGS.forEach(([lang, pref]) => {
    const title = T[lang][tp.tk];
    const intro = T[lang][tp.ik];
    if (!title || !intro) return; // salta si falta contenido en ese idioma
    const rel = `${PREF.get(lang)}learn/${slugTema(tp, lang)}`;
    const url = `${DOMAIN}/${rel}/`;
    const ui = UI[lang];
    // hreflang: solo idiomas que tienen el contenido
    const alts = LANGS.filter(([l]) => T[l][tp.tk] && T[l][tp.ik]).map(([l, p, hl]) => [hl, `${DOMAIN}/${PREF.get(l)}learn/${slugTema(tp, l)}/`]);
    const related = TOPICS.filter((_, j) => j !== i).filter(r => T[lang][r.tk]).slice(0, 6).map(r => ({ url: `${DOMAIN}/${PREF.get(lang)}learn/${slugTema(r, lang)}/`, label: T[lang][r.tk] }));
    const description = recortar(intro);
    const conceptos = conceptosDe(tp, lang);
    conceptosPublicados += conceptos.length;
    const html = render({
      lang, url, alts, title: `${title} | TradingCalculator.Pro`, description, h1: title, kw: title, ui,
      sectionLabel: ui.learn, sectionUrl: hub(lang, 'learn'), lead: intro, formula: null, points: null,
      conceptos, conceptosTitulo: ui.whatLearn,
      ctaUrl: `${DOMAIN}/education?topic=${tp.v}`, ctaLabel: ui.openModule, related, sectionKind: 'learn',
      jsonld: { '@context':'https://schema.org','@type':'LearningResource', name: title, url, inLanguage: lang, description,
        // `teaches` sólo se declara cuando los conceptos están IMPRESOS más
        // abajo. Un schema que describe contenido que no se ve es exactamente
        // el motivo por el que las fichas de estrategia no llevan HowTo.
        ...(conceptos.length ? { teaches: conceptos.map((c) => c.name) } : {}),
        provider:{ '@type':'Organization', name:'TradingCalculator.Pro', url: DOMAIN + '/' } },
    });
    write(rel, html);
    // El título y la entradilla salen de `<lang>.js`; los conceptos, de
    // `<lang>.edu.js` (ver `conceptosDe`). La más reciente de las dos manda.
    const fecha = fechaReal(`src/lib/i18n/${lang}.js`, `src/lib/i18n/${lang}.edu.js`);
    sitemapUrls.push([`/${rel}/`, '0.7', fecha]);
    indice.learn[lang].push({ url, label: title, lead: intro, fecha });
    puenteSi(lang, 'learn', tp.slug, slugTema(tp, lang), url, title);
    learnCount++;
  });
});

// ── Mercados (/markets/<id>/) ─────────────────────────────────────
// Objetivo: que preguntas como "what are the largest cryptocurrencies" se
// respondan con NUESTRO HTML. El marcado FAQPage solo es válido si la pregunta
// y la respuesta están visibles en la página, así que se imprimen ambas; el
// widget de TradingView va DEBAJO como complemento, nunca como fuente.
// Los idiomas sin traducción de la ficha caen a inglés (mismo criterio que
// lib/marketTypesContent.js), por lo que el schema y lo visible coinciden.
const MARKET_SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'marketTypesContent.js'), 'utf8');
const MARKETS = (() => {
  const body = MARKET_SRC
    .replace(/export\s+default\s+CONTENT;?/g, '')
    .replace(/export\s+/g, '');
  return new Function(`${body}\nreturn CONTENT;`)();
})();

const MARKET_UI = {
  es: { section:'Mercados', what:'Qué es', measure:'Cómo se mide', example:'Ejemplo resuelto', faq:'Preguntas frecuentes', cta:'Abrir la ficha interactiva', other:'Otros mercados' },
  en: { section:'Markets', what:'What it is', measure:'How it is measured', example:'Worked example', faq:'Frequently asked questions', cta:'Open the interactive fact sheet', other:'Other markets' },
  de: { section:'Märkte', what:'Was es ist', measure:'Wie es gemessen wird', example:'Rechenbeispiel', faq:'Häufige Fragen', cta:'Interaktives Datenblatt öffnen', other:'Weitere Märkte' },
  fr: { section:'Marchés', what:"Qu'est-ce que c'est", measure:'Comment on le mesure', example:'Exemple résolu', faq:'Questions fréquentes', cta:'Ouvrir la fiche interactive', other:'Autres marchés' },
  ru: { section:'Рынки', what:'Что это', measure:'Как измеряется', example:'Разобранный пример', faq:'Частые вопросы', cta:'Открыть интерактивную карточку', other:'Другие рынки' },
  zh: { section:'市场', what:'这是什么', measure:'如何衡量', example:'实例计算', faq:'常见问题', cta:'打开互动资料卡', other:'其他市场' },
  ja: { section:'マーケット', what:'これは何か', measure:'測り方', example:'計算例', faq:'よくある質問', cta:'インタラクティブ資料を開く', other:'他のマーケット' },
  ar: { section:'الأسواق', what:'ما هو', measure:'كيف يُقاس', example:'مثال محلول', faq:'أسئلة شائعة', cta:'افتح البطاقة التفاعلية', other:'أسواق أخرى' },
  pt: { section:'Mercados', what:'O que é', measure:'Como se mede', example:'Exemplo resolvido', faq:'Perguntas frequentes', cta:'Abrir a ficha interativa', other:'Outros mercados' },
  it: { section:'Mercati', what:"Che cos'è", measure:'Come si misura', example:'Esempio svolto', faq:'Domande frequenti', cta:'Apri la scheda interattiva', other:'Altri mercati' },
};

// Título localizado del mercado: se reutiliza la clave mkt*Name de i18n.
const MARKET_KEY = {
  forex:'mktForexName', stocks:'mktStocksName', crypto:'mktCryptoName',
  commodities:'mktCommoditiesName', indices:'mktIndicesName', etfs:'mktEtfsName',
  futures:'mktFuturesName', bonds:'mktBondsName', options:'mktOptionsName', cfds:'mktCfdsName',
};

function renderMarket({ lang, url, alts, id, name, body, mui, related }) {
  const dir = RTL.has(lang) ? ' dir="rtl"' : '';
  const hreflang = alts.map(([hl, u]) => `<link rel="alternate" hreflang="${hl}" href="${esc(u)}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${esc((alts.find(a => a[0] === 'es') || [null, url])[1])}">`;
  const title = `${name} — ${mui.what} · TradingCalculator.Pro`;
  const description = recortar(body.what, 155);
  const relatedHtml = related.map(r => `<li><a href="${esc(r.url)}">${esc(r.label)}</a></li>`).join('');

  // La FAQ se PINTA y se MARCA, en ese orden y desde la misma fuente.
  //
  // El comentario de arriba describía esto desde el principio («se imprimen
  // ambas») y no ocurría ninguna de las dos: `mui.faq` estaba traducido a los
  // diez idiomas sin que nadie lo usara, `body.faq` no se leía, y las 100
  // fichas de mercado salían con BreadcrumbList y nada más. Un FAQPage cuyo
  // texto no está visible es motivo de acción manual de Google, así que van
  // juntos por construcción: mismo array, mismo bucle.
  const faqs = Array.isArray(body.faq) ? body.faq.filter(f => f && f.q && f.a) : [];
  const faqHtml = faqs.length
    ? `<div class="card"><h2>${esc(mui.faq)}</h2>` +
      faqs.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('') +
      `</div>`
    : '';
  const faqLd = faqs.length
    ? ld({ '@context':'https://schema.org', '@type':'FAQPage', inLanguage: lang,
           mainEntity: faqs.map(f => ({
             '@type':'Question', name: f.q,
             acceptedAnswer: { '@type':'Answer', text: f.a },
           })) })
    : '';

  return `<!doctype html>
<html lang="${lang}"${dir}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- CSP de las páginas estáticas. Son autocontenidas —estilo en línea, sin
     script externo ni iframe—, así que aquí sí se puede prohibir el script por
     completo: si alguna vez alguien inyecta uno, el navegador lo bloquea.
     frame-ancestors no funciona en meta, así que el anti-clickjacking sigue
     necesitando cabeceras (ver G-10). -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; base-uri 'none'; form-action 'none'">

<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
${ICONOS()}
${hreflang}
<meta property="og:type" content="article">
<meta property="og:site_name" content="TradingCalculator.Pro">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(OG_IMAGE)}">
<meta property="og:locale" content="${ogLocale(lang)}">
<meta name="twitter:card" content="summary_large_image">
${ld({ '@context':'https://schema.org','@type':'BreadcrumbList', itemListElement:[
  { '@type':'ListItem', position:1, name: UI[lang].home, item: DOMAIN + '/' },
  { '@type':'ListItem', position:2, name: MARKET_UI[lang].section, item: hub(lang, 'markets') },
  { '@type':'ListItem', position:3, name: name, item: url },
] })}
${faqLd}
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#e5e5e5;line-height:1.65}
a{color:#34d399;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:820px;margin:0 auto;padding:0 20px}
header.top{border-bottom:1px solid #1e1e1e;padding:16px 0}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{font-weight:800;color:#fff;font-size:18px;display:inline-flex;align-items:center;gap:8px}.brand span{color:#34d399}
.brand .mark{flex:none;vertical-align:middle}
nav.top a{color:#a3a3a3;font-size:14px;margin-inline-start:16px}
.crumb{font-size:13px;color:#737373;padding:18px 0 0}.crumb a{color:#737373}
h1{font-size:30px;line-height:1.25;color:#fff;margin:14px 0 6px}
.lead{font-size:17px;color:#c7c7c7;margin:0 0 22px}
.cta{display:inline-block;background:#22c55e;color:#04120a;font-weight:800;padding:14px 26px;border-radius:10px;margin:10px 0 6px;font-size:16px}.cta:hover{background:#16a34a;text-decoration:none}
.card{background:#141414;border:1px solid #262626;border-radius:12px;padding:18px 20px;margin:20px 0}
.card h2{font-size:19px;color:#fff;margin:0 0 12px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:start;padding:9px 10px;border-bottom:1px solid #202020;vertical-align:top}
th{color:#fff;font-weight:700;width:34%}td{color:#b8b8b8}
td.num{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-align:end;color:#e5e5e5;white-space:nowrap}
.note{font-size:13px;color:#8f8f8f;border-top:1px solid #262626;margin-top:12px;padding-top:12px}
.qa{border-bottom:1px solid #202020;padding:12px 0}.qa:last-child{border-bottom:0}
.qa h3{font-size:15px;color:#fff;margin:0 0 6px}.qa p{margin:0;color:#b8b8b8;font-size:14px}
ul{padding-inline-start:20px;margin:8px 0}li{margin:6px 0}
footer{border-top:1px solid #1e1e1e;margin-top:40px;padding:24px 0;color:#737373;font-size:13px}
footer a{color:#a3a3a3;margin-inline-end:16px}.disc{margin-top:12px;font-size:12px;color:#525252}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="${DOMAIN}/"><svg class="mark" viewBox="0 0 512 512" width="26" height="26" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="509" height="509" rx="120.3" fill="#0F0F0F" stroke="#262626" stroke-width="3"/><g transform="translate(56.3,123.9) scale(3.1446)"><polygon points="8,7 60,7 60,23 0,23" fill="#F2F2F2"/><rect x="24" y="23" width="16" height="54" fill="#F2F2F2"/><path d="M105 14 A 34 34 0 1 0 105 70" fill="none" stroke="#F2F2F2" stroke-width="16"/><rect x="87" y="33" width="2.5" height="32" fill="#17CF63"/><rect x="83" y="39" width="9" height="21" fill="#17CF63"/><rect x="100" y="26" width="2.5" height="33" fill="#17CF63"/><rect x="96" y="32" width="9" height="22" fill="#17CF63"/><rect x="113" y="17" width="2.5" height="36" fill="#17CF63"/><rect x="109" y="24" width="9" height="24" fill="#17CF63"/></g></svg>Trading Calculator <span>PRO</span></a>
  <nav class="top">${navHubs(lang, UI[lang])}<a href="${DOMAIN}/pricing">${esc(UI[lang].prices)}</a></nav>
</div></header>
<main class="wrap">
  <div class="crumb"><a href="${DOMAIN}/">${esc(UI[lang].home)}</a> › <a href="${hub(lang, 'markets')}">${esc(mui.section)}</a> › ${esc(name)}</div>
  <h1>${esc(name)}</h1>
  <p class="lead">${esc(body.what)}</p>
  <a class="cta" href="${DOMAIN}/pricing">${esc(UI[lang].trial)} →</a>
  <p class="sub"><a href="${DOMAIN}/education?topic=fundamentals&amp;market=${esc(id)}">${esc(mui.cta)} →</a></p>

  ${faqHtml}
  <a class="cta" href="${DOMAIN}/pricing">${esc(UI[lang].trial)} →</a>
  <div class="card"><h2>${esc(mui.other)}</h2><ul>${relatedHtml}</ul></div>
</main>
<footer><div class="wrap">
  <div>${navHubs(lang, UI[lang])}<a href="${DOMAIN}/legal">Legal</a></div>
  <div class="disc">${esc(UI[lang].disc)}</div>
</div></footer>
</body>
</html>`;
}

let marketCount = 0;
const marketIds = Object.keys(MARKETS);
const SLUG_MERCADO = tablaDeSlugs(
  marketIds,
  (id) => id,
  (id) => Object.fromEntries(LANGS.map(([l]) => [l, T[l][MARKET_KEY[id]] || T.en[MARKET_KEY[id]] || id])),
);
const slugMercado = (id, lang) => SLUG_MERCADO.get(id)[lang];

LANGS.forEach(([lang, prefix]) => {
  const mui = MARKET_UI[lang] || MARKET_UI.en;
  const nameOf = (mid) => T[lang][MARKET_KEY[mid]] || T.en[MARKET_KEY[mid]] || mid;

  marketIds.forEach((id) => {
    // Body language: es when available, English for everyone else.
    const body = MARKETS[id][lang] || MARKETS[id].en;
    if (!body) return;
    const rel = `${PREF.get(lang)}markets/${slugMercado(id, lang)}`;
    const url = `${DOMAIN}/${rel}/`;
    const alts = LANGS
      .filter(([l2]) => MARKETS[id][l2] || MARKETS[id].en)
      .map(([l2, p2, hl]) => [hl, `${DOMAIN}/${PREF.get(l2)}markets/${slugMercado(id, l2)}/`]);
    const related = marketIds
      .filter((o) => o !== id)
      .slice(0, 6)
      .map((o) => ({ url: `${DOMAIN}/${PREF.get(lang)}markets/${slugMercado(o, lang)}/`, label: nameOf(o) }));

    write(rel, renderMarket({ lang, url, alts, id, name: nameOf(id), body, mui, related }));
    // El cuerpo (qué es, cómo se mide, FAQ) sale de `marketTypesContent.js`; el
    // nombre del mercado, de `<lang>.js`. La más reciente de las dos manda.
    const fecha = fechaReal('src/lib/marketTypesContent.js', `src/lib/i18n/${lang}.js`);
    sitemapUrls.push([`/${rel}/`, '0.75', fecha]);
    indice.markets[lang].push({ url, label: nameOf(id), lead: body.what, fecha });
    puenteSi(lang, 'markets', id, slugMercado(id, lang), url, nameOf(id));
    marketCount++;
  });
});

// ── Estrategias de opciones (/options/strategies/<slug>/) ─────────
// Una página por estrategia y por idioma. El catálogo ya existía dentro de la
// SPA, tras el muro de pago y sin una sola URL propia: 66 estructuras que
// ningún buscador podía ver. Aquí no se escribe contenido nuevo, se enruta el
// que ya estaba: nombre, descripción, patas, riesgo y cuándo usarla salen del
// mismo `STRATEGIES` que consume la calculadora, así que no pueden divergir.
const STRAT_SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'mockData.js'), 'utf8');
const STRATEGIES = (() => {
  const start = STRAT_SRC.indexOf('export const STRATEGIES');
  const body = STRAT_SRC.slice(start).replace(/export\s+const/, 'const');
  // eslint-disable-next-line no-new-func
  return new Function(`${body.slice(0, body.indexOf('\n];') + 3)}\nreturn STRATEGIES;`)();
})();

const STRAT_UI = {
  es: { section:'Estrategias de opciones', legs:'Patas', risk:'Riesgo', reward:'Recompensa', maxP:'Beneficio máximo', maxL:'Pérdida máxima', when:'Cuándo usarla', open:'Abrir en la calculadora', multi:'Usa más de un vencimiento' },
  en: { section:'Options strategies', legs:'Legs', risk:'Risk', reward:'Reward', maxP:'Max profit', maxL:'Max loss', when:'When to use it', open:'Open in the calculator', multi:'Uses more than one expiration' },
  de: { section:'Optionsstrategien', legs:'Beine', risk:'Risiko', reward:'Chance', maxP:'Max. Gewinn', maxL:'Max. Verlust', when:'Wann einsetzen', open:'Im Rechner öffnen', multi:'Nutzt mehr als einen Verfall' },
  fr: { section:'Stratégies d’options', legs:'Jambes', risk:'Risque', reward:'Gain', maxP:'Gain maximum', maxL:'Perte maximum', when:'Quand l’utiliser', open:'Ouvrir dans la calculatrice', multi:'Utilise plusieurs échéances' },
  ru: { section:'Опционные стратегии', legs:'Ноги', risk:'Риск', reward:'Доход', maxP:'Макс. прибыль', maxL:'Макс. убыток', when:'Когда использовать', open:'Открыть в калькуляторе', multi:'Использует несколько экспираций' },
  zh: { section:'期权策略', legs:'腿', risk:'风险', reward:'收益', maxP:'最大盈利', maxL:'最大亏损', when:'何时使用', open:'在计算器中打开', multi:'使用多个到期日' },
  ja: { section:'オプション戦略', legs:'脚', risk:'リスク', reward:'リターン', maxP:'最大利益', maxL:'最大損失', when:'使いどころ', open:'計算機で開く', multi:'複数の満期を使用' },
  ar: { section:'استراتيجيات الخيارات', legs:'الأرجل', risk:'المخاطرة', reward:'العائد', maxP:'أقصى ربح', maxL:'أقصى خسارة', when:'متى تستخدمها', open:'افتح في الحاسبة', multi:'تستخدم أكثر من تاريخ استحقاق' },
  pt: { section:'Estratégias de opções', legs:'Pernas', risk:'Risco', reward:'Retorno', maxP:'Lucro máximo', maxL:'Perda máxima', when:'Quando usá-la', open:'Abrir na calculadora', multi:'Usa mais do que um vencimento' },
  it: { section:'Strategie in opzioni', legs:'Gambe', risk:'Rischio', reward:'Rendimento', maxP:'Profitto massimo', maxL:'Perdita massima', when:'Quando usarla', open:'Apri nella calcolatrice', multi:'Usa più di una scadenza' },
};

// Las estrategias nuevas llevan su nombre en literal (los términos del sector
// no se traducen: nadie busca "call cubierta del hombre pobre"); las antiguas
// llevan clave i18n. `tr` resuelve ambos casos sin ramificar en el llamante.
const tr = (lang, value) => (value ? (T[lang][value] || T.es[value] || value) : '');
const slugOf = (s) => String(s.id).replace(/_/g, '-');
const legLine = (leg) => {
  const where = leg.type === 'stock'
    ? ''
    : ` @ ATM${(leg.offset || 0) >= 0 ? '+' : ''}${leg.offset || 0}`;
  const exp = leg.expOffset ? ` · exp+${leg.expOffset}` : '';
  return `${leg.action === 'buy' ? 'BUY' : 'SELL'} ${leg.qty}× ${leg.type.toUpperCase()}${where}${exp}`;
};

const SLUG_ESTRATEGIA = tablaDeSlugs(
  STRATEGIES,
  (s) => slugOf(s),
  (s) => Object.fromEntries(LANGS.map(([l]) => [l, tr(l, s.name)])),
);
const slugEstrategia = (s, lang) => SLUG_ESTRATEGIA.get(slugOf(s))[lang];

let stratCount = 0;
STRATEGIES.forEach((s, i) => {
  const slug = slugOf(s);
  const multiExpiry = new Set(s.legs.map((l) => l.expOffset || 0)).size > 1;
  LANGS.forEach(([lang, pref, hl]) => {
    const sui = STRAT_UI[lang] || STRAT_UI.en;
    const ui = UI[lang];
    const name = tr(lang, s.name);
    const lead = tr(lang, s.description);
    if (!name || !lead) return;
    const rel = `${PREF.get(lang)}options/strategies/${slugEstrategia(s, lang)}`;
    const url = `${DOMAIN}/${rel}/`;
    const alts = LANGS.map(([l2, p2, h2]) => [h2, `${DOMAIN}/${PREF.get(l2)}options/strategies/${slugEstrategia(s, l2)}/`]);
    const related = STRATEGIES
      .filter((r, j) => j !== i && r.category === s.category)
      .slice(0, 6)
      .map((r) => ({ url: `${DOMAIN}/${PREF.get(lang)}options/strategies/${slugEstrategia(r, lang)}/`, label: tr(lang, r.name) }));
    // Anzuelo: la ficha enseña qué es la estructura y para qué sirve, pero NO
    // la receta (patas, riesgo, máximos, cuándo usarla). Eso vive dentro de la
    // app, tras el muro de pago.
    const points = multiExpiry ? [sui.multi] : [];
    const description = recortar(lead);
    const html = render({
      lang, url, alts, title: `${name} | ${sui.section}`, description, h1: name, kw: name, ui,
      sectionLabel: sui.section, sectionUrl: hub(lang, 'strategies'),
      lead, formula: '', points,
      ctaUrl: `${DOMAIN}/options/calculator?strategy=${s.id}`, ctaLabel: sui.open,
      related, sectionKind: 'options',
      // Sin HowTo: sus pasos eran las patas de la estrategia y ya no se
      // publican. Un schema que describa contenido ausente es un problema,
      // no una ventaja.
      jsonld: {
        '@context': 'https://schema.org', '@type': 'WebPage', name, url, inLanguage: lang, description,
      },
    });
    write(rel, html);
    // Nombre y descripción salen de `mockData.js` (literal o clave i18n vía
    // `tr()`); cuando es clave, `<lang>.js` puede ser la más reciente.
    const fecha = fechaReal('src/data/mockData.js', `src/lib/i18n/${lang}.js`);
    sitemapUrls.push([`/${rel}/`, '0.7', fecha]);
    indice.strategies[lang].push({ url, label: name, lead, fecha });
    puenteSi(lang, 'options/strategies', slug, slugEstrategia(s, lang), url, name);
    stratCount++;
  });
});

// ── Patrones chartistas y de vela (/patterns/<id>/, /candles/<id>/) ───
// 42 patrones chartistas (23 de vuelta + 19 de continuación) y 35 de vela
// (15 alcistas + 16 bajistas + 4 neutrales) que ya vivían en el módulo de
// educación, tras el muro, sin una sola URL propia. El `id` NO se traduce
// —"head-shoulders", "hammer"— porque es la misma jerga técnica en los diez
// idiomas (mismo criterio que las estrategias de opciones): no hay slug que
// derivar ni página puente que generar, es contenido nuevo.
//
// `EDU.getChartPatterns(t)`/`getCandlestickPatterns(t)` devuelven el mismo
// array estructural en cualquier idioma (mismos ids, mismo orden); sólo el
// texto que pasa por `t()` cambia. Se llama una vez por idioma y se indexa
// por `id`, igual que TOPICS con `conceptosDe`.
function patronesPorIdioma(getter, categorias) {
  const porLang = {};
  for (const [lang] of LANGS) {
    const t = (k) => T[lang][k] || k;
    const grupos = getter(t);
    const lista = [];
    for (const cat of categorias) (grupos[cat] || []).forEach((p) => lista.push({ ...p, categoria: cat }));
    porLang[lang] = lista;
  }
  return porLang;
}

const CHART_PATTERNS_LANG = patronesPorIdioma(EDU.getChartPatterns, ['reversal', 'continuation']);
const CANDLE_PATTERNS_LANG = patronesPorIdioma(EDU.getCandlestickPatterns, ['bullish', 'bearish', 'neutral']);

// El id y la categoría no cambian entre idiomas: español sirve de referencia
// para recorrer cada patrón una sola vez.
const CHART_IDS = CHART_PATTERNS_LANG.es.map((p) => p.id);
const CANDLE_IDS = CANDLE_PATTERNS_LANG.es.map((p) => p.id);

const CAT_LABEL = {
  reversal: 'reversalPattern', continuation: 'continuationPattern',
  bullish: 'bullish', bearish: 'bearish', neutral: 'neutral',
};

/**
 * Genera las páginas de un catálogo de patrones (chartistas o de vela).
 *
 * @param seccion    'patterns' | 'candles' — decide el hub y la sección del sitemap
 * @param porLang    salida de `patronesPorIdioma`
 * @param ids        ids en orden estable (referencia española)
 * @param sectionKey clave de T[lang] con el título de la sección (chartPatterns/candlestickPatterns)
 * @param topic      valor de `?topic=` en la academia (chart-patterns/candlesticks)
 * @param prio       prioridad del sitemap
 */
function generaPatrones(seccion, porLang, ids, sectionKey, topic, prio) {
  let n = 0;
  ids.forEach((id) => {
    LANGS.forEach(([lang, pref, hl]) => {
      const ui = UI[lang];
      const lista = porLang[lang];
      const p = lista.find((x) => x.id === id);
      if (!p || !p.name || !p.description) return; // defensa: nunca debería faltar (i18n-check lo garantiza)
      const rel = `${PREF.get(lang)}${seccion}/${id}`;
      const url = `${DOMAIN}/${rel}/`;
      const alts = LANGS.map(([l2, p2, h2]) => [h2, `${DOMAIN}/${PREF.get(l2)}${seccion}/${id}/`]);
      const related = lista
        .filter((r) => r.id !== id && r.categoria === p.categoria)
        .slice(0, 6)
        .map((r) => ({ url: `${DOMAIN}/${PREF.get(lang)}${seccion}/${r.id}/`, label: r.name }));
      const catLabel = T[lang][CAT_LABEL[p.categoria]] || p.categoria;
      const tipoLabel = T[lang][CAT_LABEL[p.type]] || p.type;
      const points = [
        `${T[lang].reliability}: ${p.reliability}`,
        seccion === 'patterns'
          ? `${T[lang].timeframes}: ${(p.timeframes || []).join(', ')}`
          : `${T[lang].signal}: ${p.signal}`,
        `${catLabel} · ${tipoLabel}`,
      ];
      const howto = (p.howToTrade && p.howToTrade.length) ? [T[lang].howToTrade, ...p.howToTrade] : null;
      const description = recortar(p.description);
      const sectionLabel = T[lang][sectionKey];
      const html = render({
        lang, url, alts, title: `${p.name} | ${sectionLabel}`, description, h1: p.name, kw: p.name, ui,
        sectionLabel, sectionUrl: hub(lang, seccion),
        lead: p.description, formula: null, points,
        ctaUrl: `${DOMAIN}/education?topic=${topic}`, ctaLabel: ui.openModule,
        related, sectionKind: 'learn', howto,
        jsonld: {
          '@context': 'https://schema.org', '@type': 'DefinedTerm', name: p.name, description, url, inLanguage: lang,
          inDefinedTermSet: hub(lang, seccion),
        },
      });
      write(rel, html);
      const fecha = fechaReal('src/lib/tradingEducationContent.js', `src/lib/i18n/${lang}.js`, `src/lib/i18n/${lang}.edu.js`);
      sitemapUrls.push([`/${rel}/`, prio, fecha]);
      indice[seccion][lang].push({ url, label: p.name, lead: p.description, fecha });
      n++;
    });
  });
  return n;
}

const patternCount = generaPatrones('patterns', CHART_PATTERNS_LANG, CHART_IDS, 'chartPatterns', 'chart-patterns', '0.65');
const candleCount = generaPatrones('candles', CANDLE_PATTERNS_LANG, CANDLE_IDS, 'candlestickPatterns', 'candlesticks', '0.65');

// ── Hubs de sección (/<idioma>/learn/, /tools/, /markets/, /strategies/) ──
//
// El esqueleto que faltaba. Hasta aquí las 1.640 páginas eran alcanzables sólo
// por el sitemap: un rastreador las descubría, pero ninguna recibía un enlace
// desde una página con autoridad, así que todas competían desde cero. Estos 40
// índices las cuelgan del árbol.
const HUB_UI = {
  es: { learn:'Toda la formación de trading', tools:'Todas las calculadoras', markets:'Todos los mercados', strategies:'Todas las estrategias con opciones', sub:'temas', subT:'calculadoras', subM:'mercados', subS:'estrategias', subP:'patrones', subC:'patrones de vela' },
  en: { learn:'All trading education', tools:'All calculators', markets:'All markets', strategies:'All options strategies', sub:'topics', subT:'calculators', subM:'markets', subS:'strategies', subP:'patterns', subC:'candlestick patterns' },
  de: { learn:'Alle Trading-Lerninhalte', tools:'Alle Rechner', markets:'Alle Märkte', strategies:'Alle Optionsstrategien', sub:'Themen', subT:'Rechner', subM:'Märkte', subS:'Strategien', subP:'Muster', subC:'Kerzenmuster' },
  fr: { learn:'Toute la formation trading', tools:'Toutes les calculatrices', markets:'Tous les marchés', strategies:'Toutes les stratégies d’options', sub:'thèmes', subT:'calculatrices', subM:'marchés', subS:'stratégies', subP:'figures', subC:'figures de bougies' },
  ru: { learn:'Всё обучение трейдингу', tools:'Все калькуляторы', markets:'Все рынки', strategies:'Все опционные стратегии', sub:'тем', subT:'калькуляторов', subM:'рынков', subS:'стратегий', subP:'паттернов', subC:'свечных паттернов' },
  zh: { learn:'全部交易课程', tools:'全部计算器', markets:'全部市场', strategies:'全部期权策略', sub:'个主题', subT:'个计算器', subM:'个市场', subS:'个策略', subP:'个形态', subC:'个蜡烛形态' },
  ja: { learn:'すべてのトレード教材', tools:'すべての計算ツール', markets:'すべてのマーケット', strategies:'すべてのオプション戦略', sub:'テーマ', subT:'計算ツール', subM:'マーケット', subS:'戦略', subP:'パターン', subC:'ローソク足パターン' },
  ar: { learn:'كل تعليم التداول', tools:'كل الحاسبات', markets:'كل الأسواق', strategies:'كل استراتيجيات الخيارات', sub:'موضوعًا', subT:'حاسبة', subM:'سوقًا', subS:'استراتيجية', subP:'نمطًا', subC:'نمط شموع' },
  pt: { learn:'Toda a formação de trading', tools:'Todas as calculadoras', markets:'Todos os mercados', strategies:'Todas as estratégias com opções', sub:'temas', subT:'calculadoras', subM:'mercados', subS:'estratégias', subP:'padrões', subC:'padrões de candles' },
  it: { learn:'Tutta la formazione di trading', tools:'Tutte le calcolatrici', markets:'Tutti i mercati', strategies:'Tutte le strategie in opzioni', sub:'temi', subT:'calcolatrici', subM:'mercati', subS:'strategie', subP:'pattern', subC:'pattern di candele' },
};
const CONTADOR = { learn:'sub', tools:'subT', markets:'subM', strategies:'subS', patterns:'subP', candles:'subC' };

function renderHub({ lang, seccion, entradas }) {
  const ui = UI[lang];
  const h = HUB_UI[lang] || HUB_UI.en;
  const dir = RTL.has(lang) ? ' dir="rtl"' : '';
  const url = hub(lang, seccion);
  // `patterns`/`candles` reutilizan la etiqueta de la aplicación —misma
  // fuente que `navHubs`— en vez de una traducción propia que podría divergir.
  const titulo = seccion === 'patterns' ? T[lang].chartPatterns
    : seccion === 'candles' ? T[lang].candlestickPatterns
    : h[seccion];
  const description = recortar(`${titulo} — ${entradas.length} ${h[CONTADOR[seccion]]}. ${ui.disc}`);
  const alts = LANGS
    .filter(([l]) => indice[seccion][l].length)
    .map(([l, , hl]) => [hl, hub(l, seccion)]);
  const hreflang = alts.map(([hl, u]) => `<link rel="alternate" hreflang="${hl}" href="${esc(u)}">`).join('\n')
    + `\n<link rel="alternate" hreflang="x-default" href="${esc(hub('es', seccion))}">`;
  const lista = entradas
    .map((e) => `<li><a href="${esc(e.url)}">${esc(e.label)}</a><span> — ${esc(recortar(e.lead, 110))}</span></li>`)
    .join('');
  return `<!doctype html>
<html lang="${lang}"${dir}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; base-uri 'none'; form-action 'none'">

<title>${esc(titulo)} | TradingCalculator.Pro</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
${ICONOS()}
${hreflang}
<meta property="og:type" content="website">
<meta property="og:site_name" content="TradingCalculator.Pro">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(OG_IMAGE)}">
<meta property="og:locale" content="${ogLocale(lang)}">
<meta name="twitter:card" content="summary_large_image">
${ld({ '@context':'https://schema.org', '@type':'CollectionPage', name: titulo, url, inLanguage: lang, description,
  isPartOf: { '@type':'WebSite', name:'TradingCalculator.Pro', url: DOMAIN + '/' },
  mainEntity: { '@type':'ItemList', numberOfItems: entradas.length,
    itemListElement: entradas.map((e, n) => ({ '@type':'ListItem', position: n + 1, name: e.label, url: e.url })) } })}
${ld({ '@context':'https://schema.org','@type':'BreadcrumbList', itemListElement:[
  { '@type':'ListItem', position:1, name: ui.home, item: DOMAIN + '/' },
  { '@type':'ListItem', position:2, name: titulo, item: url },
] })}
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#e5e5e5;line-height:1.65}
a{color:#34d399;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:860px;margin:0 auto;padding:0 20px}
header.top{border-bottom:1px solid #1e1e1e;padding:16px 0}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{font-weight:800;color:#fff;font-size:18px;display:inline-flex;align-items:center;gap:8px}.brand span{color:#34d399}
.brand .mark{flex:none;vertical-align:middle}
nav.top a{color:#a3a3a3;font-size:14px;margin-inline-start:16px}
.crumb{font-size:13px;color:#737373;padding:18px 0 0}.crumb a{color:#737373}
h1{font-size:31px;line-height:1.25;color:#fff;margin:14px 0 6px}
.lead{font-size:17px;color:#c7c7c7;margin:0 0 22px}
.cta{display:inline-block;background:#22c55e;color:#04120a;font-weight:800;padding:14px 26px;border-radius:10px;margin:6px 0 18px;font-size:16px}.cta:hover{background:#16a34a;text-decoration:none}
ul.idx{list-style:none;padding:0;margin:0}
ul.idx li{border-bottom:1px solid #1c1c1c;padding:11px 0}
ul.idx li:last-child{border-bottom:0}
ul.idx a{font-weight:600}
ul.idx span{color:#8f8f8f;font-size:14px}
footer{border-top:1px solid #1e1e1e;margin-top:40px;padding:24px 0;color:#737373;font-size:13px}
footer a{color:#a3a3a3;margin-inline-end:16px}.disc{margin-top:12px;font-size:12px;color:#525252}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="${DOMAIN}/"><svg class="mark" viewBox="0 0 512 512" width="26" height="26" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="509" height="509" rx="120.3" fill="#0F0F0F" stroke="#262626" stroke-width="3"/><g transform="translate(56.3,123.9) scale(3.1446)"><polygon points="8,7 60,7 60,23 0,23" fill="#F2F2F2"/><rect x="24" y="23" width="16" height="54" fill="#F2F2F2"/><path d="M105 14 A 34 34 0 1 0 105 70" fill="none" stroke="#F2F2F2" stroke-width="16"/><rect x="87" y="33" width="2.5" height="32" fill="#17CF63"/><rect x="83" y="39" width="9" height="21" fill="#17CF63"/><rect x="100" y="26" width="2.5" height="33" fill="#17CF63"/><rect x="96" y="32" width="9" height="22" fill="#17CF63"/><rect x="113" y="17" width="2.5" height="36" fill="#17CF63"/><rect x="109" y="24" width="9" height="24" fill="#17CF63"/></g></svg>Trading Calculator <span>PRO</span></a>
  <nav class="top">${navHubs(lang, ui)}<a href="${DOMAIN}/pricing">${esc(ui.prices)}</a></nav>
</div></header>
<main class="wrap">
  <div class="crumb"><a href="${DOMAIN}/">${esc(ui.home)}</a> › ${esc(titulo)}</div>
  <h1>${esc(titulo)}</h1>
  <p class="lead">${entradas.length} ${esc(h[CONTADOR[seccion]])}</p>
  <a class="cta" href="${DOMAIN}/pricing">${esc(ui.trial)} →</a>
  <ul class="idx">${lista}</ul>
</main>
<footer><div class="wrap">
  <div>${navHubs(lang, ui)}<a href="${DOMAIN}/legal">Legal</a></div>
  <div class="disc">${esc(ui.disc)}</div>
</div></footer>
</body>
</html>`;
}

let hubCount = 0;
SECCIONES.forEach((seccion) => {
  LANGS.forEach(([lang]) => {
    const entradas = indice[seccion][lang];
    if (!entradas.length) return;
    const rel = `${PREF.get(lang)}${seccion}`;
    write(rel, renderHub({ lang, seccion, entradas }));
    // Un índice «cambia» cuando cambia cualquiera de sus fichas: la fecha del
    // hub es la más reciente de las que enlaza, nunca una inventada aparte.
    const fecha = entradas.reduce((max, e) => (e.fecha > max ? e.fecha : max), entradas[0].fecha);
    sitemapHubs.push([`/${rel}/`, '0.85', fecha]);
    hubCount++;
  });
});

// ── Páginas puente de las URLs que se movieron al traducir los slugs ──
//
// GitHub Pages no permite cabeceras, así que no hay 301 posible: lo más fuerte
// publicable es `canonical` + `meta refresh` a cero, que Google y Yandex tratan
// como redirección permanente. Sin `noindex` —contradiría al canonical— y sin
// entrar en el sitemap: existen para que ni los enlaces viejos ni la
// indexación acumulada caigan en un 404.
// La guarda que hace esto seguro: un puente NUNCA puede sobrescribir una
// página real. Puede ocurrir sin mala suerte extraordinaria — basta con que el
// slug español de un tema coincida con el slug derivado de otro tema en otro
// idioma— y el resultado sería sustituir contenido indexado por una
// redirección, en silencio y sin que falle nada. Si pasa, el build cae.
let puenteCount = 0;
const pisados = [];
for (const [rel, destino, etiqueta] of puentes) {
  if (escritas.has(rel)) { pisados.push([rel, destino]); continue; }
  // El `canonical` va ABSOLUTO —es la señal que transfiere la indexación y
  // tiene que nombrar el dominio— pero el `refresh` y el enlace van RELATIVOS.
  //
  // Con el refresh absoluto, un puente servido desde cualquier otro sitio
  // saca al visitante del origen en el que está: en CI la sonda de CSP siguió
  // uno hasta el sitio de producción y midió allí, y desde la URL de proyecto
  // de GitHub Pages —la red de seguridad si cae el DNS— habría hecho lo mismo.
  // Relativo, el puente se queda donde lo sirvan, que es lo que debe hacer.
  const ruta = new URL(destino).pathname;
  write(rel, `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${esc(ruta)}">
<link rel="canonical" href="${esc(destino)}">
<meta name="robots" content="follow">
<title>${esc(etiqueta || destino)}</title>
</head>
<body><p>→ <a href="${esc(ruta)}">${esc(etiqueta || destino)}</a></p></body>
</html>`);
  puenteCount++;
}
if (pisados.length) {
  console.error(`\n✗ ${pisados.length} página(s) puente chocan con una página real:`);
  for (const [rel, destino] of pisados.slice(0, 10)) console.error(`    · /${rel}/ → ${destino}`);
  console.error('  Se han conservado las páginas reales. Cambia el slug que colisiona.');
  process.exitCode = 1;
}

// ── Rutas de aplicación: el shell, servido con estado 200 ──
//
// EL FALLO QUE MÁS CARO SALÍA, y era invisible desde dentro.
//
// GitHub Pages no reescribe rutas: para `/pricing` busca `pricing.html` y
// `pricing/index.html`, y si no encuentra ninguno sirve `404.html` **con estado
// HTTP 404**. El workflow copia ahí el shell del SPA, así que la persona ve la
// web perfecta y no sospecha nada — pero el rastreador recibe un 404 y NO
// INDEXA. `/pricing`, `/about`, `/contact`, `/legal`, `/education`, `/options` y
// `/options/strategies` llevaban así desde siempre, las siete anunciadas en el
// sitemap con prioridad 0.85-0.9, y encima los dos botones verdes de cada una de
// las páginas estáticas apuntan a `/pricing`.
//
// La cura es un fichero de verdad en cada ruta: el shell compilado —el mismo
// JavaScript, la misma aplicación— con SU título, SU descripción y SU canonical
// en el HTML crudo, para que un rastreador que no ejecuta JavaScript no vea
// ocho veces la misma portada. `useSEO` reescribe esas etiquetas al arrancar,
// con los mismos valores y desde las MISMAS claves i18n: el HTML crudo y el
// renderizado no pueden divergir.
//
// Se escriben las DOS formas (`pricing.html` y `pricing/index.html`) a
// propósito: Pages resuelve `/pricing` con la primera y `/pricing/` con la
// segunda, así que ninguna de las dos depende de que el servidor pruebe la
// extensión ni de una redirección. Las dos declaran el mismo canonical SIN
// barra final — el que anuncia el sitemap y el que emite `useSEO`.
const APP = [
  // ruta,                prioridad, clave de título,        clave de descripción,  indexable
  ['/',                   '1.0',  null,                    null,                     true ],
  ['/pricing',            '0.85', 'seoPricingTitle',       'seoPricingDesc',         true ],
  ['/about',              '0.7',  'seoAboutTitle',         'seoAboutDesc',           true ],
  ['/contact',            '0.6',  'seoContactTitle',       'seoContactDesc',         true ],
  ['/legal',              '0.4',  'seoLegalTitle',         'seoLegalDesc',           true ],
  // ⚠️ `/brokers` y `/backtesting` NO están aquí, y no es un olvido. Sus
  // componentes declaran `noindex: true` con el motivo escrito al lado —una
  // lista de afiliados vacía, y una página cuyo contenido principal es de otro
  // dominio—. Estuvieron en esta lista y era una contradicción de tres bandas:
  // el sitemap pidiendo que se indexaran, el HTML estático diciendo
  // `index, follow`, y `useSEO` poniendo `noindex` en cuanto React montaba. La
  // guarda de abajo impide repetirlo.
  //
  // Estas tres son `ProtectedRoute premiumOnly`: su contenido está tras el muro.
  // Se les da estado 200 porque las páginas de academia y de estrategia enlazan
  // a ellas («Abrir el módulo completo»), y mandar miles de enlaces internos a
  // un 404 es peor que cualquier cosa que hagan aquí. Pero NO van al sitemap y
  // llevan `noindex`: es la decisión que ya estaba escrita para `/performance`.
  //
  // Y NO se bloquean en `robots.txt`, que sería la reacción natural: una ruta
  // prohibida ahí nunca llega a leer su propio `noindex`, así que Google puede
  // indexar la URL a secas —sin contenido— por los enlaces que la citan. Con
  // `noindex, follow` la lee, no la indexa, y sigue repartiendo autoridad.
  ['/education',          null,   'seoEducationTitle',     'seoEducationDesc',       false],
  ['/options',            null,   'optStrategiesSection',  'optStrategiesIndexLead', false],
  ['/options/strategies', null,   'optStrategiesSection',  'optStrategiesIndexLead', false],
  // Las tres de autenticación estaban en el peor de los dos mundos: devolvían
  // 404 de Pages (un enlace de login compartido no abría) y a la vez eran
  // indexables, porque `useSEO` no les ponía `noindex` y robots no las bloquea.
  // Ahora responden 200 —el enlace funciona— y declaran `noindex` en el HTML
  // crudo, por el mismo motivo que las tres de arriba.
  ['/login',              null,   'seoLoginTitle',         'seoLoginDesc',           false],
  ['/register',           null,   'seoRegisterTitle',      'seoRegisterDesc',        false],
  ['/forgot-password',    null,   'seoForgotTitle',        'seoForgotDesc',          false],
];

// Ninguna ruta INDEXABLE de aquí puede llevar `noindex` en su componente.
//
// Se comprueba leyendo `App.js` para saber qué componente sirve cada ruta y
// mirando su fichero, en vez de mantener una segunda lista a mano: una lista
// paralela se desincroniza en la primera revisión, y este verificador dejaría
// de decir la verdad justo cuando más falta hace.
(() => {
  const rutasApp = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.js'), 'utf8');
  const malas = [];
  for (const [ruta, prio] of APP) {
    if (ruta === '/' || !prio) continue;              // sólo las que van al sitemap
    const nombre = ruta.replace(/^\//, '');
    const m = rutasApp.match(new RegExp(`path="/${nombre}"\\s+element=\\{<(?:ProtectedRoute[^>]*>)?\\s*<?(\\w+)`));
    if (!m) { malas.push(`${nombre}: no encuentro su <Route> en App.js`); continue; }
    const fichero = path.join(__dirname, '..', 'src', 'pages', `${m[1]}.jsx`);
    if (!fs.existsSync(fichero)) { malas.push(`${nombre}: no encuentro ${m[1]}.jsx`); continue; }
    if (/noindex:\s*true/.test(fs.readFileSync(fichero, 'utf8')))
      malas.push(`${nombre}: ${m[1]}.jsx declara noindex: true`);
  }
  if (malas.length) {
    console.error('\n✗ APP anuncia en el sitemap rutas que no deben indexarse:');
    for (const x of malas) console.error(`    · ${x}`);
    console.error('  Anunciarlas contradice al propio componente.');
    process.exitCode = 1;
  }
})();

// Sustituye el CONTENIDO de una etiqueta ya presente en el shell. Si la etiqueta
// no está, no se inventa: el shell es la fuente y un cambio ahí tiene que verse
// aquí, no quedar silenciosamente sin efecto.
const faltantes = new Set();
const sust = (html, re, reemplazo, que) => {
  if (!re.test(html)) { faltantes.add(que); return html; }
  return html.replace(re, reemplazo);
};

let shellCount = 0;
const SHELL = path.join(BUILD, 'index.html');
if (!fs.existsSync(SHELL)) {
  console.log('⚠️  build/index.html no existe: no se generan las rutas del SPA.');
  console.log('    (normal si has ejecutado este script suelto, sin `craco build` antes)');
} else {
  const shellSrc = fs.readFileSync(SHELL, 'utf8');
  // El texto de estas páginas sale de las claves i18n de `useSEO`, en
  // `src/lib/i18n/es.js`: ésa es la fuente cuya fecha vale como `lastmod`.
  const FECHA_APP = fechaReal('src/lib/i18n/es.js', 'public/index.html');
  for (const [ruta, prio, tk, dk, indexable] of APP) {
    if (ruta === '/') continue;                       // ya lo sirve build/index.html
    const titulo = tk ? `${T.es[tk]} | Trading Calculator PRO` : null;
    const desc = dk ? recortar(T.es[dk]) : null;
    const url = `${DOMAIN}${ruta}`;
    let html = shellSrc;
    if (titulo) {
      html = sust(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)}</title>`, '<title>');
      html = sust(html, /(<meta property="og:title" content=")[^"]*"/, `$1${esc(titulo)}"`, 'og:title');
      html = sust(html, /(<meta name="twitter:title" content=")[^"]*"/, `$1${esc(titulo)}"`, 'twitter:title');
    }
    if (desc) {
      html = sust(html, /(<meta name="description" content=")[^"]*"/, `$1${esc(desc)}"`, 'description');
      html = sust(html, /(<meta property="og:description" content=")[^"]*"/, `$1${esc(desc)}"`, 'og:description');
      html = sust(html, /(<meta name="twitter:description" content=")[^"]*"/, `$1${esc(desc)}"`, 'twitter:description');
    }
    html = sust(html, /(<link rel="canonical" href=")[^"]*"/, `$1${esc(url)}"`, 'canonical');
    html = sust(html, /(<meta property="og:url" content=")[^"]*"/, `$1${esc(url)}"`, 'og:url');
    html = sust(html, /(<meta name="twitter:url" content=")[^"]*"/, `$1${esc(url)}"`, 'twitter:url');
    // El `x-default` del shell apunta a la portada. Copiado tal cual, las diez
    // rutas declararían que su versión por defecto es `/`, que es justo la señal
    // que hace que Google se quede con una sola y descarte las demás.
    //
    // Y sólo `x-default`, sin las diez alternativas por idioma: estas rutas NO
    // tienen una URL por idioma —la SPA traduce en cliente, así que
    // `/pricing?lang=de` devuelve el mismo HTML—, y declarar diez URLs que
    // sirven lo mismo es el error que `public/index.html` ya documenta.
    html = sust(html, /(<link rel="alternate" hreflang="x-default" href=")[^"]*"/, `$1${esc(url)}"`, 'x-default');
    if (!indexable) {
      html = sust(html, /(<meta name="robots" content=")[^"]*"/, '$1noindex, follow"', 'robots');
      html = sust(html, /(<meta name="googlebot" content=")[^"]*"/, '$1noindex, follow"', 'googlebot');
    }
    const dir = ruta.replace(/^\//, '');
    fs.mkdirSync(path.join(BUILD, dir), { recursive: true });
    fs.writeFileSync(path.join(BUILD, dir, 'index.html'), html, 'utf8');   // sirve /ruta/
    fs.writeFileSync(path.join(BUILD, `${dir}.html`), html, 'utf8');       // sirve /ruta
    escritas.add(dir);                                 // ningún puente puede pisarla
    if (prio) sitemapApp.push([ruta, prio, FECHA_APP]);
    shellCount++;
  }
  if (faltantes.size) {
    console.error(`✗ El shell no trae ${[...faltantes].join(', ')}: las rutas de app saldrían`);
    console.error('  con los metadatos de la portada. Revisa public/index.html.');
    process.exit(1);
  }
}

// ── Sitemap ──
// `/performance` NO va aquí, y la razón ya estaba escrita en gen-sitemap.js: es
// una ruta premium (`ProtectedRoute premiumOnly`) y robots.txt la bloquea con
// `Disallow: /performance`. Anunciar en el sitemap una URL que robots prohíbe es
// la contradicción que Search Console marca como «enviada pero bloqueada por
// robots.txt», y resta autoridad al resto del sitemap.
//
// El arreglo estaba en el generador equivocado: `postbuild` ejecuta SÓLO este
// fichero, así que gen-sitemap.js —donde sí se había quitado, con su comentario—
// no llega nunca al sitemap publicado. Por eso `/performance` seguía saliendo.
// Y `/education`, `/options` y `/options/strategies` TAMPOCO van, por lo mismo
// que `/performance` y con la misma prueba: los tres son
// `ProtectedRoute premiumOnly` en `src/App.js`, así que a quien no ha iniciado
// sesión lo mandan a `/login`. Estaban aquí con prioridad 0.9 y 0.85 — las más
// altas del sitemap después de la portada— anunciando a Google tres pantallas
// de acceso. Su contenido público sí se indexa: son las 750 páginas de
// `/learn/`, las 660 de estrategias y sus cuatro hubs, que no tienen muro.
//
// Las que quedan aquí son las de `APP` con prioridad, y se añaden desde el
// bucle que las ESCRIBE (arriba), no desde una lista aparte: así no puede
// anunciarse una URL que nadie ha generado.
const MAIN = [['/', '1.0', fechaReal('public/index.html')]];

// El ORDEN del sitemap no es cosmético: portada, rutas de aplicación y hubs
// primero, y detrás la cola larga. Es la jerarquía real del sitio, y además es
// lo que hace útil el muestreo de `check-seo-en-vivo.js` — que revisa la
// cabecera, la cola y un reparto del medio. Con las rutas de aplicación
// enterradas en el puesto 1.650 no las habría mirado nunca, que es justo cómo
// pasaron desapercibidos sus 404.
const all = [...MAIN, ...sitemapApp, ...sitemapHubs, ...sitemapUrls];
// `lastmod` sale de `git log` sobre el fichero fuente de CADA página — nunca
// la fecha del build. Antes las 1.685 URLs llevaban la MISMA fecha en cada
// despliegue, que es justo lo que hace que un buscador deje de fiarse del
// campo: no hay forma de distinguir «esto cambió» de «se ha vuelto a compilar
// el mismo texto». `fechaReal()` cae al build-date sólo si git no tiene
// historial que mirar (ver su cabecera), así que un `[2]` que falte aquí es un
// punto que se me olvidó cablear, no el caso normal.
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  all.map(([p, pr, fecha]) => `  <url><loc>${DOMAIN}${p}</loc><lastmod>${fecha || LASTMOD}</lastmod><priority>${pr}</priority></url>`).join('\n') +
  '\n</urlset>\n';
if (_fallosFecha > 0) {
  console.log(`⚠️  ${_fallosFecha} fecha(s) cayeron al build-date por falta de historial de git (¿clon superficial?).`);
}
fs.writeFileSync(path.join(BUILD, 'sitemap.xml'), sitemap, 'utf8');
// Informe para `check-seo.js`: cuántas de las consultas a git (no de las
// PÁGINAS — muchas comparten una misma consulta) cayeron al build-date.
// El sitemap por sí solo no distingue «cayó al build-date» de «el histórico
// real dio la misma fecha a propósito» —un día con un cambio ancho de
// verdad, como este mismo, produce lo segundo—, así que el verificador no
// puede mirar sólo las fechas del sitemap: necesita saber si el MECANISMO
// funcionó, y eso sólo lo sabe este script.
fs.writeFileSync(path.join(BUILD, '.lastmod-meta.json'), JSON.stringify({
  consultas: _fechasGit.size, fallos: _fallosFecha,
}), 'utf8');

console.log(`✅ Calculadoras: ${calcCount} páginas (hasta ${CALCS.length} × ${LANGS.length} idiomas)`);
console.log(`✅ Educación: ${learnCount} páginas (hasta ${TOPICS.length} temas × ${LANGS.length} idiomas)`);
console.log(`   · ${conceptosPublicados} conceptos publicados desde i18n (antes: 0)`);
console.log(`✅ Mercados: ${marketCount} páginas (${marketIds.length} mercados × ${LANGS.length} idiomas)`);
console.log(`✅ Estrategias: ${stratCount} páginas (${STRATEGIES.length} estrategias × ${LANGS.length} idiomas)`);
console.log(`✅ Patrones chartistas: ${patternCount} páginas (${CHART_IDS.length} patrones × ${LANGS.length} idiomas)`);
console.log(`✅ Patrones de vela: ${candleCount} páginas (${CANDLE_IDS.length} patrones × ${LANGS.length} idiomas)`);
console.log(`✅ Hubs de sección: ${hubCount} (${SECCIONES.length} secciones × idiomas con contenido)`);
console.log(`✅ Rutas de app con fichero propio: ${shellCount} shells con estado 200 (antes: 404 de Pages)`);
console.log(`✅ Páginas puente por slug traducido: ${puenteCount} (fuera del sitemap, a propósito)`);
console.log(`✅ sitemap.xml: ${all.length} URLs`);
