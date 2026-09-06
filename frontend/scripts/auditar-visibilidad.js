#!/usr/bin/env node
/* eslint-disable */
/**
 * auditar-visibilidad.js - lo que mide una suite de agencia, sobre el build.
 *
 * POR QUE EXISTE, Y POR QUE NO ES OTRO check-seo.js
 * ------------------------------------------------
 * `check-seo.js` tiene 42 comprobaciones y todas preguntan lo mismo: **esta
 * bien puesto?** Canonical auto-referente, hreflang reciproco, el sitemap sin
 * 404, ninguna huerfana, los puentes coherentes. Es una PUERTA: sale 1 y
 * bloquea el despliegue.
 *
 * Esto pregunta otra cosa: **esto compite?** Un titulo perfectamente valido
 * que el buscador corta a la mitad, dos mil paginas con la misma imagen
 * social, un hub que reparte su autoridad entre cuatrocientos enlaces. Nada de
 * eso esta «mal» -`check-seo.js` lo aprueba, y con razon- y todo eso cuesta
 * clics.
 *
 * Es un INFORME, no una puerta, igual que `auditar.py` y `capturas.js`: sale 0
 * salvo que no pueda medir. Un informe que bloquea el despliegue se acaba
 * apagando, y estas metricas son de las que se discuten, no de las que se
 * arreglan a ciegas.
 *
 * QUE NO PUEDE MEDIR, Y HAY QUE DECIRLO
 * -------------------------------------
 * Nada de esto es una posicion ni una impresion reales. No hay volumen de
 * busqueda, ni competencia por consulta, ni CTR observado, ni enlaces
 * entrantes de fuera. Eso vive en Search Console, en Bing Webmaster y en
 * Yandex Webmaster -los tres gratis y los tres con la cuenta del dueno- y NO
 * se puede deducir del HTML. Lo que hay aqui es todo lo que si se decide desde
 * el repositorio.
 *
 *   cd frontend && npm run build && node scripts/auditar-visibilidad.js
 *   node scripts/auditar-visibilidad.js --json   # para diffear entre builds
 */
const fs = require('fs');
const path = require('path');

const BUILD = path.join(__dirname, '..', 'build');
const JSON_OUT = process.argv.includes('--json');
const DOMAIN = 'https://tradingcalculator.pro';

if (!fs.existsSync(BUILD)) {
  console.error('x no hay build/. Corre `npm run build` primero.');
  process.exit(2);
}

// -- Anchura en el SERP --------------------------------------------------
//
// La tabla NO vive aqui: `scripts/serp-ancho.js` es la MISMA que usa
// `gen-seo-pages.js` para decidir cuanto texto emitir. Con dos copias, el
// generador y el auditor podrian dejar de hablar del mismo milimetro, y el
// informe empezaria a mentir en la direccion mas peligrosa: dando por bueno lo
// que no cabe.
const SERP = require('./serp-ancho');
const PX_TITULO = (t) => ({ px: SERP.anchoPx(t, SERP.PX_FUENTE_TITULO), aprox: SERP.anchoMil(t).aprox });
const PX_DESC = (t) => ({ px: SERP.anchoPx(t, SERP.PX_FUENTE_DESC) });
const CORTE_TITULO = SERP.CORTE_TITULO;
const CORTE_DESC = SERP.CORTE_DESC;

// -- Extraccion ----------------------------------------------------------
const un = (s) => s ? s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ') : s;
const attr = (html, re) => { const m = html.match(re); return m ? un(m[1]) : null; };

