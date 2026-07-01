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
  Controller, Post, Patch, Get, Body, Headers, Param, Query,
  Req, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant }   from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }     from '../../core/decorators/current-user.decorator';
import { RequireRole }     from '../../core/decorators/roles.decorator';
import { Public }          from '../../core/decorators/public.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import { BillingService }  from './billing.service';
import { BillingEnforcementService, TenantBillingStatus } from './billing-enforcement.service';
import { BillingPlansService } from './billing-plans.service';
import { CreateCheckoutDto, CreatePortalDto } from './dto/billing.dto';
import { CreatePlanDto, UpdatePlanDto } from './dto/billing-plans.dto';
import type { Request }    from 'express';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly enforcement: BillingEnforcementService,
    private readonly plans: BillingPlansService,
  ) {}

  // ── Gestão de Planos (fonte primária = banco/admin; Stripe é sincronizado) ──
  @Get('plans')
  @RequireRole('admin')
  @ApiOperation({ summary: 'Listar planos (admin+)' })
  listPlans(@Query('includeInactive') includeInactive?: string) {
    return this.plans.list({ includeInactive: includeInactive === 'true' });
  }

  @Get('plans/:id')
  @RequireRole('admin')
  @ApiOperation({ summary: 'Obter plano por id (admin+)' })
  getPlan(@Param('id') id: string) {
    return this.plans.get(id);
  }

  @Post('plans')
  @RequireRole('super_admin')
  @Audit('billing.plan_created')
  @ApiOperation({ summary: 'Criar plano + sincronizar com Stripe (super_admin)' })
  createPlan(@Body() body: CreatePlanDto) {
    return this.plans.create(body);
  }

  @Patch('plans/:id')
  @RequireRole('super_admin')
  @Audit('billing.plan_updated')
  @ApiOperation({ summary: 'Editar plano + re-sincronizar Stripe (super_admin)' })
  updatePlan(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    return this.plans.update(id, body);
  }

  @Post('plans/:id/sync-stripe')
  @RequireRole('super_admin')
  @Audit('billing.plan_synced')
  @ApiOperation({ summary: 'Re-sincronizar plano com Stripe (super_admin)' })
  syncPlan(@Param('id') id: string) {
    return this.plans.syncStripe(id);
  }

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
      planRef:    body.planId ?? body.planSlug ?? body.plan,
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

  @Get('usage')
  @RequireRole('admin')
  @ApiOperation({ summary: 'Uso actual vs limites do plano (admin+)' })
  getUsage(@CurrentTenant() tenant: any) {
    return this.billing.getUsage(tenant.id, tenant.org_id);
  }

  @Get('metrics/saas')
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'SaaS metrics — MRR, ARR, churn, LTV (super_admin only)' })
  getSaasMetrics() {
    return this.billing.getSaasMetrics();
  }

  @Post('admin/tenants/:tenantId/suspend')
  @RequireRole('super_admin')
  @Audit('tenant.suspended')
  suspendTenant(
    @Param('tenantId') tenantId: string,
    @Body() body: { reason?: string },
  ) {
    return this.enforcement.suspendTenant(tenantId, body.reason ?? 'manual admin suspension');
  }

  @Post('admin/tenants/:tenantId/reactivate')
  @RequireRole('super_admin')
  @Audit('tenant.reactivated')
  reactivateTenant(
    @Param('tenantId') tenantId: string,
    @Body() body: { reason?: string },
  ) {
    return this.enforcement.activateTenant(tenantId, body.reason ?? 'manual admin reactivation');
  }

  @Post('admin/tenants/:tenantId/override')
  @RequireRole('super_admin')
  @Audit('billing.override_enabled')
  applyOverride(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: TenantBillingStatus; reason: string; until: string },
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.enforcement.applyManualOverride({
      tenantId,
      status: body.status,
      reason: body.reason,
      until: new Date(body.until),
      userId: user?.id ?? user?.userId ?? null,
      ip: req.ip,
    });
  }

  @Post('admin/tenants/:tenantId/override/remove')
  @RequireRole('super_admin')
  @Audit('billing.override_disabled')
  removeOverride(
    @Param('tenantId') tenantId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.enforcement.removeManualOverride(
      tenantId,
      body.reason ?? 'manual override removed',
      user?.id ?? user?.userId ?? null,
    );
  }

  @Post('webhooks/stripe')
  @Public()
  @Audit('billing.subscription_event')
  @ApiOperation({ summary: 'Webhook Stripe (HMAC validado, sem autenticação)' })
  webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.billing.handleWebhook(signature, req.rawBody as Buffer);
  }
}
