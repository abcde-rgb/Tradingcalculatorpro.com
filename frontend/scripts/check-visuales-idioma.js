#!/usr/bin/env node
/**
 * Los diagramas de la academia llevan texto en castellano fijo, y son 44.
 *
 * La cabecera de cada uno dice «Language-neutral schematic SVGs». No lo son:
 * dentro hay «máx ↑», «recesión», «pérdida media», «el 'descuento' enruta la
 * comisión». Un cliente que paga y navega en alemán abre la academia y ve los
 * rótulos de los gráficos en castellano.
 *
 * Traducirlos son ~1.180 rótulos × 10 idiomas. Es un trabajo con decisión de
 * producto detrás —hay rótulos que conviene traducir y otros que conviene
 * volver de verdad neutros, quitando la prosa y dejando el símbolo— y no se
 * hace de paso. Lo que sí se puede hacer hoy es que **no crezca**.
 *
 * Este verificador fija el número de rótulos castellanos de cada fichero como
 * techo. Puede BAJAR (arreglar) libremente; si SUBE, falla. Un fichero nuevo
 * parte de cero: un diagrama nuevo nace traducido o no entra.
 *
 * Es el mismo trato que `check-rutas-muertas.py` hace con las rutas sin
 * pantalla: no arregla la deuda, impide que se pudra en silencio.
 *
 *   node scripts/check-visuales-idioma.js            # falla si algún techo sube
 *   node scripts/check-visuales-idioma.js --sellar   # baja los techos ya arreglados
 *
 * Sabotaje (los dos sentidos):
 *   · añade un rótulo castellano a cualquier *Visual.jsx  → tiene que FALLAR
 *   · crea un fichero *Visual.jsx nuevo con uno           → tiene que FALLAR
 *   · déjalos como están                                  → tiene que PASAR
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'components', 'education');
const TECHOS = path.join(__dirname, 'visuales-idioma.json');

// Sólo cuenta lo que es INEQUÍVOCAMENTE castellano: tilde, ñ o signo de
// apertura. Lo que no lleva ninguno («Solo Lifetime», «pierden vs índice») se
// escapa, así que el techo es un suelo del problema, no su medida. Aun así
// sirve para lo que tiene que servir: si alguien añade prosa castellana nueva,
// casi siempre traerá una tilde.
const CASTELLANO = /[¿¡ñáéíóúÁÉÍÓÚÑ]/;

/** Quita comentarios sin mover las líneas de sitio. */
function sinComentarios(src) {
  let out = '', i = 0, estado = 'codigo', comilla = '';
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (estado === 'codigo') {
      if (c === '/' && d === '/') { estado = 'linea'; out += '  '; i += 2; continue; }
      if (c === '/' && d === '*') { estado = 'bloque'; out += '  '; i += 2; continue; }
      if (c === '"' || c === "'") { estado = 'cadena'; comilla = c; out += c; i++; continue; }
      if (c === '`') { estado = 'plantilla'; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (estado === 'linea') { if (c === '\n') { estado = 'codigo'; out += c; } else out += ' '; i++; continue; }
    if (estado === 'bloque') { if (c === '*' && d === '/') { estado = 'codigo'; out += '  '; i += 2; continue; } out += (c === '\n' ? '\n' : ' '); i++; continue; }
    if (c === '\\') { out += c + (d || ''); i += 2; continue; }
    if ((estado === 'cadena' && c === comilla) || (estado === 'plantilla' && c === '`')) estado = 'codigo';
    out += c; i++;
  }
  return out;
}

/** Rótulos castellanos de un fichero: texto JSX y atributos que se ven o se leen. */
function rotulos(fichero) {
  const src = sinComentarios(fs.readFileSync(fichero, 'utf8'));
  const encontrados = [];
  for (const m of src.matchAll(/>([^<>{}]*)</g)) {
    const txt = m[1].trim();
    if (txt.length > 1 && CASTELLANO.test(txt)) encontrados.push(txt);
  }
  for (const m of src.matchAll(/(?:aria-)?label\s*=\s*"([^"]+)"/g)) {
    if (CASTELLANO.test(m[1])) encontrados.push(m[1]);
  }
  return encontrados;
}

const ficheros = fs.readdirSync(DIR).filter((f) => /Visual\.jsx$/.test(f)).sort();
const actual = {};
const detalle = {};
for (const f of ficheros) {
  const rs = rotulos(path.join(DIR, f));
  if (rs.length) { actual[f] = rs.length; detalle[f] = rs; }
}

if (process.argv.includes('--sellar')) {
  fs.writeFileSync(TECHOS, JSON.stringify(actual, null, 2) + '\n');
  const total = Object.values(actual).reduce((a, b) => a + b, 0);
  console.log(`Techos sellados: ${Object.keys(actual).length} ficheros, ${total} rótulos.`);
  process.exit(0);
}

if (!fs.existsSync(TECHOS)) {
  console.error(`✗ Falta ${path.basename(TECHOS)}. Créalo con --sellar.`);
  process.exit(1);
}
const techos = JSON.parse(fs.readFileSync(TECHOS, 'utf8'));

const subidas = [];
const bajadas = [];
for (const f of new Set([...Object.keys(actual), ...Object.keys(techos)])) {
  const hay = actual[f] || 0;
  const techo = techos[f] ?? 0;          // fichero nuevo: techo cero
  if (hay > techo) subidas.push({ f, hay, techo, muestra: (detalle[f] || []).slice(-3) });
  else if (hay < techo) bajadas.push({ f, hay, techo });
}

const total = Object.values(actual).reduce((a, b) => a + b, 0);
const totalTecho = Object.values(techos).reduce((a, b) => a + b, 0);

if (subidas.length) {
  console.error(`\n❌ ${subidas.length} fichero(s) con MÁS rótulos en castellano que antes:\n`);
  for (const s of subidas) {
    console.error(`  ${s.f}: ${s.techo} → ${s.hay}`);
    for (const r of s.muestra) console.error(`     · ${r.slice(0, 70)}`);
  }
  console.error('\nUn diagrama nuevo nace traducido. Uno viejo puede mejorar, no empeorar.');
  console.error('Si de verdad has arreglado ficheros y el total baja, sella: --sellar');
  process.exit(1);
}

console.log(`✅ ${total} rótulos castellanos en ${Object.keys(actual).length} diagramas (techo: ${totalTecho}).`);
if (bajadas.length) {
  console.log(`   ${bajadas.length} fichero(s) han MEJORADO — sella el nuevo techo con --sellar:`);
  for (const b of bajadas) console.log(`     ${b.f}: ${b.techo} → ${b.hay}`);
}
console.log('   Deuda conocida y acotada: ver docs/PENDIENTES.md.');
