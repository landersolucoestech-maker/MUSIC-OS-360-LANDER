/**
 * billing/billing.module.ts
 *
 * Módulo Stripe Billing — checkout, portal, webhooks, features por plano.
 * WsGateway é @Global() — não precisa de importar WsModule explicitamente.
 */

import { Module }           from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService }    from './billing.service';
import { DunningService }    from './dunning.service';

@Module({
  controllers: [BillingController],
  providers:   [BillingService, DunningService],
  exports:     [BillingService, DunningService],
})
export class BillingModule {}
