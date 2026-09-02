#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Seis mejoras de LA RESTAURADA — el hero viejo, llevado más lejos.

El diagnóstico
--------------
La restaurada recupera lo que se echaba de menos, pero arrastra el defecto que
sirvió para justificar su retirada: **las velas no significan nada**. Son un paseo
aleatorio bonito detrás de un titular; si las quitas, no se pierde información.
Ese era el argumento del commit d9d7377, y no era falso — sólo era incompleto,
porque la respuesta no es quitarlas: es hacer que digan algo.

Las seis conservan el esqueleto de la restaurada (píldora, «Trading Calculator
PRO», subtítulo, dos botones, nota de prueba, cuatro cifras y las velas detrás) y
cambian SÓLO el hero. El resto de la página es idéntico en las seis, para que la
comparación sea justa.

Uso:  python3 docs/muestras/portadas-restaurada/_generar.py
"""
import io, os, importlib.util

RAIZ = os.path.dirname(os.path.abspath(__file__))
_MUESTRAS = os.path.dirname(RAIZ)

def _cargar(nombre, ruta):
    spec = importlib.util.spec_from_file_location(nombre, ruta)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

# El cuerpo de la página y los datos se importan: las seis sólo innovan en el hero.
_v = _cargar('gen_velas', os.path.join(_MUESTRAS, 'portadas-velas', '_generar.py'))
FACTS, SPECS = _v.FACTS, _v.SPECS
CSS_BASE, LINK_FUENTES = _v.CSS_BASE, _v.LINK_FUENTES
nav, stats, pie, AVISO, LEYENDA = _v.nav, _v.stats, _v.pie, _v.AVISO, _v.LEYENDA
sec_features, sec_calcs, sec_specs = _v.sec_features, _v.sec_calcs, _v.sec_specs
sec_planes, sec_faq, sec_cierre = _v.sec_planes, _v.sec_faq, _v.sec_cierre
sec_herramientas = _v.sec_herramientas

# ── LO COMÚN A LAS SEIS ──────────────────────────────────────────────────────
CSS_COMUN = """
.hero{position:relative;padding:88px 0 66px;text-align:center;overflow:hidden}
@media (max-width:640px){.hero{padding:54px 0 46px}}
.hero .in{z-index:2}
.hero h1{font-size:clamp(40px,8vw,88px);line-height:.98;margin:24px 0 22px}
.hero h1 span{display:block}
.hero .cl{color:var(--dim);font-size:clamp(16px,1.9vw,19px);max-width:56ch;margin:0 auto 32px;line-height:1.7}
.hero .ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:14px}
.hero .stats{margin-top:52px;max-width:680px;margin-left:auto;margin-right:auto}
.sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.mejora{display:inline-flex;align-items:center;gap:8px;font:500 11px/1 "IBM Plex Mono",monospace;
  letter-spacing:.12em;text-transform:uppercase;color:var(--br);border:1px solid rgba(23,207,99,.3);
  background:var(--br-soft);border-radius:var(--r1);padding:7px 11px;margin-bottom:22px}
"""

def hero_comun(clase, extra_top='', extra_bajo='', h1=None, claim=None, badge=None):
    h1 = h1 or '<span>Trading Calculator</span><span class="pro">PRO</span>'
    claim = claim or ('Calculadoras profesionales, diario de operativa, simulador Monte Carlo y todo lo que '
                      'hace falta para dimensionar una posición en cripto, divisas, acciones, índices y futuros.')
    badge = badge or 'Herramienta hecha por y para traders'
    return f"""
<div class="hero {clase}">
  {extra_top}
  {LEYENDA}
  <div class="in">
    <span class="pill"><i></i>{badge}</span>
    <h1 class="disp">{h1}</h1>
    <p class="cl">{claim}</p>
    <div class="ctas">
      <button class="btn p lg">Empezar gratis</button>
      <button class="btn g lg">Ver los planes</button>
    </div>
    <p class="trial">7 días gratis · Cancela cuando quieras · Sin permanencia</p>
    {extra_bajo}
    {stats()}
  </div>
</div>"""

def pagina(hero):
    return (AVISO + '<div class="in">' + nav() + '</div>' + hero + sec_features() + sec_calcs()
            + sec_specs() + sec_planes() + sec_herramientas() + sec_faq() + sec_cierre('rz') + pie())

# ═══ R1 · EL TITULAR ES EL GRÁFICO ═══════════════════════════════════════════
CSS_R1 = """
#r1 .velas-fondo{position:absolute;inset:0;overflow:hidden;pointer-events:none}
#r1 .velas-fondo canvas{width:100%;height:100%;display:block}
#r1 .velas-fondo .v{position:absolute;left:0;right:0;top:0;height:100%;
  background:linear-gradient(to bottom,var(--bg) 0%,rgba(16,19,25,.94) 38%,rgba(16,19,25,.8) 70%,rgba(16,19,25,.55) 100%)}
