/* ═══════════════════════════════════════════════════════════════════════════
   NÚCLEO COMPARTIDO DE LOS SEIS PROTOTIPOS — TradingCalculator.Pro
   Especificación: docs/BRIEF-ESCANERES.md (§3 contratos, §4 detectores,
   §5 fuentes, §8 validación, §9 cumplimiento).

   Este fichero se INCRUSTA en cada prototipo (scripts/gen-prototipos.js) para
   que cada .html sea autocontenido y se abra sin build ni servidor.

   R1 — NINGÚN DATO FABRICADO. Cada valor que sale por pantalla lleva
   procedencia. Si falta el dato, el valor es `unavailable` y se dice qué
   falta. En este fichero no hay ni un `Math.random()`, y hay una prueba que
   lo comprueba (scripts/check-escaneres.js).
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

/* ── §3 · Contratos ──────────────────────────────────────────────────────
   Provenance: 'live' | 'delayed' | 'derived' | 'estimated' | 'unavailable'
   Un valor 'derived' sale de otros valores medidos; 'estimated' descansa
   sobre una convención declarada (p. ej. el signo del dealer en GEX).      */

var PROV = { LIVE:'live', DELAYED:'delayed', DERIVED:'derived', EST:'estimated', NA:'unavailable' };

/** Medición sin valor todavía: NO es cero. Regla 2 de honestidad numérica. */
function sinDato(motivo) {
  return { value: null, provenance: PROV.NA, reason: motivo };
}

/* ── Buffer circular Float64Array ───────────────────────────────────────
   §2.3: cero asignación de objetos en el camino caliente. `push` no crea
   nada; `ventana` sólo se llama al agregar, no por tick.                  */
function RingF64(n) {
  this.buf = new Float64Array(n);
  this.n = n; this.i = 0; this.len = 0;
}
RingF64.prototype.push = function (v) {
  this.buf[this.i] = v;
  this.i = (this.i + 1) % this.n;
  if (this.len < this.n) this.len++;
};
RingF64.prototype.at = function (k) {            // k=0 → el más reciente
  return this.buf[(this.i - 1 - k + this.n * 2) % this.n];
};
RingF64.prototype.suma = function () {
  var s = 0; for (var k = 0; k < this.len; k++) s += this.at(k); return s;
};
RingF64.prototype.copia = function () {
  var out = new Float64Array(this.len);
  for (var k = 0; k < this.len; k++) out[k] = this.at(k);
  return out;
};

/* ── Estadística ────────────────────────────────────────────────────────
   Percentil por orden sobre copia: O(n log n) al agregar (cada 100-250 ms),
   nunca por tick.                                                          */
function percentilDe(valores, x) {
  var n = valores.length;
  if (!n) return null;
  var c = 0;
  for (var i = 0; i < n; i++) if (valores[i] <= x) c++;
  return (c / n) * 100;
}
function cuantil(valores, q) {
  var n = valores.length;
  if (!n) return null;
  var a = Array.prototype.slice.call(valores).sort(function (p, r) { return p - r; });
  var pos = (n - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (pos - lo);
}
function media(v) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return v.length ? s / v.length : null; }
function desv(v) {
  var m = media(v); if (m === null || v.length < 2) return null;
  var s = 0; for (var i = 0; i < v.length; i++) s += (v[i] - m) * (v[i] - m);
  return Math.sqrt(s / (v.length - 1));
}
/** Normal estándar acumulada (Abramowitz-Stegun 26.2.17), |ε| < 7,5e-8. */
function normCdf(z) {
  var s = z < 0 ? -1 : 1; z = Math.abs(z) / Math.SQRT2;
  var t = 1 / (1 + 0.3275911 * z);
  var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return 0.5 * (1 + s * y);
}
/** §8.1 — Benjamini-Hochberg. Devuelve los q-valores en el orden recibido. */
function bhFdr(pvals) {
  var n = pvals.length;
  if (!n) return [];
  var idx = pvals.map(function (p, i) { return { p: p, i: i }; })
                 .sort(function (a, b) { return a.p - b.p; });
  var q = new Array(n), minimo = 1;
  for (var k = n - 1; k >= 0; k--) {
    var v = idx[k].p * n / (k + 1);
    minimo = Math.min(minimo, v);
    q[idx[k].i] = Math.min(1, minimo);
  }
  return q;
}

