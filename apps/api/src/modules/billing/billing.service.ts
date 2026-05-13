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
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import {
  organizations,
  tenants,
  billingSubscriptions,
  webhookEvents,
} from '../../database/schema';
import { WsGateway } from '../../core/websocket/ws.gateway';

// ── Stripe CJS/ESM interop ────────────────────────────────────────────────────
// Stripe v17+ distribui ESM; ts-node compila para CJS, logo o export default fica
// em .default. Usamos require() + fallback para garantir que o constructor funciona
// em ambos os casos.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeRaw = require('stripe');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeClass: new (key: string, opts: Record<string, unknown>) => StripeClient =
  (StripeRaw as any).default ?? StripeRaw;

// Interface mínima do cliente Stripe que o serviço utiliza
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
    constructEvent(
      payload: string | Buffer,
      header: string,
      secret: string,
    ): StripeWebhookEvent;
  };
}

// ── Tipos internos para objectos de webhook ───────────────────────────────────
interface StripeCheckoutSession {
  customer:     string | null;
  subscription: string | null;
  metadata?:    Record<string, string> | null;
}
interface StripeSubscription {
  id:                  string;
  status:              string;
  current_period_end:  number;
  metadata?:           Record<string, string> | null;
}
interface StripeInvoice {
  customer: string | null;
}
interface StripeWebhookEvent {
  id:   string;
  type: string;
  data: { object: unknown };
}

// ── Features por plano ────────────────────────────────────────────────────────
const PLAN_FEATURES = {
  starter: {
    moduleArtists:     true,
    moduleCatalog:     true,
    moduleContracts:   true,
    moduleCrm:         true,
    moduleMarketing:   false,
    moduleAccounting:  false,
    moduleMonitoring:  false,
    aiFeatures:        false,
    moduleRh:          false,
  },
  professional: {
    moduleArtists:     true,
    moduleCatalog:     true,
    moduleContracts:   true,
    moduleCrm:         true,
    moduleMarketing:   true,
    moduleAccounting:  true,
    moduleMonitoring:  true,
    aiFeatures:        false,
    moduleRh:          true,
    moduleEvents:      true,
    moduleInventory:   true,
  },
  enterprise: {
    moduleArtists:      true,
    moduleCatalog:      true,
    moduleContracts:    true,
    moduleCrm:          true,
    moduleMarketing:    true,
    moduleAccounting:   true,
    moduleMonitoring:   true,
    aiFeatures:         true,
    moduleRh:           true,
    moduleEvents:       true,
    moduleInventory:    true,
    moduleLicensing:    true,
    multiTenantAdmin:   true,
    analyticsAdvanced:  true,
    whitelabel:         true,
  },
} as const;

type Plan = keyof typeof PLAN_FEATURES;

