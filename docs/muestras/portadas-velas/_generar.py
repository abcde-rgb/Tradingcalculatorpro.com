#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Seis portadas con las VELAS EN MOVIMIENTO — la tanda que recupera el estilo viejo.

Contexto
--------
Las dos tandas anteriores se fueron: la primera a la fintech, la segunda a la banca
privada. Ninguna era el estilo de la casa. Lo que el propietario echaba de menos es
concreto y está en el historial: `AnimatedHeroChart.jsx`, el lienzo de velas que
corría detrás del titular y que el commit d9d7377 retiró por «adorno».

Aquí vuelve, portado FIEL al original (mismo paseo aleatorio con tendencia a la
deriva, mismo CW=15, mismo relleno de área, misma vela resaltada bajo el cursor y
misma cruceta discontinua), y las seis portadas son variaciones sobre ese motivo,
no seis mundos distintos.

Los datos salen del generador de la tanda anterior para que no puedan divergir.

Uso:  python3 docs/muestras/portadas-velas/_generar.py
"""
import io, os, importlib.util

RAIZ = os.path.dirname(os.path.abspath(__file__))

# Datos compartidos: se importan, no se copian. Copiarlos es como una portada acaba
# diciendo 14 calculadoras cuando el código tiene 17.
_spec = importlib.util.spec_from_file_location(
    'gen_prestigio', os.path.join(os.path.dirname(RAIZ), 'portadas', '_generar.py'))
_g = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_g)

FACTS, CALCS, PLANS, PLAN_MARK, SPECS, FAQ = _g.FACTS, _g.CALCS, _g.PLANS, _g.PLAN_MARK, _g.SPECS, _g.FAQ

LINK_FUENTES = ('https://fonts.googleapis.com/css2?'
    'family=Archivo:wdth,wght@62..125,300..900'
    '&family=Inter+Tight:wght@300..700'
    '&family=IBM+Plex+Mono:wght@400;500;600&display=swap')

# ── EL SISTEMA DE LA CASA ────────────────────────────────────────────────────
# Tokens de frontend/src/index.css. El verde es decisión tomada y no se toca.
CSS_BASE = """
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#101319;color:#E7E2D6;
  font:400 16px/1.65 "Inter Tight",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{margin:0;line-height:1.1;text-wrap:balance}
p{margin:0} img{max-width:100%} a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid #17CF63;outline-offset:3px}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}

:root{
  --bg:#101319; --bg2:#0B0E13; --card:#171B22; --raised:#1C222B;
  --rule:#262C36; --rule2:#1E242D;
  --fg:#E7E2D6; --dim:#9096A0; --faint:#6B7079;
  --br:#17CF63; --br-ink:#05130A; --br-soft:rgba(23,207,99,.10);
  --long:#22C55E; --short:#EF4444;
  --r1:2px; --r2:10px;
}
.disp{font-family:"Archivo","Inter Tight",sans-serif;font-variation-settings:"wdth" 106;letter-spacing:-.025em;font-weight:700}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
.num{font-family:"IBM Plex Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
/* El degradado sobre «PRO»: el sistema de diseño lo prohíbe en general, pero es
   la firma del hero viejo y el propietario lo pidió de vuelta. Vive aquí y en
   ningún otro sitio de la página. */
.pro{background:linear-gradient(90deg,#17CF63 0%,#4ADE80 45%,#10B981 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent}

.in{max-width:1140px;margin:0 auto;padding-left:32px;padding-right:32px;position:relative}
@media (max-width:640px){.in{padding-left:20px;padding-right:20px}}
.velas{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.velas canvas{width:100%;height:100%;display:block}
.velas .fade-t{position:absolute;left:0;right:0;top:0;height:78%;
  background:linear-gradient(to bottom,var(--bg) 0%,rgba(16,19,25,.9) 42%,rgba(16,19,25,.6) 72%,transparent 100%)}
.velas .fade-b{position:absolute;left:0;right:0;bottom:0;height:52%;
  background:linear-gradient(to top,var(--bg) 0%,rgba(16,19,25,.72) 55%,transparent 100%)}
.velas .fade-r{position:absolute;inset:0;
  background:radial-gradient(115% 78% at 50% 38%,var(--bg) 20%,rgba(16,19,25,.6) 58%,transparent 100%)}

nav.nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 0;
  border-bottom:1px solid var(--rule2);position:relative;z-index:3}
.bd{display:flex;align-items:center;gap:9px;font:600 15px/1 "Archivo",sans-serif;
  font-variation-settings:"wdth" 100;letter-spacing:-.01em}
.bd .m{width:19px;height:19px;border:1.5px solid var(--br);border-radius:var(--r1);position:relative;flex:0 0 auto}
.bd .m::after{content:"";position:absolute;left:2px;right:2px;top:8px;height:1.5px;background:var(--br)}
.nl{display:flex;gap:22px;font-size:13.5px;color:var(--dim)}
@media (max-width:860px){.nl{display:none}}
.nl span{transition:color .18s}
.nl span:hover{color:var(--fg)}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;
  font:600 14px/1 "Inter Tight",sans-serif;padding:13px 20px;border-radius:var(--r1);
  border:1px solid transparent;transition:all .18s cubic-bezier(.2,.7,.3,1)}
.btn.p{background:var(--br);color:var(--br-ink)}
.btn.p:hover{filter:brightness(1.09);transform:translateY(-1px)}
.btn.g{background:transparent;color:var(--fg);border-color:var(--rule)}
.btn.g:hover{border-color:var(--faint)}
.btn.lg{padding:16px 30px;font-size:15.5px}
.btn.sm{padding:9px 15px;font-size:13px}
.btn.w{width:100%}

.pill{display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(23,207,99,.28);
  background:var(--br-soft);border-radius:100px;padding:8px 16px;font-size:13px;color:var(--br)}
.pill i{width:6px;height:6px;border-radius:50%;background:var(--br);flex:0 0 auto;
  animation:lat 2.4s ease-in-out infinite}
@keyframes lat{0%,100%{opacity:1}50%{opacity:.35}}
.trial{font-size:13.5px;color:var(--br);font-weight:500}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:26px}
@media (max-width:640px){.stats{grid-template-columns:1fr 1fr;gap:24px 14px}}
.stats .s{text-align:center}
.stats .v{font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums;
  font-size:clamp(26px,3.6vw,38px);font-weight:600;color:var(--br);line-height:1;letter-spacing:-.02em}
.stats .k{font-size:12.5px;color:var(--faint);margin-top:8px}

section{padding-top:76px;padding-bottom:76px;position:relative}
.sh{font-family:"Archivo",sans-serif;font-variation-settings:"wdth" 104;font-weight:700;
  font-size:clamp(23px,3vw,34px);letter-spacing:-.025em;margin-bottom:12px}
.sl{color:var(--dim);max-width:62ch;margin-bottom:42px;line-height:1.75}
.card{background:var(--card);border:1px solid var(--rule);border-radius:var(--r2)}
.hair{height:1px;background:var(--rule);border:0;margin:0}

.feat{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--rule);
  border:1px solid var(--rule);border-radius:var(--r2);overflow:hidden}
