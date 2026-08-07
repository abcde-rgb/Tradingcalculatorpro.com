/**
 * Servidor estático con fallback de SPA para `frontend/build`.
 *
 * React Router necesita que cualquier ruta desconocida devuelva `index.html`;
 * si no, entrar directo a /performance da 404 y la prueba mediría el servidor
 * en vez de la aplicación.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const path_ = require('path');
const ROOT = process.env.QA_BUILD
  || path_.join(__dirname, '..', '..', '..', 'frontend', 'build');
const PORT = Number(process.env.QA_PUERTO_WEB || 3100);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

// El build de producción lleva `PUBLIC_URL=/Tradingcalculatorpro.com` incrustado
// en las rutas de los assets, que es como se sirve en GitHub Pages. Se monta bajo
// esa misma base para probar el artefacto REAL: recompilarlo con otra base
// estaría probando un binario que nunca se publica.
const BASE_PATH = '/Tradingcalculatorpro.com';

http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === BASE_PATH) url = '/';
  else if (url.startsWith(BASE_PATH + '/')) url = url.slice(BASE_PATH.length);
  let file = path.join(ROOT, url);
  // Nunca servir fuera de la raíz del build.
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(ROOT, 'index.html');   // fallback SPA
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`sirviendo ${ROOT} en http://127.0.0.1:${PORT}`));
