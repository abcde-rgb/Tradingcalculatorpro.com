import { useEffect, useRef, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * URL del WebSocket de alertas.
 *
 * `conToken` decide si el JWT viaja en la cadena de consulta. Por defecto NO:
 * una URL con el token acaba escrita tal cual en los registros de acceso
 * —Cloud Run guarda la URL completa— y ahí sobrevive a la sesión que lo
 * emitió. El backend prefiere la cookie `access_token`, que viaja en una
 * cabecera que no se registra.
 *
 * El respaldo con token existe porque la cookie es `secure`: sobre
 * `http://localhost` el navegador no la guarda, y el banco de pruebas E2E
 * corre justo así. Se usa sólo si el servidor rechaza el intento sin
 * credencial visible.
 */
function getWsUrl(token, conToken) {
  if (!BACKEND_URL || !token) return null;
  const wsBase = BACKEND_URL.replace(/^https?/, (p) => (p === 'https' ? 'wss' : 'ws'));
  const base = `${wsBase}/api/ws/alerts`;
  return conToken ? `${base}?token=${encodeURIComponent(token)}` : base;
}

// El backend cierra con este código cuando no hay credencial válida.
const SIN_CREDENCIAL = 4401;

/**
 * Connects to the backend WebSocket for real-time price alerts.
 * Calls onMessage(data) whenever a push arrives.
 * Automatically reconnects with exponential back-off on disconnect.
 *
 * @param {string|null} token - JWT auth token; null/undefined disables the hook.
 * @param {(data: object) => void} onMessage - callback for each received message.
 */
export function useWebSocketAlerts(token, onMessage) {
  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const retryDelay = useRef(1000);
  // Se prueba primero por cookie. Si el servidor dice que no hay credencial,
  // se reintenta UNA vez con el token en la URL y se recuerda para las
  // reconexiones siguientes, para no repetir el rechazo en cada una.
  const conToken = useRef(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    const url = getWsUrl(token, conToken.current);
    if (!url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryDelay.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current?.(data);
      } catch (_) {}
    };

    ws.onclose = (event) => {
      if (wsRef.current !== ws) return; // closed by cleanup — skip retry
      wsRef.current = null;

      // La cookie no llegó (entorno sin cookies de terceros, o `http://`).
      // Se reintenta de inmediato con el token: es el mismo intento, no una
      // reconexión, así que no toca la espera exponencial.
      if (event.code === SIN_CREDENCIAL && !conToken.current) {
        conToken.current = true;
        connect();
        return;
      }

      retryRef.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000);
        connect();
      }, retryDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    // Cada sesión vuelve a empezar por la cookie: que una vez hiciera falta el
    // token no significa que haga falta siempre.
    conToken.current = false;
    connect();
    return () => {
      clearTimeout(retryRef.current);
      const ws = wsRef.current;
      if (ws) {
        wsRef.current = null; // signal onclose to skip retry
        ws.close();
      }
    };
  }, [connect, token]);
}