function textoVisible(html, soloCuerpo) {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<head[\s\S]*?<\/head>/i, ' ');
  // Para CONTAR contenido hay que quitar el cromo. Lo aprendi rompiendolo: al
  // anadir el selector de idioma, el recuento de palabras de las 2.475 paginas
  // subio ~9 de golpe y 82 fichas de calculadora «dejaron de ser delgadas» sin
  // que nadie escribiera una palabra. Un menu repetido en todo el sitio no es
  // contenido, ni para este informe ni para el buscador.
  if (soloCuerpo) {
    h = h.replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  }
  return un(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
// Contar «palabras» partiendo por espacios miente en chino y japones, que no
// los usan: una ficha japonesa de 400 caracteres saldria como 3 palabras y se
// marcaria como delgada. Para CJK se cuenta por caracter, que es la unidad con
// la que esos idiomas se comparan.
function palabras(txt, lang) {
  if (lang === 'zh' || lang === 'ja') return [...txt].filter((c) => /\S/.test(c)).length;
  return txt.split(/\s+/).filter(Boolean).length;
}

const SECCIONES = /^(tools|learn|markets|strategies|patterns|candles)$/;
// Se clasifica por la URL, no por la carpeta. Con la carpeta, `offline.html` y
// `index.html` viven los dos en la raiz del build y salian los dos como
// «portada»: `porUrl` se quedaba con el ultimo, que es `offline.html`, que no
// enlaza a nada, y el BFS de profundidad moria en el primer salto dando 1.810
// paginas «a mas de 3 clics». El sitio estaba bien; el que medi mal fui yo.
function tipoDe(url, html) {
  if (/http-equiv="refresh"/i.test(html)) return 'puente';
  if (url === '/') return 'portada';
  const p = url.split('/').filter(Boolean);
  if (p.length && p[0].length === 2) p.shift();
  if (p.length && SECCIONES.test(p[0])) return p.length > 1 ? p[0] : 'hub';
  return 'app';
}

const paginas = [];
const fallos = { titulo: [], description: [], canonical: [] };

function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { recorrer(full); continue; }
    if (!e.name.endsWith('.html')) continue;
    // `<ruta>.html` y `<ruta>/index.html` son el MISMO recurso, duplicado a
    // proposito (GitHub Pages sirve uno u otro segun como llegue la peticion).
    // Contar los dos duplicaria cada ruta de app e inventaria diez «titulos
    // repetidos» que no existen.
    if (e.name !== 'index.html' && fs.existsSync(full.replace(/\.html$/, '/index.html'))) continue;
    if (e.name === '404.html') continue;

    const html = fs.readFileSync(full, 'utf8');
    const rel = path.relative(BUILD, path.dirname(full)).split(path.sep).join('/');
    const url = e.name === 'index.html'
      ? (rel ? `/${rel}/` : '/')
      : `/${rel ? `${rel}/` : ''}${e.name}`;
    const tipo = tipoDe(url, html);
    const lang = attr(html, /<html lang="([^"]+)"/) || '??';
    const title = attr(html, /<title>([\s\S]*?)<\/title>/i);
    const desc = attr(html, /<meta name="description" content="([^"]*)"/i);
    const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/i);
    const ogImg = attr(html, /<meta property="og:image" content="([^"]+)"/i);

    const enlaces = [...html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((m) => ({ href: m[1], anchor: textoVisible(m[2]) }))
      .filter((l) => l.href.startsWith('/') || l.href.startsWith(DOMAIN))
      .map((l) => ({ anchor: l.anchor, href: l.href.replace(DOMAIN, '').split('#')[0].split('?')[0] }));

    const tipos = [];
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
      try {
        const rec = (o) => {
          if (!o || typeof o !== 'object') return;
          if (typeof o['@type'] === 'string') tipos.push(o['@type']);
          for (const v of Object.values(o)) { if (Array.isArray(v)) v.forEach(rec); else rec(v); }
        };
        rec(JSON.parse(m[1]));
      } catch { tipos.push('__NO_PARSEA__'); }
    }

    if (tipo !== 'puente') {
      if (!title) fallos.titulo.push(url);
      if (!desc) fallos.description.push(url);
      if (!canonical) fallos.canonical.push(url);
    }
    paginas.push({
      url, tipo, lang, title, desc, ogImg,
      palabras: palabras(textoVisible(html, true), lang),
      imgs: (html.match(/<img\s/gi) || []).length,
      bytes: Buffer.byteLength(html),
      enlaces, schema: [...new Set(tipos)],
    });
  }
}
recorrer(BUILD);

