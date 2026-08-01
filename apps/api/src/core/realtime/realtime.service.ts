/**
 * core/realtime/realtime.service.ts
 *
 * RealtimeService — replaces the Socket.IO WsGateway (core/websocket/) with
 * Supabase Realtime Broadcast, since Vercel Functions cannot hold a
 * persistent WebSocket connection between invocations.
 *
 * Every broadcast is sent server-side using the service_role key, which
 * bypasses RLS entirely — no client is ever authorized to publish a domain
 * event. Clients receive broadcasts by subscribing to the same topic names
 * this service uses (`tenant:<org_id>`, `user:<user_id>`) as PRIVATE
 * channels; whether a given client's JWT is allowed to join that topic is
 * decided by Postgres via the RLS policies added in
 * 20260801000001_RealtimeBroadcastAuthorization — this service has no
 * authorization logic of its own, matching how WsGateway's room-join
 * decision used to live in the gateway, not the emitters.
 *
 * If SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are unset (e.g. some local/test
 * setups), every method is a silent no-op — mirrors WsGateway's tolerance of
 * a missing Redis adapter (single-instance mode) rather than crashing.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly client: SupabaseClient | null;

  constructor(private readonly config: ConfigService) {
    const url            = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (url && serviceRoleKey) {
      this.client = createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      this.client = null;
      this.logger.warn(
        'RealtimeService: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes — broadcasts desativados (no-op)',
      );
    }
  }

  onModuleDestroy(): void {
    this.client?.removeAllChannels();
  }

  /** Publishes one broadcast message to a topic, then tears the channel back down. */
  private broadcast(topic: string, event: string, payload: unknown): void {
    if (!this.client) return;
    const client = this.client;

    const channel = client.channel(topic, { config: { private: true } });
    channel.subscribe((status: string, err?: Error) => {
      if (status === 'SUBSCRIBED') {
        channel
          .send({ type: 'broadcast', event, payload })
          .catch((sendErr: unknown) => {
            this.logger.warn(`RealtimeService: falha ao publicar em "${topic}" — ${String(sendErr)}`);
          })
          .finally(() => {
            client.removeChannel(channel);
          });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.logger.warn(`RealtimeService: falha ao conectar em "${topic}" (${status}) — ${err?.message ?? ''}`);
        client.removeChannel(channel);
      }
    });
  }

  /** Emite evento para todos os clientes do tenant. */
  sendToTenant(tenantId: string, event: string, data: unknown): void {
    this.broadcast(`tenant:${tenantId}`, event, data);
  }

  /**
   * Emite evento para um utilizador específico E para o tenant — preserva o
   * comportamento dual do WsGateway original (`.to(tenant).to(user).emit()`),
   * já que dashboards a observar o canal do tenant também esperavam ver
   * notificações individuais.
   */
  sendToUser(tenantId: string, userId: string, event: string, data: unknown): void {
    this.broadcast(`user:${userId}`, event, data);
    this.broadcast(`tenant:${tenantId}`, event, data);
  }

  /**
   * Notifica o tenant que um recurso foi alterado.
   * O frontend invalida a query correspondente ao receber este evento.
   */
  notifyDataChanged(tenantId: string, entity: string, id: string): void {
    this.broadcast(`tenant:${tenantId}`, 'data:changed', { entity, id });
  }
}