@media (max-width:900px){.feat{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.feat{grid-template-columns:1fr}}
.feat > div{background:var(--card);padding:24px 20px;transition:background .22s}
.feat > div:hover{background:var(--raised)}
.feat .ic{width:22px;height:22px;margin-bottom:14px;color:var(--br)}
.feat h3{font-size:15px;font-weight:600;margin-bottom:7px}
.feat p{font-size:13.5px;color:var(--dim);line-height:1.6}

.cal{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
@media (max-width:900px){.cal{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.cal{grid-template-columns:1fr}}
.cal h4{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--br);
  padding-bottom:10px;border-bottom:1px solid var(--rule);margin-bottom:12px}
.cal ul{list-style:none;margin:0;padding:0}
.cal li{font-size:14px;color:var(--dim);padding:5px 0;transition:color .16s}
.cal li:hover{color:var(--fg)}

table.spec{width:100%;border-collapse:collapse;font-size:13.5px}
table.spec th{text-align:right;font:500 10px/1 "Inter Tight",sans-serif;letter-spacing:.14em;
  text-transform:uppercase;color:var(--faint);padding:0 0 12px;border-bottom:1px solid var(--rule)}
table.spec th:first-child,table.spec td:first-child{text-align:left}
table.spec td{text-align:right;padding:12px 0;border-bottom:1px solid var(--rule2);color:var(--dim);
  font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums}
table.spec tr:hover td{color:var(--fg)}
table.spec td b{color:var(--fg);font-weight:600}
table.spec td .op{font-family:"Inter Tight",sans-serif;opacity:.75}
table.spec td .ac{color:var(--br)}

.planes{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--rule);
  border:1px solid var(--rule);border-radius:var(--r2);overflow:hidden}
@media (max-width:760px){.planes{grid-template-columns:1fr 1fr}}
.pl{background:var(--card);padding:26px 22px;transition:background .22s}
.pl:hover{background:var(--raised)}
.pl.mk{background:var(--raised);box-shadow:inset 2px 0 0 var(--br)}
.pn{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin-bottom:14px}
.pp{font-family:"Archivo",sans-serif;font-variation-settings:"wdth" 104;font-weight:700;
  font-size:36px;font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-.03em}
.pl.mk .pp{color:var(--br)}
.pu{font-size:12.5px;color:var(--faint);margin-top:8px}

.faq details{border-bottom:1px solid var(--rule);padding:18px 0}
.faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:20px;
  align-items:baseline;font-size:16px;font-weight:500}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font-family:"IBM Plex Mono",monospace;color:var(--br);transition:transform .2s}
.faq details[open] summary::after{content:"−"}
.faq .a{padding-top:12px;max-width:66ch;color:var(--dim);font-size:15px;line-height:1.7}

.cierre{position:relative;overflow:hidden;border-top:1px solid var(--rule)}
.cierre .in{padding-top:76px;padding-bottom:76px;text-align:center}
.cierre h2{font-family:"Archivo",sans-serif;font-variation-settings:"wdth" 106;font-weight:700;
  font-size:clamp(26px,4vw,44px);letter-spacing:-.03em;margin-bottom:16px}
.cierre p{color:var(--dim);max-width:52ch;margin:0 auto 28px}

footer.pie{border-top:1px solid var(--rule);padding:34px 0 60px;color:var(--faint);font-size:13px}
footer.pie .in{display:flex;justify-content:space-between;gap:22px;flex-wrap:wrap}
.aviso{background:var(--bg2);border-bottom:1px solid var(--rule);padding:9px 0;text-align:center;
  font-size:11.5px;color:var(--faint);letter-spacing:.03em;position:relative;z-index:4}
.leyenda{position:absolute;right:16px;bottom:12px;z-index:3;font-size:10.5px;color:var(--faint);
  font-family:"IBM Plex Mono",monospace;letter-spacing:.04em;opacity:.75}
