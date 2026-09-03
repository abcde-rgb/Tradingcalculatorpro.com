import { client } from './performanceApi';

/**
 * La comunidad: cliente de las rutas de `backend/forum.py`.
 *
 * No hay lógica aquí. El backend decide qué se ve, qué se ordena y qué se
 * publica; este fichero sólo transporta. Tres cosas que sí conviene saber
 * desde la pantalla:
 *
 *   · **409 al publicar** no es un error de validación: significa «este
 *     usuario todavía no ha elegido seudónimo». Se traduce a `faltaSeudonimo`
 *     para que la pantalla abra el diálogo en vez de enseñar un error rojo.
 *   · **La respuesta NUNCA trae el correo, el nombre ni el id de nadie.** La
 *     identidad pública es el `handle`, y se sigue a la gente por él. Si algún
 *     día aparece un `author_id` en un objeto de aquí, es un fallo del backend
 *     y hay un test suyo que debería haber saltado antes.
 *   · **`windowExhausted`** dice que el total es el de la ventana de orden y
 *     no el del foro entero. La pantalla lo enseña en vez de publicar una
 *     cifra que no es.
 *
 * Se reutiliza el `client` de `performanceApi` a propósito: lleva el
 * interceptor de refresco silencioso. Un segundo axios sin él cierra la sesión
 * al primer 401.
 */

/** Categorías, productos, órdenes e idiomas. La pantalla no escribe listas a mano. */
export async function getForumMeta() {
  const { data } = await client.get('/forum/meta');
  return data;
}

/** Mi perfil de la comunidad. `configured:false` = todavía sin seudónimo. */
export async function getMyForumProfile() {
  const { data } = await client.get('/forum/profile/me');
  return data;
}

/** Elige o cambia el seudónimo. Lanza `enUso` si otro lo tiene. */
export async function saveForumProfile({ handle, bio }) {
  try {
    const { data } = await client.put('/forum/profile', { handle, bio });
    return data.profile;
  } catch (err) {
    const status = err?.response?.status;
    if (status === 409) {
      const e = new Error('handle_taken');
      e.enUso = true;
      throw e;
    }
    if (status === 400) {
      const e = new Error(err?.response?.data?.detail || 'handle_invalid');
      e.invalido = true;
      e.detalle = err?.response?.data?.detail;
      throw e;
    }
    throw err;
  }
}

/**
 * Los hilos.
 *
 * `following: true` pide sólo los de quien sigues y exige sesión. Sin él, los
 * de quien sigues igualmente suben dentro del orden pedido — eso lo hace el
 * backend, no esta función.
 */
export async function listThreads({
  category, product, symbol, tag, q,
  order = 'actividad', following = false, page = 1, pageSize = 20,
} = {}) {
  const params = { order, page, pageSize };
  if (category) params.category = category;
  if (product) params.product = product;
  if (symbol) params.symbol = symbol;
  if (tag) params.tag = tag;
  if (q) params.q = q;
  if (following) params.following = true;
  const { data } = await client.get('/forum/threads', { params });
  return data;
}

/** Un hilo con sus respuestas. Registra la visita (deduplicada por día). */
export async function getThread(threadId) {
  const { data } = await client.get(`/forum/threads/${encodeURIComponent(threadId)}`);
  return data;
}

/** Publica un hilo. Lanza `faltaSeudonimo` si aún no se eligió uno. */
export async function createThread(payload) {
  try {
    const { data } = await client.post('/forum/threads', payload);
    return data.thread;
  } catch (err) {
    if (err?.response?.status === 409) {
      const e = new Error('handle_required');
      e.faltaSeudonimo = true;
      throw e;
    }
    throw err;
  }
}

export async function replyToThread(threadId, payload) {
  try {
    const { data } = await client.post(
      `/forum/threads/${encodeURIComponent(threadId)}/replies`, payload);
    return data.reply;
  } catch (err) {
    if (err?.response?.status === 409) {
      const e = new Error('handle_required');
      e.faltaSeudonimo = true;
      throw e;
    }
    throw err;
  }
}

export async function deleteThread(threadId) {
  await client.delete(`/forum/threads/${encodeURIComponent(threadId)}`);
}

/**
 * Me gusta. `liked` decide si se pone o se quita; devuelve el estado real.
 *
 * Las dos rutas se escriben ENTERAS y no como `/forum/${base}/…`: una URL
 * construida a trozos no la encuentra ni `check-rutas-muertas.py` —que las dio
 * por rutas sin consumidor— ni nadie que busque el endpoint en el repo.
 */
export async function toggleLike({ type, id, liked }) {
  const idSeguro = encodeURIComponent(id);
  const url = type === 'thread'
    ? `/forum/threads/${idSeguro}/like`
    : `/forum/replies/${idSeguro}/like`;
  const { data } = liked ? await client.delete(url) : await client.post(url);
  return data.liked;
}

export async function followMember(handle, seguir = true) {
  const url = `/forum/members/${encodeURIComponent(handle)}/follow`;
  const { data } = seguir ? await client.post(url) : await client.delete(url);
  return data.following;
}

/** Moderación (solo admin): las denuncias abiertas. */
export async function getForumReports(status = 'abierta') {
  const { data } = await client.get('/forum/moderation/reports', { params: { status } });
  return data.reports;
}

/** Moderación (solo admin): oculta o vuelve a mostrar un mensaje denunciado. */
export async function moderateForumTarget({ type, id, accion }) {
  const idSeguro = encodeURIComponent(id);
  const url = type === 'thread'
    ? `/forum/moderation/thread/${idSeguro}/${accion}`
    : `/forum/moderation/reply/${idSeguro}/${accion}`;
  const { data } = await client.post(url);
  return data;
}

export async function getMember(handle) {
  const { data } = await client.get(`/forum/members/${encodeURIComponent(handle)}`);
  return data;
}

/**
 * Traduce un mensaje al idioma pedido.
 *
 * Devuelve `translated:false` cuando el mensaje ya está en ese idioma — no es
 * un fallo, y la pantalla no debe enseñar nada distinto en ese caso.
 */
export async function translateMessage({ type, id, targetLang }) {
  const { data } = await client.post('/forum/translate', {
    targetType: type, targetId: id, targetLang,
  });
  return data;
}

export async function reportMessage({ type, id, reason }) {
  const { data } = await client.post('/forum/report', {
    targetType: type, targetId: id, reason,
  });
  return data;
}
