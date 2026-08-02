/**
 * Identidad visual por mercado y por activo.
 *
 * POR QUÉ EXISTE
 * --------------
 * Los diez paneles de "Tipos de Mercado" se pintaban todos con el mismo verde
 * del tema. El oro, el petróleo, los bonos y las criptomonedas compartían
 * exactamente la misma cara, así que la pantalla no ayudaba a saber dónde
 * estabas: todo el peso de orientar recaía en el texto.
 *
 * DECISIÓN TÉCNICA IMPORTANTE
 * ---------------------------
 * Los colores se entregan como **variables CSS en línea**, no como clases de
 * Tailwind. Tailwind genera su CSS en tiempo de compilación escaneando el
 * código: una clase construida en ejecución (`text-${color}-500`) NO existe en
 * el bundle y se queda sin estilo. Es el error clásico al "tematizar" y aquí
 * habría fallado justo en producción, donde no hay JIT que rescate nada.
 * Con `var(--mk-accent)` el color viaja como dato y siempre se aplica.
 *
 * Cada tema trae además `drivers`: qué mueve DE VERDAD el precio de ese
 * mercado. No es decoración — es lo primero que hay que saber antes de operar
 * algo, y cambia por completo entre el oro (tipos reales, dólar) y una acción
 * (resultados, guidance).
 */

// Paleta por mercado. `accent` manda; `soft` es el fondo tenue; `glow` la
// sombra de acento. Todos con contraste suficiente sobre fondo claro y oscuro.
const MARKET_THEMES = {
  forex:       { accent: '#3b82f6', soft: 'rgba(59,130,246,0.10)',  glow: 'rgba(59,130,246,0.35)',  emoji: '💱' },
  stocks:      { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',   glow: 'rgba(34,197,94,0.35)',   emoji: '📈' },
  crypto:      { accent: '#f7931a', soft: 'rgba(247,147,26,0.12)',  glow: 'rgba(247,147,26,0.40)',  emoji: '₿' },
  commodities: { accent: '#d4a017', soft: 'rgba(212,160,23,0.12)',  glow: 'rgba(212,160,23,0.40)',  emoji: '🛢️' },
  indices:     { accent: '#6366f1', soft: 'rgba(99,102,241,0.10)',  glow: 'rgba(99,102,241,0.35)',  emoji: '🏛️' },
  etfs:        { accent: '#14b8a6', soft: 'rgba(20,184,166,0.10)',  glow: 'rgba(20,184,166,0.35)',  emoji: '🧺' },
  futures:     { accent: '#ef4444', soft: 'rgba(239,68,68,0.10)',   glow: 'rgba(239,68,68,0.35)',   emoji: '⏳' },
  bonds:       { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)',  glow: 'rgba(14,165,233,0.35)',  emoji: '🏦' },
  options:     { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)',  glow: 'rgba(168,85,247,0.35)',  emoji: '🎯' },
  cfds:        { accent: '#f43f5e', soft: 'rgba(244,63,94,0.10)',   glow: 'rgba(244,63,94,0.35)',   emoji: '⚠️' },
};

// Sub-temas por activo concreto. "Materias primas" mete en el mismo cajón el
// oro, el crudo y el gas, que no se parecen en nada: ni en color, ni en lo que
// mueve su precio, ni en quién los opera. El oro se ve como el oro.
const ASSET_THEMES = {
  XAUUSD:  { accent: '#d4af37', soft: 'rgba(212,175,55,0.14)', glow: 'rgba(212,175,55,0.45)', emoji: '🥇',
             metallic: 'linear-gradient(135deg,#f9e29c 0%,#d4af37 45%,#8a6d1f 100%)' },
  XAGUSD:  { accent: '#b8c4cc', soft: 'rgba(184,196,204,0.14)', glow: 'rgba(184,196,204,0.45)', emoji: '🥈',
             metallic: 'linear-gradient(135deg,#f2f6f8 0%,#b8c4cc 45%,#71808a 100%)' },
  PLATINUM:{ accent: '#cfd4d8', soft: 'rgba(207,212,216,0.14)', glow: 'rgba(207,212,216,0.42)', emoji: '⚪',
             metallic: 'linear-gradient(135deg,#ffffff 0%,#cfd4d8 45%,#8d949a 100%)' },
  PALLADIUM:{accent: '#c7ccd1', soft: 'rgba(199,204,209,0.14)', glow: 'rgba(199,204,209,0.42)', emoji: '⚪' },
  COPPER:  { accent: '#b87333', soft: 'rgba(184,115,51,0.14)',  glow: 'rgba(184,115,51,0.45)',  emoji: '🟤',
             metallic: 'linear-gradient(135deg,#e8b98a 0%,#b87333 45%,#6f4218 100%)' },
  WTIUSD:  { accent: '#3f7d5c', soft: 'rgba(63,125,92,0.14)',   glow: 'rgba(63,125,92,0.42)',   emoji: '🛢️' },
  BRENTUSD:{ accent: '#2f6b4f', soft: 'rgba(47,107,79,0.14)',   glow: 'rgba(47,107,79,0.42)',   emoji: '🛢️' },
  NATGAS:  { accent: '#38bdf8', soft: 'rgba(56,189,248,0.14)',  glow: 'rgba(56,189,248,0.42)',  emoji: '🔥' },
  BTC:     { accent: '#f7931a', soft: 'rgba(247,147,26,0.14)',  glow: 'rgba(247,147,26,0.45)',  emoji: '₿' },
  ETH:     { accent: '#8a92b2', soft: 'rgba(138,146,178,0.14)', glow: 'rgba(138,146,178,0.42)', emoji: 'Ξ' },
};

const FALLBACK = { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)', glow: 'rgba(34,197,94,0.35)', emoji: '📊' };

/** Tema de un mercado (forex, commodities…), con respaldo neutro. */
export const themeForMarket = (marketId) => MARKET_THEMES[marketId] || FALLBACK;

/** Tema de un activo concreto; cae al de su mercado si no tiene uno propio. */
export const themeForAsset = (symbol, category) =>
  ASSET_THEMES[symbol] || MARKET_THEMES[category] || FALLBACK;

/**
 * Variables CSS listas para un `style={}`. Se consumen con
 * `style={{ color: 'var(--mk-accent)' }}` o en clases arbitrarias de Tailwind
 * como `border-[color:var(--mk-accent)]`, que SÍ se compilan porque el literal
 * está escrito en el código.
 */
export const themeVars = (theme) => ({
  '--mk-accent': theme.accent,
  '--mk-soft': theme.soft,
  '--mk-glow': theme.glow,
  ...(theme.metallic ? { '--mk-metallic': theme.metallic } : {}),
});

/** Fondo de cabecera: degradado metálico si el activo lo tiene, si no, tenue. */
export const headerBackground = (theme) => theme.metallic || `linear-gradient(135deg, ${theme.soft}, transparent 70%)`;

export { MARKET_THEMES, ASSET_THEMES };