/* ── §4 · Detectores. Funciones PURAS: (estado, ventana) → medición ──────
   Ninguna toca el DOM, ninguna llama a la red, ninguna guarda estado global.
   Cada una devuelve {value, provenance} o sinDato(motivo).                 */

var DET = {};

/** 1.1 OFI — Cont, Kukanov & Stoikov 2014.
 *  e_n = 1(Pb≥Pb₋)·qb − 1(Pb≤Pb₋)·qb₋ − 1(Pa≤Pa₋)·qa + 1(Pa≥Pa₋)·qa₋
 *  Se acumula por ventana. Es el detector con mejor relación evidencia/coste
 *  de la suite (§4 E1), y sale del stream `bookTicker`, que es gratis. */
DET.ofiEvento = function (prev, cur) {
  if (!prev) return 0;
  var e = 0;
  if (cur.bidPx >= prev.bidPx) e += cur.bidQty;
  if (cur.bidPx <= prev.bidPx) e -= prev.bidQty;
  if (cur.askPx <= prev.askPx) e -= cur.askQty;
  if (cur.askPx >= prev.askPx) e += prev.askQty;
  return e;
};

/** 1.2 Queue Imbalance — Gould & Bonart 2016. I ∈ [−1, 1] en L1. */
DET.queueImbalance = function (bidQty, askQty) {
  var t = bidQty + askQty;
  if (!(t > 0)) return sinDato('sin tamaños en la primera línea del libro');
  return { value: (bidQty - askQty) / t, provenance: PROV.LIVE };
};

/** 1.3 CVD — delta acumulado con el agresor REAL del exchange.
 *  En `aggTrade`, `m: true` = el comprador es el creador ⇒ agresor VENDEDOR. */
DET.ladoAggTrade = function (m) { return m ? 'sell' : 'buy'; };

/** 1.5 VPIN — Easley, López de Prado & O'Hara 2012, clasificación BVC.
 *  Vbuy = V·Φ(Δp/σ). VEREDICTO: Mixto — Andersen & Bondarenko lo disputan.
 *  Se publica como desequilibrio, nunca como aviso (§4, aviso sobre VPIN). */
DET.vpin = function (cubos) {
  if (!cubos || cubos.length < 5) return sinDato('faltan cubos de volumen (mínimo 5)');
  var s = 0;
  for (var i = 0; i < cubos.length; i++) s += Math.abs(cubos[i].vb - cubos[i].vs);
  var vol = cubos[0].v * cubos.length;
  if (!(vol > 0)) return sinDato('volumen del cubo en cero');
  return { value: s / vol, provenance: PROV.DERIVED };
};
DET.bvcSplit = function (v, dp, sigma) {
  if (!(sigma > 0)) return { vb: v / 2, vs: v / 2 };
  var z = normCdf(dp / sigma);
  return { vb: v * z, vs: v * (1 - z) };
};

/** 1.6 Lambda de Kyle — regresión de ΔP sobre volumen neto firmado. */
DET.kyleLambda = function (dP, netVol) {
  var n = Math.min(dP.length, netVol.length);
  if (n < 20) return sinDato('menos de 20 observaciones');
  var sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (var i = 0; i < n; i++) { sx += netVol[i]; sy += dP[i]; sxx += netVol[i] * netVol[i]; sxy += netVol[i] * dP[i]; }
  var den = n * sxx - sx * sx;
  if (!(Math.abs(den) > 1e-12)) return sinDato('flujo neto sin varianza');
  return { value: (n * sxy - sx * sy) / den, provenance: PROV.DERIVED };
};

/** 1.7 Iliquidez de Amihud 2002 — |r| / volumen en divisa. */
DET.amihud = function (rets, dollarVol) {
  var n = Math.min(rets.length, dollarVol.length);
  if (!n) return sinDato('sin barras');
  var s = 0, c = 0;
  for (var i = 0; i < n; i++) if (dollarVol[i] > 0) { s += Math.abs(rets[i]) / dollarVol[i]; c++; }
  if (!c) return sinDato('volumen en divisa en cero');
  return { value: (s / c) * 1e6, provenance: PROV.DERIVED };
};