#r1 h1 span:first-child{color:var(--fg)}
#r1 .maskwrap{position:relative;display:block;width:100%;height:.92em;margin-top:.02em}
#r1 .maskwrap canvas{position:absolute;inset:0;width:100%;height:100%}
#r1 .maskwrap .fb{position:absolute;inset:0;display:grid;place-items:center;color:var(--br);opacity:0}
"""
def hero_r1():
    return hero_comun(
        'r1h',
        extra_top='<div class="velas-fondo" id="r1f"><canvas></canvas><div class="v"></div></div>',
        h1=('<span>Trading Calculator</span>'
            '<span class="maskwrap"><canvas id="r1mask" aria-hidden="true"></canvas>'
            '<span class="fb">PRO</span><span class="sr">PRO</span></span>'),
        badge='La palabra está viva · pásale el ratón por encima')

# ═══ R2 · LA APERTURA ════════════════════════════════════════════════════════
CSS_R2 = """
#r2 .velas-fondo{position:absolute;inset:0;overflow:hidden;pointer-events:none}
#r2 .velas-fondo canvas{width:100%;height:100%;display:block}
#r2 .velas-fondo .v{position:absolute;left:0;right:0;top:0;height:78%;
  background:linear-gradient(to bottom,var(--bg) 0%,rgba(16,19,25,.9) 42%,rgba(16,19,25,.6) 72%,transparent 100%)}
#r2 .ent{animation:r2in .62s cubic-bezier(.16,1,.3,1) backwards}
#r2 .d1{animation-delay:.05s} #r2 .d2{animation-delay:.16s} #r2 .d3{animation-delay:.28s}
#r2 .d4{animation-delay:.4s}  #r2 .d5{animation-delay:.52s} #r2 .d6{animation-delay:.64s}
@keyframes r2in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#r2 .ent{animation:none}}
#r2 .barrido{position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--br);
  box-shadow:0 0 24px 4px rgba(23,207,99,.5);z-index:3;
  animation:r2sw 1.15s cubic-bezier(.5,0,.2,1) forwards;pointer-events:none}
@keyframes r2sw{0%{left:0;opacity:0}8%{opacity:.9}92%{opacity:.9}100%{left:100%;opacity:0}}
@media (prefers-reduced-motion:reduce){#r2 .barrido{display:none}}
"""
def hero_r2():
    return f"""
<div class="hero r2h">
  <div class="velas-fondo" id="r2f"><canvas></canvas><div class="v"></div></div>
  <div class="barrido"></div>
  {LEYENDA}
  <div class="in">
    <span class="pill ent d1"><i></i>Recarga la página para volver a verlo</span>
    <h1 class="disp"><span class="ent d2">Trading Calculator</span><span class="pro ent d3">PRO</span></h1>
    <p class="cl ent d4">Calculadoras profesionales, diario de operativa, simulador Monte Carlo y todo lo que
      hace falta para dimensionar una posición en cripto, divisas, acciones, índices y futuros.</p>
    <div class="ctas ent d5">
      <button class="btn p lg">Empezar gratis</button>
      <button class="btn g lg">Ver los planes</button>
    </div>
    <p class="trial ent d5">7 días gratis · Cancela cuando quieras · Sin permanencia</p>
    <div class="ent d6" id="r2stats">{stats()}</div>
  </div>
</div>"""

# ═══ R3 · EL HERO ES UN GRÁFICO ══════════════════════════════════════════════
CSS_R3 = """
#r3 .hero{padding-right:0}
#r3 .velas-fondo{position:absolute;inset:0 78px 0 0;overflow:hidden;pointer-events:none}
@media (max-width:640px){#r3 .velas-fondo{inset:0 56px 0 0}}
#r3 .velas-fondo canvas{width:100%;height:100%;display:block}
#r3 .velas-fondo .v{position:absolute;left:0;right:0;top:0;height:74%;
  background:linear-gradient(to bottom,var(--bg) 0%,rgba(16,19,25,.88) 44%,rgba(16,19,25,.55) 74%,transparent 100%)}
#r3 .eje{position:absolute;right:0;top:0;bottom:0;width:78px;border-left:1px solid var(--rule);
  background:var(--bg2);z-index:2;pointer-events:none;font-family:"IBM Plex Mono",monospace;
  font-size:10px;font-variant-numeric:tabular-nums;color:var(--faint)}
@media (max-width:640px){#r3 .eje{width:56px;font-size:9px}}
#r3 .eje b{position:absolute;left:8px;font-weight:400;transform:translateY(-50%)}
#r3 .ultimo{position:absolute;left:0;right:0;padding:3px 6px;background:var(--br);color:var(--br-ink);
  font-weight:600;transform:translateY(-50%);text-align:center;font-size:10.5px}
