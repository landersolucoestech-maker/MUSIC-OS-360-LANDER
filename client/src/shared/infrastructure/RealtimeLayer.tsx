import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/app/providers/AuthContext';
import { useRealtimeSync } from '@/shared/hooks/useRealtimeSync';
import { useWsEvent } from '@/shared/hooks/useWsEvent';

/**
 * Mounts all real-time subscriptions for the authenticated session.
 *
 * Renders null — pure side-effect component.
 * Must be inside: QueryClientProvider → AuthProvider.
 *
 * Responsibilities:
 *   1. useRealtimeSync  — WS events → TanStack Query cache invalidation
 *   2. Inline WS toasts — user-visible notifications for key domain events
 *
 * In mock mode (VITE_USE_MOCK=true) the socket is never created so all
 * useWsEvent hooks no-op silently.
 */
function RealtimeSyncAndNotify() {
  // ── Cache invalidation ───────────────────────────────────────────────────
  useRealtimeSync();

  // ── Toast notifications for key events ───────────────────────────────────
  useWsEvent('artist.created', (d) => {
    const label = (d as { nome_artistico?: string }).nome_artistico;
    toast.success('Artista cadastrado', {
      description: label ? `"${label}" foi adicionado ao roster` : undefined,
    });
  });

  useWsEvent('contract.created', () => {
    toast.info('Novo contrato criado', { description: 'Verifique a fila de contratos pendentes' });
  });

  useWsEvent('contract.signed', () => {
    toast.success('Contrato assinado', { description: 'Assinatura digital confirmada' });
  });

  useWsEvent('crm.lead.captured', (d) => {
    const nome = (d as { nome?: string }).nome;
    toast.info('Novo lead capturado', {
      description: nome ? `Lead "${nome}" adicionado ao CRM` : undefined,
    });
  });

  useWsEvent('crm.lead.converted', () => {
    toast.success('Lead convertido', { description: 'Lead promovido a artista/cliente' });
  });

  useWsEvent('finance.transaction.created', (d) => {
    const tipo = (d as { tipo?: string }).tipo ?? 'transação';
    toast.info(`Nova ${tipo} registrada`, { description: 'Financeiro atualizado' });
  });

  useWsEvent('finance.calculated', () => {
    toast.success('Apuração concluída', { description: 'Financeiro recalculado com sucesso' });
  });

  useWsEvent('catalog.music.registered', (d) => {
    const titulo = (d as { titulo?: string }).titulo;
    toast.success('Música registrada', {
      description: titulo ? `"${titulo}" adicionada ao catálogo` : 'Nova obra no catálogo',
    });
  });

  return null;
}

/**
 * Guard: only mounts subscriptions when the user is authenticated.
 * Avoids spurious WS connection attempts on login/logout transitions.
 */
export function RealtimeLayer() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  return <RealtimeSyncAndNotify />;
}