/** 1.8 Absorción — volumen agresor >p95 con rango de precio <p20. */
DET.absorcion = function (volBarra, rangoBarra, histVol, histRango) {
  if (histVol.length < 30) return sinDato('menos de 30 barras de historia');
  var pv = percentilDe(histVol, volBarra), pr = percentilDe(histRango, rangoBarra);
  return { value: (pv >= 95 && pr <= 20) ? 1 : 0, provenance: PROV.DERIVED, pv: pv, pr: pr };
};

/** 1.9 Barrido — ≥3 niveles de precio distintos consumidos en <50 ms
 *  por el MISMO lado agresor. */
DET.barrido = function (ultimos, ventanaMs) {
  if (!ultimos.length) return sinDato('sin operaciones en la ventana');
  var t1 = ultimos[ultimos.length - 1].ts, lado = ultimos[ultimos.length - 1].side;
  var precios = {}, n = 0;
  for (var i = ultimos.length - 1; i >= 0; i--) {
    var t = ultimos[i];
    if (t1 - t.ts > ventanaMs) break;
    if (t.side !== lado) break;
    if (!precios[t.price]) { precios[t.price] = 1; n++; }
  }
  return { value: n, provenance: PROV.LIVE, side: lado };
};

/** 1.11 Intensidad de Hawkes — Bacry, Mastromatteo & Muzy 2015.
 *  λ(t) = μ + Σ α·e^(−β(t−tᵢ)), forma incremental exacta. */
DET.hawkes = function (lambdaPrev, dtSeg, alpha, beta, mu) {
  var decaido = (lambdaPrev - mu) * Math.exp(-beta * dtSeg);
  return mu + Math.max(0, decaido) + alpha;
};

/** 2.2 Ejecutado > visible — Hautsch & Huang 2012.
 *  Un trade con más volumen del publicado en ese nivel ⇒ había liquidez
 *  oculta. Es INFERENCIA: puede ser un nivel repuesto entre dos snapshots. */
DET.ejecutadoSobreVisible = function (volTrade, visibleEnNivel) {
  if (!(visibleEnNivel > 0)) return sinDato('nivel sin tamaño publicado en el último snapshot');
  return { value: volTrade / visibleEnNivel, provenance: PROV.DERIVED };
};

/** 2.1 Refill de iceberg — Frey & Sandås 2009 / Pardo & Pascual 2004.
 *  Nivel consumido que reaparece con tamaño similar en <500 ms. */
DET.refill = function (historialNivel, ventanaMs, tolerancia) {
  var n = 0;
  for (var i = 1; i < historialNivel.length; i++) {
    var a = historialNivel[i - 1], b = historialNivel[i];
    if (a.qty > 0 && b.qty > 0 && b.ts - a.ts < ventanaMs
        && Math.abs(b.qty - a.qty) / a.qty < tolerancia) n++;
  }
  return { value: n, provenance: PROV.DERIVED };
};

/** 3.1 Perfil de volumen — CME Market Profile. POC, VAH, VAL al 70 %. */
DET.perfilVolumen = function (mapa, anchoTick) {
  var precios = Object.keys(mapa).map(Number).sort(function (a, b) { return a - b; });
  if (!precios.length) return sinDato('sin volumen acumulado');
  var total = 0, poc = precios[0], maxV = -1;
  precios.forEach(function (p) { total += mapa[p]; if (mapa[p] > maxV) { maxV = mapa[p]; poc = p; } });
  var meta70 = total * 0.7, acc = mapa[poc];
  var i = precios.indexOf(poc), lo = i, hi = i;
  while (acc < meta70 && (lo > 0 || hi < precios.length - 1)) {
    var vLo = lo > 0 ? mapa[precios[lo - 1]] : -1;
    var vHi = hi < precios.length - 1 ? mapa[precios[hi + 1]] : -1;
    if (vHi >= vLo) { hi++; acc += mapa[precios[hi]]; } else { lo--; acc += mapa[precios[lo]]; }
  }
  return { value: poc, val: precios[lo], vah: precios[hi], total: total,
           provenance: PROV.DERIVED, anchoTick: anchoTick };
};

