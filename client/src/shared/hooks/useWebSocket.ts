import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { getWsSocket, disconnectWsSocket } from '@/shared/lib/ws-client';
import { getAccessToken } from '@/shared/lib/api-client';

const MOCK_MODE: boolean =
  import.meta.env.VITE_USE_MOCK !== 'false' &&
  import.meta.env.VITE_MOCK_MODE !== 'false';

/**
 * Establishes and maintains a single Socket.IO connection per session.
 *
 * - Skipped entirely in VITE_USE_MOCK mode (no backend available in dev).
 * - Authenticates via JWT (getAccessToken()) in the Socket.IO handshake.
 * - Returns the Socket instance and a `connected` flag.
 *
 * Components needing to subscribe to specific events should use `useWsEvent`.
 */
export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (MOCK_MODE) return;

    const token = getAccessToken();
    if (!token) return;

    const s = getWsSocket(token);
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
