/**
 * billing/billing.controller.ts
 *
 * Controller Stripe Billing — 4 rotas:
 *   POST /api/v1/billing/checkout         — criar sessão de checkout
 *   POST /api/v1/billing/portal           — abrir portal de gestão
 *   GET  /api/v1/billing/subscription     — assinatura actual
 *   POST /api/v1/billing/webhooks/stripe  — webhook HMAC validado (público)
 *
 * JwtAuthGuard + TenantGuard correm globalmente (APP_GUARD).
 * checkout/portal/subscription exigem role owner+ (gestão financeira crítica).
 * O webhook é marcado @Public() — verificação HMAC feita no BillingService.
 */

import {
  Controller, Post, Get, Body, Headers,
  Req, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant }   from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }     from '../../core/decorators/current-user.decorator';
import { RequireRole }     from '../../core/decorators/roles.decorator';
import { Public }          from '../../core/decorators/public.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import { BillingService }  from './billing.service';
import { CreateCheckoutDto, CreatePortalDto } from './dto/billing.dto';
import type { Request }    from 'express';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('checkout')
  @RequireRole('owner')
  @Audit('billing.checkout_started')
  @ApiOperation({ summary: 'Criar sessão de checkout Stripe (owner+)' })
  checkout(
    @CurrentTenant() tenant: any,
    @Body() body: CreateCheckoutDto,
  ) {
    return this.billing.createCheckoutSession({
      orgId:      tenant.org_id,
      tenantId:   tenant.id,
      plan:       body.plan,
      successUrl: body.successUrl,
      cancelUrl:  body.cancelUrl,
    });
  }

  @Post('portal')
  @RequireRole('owner')
  @Audit('billing.portal_opened')
  @ApiOperation({ summary: 'Criar sessão do portal de gestão Stripe (owner+)' })
  portal(
    @CurrentTenant() tenant: any,
    @Body() body: CreatePortalDto,
  ) {
    return this.billing.createPortalSession(tenant.org_id, body.returnUrl);
  }

  @Get('subscription')
  @RequireRole('admin')
  @ApiOperation({ summary: 'Obter assinatura actual (admin+)' })
  getSubscription(@CurrentTenant() tenant: any) {
    return this.billing.getSubscription(tenant.org_id);
  }

  @Post('webhooks/stripe')
  @Public()
  @ApiOperation({ summary: 'Webhook Stripe (HMAC validado, sem autenticação)' })
  webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.billing.handleWebhook(signature, req.rawBody as Buffer);
  }
}