#r3 .cruz-x{position:absolute;left:0;right:78px;height:1px;background:rgba(148,163,184,.4);z-index:2;
  pointer-events:none;opacity:0;transition:opacity .15s}
@media (max-width:640px){#r3 .cruz-x{right:56px}}
#r3 .cruz-tag{position:absolute;right:0;width:78px;padding:3px 6px;background:var(--raised);
  border:1px solid var(--rule);color:var(--fg);font-family:"IBM Plex Mono",monospace;font-size:10px;
  text-align:center;transform:translateY(-50%);z-index:3;opacity:0;transition:opacity .15s}
@media (max-width:640px){#r3 .cruz-tag{width:56px}}
#r3 .hero:hover .cruz-x,#r3 .hero:hover .cruz-tag{opacity:1}
#r3 .in{padding-right:110px}
@media (max-width:640px){#r3 .in{padding-right:72px}}
"""
def hero_r3():
    return f"""
<div class="hero r3h" id="r3hero">
  <div class="velas-fondo" id="r3f"><canvas></canvas><div class="v"></div></div>
  <div class="cruz-x" id="r3cx"></div>
  <div class="eje" id="r3eje"></div>
  <div class="cruz-tag" id="r3tag"></div>
  {LEYENDA}
  <div class="in">
    <span class="pill"><i></i>Eje de precio a la derecha · la cruceta te sigue</span>
    <h1 class="disp"><span>Trading Calculator</span><span class="pro">PRO</span></h1>
    <p class="cl">Calculadoras profesionales, diario de operativa, simulador Monte Carlo y todo lo que
      hace falta para dimensionar una posición en cripto, divisas, acciones, índices y futuros.</p>
    <div class="ctas">
      <button class="btn p lg">Empezar gratis</button>
      <button class="btn g lg">Ver los planes</button>
    </div>
    <p class="trial">7 días gratis · Cancela cuando quieras · Sin permanencia</p>
    {stats()}
  </div>
</div>"""

# ═══ R4 · TU VELA ════════════════════════════════════════════════════════════
CSS_R4 = """
#r4 .velas-fondo{position:absolute;inset:0;overflow:hidden;pointer-events:none}
#r4 .velas-fondo canvas{width:100%;height:100%;display:block}
#r4 .velas-fondo .v{position:absolute;left:0;right:0;top:0;height:76%;
  background:linear-gradient(to bottom,var(--bg) 0%,rgba(16,19,25,.9) 40%,rgba(16,19,25,.62) 72%,transparent 100%)}
#r4 .marca{position:absolute;z-index:3;pointer-events:none;font-family:"IBM Plex Mono",monospace;
  font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--br);
  border:1px solid rgba(23,207,99,.4);background:rgba(11,14,19,.9);padding:4px 8px;
  transform:translate(-50%,-140%);opacity:0;transition:opacity .2s;white-space:nowrap}
#r4 .hero:hover .marca{opacity:1}
"""
def hero_r4():
    return hero_comun(
        'r4h',
        extra_top=('<div class="velas-fondo" id="r4f"><canvas></canvas><div class="v"></div></div>'
                   '<div class="marca" id="r4m">tu vela</div>'),
        badge='Mueve el ratón arriba y abajo · el mercado te sigue')

# ═══ R5 · DOS CAPAS ══════════════════════════════════════════════════════════
CSS_R5 = """
#r5 .hero{padding-bottom:170px}
#r5 .capa{position:absolute;inset:0;overflow:hidden;pointer-events:none}
#r5 .capa canvas{width:100%;height:100%;display:block}
#r5 .velo{position:absolute;left:0;right:0;top:0;height:80%;z-index:2;pointer-events:none;
  background:linear-gradient(to bottom,var(--bg) 0%,rgba(16,19,25,.92) 40%,rgba(16,19,25,.6) 74%,transparent 100%)}
#r5 .leyenda2{position:absolute;left:0;right:0;bottom:10px;z-index:3;display:flex;gap:26px;
  justify-content:center;flex-wrap:wrap;font-size:11.5px;color:var(--faint)}
#r5 .leyenda2 span{display:inline-flex;align-items:center;gap:8px}
#r5 .leyenda2 i{width:16px;height:2px;display:inline-block}
#r5 .leyenda2 .m{background:rgba(148,163,184,.55)}
#r5 .leyenda2 .d{background:var(--br);height:2px}
"""
def hero_r5():
    return f"""
