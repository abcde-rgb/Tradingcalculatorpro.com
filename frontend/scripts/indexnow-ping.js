#!/usr/bin/env node
/**
 * Avisa a Bing/Yandex de las páginas que cambiaron en ESTE despliegue (IndexNow).
 *
 * Por qué sólo las de hoy, y no las 2.475
 * ----------------------------------------
 * IndexNow no penaliza reenviar una URL sin cambios, pero tampoco sirve de nada:
 * el protocolo existe para adelantar el rastreo de lo que CAMBIÓ, no para
 * sustituir el sitemap. `gen-seo-pages.js` ya calcula un `lastmod` real por
 * página (`fechaReal()`, ver BUG-089) — filtrar por "lastmod = hoy" reutiliza
 * exactamente esa señal en vez de inventar una propia, y de paso evita mandar
 * 2.475 URLs cada vez que se despliega un cambio de una sola página.
 *
 * La clave no es un secreto
 * --------------------------
 * IndexNow prueba la propiedad del dominio con un fichero público
 * (`/<key>.txt`), el mismo principio que la verificación HTML de Search
 * Console. Por eso vive en el repo, no en GitHub Secrets.
 *
 * Corre en `deploy-gh-pages.yml`, DESPUÉS de publicar — con `continue-on-error`,
 * porque un fallo de red aquí no deshace un despliegue que ya tuvo éxito.
 *
 * Uso
 * ---
 *     cd frontend && npm run build && node scripts/indexnow-ping.js
 */
const fs = require('fs');
const path = require('path');

const KEY = '4a42f1ecee09e72c1ffcfb94f2c726a1';
const DOMAIN = 'https://tradingcalculator.pro';
const HOST = 'tradingcalculator.pro';
const SITEMAP = path.join(__dirname, '..', 'build', 'sitemap.xml');

(async () => {
  if (!fs.existsSync(SITEMAP)) {
    console.log('IndexNow: no hay build/sitemap.xml — ¿se ejecutó antes de "npm run build"?');
    return;
  }

  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const hoy = new Date().toISOString().slice(0, 10);
  // El segundo filtro no es redundante con el primero: acota qué puede viajar
  // en el cuerpo de la petición a datos que de verdad son "nuestra URL", no
  // lo que sea que haya en el fichero. Si `sitemap.xml` llegara a tener una
  // fila corrupta o un origen distinto, no se reenvía a un tercero sin más.
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)]
    .filter(([, , fecha]) => fecha === hoy)
    .map(([, url]) => url)
    .filter((url) => url.startsWith(`${DOMAIN}/`));

  if (!urls.length) {
    console.log('IndexNow: ninguna URL con lastmod de hoy — nada que avisar.');
    return;
  }

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${DOMAIN}/${KEY}.txt`, urlList: urls }),
    });
    console.log(`IndexNow: ${urls.length} URL(s) avisadas a Bing/Yandex — HTTP ${res.status}`);
  } catch (e) {
    // No bloquea el despliegue: ya se publicó. Es un aviso de cortesía a los
    // buscadores, no una condición para que el sitio funcione.
    console.log(`IndexNow: fallo de red al avisar (${e.message}) — el despliegue ya se hizo igual`);
  }
})();
