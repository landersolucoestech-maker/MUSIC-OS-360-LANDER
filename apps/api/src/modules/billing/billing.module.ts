/**
 * billing/billing.module.ts
 *
 * Módulo Stripe Billing — checkout, portal, webhooks, features por plano.
 * RealtimeService é @Global() — não precisa de importar RealtimeModule explicitamente.
 */

import { Module }           from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService }    from './billing.service';
import { DunningService }    from './dunning.service';
import { BillingEnforcementService } from './billing-enforcement.service';
import { BillingPlansService } from './billing-plans.service';

@Module({
  controllers: [BillingController],
  providers:   [BillingService, BillingEnforcementService, DunningService, BillingPlansService],
  exports:     [BillingService, BillingEnforcementService, DunningService, BillingPlansService],
})
export class BillingModule {}
