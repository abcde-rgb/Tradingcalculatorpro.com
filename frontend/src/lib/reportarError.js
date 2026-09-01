/**
 * Informar al panel de admin de una caída del navegador.
 *
 * El `ErrorBoundary` sólo hacía `console.error`. Una consola en el navegador de
 * otra persona no la lee nadie: el admin tenía una tarjeta «Monitor de Errores»
 * que pintaba «✓ Sin errores pendientes» tanto si la web iba fina como si se
 * caía cada dos minutos. Este módulo es el que llena esa tabla.
 *
 * Reglas de las que depende que esto no empeore lo que ya está roto:
 *
 * - **Nunca lanza.** Lo llama código que ya está dentro de un fallo. Un error
 *   aquí sería un error dentro del error, y el usuario vería la pantalla en
 *   blanco en vez de la de «algo salió mal».
 * - **Nunca bloquea.** No se espera al `fetch`; la pantalla de error se pinta
 *   igual aunque el backend esté caído.
 * - **Tope por sesión.** Un bucle de render vuelve a caer en cada intento. Sin
 *   tope, una sola pestaña rota dispara cientos de peticiones.
 * - **No manda nada que el usuario haya escrito.** Sólo tipo, mensaje, ruta sin
 *   query ni fragmento, y las primeras líneas de la pila. El servidor vuelve a
 *   redactar por su cuenta: aquí no hay última palabra.
 */

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : null;

/** Informes distintos que una sola carga de página puede mandar. */
const TOPE_POR_SESION = 8;
/** Huellas ya enviadas: el mismo fallo repetido no se manda dos veces. */
const yaEnviados = new Set();
let enviados = 0;

/** Identidad del fallo tal y como la agrupa el backend, para no repetir. */
function huella(tipo, mensaje, ruta) {
  return `${tipo}|${String(mensaje).replace(/\d+/g, '#')}|${ruta}`;
}

/**
 * Un chunk que ya no existe en el servidor NO es un bug del código: es una
 * pestaña abierta desde antes del último deploy (ver `appShell.js`). Se informa
 * igual —saber cuánta gente se lo come tiene valor— pero con 409 en vez de 500,
 * para que no se mezcle en rojo con las caídas de verdad.
 */
function esShellCaducado(error) {
  const t = `${error?.name || ''} ${error?.message || ''}`;
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed/i.test(t);
}

/** Hash del bundle cargado: dice si la caída es en la build actual o en una vieja. */
function versionDelShell() {
  try {
    const s = document.querySelector('script[src*="/static/js/main."]');
    return s ? (s.getAttribute('src').match(/main\.([\w]+)\.js/)?.[1] || null) : null;
  } catch { return null; }
}

/**
 * @param {Error|any} error       lo que se ha roto
 * @param {object}    [opciones]
 * @param {string}    [opciones.componentStack] pila de componentes de React
 * @param {string}    [opciones.source] `boundary` | `promesa` | `window`
 */
export function reportarError(error, { componentStack = '', source = 'boundary' } = {}) {
  try {
    if (!API) return;                       // sin backend configurado no hay a dónde
    if (enviados >= TOPE_POR_SESION) return;

    const tipo = String(error?.name || (error ? error.constructor?.name : '') || 'Error').slice(0, 80);
    const mensaje = String(error?.message ?? error ?? '').slice(0, 500);
    if (!mensaje) return;

    // Sin query ni fragmento: ahí viajan los tokens de reseteo y los códigos
    // de OAuth. La ruta sola basta para saber qué pantalla se rompió.
    const ruta = `${window.location.pathname}`.split('?')[0].split('#')[0].slice(0, 200) || '/';

    const clave = huella(tipo, mensaje, ruta);
    if (yaEnviados.has(clave)) return;
    yaEnviados.add(clave);
    enviados += 1;

    const cuerpo = {
      type: tipo,
      message: mensaje,
      path: ruta,
      component_stack: String(componentStack || '').slice(0, 2000) || null,
      stack: String(error?.stack || '').slice(0, 2000) || null,
      status_code: esShellCaducado(error) ? 409 : 500,
      source,
      app_version: versionDelShell(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };

    // `keepalive`: si el usuario recarga o navega justo después de la caída, la
    // petición sobrevive a la descarga de la página. Sin esto, el informe del
    // error que más molesta —el que hace que la gente recargue— es el que nunca
    // llega. Y `.catch(() => {})` porque un informe que falla no es un evento.
    fetch(`${API}/errors/report`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }).catch(() => {});
  } catch {
    /* informar no puede ser la causa de nada */
  }
}

/**
 * Errores que NUNCA llegan a un `ErrorBoundary`: una promesa rechazada sin
 * `catch` y un error suelto fuera del árbol de React. Son la mayoría de los
 * fallos reales —un `await fetch(...)` que revienta en un `useEffect` no tumba
 * el render, sólo deja la pantalla a medias— y hasta ahora no los veía nadie.
 * Se instala una sola vez.
 */
let instalado = false;
export function instalarCazadorGlobal() {
  if (instalado || typeof window === 'undefined') return;
  instalado = true;

  window.addEventListener('unhandledrejection', (ev) => {
    const razon = ev?.reason;
    // Un `AbortError` es una petición que se cancela a propósito al desmontar
    // un componente. Es el funcionamiento normal, no un fallo: informarlo
    // llenaría el monitor de ruido y taparía lo que sí importa.
    if (razon?.name === 'AbortError') return;
    reportarError(razon, { source: 'promesa' });
  });

  window.addEventListener('error', (ev) => {
    // `ev.error` sólo viene en errores de script. Un `<img>` roto también
    // dispara este evento y no trae `error`: eso no es una caída.
    if (!ev?.error) return;
    reportarError(ev.error, { source: 'window' });
  });
}

/** Sólo para tests: vuelve a dejar el módulo como recién cargado. */
export function _resetParaTests() {
  yaEnviados.clear();
  enviados = 0;
  instalado = false;
}
