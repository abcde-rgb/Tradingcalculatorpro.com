/* Las seis vistas. Cada `init` se serializa dentro de su .html autocontenido
   (scripts/gen-prototipos.js), así que aquí se escriben como código normal y
   pueden usar todo lo que el núcleo deja en ámbito global.
   Vocabulario de interfaz sujeto a docs/BRIEF-ESCANERES.md §9. */
'use strict';

/* Utilidades que todas comparten (van al shell) */
const COMUN_CSS = `
.tile{background:var(--surface);border:1px solid var(--rule);border-radius:2px;padding:11px 13px;display:grid;gap:6px;align-content:start}
.tile h3{font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;display:flex;justify-content:space-between;gap:8px;align-items:center}
.tile .big{font-family:'Archivo',sans-serif;font-size:25px;letter-spacing:-.035em;line-height:1;font-variant-numeric:tabular-nums}
.tile .sub{font-size:11px;color:var(--muted);line-height:1.45}
.na{color:var(--faint)!important;font-size:15px!important;font-family:'Inter Tight',sans-serif!important;letter-spacing:0!important}
.bar{height:5px;background:var(--rule);border-radius:1px;overflow:hidden}
.bar i{display:block;height:100%;background:var(--accent)}
.bar i.neg{background:var(--short)}
.log{font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.65;max-height:100%;overflow:auto}
.log div{display:grid;grid-template-columns:64px 1fr auto;gap:8px;padding:2px 0;border-bottom:1px solid var(--rule)}
.log .t{color:var(--faint)}
.up{color:var(--long)} .dn{color:var(--short)}
canvas{display:block;width:100%}
`;

