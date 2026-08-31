#!/usr/bin/env node
/**
 * Lo indefinido se pinta como raya, nunca como «null».
 *
 * ## Por qué existe
 *
 * La primera regla de honestidad del proyecto dice que lo que no se puede
 * calcular es `None`, no `0`: una R sin stop es indefinida, un Sortino sin
 * pérdidas es indefinido, una IV que el precio no determina es indefinida.
 * El backend la cumple. El problema es el otro extremo: en cuanto una métrica
 * pasó de `0` a `None`, la pantalla que la interpolaba a pelo empezó a pintar
 *
 *     Rmedio    nullR          Sharpe: null
 *
 * que es PEOR que el cero que se quería evitar. El cero al menos parece un
 * número; «null» parece una web rota, y en una pantalla con la que alguien
 * dimensiona una posición eso destruye la confianza en el resto de las cifras.
 *
 * No es hipotético: pasó al aplicar la regla a `avg_r` y a `_compute_sharpe`.
 *
 * ## Cómo lo prueba
 *
 * No espera a que la base de datos produzca el caso —haría falta una cartera
 * sin un solo stop— sino que lo FUERZA: intercepta la respuesta real de
 * `/performance/analytics` y pone a `null` cada métrica que la regla permite
 * que lo sea. Es el mismo dato que devolvería el backend en ese escenario.
 *
 * Uso (necesita el stack en pie — `tests/e2e/stack/arriba.sh`):
 *     node tests/e2e/navegador/nulos.js
 */
const { chromium } = require('../lib/playwright-core');
const { rutaChromium, BASE, entra, descartaCookies } = require('../entorno');

// Las que el backend puede devolver indefinidas. NO se inventan: son las que
// `performance.py` deja en `None`, y sólo ésas.
//
// La primera versión de esta lista llevaba también `win_rate`, `expectancy`,
// `total_pnl_pct` y `max_drawdown_pct`. Anularlas destapó cuatro «null%» en
// pantalla… de un escenario que el backend NO PUEDE producir: esos cuatro
// salen de `_safe_div(..., 0)` y son siempre un número. Una sonda que fabrica
// una respuesta imposible no encuentra fallos, inventa trabajo — y el arreglo
// habría sido código muerto defendiéndose de nada.
//
// Si `performance.py` hace opcional otra métrica, añádela aquí.
const ANULABLES = [
  'avg_r',           // R sin stop → indefinida (regla de honestidad nº 2)
  'sharpe_ratio', 'sharpe_per_trade', 'sortino_ratio',
  'sqn', 'calmar_ratio', 'ulcer_index',   // el bloque `advanced`
  'streak_zscore', 'var_95', 'var_95_parametric', 'cvar_95',
  'profit_factor',   // sin pérdidas es ∞, y el panel lo dice
];

const fallos = [];
const marca = (n, ok, d = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos.push(n);
};

(async () => {
  const nav = await chromium.launch({ executablePath: rutaChromium(), args: ['--no-sandbox'] });
  const page = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  console.log('\n═══ Lo indefinido se pinta como raya ═══\n');

  let interceptada = 0;
  let anuladas = [];
  await page.route('**/performance/analytics*', async (ruta) => {
    const resp = await ruta.fetch();
    let cuerpo;
    try { cuerpo = await resp.json(); } catch { return ruta.fulfill({ response: resp }); }
    const a = cuerpo && cuerpo.analytics;
    if (a) {
      // Las avanzadas viven anidadas en `advanced`; anular sólo la raíz
      // dejaría fuera justo las que la regla de honestidad hace opcionales.
      const objetivos = [a, a.advanced].filter(Boolean);
      anuladas = [];
      for (const o of objetivos) {
        for (const k of ANULABLES) if (k in o) { o[k] = null; anuladas.push(k); }
      }
      interceptada++;
    }
    await ruta.fulfill({ response: resp, body: JSON.stringify(cuerpo) });
  });

  await entra(page);
  await descartaCookies(page);
  await page.goto(`${BASE}/performance`, { waitUntil: 'networkidle', timeout: 60000 });
  const tab = page.locator('[data-testid="perftab-analytics"]');
  if (await tab.isVisible().catch(() => false)) { await tab.click(); await page.waitForTimeout(3000); }
  await page.waitForSelector('[data-testid="analytics-dashboard"]', { timeout: 25000 })
    .catch(() => { });
  await page.waitForTimeout(2000);

  // ── Guarda contra el verde vacío ──────────────────────────────────────
  // Sin interceptar nada, «no aparece la palabra null» sería cierto y no
  // habría probado nada. Y sin panel montado, tampoco.
  marca('la respuesta se interceptó y se anularon métricas', interceptada > 0 && anuladas.length >= 5,
        `${interceptada} respuesta(s) · ${anuladas.length} métricas a null: ${anuladas.slice(0, 6).join(', ')}…`);

  const panel = page.locator('[data-testid="analytics-dashboard"]');
  const montado = await panel.count() === 1;
  marca('el panel de analítica se monta con todo indefinido', montado);

  if (!montado) {
    console.log('\n' + '='.repeat(70));
    console.log(`❌ ${fallos.length} fallo(s)`);
    await nav.close();
    process.exit(1);
  }

  const texto = (await panel.innerText()).replace(/\s+/g, ' ');

  // ── Lo que se mide ────────────────────────────────────────────────────
  // Sólo frontera por la IZQUIERDA. Con `\b` a los dos lados, «nullR» —el
  // caso REAL que destapó todo esto, `${a.avg_r}R` con `avg_r` a null— no
  // casaba, porque la R es carácter de palabra. La comprobación general daba
  // verde mientras la específica gritaba. Comprobado saboteando el bundle.
  const crudos = (texto.match(/(?:^|[^A-Za-z])(null|undefined|NaN)/gi) || [])
    .map((m) => m.replace(/^[^A-Za-z]+/, ''));
  marca('no se pinta «null», «undefined» ni «NaN» en ninguna cifra',
        crudos.length === 0,
        crudos.length ? `${crudos.length}: ${[...new Set(crudos)].join(', ')}` : 'ninguno');

  // Y que la raya SÍ aparezca: si no hubiera ninguna, el panel estaría
  // escondiendo las métricas en vez de declararlas indefinidas, que es otra
  // forma de no decir la verdad.
  const rayas = (texto.match(/—/g) || []).length;
  marca('lo indefinido se declara con una raya', rayas >= 3, `${rayas} raya(s)`);

  // El caso concreto que lo destapó, por su nombre.
  const kpiR = page.locator('[data-testid="kpi-r"]');
  if (await kpiR.count()) {
    const t = (await kpiR.innerText()).replace(/\s+/g, ' ');
    marca('la R media indefinida no sale como «nullR»', !/null/i.test(t), t.slice(0, 60));
  }

  await page.screenshot({ path: '.qa-capturas/nulos/analitica-todo-indefinido.png', fullPage: true })
    .catch(() => { });

  await nav.close();
  console.log('\n' + '='.repeat(70));
  console.log(fallos.length
    ? `❌ ${fallos.length} fallo(s) — una cifra indefinida se está pintando cruda`
    : '✅ ninguna métrica indefinida llega cruda a la pantalla');
  process.exit(fallos.length ? 1 : 0);
})();