/** 4.1 Exponente de Hurst por DFA (Detrended Fluctuation Analysis). */
DET.hurstDFA = function (serie) {
  var n = serie.length;
  if (n < 128) return sinDato('menos de 128 observaciones');
  var m = media(serie), y = new Float64Array(n), acc = 0;
  for (var i = 0; i < n; i++) { acc += serie[i] - m; y[i] = acc; }
  var escalas = [8, 16, 32, 64], lx = [], ly = [];
  for (var e = 0; e < escalas.length; e++) {
    var s = escalas[e]; if (s * 4 > n) continue;
    var nb = Math.floor(n / s), sum = 0;
    for (var b = 0; b < nb; b++) {
      var sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (var k = 0; k < s; k++) { var xv = k, yv = y[b * s + k]; sx += xv; sy += yv; sxx += xv * xv; sxy += xv * yv; }
      var den = s * sxx - sx * sx;
      var pend = Math.abs(den) > 1e-12 ? (s * sxy - sx * sy) / den : 0;
      var ord = (sy - pend * sx) / s, q = 0;
      for (var k2 = 0; k2 < s; k2++) { var r = y[b * s + k2] - (pend * k2 + ord); q += r * r; }
      sum += q / s;
    }
    lx.push(Math.log(s)); ly.push(Math.log(Math.sqrt(sum / nb)));
  }
  if (lx.length < 3) return sinDato('serie demasiado corta para tres escalas');
  var sx2 = 0, sy2 = 0, sxx2 = 0, sxy2 = 0, N = lx.length;
  for (var j = 0; j < N; j++) { sx2 += lx[j]; sy2 += ly[j]; sxx2 += lx[j] * lx[j]; sxy2 += lx[j] * ly[j]; }
  var d2 = N * sxx2 - sx2 * sx2;
  if (!(Math.abs(d2) > 1e-12)) return sinDato('escalas degeneradas');
  return { value: (N * sxy2 - sx2 * sy2) / d2, provenance: PROV.DERIVED };
};

/** 4.7 Entropía de permutación — Bandt & Pompe 2002, orden 3, normalizada. */
DET.entropiaPermutacion = function (serie, orden) {
  orden = orden || 3;
  var n = serie.length;
  if (n < orden + 20) return sinDato('serie demasiado corta');
  var cuentas = {}, tot = 0;
  for (var i = 0; i + orden <= n; i++) {
    var idx = [];
    for (var k = 0; k < orden; k++) idx.push(k);
    idx.sort(function (a, b) { return serie[i + a] - serie[i + b]; });
    var clave = idx.join('');
    cuentas[clave] = (cuentas[clave] || 0) + 1; tot++;
  }
  var h = 0;
  Object.keys(cuentas).forEach(function (c) { var p = cuentas[c] / tot; h -= p * Math.log(p); });
  var fact = 1; for (var f = 2; f <= orden; f++) fact *= f;
  return { value: h / Math.log(fact), provenance: PROV.DERIVED };
};

/** 5.1 OI × precio — los cuatro cuadrantes. Descripción, no consejo. */
DET.cuadranteOI = function (dP, dOI) {
  if (dP === 0 || dOI === 0) return sinDato('sin variación medible');
  if (dP > 0 && dOI > 0) return { value: 'nuevas largas', provenance: PROV.DERIVED };
  if (dP > 0 && dOI < 0) return { value: 'cierre de cortos', provenance: PROV.DERIVED };
  if (dP < 0 && dOI > 0) return { value: 'nuevas cortas', provenance: PROV.DERIVED };
  return { value: 'liquidación de largas', provenance: PROV.DERIVED };
};

/** 6.7 Anomalía z robusta (MAD). Resistente a los propios valores extremos
 *  que queremos detectar, al contrario que la z clásica. */
DET.zRobusto = function (valores, x) {
  if (valores.length < 20) return sinDato('menos de 20 observaciones');
  var med = cuantil(valores, 0.5);
  var abs = Array.prototype.map.call(valores, function (v) { return Math.abs(v - med); });
  var mad = cuantil(abs, 0.5);
  if (!(mad > 0)) return sinDato('desviación absoluta mediana en cero');
  return { value: 0.6745 * (x - med) / mad, provenance: PROV.DERIVED };
};

/** 6.6 Agrupamiento en números redondos — Osler 2003 (NY Fed SR-150).
 *  ES el sustrato con respaldo real de lo que la industria llama
 *  «order blocks». Mide concentración en el último dígito significativo. */
