import { client } from './performanceApi';

/**
 * El plan de trading: cliente de las cinco rutas de `trading_plan.py`.
 *
 * El módulo del backend lleva escrito, probado y versionado desde el 2026-07-30
 * y hasta hoy no había una sola pantalla que lo llamara — era la mitad del hueco
 * G-14. No hay lógica aquí: el backend recorta, valida y decide, y este fichero
 * sólo transporta. Lo único que hace falta saber desde el frontend es qué
 * significan sus dos respuestas raras:
 *
 *   · **404 en `/plan` no es un error.** Significa «este usuario todavía no ha
 *     escrito ninguno», que es el estado inicial de todo el mundo. Se traduce a
 *     `null` para que la pantalla no tenga que mirar códigos HTTP.
 *   · **422 al publicar** es la regla de negocio: a partir de la v2 hay que
 *     escribir por qué cambias el plan. No es un fallo de validación de forma,
 *     es el freno que existe para que un plan no se erosione a base de
 *     excepciones sin registrar.
 */

/** El plan activo, o `null` si nunca se escribió uno. */
export async function getActivePlan() {
  try {
    const { data } = await client.get('/plan');
    return data;
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

/** Todas las versiones, la más nueva primero, con cuántas operaciones gobernó cada una. */
export async function getPlanHistory() {
  const { data } = await client.get('/plan/history');
  return data;
}

/**
 * Publica una versión y la activa.
 *
 * `changeReason` es obligatorio a partir de la segunda: si falta, el backend
 * responde 422 y aquí se convierte en un error con `motivoRequerido` para que la
 * pantalla pida la frase en vez de enseñar un error genérico.
 */
export async function publishPlan(plan, changeReason = '') {
  try {
    const { data } = await client.post('/plan', { ...plan, change_reason: changeReason });
    return data;
  } catch (err) {
    if (err?.response?.status === 422) {
      const e = new Error('change_reason_required');
      e.motivoRequerido = true;
      throw e;
    }
    throw err;
  }
}

/** Guarda el borrador sin activarlo: el asistente sobrevive a una recarga. */
export async function savePlanDraft(plan) {
  const { data } = await client.patch('/plan/draft', plan);
  return data;
}

/** Cumplimiento del plan activo, con lo que costó cada regla rota. Premium. */
export async function getPlanCompliance() {
  try {
    const { data } = await client.get('/plan/compliance');
    return data;
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}
