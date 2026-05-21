/**
 * billing/billing.service.ts
 *
 * Serviço Stripe Billing para Music OS 360.
 * Cobre: checkout sessions, portal sessions, webhooks com idempotência,
 * actualização de features/plan no tenant e notificação WebSocket.
 *
 * Stripe SDK v22 — CJS/ESM interop via require()
 */

import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import {
  BillingSubscriptionEntity,
  TenantEntity,
  OrganizationEntity,
  WebhookEventEntity,
} from '../../database/entities';
import { WebhookEventStatus } from '@music-os-360/types';
import { WsGateway } from '../../core/websocket/ws.gateway';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';

// ── Stripe CJS/ESM interop ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeRaw = require('stripe');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeClass: new (key: string, opts: Record<string, unknown>) => StripeClient =
  (StripeRaw as any).default ?? StripeRaw;

interface StripeClient {
  checkout: {
    sessions: {
      create(params: Record<string, unknown>): Promise<{ url: string | null; id: string }>;
    };
  };
  billingPortal: {
    sessions: {
      create(params: Record<string, unknown>): Promise<{ url: string }>;
    };
  };
  webhooks: {
    constructEvent(payload: string | Buffer, header: string, secret: string): StripeWebhookEvent;
  };
}

interface StripeCheckoutSession {
  customer:     string | null;
  subscription: string | null;
  metadata?:    Record<string, string> | null;
}
interface StripeSubscription {
  id:                 string;
  status:             string;
  current_period_end: number;
  metadata?:          Record<string, string> | null;
}
interface StripeInvoice { customer: string | null; }
interface StripeWebhookEvent {
  id:   string;
  type: string;
  data: { object: unknown };
}

export const PLAN_FEATURES = {
  starter: {
    moduleArtists: true, moduleCatalog: true, moduleContracts: true, moduleCrm: true,
    moduleMarketing: false, moduleAccounting: false, moduleMonitoring: false, aiFeatures: false, moduleRh: false,
  },
  professional: {
    moduleArtists: true, moduleCatalog: true, moduleContracts: true, moduleCrm: true,
    moduleMarketing: true, moduleAccounting: true, moduleMonitoring: true, aiFeatures: false,
    moduleRh: true, moduleEvents: true, moduleInventory: true,
  },
  enterprise: {
    moduleArtists: true, moduleCatalog: true, moduleContracts: true, moduleCrm: true,
    moduleMarketing: true, moduleAccounting: true, moduleMonitoring: true, aiFeatures: true,
    moduleRh: true, moduleEvents: true, moduleInventory: true, moduleLicensing: true,
    multiTenantAdmin: true, analyticsAdvanced: true,
  },
} as const;

/** Hard resource limits per plan. null = unlimited. */
export const PLAN_LIMITS: Record<string, {
  artists:          number | null;
  contracts:        number | null;
  storageGb:        number | null;
  users:            number | null;
  monthlyAiUsd:     number | null; // Monthly AI API spend cap in USD
}> = {
  starter:      { artists: 5,    contracts: 20,   storageGb: 5,    users: 3,    monthlyAiUsd: 2    },
  professional: { artists: 50,   contracts: 200,  storageGb: 50,   users: 15,   monthlyAiUsd: 20   },
  enterprise:   { artists: null, contracts: null,  storageGb: null, users: null, monthlyAiUsd: null },
};

type Plan = keyof typeof PLAN_FEATURES;

@Injectable()
export class BillingService {
  private readonly stripe: StripeClient | null = null;
  private readonly logger = new Logger(BillingService.name);
  private readonly subRepo:     Repository<BillingSubscriptionEntity> | null = null;
  private readonly tenantRepo:  Repository<TenantEntity>              | null = null;
  private readonly orgRepo:     Repository<OrganizationEntity>        | null = null;
  private readonly webhookRepo: Repository<WebhookEventEntity>        | null = null;