"""

# ── PIEZAS COMUNES ───────────────────────────────────────────────────────────
# Iconos monocromos y sin chip de color: ocho chips de ocho colores decoraban sin
# informar, y el sistema de diseño los retiró. Trazo, no relleno.
ICO = {
 'calc': '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h2M13 11h2M9 15h2M13 15h2"/>',
 'sigma': '<path d="M18 4H6l6 8-6 8h12"/>',
 'chart': '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
 'book': '<path d="M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M20 4h-6v13.5"/>',
 'pie': '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l7 4"/>',
 'bell': '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10 21h4"/>',
 'flask': '<path d="M9 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-10V3"/><path d="M8 3h8"/>',
 'cap': '<path d="M2 8l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
}
def ico(k):
    return (f'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICO[k]}</svg>')

FEATURES = [
 ('calc',  'Calculadoras profesionales', f'{FACTS["calcs"]} herramientas de riesgo, precio, técnico y simulación, cada una sobre las specs reales del contrato.'),
 ('sigma', 'Suite de opciones', f'{FACTS["strategies"]} estrategias con su diagrama de resultado y las griegas completas, vanna y charm incluidas.'),
 ('chart', 'Gráficos TradingView', 'Los gráficos que ya usas, integrados, con la temporalidad y las herramientas de dibujo.'),
 ('book',  'Diario de operativa', 'Cada operación con su R, su racha y la curva de capital ordenada por fecha de salida.'),
 ('pie',   'Riesgo de cartera', 'Exposición por activo y correlación, para que dos posiciones no sean en realidad la misma.'),
 ('bell',  'Avisos por correo', 'Al tocar un nivel o al cerrarse una racha. Sin notificaciones de relleno.'),
 ('flask', 'Simulador Monte Carlo', 'Miles de secuencias del mismo sistema para ver la distribución, no un único resultado afortunado.'),
 ('cap',   'Academia', f'Desde qué es un stop hasta {FACTS["chart_patterns"]} patrones chartistas, en {FACTS["langs"]} idiomas.'),
]

def sec_features(titulo='Todo lo que necesita una sesión', sub=None):
    sub = sub or ('Ocho módulos. Ninguno pide más datos de los que necesita, y ninguno inventa '
                  'un número que no pueda defender.')
    cel = ''.join(f'<div>{ico(k)}<h3>{t}</h3><p>{d}</p></div>' for k, t, d in FEATURES)
    return f'<section class="in"><h2 class="sh">{titulo}</h2><p class="sl">{sub}</p><div class="feat">{cel}</div></section>'

def sec_calcs(titulo=None):
    titulo = titulo or f'Las {FACTS["calcs"]} calculadoras'
    cols = ''.join(
        '<div><h4>' + g + '</h4><ul>' + ''.join(f'<li>{n}</li>' for n in items) + '</ul></div>'
        for g, items in CALCS)
    return (f'<section class="in"><h2 class="sh">{titulo}</h2>'
            f'<p class="sl">Repartidas en cuatro familias. Se abren desde el mismo panel y comparten '
            f'el catálogo de instrumentos, así que el tamaño de contrato nunca hay que teclearlo.</p>'
            f'<div class="cal">{cols}</div></section>')

def sec_specs(titulo='El catálogo por dentro'):
    filas = ''.join(
        f'<tr><td><b>{s}</b> <span class="op">{n}</span></td><td>{cs}</td><td>{tk}</td>'
        f'<td class="ac">{tv} $</td><td>{mg} $</td></tr>' for s, n, cs, tk, tv, mg in SPECS)
    return (f'<section class="in"><h2 class="sh">{titulo}</h2>'
            f'<p class="sl">{FACTS["assets"]} activos con su tamaño de contrato, su tick y su margen inicial. '
            f'Seis, de muestra — es la parte que ninguna calculadora genérica tiene.</p>'
            f'<table class="spec"><thead><tr><th>Contrato</th><th>Tamaño</th><th>Tick</th>'
            f'<th>Valor del tick</th><th>Margen inicial</th></tr></thead><tbody>{filas}</tbody></table></section>')

def sec_planes(titulo='Precios'):
    ps = ''.join(
        f'<div class="pl{" mk" if i == PLAN_MARK else ""}"><div class="pn">{nm}</div>'
        f'<div class="pp">{p} €</div><div class="pu">{u}</div></div>'
        for i, (r, nm, p, u) in enumerate(PLANS))
    return (f'<section class="in"><h2 class="sh">{titulo}</h2>'
            f'<p class="sl">Siete días de prueba con todo abierto. Sin permanencia: se cancela desde '
            f'Ajustes en dos clics, y el vitalicio es un pago único que no vuelve a cobrarse.</p>'
            f'<div class="planes">{ps}</div></section>')

def sec_faq(titulo='Preguntas frecuentes'):
    it = ''.join(f'<details><summary>{q}</summary><div class="a">{a}</div></details>' for q, a in FAQ)
    return f'<section class="in"><h2 class="sh">{titulo}</h2><div class="faq">{it}</div></section>'

def sec_cierre(cid, titulo='Calcula antes de operar, no después.'):
    return f"""
<section class="cierre">
  <div class="velas" id="{cid}"><canvas></canvas><div class="fade-r"></div></div>
  <div class="in">
    <h2 class="disp">{titulo}</h2>
    <p>Siete días de prueba con todo abierto. Sin permanencia y sin llamada de retención.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <button class="btn p lg">Empezar gratis</button>
      <button class="btn g lg">Ver los planes</button>
    </div>
  </div>
