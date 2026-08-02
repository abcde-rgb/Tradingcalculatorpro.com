#!/usr/bin/env node
/* eslint-disable */
/**
 * Genera la imagen social (Open Graph / Twitter Card) 1200×630 con la marca.
 *
 * NO se ejecuta en el build. Es una herramienta manual: la salida
 * (`public/og-image.svg` + `public/og-image.png`) se commitea como asset.
 * Ejecutarla sólo cuando cambie la marca o el mensaje comercial.
 *
 *   cd frontend
 *   npm i --no-save @fontsource/unbounded @fontsource/inter opentype.js sharp
 *   node scripts/gen-og-image.js
 *
 * El texto sale VECTORIZADO (glifos → <path>), no como <text>: un `<text>` con
 * una pila de fuentes del sistema se renderiza con una fuente distinta en cada
 * máquina, y esta imagen es exactamente lo que ve quien recibe el enlace por
 * WhatsApp, X o Telegram. Vectorizado, el SVG no depende de ninguna fuente
 * instalada y el PNG es reproducible.
 *
 * Esta imagen se sirve también cuando se comparte un enlace de afiliado
 * (`/?ref=CODE` devuelve el index.html de la SPA), así que el mensaje tiene que
 * funcionar como invitación: marca + qué es + la prueba de 7 días.
 */
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const OUT_DIR = path.join(__dirname, '..', 'public');
const W = 1200;
const H = 630;

// Paleta del pack de marca (ver public/tcpro-icono-512.svg y paleta.css)
const C = {
  bg: '#080808',
  card: '#0F0F0F',
  border: '#262626',
  fg: '#F2F2F2',
  primary: '#17CF63',
  muted: '#8A8A8A',
  faint: '#5A5A5A',
};

// ─────────────────────────── fuentes ───────────────────────────
function loadFont(pkg, file) {
  const p = path.join(__dirname, '..', 'node_modules', '@fontsource', pkg, 'files', file);
  if (!fs.existsSync(p)) {
    console.error(`\n✖ Falta la fuente ${file}.\n  npm i --no-save @fontsource/unbounded @fontsource/inter opentype.js sharp\n`);
    process.exit(1);
  }
  return opentype.parse(fs.readFileSync(p).buffer);
}

const unbounded800 = loadFont('unbounded', 'unbounded-latin-800-normal.woff');
const unbounded700 = loadFont('unbounded', 'unbounded-latin-700-normal.woff');
const inter400 = loadFont('inter', 'inter-latin-400-normal.woff');
const inter600 = loadFont('inter', 'inter-latin-600-normal.woff');
const inter700 = loadFont('inter', 'inter-latin-700-normal.woff');

/**
 * Compone glifo a glifo en vez de usar `font.getPath()`.
 *
 * `getPath` pasa por el motor de features de opentype.js, que revienta con las
 * tablas `ccmp` de Inter ("lookupType: 6 substFormat: 2 is not yet supported").
 * Aquí sólo hacemos falta cmap + kerning, que sí están soportados y son todo lo
 * que necesitan estas dos líneas de texto.
 */
function layout(font, str, size) {
  const scale = size / font.unitsPerEm;
  const glyphs = [];
  let x = 0;
  let prev = null;
  for (const ch of str) {
    const g = font.charToGlyph(ch);
    if (!g || g.index === 0) throw new Error(`Glifo ausente para "${ch}" (¿subset equivocado?)`);
    if (prev) x += font.getKerningValue(prev, g) * scale;
    glyphs.push({ glyph: g, x });
    x += g.advanceWidth * scale;
    prev = g;
  }
  return { glyphs, width: x, scale };
}

/** Ancho de avance de un texto a un tamaño dado. */
const measure = (font, str, size) => layout(font, str, size).width;

/** Texto → <path>. `y` es la línea base. */
function text(font, str, x, y, size, fill, opacity) {
  const { glyphs } = layout(font, str, size);
  const d = glyphs
    .map(({ glyph, x: gx }) => glyph.getPath(x + gx, y, size).toPathData(2))
    .join('');
  const op = opacity !== undefined ? ` opacity="${opacity}"` : '';
  return `  <path d="${d}" fill="${fill}"${op}/>`;
}

