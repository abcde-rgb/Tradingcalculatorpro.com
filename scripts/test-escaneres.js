#!/usr/bin/env node
/**
 * Pruebas unitarias del núcleo de detectores (`prototypes/_core.js`).
 *
 * Son funciones PURAS, así que se prueban sin red, sin navegador y sin
 * fixtures de mercado: con entradas construidas cuyo resultado se conoce por
 * la fórmula publicada. Eso NO viola R1 —«ningún dato fabricado»— porque R1
 * habla de lo que se ENSEÑA al usuario; una entrada de prueba no sale por
 * pantalla.
 *
 * Uso: node scripts/test-escaneres.js
 */
const C = require('../prototypes/_core.js');
const { DET, RingF64, bhFdr, cuantil, normCdf, PROV } = C;

let ok = 0, fallos = [];
function comprueba(nombre, cond, detalle) {
  if (cond) { ok++; } else { fallos.push(nombre + (detalle ? ' — ' + detalle : '')); }
}
function cerca(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }

// ── Buffer circular ────────────────────────────────────────────────────
{
  const r = new RingF64(3);
  r.push(1); r.push(2); r.push(3); r.push(4);       // el 1 se pierde
  comprueba('ring · longitud tope', r.len === 3, 'len=' + r.len);
  comprueba('ring · at(0) es el más reciente', r.at(0) === 4, 'at0=' + r.at(0));
  comprueba('ring · at(2) es el más viejo vivo', r.at(2) === 2, 'at2=' + r.at(2));
  comprueba('ring · suma sobre la ventana viva', r.suma() === 9, 'suma=' + r.suma());
}

// ── 1.1 OFI · Cont, Kukanov & Stoikov (2014) ───────────────────────────
{
  // Bid sube (10→11) con 5, ask sube (12→13) desde 4:
  //  e = +qb(5)  [Pb≥Pb₋]  − 0 [Pb≤Pb₋ falso]  − 0 [Pa≤Pa₋ falso]  + qa₋(4)
  const prev = { bidPx: 10, bidQty: 3, askPx: 12, askQty: 4 };
  const cur  = { bidPx: 11, bidQty: 5, askPx: 13, askQty: 7 };
  comprueba('OFI · bid sube y ask sube', DET.ofiEvento(prev, cur) === 9,
            'obtenido ' + DET.ofiEvento(prev, cur) + ', esperado 9');
  // Sin cambio de precio: e = qb − qb₋ − qa + qa₋
  const p2 = { bidPx: 10, bidQty: 3, askPx: 12, askQty: 4 };
  const c2 = { bidPx: 10, bidQty: 5, askPx: 12, askQty: 6 };
  comprueba('OFI · precios quietos mide sólo tamaño', DET.ofiEvento(p2, c2) === 0,
            'obtenido ' + DET.ofiEvento(p2, c2));
  comprueba('OFI · sin evento previo no inventa', DET.ofiEvento(null, cur) === 0);
}

// ── 1.2 Queue Imbalance · Gould & Bonart (2016) ────────────────────────
{
  comprueba('QI · todo en el bid da +1', DET.queueImbalance(10, 0).value === 1);
  comprueba('QI · todo en el ask da −1', DET.queueImbalance(0, 10).value === -1);
  comprueba('QI · equilibrio da 0', DET.queueImbalance(5, 5).value === 0);
  const vacio = DET.queueImbalance(0, 0);
  comprueba('QI · sin tamaños es unavailable, NO cero',
            vacio.value === null && vacio.provenance === PROV.NA, JSON.stringify(vacio));
}

// ── 1.3 Agresor del aggTrade de Binance ────────────────────────────────
{
  // `m: true` = el comprador es el CREADOR ⇒ el agresor es el vendedor.
  comprueba('agresor · m=true ⇒ venta', DET.ladoAggTrade(true) === 'sell');
  comprueba('agresor · m=false ⇒ compra', DET.ladoAggTrade(false) === 'buy');
}

// ── 1.5 VPIN / BVC · Easley, López de Prado & O'Hara (2012) ────────────
{
  const s = DET.bvcSplit(100, 0, 1);
  // 1e-6 y no 1e-9: la aproximación de Abramowitz-Stegun tiene |ε| < 7,5e-8 y
  // está documentado. Exigir más que el método es probar el error, no el código.
  comprueba('BVC · Δp=0 reparte mitad y mitad', cerca(s.vb, 50, 1e-6) && cerca(s.vs, 50, 1e-6));
  const s2 = DET.bvcSplit(100, 5, 1);
  comprueba('BVC · Δp muy positivo casi todo compra', s2.vb > 99.9, 'vb=' + s2.vb);
  comprueba('BVC · el reparto conserva el volumen', cerca(s2.vb + s2.vs, 100, 1e-9));
  const pocos = DET.vpin([{v:1,vb:1,vs:0}]);
  comprueba('VPIN · con menos de 5 cubos no publica número',
            pocos.value === null && pocos.provenance === PROV.NA);
  // Cinco cubos de 100 con desequilibrio total ⇒ VPIN = 1
  const cubos = Array.from({length:5}, () => ({ v:100, vb:100, vs:0 }));
  comprueba('VPIN · desequilibrio total da 1', cerca(DET.vpin(cubos).value, 1, 1e-12),
            'obtenido ' + DET.vpin(cubos).value);
  const eq = Array.from({length:5}, () => ({ v:100, vb:50, vs:50 }));
  comprueba('VPIN · flujo equilibrado da 0', cerca(DET.vpin(eq).value, 0, 1e-12));
}