// -- La guarda anti-«informe que no informa» -----------------------------
//
// Todo lo de abajo son expresiones regulares sobre HTML. Si la plantilla
// cambia y dejan de casar, este script no falla: informa de CERO problemas,
// que es indistinguible de un sitio perfecto. Es el modo de fallo exacto que
// `probar-verificadores.sh` existe para cazar -el smoke visual que imprimia OK
// generando imagenes en blanco-. Asi que se comprueba que la extraccion
// funciono ANTES de creerse un solo numero.
const reales = paginas.filter((p) => p.tipo !== 'puente' && p.tipo !== 'app');
if (reales.length < 100) {
  console.error(`x solo se han reconocido ${reales.length} paginas de contenido: la extraccion esta rota o el build esta incompleto.`);
  process.exit(2);
}
for (const [campo, lista] of Object.entries(fallos)) {
  if (lista.length > reales.length * 0.005) {
    console.error(`x ${lista.length} paginas sin ${campo}: la extraccion no esta leyendo el HTML que cree.`);
    console.error(`  ejemplo: ${lista[0]}`);
    process.exit(2);
  }
}

// -- Grafo interno -------------------------------------------------------
const porUrl = new Map(paginas.map((p) => [p.url, p]));
const norm = (h) => (h.endsWith('/') ? h : `${h}/`);
const entrantes = new Map();
const anchors = new Map();
for (const p of paginas) {
  for (const l of p.enlaces) {
    const d = norm(l.href);
    if (!porUrl.has(d) || d === p.url) continue;
    entrantes.set(d, (entrantes.get(d) || 0) + 1);
    if (!anchors.has(d)) anchors.set(d, new Set());
    anchors.get(d).add(l.anchor.toLowerCase().trim());
  }
}
// Profundidad de clic desde la portada. No es un adorno: es la senal con la
// que un buscador decide cuanto rastrea. Una pagina a cuatro saltos con un
// enlace entrante se rastrea meses despues que una a dos con cincuenta.
const prof = new Map([['/', 0]]);
let frente = ['/'];
while (frente.length) {
  const sig = [];
  for (const u of frente) {
    const p = porUrl.get(u);
    if (!p) continue;
    for (const l of p.enlaces) {
      const d = norm(l.href);
      if (!porUrl.has(d) || prof.has(d)) continue;
      prof.set(d, prof.get(u) + 1);
      sig.push(d);
    }
  }
  frente = sig;
}

// -- Hallazgos -----------------------------------------------------------
const hallazgos = [];
const nota = (sev, titulo, dato, detalle) => hallazgos.push({ sev, titulo, dato, detalle: detalle || [] });
const grupos = {};
for (const p of reales) (grupos[p.tipo] = grupos[p.tipo] || []).push(p);
const pct = (n, d) => (d ? `${(100 * n / d).toFixed(1)} %` : '-');

