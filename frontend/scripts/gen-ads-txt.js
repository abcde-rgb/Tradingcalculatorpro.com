#!/usr/bin/env node
/**
 * Genera `build/ads.txt` a partir de `REACT_APP_ADSENSE_CLIENT`.
 *
 * ads.txt (Authorized Digital Sellers) es la lista pública de quién puede
 * vender el inventario de este dominio. AdSense avisa —y acaba limitando la
 * demanda— si el archivo falta o no incluye al editor.
 *
 * ⚠️ El archivo tiene que servirse en la RAÍZ DEL DOMINIO
 * (`https://midominio.com/ads.txt`). Hoy el sitio se publica en
 * `abcde-rgb.github.io/Tradingcalculatorpro.com/`, un SUBDIRECTORIO de un
 * dominio que no es nuestro: ahí este archivo acaba en
 * `…/Tradingcalculatorpro.com/ads.txt` y los rastreadores no lo miran.
 * Es correcto en cuanto se active el dominio propio (con `CNAME`, el build
 * pasa a ser la raíz). Ver docs/MONETIZACION_ADS.md.
 *
 * Sin la variable de entorno no escribe nada.
 */
const fs = require('fs');
const path = require('path');

const BUILD = path.join(__dirname, '..', 'build');
const client = (process.env.REACT_APP_ADSENSE_CLIENT || '').trim();

const OUT = path.join(BUILD, 'ads.txt');

if (!client) {
  // Y si quedaba uno de un build anterior, fuera: un ads.txt que autoriza a un
  // editor que ya no anuncia aquí es peor que no tenerlo.
  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
  console.log('ℹ️  ads.txt: sin REACT_APP_ADSENSE_CLIENT, no se genera (publicidad desactivada)');
  process.exit(0);
}

// `ca-pub-123…` en el script del editor → `pub-123…` en ads.txt.
const pub = client.replace(/^ca-/, '');
if (!/^pub-\d{10,}$/.test(pub)) {
  console.error(`❌ ads.txt: REACT_APP_ADSENSE_CLIENT no parece un ID de editor válido: ${client}`);
  process.exit(1);
}

if (!fs.existsSync(BUILD)) {
  console.error('❌ ads.txt: no existe build/. Ejecuta esto después de `npm run build`.');
  process.exit(1);
}

// f08c47fec0942fa0 es el TAG-ID de Google en el registro de ads.txt; es el
// mismo para todos los editores de AdSense y no es un secreto.
const body = `# ads.txt — Authorized Digital Sellers (IAB Tech Lab)\n`
  + `# Generado por scripts/gen-ads-txt.js en el postbuild.\n`
  + `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;

fs.writeFileSync(OUT, body, 'utf8');
console.log(`✅ ads.txt: google.com, ${pub}, DIRECT`);