</section>"""

def pie():
    return (f'<footer class="pie"><div class="in"><span>TradingCalculator.Pro · {FACTS["langs"]} idiomas</span>'
            f'<span>Sin custodia de fondos · sin ejecución de órdenes · desde 17 € al mes</span></div></footer>')

NAVL = ['Calculadoras', 'Opciones', 'Diario', 'Academia', 'Precios']
def nav(links=None, boton='Probar 7 días'):
    ls = ''.join(f'<span>{l}</span>' for l in (links or NAVL))
    return (f'<nav class="nav"><a class="bd" href="#"><span class="m"></span>'
            f'TradingCalculator<span style="color:var(--br)">.Pro</span></a>'
            f'<div class="nl">{ls}</div><button class="btn p sm">{boton}</button></nav>')

def stats():
    d = [(FACTS['calcs'], 'calculadoras'), (FACTS['assets'], 'activos'),
         (FACTS['strategies'], 'estrategias'), (FACTS['langs'], 'idiomas')]
    return ('<div class="stats">' + ''.join(
        f'<div class="s"><div class="v">{v}</div><div class="k">{k}</div></div>' for v, k in d) + '</div>')

AVISO = ('<div class="aviso">Maqueta de trabajo. No sustituye a la portada en producción; las cifras '
         'salen del código del proyecto y las velas son ilustrativas.</div>')
LEYENDA = '<div class="leyenda">velas ilustrativas · no son cotizaciones</div>'

# ═════════════════════════════════════════════════════════════════════════════
# LOS SEIS HEROES · variaciones sobre el mismo motivo
# ═════════════════════════════════════════════════════════════════════════════

# ── V1 · LA ORIGINAL, RESTAURADA ─────────────────────────────────────────────
CSS_V1 = """
#v1 .hero{position:relative;padding:86px 0 64px;text-align:center;overflow:hidden}
@media (max-width:640px){#v1 .hero{padding:52px 0 44px}}
#v1 .hero .in{z-index:2}
#v1 h1{font-size:clamp(40px,8vw,88px);line-height:.98;margin:24px 0 22px}
#v1 h1 span{display:block}
#v1 .cl{color:var(--dim);font-size:clamp(16px,1.9vw,19px);max-width:56ch;margin:0 auto 32px;line-height:1.7}
#v1 .ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:14px}
#v1 .stats{margin-top:52px;max-width:680px;margin-left:auto;margin-right:auto}
"""
def hero_v1():
    return f"""
<div class="hero">
  <div class="velas" id="v1c"><canvas></canvas><div class="fade-t"></div></div>
  {LEYENDA}
  <div class="in">
    <span class="pill"><i></i>Herramienta hecha por y para traders</span>
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

# ── V2 · VELAS A PANTALLA COMPLETA ───────────────────────────────────────────
CSS_V2 = """
#v2 .hero{position:relative;padding:120px 0 92px;text-align:center;overflow:hidden}
@media (max-width:640px){#v2 .hero{padding:64px 0 54px}}
#v2 .hero .in{z-index:2}
#v2 h1{font-size:clamp(38px,7.4vw,84px);line-height:1;margin-bottom:26px;max-width:15ch;margin-left:auto;margin-right:auto}
#v2 h1 em{font-style:normal;color:var(--br)}
#v2 .cl{color:var(--dim);font-size:17.5px;max-width:50ch;margin:0 auto 34px;line-height:1.75}
#v2 .uno{display:flex;flex-direction:column;align-items:center;gap:14px}
#v2 .bajo{border-top:1px solid var(--rule);margin-top:66px;padding-top:34px}
"""
def hero_v2():
    return f"""
<div class="hero">
  <div class="velas" id="v2c"><canvas></canvas><div class="fade-r"></div></div>
  {LEYENDA}
  <div class="in">
    <h1 class="disp">Sabes cuánto arriesgas <em>antes</em> de pulsar comprar.</h1>
    <p class="cl">Tecleas capital, entrada y stop. Sale el tamaño exacto de la posición y lo que pierdes
      si salta — con el tick real de cada contrato, no con una regla de tres.</p>
    <div class="uno">
      <button class="btn p lg">Empezar gratis · 7 días</button>
      <span style="font-size:13px;color:var(--faint)">Sin permanencia · desde 17 € al mes</span>
    </div>
    <div class="bajo">{stats()}</div>
  </div>
</div>"""

# ── V3 · VELAS + INSTRUMENTO ─────────────────────────────────────────────────
CSS_V3 = """
#v3 .hero{position:relative;padding:70px 0 60px;overflow:hidden}
#v3 .hero .in{z-index:2}
#v3 .grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
@media (max-width:920px){#v3 .grid{grid-template-columns:1fr;gap:32px}}
#v3 h1{font-size:clamp(32px,4.6vw,54px);line-height:1.04;margin:20px 0 20px}
#v3 h1 em{font-style:normal;color:var(--br)}
#v3 .cl{color:var(--dim);max-width:44ch;margin-bottom:28px;line-height:1.75}
#v3 .ctas{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
#v3 .instr{padding:24px;backdrop-filter:none;background:rgba(23,27,34,.94)}
#v3 .ih{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px}
#v3 .lbl{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
#v3 .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
#v3 .f{display:grid;gap:6px}
#v3 .f label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
#v3 .f .b{display:flex;align-items:center;background:var(--bg2);border:1px solid var(--rule);border-radius:var(--r1)}
#v3 .f .b:focus-within{border-color:var(--br)}
#v3 .f input{width:100%;min-width:0;background:none;border:0;color:var(--fg);padding:10px 11px;
  font:500 15px/1 "IBM Plex Mono",monospace;font-variant-numeric:tabular-nums}
#v3 .f input:focus{outline:none}
#v3 .f .u{padding:0 10px;font:400 11px/1 "IBM Plex Mono",monospace;color:var(--faint)}
#v3 .out{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px;padding-top:16px;border-top:1px solid var(--rule)}
#v3 .kpi{font:600 clamp(24px,3.2vw,34px)/1 "IBM Plex Mono",monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
#v3 .nota{font-size:11px;color:var(--faint);margin-top:14px;line-height:1.5}
#v3 .stats{margin-top:52px}
"""
def hero_v3():
    return f"""
<div class="hero">
  <div class="velas" id="v3c"><canvas></canvas><div class="fade-r"></div></div>
  {LEYENDA}
  <div class="in">
    <div class="grid">
      <div>
        <span class="pill"><i></i>Micro E-mini S&amp;P 500 · tick 0,25 = 1,25 $</span>
        <h1 class="disp">El gráfico de fondo. <em>El número</em>, delante.</h1>
        <p class="cl">Mueve la entrada y el stop y míralo en las dos partes a la vez: el tamaño de la
          posición aquí, y los niveles dibujados sobre las velas.</p>
        <div class="ctas">
          <button class="btn p lg">Empezar gratis</button>
          <button class="btn g lg">Ver los planes</button>
        </div>
        <p class="trial">7 días gratis · Sin permanencia</p>
      </div>
      <div class="card instr">
        <div class="ih"><span class="lbl">Tamaño de posición</span>
          <span class="mono" style="font-size:11px;color:var(--br)">MES</span></div>
        <div class="g2">
          <div class="f"><label for="v3cap">Capital</label><div class="b"><input id="v3cap" type="number" value="25000" step="500"><span class="u">$</span></div></div>
          <div class="f"><label for="v3rsk">Riesgo</label><div class="b"><input id="v3rsk" type="number" value="1" step="0.25"><span class="u">%</span></div></div>
          <div class="f"><label for="v3ent">Entrada</label><div class="b"><input id="v3ent" type="number" value="5842.50" step="0.25"><span class="u">pts</span></div></div>
          <div class="f"><label for="v3stp">Stop</label><div class="b"><input id="v3stp" type="number" value="5830.00" step="0.25"><span class="u">pts</span></div></div>
        </div>
        <div class="out">
          <div><div class="lbl">Contratos</div><div class="kpi" id="v3qty" style="color:var(--br)">—</div></div>
          <div><div class="lbl">Si salta el stop</div><div class="kpi" id="v3loss" style="color:var(--short)">—</div></div>
        </div>
        <p class="nota">Los niveles de entrada, stop y objetivo 2R se dibujan sobre las velas conservando
          la distancia relativa. Las velas son ilustrativas; la aritmética, no.</p>
      </div>
    </div>
    {stats()}
  </div>
</div>"""

# ── V4 · BANDA DE VELAS ──────────────────────────────────────────────────────
CSS_V4 = """
#v4 .hero{padding:76px 0 44px;text-align:center}
#v4 h1{font-size:clamp(34px,6vw,68px);line-height:1.02;margin:22px 0 20px}
#v4 h1 em{font-style:normal;color:var(--br)}
#v4 .cl{color:var(--dim);max-width:54ch;margin:0 auto 30px;font-size:17px;line-height:1.72}
#v4 .ctas{display:flex;gap:13px;justify-content:center;flex-wrap:wrap;margin-bottom:12px}
#v4 .banda{position:relative;height:230px;overflow:hidden;border-top:1px solid var(--rule);
  border-bottom:1px solid var(--rule);margin-top:52px}
@media (max-width:640px){#v4 .banda{height:170px}}
#v4 .banda .velas{position:absolute;inset:0}
#v4 .bstats{position:relative;z-index:2;height:100%;display:flex;align-items:center}
#v4 .bstats .in{width:100%}
#v4 .sep{position:relative;height:120px;overflow:hidden;border-top:1px solid var(--rule);
  border-bottom:1px solid var(--rule)}
#v4 .sep .velas{position:absolute;inset:0}
"""
def hero_v4():
    return f"""
<div class="hero in">
  <span class="pill"><i></i>{FACTS['calcs']} calculadoras · {FACTS['assets']} activos · {FACTS['langs']} idiomas</span>
  <h1 class="disp">La cuenta manda.<br><em>Nosotros sólo hacemos la cuenta.</em></h1>
  <p class="cl">Dimensiona la posición con el tamaño de contrato y el tick reales del activo que operas,
    lleva el diario y mide lo que de verdad pasó — no lo que recuerdas que pasó.</p>
  <div class="ctas">
    <button class="btn p lg">Empezar gratis</button>
    <button class="btn g lg">Ver los planes</button>
  </div>
  <p class="trial">7 días gratis · Cancela cuando quieras · Sin permanencia</p>
</div>
<div class="banda">
  <div class="velas" id="v4c"><canvas></canvas><div class="fade-t"></div><div class="fade-b"></div></div>
  {LEYENDA}
  <div class="bstats"><div class="in">{stats()}</div></div>
</div>"""

# ── V5 · CINTA Y VELAS ───────────────────────────────────────────────────────
CSS_V5 = """
#v5 .cinta{overflow:hidden;border-bottom:1px solid var(--rule);background:var(--bg2);position:relative;z-index:3}
#v5 .ct{display:flex;width:max-content;animation:v5s 54s linear infinite}
@media (prefers-reduced-motion:reduce){#v5 .ct{animation:none}}
@keyframes v5s{from{transform:translateX(0)}to{transform:translateX(-50%)}}
#v5 .ci{display:flex;align-items:baseline;gap:8px;padding:9px 18px;border-right:1px solid var(--rule2);
  font-family:"IBM Plex Mono",monospace;font-size:11.5px;font-variant-numeric:tabular-nums;
  white-space:nowrap;color:var(--faint)}
#v5 .ci b{color:var(--fg);font-weight:600}
#v5 .ci em{color:var(--br);font-style:normal}
#v5 .hero{position:relative;padding:72px 0 56px;overflow:hidden}
#v5 .hero .in{z-index:2}
#v5 .grid{display:grid;grid-template-columns:1.15fr .85fr;gap:44px;align-items:center}
@media (max-width:920px){#v5 .grid{grid-template-columns:1fr;gap:30px}}
#v5 h1{font-size:clamp(32px,5vw,58px);line-height:1.03;margin:20px 0 20px}
#v5 h1 em{font-style:normal;color:var(--br)}
#v5 .cl{color:var(--dim);max-width:48ch;margin-bottom:28px;line-height:1.75}
#v5 .ctas{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
#v5 .mini{padding:20px}
#v5 .mini h4{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:14px}
#v5 .mini table{width:100%;border-collapse:collapse;font-family:"IBM Plex Mono",monospace;
  font-size:12px;font-variant-numeric:tabular-nums}
#v5 .mini td{padding:8px 0;border-bottom:1px solid var(--rule2);color:var(--dim);text-align:right}
#v5 .mini td:first-child{text-align:left}
#v5 .mini td b{color:var(--fg);font-weight:600}
#v5 .mini td .ac{color:var(--br)}
#v5 .mini tr:last-child td{border-bottom:0}
#v5 .stats{margin-top:48px}
"""
def hero_v5():
    filas = ''.join(
        f'<tr><td><b>{s}</b></td><td>{tk}</td><td class="ac">{tv} $</td></tr>'
        for s, n, cs, tk, tv, mg in SPECS[:5])
    return f"""
<div class="cinta"><div class="ct" id="v5cinta"></div></div>
<div class="hero">
  <div class="velas" id="v5c"><canvas></canvas><div class="fade-t"></div></div>
  {LEYENDA}
  <div class="in">
    <div class="grid">
      <div>
        <span class="pill"><i></i>Mercado abierto · {FACTS['assets']} activos cargados</span>
        <h1 class="disp">Cada contrato tiene su tick.<br><em>La calculadora también.</em></h1>
        <p class="cl">Eliges el símbolo y el tamaño de posición sale con la aritmética de ese contrato:
          tamaño, tick y margen inicial, no una aproximación sobre el precio.</p>
        <div class="ctas">
          <button class="btn p lg">Empezar gratis</button>
          <button class="btn g lg">Ver los planes</button>
        </div>
        <p class="trial">7 días gratis · Sin permanencia</p>
      </div>
      <div class="card mini">
        <h4>Valor del tick · muestra del catálogo</h4>
        <table><tbody>{filas}</tbody></table>
      </div>
    </div>
    {stats()}
  </div>
</div>"""

# ── V6 · PANEL VIVO (split) ──────────────────────────────────────────────────
CSS_V6 = """
#v6 .hero{position:relative;display:grid;grid-template-columns:1.02fr .98fr;min-height:0;
  border-bottom:1px solid var(--rule)}
@media (max-width:920px){#v6 .hero{grid-template-columns:1fr}}
#v6 .hl{padding:82px 44px 82px 0}
@media (max-width:920px){#v6 .hl{padding:52px 0 40px}}
#v6 h1{font-size:clamp(32px,4.8vw,56px);line-height:1.03;margin:22px 0 22px}
#v6 h1 em{font-style:normal;color:var(--br)}
#v6 .cl{color:var(--dim);max-width:42ch;margin-bottom:30px;line-height:1.75}
#v6 .ctas{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
#v6 .panel{position:relative;overflow:hidden;border-left:1px solid var(--rule);min-height:440px}
@media (max-width:920px){#v6 .panel{border-left:0;border-top:1px solid var(--rule);min-height:300px}}
#v6 .panel .velas{position:absolute;inset:0}
#v6 .pinfo{position:absolute;left:20px;top:18px;z-index:2;font-family:"IBM Plex Mono",monospace;
  font-size:11px;color:var(--faint);letter-spacing:.05em;line-height:1.9}
#v6 .pinfo b{color:var(--fg);font-weight:500}
#v6 .zocalo{padding:34px 0;border-bottom:1px solid var(--rule)}
"""
def hero_v6():
    return f"""
<div class="hero">
  <div class="in" style="padding-right:0"><div class="hl">
    <span class="pill"><i></i>Herramienta hecha por y para traders</span>
    <h1 class="disp">El instrumento a la izquierda.<br><em>El mercado, a la derecha.</em></h1>
    <p class="cl">{FACTS['calcs']} calculadoras sobre {FACTS['assets']} activos con las specs reales de cada
      contrato, diario de operativa y {FACTS['strategies']} estrategias de opciones con las griegas completas.</p>
    <div class="ctas">
      <button class="btn p lg">Empezar gratis</button>
      <button class="btn g lg">Ver los planes</button>
    </div>
    <p class="trial">7 días gratis · Cancela cuando quieras</p>
  </div></div>
  <div class="panel">
    <div class="velas" id="v6c"><canvas></canvas></div>
    <div class="pinfo">MES · MICRO E-MINI S&amp;P 500<br><b>tick 0,25 = 1,25 $</b><br>contrato 5</div>
    {LEYENDA}
  </div>
</div>
<div class="in"><div class="zocalo">{stats()}</div></div>"""

# ── EL MOTOR DE VELAS · port fiel de AnimatedHeroChart.jsx ───────────────────
JS = r"""
(function(){
'use strict';
var $=function(s){return document.querySelector(s)}, $$=function(s){return [].slice.call(document.querySelectorAll(s))};
var nf=function(n,d){d=(d===undefined?2:d);return new Intl.NumberFormat('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)};
var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Port fiel de frontend/src/components/landing/AnimatedHeroChart.jsx (retirado en
   d9d7377). Se conservan las constantes del original: ancho de hueco 15 px, verde
   #22c55e / rojo #ef4444, paseo aleatorio con tendencia a la deriva y reversión a
   la media entre 70 y 130, relleno de área bajo los cierres, vela bajo el cursor
   al 95 % de opacidad frente al 42 % del resto, y cruceta discontinua. El ratón se
   escucha en `window` y el borde izquierdo del lienzo se cachea en el resize: pedir
   getBoundingClientRect en cada fotograma fuerza un reflow. */
var VERDE=[34,197,94], ROJO=[239,68,68], CW=15, MIN_PX=8;
var rgba=function(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'};
var raton={x:-1,y:-1,dentro:false};
window.addEventListener('mousemove',function(e){raton.x=e.clientX;raton.y=e.clientY;raton.dentro=true;});
document.documentElement.addEventListener('mouseleave',function(){raton.dentro=false;});

function montarVelas(host,opts){
  opts=opts||{};
  var canvas=host.querySelector('canvas'); if(!canvas) return null;
  var ctx=canvas.getContext('2d');
  var alpha=(opts.dim===undefined?1:opts.dim), vel=(opts.vel===undefined?0.9:opts.vel);
  var velas=[], ancho=0, alto=0, dpr=1, izq=0, scroll=0, raf=0, precio=100, tend=0;
  var api={niveles:null};

  function siguiente(){
    tend+=(Math.random()-0.5)*0.4; tend=Math.max(-1.2,Math.min(1.2,tend));
    var o=precio, mv=tend+(Math.random()-0.5)*3.2, c=o+mv;
    var h=Math.max(o,c)+Math.random()*1.8, l=Math.min(o,c)-Math.random()*1.8;
    precio=c;
    if(precio>130) tend-=0.5;
    if(precio<70)  tend+=0.5;
    return {o:o,h:h,l:l,c:c};
  }
  function medir(){
    var r=canvas.getBoundingClientRect();
    if(!r.width||!r.height) return false;
    dpr=Math.min(window.devicePixelRatio||1,2);
    ancho=r.width; alto=r.height; izq=r.left;
    canvas.width=Math.floor(ancho*dpr); canvas.height=Math.floor(alto*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    var hacen=Math.ceil(ancho/CW)+3;
    while(velas.length<hacen) velas.push(siguiente());
    if(velas.length>hacen+4) velas=velas.slice(-hacen);
    return true;
  }
  function pintar(){
    if(!ancho||!velas.length) return;
    ctx.clearRect(0,0,ancho,alto);
    var min=Infinity,max=-Infinity,i,k;
    for(i=0;i<velas.length;i++){k=velas[i]; if(k.l<min)min=k.l; if(k.h>max)max=k.h;}
    var pad=(max-min)*0.12||1; min-=pad; max+=pad;
    var padY=alto*0.14;
    var esc=Math.max((alto-padY*2)/(max-min), MIN_PX);
    var mid=(min+max)/2;
    var y=function(p){return alto/2-(p-mid)*esc;};
    var baseX=-scroll;

    ctx.beginPath(); ctx.moveTo(baseX,alto);
    for(i=0;i<velas.length;i++) ctx.lineTo(baseX+i*CW+CW/2, y(velas[i].c));
    ctx.lineTo(baseX+(velas.length-1)*CW+CW/2, alto); ctx.closePath();
    var g=ctx.createLinearGradient(0,0,0,alto);
    g.addColorStop(0,rgba(VERDE,0.10*alpha)); g.addColorStop(1,rgba(VERDE,0));
    ctx.fillStyle=g; ctx.fill();

    var mx=raton.dentro?raton.x-izq:-1, hot=-1;
    if(mx>=0&&mx<=ancho) hot=Math.round((mx-baseX-CW/2)/CW);

    for(i=0;i<velas.length;i++){
      k=velas[i];
      var cx=baseX+i*CW+CW/2;
      if(cx<-CW||cx>ancho+CW) continue;
      var col=(k.c>=k.o)?VERDE:ROJO, a=((i===hot)?0.95:0.42)*alpha;
      ctx.strokeStyle=rgba(col,a); ctx.fillStyle=rgba(col,a); ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(cx,y(k.h)); ctx.lineTo(cx,y(k.l)); ctx.stroke();
      var top=y(Math.max(k.o,k.c)), bh=Math.max(Math.abs(y(k.o)-y(k.c)),1.5);
      ctx.fillRect(cx-CW*0.32, top, CW*0.64, bh);
    }

    /* niveles del trade: se dibujan conservando la distancia RELATIVA que el
       visitante ha tecleado, porque el paseo aleatorio no tiene precios reales
       con los que compararse. La banda de aviso lo dice en la propia página. */
    if(api.niveles){
      var ns=api.niveles();
      for(i=0;i<ns.length;i++){
        var n=ns[i], py=y(mid+n.rel*mid);
        if(!isFinite(py)||py<0||py>alto) continue;
        ctx.save(); ctx.setLineDash([4,5]); ctx.lineWidth=1;
        ctx.strokeStyle=n.color; ctx.globalAlpha=0.92*alpha;
        ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(ancho,py); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha=alpha;
        ctx.font='500 10px "IBM Plex Mono", monospace'; ctx.fillStyle=n.color; ctx.textAlign='right';
        ctx.fillText(n.k, ancho*(opts.etiqX||1)-12, py-6);
        ctx.restore();
      }
    }

    if(hot>=0&&hot<velas.length){
      k=velas[hot];
      var hx=baseX+hot*CW+CW/2;
      ctx.strokeStyle=rgba([148,163,184],0.5*alpha); ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(hx,0); ctx.lineTo(hx,alto); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=rgba((k.c>=k.o)?VERDE:ROJO, 0.95*alpha);
      ctx.beginPath(); ctx.arc(hx,y(k.c),3,0,Math.PI*2); ctx.fill();
    }
  }
  var ultimo=performance.now();
  function bucle(ahora){
    var dt=Math.min(ahora-ultimo,60); ultimo=ahora;
    scroll+=(dt/1000)*CW*vel;
    while(scroll>=CW){ scroll-=CW; velas.push(siguiente()); velas.shift(); }
    pintar(); raf=requestAnimationFrame(bucle);
  }
  if(medir()) pintar();
  if(window.ResizeObserver) new ResizeObserver(function(){ if(medir()) pintar(); }).observe(canvas);
  window.addEventListener('scroll',function(){ var r=canvas.getBoundingClientRect(); izq=r.left; },{passive:true});
  if(!reducido) raf=requestAnimationFrame(bucle);
  api.repintar=pintar;
  return api;
}

/* cada portada monta las suyas; las que no existan se saltan */
var LIENZOS={v1c:{dim:1},v2c:{dim:.85},v3c:{dim:.7,etiqX:.52},v4c:{dim:1,vel:1.1},v5c:{dim:.75},v6c:{dim:1,vel:.75}};
var montados={};
Object.keys(LIENZOS).forEach(function(id){
  var el=document.getElementById(id);
  if(el) montados[id]=montarVelas(el,LIENZOS[id]);
});
$$('.cierre .velas').forEach(function(el){ montarVelas(el,{dim:.6,vel:.7}); });

/* V3 · la calculadora que además dibuja sobre las velas */
var MES_PT=5;
function v3(){
  if(!document.getElementById('v3qty')) return;
  var cap=parseFloat($('#v3cap').value)||0, r=parseFloat($('#v3rsk').value)||0;
  var ent=parseFloat($('#v3ent').value), stp=parseFloat($('#v3stp').value);
  var risk=cap*r/100, d=(isFinite(ent)&&isFinite(stp))?Math.abs(ent-stp):NaN;
  if(!isFinite(d)||d===0||risk<=0||!isFinite(ent)||ent<=0){
    $('#v3qty').textContent='—'; $('#v3loss').textContent='—';
    if(montados.v3c) montados.v3c.niveles=null;
    return;
  }
  var per=d*MES_PT, q=Math.floor(risk/per);
  $('#v3qty').textContent=String(q);
  $('#v3loss').textContent = q?('−'+nf(q*per,2)+' $'):'0,00 $';
  var sg=(stp<ent)?1:-1, rel=d/ent;
  if(montados.v3c) montados.v3c.niveles=function(){
    return [{rel:0,k:'ENTRADA',color:'#9096A0'},
            {rel:-sg*rel,k:'STOP',color:'#EF4444'},
            {rel:sg*2*rel,k:'OBJETIVO 2R',color:'#22C55E'}];
  };
}
['#v3cap','#v3rsk','#v3ent','#v3stp'].forEach(function(s){var e=$(s); if(e) e.addEventListener('input',v3);});
v3();

/* V5 · la cinta de specs (datos del catálogo, nunca precios inventados) */
(function(){
  var t=$('#v5cinta'); if(!t) return;
  var d=[['MES','0,25','1,25','5'],['MNQ','0,25','0,50','2'],['ES','0,25','12,50','50'],
         ['NQ','0,25','5,00','20'],['GC','0,10','10,00','100'],['CL','0,01','10,00','1000'],
         ['EURUSD','0,0001','10,00','100000']];
  var uno=d.map(function(k){
    return '<div class="ci"><b>'+k[0]+'</b><span>tick</span>'+k[1]+'<span>=</span><em>'+k[2]+' $</em><span>· contrato '+k[3]+'</span></div>';
  }).join('');
  t.innerHTML=uno+uno;
})();
})();
"""

# ── MONTAJE DE CADA PÁGINA ───────────────────────────────────────────────────
def pagina_v1():
    return (AVISO + '<div class="in">' + nav() + '</div>' + hero_v1() + sec_features() + sec_calcs()
            + sec_specs() + sec_planes() + sec_faq() + sec_cierre('v1cz') + pie())

def pagina_v2():
    return (AVISO + '<div class="in">' + nav() + '</div>' + hero_v2() + sec_calcs()
            + sec_features('Y lo que viene después de calcular',
                           'El tamaño es el principio. Lo que separa una racha de un sistema es lo que se '
                           'mide luego.') + sec_specs() + sec_planes() + sec_faq()
            + sec_cierre('v2cz', 'Empieza por el número. El resto viene solo.') + pie())

def pagina_v3():
    return (AVISO + '<div class="in">' + nav() + '</div>' + hero_v3()
            + sec_specs('El catálogo que hay detrás del número') + sec_features() + sec_calcs()
            + sec_planes() + sec_faq() + sec_cierre('v3cz') + pie())

def pagina_v4():
    return (AVISO + '<div class="in">' + nav() + '</div>' + hero_v4() + sec_features()
            + '<div class="sep"><div class="velas" id="v4s"><canvas></canvas><div class="fade-t"></div>'
              '<div class="fade-b"></div></div></div>'
            + sec_calcs() + sec_specs() + sec_planes() + sec_faq()
            + sec_cierre('v4cz', 'La cuenta manda. Haz la cuenta.') + pie())

def pagina_v5():
    return (AVISO + '<div class="in">' + nav() + '</div>' + hero_v5() + sec_specs()
            + sec_calcs() + sec_features() + sec_planes() + sec_faq() + sec_cierre('v5cz') + pie())

def pagina_v6():
    return (AVISO + '<div class="in">' + nav() + '</div>' + hero_v6() + sec_features()
            + sec_calcs() + sec_specs() + sec_planes() + sec_faq() + sec_cierre('v6cz') + pie())

PORTADAS = [
    ('01-original-restaurada', 'v1', 'La original, restaurada',
     'El hero viejo tal cual: titular gigante, «PRO» en degradado y las velas detrás', CSS_V1, pagina_v1),
    ('02-velas-pantalla',      'v2', 'Velas a pantalla completa',
     'Las velas de borde a borde con velo radial; una sola llamada a la acción', CSS_V2, pagina_v2),
    ('03-velas-instrumento',   'v3', 'Velas e instrumento',
     'La calculadora sobre las velas, y los niveles dibujándose en el gráfico', CSS_V3, pagina_v3),
    ('04-banda-velas',         'v4', 'Banda de velas',
     'Titular sobre fondo limpio y las velas en banda de borde a borde, como una cinta', CSS_V4, pagina_v4),
    ('05-cinta-y-velas',       'v5', 'Cinta y velas',
     'Cinta de specs arriba, velas detrás y el catálogo asomando en el hero', CSS_V5, pagina_v5),
    ('06-panel-vivo',          'v6', 'Panel vivo',
     'Partida en dos: el instrumento a la izquierda, el gráfico vivo a la derecha', CSS_V6, pagina_v6),
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
"""

def doc(nombre, cid, css, cuerpo):
    return (f'<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            f'<meta name="robots" content="noindex">\n'
            f'<meta name="theme-color" content="#101319">\n'
            f'<title>{nombre} · TradingCalculator.Pro</title>\n'
            f'<link rel="stylesheet" href="{LINK_FUENTES}">\n'
            f'<style>{CSS_BASE}{css}</style>\n</head>\n<body>\n'
            f'<div class="pgw" id="{cid}">{cuerpo}</div>\n'
            f'<script>{JS}</script>\n</body>\n</html>\n')

def main():
    escritos = []
    for slug, cid, nombre, sub, css, fn in PORTADAS:
        ruta = os.path.join(RAIZ, slug + '.html')
        io.open(ruta, 'w', encoding='utf-8').write(doc(nombre, cid, css, fn()))
        escritos.append((slug + '.html', os.path.getsize(ruta)))

    todo_css = CSS_BASE + CSS_SEL + ''.join(css for _, _, _, _, css, _ in PORTADAS)
    botones = ''.join(
        f'<button role="tab" aria-selected="{"true" if i == 0 else "false"}" data-p="{cid}">'
        f'<span class="rn">{i + 1:02d}</span>{nombre}</button>'
        for i, (slug, cid, nombre, sub, css, fn) in enumerate(PORTADAS))
    paneles = ''.join(
        f'<div class="pgw" id="{cid}"{"" if i == 0 else " hidden"}>{fn()}</div>'
        for i, (slug, cid, nombre, sub, css, fn) in enumerate(PORTADAS))
    sel = (f'<div id="sel"><div class="in2"><span class="t2">Seis con velas</span>'
           f'<div role="tablist" style="display:flex">{botones}</div></div></div>')
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
    cuerpo = sel + paneles

    idx = (f'<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
           f'<meta name="viewport" content="width=device-width,initial-scale=1">\n'
           f'<meta name="robots" content="noindex">\n<meta name="theme-color" content="#101319">\n'
           f'<title>Seis portadas con velas · TradingCalculator.Pro</title>\n'
           f'<link rel="stylesheet" href="{LINK_FUENTES}">\n<style>{todo_css}</style>\n</head>\n<body>\n'
           f'{cuerpo}\n<script>{JS}</script>\n<script>{js_sel}</script>\n</body>\n</html>\n')
    io.open(os.path.join(RAIZ, 'index.html'), 'w', encoding='utf-8').write(idx)
    escritos.append(('index.html', os.path.getsize(os.path.join(RAIZ, 'index.html'))))

    art = (f'<title>Seis portadas con velas</title>\n<link rel="stylesheet" href="{LINK_FUENTES}">\n'
           f'<style>body{{background:#101319}}{todo_css}</style>\n{cuerpo}\n'
           f'<script>{JS}</script>\n<script>{js_sel}</script>\n')
    io.open(os.path.join(RAIZ, '_artefacto.html'), 'w', encoding='utf-8').write(art)
    escritos.append(('_artefacto.html', os.path.getsize(os.path.join(RAIZ, '_artefacto.html'))))

    for n, t in escritos:
        print('  %-28s %6.1f KB' % (n, t / 1024))
    print('\n%d portadas con velas generadas en docs/muestras/portadas-velas/' % len(PORTADAS))

if __name__ == '__main__':
    main()
