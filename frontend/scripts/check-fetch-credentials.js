#!/usr/bin/env node
/* eslint-disable */
/**
 * Guard against the bug that has now appeared FIVE times in this codebase:
 * a fetch() to our own backend without `credentials: 'include'`.
 *
 * Why it keeps happening and why it is nasty:
 *   The access token lives in memory only (Zustand, never persisted). After a
 *   page reload it is `null`, so the Authorization header is worthless and the
 *   httpOnly cookie is the ONLY thing that can authenticate the request. Omit
 *   `credentials` and the call 401s — but usually inside a try/catch that
 *   swallows it, so the feature just silently does nothing. No error, no log.
 *
 * Where it has been found and fixed:
 *   PricingPage · UsageHeatmapCard · performanceApi · the GDPR export ·
 *   saveCalculation + fetchHistory in store.js
 *
 * What this checks: any `fetch(` whose URL argument references the backend
 * (API, BACKEND_URL, /api/) must have `credentials` in its options object.
 *
 * Usage: node scripts/check-fetch-credentials.js
 * Exits 1 on any violation, so CI fails before it reaches production.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

// URL forms that mean "our backend".
const BACKEND_URL_HINT = /\$\{API\}|\$\{BACKEND_URL\}|\/api\//;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Extract the full `fetch(...)` call text by balancing parentheses. */
function callAt(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return src.slice(start, start + 600); // unbalanced: inspect a window
}

const violations = [];

for (const file of walk(SRC)) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(path.join(__dirname, '..', '..'), file);

  // `fetch(` but not `.fetch(`, and not our own wrapper names.
  const re = /(^|[^.\w])fetch\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const open = src.indexOf('(', m.index + m[0].length - 1);
    const call = callAt(src, open);
    if (!BACKEND_URL_HINT.test(call)) continue;          // not our backend
    if (/credentials\s*:/.test(call)) continue;          // already correct

    const line = src.slice(0, m.index).split('\n').length;
    violations.push({
      file: rel,
      line,
      snippet: call.replace(/\s+/g, ' ').slice(0, 110),
    });
  }
}

if (violations.length) {
  console.error(`\n❌ ${violations.length} fetch() al backend sin credentials:'include'\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.snippet}\n`);
  }
  console.error(
    "Arreglo: añade credentials: 'include' a las opciones del fetch, o usa el\n" +
    'helper fetchWithTimeout de lib/store.js, que ya lo pone siempre.\n' +
    'Motivo: el token vive solo en memoria; tras recargar la página la cookie\n' +
    'httpOnly es lo único que autentica la petición.\n'
  );
  process.exit(1);
}

console.log('✅ Todos los fetch() al backend envían credentials.');
