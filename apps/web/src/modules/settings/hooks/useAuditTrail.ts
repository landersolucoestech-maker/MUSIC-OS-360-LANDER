/**
 * settings/hooks/useAuditTrail.ts
 *
 * Hook de leitura do Audit Trail.
 * - MOCK_MODE=true  → devolve dados mock estáticos (sem backend)
 * - MOCK_MODE=false → chama GET /audit-logs via storage.list
 *
 * O storage.list já serializa os filtros como query params para HTTP mode.
 */

import { useQuery } from "@tanstack/react-query";
import { storage } from "@/shared/lib/storage";
import { MOCK_MODE } from "@/shared/lib/env";

export interface AuditLogEntry {
  id: string;
  created_at: string;
  user_id: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  http_method: string | null;
  http_path: string | null;
  ip_address: string | null;
  correlation_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
}

export interface AuditTrailFilters {
  action?: string;
  entity?: string;
  entityId?: string;
  actorRole?: string;
  correlationId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

const MOCK_AUDIT_TRAIL: AuditLogEntry[] = [
  {
    id: "a001",
    created_at: "2026-05-16T10:23:45Z",
    user_id: "user_admin_01",
    actor_role: "owner",
    action: "contract.created",
    entity: "contract",
    entity_id: "ct-0045",
    http_method: "POST",
    http_path: "/api/v1/contracts",
    ip_address: "192.168.1.100",
    correlation_id: "corr-abc-001",
    before: null,
    after: { id: "ct-0045", titulo: "Contrato Gravação 2026", status: "rascunho" },
    diff: null,
  },
  {
    id: "a002",
    created_at: "2026-05-16T09:11:22Z",
    user_id: "user_manager_02",
    actor_role: "admin",
    action: "artist.updated",
    entity: "artist",
    entity_id: "art-0012",
    http_method: "PATCH",
    http_path: "/api/v1/artists/art-0012",
    ip_address: "192.168.1.101",
    correlation_id: "corr-abc-002",
    before: { nome_artistico: "Silva MC", genero_musical: "Funk" },
    after:  { nome_artistico: "Silva MC Jr.", genero_musical: "Trap" },
    diff: {
      nome_artistico: { from: "Silva MC", to: "Silva MC Jr." },
      genero_musical:  { from: "Funk",     to: "Trap" },
    },
  },
  {
    id: "a003",
    created_at: "2026-05-15T16:44:10Z",
    user_id: "user_admin_01",
    actor_role: "owner",
    action: "integration.connected",
    entity: "integration",
    entity_id: null,
    http_method: "POST",
    http_path: "/api/v1/integrations/spotify/callback",
    ip_address: "192.168.1.100",
    correlation_id: "corr-def-003",
    before: null,
    after: { platform: "spotify", status: "connected" },
    diff: null,
  },
  {
    id: "a004",
    created_at: "2026-05-15T14:30:05Z",
    user_id: "user_manager_02",
    actor_role: "admin",
    action: "release.updated",
    entity: "release",
    entity_id: "rel-0007",
    http_method: "PATCH",
    http_path: "/api/v1/releases/rel-0007",
    ip_address: "192.168.1.101",
    correlation_id: "corr-ghi-004",
    before: { status: "rascunho",  distribuidora: null },
    after:  { status: "aprovado",  distribuidora: "Believe" },
    diff: {
      status:        { from: "rascunho", to: "aprovado" },
      distribuidora: { from: null,       to: "Believe" },
    },
  },
  {
    id: "a005",
    created_at: "2026-05-14T11:05:33Z",
    user_id: "user_editor_03",
    actor_role: "editor",
    action: "upload.confirmed",
    entity: "upload",
    entity_id: "upl-0003",
    http_method: "POST",
    http_path: "/api/v1/uploads/upl-0003/confirm",
    ip_address: "192.168.1.102",
    correlation_id: "corr-jkl-005",
    before: { status: "pending" },
    after:  { status: "confirmed" },
    diff: { status: { from: "pending", to: "confirmed" } },
  },
  {
    id: "a006",
    created_at: "2026-05-14T09:20:00Z",
    user_id: "user_admin_01",
    actor_role: "owner",
    action: "billing.checkout_started",
    entity: "billing",
    entity_id: null,
    http_method: "POST",
    http_path: "/api/v1/billing/checkout",
    ip_address: "192.168.1.100",
    correlation_id: "corr-mno-006",
    before: null,
    after: { plan: "pro", status: "session_created" },
    diff: null,
  },
  {
    id: "a007",
    created_at: "2026-05-13T15:45:18Z",
    user_id: "user_manager_02",
    actor_role: "admin",
    action: "contract.cancelled",
    entity: "contract",
    entity_id: "ct-0032",
    http_method: "DELETE",
    http_path: "/api/v1/contracts/ct-0032",
    ip_address: "192.168.1.101",
    correlation_id: "corr-pqr-007",
    before: { status: "vigente", titulo: "Contrato Antigo" },
    after:  { status: "cancelado" },
    diff: { status: { from: "vigente", to: "cancelado" } },
  },
];

export function useAuditTrail(filters: AuditTrailFilters = {}) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ["audit_logs", filters],
    queryFn: async () => {
      if (MOCK_MODE) {
        return MOCK_AUDIT_TRAIL;
      }
      return storage.list<AuditLogEntry>("audit_logs", {
        filters: {
          action:        filters.action,
          entity:        filters.entity,
          entityId:      filters.entityId,
          actorRole:     filters.actorRole,
          correlationId: filters.correlationId,
          fromDate:      filters.fromDate,
          toDate:        filters.toDate,
        },
        limit:   filters.limit  ?? 100,
        offset:  filters.offset ?? 0,
        orderBy: { column: "created_at", ascending: false },
      });
    },
    staleTime: 30_000,
  });
}