  constructor(
    private readonly config: ConfigService,
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly ws: WsGateway,
    private readonly events: EventsService,
  ) {
    if (ds) {
      this.subRepo     = ds.getRepository(BillingSubscriptionEntity);
      this.tenantRepo  = ds.getRepository(TenantEntity);
      this.orgRepo     = ds.getRepository(OrganizationEntity);
      this.webhookRepo = ds.getRepository(WebhookEventEntity);
    }
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new StripeClass(key, { apiVersion: '2026-04-22.dahlia' });
      this.logger.log('Stripe Billing inicializado');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY não configurada — Billing desativado');
    }
  }

  private get stripeRequired(): StripeClient {
    if (!this.stripe) throw new BadRequestException('Stripe não configurado neste ambiente');
    return this.stripe;
  }

  // ── Checkout Session ──────────────────────────────────────────────────────

  async createCheckoutSession(params: {
    orgId: string; tenantId: string; plan: Plan; successUrl: string; cancelUrl: string;
  }) {
    const sub = await this.subRepo!
      .createQueryBuilder('s')
      .where('s.org_id = :orgId', { orgId: params.orgId })
      .getOne();

    const prices: Record<string, string | undefined> = {
      starter:      this.config.get('STRIPE_PRICE_STARTER'),
      professional: this.config.get('STRIPE_PRICE_PROFESSIONAL'),
      enterprise:   this.config.get('STRIPE_PRICE_ENTERPRISE'),
    };

    const priceId = prices[params.plan];
    if (!priceId) throw new BadRequestException(`Plano inválido ou sem preço configurado: ${params.plan}`);

    const customer = (sub?.stripe_customer_id && !sub.stripe_customer_id.startsWith('pending_'))
      ? sub.stripe_customer_id
      : undefined;

    const session = await this.stripeRequired.checkout.sessions.create({
      mode:       'subscription',
      customer,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata:   { tenant_id: params.tenantId, org_id: params.orgId, plan: params.plan },
      success_url: params.successUrl,
      cancel_url:  params.cancelUrl,
    });

    return { url: session.url };
  }

  // ── Portal Session ─────────────────────────────────────────────────────────

  async createPortalSession(orgId: string, returnUrl: string) {
    const sub = await this.subRepo!
      .createQueryBuilder('s')
      .where('s.org_id = :orgId', { orgId })
      .getOne();

    if (!sub?.stripe_customer_id || sub.stripe_customer_id.startsWith('pending_')) {
      throw new BadRequestException('Sem assinatura Stripe ativa');
    }

    const session = await this.stripeRequired.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  async handleWebhook(signature: string, rawBody: Buffer) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    let event: StripeWebhookEvent;
    try {
      event = this.stripeRequired.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Assinatura Stripe inválida');
    }

    const existing = await this.webhookRepo!
      .createQueryBuilder('w')
      .where('w.external_id = :externalId', { externalId: event.id })
      .getOne();

    if (existing?.status === WebhookEventStatus.PROCESSED) {
      this.logger.log(`Webhook já processado: ${event.id}`);
      return { received: true };
    }

    // Registar antes de processar (upsert via insert then ignore duplicate)
    if (!existing) {
      const entity = this.webhookRepo!.create({
        provider:    'stripe',
        event_type:  event.type,
        external_id: event.id,
        payload:     event as unknown as Record<string, unknown>,
        status:      WebhookEventStatus.PENDING,
      });
      await this.webhookRepo!.save(entity).catch(() => { /* idempotência */ });
    }

    try {
      await this.processEvent(event);
      await this.webhookRepo!
        .createQueryBuilder()
        .update(WebhookEventEntity)
        .set({ status: 'processed', processed_at: new Date() } as any)
        .where('external_id = :externalId', { externalId: event.id })
        .execute();
    } catch (err) {
      await this.webhookRepo!
        .createQueryBuilder()
        .update(WebhookEventEntity)
        .set({
          status:      'failed',
          error:       (err as Error).message,
          retry_count: (existing?.retry_count ?? 0) + 1,
        } as any)
        .where('external_id = :externalId', { externalId: event.id })
        .execute();
      throw err;
    }

    return { received: true };
  }

  private async processEvent(event: StripeWebhookEvent) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as StripeCheckoutSession);
        break;
      case 'customer.subscription.updated':
        await this.onSubUpdated(event.data.object as StripeSubscription);
        break;
      case 'customer.subscription.deleted':
        await this.onSubCanceled(event.data.object as StripeSubscription);
        break;
      case 'invoice.payment_failed':
        await this.onPaymentFailed(event.data.object as StripeInvoice);
        break;
      default:
        this.logger.debug(`Evento Stripe ignorado: ${event.type}`);
    }
  }

  private async onCheckoutCompleted(session: StripeCheckoutSession) {
    const { tenant_id, org_id, plan } = session.metadata ?? {};
    if (!tenant_id || !org_id || !plan) return;

    const features = PLAN_FEATURES[plan as Plan] ?? PLAN_FEATURES.starter;

    await this.subRepo!
      .createQueryBuilder()
      .update(BillingSubscriptionEntity)
      .set({
        stripe_customer_id: session.customer ?? undefined,
        stripe_sub_id:      session.subscription ?? undefined,
        plan, status: 'active', trial_ends_at: null, updated_at: new Date(),
      } as any)
      .where('org_id = :orgId', { orgId: org_id })
      .execute();

    await this.tenantRepo!
      .createQueryBuilder()
      .update(TenantEntity)
      .set({ plan, features, updated_at: new Date() } as any)
      .where('id = :tenantId', { tenantId: tenant_id })
      .execute();

    await this.orgRepo!
      .createQueryBuilder()
      .update(OrganizationEntity)
      .set({ plan, billing_status: 'active', updated_at: new Date() } as any)
      .where('id = :orgId', { orgId: org_id })
      .execute();

    this.ws.sendToTenant(tenant_id, 'billing:plan_upgraded', { org_id, plan });
    this.logger.log(`Plano atualizado: org ${org_id} → ${plan}`);

    // Emit TENANT_CREATED to bootstrap categories/templates/roles for the newly activated tenant
    const tenantRecord = await this.tenantRepo!
      .createQueryBuilder('t')
      .select(['t.id', 't.name', 't.slug', 't.plan'])
      .where('t.id = :tenantId', { tenantId: tenant_id })
      .getOne();

    if (tenantRecord) {
      this.events.emitTyped(DOMAIN_EVENTS.TENANT_CREATED, {
        tenantId:      tenant_id,
        userId:        'billing:checkout',
        aggregateType: 'tenant',
        aggregateId:   tenant_id,
        payload: {
          tenantId: tenant_id,
          name:     tenantRecord.name,
          slug:     tenantRecord.slug,
          plan:     plan as string,
        },
      });
      this.logger.log(`BillingService: TENANT_CREATED emitted for tenant=${tenant_id} plan=${plan}`);
    }
  }

  private async onSubUpdated(sub: StripeSubscription) {
    const tenantId = sub.metadata?.['tenant_id'];
    if (!tenantId) return;

    await this.subRepo!
      .createQueryBuilder()
      .update(BillingSubscriptionEntity)
      .set({ status: sub.status, current_period_end: new Date(sub.current_period_end * 1000), updated_at: new Date() } as any)
      .where('stripe_sub_id = :subId', { subId: sub.id })
      .execute();
  }

  private async onSubCanceled(sub: StripeSubscription) {
    const tenantId = sub.metadata?.['tenant_id'];
    const orgId    = sub.metadata?.['org_id'];
    if (!tenantId || !orgId) return;

    await this.subRepo!
      .createQueryBuilder()
      .update(BillingSubscriptionEntity)
      .set({ status: 'cancelled', updated_at: new Date() } as any)
      .where('stripe_sub_id = :subId', { subId: sub.id })
      .execute();

    await this.tenantRepo!
      .createQueryBuilder()
      .update(TenantEntity)
      .set({ plan: 'starter', features: PLAN_FEATURES.starter, updated_at: new Date() } as any)
      .where('id = :tenantId', { tenantId })
      .execute();

    await this.orgRepo!
      .createQueryBuilder()
      .update(OrganizationEntity)
      .set({ plan: 'starter', billing_status: 'cancelled', updated_at: new Date() } as any)
      .where('id = :orgId', { orgId })
      .execute();

    this.ws.sendToTenant(tenantId, 'billing:cancelled', { org_id: orgId });
  }

  private async onPaymentFailed(invoice: StripeInvoice) {
    this.logger.warn(`Pagamento falhou: customer ${invoice.customer}`);

    if (!invoice.customer) return;

    const sub = await this.subRepo!
      .createQueryBuilder('s')
      .where('s.stripe_customer_id = :customerId', { customerId: invoice.customer })
      .getOne();

    if (!sub) return;

    await this.subRepo!
      .createQueryBuilder()
      .update(BillingSubscriptionEntity)
      .set({ status: 'past_due', updated_at: new Date() } as any)
      .where('id = :id', { id: sub.id })
      .execute();

    const orgRow = await this.orgRepo!
      .createQueryBuilder('o')
      .where('o.id = :orgId', { orgId: sub.org_id })
      .getOne();

    if (orgRow) {
      await this.orgRepo!
        .createQueryBuilder()
        .update(OrganizationEntity)
        .set({ billing_status: 'past_due', updated_at: new Date() } as any)
        .where('id = :id', { id: orgRow.id })
        .execute();

      const tenantRow = await this.tenantRepo!
        .createQueryBuilder('t')
        .where('t.org_id = :orgId', { orgId: sub.org_id })
        .getOne();

      if (tenantRow) {
        this.ws.sendToTenant(tenantRow.id, 'billing:payment_failed', {
          org_id: sub.org_id,
          message: 'Pagamento recusado — actualize o método de pagamento para manter o acesso',
        });
      }
    }
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  async getSubscription(orgId: string) {
    const sub = await this.subRepo!
      .createQueryBuilder('s')
      .where('s.org_id = :orgId', { orgId })
      .getOne();
    return sub ?? null;
  }

  /**
   * SaaS metrics for super-admins/internal dashboards.
   * Computes MRR, ARR, churn, and LTV across all tenants.
   */
  async getSaasMetrics(): Promise<{
    mrr:       number;
    arr:       number;
    activeOrgs: number;
    churned30d: number;
    churnRate:  number;
    ltv:        number;
    byPlan:    Record<string, number>;
  }> {
    const PLAN_MRR: Record<string, number> = {
      starter:      29,
      professional: 99,
      enterprise:   299,
    };

    const subs = await this.subRepo!
      .createQueryBuilder('s')
      .select(['s.plan', 's.status', 's.updated_at'])
      .getMany();

    const activeOrgs = subs.filter(s => s.status === 'active').length;
    const byPlan: Record<string, number> = {};
    let mrr = 0;

    for (const sub of subs) {
      if (sub.status === 'active') {
        const plan = (sub.plan as string | undefined) ?? 'starter';
        byPlan[plan] = (byPlan[plan] ?? 0) + 1;
        mrr += PLAN_MRR[plan] ?? 0;
      }
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const churned30d = subs.filter(
      s => s.status === 'cancelled' && new Date(s.updated_at) >= thirtyDaysAgo,
    ).length;

    const churnRate  = activeOrgs > 0 ? churned30d / activeOrgs : 0;
    const avgMrr     = activeOrgs > 0 ? mrr / activeOrgs : 0;
    const avgLifetime = churnRate > 0 ? 1 / churnRate : 24; // months; default 24 if no churn
    const ltv        = avgMrr * avgLifetime;

    return {
      mrr,
      arr:        mrr * 12,
      activeOrgs,
      churned30d,
      churnRate:  Math.round(churnRate * 10_000) / 10_000,
      ltv:        Math.round(ltv * 100) / 100,
      byPlan,
    };
  }

  async getUsage(tenantId: string, orgId: string) {
    const sub   = await this.getSubscription(orgId);
    const plan  = (sub?.plan as string | undefined) ?? 'starter';
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS['starter']!;

    const ds = this.subRepo!.manager.connection;

    const [artistCount, contractCount, userCount] = await Promise.all([
      ds.query<[{ count: string }]>('SELECT COUNT(*)::int as count FROM artists WHERE tenant_id = $1 AND deleted_at IS NULL', [tenantId]),
      ds.query<[{ count: string }]>('SELECT COUNT(*)::int as count FROM contracts WHERE tenant_id = $1 AND deleted_at IS NULL', [tenantId]),
      ds.query<[{ count: string }]>('SELECT COUNT(*)::int as count FROM org_members WHERE org_id = $1', [orgId]),
    ]);

    const usage = {
      artists:   parseInt(artistCount[0]?.count ?? '0', 10),
      contracts: parseInt(contractCount[0]?.count ?? '0', 10),
      users:     parseInt(userCount[0]?.count ?? '0', 10),
    };

    return {
      plan,
      status: sub?.status ?? 'inactive',
      usage,
      limits,
      percentages: {
        artists:   limits.artists   ? Math.round((usage.artists   / limits.artists)   * 100) : null,
        contracts: limits.contracts ? Math.round((usage.contracts / limits.contracts) * 100) : null,
        users:     limits.users     ? Math.round((usage.users     / limits.users)     * 100) : null,
      },
    };
  }
}
