import { useEffect, useRef } from 'react';
import type { WsEventMap } from '@/shared/lib/ws-events';
import { useWebSocket } from './useWebSocket';

/**
 * Subscribes to a typed Socket.IO event from the backend WebSocket gateway.
 *
 * The generic `E` is constrained to `keyof WsEventMap` so TypeScript enforces
 * the correct payload type for every known event name. Use the string overload
 * for ad-hoc events not in the map.
 *
 * Usage (typed):
 *   useWsEvent('artist.created', (data) => {
 *     // data is WsEventMap['artist.created'] → { id: string; org_id: string }
 *     queryClient.invalidateQueries({ queryKey: ['artists'] });
 *   });
 *
 * Usage (untyped escape-hatch):
 *   useWsEvent<{ foo: string }>('custom.event', (data) => { ... });
 *
 * The handler is kept stable via a ref — safe to pass inline functions.
 * Unsubscribes automatically when the component unmounts or event changes.
 */
export function useWsEvent<E extends keyof WsEventMap>(
  event: E,
  handler: (data: WsEventMap[E]) => void,
): void;
export function useWsEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
): void;
export function useWsEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
): void {
  const { socket } = useWebSocket();

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;

    const cb = (data: T) => handlerRef.current(data);
    socket.on(event, cb as (...args: unknown[]) => void);

    return () => {
      socket.off(event, cb as (...args: unknown[]) => void);
    };
  }, [socket, event]);
}
