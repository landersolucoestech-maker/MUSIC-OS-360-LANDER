/**
 * billing/billing.controller.ts
 *
 * Controller Stripe Billing — 4 rotas:
 *   POST /api/v1/billing/checkout     — criar sessão de checkout
 *   POST /api/v1/billing/portal       — abrir portal de gestão
 *   GET  /api/v1/billing/subscription — assinatura actual
 *   POST /api/v1/billing/webhooks/stripe — webhook HMAC validado (público)
 */

import {
  Controller, Post, Get, Body, Headers,
  Req, UseGuards, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard }  from '../../core/guards/clerk-auth.guard';
import { TenantGuard }     from '../../core/guards/tenant.guard';
import { CurrentTenant }   from '../../core/decorators/current-tenant.decorator';
import { Public }          from '../../core/decorators/public.decorator';
import { BillingService }  from './billing.service';
import { CreateCheckoutDto, CreatePortalDto } from './dto/billing.dto';
import type { Request }    from 'express';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('checkout')
  @UseGuards(ClerkAuthGuard, TenantGuard)
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Criar sessão de checkout Stripe' })
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
  @UseGuards(ClerkAuthGuard, TenantGuard)
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Criar sessão do portal de gestão Stripe' })
  portal(
    @CurrentTenant() tenant: any,
    @Body() body: CreatePortalDto,
  ) {
    return this.billing.createPortalSession(tenant.org_id, body.returnUrl);
  }

  @Get('subscription')
  @UseGuards(ClerkAuthGuard, TenantGuard)
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Obter assinatura actual' })
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
