import { client } from './performanceApi';

/**
 * Cliente del backtest validado.
 *
 * Reutiliza el `client` de `performanceApi` a propósito: lleva el interceptor
 * de refresco silencioso, y un segundo axios sin él cierra la sesión al primer
 * 401. Es el mismo motivo por el que `planApi` tampoco crea el suyo.
 *
 * El backend (`backtest.py`, 643 líneas) estaba escrito desde el 2026-08-22 y
 * sin una sola pantalla — hueco G-14, ficha en `docs/RUTAS_MUERTAS.md`. Esto es
 * la interfaz que faltaba.
 *
 * ⚠️ `/backtest/validate` descarga histórico diario real: en el sandbox de
 * desarrollo los proveedores de precio están bloqueados y devuelve el error de
 * «not enough history». Eso NO es un fallo de esta pantalla.
 */

/** Los juegos de reglas disponibles, con su rejilla de parámetros. Ruta pública. */
export async function listarEstrategias() {
  const { data } = await client.get('/backtest/strategies');
  return data;
}

/**
 * @param {object} req
 * @param {string} req.symbol      ticker
 * @param {string} req.strategy    id del juego de reglas
 * @param {'validated'|'walk_forward'|'single'} req.mode
 */
export async function validar(req) {
  const { data } = await client.post('/backtest/validate', req, { timeout: 120000 });
  return data;
}
