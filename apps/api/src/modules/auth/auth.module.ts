/**
 * modules/auth/auth.module.ts
 *
 * Módulo de autenticação Clerk:
 *   - ClerkSyncService  → sincroniza org/users do webhook
 *   - ClerkWebhookController → endpoint POST /webhooks/clerk (enqueue via BullMQ)
 *
 * Os guards globais (ClerkAuthGuard, TenantGuard, RolesGuard)
 * são registados no AppModule via APP_GUARD para cobertura total.
 *
 * forwardRef(() => QueueModule) — resolve dependência circular:
 *   AuthModule → QueueModule (ClerkWebhookController precisa de @InjectQueue)
 *   QueueModule → AuthModule (ClerkSyncProcessor precisa de ClerkSyncService)
 */

import { Module, forwardRef } from '@nestjs/common';
import { ClerkSyncService }    from './clerk-sync.service';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { QueueModule }         from '../../queues/queue.module';

@Module({
  imports:     [forwardRef(() => QueueModule)],
  controllers: [ClerkWebhookController],
  providers:   [ClerkSyncService],
  exports:     [ClerkSyncService],
})
export class AuthModule {}