// 1 - Truncado en el SERP
const tTrunc = [], dTrunc = [], tCorto = [];
let aprox = 0;
for (const p of reales) {
  if (p.title) {
    const { px, aprox: a } = PX_TITULO(p.title);
    if (a) aprox++;
    if (px > CORTE_TITULO) tTrunc.push([p.url, Math.round(px), p.title]);
    else if (px < 300) tCorto.push([p.url, Math.round(px), p.title]);
  }
  if (p.desc) {
    const { px } = PX_DESC(p.desc);
    if (px > CORTE_DESC) dTrunc.push([p.url, Math.round(px), p.desc]);
  }
}
// El reparto por idioma no es decoracion. El ancho del arabe y del cirilico es
// una aproximacion por escritura (ver `anchoUnidades`), asi que un hallazgo que
// resulte ser 90 % arabe es MAS BLANDO que el mismo numero repartido por los
// diez idiomas, y quien lo lea tiene que poder verlo sin abrir el codigo.
const idiomaDeUrl = (u) => { const s = u.split('/').filter(Boolean); return s.length && s[0].length === 2 ? s[0] : 'es'; };
const porIdioma = (filas) => {
  const c = {};
  for (const f of filas) { const l = idiomaDeUrl(f[0]); c[l] = (c[l] || 0) + 1; }
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l}:${n}`).join('  ');
};
if (tTrunc.length) {
  nota(tTrunc.length > reales.length * 0.2 ? 'ALTA' : 'MEDIA',
    'Titulos que el buscador corta',
    `${tTrunc.length} de ${reales.length} (${pct(tTrunc.length, reales.length)}) pasan de ${CORTE_TITULO} px`,
    [`reparto por idioma: ${porIdioma(tTrunc)}`,
      ...tTrunc.slice(0, 3).map(([u, px, t]) => `${px} px - ${u}\n      «${t}»`)]);
}
if (dTrunc.length) {
  nota('MEDIA', 'Descripciones que el buscador corta',
    `${dTrunc.length} de ${reales.length} (${pct(dTrunc.length, reales.length)}) pasan de ${CORTE_DESC} px`,
    [`reparto por idioma: ${porIdioma(dTrunc)}`,
      ...dTrunc.slice(0, 2).map(([u, px, t]) => `${px} px - ${u}\n      «${t.slice(0, 110)}...»`)]);
}
if (tCorto.length) {
  nota('BAJA', 'Titulos que desaprovechan el espacio',
    `${tCorto.length} por debajo de 300 px de los ${CORTE_TITULO} disponibles`,
    tCorto.slice(0, 3).map(([u, px, t]) => `${px} px - ${u} - «${t}»`));
}

// 2 - Duplicados DENTRO del mismo idioma.
// Entre idiomas el titulo repetido es correcto -son el mismo contenido con su
// hreflang- asi que compararlos mezclados inventaria miles de duplicados.
const SEP = ' ';
for (const [campo, etiqueta] of [['title', 'Titulos'], ['desc', 'Descripciones']]) {
  const mapa = new Map();
  for (const p of reales) {
    if (!p[campo]) continue;
    const k = p.lang + SEP + p[campo];
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(p.url);
  }
  const dups = [...mapa.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
  const afectadas = dups.reduce((s, [, v]) => s + v.length, 0);
  if (dups.length) {
    nota(afectadas > reales.length * 0.1 ? 'ALTA' : 'MEDIA',
      `${etiqueta} repetidos dentro del mismo idioma`,
      `${dups.length} grupo(s), ${afectadas} paginas - se canibalizan entre ellas`,
      dups.slice(0, 3).map(([k, v]) => {
        const [lang, txt] = k.split(SEP);
        return `[${lang}] «${txt.slice(0, 70)}» x${v.length}\n      ${v.slice(0, 3).join('   ')}`;
      }));
  }
}

// 3 - Reparto de autoridad interna
const sinEntrantes = reales.filter((p) => !entrantes.get(p.url));
const conUno = reales.filter((p) => entrantes.get(p.url) === 1);
const profundas = reales.filter((p) => (prof.get(p.url) ?? 99) > 3);
const salidasHub = paginas.filter((p) => p.tipo === 'hub')
  .map((h) => h.enlaces.filter((l) => porUrl.has(norm(l.href))).length)
  .sort((a, b) => b - a);
if (sinEntrantes.length) {
  nota('ALTA', 'Paginas que nada enlaza', `${sinEntrantes.length} sin un solo enlace interno entrante`,
    sinEntrantes.slice(0, 5).map((p) => p.url));
}
if (conUno.length) {
  nota(conUno.length > reales.length * 0.5 ? 'ALTA' : 'MEDIA',
    'Paginas colgando de un solo enlace',
    `${conUno.length} de ${reales.length} (${pct(conUno.length, reales.length)}) tienen exactamente 1 entrante`,
    ['Un unico enlace es el minimo para no ser huerfana y el maximo para no ser rastreada:',
      'sin enlaces laterales entre paginas hermanas, el buscador no tiene motivo para volver.']);
}
// Alcanzabilidad por idioma. Es la metrica mas cara de todo el informe y la
// que menos se parece a lo que mide `check-seo.js`: alli «huerfana» significa
// «ningun hub de SU idioma la enlaza», que es una condicion local. Aqui se
// pregunta si un rastreador que entra por la portada y sigue enlaces llega a
// ella, que es la condicion global y la que reparte autoridad.
//
// El sitemap y el hreflang DESCUBREN una URL; ninguno de los dos le pasa
// autoridad. Un idioma sin un solo <a> entrante existe para el buscador y no
// compite.
const IDIOMAS = /^(ar|de|en|es|fr|it|ja|pt|ru|zh)$/;
const idiomaDe = (u) => { const s = u.split('/').filter(Boolean); return s.length && IDIOMAS.test(s[0]) ? s[0] : 'es'; };
const totalIdioma = {}, alcIdioma = {};
for (const p of reales) {
  const l = idiomaDe(p.url);
  totalIdioma[l] = (totalIdioma[l] || 0) + 1;
  if (prof.has(p.url)) alcIdioma[l] = (alcIdioma[l] || 0) + 1;
}
const mudos = Object.keys(totalIdioma).filter((l) => !alcIdioma[l]);
const inalcanzables = reales.filter((p) => !prof.has(p.url));
if (mudos.length) {
  nota('ALTA', 'Idiomas enteros sin un solo enlace interno entrante',
    `${inalcanzables.length} de ${reales.length} paginas no se alcanzan siguiendo <a> desde la portada: ${mudos.join(', ')}`,
    ['El sitemap y el hreflang DESCUBREN una URL; ninguno reparte autoridad.',
      'Estas paginas enlazan HACIA el arbol alcanzable (portada, precios) y no reciben nada:',
      'son una valvula de un solo sentido que regala autoridad interna y no cobra ninguna.',
      `alcanzables por idioma: ${Object.keys(totalIdioma).sort().map((l) => `${l}:${alcIdioma[l] || 0}/${totalIdioma[l]}`).join('  ')}`]);
} else if (profundas.length) {
  nota('MEDIA', 'Paginas lejos de la portada', `${profundas.length} a mas de 3 clics`,
    profundas.slice(0, 5).map((p) => `${prof.get(p.url) ?? 'inalcanzable'} - ${p.url}`));
}
if (salidasHub.length) {
  nota(salidasHub[0] > 150 ? 'MEDIA' : 'BAJA', 'Dilucion en los hubs',
    `el hub mayor reparte entre ${salidasHub[0]} enlaces (mediana ${salidasHub[Math.floor(salidasHub.length / 2)]})`,
    ['Cuanta mas autoridad reparte una pagina entre mas enlaces, menos toca a cada uno.']);
}
const ancla1 = reales.filter((p) => (anchors.get(p.url) || new Set()).size === 1 && entrantes.get(p.url) > 1);
if (ancla1.length) {
  nota('BAJA', 'Anchor text sin variacion',
    `${ancla1.length} paginas reciben todos sus enlaces con el mismo texto`,
    ['El texto del enlace es de las pocas senales de relevancia que se controlan desde dentro.']);
}

// 4 - Contenido delgado.
// La portada queda fuera: es el shell de la SPA y su contenido lo pinta React.
// Medir sus 137 palabras de HTML estatico no dice nada sobre lo que Google ve
// tras renderizar, asi que seria un hallazgo inventado.
for (const [tipo, ps] of Object.entries(grupos)) {
  if (tipo === 'portada') continue;
  const ws = ps.map((p) => p.palabras).sort((a, b) => a - b);
  const flacas = ps.filter((p) => p.palabras < 200);
  if (flacas.length) {
    nota(flacas.length > ps.length * 0.5 ? 'ALTA' : 'MEDIA',
      `Contenido delgado en /${tipo}/`,
      `${flacas.length} de ${ps.length} bajo 200 palabras (mediana de la seccion: ${ws[Math.floor(ws.length / 2)]})`,
      flacas.slice(0, 3).map((p) => `${p.palabras} palabras - ${p.url}`));
  }
}

// 5 - Imagen
const conImg = reales.filter((p) => p.imgs > 0);
if (conImg.length === 0) {
  nota('ALTA', 'Ni una imagen en todo el contenido indexable',
    `0 de ${reales.length} paginas llevan <img>`,
    ['Sin imagen no hay miniatura en el resultado movil, no hay entrada a Discover,',
      'y el `max-image-preview:large` que emiten todas no describe nada.']);
}
const ogs = new Set(reales.map((p) => p.ogImg).filter(Boolean));
if (ogs.size <= 2 && reales.length > 100) {
  nota('MEDIA', 'Una sola imagen social para todo el sitio',
    `${ogs.size} og:image distinta(s) en ${reales.length} paginas`,
    ['Cada enlace compartido, venga de la pagina que venga, ensena la misma tarjeta.']);
}

// 6 - Datos estructurados
const porTipoSchema = {};
for (const [tipo, ps] of Object.entries(grupos)) {
  const cuenta = {};
  for (const p of ps) for (const s of p.schema) cuenta[s] = (cuenta[s] || 0) + 1;
  porTipoSchema[tipo] = cuenta;
}
const todos = new Set(reales.flatMap((p) => p.schema));
if (todos.has('__NO_PARSEA__')) {
  nota('ALTA', 'JSON-LD que no parsea', 'alguna pagina emite datos estructurados invalidos', []);
}
const faltan = ['Organization', 'WebSite'].filter((t) => !todos.has(t));
if (faltan.length) {
  nota('MEDIA', 'Entidad de marca ausente en el contenido indexable',
    `las ${reales.length} paginas generadas no emiten ${faltan.join(' ni ')}`,
    ['Solo lo emite el shell de la SPA, que es la superficie que menos se indexa.',
      'Sin la entidad repetida, el buscador no consolida la marca (panel de conocimiento).']);
}
if (!todos.has('Person')) {
  nota('MEDIA', 'Ni un autor declarado (E-E-A-T en YMYL)',
    'ninguna pagina nombra a quien la firma',
    ['Finanzas es la categoria con el liston de E-E-A-T mas alto de Google.',
      'Esto NO se arregla inventando un autor: hace falta un nombre real (skill mejorar-seo, seccion 7).']);
}

// -- Salida --------------------------------------------------------------
if (JSON_OUT) {
  console.log(JSON.stringify({
    total: paginas.length,
    contenido: reales.length,
    grupos: Object.fromEntries(Object.entries(grupos).map(([k, v]) => [k, v.length])),
    schema: porTipoSchema,
    hallazgos,
  }, null, 2));
  process.exit(0);
}
const ORDEN = { ALTA: 0, MEDIA: 1, BAJA: 2 };
console.log(`\nVisibilidad - ${paginas.length} ficheros HTML, ${reales.length} paginas de contenido, ${paginas.filter((p) => p.tipo === 'puente').length} puentes\n`);
console.log('Inventario por plantilla');
for (const [t, ps] of Object.entries(grupos).sort((a, b) => b[1].length - a[1].length)) {
  const ws = ps.map((p) => p.palabras).sort((a, b) => a - b);
  const kb = ps.reduce((s, p) => s + p.bytes, 0) / ps.length / 1024;
  const ent = ps.map((p) => entrantes.get(p.url) || 0).sort((a, b) => a - b);
  console.log(`  ${t.padEnd(11)} ${String(ps.length).padStart(5)} pags | mediana ${String(ws[Math.floor(ws.length / 2)]).padStart(4)} palabras | ${kb.toFixed(0)} KB | entrantes med. ${ent[Math.floor(ent.length / 2)]} | ${Object.keys(porTipoSchema[t]).join(', ') || '-'}`);
}
if (aprox) console.log(`\n  [!] ${aprox} titulos usan escritura no latina: su ancho es una aproximacion por escritura, no la metrica de Arial.`);
console.log('');
for (const h of hallazgos.sort((a, b) => ORDEN[a.sev] - ORDEN[b.sev])) {
  console.log(`[${h.sev}] ${h.titulo}`);
  console.log(`    ${h.dato}`);
  for (const d of h.detalle) console.log(`    - ${d}`);
  console.log('');
}
console.log(`${hallazgos.length} hallazgos (${hallazgos.filter((h) => h.sev === 'ALTA').length} de severidad alta). Es un informe, no una puerta: no bloquea el despliegue.`);
console.log('Lo que NO mide: posiciones, impresiones, CTR y enlaces externos. Eso vive en Search Console / Bing / Yandex Webmaster.\n');
