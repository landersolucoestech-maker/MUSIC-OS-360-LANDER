/**
 * Shared contract between backend WsEventsMapper and frontend useWsEvent.
 *
 * Each key is a Socket.IO event name emitted by the WsGateway; the value is
 * the expected payload shape. Use `WsEventMap[E]` in generic constraints so
 * TypeScript catches wrong payload types at compile time.
 *
 * Keep in sync with apps/api/src/core/websocket/ws.gateway.ts
 */

export interface WsBasePayload {
  org_id: string;
  [key: string]: unknown;
}

export interface WsNotificationPayload {
  id:        string | null;
  title:     string;
  body?:     string | null;
  type:      string;
  entity?:   string | null;
  entityId?: string | null;
  createdAt: string | Date;
}

export interface WsEventMap {
  // ── Artistas ────────────────────────────────────────────────────────────────
  'artist.created':               WsBasePayload & { id: string };
  'artist.updated':               WsBasePayload & { id: string };
  'artist.deleted':               WsBasePayload & { id: string };

  // ── Catálogo ─────────────────────────────────────────────────────────────────
  'catalog.music.registered':     WsBasePayload & { id: string };
  'catalog.phonogram.registered': WsBasePayload & { id: string };

  // ── Contratos ────────────────────────────────────────────────────────────────
  'contract.created':             WsBasePayload & { id: string };
  'contract.updated':             WsBasePayload & { id: string };
  'contract.signed':              WsBasePayload & { id: string };

  // ── CRM ──────────────────────────────────────────────────────────────────────
  'crm.lead.captured':            WsBasePayload & { id: string };
  'crm.lead.converted':           WsBasePayload & { id: string };

  // ── Financeiro ───────────────────────────────────────────────────────────────
  'finance.transaction.created':  WsBasePayload & { id: string };
  'finance.transaction.updated':  WsBasePayload & { id: string };
  'finance.calculated':           WsBasePayload & { period?: string };

  // ── Audit ────────────────────────────────────────────────────────────────────
  'audit.entry.created':          WsBasePayload & { action: string };

  // ── Notificações individuais (FASE 4) ─────────────────────────────────────
  'notification:new':             WsNotificationPayload;

  // ── Billing (FASE 6 — Stripe) ────────────────────────────────────────────────
  'billing:plan_upgraded':        { org_id: string; plan: string };
  'billing:trial_ending':         { org_id: string; days_left: number };
  'billing:payment_failed':       { org_id: string; invoice_id: string };
  'billing:cancelled':            { org_id: string };

  // ── Dados alterados (invalidação de cache) ───────────────────────────────────
  'data:changed':                 { entity: string; id: string };
}

/** Union of all known WS event names (useful for exhaustive switches). */
export type WsEventName = keyof WsEventMap;

