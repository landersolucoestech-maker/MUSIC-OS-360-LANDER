import { Optional,
  Injectable, Logger, Inject, BadRequestException,
  NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { BillingPlanEntity } from '../../database/entities';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeRaw = require('stripe');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeClass: new (key: string, opts: Record<string, unknown>) => StripePlansClient =
  (StripeRaw as any).default ?? StripeRaw;

interface StripePlansClient {
  products: {
    create(params: Record<string, unknown>): Promise<{ id: string }>;
    update(id: string, params: Record<string, unknown>): Promise<{ id: string }>;
  };
  prices: {
    create(params: Record<string, unknown>): Promise<{ id: string }>;
    update(id: string, params: Record<string, unknown>): Promise<{ id: string }>;
  };
}

export interface UpsertPlanInput {
  slug?: string;
  name?: string;
  description?: string | null;
  amount?: number;
  currency?: string;
  interval?: string;
  active?: boolean;
  features?: Record<string, unknown>;
  limits?: Record<string, unknown>;
}

const VALID_INTERVALS = ['month', 'year'];

@Injectable()
export class BillingPlansService {
  private readonly logger = new Logger(BillingPlansService.name);
  private readonly stripe: StripePlansClient | null = null;
  private readonly planRepo: Repository<BillingPlanEntity> | null = null;

  constructor(
    @Optional() @Inject(ConfigService) private readonly config: ConfigService | undefined,
    @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
  ) {
    if (ds) this.planRepo = ds.getRepository(BillingPlanEntity);
    const key = this.config?.get<string>('STRIPE_SECRET_KEY') ?? process.env.STRIPE_SECRET_KEY;
    if (key) this.stripe = new StripeClass(key, { apiVersion: '2026-04-22.dahlia' });
  }

  private get repo(): Repository<BillingPlanEntity> {
    if (!this.planRepo) throw new ServiceUnavailableException('Billing persistence unavailable');
    return this.planRepo;
  }

  private get stripeRequired(): StripePlansClient {
    if (!this.stripe) throw new BadRequestException('Stripe nao configurado neste ambiente');
    return this.stripe;
  }

  // ── Reads ────────────────────────────────────────────────────────────────
  list(opts?: { includeInactive?: boolean }): Promise<BillingPlanEntity[]> {
    const qb = this.repo.createQueryBuilder('p').orderBy('p.amount', 'ASC');
    if (!opts?.includeInactive) qb.where('p.active = true');
    return qb.getMany();
  }

  async get(id: string): Promise<BillingPlanEntity> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    return plan;
  }

  /** Resolve por id (uuid) ou slug; usado pelo checkout. */
  async resolve(idOrSlug: string): Promise<BillingPlanEntity | null> {
    return this.repo
      .createQueryBuilder('p')
      .where('p.id::text = :v OR p.slug = :v', { v: idOrSlug })
      .getOne();
  }

  // ── Writes ───────────────────────────────────────────────────────────────
  private validate(input: UpsertPlanInput, requireAll: boolean): void {
    if (requireAll) {
      if (!input.slug) throw new BadRequestException('slug é obrigatório');
      if (!input.name) throw new BadRequestException('name é obrigatório');
      if (input.amount == null) throw new BadRequestException('amount é obrigatório');
    }
    if (input.amount != null && (!Number.isInteger(input.amount) || input.amount <= 0)) {
      throw new BadRequestException('amount deve ser inteiro em centavos > 0');
    }
    if (input.currency != null && !/^[a-z]{3}$/.test(input.currency)) {
      throw new BadRequestException('currency deve ser ISO de 3 letras minúsculas (ex: brl)');
    }
    if (input.interval != null && !VALID_INTERVALS.includes(input.interval)) {
      throw new BadRequestException(`interval deve ser um de: ${VALID_INTERVALS.join(', ')}`);
    }
  }

  async create(input: UpsertPlanInput): Promise<BillingPlanEntity> {
    this.validate(input, true);
    const existing = await this.repo.findOne({ where: { slug: input.slug } });
    if (existing) throw new BadRequestException(`Já existe um plano com slug '${input.slug}'`);

    const plan = await this.repo.save(this.repo.create({
      slug: input.slug!,
      name: input.name!,
      description: input.description ?? null,
      amount: input.amount!,
      currency: input.currency ?? 'brl',
      interval: input.interval ?? 'month',
      active: input.active ?? true,
      features: input.features ?? {},
      limits: input.limits ?? {},
      stripe_product_id: null,
      stripe_price_id: null,
    }));

    // Sincroniza (product + price). Erro Stripe não invalida o plano — fica
    // "não sincronizado" e pode ser re-sincronizado via /sync-stripe.
    return this.syncSafe(plan, { recreatePrice: true });
  }

  async update(id: string, input: UpsertPlanInput): Promise<BillingPlanEntity> {
    this.validate(input, false);
    const plan = await this.get(id);

    if (input.slug && input.slug !== plan.slug) {
      const dup = await this.repo.findOne({ where: { slug: input.slug } });
      if (dup) throw new BadRequestException(`Já existe um plano com slug '${input.slug}'`);
    }

    // Price no Stripe é IMUTÁVEL: mudança de amount/currency/interval exige novo Price.
    const pricingChanged =
      (input.amount != null && input.amount !== plan.amount) ||
      (input.currency != null && input.currency !== plan.currency) ||
      (input.interval != null && input.interval !== plan.interval);

    Object.assign(plan, {
      slug: input.slug ?? plan.slug,
      name: input.name ?? plan.name,
      description: input.description !== undefined ? input.description : plan.description,
      amount: input.amount ?? plan.amount,
      currency: input.currency ?? plan.currency,
      interval: input.interval ?? plan.interval,
      active: input.active ?? plan.active,
      features: input.features ?? plan.features,
      limits: input.limits ?? plan.limits,
    });
    await this.repo.save(plan);

    return this.syncSafe(plan, { recreatePrice: pricingChanged });
  }

  /** Endpoint explícito de re-sincronização. */
  async syncStripe(id: string): Promise<BillingPlanEntity> {
    const plan = await this.get(id);
    return this.syncPlanToStripe(plan, { recreatePrice: !plan.stripe_price_id });
  }

  private async syncSafe(plan: BillingPlanEntity, opts: { recreatePrice: boolean }): Promise<BillingPlanEntity> {
    if (!this.stripe) {
      this.logger.warn(`Plano '${plan.slug}' criado/atualizado sem Stripe configurado — não sincronizado`);
      return plan;
    }
    try {
      return await this.syncPlanToStripe(plan, opts);
    } catch (err) {
      this.logger.error(`Falha ao sincronizar plano '${plan.slug}' com Stripe: ${(err as Error).message}`);
      return plan; // plano persistido; sincronização pendente
    }
  }

  /**
   * Sincroniza um plano com o Stripe:
   *  - Product é atualizável (upsert).
   *  - Price é imutável → recria quando não existe ou opts.recreatePrice; desativa o antigo.
   */
  async syncPlanToStripe(
    plan: BillingPlanEntity,
    opts: { recreatePrice: boolean },
  ): Promise<BillingPlanEntity> {
    const stripe = this.stripeRequired;

    // 1. Product (upsert)
    let productId = plan.stripe_product_id;
    const productParams = {
      name: plan.name,
      description: plan.description ?? undefined,
      active: plan.active,
      metadata: { plan_id: plan.id, slug: plan.slug },
    };
    if (!productId) {
      const product = await stripe.products.create(productParams);
      productId = product.id;
    } else {
      await stripe.products.update(productId, productParams);
    }

    // 2. Price (imutável)
    let priceId = plan.stripe_price_id;
    if (opts.recreatePrice || !priceId) {
      const oldPriceId = priceId;
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plan.amount,
        currency: plan.currency,
        recurring: { interval: plan.interval },
        metadata: { plan_id: plan.id, slug: plan.slug },
      });
      priceId = price.id;
      if (oldPriceId) {
        try {
          await stripe.prices.update(oldPriceId, { active: false });
        } catch (e) {
          this.logger.warn(`Não foi possível desativar price antigo ${oldPriceId}: ${(e as Error).message}`);
        }
      }
    }

    await this.repo.update(plan.id, {
      stripe_product_id: productId,
      stripe_price_id: priceId,
      updated_at: new Date(),
    });
    plan.stripe_product_id = productId;
    plan.stripe_price_id = priceId;
    return plan;
  }
}
