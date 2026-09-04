#!/usr/bin/env node
/**
 * Ensambla los seis prototipos de escáner en `.html` AUTOCONTENIDOS.
 *
 * Cada fichero resultante se abre haciendo doble clic: sin build, sin
 * servidor y sin dependencias locales (docs/BRIEF-ESCANERES.md §2.1). El
 * núcleo (`prototypes/_core.js`) y la vista (`prototypes/_vistas.js`) se
 * incrustan; las funciones `init` se serializan con `Function.prototype
 * .toString()`, así que en el repo se escriben como código normal y no como
 * cadenas de texto.
 *
 * Lo generado NO se edita a mano: se edita el núcleo o la vista y se vuelve
 * a ejecutar esto (invariante del repo).
 *
 * Uso: node scripts/gen-prototipos.js
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DIR = path.join(RAIZ, 'prototypes');
const NUCLEO = fs.readFileSync(path.join(DIR, '_core.js'), 'utf8')
  .replace(/if \(typeof module[\s\S]*$/, '');           // fuera el export de Node
const V = require(path.join(DIR, '_vistas.js'));

const TOKENS = `
:root{--paper:#101319;--surface:#171B22;--raise:#1D222B;--rule:#262C36;--ink:#E7E2D6;
  --muted:#949AA3;--faint:#6E747E;--accent:#17CF63;--long:#22C55E;--short:#F26969;
  --warn:#F59E0B;--info:#7FB0FB;color-scheme:dark}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){
  --paper:#F7F6F2;--surface:#FBFAF9;--raise:#F1EEE8;--rule:#DEDAD3;--ink:#171B25;
  --muted:#5F6670;--faint:#8A8F98;--accent:#115F31;--long:#127A3C;--short:#B21A1A;
  --warn:#89550B;--info:#1763C4;color-scheme:light}}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-size:15px;line-height:1.5;
  font-family:'Inter Tight',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
h1,h2,h3,p{margin:0}
.mono,.num{font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
.cabecera{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:11px 16px;
  background:var(--surface);border-bottom:1px solid var(--rule);position:sticky;top:0;z-index:9}
.cabecera h1{font-family:'Archivo',sans-serif;font-size:15px;letter-spacing:-.02em;white-space:nowrap}
.cabecera h1 span{color:var(--faint);font-family:'IBM Plex Mono',monospace;font-size:11px;margin-right:7px}
.cabecera select{background:var(--paper);color:var(--ink);border:1px solid var(--rule);
  border-radius:2px;padding:4px 7px;font-size:12.5px;font-family:'IBM Plex Mono',monospace}
.medidores{margin-left:auto;display:flex;gap:14px;align-items:center;font-size:11px;color:var(--muted);
  font-family:'IBM Plex Mono',monospace}
.medidores b{color:var(--ink);font-weight:500}
.punto{width:7px;height:7px;border-radius:99px;background:var(--faint);display:inline-block;margin-right:6px}
.punto.on{background:var(--long)} .punto.mal{background:var(--short)} .punto.med{background:var(--warn)}
.sub{padding:9px 16px;border-bottom:1px solid var(--rule);font-size:12.5px;color:var(--muted);max-width:96ch}
.marco{container-type:inline-size;container-name:p}
.pie{border-top:1px solid var(--rule);padding:13px 16px;font-size:11px;color:var(--muted);line-height:1.6}
.pie b{color:var(--warn)}
.evid{border-top:1px solid var(--rule);padding:13px 16px}
.evid h3{font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:700;margin-bottom:9px}
.evid .ficha{display:grid;grid-template-columns:200px 78px 1fr;gap:10px;padding:6px 0;
  border-top:1px solid var(--rule);font-size:11.5px;color:var(--muted)}
.evid .ficha:first-of-type{border-top:0}
/* El gap de 1px de las rejillas YA hace de filete: un borde encima duplica la línea. */
.rej > .tile, .rej3 > .tile{border:0}
.evid b{color:var(--ink);font-weight:500}
.vd{font-weight:600;font-size:10.5px}
.vd.Solido{color:var(--long)} .vd.Mixto{color:var(--warn)} .vd.Sinbase{color:var(--muted)}
`;

function html(v) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>E${v.n} · ${v.titulo} — prototipo de escáner</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=Inter+Tight:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>${TOKENS}${V.COMUN_CSS}${v.css}</style>
</head><body>
<header class="cabecera">
  <h1><span>E${v.n}</span>${v.titulo}</h1>
  <select id="sym">
    <option value="btcusdt">BTCUSDT</option><option value="ethusdt">ETHUSDT</option>
    <option value="solusdt">SOLUSDT</option><option value="bnbusdt">BNBUSDT</option>
    <option value="xrpusdt">XRPUSDT</option>
  </select>
  <div class="medidores">
    <span><span class="punto" id="pt"></span><span id="estado">sin conectar</span></span>
    <span>latencia <b id="lat">—</b></span>
    <span>frame <b id="frm">—</b></span>
    <span>ev/s <b id="eps">—</b></span>
  </div>
</header>
<p class="sub">${v.sub}</p>
<main class="marco" id="marco">${v.html}</main>
<section class="evid"><h3>Detectores de esta vista · veredicto de evidencia</h3><div id="fichas"></div></section>
<footer class="pie" id="pie"></footer>
<script>${NUCLEO}
/* ── Arnés común ───────────────────────────────────────────────────── */
(function () {
  var sym = 'btcusdt', ad = null, cbs = [];
  var lat = [], frames = [], evs = 0, ultFrame = performance.now();
  var $ = function (i) { return document.getElementById(i); };

  function estado(t, clase) { $('estado').textContent = t; $('pt').className = 'punto ' + (clase || ''); }

  var ctx = {
    sym: sym, decimales: 2,
    adaptador: function (cb) {
      cbs.push(cb);
      if (!ad) {
        ad = new AdaptadorBinance(sym, function (d) { for (var i = 0; i < cbs.length; i++) cbs[i](d); },
          function (e) {
            if (e.estado === 'conectado') estado('conectado', 'on');
            else if (e.estado === 'libro-listo') estado('libro sincronizado · ' + e.niveles + ' niveles', 'on');
            else if (e.estado === 'conectando') estado('conectando…', 'med');
            else if (e.estado === 'reconectando') estado('reconectando en ' + Math.round(e.enMs / 1000) + ' s (intento ' + e.intento + ')', 'med');
            else if (e.estado === 'hueco-de-secuencia') estado('hueco de secuencia · resincronizando (' + e.huecos + ')', 'med');
            else if (e.estado === 'sin-libro') estado('sin libro: ' + e.motivo, 'mal');
            else estado(e.estado + (e.motivo ? ' · ' + e.motivo : ''), 'mal');
          });
        ad.conectar();
      }
      return ad;
    },
    tick: function (ts) { evs++; var d = Date.now() - ts; if (d >= 0 && d < 60000) { lat.push(d); if (lat.length > 200) lat.shift(); } },
    medir: function () { var n = performance.now(); frames.push(n - ultFrame); if (frames.length > 120) frames.shift(); ultFrame = n; },
    hecho: function (titulo, detalle, det) {
      var e = EVIDENCIA[det] || { v: '—' };
      var c = $('hechos'); if (!c) return;
      var f = document.createElement('div');
      f.innerHTML = '<span class="t">' + fmtHora(Date.now()) + '</span><span><b>' + titulo + '</b> ' + detalle + '</span>'
        + '<span class="vd ' + e.v.replace(/[^A-Za-z]/g, '') + '" title="' + (e.nota || '').replace(/"/g, '') + '">' + e.v + '</span>';
      c.insertBefore(f, c.firstChild);
      while (c.childNodes.length > 40) c.removeChild(c.lastChild);
    },
    pintaSpark: function (cv, ring) {
      if (!cv || !ring.len) return;
      var W = cv.clientWidth, H = 34, dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr; cv.height = H * dpr;
      var g = cv.getContext('2d'); g.scale(dpr, dpr);
      var v = ring.copia(), mn = Infinity, mx = -Infinity;
      for (var i = 0; i < v.length; i++) { if (v[i] < mn) mn = v[i]; if (v[i] > mx) mx = v[i]; }
      if (mx - mn < 1e-12) { mx = mn + 1; }
      var css = getComputedStyle(document.documentElement);
      g.strokeStyle = css.getPropertyValue('--accent').trim(); g.lineWidth = 1.2; g.beginPath();
      for (var k = 0; k < v.length; k++) {
        var x = (k / (v.length - 1 || 1)) * W, y = H - ((v[k] - mn) / (mx - mn)) * (H - 3) - 1.5;
        k ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  };

  setInterval(function () {
    if (lat.length) $('lat').textContent = Math.round(media(lat)) + ' ms';
    if (frames.length) {
      var p95 = cuantil(frames, 0.95);
      $('frm').textContent = Math.round(p95) + ' ms';
      $('frm').style.color = p95 > 16 ? 'var(--warn)' : 'var(--long)';
    }
    $('eps').textContent = evs; evs = 0;
  }, 1000);

  $('sym').addEventListener('change', function () { location.search = '?s=' + this.value; });
  var q = new URLSearchParams(location.search).get('s');
  if (q) { sym = q; ctx.sym = q; $('sym').value = q; }

  /* Fichas de evidencia (§3: el veredicto no es decorativo) */
  $('fichas').innerHTML = ${JSON.stringify(v.dets)}.map(function (k) {
    var e = EVIDENCIA[k]; if (!e) return '';
    return '<div class="ficha"><b>' + k + '</b><span class="vd ' + e.v.replace(/[^A-Za-z]/g, '') + '">' + e.v + '</span>'
      + '<span>' + e.nota + (e.refs.length ? ' <span style="color:var(--faint)">[' + e.refs.join(', ') + ']</span>' : '') + '</span></div>';
  }).join('');

  $('pie').innerHTML = '<b>Aviso.</b> ' + DESCARGO
    + '<br>Prototipo E${v.n} · datos de <span class="mono">data-stream.binance.vision</span> '
    + '(mercado al contado, sin clave). Cada valor lleva procedencia; lo que no se puede calcular '
    + 'se muestra como no disponible y se dice por qué. Ninguna cifra de esta pantalla la genera un modelo.';

  (${v.init.toString()})(ctx);
})();
</script>
</body></html>`;
}

// Las fichas se construyen en el navegador desde `EVIDENCIA`, que ya viaja
// dentro del núcleo incrustado: no hace falta ningún fichero intermedio.
let n = 0;
['e1','e2','e3','e4','e5','e6'].forEach((k) => {
  const v = V[k];
  fs.writeFileSync(path.join(DIR, v.id + '.html'), html(v));
  n++;
});
console.log('✓ ' + n + ' prototipos generados en prototypes/');