module.exports = {

/* ═════════ E1 · ORDER FLOW ═════════════════════════════════════════ */
e1: {
  n: 1, id: 'e1-orderflow', titulo: 'Order Flow',
  sub: 'Microestructura ejecutada: qué se agrede, con cuánto y contra qué cola.',
  dets: ['ofi','queue','cvd','absorcion','bloques','barrido'],
  css: `
  .rej{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--rule)}
  .abajo{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:1px;background:var(--rule);min-height:300px}
  .panel{background:var(--paper);padding:12px 14px;min-width:0}
  @container p (max-width:900px){.rej{grid-template-columns:repeat(2,1fr)}.abajo{grid-template-columns:1fr}}`,
  html: `
  <div class="rej">
    <div class="tile"><h3>OFI <span id="ofi-ev"></span></h3><div class="big" id="ofi">—</div>
      <div class="bar"><i id="ofi-bar" style="width:0"></i></div>
      <div class="sub">Cont, Kukanov &amp; Stoikov 2014 · ventana de 30 s</div></div>
    <div class="tile"><h3>Desequilibrio de cola</h3><div class="big" id="qi">—</div>
      <div class="bar"><i id="qi-bar" style="width:0"></i></div>
      <div class="sub">Gould &amp; Bonart 2016 · primera línea del libro</div></div>
    <div class="tile"><h3>CVD</h3><div class="big" id="cvd">—</div>
      <canvas id="cvd-spark" height="34"></canvas>
      <div class="sub">Delta acumulado con agresor del exchange</div></div>
    <div class="tile"><h3>Absorción</h3><div class="big" id="abs">—</div>
      <div class="sub" id="abs-sub">volumen &gt;p95 con rango &lt;p20</div></div>
  </div>
  <div class="abajo">
    <div class="panel"><h3 style="font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;margin-bottom:8px">Cinta</h3>
      <div class="log" id="cinta" style="max-height:280px"></div></div>
    <div class="panel"><h3 style="font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;margin-bottom:8px">Hechos medidos</h3>
      <div class="log" id="hechos" style="max-height:280px"></div></div>
  </div>`,
  init: function (ctx) {
    var ofiRing = new RingF64(600), cvd = 0, prevBBO = null, ofiAcc = 0, nEv = 0;
    var cvdRing = new RingF64(240), volBarra = 0, hi = -Infinity, lo = Infinity;
    var histVol = [], histRango = [], ultimos = [], tamRing = new RingF64(3000);
    var $ = function (i) { return document.getElementById(i); };

    ctx.adaptador(function (d) {
      if (d.tipo === 'bbo') {
        var e = DET.ofiEvento(prevBBO, d);
        ofiRing.push(e); ofiAcc += e; nEv++;
        prevBBO = d;
        var qi = DET.queueImbalance(d.bidQty, d.askQty);
        ctx.medir();
        if (qi.value !== null) {
          $('qi').textContent = fmt(qi.value, 3);
          $('qi').className = 'big ' + (qi.value > 0 ? 'up' : qi.value < 0 ? 'dn' : '');
          $('qi-bar').style.width = ((qi.value + 1) / 2 * 100) + '%';
          $('qi-bar').className = qi.value < 0 ? 'neg' : '';
        } else { $('qi').textContent = '—'; $('qi').className = 'big na'; }
      } else if (d.tipo === 'trade') {
        cvd += (d.side === 'buy' ? d.size : -d.size);
        cvdRing.push(cvd); tamRing.push(d.size);
        volBarra += d.size; hi = Math.max(hi, d.price); lo = Math.min(lo, d.price);
        ultimos.push(d); if (ultimos.length > 400) ultimos.shift();
        ctx.tick(d.ts);

        var p99 = tamRing.len > 200 ? cuantil(tamRing.copia(), 0.99) : null;
        var bloque = p99 !== null && d.size > p99;
        var fila = document.createElement('div');
        fila.innerHTML = '<span class="t">' + fmtHora(d.ts) + '</span>'
          + '<span class="' + (d.side === 'buy' ? 'up' : 'dn') + '">' + fmt(d.price, 2) + '</span>'
          + '<span>' + fmt(d.size, 4) + (bloque ? ' ◼' : '') + '</span>';
        var c = $('cinta'); c.insertBefore(fila, c.firstChild);
        while (c.childNodes.length > 60) c.removeChild(c.lastChild);
        if (bloque) ctx.hecho('Print en bloque', fmt(d.size, 4) + ' (>p99 de ' + tamRing.len + ')', 'bloques');

        var sw = DET.barrido(ultimos, 50);
        if (sw.value >= 3) ctx.hecho('Barrido', sw.value + ' niveles en <50 ms · agresor ' + (sw.side === 'buy' ? 'comprador' : 'vendedor'), 'barrido');
      }
    });

    setInterval(function () {
      // R1: sin un solo evento de libro, el OFI no vale cero — no existe.
      // Un 0,0 en pantalla sin conexión es un dato fabricado.
      if (!ofiRing.len) {
        $('ofi').textContent = '—'; $('ofi').className = 'big na';
        $('ofi-ev').textContent = 'sin eventos';
        $('ofi-bar').style.width = '0';
      } else {
        var v = ofiRing.suma();
        $('ofi').textContent = fmt(v, 1);
        $('ofi').className = 'big ' + (v > 0 ? 'up' : v < 0 ? 'dn' : '');
        $('ofi-ev').textContent = nEv + ' ev';
        var vs = ofiRing.copia(), pc = percentilDe(vs, v);
        $('ofi-bar').style.width = (pc === null ? 0 : pc) + '%';
        $('ofi-bar').className = v < 0 ? 'neg' : '';
      }
      // Ídem el delta acumulado: sin operaciones clasificadas no hay delta.
      if (!cvdRing.len) { $('cvd').textContent = '—'; $('cvd').className = 'big na'; }
      else {
        $('cvd').textContent = fmt(cvd, 3);
        $('cvd').className = 'big ' + (cvd > 0 ? 'up' : cvd < 0 ? 'dn' : '');
      }

      if (hi > -Infinity) {
        histVol.push(volBarra); histRango.push(hi - lo);
        if (histVol.length > 300) { histVol.shift(); histRango.shift(); }
        var a = DET.absorcion(volBarra, hi - lo, histVol, histRango);
        if (a.value === null) { $('abs').textContent = '—'; $('abs').className = 'big na';
          $('abs-sub').textContent = a.reason; }
        else {
          $('abs').textContent = a.value ? 'sí' : 'no';
          $('abs').className = 'big ' + (a.value ? 'up' : '');
          $('abs-sub').textContent = 'volumen p' + fmt(a.pv, 0) + ' · rango p' + fmt(a.pr, 0);
          if (a.value) ctx.hecho('Absorción', 'volumen p' + fmt(a.pv,0) + ' con rango p' + fmt(a.pr,0), 'absorcion');
        }
        volBarra = 0; hi = -Infinity; lo = Infinity;
      }
      ctx.pintaSpark($('cvd-spark'), cvdRing);
    }, 1000);
  }
},

/* ═════════ E2 · LIQUIDEZ OCULTA ═══════════════════════════════════ */
e2: {
  n: 2, id: 'e2-liquidez-oculta', titulo: 'Liquidez oculta',
  sub: 'Lo que se puede medir de lo que no se muestra: reposiciones, ejecutado sobre visible, niveles que absorben.',
  dets: ['refill','sobreVisible','persistente'],
  css: `
  .dos{display:grid;grid-template-columns:340px minmax(0,1fr);gap:1px;background:var(--rule)}
  .panel{background:var(--paper);padding:12px 14px;min-width:0}
  .esc{font-family:'IBM Plex Mono',monospace;font-size:11.5px}
  .esc div{display:grid;grid-template-columns:78px 1fr 62px;gap:6px;align-items:center;padding:1px 0}
  .esc .q{height:11px;background:var(--rule);position:relative}
  .esc .q i{position:absolute;left:0;top:0;bottom:0;background:color-mix(in srgb,var(--long) 45%,transparent)}
  .esc .ask i{background:color-mix(in srgb,var(--short) 45%,transparent)}
  .esc .mid{color:var(--accent);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:3px 0;margin:2px 0}
  .rej3{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--rule);margin-bottom:1px}
  @container p (max-width:860px){.dos{grid-template-columns:1fr}.rej3{grid-template-columns:1fr}}`,
  html: `
  <div class="rej3">
    <div class="tile"><h3>Reposiciones detectadas</h3><div class="big na" id="refills">—</div>
      <div class="sub">Nivel consumido que reaparece con tamaño similar en &lt;500 ms · Frey &amp; Sandås 2009</div></div>
    <div class="tile"><h3>Ejecutado sobre visible</h3><div class="big" id="sobre">—</div>
      <div class="sub" id="sobre-sub">Hautsch &amp; Huang 2012 · máximo de la sesión</div></div>
    <div class="tile"><h3>Nivel más persistente</h3><div class="big" id="persist">—</div>
      <div class="sub" id="persist-sub">veces que absorbe su tamaño publicado</div></div>
  </div>
  <div class="dos">
    <div class="panel"><h3 style="font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;margin-bottom:8px">Libro L2 · 8 niveles</h3>
      <div class="esc" id="escalera"></div></div>
    <div class="panel"><h3 style="font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;margin-bottom:8px">Hechos medidos</h3>
      <div class="log" id="hechos" style="max-height:320px"></div></div>
  </div>`,
  init: function (ctx) {
    var $ = function (i) { return document.getElementById(i); };
    var histNivel = {}, refills = 0, maxSobre = 0, persist = {};
    var ad = ctx.adaptador(function (d) {
      if (d.tipo !== 'trade') return;
      ctx.tick(d.ts);
      var visible = ad.visibleEn(d.price.toFixed(ctx.decimales), d.side);
      if (visible > 0) {
        var r = DET.ejecutadoSobreVisible(d.size, visible);
        if (r.value !== null && r.value > 1.5) {
          persist[d.price] = (persist[d.price] || 0) + r.value;
          if (r.value > maxSobre) {
            maxSobre = r.value;
            $('sobre').textContent = fmt(r.value, 1) + '×';
            $('sobre-sub').textContent = 'en ' + fmt(d.price, 2) + ' · ejecutado ' + fmt(d.size, 4)
              + ' contra ' + fmt(visible, 4) + ' publicado';
          }
          ctx.hecho('Ejecutado sobre visible', fmt(r.value,1) + '× en ' + fmt(d.price,2), 'sobreVisible');
        }
      }
    });
    setInterval(function () {
      var L = ad.libro;
      if (!L.listo) { $('escalera').innerHTML = '<div style="color:var(--faint);display:block">Libro sin sincronizar todavía.</div>'; return; }
      var bids = Object.keys(L.bids).map(Number).sort(function (a,b) { return b-a; }).slice(0, 8);
      var asks = Object.keys(L.asks).map(Number).sort(function (a,b) { return a-b; }).slice(0, 8);
      var maxQ = 0;
      bids.concat(asks).forEach(function (p) {
        var q = L.bids[p] !== undefined ? L.bids[p] : L.asks[p];
        if (q > maxQ) maxQ = q;
      });
      // Historial por nivel para contar reposiciones (2.1)
      bids.concat(asks).forEach(function (p) {
        var q = (L.bids[p] !== undefined ? L.bids[p] : L.asks[p]) || 0;
        histNivel[p] = histNivel[p] || [];
        histNivel[p].push({ ts: Date.now(), qty: q });
        if (histNivel[p].length > 20) histNivel[p].shift();
      });
      var total = 0, mejor = null, mejorN = 0;
      Object.keys(histNivel).forEach(function (p) {
        var r = DET.refill(histNivel[p], 500, 0.15);
        total += r.value;
        if (r.value > mejorN) { mejorN = r.value; mejor = p; }
      });
      if (total > refills) ctx.hecho('Reposición de nivel', 'nivel ' + fmt(+mejor, 2) + ' · ' + mejorN + ' reposiciones', 'refill');
      refills = total;
      $('refills').textContent = String(total);
      $('refills').className = 'big';
      if (mejor) { $('persist').textContent = fmt(+mejor, 2);
        $('persist-sub').textContent = mejorN + ' reposiciones en ventana de 500 ms'; }
      var h = '';
      asks.slice().reverse().forEach(function (p) {
        h += '<div><span class="dn">' + fmt(p, 2) + '</span><span class="q ask"><i style="width:'
          + (L.asks[p] / maxQ * 100) + '%"></i></span><span>' + fmt(L.asks[p], 3) + '</span></div>';
      });
      h += '<div class="mid"><span>medio</span><span>' + fmt((bids[0] + asks[0]) / 2, 2)
        + '</span><span>' + fmt(asks[0] - bids[0], 2) + '</span></div>';
      bids.forEach(function (p) {
        h += '<div><span class="up">' + fmt(p, 2) + '</span><span class="q"><i style="width:'
          + (L.bids[p] / maxQ * 100) + '%"></i></span><span>' + fmt(L.bids[p], 3) + '</span></div>';
      });
      $('escalera').innerHTML = h;
      ctx.medir();
    }, 400);
  }
},

/* ═════════ E3 · ESTRUCTURA DE VOLUMEN ═════════════════════════════ */
e3: {
  n: 3, id: 'e3-estructura-volumen', titulo: 'Estructura de volumen',
  sub: 'Teoría de subasta: dónde se ha construido el valor. Market Profile es documentación oficial de CME.',
  dets: ['perfil'],
  css: `
  .dos{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:1px;background:var(--rule)}
  .panel{background:var(--paper);padding:12px 14px;min-width:0}
  .rej3{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--rule);margin-bottom:1px}
  @container p (max-width:900px){.dos{grid-template-columns:1fr}.rej3{grid-template-columns:repeat(2,1fr)}}`,
  html: `
  <div class="rej3">
    <div class="tile"><h3>POC</h3><div class="big" id="poc">—</div><div class="sub">precio con más volumen</div></div>
    <div class="tile"><h3>VAH</h3><div class="big" id="vah">—</div><div class="sub">techo del área de valor (70 %)</div></div>
    <div class="tile"><h3>VAL</h3><div class="big" id="val">—</div><div class="sub">suelo del área de valor</div></div>
    <div class="tile"><h3>VWAP</h3><div class="big" id="vwap">—</div><div class="sub" id="vwap-sub">ponderado por volumen ejecutado</div></div>
  </div>
  <div class="dos">
    <div class="panel"><h3 style="font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;margin-bottom:8px">Perfil de volumen por precio</h3>
      <canvas id="perfil" height="330"></canvas></div>
    <div class="panel"><h3 style="font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;margin-bottom:8px">Hechos medidos</h3>
      <div class="log" id="hechos" style="max-height:320px"></div></div>
  </div>`,
  init: function (ctx) {
    var $ = function (i) { return document.getElementById(i); };
    var mapa = {}, paso = null, sumaPV = 0, sumaV = 0, pocPrev = null;
    ctx.adaptador(function (d) {
      if (d.tipo !== 'trade') return;
      ctx.tick(d.ts);
      if (paso === null) paso = Math.pow(10, Math.floor(Math.log10(d.price)) - 3);
      var k = Math.round(d.price / paso) * paso;
      mapa[k] = (mapa[k] || 0) + d.size;
      sumaPV += d.price * d.size; sumaV += d.size;
    });
    setInterval(function () {
      var p = DET.perfilVolumen(mapa, paso);
      if (p.value === null) return;
      $('poc').textContent = fmt(p.value, 2);
      $('vah').textContent = fmt(p.vah, 2);
      $('val').textContent = fmt(p.val, 2);
      if (sumaV > 0) { $('vwap').textContent = fmt(sumaPV / sumaV, 2);
        $('vwap-sub').textContent = 'sobre ' + fmt(sumaV, 2) + ' de volumen de esta sesión'; }
      if (pocPrev !== null && p.value !== pocPrev) ctx.hecho('El POC se ha desplazado', fmt(pocPrev,2) + ' → ' + fmt(p.value,2), 'perfil');
      pocPrev = p.value;

      var cv = $('perfil'), W = cv.clientWidth, H = 330;
      cv.width = W * (window.devicePixelRatio || 1); cv.height = H * (window.devicePixelRatio || 1);
      var g = cv.getContext('2d'); g.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      var css = getComputedStyle(document.documentElement);
      g.clearRect(0, 0, W, H);
      var precios = Object.keys(mapa).map(Number).sort(function (a,b) { return b-a; });
      var maxV = 0; precios.forEach(function (x) { if (mapa[x] > maxV) maxV = mapa[x]; });
      var alto = Math.max(1, Math.min(9, H / precios.length));
      precios.forEach(function (x, i) {
        var y = i * (H / precios.length);
        var dentro = x >= p.val && x <= p.vah;
        g.fillStyle = x === p.value ? css.getPropertyValue('--accent').trim()
          : dentro ? 'rgba(23,207,99,.32)' : css.getPropertyValue('--rule').trim();
        g.fillRect(0, y, (mapa[x] / maxV) * (W - 62), Math.max(1, alto - 1));
      });
      g.fillStyle = css.getPropertyValue('--muted').trim();
      g.font = '10px IBM Plex Mono, monospace';
      [0, Math.floor(precios.length / 2), precios.length - 1].forEach(function (i) {
        if (precios[i] === undefined) return;
        g.fillText(precios[i].toFixed(2), W - 58, i * (H / precios.length) + 8);
      });
      ctx.medir();
    }, 800);
  }
},

/* ═════════ E4 · VOLATILIDAD Y RÉGIMEN ═════════════════════════════ */
e4: {
  n: 4, id: 'e4-volatilidad-regimen', titulo: 'Volatilidad y régimen',
  sub: 'El escáner que decide si los demás sirven ahora mismo. Describe el estado actual; no lo que viene.',
  dets: ['hurst','entropia'],
  css: `
  .rej{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--rule)}
  .panel{background:var(--paper);padding:12px 14px}
  .tira{display:flex;gap:2px;margin-top:6px}
  .tira span{flex:1;height:22px;border-radius:1px;background:var(--rule)}
  @container p (max-width:820px){.rej{grid-template-columns:1fr}}`,
  html: `
  <div class="rej">
    <div class="tile"><h3>Hurst (DFA)</h3><div class="big" id="hurst">—</div>
      <div class="sub" id="hurst-sub">se necesitan 128 retornos de 1 s</div>
      <div class="tira" id="hurst-tira"></div></div>
    <div class="tile"><h3>Entropía de permutación</h3><div class="big" id="ent">—</div>
      <div class="sub" id="ent-sub">Bandt &amp; Pompe 2002 · orden 3, normalizada</div></div>
    <div class="tile"><h3>Volatilidad realizada</h3><div class="big" id="rv">—</div>
      <div class="sub" id="rv-sub">suma de retornos al cuadrado, ventana de 5 min</div></div>
  </div>
  <div class="panel"><h3 style="font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;margin-bottom:8px">Hechos medidos</h3>
    <div class="log" id="hechos" style="max-height:250px"></div></div>`,
  init: function (ctx) {
    var $ = function (i) { return document.getElementById(i); };
    var precios = new RingF64(2048), ultimo = null, rets = [], hPrev = null;
    ctx.adaptador(function (d) {
      if (d.tipo !== 'trade') return;
      ctx.tick(d.ts);
      if (ultimo !== null && ultimo > 0) rets.push(Math.log(d.price / ultimo));
      if (rets.length > 4096) rets.shift();
      ultimo = d.price; precios.push(d.price);
    });
    setInterval(function () {
      if (rets.length < 128) {
        $('hurst-sub').textContent = 'llevan ' + rets.length + ' de 128 retornos necesarios';
        $('hurst').className = 'big na'; return;
      }
      var h = DET.hurstDFA(rets.slice(-1024));
      if (h.value !== null) {
        $('hurst').textContent = fmt(h.value, 3);
        $('hurst').className = 'big ' + (h.value > 0.55 ? 'up' : h.value < 0.45 ? 'dn' : '');
        $('hurst-sub').textContent = h.value > 0.55 ? 'persistente sobre ' + rets.length + ' retornos'
          : h.value < 0.45 ? 'antipersistente sobre ' + rets.length + ' retornos'
          : 'indistinguible de un paseo aleatorio';
        var t = $('hurst-tira'); t.innerHTML = '';
        for (var i = 0; i < 20; i++) {
          var s = document.createElement('span');
          if (i / 20 <= h.value) s.style.background = h.value > 0.55 ? 'var(--long)' : h.value < 0.45 ? 'var(--short)' : 'var(--muted)';
          t.appendChild(s);
        }
        if (hPrev !== null && ((hPrev < 0.5) !== (h.value < 0.5)))
          ctx.hecho('Hurst cruza 0,5', fmt(hPrev,3) + ' → ' + fmt(h.value,3), 'hurst');
        hPrev = h.value;
      }
      var e = DET.entropiaPermutacion(rets.slice(-512), 3);
      if (e.value !== null) { $('ent').textContent = fmt(e.value, 3);
        $('ent-sub').textContent = e.value < 0.9 ? 'por debajo de 0,9: hay estructura repetible' : 'cerca de 1: sin estructura aparente'; }
      var v = rets.slice(-300), s2 = 0;
      for (var k = 0; k < v.length; k++) s2 += v[k] * v[k];
      $('rv').textContent = fmt(Math.sqrt(s2) * 100, 3) + ' %';
      $('rv-sub').textContent = 'sobre las últimas ' + v.length + ' operaciones';
      ctx.medir();
    }, 1500);
  }
},

/* ═════════ E5 · POSICIONAMIENTO EN DERIVADOS ══════════════════════ */
e5: {
  n: 5, id: 'e5-posicionamiento', titulo: 'Posicionamiento en derivados',
  sub: 'Lo más cercano a ver el posicionamiento agregado que existe con datos públicos y gratuitos.',
  dets: ['oiCuadrante'],
  css: `
  .rej{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--rule);margin-bottom:1px}
  .panel{background:var(--paper);padding:12px 14px}
  @container p (max-width:900px){.rej{grid-template-columns:repeat(2,1fr)}}`,
  html: `
  <div class="rej">
    <div class="tile"><h3>Interés abierto</h3><div class="big" id="oi">—</div><div class="sub" id="oi-sub">Binance futuros · REST</div></div>
    <div class="tile"><h3>Financiación</h3><div class="big" id="fund">—</div><div class="sub" id="fund-sub">tipo del perpetuo</div></div>
    <div class="tile"><h3>Cuadrante OI × precio</h3><div class="big" id="cuad" style="font-size:17px">—</div><div class="sub">identidad contable, no previsión</div></div>
    <div class="tile"><h3>Liquidaciones (10 min)</h3><div class="big na" id="liq">—</div><div class="sub" id="liq-sub">stream !forceOrder@arr</div></div>
  </div>
  <div class="panel"><h3 style="font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;margin-bottom:8px">Liquidaciones y cambios de posicionamiento</h3>
    <div class="log" id="hechos" style="max-height:300px"></div></div>`,
  init: function (ctx) {
    var $ = function (i) { return document.getElementById(i); };
    var SYM = ctx.sym.toUpperCase(), oiPrev = null, pxPrev = null, nLiq = 0, liqs = [];
    ctx.adaptador(function (d) { if (d.tipo === 'trade') { pxPrev = d.price; ctx.tick(d.ts); } });

    // Liquidaciones: stream de FUTUROS, host distinto al de spot.
    try {
      var wl = new WebSocket('wss://fstream.binance.com/stream?streams=' + ctx.sym + '@forceOrder');
      wl.onmessage = function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        var o = m.data && m.data.o; if (!o) return;
        nLiq++; liqs.push({ ts: Date.now(), lado: o.S, q: +o.q, p: +o.p });
        liqs = liqs.filter(function (x) { return Date.now() - x.ts < 600000; });
        $('liq').textContent = String(liqs.length); $('liq').className = 'big';
        ctx.hecho('Liquidación forzosa', (o.S === 'SELL' ? 'largas' : 'cortas') + ' · ' + fmt(+o.q, 4) + ' a ' + fmt(+o.p, 2), 'oiCuadrante');
      };
      wl.onerror = function () { $('liq-sub').textContent = 'stream de futuros no disponible desde este navegador'; };
    } catch (e) { $('liq-sub').textContent = 'WebSocket de futuros bloqueado: ' + e.message; }

    function pide(url, alOk, alFallo) {
      fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(alOk).catch(function (e) { alFallo(e.message); });
    }
    function refresca() {
      pide('https://fapi.binance.com/fapi/v1/openInterest?symbol=' + SYM, function (j) {
        var oi = +j.openInterest;
        $('oi').textContent = fmt(oi, 0);
        $('oi-sub').textContent = 'contratos · dato en vivo';
        if (oiPrev !== null && pxPrev !== null) {
          var c = DET.cuadranteOI(0, oi - oiPrev);
          if (c.value) { $('cuad').textContent = c.value; }
        }
        oiPrev = oi;
      }, function (m) { $('oi').textContent = '—'; $('oi').className = 'big na'; $('oi-sub').textContent = 'sin dato: ' + m; });
      pide('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=' + SYM, function (j) {
        var f = +j.lastFundingRate * 100;
        $('fund').textContent = fmt(f, 4) + ' %';
        $('fund').className = 'big ' + (f > 0 ? 'up' : f < 0 ? 'dn' : '');
        $('fund-sub').textContent = f > 0 ? 'los largos pagan a los cortos' : f < 0 ? 'los cortos pagan a los largos' : 'neutro';
      }, function (m) { $('fund').textContent = '—'; $('fund').className = 'big na'; $('fund-sub').textContent = 'sin dato: ' + m; });
      ctx.medir();
    }
    refresca(); setInterval(refresca, 20000);
  }
},