// ── 1.6 Lambda de Kyle · recupera una pendiente conocida ───────────────
{
  const netVol = [], dP = [];
  for (let i = 0; i < 50; i++) { netVol.push(i - 25); dP.push(0.004 * (i - 25) + 1); }
  const k = DET.kyleLambda(dP, netVol);
  comprueba('Kyle · recupera la pendiente 0,004', cerca(k.value, 0.004, 1e-9), 'λ=' + k.value);
  const corto = DET.kyleLambda([1,2], [1,2]);
  comprueba('Kyle · con menos de 20 puntos no publica', corto.value === null);
  const plano = DET.kyleLambda(new Array(30).fill(1), new Array(30).fill(7));
  comprueba('Kyle · flujo sin varianza es unavailable, no infinito', plano.value === null);
}

// ── 1.7 Amihud (2002) ──────────────────────────────────────────────────
{
  const a = DET.amihud([0.01, 0.02], [1e6, 1e6]);   // media(|r|/V)·1e6 = 0,015
  comprueba('Amihud · media de |r|/volumen escalada', cerca(a.value, 0.015, 1e-12), 'A=' + a.value);
  const cero = DET.amihud([0.01], [0]);
  comprueba('Amihud · volumen cero no divide por cero', cero.value === null);
}

// ── 1.8 Absorción ──────────────────────────────────────────────────────
{
  const hist = Array.from({length:100}, (_, i) => i);       // 0..99
  const dispara = DET.absorcion(99, 1, hist, hist);          // vol alto, rango bajo
  comprueba('absorción · volumen alto con rango bajo dispara', dispara.value === 1,
            'pv=' + dispara.pv + ' pr=' + dispara.pr);
  const no = DET.absorcion(99, 99, hist, hist);
  comprueba('absorción · volumen alto con rango alto NO dispara', no.value === 0);
  comprueba('absorción · sin historia suficiente no publica',
            DET.absorcion(1, 1, [1,2], [1,2]).value === null);
}

// ── 1.9 Barrido ────────────────────────────────────────────────────────
{
  const t = [ {ts:1000, price:10, side:'buy'}, {ts:1010, price:11, side:'buy'},
              {ts:1020, price:12, side:'buy'}, {ts:1030, price:13, side:'buy'} ];
  comprueba('barrido · cuenta niveles distintos del mismo lado',
            DET.barrido(t, 50).value === 4, 'n=' + DET.barrido(t, 50).value);
  const mixto = [ {ts:1000, price:10, side:'sell'}, {ts:1010, price:11, side:'buy'} ];
  comprueba('barrido · se corta al cambiar de agresor', DET.barrido(mixto, 50).value === 1);
  const lento = [ {ts:0, price:10, side:'buy'}, {ts:5000, price:11, side:'buy'} ];
  comprueba('barrido · fuera de ventana no cuenta', DET.barrido(lento, 50).value === 1);
}

// ── 2.2 Ejecutado > visible · Hautsch & Huang (2012) ───────────────────
{
  const r = DET.ejecutadoSobreVisible(50, 10);
  comprueba('oculta · 5× lo publicado', cerca(r.value, 5), 'ratio=' + r.value);
  comprueba('oculta · sin tamaño publicado no infiere',
            DET.ejecutadoSobreVisible(50, 0).value === null);
}

// ── 3.1 Perfil de volumen · CME Market Profile ─────────────────────────
{
  const mapa = { 100: 5, 101: 50, 102: 20, 103: 5 };   // total 80, POC=101
  const p = DET.perfilVolumen(mapa, 1);
  comprueba('perfil · POC en el precio de más volumen', p.value === 101, 'POC=' + p.value);
  comprueba('perfil · el área de valor cubre el 70 %',
            p.val <= 101 && p.vah >= 101 && p.vah > p.val, 'VAL=' + p.val + ' VAH=' + p.vah);
  comprueba('perfil · sin volumen no inventa POC', DET.perfilVolumen({}, 1).value === null);
}

