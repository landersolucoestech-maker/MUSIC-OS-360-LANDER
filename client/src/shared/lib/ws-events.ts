/**
 * Shared contract between backend WsEventsMapper and frontend useWsEvent.
 *
 * Each key is a Socket.IO event name emitted by the WsGateway; the value is
 * the expected payload shape. Use `WsEventMap[E]` in generic constraints so
 * TypeScript catches wrong payload types at compile time.
 *
 * Keep in sync with server/src/infrastructure/websocket/ws-events.mapper.ts
 */

export interface WsBasePayload {
  org_id: string;
  [key: string]: unknown;
}

export interface WsEventMap {
  'artist.created':             WsBasePayload & { id: string };
  'artist.updated':             WsBasePayload & { id: string };
  'artist.deleted':             WsBasePayload & { id: string };
  'catalog.music.registered':   WsBasePayload & { id: string };
  'catalog.phonogram.registered': WsBasePayload & { id: string };
  'contract.created':           WsBasePayload & { id: string };
  'contract.updated':           WsBasePayload & { id: string };
  'contract.signed':            WsBasePayload & { id: string };
  'crm.lead.captured':          WsBasePayload & { id: string };
  'crm.lead.converted':         WsBasePayload & { id: string };
  'finance.transaction.created': WsBasePayload & { id: string };
  'finance.transaction.updated': WsBasePayload & { id: string };
  'finance.calculated':         WsBasePayload & { period?: string };
  'audit.entry.created':        WsBasePayload & { action: string };
}

/** Union of all known WS event names (useful for exhaustive switches). */
export type WsEventName = keyof WsEventMap;