DET.numerosRedondos = function (precios, paso) {
  if (precios.length < 30) return sinDato('menos de 30 precios');
  var enRedondo = 0;
  for (var i = 0; i < precios.length; i++) {
    var r = Math.abs(precios[i] / paso - Math.round(precios[i] / paso));
    if (r < 0.02) enRedondo++;
  }
  var p = enRedondo / precios.length, esperado = 0.04;
  return { value: p, esperado: esperado, exceso: p / esperado, provenance: PROV.DERIVED };
};

/* ── §5.1 · Adaptador de Binance ─────────────────────────────────────────
   Endpoints de SOLO datos de mercado, sin clave y sin autenticación:
     REST  https://data-api.binance.vision
     WS    wss://data-stream.binance.vision
   El libro se mantiene con el algoritmo oficial de sincronización: se
   almacenan los eventos, se pide el snapshot REST, se descartan los eventos
   viejos y se comprueba que la secuencia NO tiene huecos. Si los tiene, se
   resincroniza — un libro con hueco es un libro que miente.               */

var REST_BINANCE = 'https://data-api.binance.vision';
var WS_BINANCE   = 'wss://data-stream.binance.vision/stream?streams=';

function AdaptadorBinance(simbolo, alDato, alEstado) {
  this.sym = simbolo.toLowerCase();
  this.alDato = alDato;
  this.alEstado = alEstado || function () {};
  this.ws = null;
  this.reintento = 0;
  this.cerrado = false;
  this.libro = { bids: {}, asks: {}, lastUpdateId: 0, listo: false };
  this.pendientes = [];
  this.huecos = 0;
}
AdaptadorBinance.prototype.conectar = function () {
  var self = this;
  var flujos = [this.sym + '@aggTrade', this.sym + '@depth@100ms', this.sym + '@bookTicker'].join('/');
  this.alEstado({ estado: 'conectando', intento: this.reintento });
  var ws;
  try { ws = new WebSocket(WS_BINANCE + flujos); }
  catch (e) { this.alEstado({ estado: 'error', motivo: String(e && e.message || e) }); return; }
  this.ws = ws;

  ws.onopen = function () {
    self.reintento = 0;
    self.alEstado({ estado: 'conectado' });
    self.sincronizarLibro();
  };
  ws.onmessage = function (ev) {
    var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    var d = m.data || m;
    if (!d || !d.e) return;
    if (d.e === 'aggTrade') {
      self.alDato({ tipo: 'trade', ts: d.T, price: +d.p, size: +d.q,
                    side: DET.ladoAggTrade(d.m), sideMethod: 'exchange' });
    } else if (d.e === 'depthUpdate') {
      self.aplicarDepth(d);
    }
  };
  ws.onerror = function () { self.alEstado({ estado: 'error', motivo: 'fallo del socket' }); };
  ws.onclose = function () {
    if (self.cerrado) return;
    self.libro.listo = false;
    self.reintento++;
    var espera = Math.min(30000, 1000 * Math.pow(2, Math.min(5, self.reintento)));
    self.alEstado({ estado: 'reconectando', enMs: espera, intento: self.reintento });
    setTimeout(function () { if (!self.cerrado) self.conectar(); }, espera);
  };

  // `bookTicker` llega sin campo `e`: se distingue por sus claves.
  var previo = ws.onmessage;
  ws.onmessage = function (ev) {
    var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    var d = m.data || m;
    if (d && d.b !== undefined && d.a !== undefined && d.e === undefined) {
      self.alDato({ tipo: 'bbo', ts: Date.now(), bidPx: +d.b, bidQty: +d.B, askPx: +d.a, askQty: +d.A });
      return;
    }
    previo(ev);
  };
};
AdaptadorBinance.prototype.sincronizarLibro = function () {
  var self = this;
  this.libro.listo = false;
  this.pendientes = [];
  fetch(REST_BINANCE + '/api/v3/depth?symbol=' + this.sym.toUpperCase() + '&limit=1000')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (snap) {
      self.libro.bids = {}; self.libro.asks = {};
      snap.bids.forEach(function (b) { self.libro.bids[b[0]] = +b[1]; });
      snap.asks.forEach(function (a) { self.libro.asks[a[0]] = +a[1]; });
      self.libro.lastUpdateId = snap.lastUpdateId;
      // Se descarta todo evento cuyo `u` sea anterior al snapshot, y el
      // primero que se aplica tiene que cubrirlo: U ≤ lastUpdateId+1 ≤ u.
      var listos = self.pendientes.filter(function (e) { return e.u > snap.lastUpdateId; });
      var primero = listos[0];
      if (primero && !(primero.U <= snap.lastUpdateId + 1 && snap.lastUpdateId + 1 <= primero.u)) {
        self.huecos++; self.alEstado({ estado: 'resincronizando', huecos: self.huecos });
        return self.sincronizarLibro();
      }
      listos.forEach(function (e) { self.fusionar(e); });
      self.pendientes = [];
      self.libro.listo = true;
      self.alEstado({ estado: 'libro-listo', niveles: Object.keys(self.libro.bids).length });
    })
    .catch(function (e) {
      self.alEstado({ estado: 'sin-libro', motivo: String(e && e.message || e) });
    });
};
AdaptadorBinance.prototype.aplicarDepth = function (d) {
  if (!this.libro.listo) { this.pendientes.push(d); if (this.pendientes.length > 500) this.pendientes.shift(); return; }
  if (d.U > this.libro.lastUpdateId + 1) {   // hueco de secuencia
    this.huecos++;
    this.alEstado({ estado: 'hueco-de-secuencia', huecos: this.huecos });
    this.sincronizarLibro();
    return;
  }
  if (d.u < this.libro.lastUpdateId) return;
  this.fusionar(d);
};
AdaptadorBinance.prototype.fusionar = function (d) {
  var L = this.libro;
  (d.b || []).forEach(function (x) { if (+x[1] === 0) delete L.bids[x[0]]; else L.bids[x[0]] = +x[1]; });
  (d.a || []).forEach(function (x) { if (+x[1] === 0) delete L.asks[x[0]]; else L.asks[x[0]] = +x[1]; });
  L.lastUpdateId = d.u;
};
AdaptadorBinance.prototype.visibleEn = function (precio, lado) {
  var m = lado === 'buy' ? this.libro.asks : this.libro.bids;
  return m[precio] !== undefined ? m[precio] : (m[String(precio)] || 0);
};
AdaptadorBinance.prototype.cerrar = function () {
  this.cerrado = true;
  if (this.ws) try { this.ws.close(); } catch (e) {}
};

