#!/usr/bin/env node
/**
 * Puerta de CUMPLIMIENTO de los escáneres — docs/BRIEF-ESCANERES.md §9.
 *
 * La guía de la CNMV para finfluencers y el Reglamento (UE) 596/2014 definen
 * recomendación de inversión como toda información que sugiera una estrategia
 * respecto a un instrumento financiero. «Desequilibrio de flujo comprador,
 * percentil 98» es un dato. «Señal de compra» es una recomendación, y activa
 * obligaciones que este producto hoy no cumple.
 *
 * Esta comprobación es barata de escribir e imposible de olvidar: falla el
 * build si el vocabulario prohibido aparece en la interfaz de los escáneres.
 *
 * Escape: una línea puede llevar `cumplimiento-ok:` con su justificación
 * cuando la palabra aparece en código o en un texto que NO es recomendación
 * (por ejemplo, la propia tabla de términos prohibidos). El escape es
 * explícito y queda en el diff, que es justo lo que se quiere.
 *
 * Uso: node scripts/check-escaneres.js
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PROHIBIDO = ['comprar', 'vender', 'señal de', 'objetivo', 'entrada',
                   'stop loss', 'take profit', 'garantiza', 'seguro',
                   'probabilidad de subida'];

const OBJETIVOS = [];
function recoge(dir, filtro) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recoge(p, filtro);
    else if (filtro.test(e.name)) OBJETIVOS.push(p);
  });
}
recoge(path.join(RAIZ, 'prototypes'), /\.(html|js)$/);
recoge(path.join(RAIZ, 'frontend', 'src', 'components', 'scanners'), /\.(jsx?|tsx?)$/);
recoge(path.join(RAIZ, 'frontend', 'src', 'lib', 'scanners'), /\.(jsx?|tsx?)$/);

let fallos = 0, revisados = 0, escapes = 0;
OBJETIVOS.forEach((f) => {
  revisados++;
  fs.readFileSync(f, 'utf8').split('\n').forEach((linea, i) => {
    const l = linea.toLowerCase();
    PROHIBIDO.forEach((termino) => {
      if (!l.includes(termino)) return;
      if (l.includes('cumplimiento-ok')) { escapes++; return; }
      fallos++;
      console.log(`✗ ${path.relative(RAIZ, f)}:${i + 1} — «${termino}»`);
      console.log(`    ${linea.trim().slice(0, 110)}`);
    });
  });
});

// Y la puerta tiene que saber cazar: se le mete el patrón a propósito.
const cebo = 'Señal de compra clara';
const caza = PROHIBIDO.some((t) => cebo.toLowerCase().includes(t));
if (!caza) {
  console.log('✗ la propia comprobación no detecta un caso evidente — está rota');
  process.exit(1);
}

if (!OBJETIVOS.length) {
  console.log('⚠ no hay ficheros de escáner que revisar todavía');
  process.exit(0);
}
console.log((fallos ? '✗' : '✓') + ` cumplimiento §9 — ${revisados} ficheros, `
            + `${fallos} usos prohibidos` + (escapes ? `, ${escapes} escapes justificados` : ''));
process.exit(fallos ? 1 : 0);