<div class="hero r5h">
  <div class="capa" id="r5lejos"><canvas></canvas></div>
  <div class="capa" id="r5cerca"><canvas></canvas></div>
  <div class="velo"></div>
  {LEYENDA}
  <div class="in">
    <span class="pill"><i></i>Detrás el mercado · delante una cuenta dimensionada</span>
    <h1 class="disp"><span>Trading Calculator</span><span class="pro">PRO</span></h1>
    <p class="cl">El ruido de fondo no lo controlas. El tamaño de cada posición, sí — y es lo único que
      convierte una racha en un sistema.</p>
    <div class="ctas">
      <button class="btn p lg">Empezar gratis</button>
      <button class="btn g lg">Ver los planes</button>
    </div>
    <p class="trial">7 días gratis · Cancela cuando quieras · Sin permanencia</p>
    {stats()}
  </div>
  <div class="leyenda2">
    <span><i class="m"></i>Velas: mercado ilustrativo</span>
    <span><i class="d"></i>Línea: curva de capital de una cuenta al 1 % por operación</span>
  </div>
</div>"""

# ═══ R6 · MEDIDO ═════════════════════════════════════════════════════════════
CSS_R6 = """
#r6 .velas-fondo{position:absolute;inset:0;overflow:hidden;pointer-events:none}
#r6 .velas-fondo canvas{width:100%;height:100%;display:block}
#r6 .velas-fondo .v{position:absolute;left:0;right:0;top:0;height:80%;
  background:linear-gradient(to bottom,var(--bg) 0%,rgba(16,19,25,.93) 42%,rgba(16,19,25,.62) 74%,transparent 100%)}
#r6 .regla{position:relative;height:16px;margin:34px auto 0;max-width:760px}
#r6 .regla .ax{position:absolute;left:0;right:0;top:0;height:1px;background:var(--rule)}
#r6 .regla i{position:absolute;top:0;width:1px;background:var(--rule)}
#r6 .regla i.mj{height:13px;background:var(--faint)}
#r6 .regla i.md{height:8px}
#r6 .regla i.mn{height:4px}
#r6 .regla b{position:absolute;top:0;width:1px;height:16px;background:var(--br);
  box-shadow:0 0 8px rgba(23,207,99,.6)}
#r6 .stats{margin-top:20px;max-width:760px}
#r6 .stats .s{position:relative;padding-top:14px}
#r6 .stats .s::before{content:"";position:absolute;top:0;left:50%;width:1px;height:9px;background:var(--br);
  transform:translateX(-50%)}
#r6 .lect{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--faint);margin-top:14px;
  letter-spacing:.04em}
