import { io, Socket } from 'socket.io-client';
import { WS_URL, WS_ENABLED } from "@/shared/lib/env";

/**
 * Singleton Socket.IO client.
 *
 * The connection URL defaults to "" (same origin) which works correctly when
 * Vite proxies /socket.io → backend:3001 in development. In production, set
 * VITE_WS_URL to the backend URL explicitly.
 *
 * Auth: JWT access_token is passed in handshake.auth.token so the backend
 * WsGateway can validate it on connection.
 */

let _socket: Socket | null = null;
let _currentToken: string | null = null;

/**
 * Returns the existing socket when the token is unchanged, regardless of
 * `connected` state — socket.io manages reconnection internally. Creating a
 * new socket instance while the old one is mid-reconnect causes churn and
 * duplicate connection attempts from concurrent component mounts.
 */
export function getWsSocket(token: string): Socket | null {
  // P0-07: WS disabled via env flag — no connection attempted, no churn.
  if (!WS_ENABLED) {
    return null;
  }

  if (_socket && _currentToken === token) {
    return _socket;
  }

  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(WS_URL, {
    auth:                { token },
    transports:          ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay:    2_000,
    timeout:             10_000,
  });

  _currentToken = token;
  return _socket;
}

export function disconnectWsSocket(): void {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket        = null;
    _currentToken  = null;
  }
}
