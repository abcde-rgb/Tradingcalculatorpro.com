// craco.config.js
const path = require("path");
require("dotenv").config();

// ── El origen del WebSocket, derivado (NO un secreto más) ───────────────────
// `useWebSocketAlerts` abre `wss://<backend>/api/ws/alerts`, y la CSP del
// `meta` de `public/index.html` tiene que autorizarlo explícitamente: en CSP3
// una fuente `https://host` NO cubre una URL `wss://host` (la relajación de
// esquemas sólo va en el sentido contrario, `ws` → `http`/`https`).
//
// Se calcula aquí en vez de pedir un GitHub Secret nuevo porque así no puede
// desincronizarse del backend real, y porque un secreto que alguien olvide
// definir dejaría la directiva vacía — que es exactamente el fallo silencioso
// que el `meta` no permite ensayar (no admite report-only).
//
// Lo consume `%REACT_APP_BACKEND_WS_URL%` en `public/index.html`; CRA
// interpola cualquier variable `REACT_APP_*` presente en `process.env`, y
// craco carga este fichero antes de construir la configuración de webpack.
const _backend = (process.env.REACT_APP_BACKEND_URL || "").trim();
process.env.REACT_APP_BACKEND_WS_URL = _backend
  ? _backend.replace(/^http(s?):\/\//, (_m, s) => (s ? "wss://" : "ws://"))
  : "";

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

module.exports = webpackConfig;
