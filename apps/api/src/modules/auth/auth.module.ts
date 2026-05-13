/**
 * modules/auth/auth.module.ts
 *
 * Módulo de autenticação Clerk:
 *   - ClerkSyncService  → sincroniza org/users do webhook
 *   - ClerkWebhookController → endpoint POST /webhooks/clerk
 *
 * Os guards globais (ClerkAuthGuard, TenantGuard, RolesGuard)
 * são registados no AppModule via APP_GUARD para cobertura total.
 */

import { Module } from '@nestjs/common';
import { ClerkSyncService } from './clerk-sync.service';
import { ClerkWebhookController } from './clerk-webhook.controller';

@Module({
  controllers: [ClerkWebhookController],
  providers:   [ClerkSyncService],
  exports:     [ClerkSyncService],
})
export class AuthModule {}