/* ═════════ E6 · PATRONES ESTADÍSTICOS ═════════════════════════════ */
e6: {
  n: 6, id: 'e6-patrones-estadisticos', titulo: 'Patrones estadísticos',
  sub: 'Patrones con N, valor p y corrección por multiplicidad. Sin q-valor, un p<0,05 entre miles de pruebas no significa nada.',
  dets: ['zRobusto','redondos'],
  css: `
  .rej{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--rule);margin-bottom:1px}
  .panel{background:var(--paper);padding:12px 14px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;padding:7px 8px;border-bottom:1px solid var(--rule)}
  td{padding:6px 8px;border-bottom:1px solid var(--rule);font-family:'IBM Plex Mono',monospace}
  td.n{font-family:'Inter Tight',sans-serif}
  @container p (max-width:820px){.rej{grid-template-columns:1fr}}`,
  html: `
  <div class="rej">
    <div class="tile"><h3>z robusto · volumen</h3><div class="big" id="zvol">—</div>
      <div class="sub">basado en MAD: no lo arrastra el propio extremo</div></div>
    <div class="tile"><h3>Concentración en números redondos</h3><div class="big" id="red">—</div>
      <div class="sub" id="red-sub">Osler 2003 · NY Fed SR-150</div></div>
    <div class="tile"><h3>Pruebas activas</h3><div class="big na" id="npruebas">—</div>
      <div class="sub">con corrección Benjamini-Hochberg aplicada</div></div>
  </div>
  <div class="panel">
    <table><thead><tr><th>Medición</th><th>Valor</th><th>Percentil</th><th>p</th><th>q (BH)</th><th>Veredicto</th></tr></thead>
      <tbody id="tabla"></tbody></table>
    <p style="font-size:11px;color:var(--muted);margin-top:10px;line-height:1.5">
      El valor p sale del percentil de la propia distribución observada en esta sesión, así que sólo
      significa «cuán raro es esto frente a lo visto hoy». El q corrige por el número de pruebas que
      se están haciendo a la vez. Una fila con q &gt; 0,10 es ruido esperable.</p>
  </div>`,
  init: function (ctx) {
    var $ = function (i) { return document.getElementById(i); };
    var vols = [], rangos = [], precios = [], volBarra = 0, hi = -Infinity, lo = Infinity;
    ctx.adaptador(function (d) {
      if (d.tipo !== 'trade') return;
      ctx.tick(d.ts);
      volBarra += d.size; hi = Math.max(hi, d.price); lo = Math.min(lo, d.price);
      precios.push(d.price); if (precios.length > 2000) precios.shift();
    });
    setInterval(function () {
      if (hi === -Infinity) return;
      vols.push(volBarra); rangos.push(hi - lo);
      if (vols.length > 400) { vols.shift(); rangos.shift(); }
      var filas = [];
      var zv = DET.zRobusto(vols, volBarra);
      if (zv.value !== null) {
        $('zvol').textContent = fmt(zv.value, 2);
        $('zvol').className = 'big ' + (Math.abs(zv.value) > 3 ? 'up' : '');
        filas.push({ n: 'z robusto de volumen (MAD)', v: fmt(zv.value, 2), pc: percentilDe(vols, volBarra), det: 'zRobusto' });
      } else { $('zvol').className = 'big na'; }
      var zr = DET.zRobusto(rangos, hi - lo);
      if (zr.value !== null) filas.push({ n: 'z robusto de rango', v: fmt(zr.value, 2), pc: percentilDe(rangos, hi - lo), det: 'zRobusto' });
      var paso = Math.pow(10, Math.floor(Math.log10(precios[precios.length-1] || 1)) - 1);
      var r = DET.numerosRedondos(precios, paso);
      if (r.value !== null) {
        $('red').textContent = fmt(r.exceso, 2) + '×';
        $('red-sub').textContent = fmtPct(r.value * 100, 1) + ' de los precios contra ' + fmtPct(r.esperado * 100, 1) + ' esperado · Osler 2003';
        filas.push({ n: 'Concentración en números redondos', v: fmt(r.exceso, 2) + '×', pc: Math.min(99.9, r.exceso * 25), det: 'redondos' });
      }
      // p a partir del percentil observado (bilateral), y q por BH (§8.1).
      var ps = filas.map(function (f) { return f.pc === null ? 1 : Math.max(0.001, 2 * (1 - Math.max(f.pc, 100 - f.pc) / 100)); });
      var qs = bhFdr(ps);
      $('npruebas').textContent = String(filas.length);
      $('npruebas').className = filas.length ? 'big' : 'big na';
      $('tabla').innerHTML = filas.map(function (f, i) {
        var ev = EVIDENCIA[f.det] || { v: '—' };
        return '<tr><td class="n">' + f.n + '</td><td>' + f.v + '</td><td>'
          + (f.pc === null ? '—' : 'p' + fmt(f.pc, 0)) + '</td><td>' + fmt(ps[i], 3) + '</td><td'
          + (qs[i] > 0.10 ? ' style="color:var(--faint)"' : '') + '>' + fmt(qs[i], 3) + '</td>'
          + '<td class="n">' + ev.v + '</td></tr>';
      }).join('');
      volBarra = 0; hi = -Infinity; lo = Infinity;
      ctx.medir();
    }, 2000);
  }
},

COMUN_CSS: COMUN_CSS
};
