const { chromium } = require('playwright');
const { rutaChromium, descartaCookies, descartaModales } = require('/home/user/Tradingcalculatorpro.com/tests/e2e/entorno.js');
const BASE = 'http://127.0.0.1:3199/Tradingcalculatorpro.com';
(async () => {
  const b = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 2, locale: 'es-ES' });
  await ctx.addInitScript(() => localStorage.setItem('btc-auth-storage', JSON.stringify({
    state: { user: { id:'qa', name:'QA', email:'qa@example.com', is_premium: true }, isAuthenticated: true }, version: 0 })));
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2200); await descartaCookies(p); await descartaModales(p);
  await p.click('[data-testid="nav-dashboard"]'); await p.waitForTimeout(2800); await descartaModales(p);
  await p.click('[data-testid="dashboard-mode-basic"]'); await p.waitForTimeout(1000);
  await p.click('[data-testid="tab-montecarlo"]'); await p.waitForTimeout(1200);

  const leer = async (etiqueta) => {
    await p.click('[data-testid="run-simulation-btn"]'); await p.waitForTimeout(1800);
    const g = async (id) => (await p.textContent(`[data-testid="${id}"]`).catch(()=>'—')).replace(/\s+/g,' ').trim();
    console.log(`\n${etiqueta}`);
    console.log(`   te mata una racha de : ${await g('mc-streak-kills')}`);
    console.log(`   prob. de encadenarla : ${await g('mc-streak-odds')}`);
    console.log(`   racha típica         : ${await g('mc-streak-typical')}`);
    console.log(`   1 de cada 20 llega a : ${await g('mc-streak-2020')}`);
    console.log(`   observada p50·p95·máx: ${await g('mc-streak-observed')}`);
    console.log(`   riesgo de ruina      : ${await g('ruin-risk')}`);
  };

  await p.fill('[data-testid="capital-input"]','10000');
  await p.fill('[data-testid="avg-win-input"]','100');
  await p.fill('[data-testid="avg-loss-input"]','-50');
  await p.fill('[data-testid="num-trades-input"]','100');
  await leer('POR DEFECTO · 55 % · +100/−50');

  // Modo % de riesgo al 10 %: el que conecta con el tope de la mesa
  await p.click('[data-testid="mc-mode-percent"]'); await p.waitForTimeout(500);
  await p.fill('[data-testid="mc-risk-pct"]','10');
  await p.fill('[data-testid="mc-payoff"]','1');
  await p.waitForTimeout(400);
  console.log('\naviso de riesgo:', (await p.textContent('[data-testid="mc-risk-warning"]').catch(()=>'(ninguno)')).replace(/\s+/g,' ').trim());
  await leer('10 % DE RIESGO POR OPERACIÓN');

  await p.screenshot({ path: '/tmp/mc-rachas.png', fullPage: false });
  console.log(errs.length ? '\nERRORES: '+errs.slice(0,2).join(' | ') : '\nsin errores de página');
  await b.close();
})();
