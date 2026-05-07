import { useQueryClient } from '@tanstack/react-query';
import { useWsEvent } from './useWsEvent';
import { QUERY_KEYS } from '@/shared/lib/query-config';

/**
 * Subscribes to every backend WS domain event and invalidates the relevant
 * TanStack Query caches so lists/metrics stay fresh without polling.
 *
 * Gracefully no-ops in mock mode (socket is null → useWsEvent skips).
 * Mount this hook inside a component that lives for the entire authenticated
 * session (e.g. RealtimeLayer rendered inside AuthProvider).
 */
export function useRealtimeSync(): void {
  const qc = useQueryClient();

  const inv = (...keys: readonly string[][]): void => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };

  // ── Artists ─────────────────────────────────────────────────────────────────
  useWsEvent('artist.created', () => inv(QUERY_KEYS.ARTISTAS, QUERY_KEYS.METRICS));
  useWsEvent('artist.updated', () => inv(QUERY_KEYS.ARTISTAS));
  useWsEvent('artist.deleted', () => inv(QUERY_KEYS.ARTISTAS, QUERY_KEYS.METRICS));

  // ── Catalog ──────────────────────────────────────────────────────────────────
  useWsEvent('catalog.music.registered',     () => inv(QUERY_KEYS.OBRAS, QUERY_KEYS.FONOGRAMAS, QUERY_KEYS.METRICS));
  useWsEvent('catalog.phonogram.registered', () => inv(QUERY_KEYS.FONOGRAMAS));

  // ── Contracts ────────────────────────────────────────────────────────────────
  useWsEvent('contract.created', () => inv(QUERY_KEYS.CONTRATOS, QUERY_KEYS.METRICS, QUERY_KEYS.NOTIFICATIONS));
  useWsEvent('contract.updated', () => inv(QUERY_KEYS.CONTRATOS));
  useWsEvent('contract.signed',  () => inv(QUERY_KEYS.CONTRATOS, QUERY_KEYS.NOTIFICATIONS));

  // ── CRM ──────────────────────────────────────────────────────────────────────
  useWsEvent('crm.lead.captured',   () => inv(QUERY_KEYS.LEADS, QUERY_KEYS.METRICS));
  useWsEvent('crm.lead.converted',  () => inv(QUERY_KEYS.LEADS, QUERY_KEYS.ARTISTAS, QUERY_KEYS.METRICS));

  // ── Finance ──────────────────────────────────────────────────────────────────
  useWsEvent('finance.transaction.created', () => inv(QUERY_KEYS.TRANSACOES, QUERY_KEYS.METRICS));
  useWsEvent('finance.transaction.updated', () => inv(QUERY_KEYS.TRANSACOES));
  useWsEvent('finance.calculated',          () => inv(QUERY_KEYS.METRICS, QUERY_KEYS.TRANSACOES));

  // ── Audit (no query to invalidate — feed handles via ActivityFeed) ────────
  useWsEvent('audit.entry.created', () => {});
}
