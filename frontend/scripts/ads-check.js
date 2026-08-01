#!/usr/bin/env node
/**
 * Verificación offline de la publicidad.
 *
 * La promesa que se le vende al cliente de pago —"con Premium no hay
 * anuncios, tampoco en el contenido gratuito"— no puede depender de que nadie
 * se despiste al añadir una página. Esto la fija:
 *
 *   1. `shouldShowAds` dice NO a todo suscriptor, a todo visitante sin
 *      consentimiento y a toda ruta fuera de la lista blanca.
 *   2. Ningún `<AdSlot>` cuelga de una página de pago, de conversión o legal.
 *   3. `index.html` no carga el script de AdSense: si lo hiciera, el navegador
 *      de un suscriptor hablaría con la red publicitaria aunque no viese nada.
 *
 * Sin navegador, sin red, sin framework de test:
 *   node scripts/ads-check.js
 * Sale con 1 al primer fallo.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const SRC = path.join(__dirname, '..', 'src');
const imp = (rel) => import(pathToFileURL(path.join(SRC, rel)).href);

let failures = 0;
let checks = 0;

function ok(name, condition, detail = '') {
  checks += 1;
  if (condition) {
    console.log(`  ✅ ${name}`);
  } else {
    failures += 1;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// Páginas donde un anuncio NO puede aparecer nunca, y por qué:
//   - de pago: el suscriptor no ve publicidad en ninguna parte
//   - de conversión/trámite: no se compite con el propio checkout
//   - legales y de contacto: texto fino, y AdSense penaliza anunciar sobre
//     páginas sin contenido propio
const FORBIDDEN_PAGES = [
  'DashboardPage.jsx', 'PerformancePage.jsx', 'AdminPage.jsx', 'OptionsPage.jsx',
  'SettingsPage.jsx', 'SubscriptionPage.jsx', 'PricingPage.jsx', 'AuthPages.jsx',
  'PaymentPages.jsx', 'VerifyEmailPage.jsx', 'LegalPage.jsx', 'ContactPage.jsx',
  'AboutPage.jsx', 'AffiliatePage.jsx',
];

async function checkPolicy() {
  console.log('\nadsPolicy.js');
  const { shouldShowAds, isAdSurface } = await imp('lib/adsPolicy.js');

  const free = {
    clientId: 'ca-pub-0000000000000000',
    consent: 'all',
    isPremium: false,
    isAdmin: false,
    resolved: true,
    pathname: '/options/strategies/iron-condor',
  };

  ok('visitante gratuito, con consentimiento, en una ruta permitida → SÍ',
    shouldShowAds(free) === true);

  ok('suscriptor Premium → NO (aunque esté en el contenido gratuito)',
    shouldShowAds({ ...free, isPremium: true }) === false);
  ok('administrador → NO',
    shouldShowAds({ ...free, isAdmin: true }) === false);

  ok('sin consentimiento → NO', shouldShowAds({ ...free, consent: null }) === false);
  ok('sólo cookies esenciales → NO', shouldShowAds({ ...free, consent: 'essential' }) === false);
  ok('CMP de Google se encarga del consentimiento → SÍ sin nuestro banner',
    shouldShowAds({ ...free, consent: null, cmp: 'google' }) === true);

  ok('sesión aún sin resolver → NO (un premium no puede ver ni un parpadeo)',
    shouldShowAds({ ...free, resolved: false }) === false);

  ok('build sin ID de editor → NO', shouldShowAds({ ...free, clientId: '' }) === false);

  for (const p of ['/', '/dashboard', '/pricing', '/options/calculator', '/performance',
    '/login', '/settings', '/admin', '/legal', '/education', '/payment/success']) {
    ok(`ruta fuera de la lista blanca: ${p} → NO`,
      shouldShowAds({ ...free, pathname: p }) === false);
  }

  ok('/options es superficie de anuncios', isAdSurface('/options') === true);
  ok('/options/strategies es superficie de anuncios', isAdSurface('/options/strategies') === true);
  ok('/options/calculator NO lo es', isAdSurface('/options/calculator') === false);
  ok('ruta vacía o no-string → NO', isAdSurface(undefined) === false && isAdSurface('') === false);
  ok('la query no cuela una ruta prohibida',
    isAdSurface('/options?x=1') === true && isAdSurface('/dashboard?tab=/options') === false);
}

function checkPlacements() {
  console.log('\nDónde se monta <AdSlot>');
  const pagesDir = path.join(SRC, 'pages');
  const offenders = [];

  for (const f of FORBIDDEN_PAGES) {
    const full = path.join(pagesDir, f);
    if (!fs.existsSync(full)) continue; // renombrada: lo dirá el import del build
    if (/components\/ads\/AdSlot/.test(fs.readFileSync(full, 'utf8'))) offenders.push(f);
  }
  ok('ninguna página de pago, conversión o legal monta anuncios',
    offenders.length === 0, offenders.join(', '));

  const index = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  ok('index.html no carga adsbygoogle.js (se inyecta sólo tras la política)',
    !/adsbygoogle/.test(index));
}

(async () => {
  console.log('Verificación de publicidad (offline)');
  await checkPolicy();
  checkPlacements();
  console.log(`\n${checks - failures}/${checks} comprobaciones OK`);
  if (failures) {
    console.error(`${failures} fallo(s).`);
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