#r6 .lect b{color:var(--br);font-weight:500}
"""
def hero_r6():
    return hero_comun(
        'r6h',
        extra_top='<div class="velas-fondo" id="r6f"><canvas></canvas><div class="v"></div></div>',
        extra_bajo=('<div class="regla" id="r6r"><div class="ax"></div></div>'
                    '<p class="lect" id="r6l">La escala mide esta portada: <b>0 px</b></p>'),
        badge='La regleta mide · las cifras son sus marcas')

# ── MOTOR AMPLIADO ───────────────────────────────────────────────────────────
JS = r"""
(function(){
'use strict';
var $=function(s){return document.querySelector(s)}, $$=function(s){return [].slice.call(document.querySelectorAll(s))};
var nf=function(n,d){d=(d===undefined?0:d);return new Intl.NumberFormat('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)};
var reducido=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Mismo motor que la restaurada (port fiel de AnimatedHeroChart.jsx) más las
   piezas que cada mejora necesita: máscara de texto, sesgo por ratón, línea de
   capital, cruceta a lo ancho del hero y último precio. Las constantes del
   original no se tocan. */
var VERDE=[34,197,94], ROJO=[239,68,68], CW=15, MIN_PX=8;
var rgba=function(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'};
var raton={x:-1,y:-1,dentro:false};
window.addEventListener('mousemove',function(e){raton.x=e.clientX;raton.y=e.clientY;raton.dentro=true;});
document.documentElement.addEventListener('mouseleave',function(){raton.dentro=false;});

function motor(host,o){
  o=o||{};
  var canvas=host.querySelector('canvas'); if(!canvas) return null;
  var ctx=canvas.getContext('2d');
  var alpha=(o.dim===undefined?1:o.dim), vel=(o.vel===undefined?0.9:o.vel);
  var velas=[],ancho=0,alto=0,dpr=1,izq=0,arr=0,scroll=0,precio=100,tend=0,capital=100,serie=[];
  var api={ultimo:function(){return precio}, y:null, alto:function(){return alto}, arriba:function(){return arr}};

  function sesgo(){
    if(!o.sesgoRaton||!raton.dentro||!alto) return 0;
    var ry=raton.y-arr;
    if(ry<0||ry>alto) return 0;
    return (0.5-(ry/alto))*2.6;      // ratón arriba → empuja al alza
  }
  function siguiente(){
    tend+=(Math.random()-0.5)*0.4; tend=Math.max(-1.2,Math.min(1.2,tend));
    var o1=precio, mv=tend+sesgo()+(Math.random()-0.5)*3.2, c=o1+mv;
    var h=Math.max(o1,c)+Math.random()*1.8, l=Math.min(o1,c)-Math.random()*1.8;
    precio=c;
    if(precio>130) tend-=0.5;
    if(precio<70)  tend+=0.5;
    /* curva de capital de una cuenta al 1 %: gana o pierde según cerró la vela,
       pero SIEMPRE arriesgando el mismo porcentaje. Es la tesis del producto
       dibujada — y por eso sube aunque el mercado no vaya a ninguna parte. */
    capital *= (c>=o1) ? 1.014 : 0.991;
    serie.push(capital); if(serie.length>600) serie.shift();
    return {o:o1,h:h,l:l,c:c};
  }
  function medir(){
    var r=canvas.getBoundingClientRect();
    if(!r.width||!r.height) return false;
    dpr=Math.min(window.devicePixelRatio||1,2);
    ancho=r.width; alto=r.height; izq=r.left; arr=r.top;
    canvas.width=Math.floor(ancho*dpr); canvas.height=Math.floor(alto*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    var n=Math.ceil(ancho/CW)+3;
    while(velas.length<n) velas.push(siguiente());
    if(velas.length>n+4) velas=velas.slice(-n);
    return true;
  }
  function pintar(){
    if(!ancho||!velas.length) return;
    ctx.clearRect(0,0,ancho,alto);
    if(o.base){ ctx.fillStyle=o.base; ctx.fillRect(0,0,ancho,alto); }
    var min=Infinity,max=-Infinity,i,k;
    for(i=0;i<velas.length;i++){k=velas[i]; if(k.l<min)min=k.l; if(k.h>max)max=k.h;}
    var pad=(max-min)*0.12||1; min-=pad; max+=pad;
    var padY=alto*0.14;
    var esc=Math.max((alto-padY*2)/(max-min),MIN_PX), mid=(min+max)/2;
    var y=function(p){return alto/2-(p-mid)*esc;};
    api.y=y; api.min=min; api.max=max;
    var baseX=-scroll;

    if(!o.sinArea){
      ctx.beginPath(); ctx.moveTo(baseX,alto);
      for(i=0;i<velas.length;i++) ctx.lineTo(baseX+i*CW+CW/2,y(velas[i].c));
      ctx.lineTo(baseX+(velas.length-1)*CW+CW/2,alto); ctx.closePath();
      var g=ctx.createLinearGradient(0,0,0,alto);
      g.addColorStop(0,rgba(VERDE,0.10*alpha)); g.addColorStop(1,rgba(VERDE,0));
      ctx.fillStyle=g; ctx.fill();
    }

    var mx=raton.dentro?raton.x-izq:-1, hot=-1;
    if(mx>=0&&mx<=ancho) hot=Math.round((mx-baseX-CW/2)/CW);
    if(o.forzarHot) hot=velas.length-1;

    for(i=0;i<velas.length;i++){
      k=velas[i];
      var cx=baseX+i*CW+CW/2;
      if(cx<-CW||cx>ancho+CW) continue;
      var col=(k.c>=k.o)?VERDE:ROJO, a=((i===hot)?0.95:(o.opaco?0.9:0.42))*alpha;
      ctx.strokeStyle=rgba(col,a); ctx.fillStyle=rgba(col,a); ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(cx,y(k.h)); ctx.lineTo(cx,y(k.l)); ctx.stroke();
      var top=y(Math.max(k.o,k.c)), bh=Math.max(Math.abs(y(k.o)-y(k.c)),1.5);
      ctx.fillRect(cx-CW*0.32,top,CW*0.64,bh);
    }

    /* línea de capital: escala propia, dibujada sobre la mitad baja del lienzo */
    if(o.capital&&serie.length>3){
      var s=serie.slice(-velas.length), lo=Math.min.apply(null,s), hi=Math.max.apply(null,s);
      if(alto<220) return;
      var rg=(hi-lo)||1, y0=alto-26, y1=alto-150;
      ctx.beginPath();
      for(i=0;i<s.length;i++){
        var px=baseX+i*CW+CW/2, py=y0-((s[i]-lo)/rg)*(y0-y1);
        if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      }
      ctx.strokeStyle=rgba([23,207,99],0.95); ctx.lineWidth=2;
      ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();
      var ux=baseX+(s.length-1)*CW+CW/2, uy=y0-((s[s.length-1]-lo)/rg)*(y0-y1);
      ctx.fillStyle=rgba([23,207,99],1); ctx.beginPath(); ctx.arc(ux,uy,3.5,0,Math.PI*2); ctx.fill();
    }

    if(hot>=0&&hot<velas.length&&!o.sinCruz){
      k=velas[hot];
      var hx=baseX+hot*CW+CW/2;
      ctx.strokeStyle=rgba([148,163,184],0.5*alpha); ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(hx,0); ctx.lineTo(hx,alto); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=rgba((k.c>=k.o)?VERDE:ROJO,0.95*alpha);
      ctx.beginPath(); ctx.arc(hx,y(k.c),3,0,Math.PI*2); ctx.fill();
      api.hotX=hx; api.hotY=y(k.c);
    }

    /* máscara de texto: se pinta el gráfico y luego se recorta a la forma de la
       palabra. destination-in deja sólo lo que cae dentro del glifo. */
    if(o.mascara){
      ctx.globalCompositeOperation='destination-in';
      ctx.fillStyle='#000';
      var t=o.mascara, fs=alto*0.98;
      ctx.font='700 '+fs+'px Archivo, "Inter Tight", sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.save(); ctx.translate(ancho/2,alto/2);
      var w=ctx.measureText(t).width, lim=ancho*0.98;
      if(w>lim) ctx.scale(lim/w,1);
      ctx.fillText(t,0,0); ctx.restore();
      ctx.globalCompositeOperation='source-over';
    }
    if(o.tras) o.tras(api);
  }
  var ult=performance.now();
  function bucle(ahora){
    var dt=Math.min(ahora-ult,60); ult=ahora;
    scroll+=(dt/1000)*CW*vel;
    while(scroll>=CW){ scroll-=CW; velas.push(siguiente()); velas.shift(); }
    pintar(); requestAnimationFrame(bucle);
  }
  if(medir()) pintar();
  if(window.ResizeObserver) new ResizeObserver(function(){ if(medir()) pintar(); }).observe(canvas);
  window.addEventListener('scroll',function(){var r=canvas.getBoundingClientRect();izq=r.left;arr=r.top;},{passive:true});
  if(!reducido) requestAnimationFrame(bucle);
  api.repintar=pintar;
  return api;
}
"""

JS_WIRE = r"""
/* ── R1 · el titular es el gráfico ─────────────────────────────────────── */
(function(){
  var f=document.getElementById('r1f'); if(f) motor(f,{dim:.5,vel:.9});
  var mc=document.getElementById('r1mask'); if(!mc) return;
  var host={querySelector:function(){return mc}};
  var api=motor(host,{dim:1,vel:1.05,mascara:'PRO',sinCruz:true,forzarHot:true,
                      opaco:true,base:'rgba(23,207,99,0.42)'});
  // las métricas del glifo cambian cuando entra Archivo: repintar al cargarla
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ if(api) api.repintar(); });
})();

/* ── R2 · la apertura ──────────────────────────────────────────────────── */
(function(){
  var f=document.getElementById('r2f'); if(!f) return;
  motor(f,{dim:1,vel:.9});
  var host=document.getElementById('r2stats'); if(!host||reducido) return;
  var vs=[].slice.call(host.querySelectorAll('.v'));
  var fin=vs.map(function(e){return parseInt(e.textContent,10)});
  vs.forEach(function(e){e.textContent='0'});
  setTimeout(function(){
    var t0=performance.now(), dur=900;
    (function paso(t){
      var k=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-k,3);
      vs.forEach(function(el,i){ el.textContent=String(Math.round(fin[i]*e)); });
      if(k<1) requestAnimationFrame(paso);
    })(performance.now());
  },700);
  // una cifra a cero es un dato falso: si la animación no llega a su fin
  // (pestaña en segundo plano, rAF pausado), se escriben las reales.
  setTimeout(function(){ vs.forEach(function(el,i){ el.textContent=String(fin[i]); }); },2600);
})();

/* ── R3 · el hero es un gráfico ────────────────────────────────────────── */
(function(){
  var f=document.getElementById('r3f'); if(!f) return;
  var eje=document.getElementById('r3eje'), tag=document.getElementById('r3tag'),
      cx=document.getElementById('r3cx'), hero=document.getElementById('r3hero');
  var ult=0;
  motor(f,{dim:.9,vel:.9,tras:function(api){
    var ahora=performance.now();
    if(ahora-ult<160||!api.y) return;         // el DOM no se toca a 60 fps
    ult=ahora;
    var min=api.min,max=api.max,h=api.alto(),html='';
    for(var i=0;i<=5;i++){
      var p=min+(max-min)*(i/5), yy=api.y(p);
      if(yy<10||yy>h-10) continue;
      html+='<b style="top:'+yy.toFixed(1)+'px">'+nf(p,2)+'</b>';
    }
    var pu=api.ultimo();
    html+='<div class="ultimo" style="top:'+api.y(pu).toFixed(1)+'px">'+nf(pu,2)+'</div>';
    eje.innerHTML=html;
  }});
  if(hero) hero.addEventListener('mousemove',function(e){
    var r=hero.getBoundingClientRect(), y=e.clientY-r.top;
    cx.style.top=y+'px'; tag.style.top=y+'px';
    var fr=1-(y/r.height);
    tag.textContent=nf(70+fr*60,2);
  });
})();

/* ── R4 · tu vela ──────────────────────────────────────────────────────── */
(function(){
  var f=document.getElementById('r4f'); if(!f) return;
  var m=document.getElementById('r4m');
  motor(f,{dim:1,vel:.9,sesgoRaton:true,forzarHot:true,tras:function(api){
    if(!m||api.hotX===undefined) return;
    m.style.left=api.hotX+'px'; m.style.top=api.hotY+'px';
  }});
})();

/* ── R5 · dos capas ────────────────────────────────────────────────────── */
(function(){
  var l=document.getElementById('r5lejos'), c=document.getElementById('r5cerca');
  if(l) motor(l,{dim:.3,vel:.42,sinArea:true,sinCruz:true});
  if(c) motor(c,{dim:.85,vel:.9,capital:true});
})();

/* ── R6 · medido ───────────────────────────────────────────────────────── */
(function(){
  var f=document.getElementById('r6f'); if(f) motor(f,{dim:.85,vel:.9});
  var r=document.getElementById('r6r'), l=document.getElementById('r6l'); if(!r) return;
  var marca=document.createElement('b'); marca.style.left='-10px';
  function dibujar(){
    var w=r.clientWidth||760, paso=8, n=Math.floor(w/paso), h='<div class="ax"></div>';
    for(var i=0;i<=n;i++){
      var cls=(i%10===0)?'mj':((i%5===0)?'md':'mn');
      h+='<i class="'+cls+'" style="left:'+(i*paso)+'px"></i>';
    }
    r.innerHTML=h; r.appendChild(marca);
    if(l) l.innerHTML='La escala mide esta portada: <b>'+nf(Math.round(w))+' px</b> · marca mayor cada 80 px';
  }
  dibujar();
  if(window.ResizeObserver) new ResizeObserver(dibujar).observe(r);
  r.parentElement.addEventListener('mousemove',function(e){
    var b=r.getBoundingClientRect(), x=Math.max(0,Math.min(b.width,e.clientX-b.left));
    marca.style.left=x+'px';
    if(l) l.innerHTML='La escala mide esta portada: <b>'+nf(Math.round(x))+' px</b> de '+nf(Math.round(b.width))+' px';
  });
})();

/* cierres de página: las velas del bloque final, en todas */
[].slice.call(document.querySelectorAll('.cierre .velas')).forEach(function(el){ motor(el,{dim:.55,vel:.7}); });
})();
"""

# ── LAS SEIS ─────────────────────────────────────────────────────────────────
MEJORAS = [
 ('01-titular-vivo', 'r1', 'El titular es el gráfico',
  'La palabra PRO deja de ser un degradado y pasa a ser una ventana: las velas corren DENTRO de las letras.',
  CSS_R1, hero_r1),
 ('02-la-apertura', 'r2', 'La apertura',
  'Coreografía de entrada: un barrido recorre el hero, el titular se ensambla y las cifras cuentan hasta su valor.',
  CSS_R2, hero_r2),
 ('03-hero-grafico', 'r3', 'El hero es un gráfico',
  'Eje de precio a la derecha, último precio en etiqueta viva y cruceta que sigue al ratón por todo el hero.',
  CSS_R3, hero_r3),
 ('04-tu-vela', 'r4', 'Tu vela',
  'El ratón sesga el mercado: subes y la vela en formación se va al alza. El visitante mueve el gráfico.',
  CSS_R4, hero_r4),
 ('05-dos-capas', 'r5', 'Dos capas',
  'Profundidad y tesis: velas lentas al fondo, velas normales delante y encima la curva de capital de una '
  'cuenta al 1 % — el ruido detrás, la disciplina delante.',
  CSS_R5, hero_r5),
 ('06-medido', 'r6', 'Medido',
  'La regleta del sistema de diseño, viva: mide la portada de verdad y las cuatro cifras son sus marcas.',
  CSS_R6, hero_r6),
]

CSS_SEL = """
#sel{position:sticky;top:0;z-index:100;background:#0B0E13;border-bottom:1px solid #262C36;
  font:400 13px/1 "Inter Tight",system-ui,sans-serif}