/** Tamaño mayor que cabe en `maxW`, acotado a `size`. */
function fit(font, str, size, maxW) {
  const w = measure(font, str, size);
  return w <= maxW ? size : size * (maxW / w);
}

// ─────────────────────────── piezas ───────────────────────────

/** Monograma de marca, calcado de public/tcpro-icono-512.svg. */
function brandMark(x, y, size) {
  const s = size / 512;
  return `  <g transform="translate(${x},${y}) scale(${s.toFixed(6)})">
    <rect x="1.5" y="1.5" width="509" height="509" rx="120.3" fill="${C.card}" stroke="${C.border}" stroke-width="3"/>
    <g transform="translate(56.3,123.9) scale(3.1446)">
      <polygon points="8,7 60,7 60,23 0,23" fill="${C.fg}"/>
      <rect x="24" y="23" width="16" height="54" fill="${C.fg}"/>
      <path d="M105 14 A 34 34 0 1 0 105 70" fill="none" stroke="${C.fg}" stroke-width="16"/>
      <rect x="87" y="33" width="2.5" height="32" fill="${C.primary}"/>
      <rect x="83" y="39" width="9" height="21" fill="${C.primary}"/>
      <rect x="100" y="26" width="2.5" height="33" fill="${C.primary}"/>
      <rect x="96" y="32" width="9" height="22" fill="${C.primary}"/>
      <rect x="113" y="17" width="2.5" height="36" fill="${C.primary}"/>
      <rect x="109" y="24" width="9" height="24" fill="${C.primary}"/>
    </g>
  </g>`;
}

/** Rejilla de fondo, guiño al terminal de trading. */
function grid() {
  const lines = [];
  for (let y = 90; y < H; y += 90) lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);
  for (let x = 100; x < W; x += 100) lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
  return `  <g stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1">${lines.join('')}</g>`;
}

/**
 * Velas decorativas a la derecha. Alturas fijas (no aleatorias): esta imagen
 * es un asset commiteado y tiene que salir idéntica en cada regeneración.
 */
function candles() {
  // [x, alto de mecha, y de apertura del cuerpo, alto del cuerpo, alcista]
  const data = [
    [716, 210, 300, 96, true],
    [776, 236, 258, 118, false],
    [836, 224, 236, 104, true],
    [896, 250, 200, 132, true],
    [956, 232, 212, 90, false],
    [1016, 244, 168, 126, true],
    [1076, 214, 150, 98, true],
  ];
  const out = [];
  const closes = [];
  for (const [cx, wick, top, bh, up] of data) {
    const color = up ? C.primary : '#B34A3F';
    const wickTop = top - (wick - bh) / 2;
    out.push(`<line x1="${cx}" y1="${wickTop}" x2="${cx}" y2="${wickTop + wick}" stroke="${color}" stroke-width="2.5"/>`);
    out.push(`<rect x="${cx - 11}" y="${top}" width="22" height="${bh}" fill="${color}"/>`);
    closes.push(`${cx},${up ? top : top + bh}`);
  }
  out.push(`<polyline points="${closes.join(' ')}" fill="none" stroke="${C.primary}" stroke-width="2.5" stroke-dasharray="9,6" opacity="0.9"/>`);
  return `  <g opacity="0.11">${out.join('')}</g>`;
}

/** Píldora sólida verde con texto oscuro (la oferta). */
function solidPill(x, y, label, fontSize = 22) {
  const padX = 26;
  const h = 52;
  const tw = measure(inter700, label, fontSize);
  const w = tw + padX * 2;
  return {
    width: w,
    svg: `  <rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${C.primary}"/>
${text(inter700, label, x + padX, y + h / 2 + fontSize * 0.35, fontSize, C.bg)}`,
  };
}

