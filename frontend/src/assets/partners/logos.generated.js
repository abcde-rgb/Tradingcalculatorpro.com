// ⚠️ GENERADO por scripts/gen-partner-logos.js — NO editar a mano.
//
// Para añadir el logo de un socio o un bróker: deja el fichero en esta misma
// carpeta como `<id>-square.svg` (o .png/.webp/.jpg) y ejecuta
// `node scripts/gen-partner-logos.js`. El `<id>` es el del bróker en
// `backend/brokers_referidos.py` o el del socio en `RecommendedTools.jsx`.
//
// Sin fichero, la tarjeta pinta una ficha de marca propia (monograma, nombre y
// supervisor). Un logo que no tenemos no se imita: se deja el hueco honesto.
import logo_hyperliquid from './hyperliquid-square.svg';
import logo_margex from './margex-square.png';

const LOGOS = {
  "hyperliquid": logo_hyperliquid,
  "margex": logo_margex,
};

export default LOGOS;