#sel .in2{max-width:1180px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:4px;
  overflow-x:auto;scrollbar-width:none}
#sel .in2::-webkit-scrollbar{display:none}
#sel .t2{flex:0 0 auto;padding:14px 14px 13px 0;margin-right:12px;color:#6B7079;font-size:11px;
  letter-spacing:.18em;text-transform:uppercase;white-space:nowrap;border-right:1px solid #262C36}
#sel button{flex:0 0 auto;background:none;border:0;border-bottom:2px solid transparent;cursor:pointer;
  padding:15px 14px;color:#9096A0;font:500 13px/1 "Inter Tight",sans-serif;white-space:nowrap;
  display:flex;gap:9px;align-items:baseline;transition:color .2s;margin-bottom:-1px}
#sel button .rn{font-family:"IBM Plex Mono",monospace;font-size:10px}
#sel button:hover{color:#E7E2D6}
#sel button[aria-selected="true"]{color:#E7E2D6;border-bottom-color:#17CF63}
#sel button[aria-selected="true"] .rn{color:#17CF63}
.pgw[hidden]{display:none!important}
.nota-mejora{background:#0B0E13;border-bottom:1px solid #262C36;padding:14px 0}
.nota-mejora .in{color:#9096A0;font-size:13.5px;line-height:1.6}
.nota-mejora b{color:#17CF63;font-weight:600}
"""

def doc(nombre, cid, css, cuerpo):
    return (f'<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            f'<meta name="robots" content="noindex">\n<meta name="theme-color" content="#101319">\n'
            f'<title>{nombre} · mejora de la restaurada</title>\n'
            f'<link rel="stylesheet" href="{LINK_FUENTES}">\n'
            f'<style>{CSS_BASE}{CSS_COMUN}{css}</style>\n</head>\n<body>\n'
            f'<div class="pgw" id="{cid}">{cuerpo}</div>\n'
            f'<script>{JS}{JS_WIRE}</script>\n</body>\n</html>\n')

def main():
    escritos = []
    for slug, cid, nombre, sub, css, fn in MEJORAS:
        ruta = os.path.join(RAIZ, slug + '.html')
        io.open(ruta, 'w', encoding='utf-8').write(doc(nombre, cid, css, pagina(fn())))
        escritos.append((slug + '.html', os.path.getsize(ruta)))

    todo = CSS_BASE + CSS_COMUN + CSS_SEL + ''.join(c for _, _, _, _, c, _ in MEJORAS)
    bot = ''.join(
        f'<button role="tab" aria-selected="{"true" if i == 0 else "false"}" data-p="{cid}">'
        f'<span class="rn">{i + 1:02d}</span>{nombre}</button>'
        for i, (slug, cid, nombre, sub, css, fn) in enumerate(MEJORAS))
    pan = ''.join(
        f'<div class="pgw" id="{cid}"{"" if i == 0 else " hidden"}>'
        f'<div class="nota-mejora"><div class="in"><b>Mejora {i + 1:02d} · {nombre}.</b> {sub}</div></div>'
        f'{pagina(fn())}</div>'
        for i, (slug, cid, nombre, sub, css, fn) in enumerate(MEJORAS))
    sel = (f'<div id="sel"><div class="in2"><span class="t2">Mejoras de la restaurada</span>'
           f'<div role="tablist" style="display:flex">{bot}</div></div></div>')
    js_sel = """
(function(){
  var bs=[].slice.call(document.querySelectorAll('#sel button'));
  bs.forEach(function(b){b.addEventListener('click',function(){
    bs.forEach(function(o){
      var on=o===b; o.setAttribute('aria-selected',on?'true':'false');
      var p=document.getElementById(o.dataset.p); if(p) p.hidden=!on;
    });
    window.scrollTo({top:0,behavior:'auto'});
    window.dispatchEvent(new Event('resize'));
  });});
})();"""
    cuerpo = sel + pan

    io.open(os.path.join(RAIZ, 'index.html'), 'w', encoding='utf-8').write(
        f'<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        f'<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        f'<meta name="robots" content="noindex">\n<meta name="theme-color" content="#101319">\n'
        f'<title>Seis mejoras de la restaurada</title>\n'
        f'<link rel="stylesheet" href="{LINK_FUENTES}">\n<style>{todo}</style>\n</head>\n<body>\n'
        f'{cuerpo}\n<script>{JS}{JS_WIRE}</script>\n<script>{js_sel}</script>\n</body>\n</html>\n')
    escritos.append(('index.html', os.path.getsize(os.path.join(RAIZ, 'index.html'))))

    io.open(os.path.join(RAIZ, '_artefacto.html'), 'w', encoding='utf-8').write(
        f'<title>Seis mejoras de la restaurada</title>\n<link rel="stylesheet" href="{LINK_FUENTES}">\n'
        f'<style>body{{background:#101319}}{todo}</style>\n{cuerpo}\n'
        f'<script>{JS}{JS_WIRE}</script>\n<script>{js_sel}</script>\n')
    escritos.append(('_artefacto.html', os.path.getsize(os.path.join(RAIZ, '_artefacto.html'))))

    for n, t in escritos:
        print('  %-26s %6.1f KB' % (n, t / 1024))
    print('\n%d mejoras generadas en docs/muestras/portadas-restaurada/' % len(MEJORAS))

if __name__ == '__main__':
    main()
