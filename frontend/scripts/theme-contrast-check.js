#!/usr/bin/env node
/**
 * Contraste de los temas (WCAG 2.1) — src/index.css
 *
 * POR QUÉ EXISTE
 * --------------
 * Los temas se definen como variables HSL sueltas. Es facilísimo elegir un
 * acento precioso y dejar un texto que no se lee: nadie lo nota al mirar la
 * pantalla de reojo, y menos quien diseñó la paleta, que ya sabe lo que pone.
 * En una web financiera un dato ilegible no es un defecto estético — es un
 * número que alguien va a leer mal.
 *
 * Comprueba, para CADA tema (light, dark, gold, crypto, forex, nasdaq):
 *   · foreground sobre background        ≥ 4.5  (texto normal, AA)
 *   · muted-foreground sobre background  ≥ 4.5  (texto secundario: se lee igual)
 *   · primary sobre background           ≥ 3.0  (elementos grandes / UI, AA)
 *   · primary-foreground sobre primary   ≥ 4.5  (texto DENTRO de un botón)
 *
 * Uso:  node scripts/theme-contrast-check.js [--verbose]
 * Sale con código 1 si algún par no llega, para poder atarlo a CI.
 */
const fs = require('fs');
const path = require('path');

const CSS = path.join(__dirname, '..', 'src', 'index.css');
const VERBOSE = process.argv.includes('--verbose');

// Bloques a analizar: nombre del tema → selector en el CSS.
//
// OJO con `:root`: en este proyecto NO es la paleta clara, es la OSCURA (el
// valor por defecto cuando el <html> no lleva clase). La paleta clara vive en
// `.light`. La primera versión de este script mapeaba light→:root y por tanto
// medía el tema oscuro dos veces dándole el visto bueno al claro sin haberlo
// mirado nunca: un aprobado falso, que es peor que no comprobar nada.
const BLOCKS = [
  ['light', '.light'],
  ['dark (:root)', ':root'],
  ['dark', '.dark'],
  ['gold', '.theme-gold'],
  ['crypto', '.theme-crypto'],
  ['forex', '.theme-forex'],
  ['nasdaq', '.theme-nasdaq'],
];

const PAIRS = [
  ['foreground', 'background', 4.5, 'texto normal'],
  ['muted-foreground', 'background', 4.5, 'texto secundario'],
  ['primary', 'background', 3.0, 'acento sobre fondo'],
  ['primary-foreground', 'primary', 4.5, 'texto dentro del botón'],
];

/** HSL (como lo escribe Tailwind: "41 52% 54%") → [r,g,b] 0..1 */
function hslToRgb(str) {
  const m = str.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;
  const h = parseFloat(m[1]) / 360, s = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
}

/** Luminancia relativa, WCAG 2.1 §relative luminance. */
function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Extrae las variables `--x: h s% l%` del bloque de un selector. */
function readBlock(css, selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${esc}\\s*\\{([^}]*)\\}`, 'g');
  const vars = {};
  let m;
  while ((m = re.exec(css)) !== null) {
    for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[k] = v.trim();
  }
  return vars;
}

const css = fs.readFileSync(CSS, 'utf8');
const problems = [];
let checked = 0;

for (const [theme, selector] of BLOCKS) {
  const vars = readBlock(css, selector);
  if (!Object.keys(vars).length) {
    problems.push(`${theme}: no se encontró el bloque ${selector} en index.css`);
    continue;
  }
  for (const [fgVar, bgVar, min, label] of PAIRS) {
    const fg = hslToRgb(vars[fgVar] || ''), bg = hslToRgb(vars[bgVar] || '');
    if (!fg || !bg) {
      problems.push(`${theme}: falta --${fgVar} o --${bgVar}`);
      continue;
    }
    const ratio = contrast(fg, bg);
    checked++;
    const ok = ratio >= min;
    if (!ok) problems.push(`${theme} · ${label}: ${ratio.toFixed(2)}:1 (mínimo ${min}:1) — --${fgVar} sobre --${bgVar}`);
    if (VERBOSE) console.log(`  ${ok ? '✅' : '❌'} ${theme.padEnd(7)} ${label.padEnd(24)} ${ratio.toFixed(2)}:1`);
  }
}

if (problems.length) {
  console.error(`\n❌ Contraste insuficiente en ${problems.length} de ${checked} comprobaciones:\n`);
  problems.forEach((p) => console.error(`   · ${p}`));
  console.error('\nUn dato que no se lee en una web financiera no es un defecto estético.\n');
  process.exit(1);
}
console.log(`✅ Contraste: ${checked} comprobaciones sobre ${BLOCKS.length} temas, todas dentro de WCAG AA.`);