/* ── §4 · Fichas de evidencia. El veredicto NO es decorativo (§3). ───── */
var EVIDENCIA = {
  ofi:        {v:'Sólido', refs:['CKS2014'], nota:'Cont, Kukanov & Stoikov (2014) regresan Δmid sobre el OFI y encuentran una relación lineal estable. Es el detector con mejor relación evidencia/coste de la suite.'},
  queue:      {v:'Sólido', refs:['GB2016'],  nota:'Gould & Bonart (2016): el desequilibrio de cola predice el siguiente tick con relación no lineal.'},
  cvd:        {v:'Mixto',  refs:['CPS2015'], nota:'El delta acumulado con agresor real es un hecho medido; su valor predictivo no está establecido.'},
  divCvd:     {v:'Sin base', refs:[],        nota:'La divergencia CVD/precio se usa mucho y no tiene validación publicada. Se muestra como observación, no como señal.'},
  vpin:       {v:'Mixto',  refs:['ELO2012','AB2014'], nota:'DISPUTA ABIERTA: Easley, López de Prado & O’Hara lo proponen; Andersen & Bondarenko muestran que no anticipó el flash crash y que su poder cae al controlar por volatilidad. Se muestran las dos posturas.'},
  kyle:       {v:'Sólido', refs:['Kyle1985'],nota:'Kyle (1985): impacto por unidad de flujo firmado. Base teórica de toda la microestructura moderna.'},
  amihud:     {v:'Sólido', refs:['Amihud2002'], nota:'Amihud (2002): iliquidez como |r|/volumen en divisa. Replicado en decenas de mercados.'},
  absorcion:  {v:'Mixto',  refs:['FS2009'],  nota:'Volumen alto con rango bajo es consistente con absorción; también con un rango de baja volatilidad.'},
  barrido:    {v:'Mixto',  refs:[],          nota:'Consumo de varios niveles en milisegundos. Hecho medible; la intención detrás no se observa.'},
  bloques:    {v:'Sólido', refs:[],          nota:'Percentil 99 del tamaño: es un hecho aritmético sobre la distribución observada.'},
  hawkes:     {v:'Sólido', refs:['BMM2015'], nota:'Bacry, Mastromatteo & Muzy (2015): las llegadas de operaciones se autoexcitan. Ampliamente replicado.'},
  taker:      {v:'Mixto',  refs:[],          nota:'Ratio de volumen agresor comprador. Medido con el flag del exchange.'},
  refill:     {v:'Sólido', refs:['FS2009','PP2004'], nota:'Frey & Sandås (2009) y Pardo & Pascual (2004) documentan el impacto de las órdenes iceberg. En cripto NO hay flag: esto es inferencia con falsos positivos legítimos.'},
  sobreVisible:{v:'Sólido',refs:['Hautsch2012'], nota:'Hautsch & Huang (2012). Un trade mayor que lo publicado implica liquidez no mostrada — o un nivel repuesto entre dos snapshots.'},
  persistente:{v:'Mixto',  refs:['FS2009'],  nota:'Nivel que absorbe varias veces su tamaño visible sin ceder.'},
  perfil:     {v:'Sólido', refs:['CME-MP'],  nota:'Market Profile es documentación oficial de CME Group. El mejor pedigrí institucional de la suite.'},
  hurst:      {v:'Mixto',  refs:['DFA'],     nota:'DFA sobre ventana móvil. Estimador ruidoso en ventanas cortas: se publica con la ventana usada.'},
  entropia:   {v:'Mixto',  refs:['BP2002'],  nota:'Bandt & Pompe (2002). Mide aleatoriedad, no dirección.'},
  oiCuadrante:{v:'Sólido', refs:[],          nota:'Identidad contable entre precio e interés abierto. Describe lo ocurrido, no lo que viene.'},
  redondos:   {v:'Sólido', refs:['Osler2003'], nota:'Osler (2003, NY Fed SR-150): los stops se agrupan en números redondos y producen cascadas. ES el sustrato real de lo que la industria llama «order blocks», que NO tiene validación publicada.'},
  zRobusto:   {v:'Sólido', refs:[],          nota:'z basado en MAD: no lo arrastran los propios valores extremos que busca.'},
};

