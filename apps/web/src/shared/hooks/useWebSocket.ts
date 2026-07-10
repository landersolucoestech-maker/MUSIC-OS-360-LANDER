import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { getWsSocket, disconnectWsSocket } from '@/shared/lib/ws-client';
import { getAccessToken } from '@/shared/lib/api-client';

/**
 * Establishes and maintains a single Socket.IO connection per session.
 *
 * - Skipped entirely in VITE_USE_MOCK mode (no backend available in dev).
 * - Authenticates via JWT (getAccessToken()) in the Socket.IO handshake.
 * - Returns the Socket instance and a `connected` flag.
 *
 * Components needing to subscribe to specific events should use `useWsEvent`.
 */
export function useWebSocket(): { socket: Socket | null; connected: boolean } {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {

    const token = getAccessToken();
    if (!token) return;

    const s = getWsSocket(token);
    if (!s) return; // P0-07: WS disabled via VITE_WS_ENABLED=false — components fall back to polling
    setSocket(s);

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect',    onConnect);
    s.on('disconnect', onDisconnect);

    if (s.connected) setConnected(true);

    return () => {
      s.off('connect',    onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket, connected };
}

export { disconnectWsSocket };