/** Píldora de contorno (características). */
function ghostPill(x, y, label, fontSize = 19) {
  const padX = 20;
  const h = 44;
  const tw = measure(inter600, label, fontSize);
  const w = tw + padX * 2;
  return {
    width: w,
    svg: `  <rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${C.card}" stroke="${C.border}" stroke-width="1.5"/>
${text(inter600, label, x + padX, y + h / 2 + fontSize * 0.35, fontSize, '#C9C9C9')}`,
  };
}

// ─────────────────────────── composición ───────────────────────────
const PAD = 76;
const parts = [];

parts.push(`  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${C.primary}" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="${C.primary}" stop-opacity="0"/>
    </radialGradient>
  </defs>`);
parts.push(`  <rect width="${W}" height="${H}" fill="${C.bg}"/>`);
parts.push(grid());
parts.push(`  <ellipse cx="1030" cy="560" rx="360" ry="250" fill="url(#glow)"/>`);
parts.push(candles());

// Lockup: monograma + nombre
const MARK = 84;
parts.push(brandMark(PAD, 58, MARK));
{
  const size = 27;
  const x = PAD + MARK + 24;
  const baseline = 58 + MARK / 2 + size * 0.34;
  parts.push(text(unbounded700, 'Trading Calculator ', x, baseline, size, C.fg));
  parts.push(text(unbounded700, 'PRO', x + measure(unbounded700, 'Trading Calculator ', size), baseline, size, C.primary));
}

// Titular
{
  const maxW = W - PAD * 2 - 90;
  const l1 = 'La herramienta definitiva';
  const l2 = 'para traders profesionales';
  const size = Math.min(fit(unbounded800, l1, 54, maxW), fit(unbounded800, l2, 54, maxW));
  parts.push(text(unbounded800, l1, PAD, 274, size, C.fg));
  parts.push(text(unbounded800, l2, PAD, 274 + size * 1.28, size, C.fg));
}

// Subtítulo
{
  const sub = 'Calculadoras · Opciones y griegas · Diario y backtesting · 10 idiomas';
  const size = fit(inter400, sub, 23, W - PAD * 2 - 40);
  parts.push(text(inter400, sub, PAD, 404, size, C.muted));
}

// Oferta + refuerzo
{
  const pill = solidPill(PAD, 444, '7 días gratis');
  parts.push(pill.svg);
  const note = 'Cancela cuando quieras · Sin permanencia';
  parts.push(text(inter400, note, PAD + pill.width + 22, 444 + 26 + 20 * 0.35, 20, C.muted));
}

// Píldoras de características
{
  let x = PAD;
  for (const label of ['Black-Scholes', 'Monte Carlo', 'Patrones', 'Gestión de riesgo']) {
    const p = ghostPill(x, 528, label);
    parts.push(p.svg);
    x += p.width + 14;
  }
}

// Dominio
parts.push(text(inter600, 'tradingcalculatorpro.com', W - PAD - measure(inter600, 'tradingcalculatorpro.com', 20), 566, 20, C.faint));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trading Calculator PRO">
  <title>Trading Calculator PRO — 7 días gratis</title>
  <!-- Generado por scripts/gen-og-image.js. No editar a mano: el texto está
       vectorizado (sin dependencia de fuentes). Cambia el script y regenera. -->
${parts.join('\n')}
</svg>
`;

fs.writeFileSync(path.join(OUT_DIR, 'og-image.svg'), svg);

// PNG: es el que consumen las redes sociales (ninguna renderiza SVG).
let sharp;
try {
  sharp = require('sharp');
} catch (_) {
  console.error('✖ Falta sharp: npm i --no-save sharp');
  process.exit(1);
}
sharp(Buffer.from(svg), { density: 144 })
  .resize(W, H)
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT_DIR, 'og-image.png'))
  .then((info) => {
    console.log(`✔ og-image.svg  (${(svg.length / 1024).toFixed(1)} KB, texto vectorizado)`);
    console.log(`✔ og-image.png  (${info.width}×${info.height}, ${(info.size / 1024).toFixed(1)} KB)`);
  })
  .catch((e) => {
    console.error('✖ No se pudo rasterizar:', e.message);
    process.exit(1);
  });