@Injectable()
export class BillingService {
  private readonly stripe: StripeClient | null = null;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    private readonly ws: WsGateway,
  ) {
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
    orgId:      string;
    tenantId:   string;
    plan:       Plan;
    successUrl: string;
    cancelUrl:  string;
  }) {
    const [sub] = await this.db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.org_id, params.orgId))
      .limit(1);

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
      metadata: {
        tenant_id: params.tenantId,
        org_id:    params.orgId,
        plan:      params.plan,
      },
      success_url: params.successUrl,
      cancel_url:  params.cancelUrl,
    });

    return { url: session.url };
  }

  // ── Portal Session ────────────────────────────────────────────────────────

  async createPortalSession(orgId: string, returnUrl: string) {
    const [sub] = await this.db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.org_id, orgId))
      .limit(1);

    if (!sub?.stripe_customer_id || sub.stripe_customer_id.startsWith('pending_')) {
      throw new BadRequestException('Sem assinatura Stripe ativa');
    }

    const session = await this.stripeRequired.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ── Webhook (com idempotência) ─────────────────────────────────────────────

  async handleWebhook(signature: string, rawBody: Buffer) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    let event: StripeWebhookEvent;
    try {
      event = this.stripeRequired.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Assinatura Stripe inválida');
    }

    // Idempotência — não reprocessar evento já tratado
    const [existing] = await this.db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.external_id, event.id))
      .limit(1);

    if (existing?.status === 'processed') {
      this.logger.log(`Webhook já processado: ${event.id}`);
      return { received: true };
    }

    // Registar antes de processar
    await this.db
      .insert(webhookEvents)
      .values({
        provider:    'stripe',
        event_type:  event.type,
        external_id: event.id,
        payload:     event as unknown as Record<string, unknown>,
        status:      'pending',
      })
      .onConflictDoNothing();

    try {
      await this.processEvent(event);

      await this.db
        .update(webhookEvents)
        .set({ status: 'processed', processed_at: new Date() })
        .where(eq(webhookEvents.external_id, event.id));

    } catch (err) {
      await this.db
        .update(webhookEvents)
        .set({
          status:      'failed',
          error:       (err as Error).message,
          retry_count: (existing?.retry_count ?? 0) + 1,
        })
        .where(eq(webhookEvents.external_id, event.id));
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

  // ── Handlers de eventos ───────────────────────────────────────────────────

  private async onCheckoutCompleted(session: StripeCheckoutSession) {
    const { tenant_id, org_id, plan } = session.metadata ?? {};
    if (!tenant_id || !org_id || !plan) return;

    const features = PLAN_FEATURES[plan as Plan] ?? PLAN_FEATURES.starter;

    await this.db
      .update(billingSubscriptions)
      .set({
        stripe_customer_id: session.customer ?? undefined,
        stripe_sub_id:      session.subscription ?? undefined,
        plan,
        status:             'active',
        trial_ends_at:      null,
        updated_at:         new Date(),
      })
      .where(eq(billingSubscriptions.org_id, org_id));

    await this.db
      .update(tenants)
      .set({ plan, features, updated_at: new Date() })
      .where(eq(tenants.id, tenant_id));

    await this.db
      .update(organizations)
      .set({ plan, billing_status: 'active', updated_at: new Date() })
      .where(eq(organizations.id, org_id));

    this.ws.sendToTenant(tenant_id, 'billing:plan_upgraded', { org_id, plan });

    this.logger.log(`Plano atualizado: org ${org_id} → ${plan}`);
  }

  private async onSubUpdated(sub: StripeSubscription) {
    const tenantId = sub.metadata?.['tenant_id'];
    if (!tenantId) return;

    await this.db
      .update(billingSubscriptions)
      .set({
        status:             sub.status,
        current_period_end: new Date(sub.current_period_end * 1000),
        updated_at:         new Date(),
      })
      .where(eq(billingSubscriptions.stripe_sub_id, sub.id));
  }

  private async onSubCanceled(sub: StripeSubscription) {
    const tenantId = sub.metadata?.['tenant_id'];
    const orgId    = sub.metadata?.['org_id'];
    if (!tenantId || !orgId) return;

    await this.db
      .update(billingSubscriptions)
      .set({ status: 'cancelled', updated_at: new Date() })
      .where(eq(billingSubscriptions.stripe_sub_id, sub.id));

    await this.db
      .update(tenants)
      .set({ plan: 'starter', features: PLAN_FEATURES.starter, updated_at: new Date() })
      .where(eq(tenants.id, tenantId));

    await this.db
      .update(organizations)
      .set({ plan: 'starter', billing_status: 'cancelled', updated_at: new Date() })
      .where(eq(organizations.id, orgId));

    this.ws.sendToTenant(tenantId, 'billing:cancelled', { org_id: orgId });
  }

  private async onPaymentFailed(invoice: StripeInvoice) {
    this.logger.warn(`Pagamento falhou: customer ${invoice.customer}`);
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  async getSubscription(orgId: string) {
    const [sub] = await this.db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.org_id, orgId))
      .limit(1);
    return sub ?? null;
  }
}