/* ── §9 · Cumplimiento. Vocabulario prohibido en la interfaz. ────────────
   Lo comprueba scripts/check-escaneres.js y hace fallar el build.        */
// cumplimiento-ok: ESTA es la lista de términos prohibidos; contenerlos es su definición.
var PROHIBIDO = ['comprar','vender','señal de','objetivo','entrada','stop loss','take profit',  // cumplimiento-ok
                 'garantiza','seguro','probabilidad de subida'];  // cumplimiento-ok

var DESCARGO = 'Herramienta de análisis, no asesoramiento de inversión. '
             + 'Los rendimientos pasados no garantizan resultados futuros. '  // cumplimiento-ok: descargo obligatorio del §9
             + 'TradingCalculator.Pro mantiene acuerdos de afiliación con brókeres: '
             + 'existe conflicto de interés y se declara aquí, no en el pie de página.';

/* ── Formato ────────────────────────────────────────────────────────────── */
function fmt(v, d) { return v === null || v === undefined || !isFinite(v) ? '—' : v.toFixed(d === undefined ? 2 : d); }
function fmtPct(v, d) { return v === null || v === undefined || !isFinite(v) ? '—' : v.toFixed(d === undefined ? 1 : d) + ' %'; }
function fmtHora(ts) {
  var x = new Date(ts);
  return String(x.getHours()).padStart(2,'0') + ':' + String(x.getMinutes()).padStart(2,'0')
       + ':' + String(x.getSeconds()).padStart(2,'0');
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DET: DET, RingF64: RingF64, bhFdr: bhFdr, percentilDe: percentilDe,
                     cuantil: cuantil, normCdf: normCdf, media: media, desv: desv,
                     EVIDENCIA: EVIDENCIA, PROHIBIDO: PROHIBIDO, PROV: PROV, sinDato: sinDato };
}
