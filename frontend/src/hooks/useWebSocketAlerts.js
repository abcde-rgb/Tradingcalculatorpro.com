import { useEffect, useRef, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function getWsUrl(token) {
  if (!BACKEND_URL || !token) return null;
  const wsBase = BACKEND_URL.replace(/^https?/, (p) => (p === 'https' ? 'wss' : 'ws'));
  return `${wsBase}/api/ws/alerts?token=${encodeURIComponent(token)}`;
}

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
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    const url = getWsUrl(token);
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

    ws.onclose = () => {
      if (wsRef.current !== ws) return; // closed by cleanup — skip retry
      wsRef.current = null;
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