// ── 4.1 Hurst por DFA ──────────────────────────────────────────────────
{
  // Generador congruencial determinista: la MISMA serie en cada ejecución.
  let semilla = 42;
  const rnd = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
  const ruido = Array.from({length: 1024}, () => rnd() - 0.5);
  const h = DET.hurstDFA(ruido);
  comprueba('Hurst · ruido blanco cae cerca de 0,5', h.value > 0.35 && h.value < 0.65, 'H=' + h.value);
  const tendencia = Array.from({length: 1024}, (_, i) => i * 0.001);
  const ht = DET.hurstDFA(tendencia);
  comprueba('Hurst · una tendencia pura da H alto', ht.value > 0.9, 'H=' + ht.value);
  comprueba('Hurst · serie corta no publica', DET.hurstDFA([1,2,3]).value === null);
}

// ── 4.7 Entropía de permutación · Bandt & Pompe (2002) ─────────────────
{
  const mono = Array.from({length: 200}, (_, i) => i);
  const e = DET.entropiaPermutacion(mono, 3);
  comprueba('entropía · serie monótona da ~0', e.value < 0.01, 'H=' + e.value);
  comprueba('entropía · serie corta no publica',
            DET.entropiaPermutacion([1,2,3], 3).value === null);
}

// ── 5.1 Cuadrantes de OI ───────────────────────────────────────────────
{
  comprueba('OI · precio↑ OI↑ = nuevas largas', DET.cuadranteOI(1, 1).value === 'nuevas largas');
  comprueba('OI · precio↑ OI↓ = cierre de cortos', DET.cuadranteOI(1, -1).value === 'cierre de cortos');
  comprueba('OI · precio↓ OI↑ = nuevas cortas', DET.cuadranteOI(-1, 1).value === 'nuevas cortas');
  comprueba('OI · precio↓ OI↓ = liquidación de largas', DET.cuadranteOI(-1, -1).value === 'liquidación de largas');
  comprueba('OI · sin variación no clasifica', DET.cuadranteOI(0, 1).value === null);
}

// ── 6.7 z robusto (MAD) ────────────────────────────────────────────────
{
  const v = [1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2];
  const z = DET.zRobusto(v, 10);
  comprueba('z robusto · un extremo lejano da z alto', z.value > 3, 'z=' + z.value);
  const constante = new Array(30).fill(5);
  comprueba('z robusto · MAD cero no divide por cero', DET.zRobusto(constante, 9).value === null);
}

// ── §8.1 Benjamini-Hochberg ────────────────────────────────────────────
{
  // Ejemplo clásico: con n=4 y p=[0,01 0,02 0,03 0,04] → q=[0,04 0,04 0,04 0,04]
  const q = bhFdr([0.01, 0.02, 0.03, 0.04]);
  comprueba('BH · q monótono y ≤1', q.every(x => x <= 1) && q[0] <= q[3], JSON.stringify(q));
  comprueba('BH · el mayor p da q = p', cerca(q[3], 0.04, 1e-12), 'q=' + q[3]);
  comprueba('BH · corrige el p más pequeño al alza', q[0] > 0.01, 'q0=' + q[0]);
  const solo = bhFdr([0.5]);
  comprueba('BH · con una sola prueba q = p', cerca(solo[0], 0.5));
  comprueba('BH · lista vacía no revienta', bhFdr([]).length === 0);
}

// ── Utilidades estadísticas ────────────────────────────────────────────
{
  comprueba('normCdf · Φ(0) = 0,5', cerca(normCdf(0), 0.5, 1e-7), normCdf(0));
  comprueba('normCdf · simétrica', cerca(normCdf(1.96) + normCdf(-1.96), 1, 1e-6));
  comprueba('normCdf · Φ(1,96) ≈ 0,975', cerca(normCdf(1.96), 0.975, 1e-3), normCdf(1.96));
  comprueba('cuantil · mediana de 1..5 es 3', cuantil([1,2,3,4,5], 0.5) === 3);
  comprueba('cuantil · interpola', cerca(cuantil([0, 10], 0.5), 5));
}

// ── R1 · el núcleo no puede fabricar datos ─────────────────────────────
{
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, '..', 'prototypes', '_core.js'), 'utf8');
  // Se miran las LÍNEAS DE CÓDIGO, no los comentarios: la primera versión de
  // esta comprobación casaba con el propio comentario que dice «aquí no hay
  // Math.random()» y acusaba al fichero de lo contrario de lo que hacía.
  const codigo = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  comprueba('R1 · ni un Math.random() en el código del núcleo', !/Math\.random/.test(codigo));
  comprueba('R1 · sin datos de relleno', !/faker|dummyData|fakeData/i.test(codigo));
  // Y la comprobación tiene que saber cazar: se le mete el patrón a mano.
  comprueba('R1 · la comprobación cazaría un Math.random real',
            /Math\.random/.test(codigo + '\nvar x = Math.random();'));
}

console.log((fallos.length ? '✗' : '✓') + ' detectores — ' + ok + ' comprobaciones pasadas'
            + (fallos.length ? ', ' + fallos.length + ' FALLIDAS' : ''));
fallos.forEach(f => console.log('   ✗ ' + f));
process.exit(fallos.length ? 1 : 0);
