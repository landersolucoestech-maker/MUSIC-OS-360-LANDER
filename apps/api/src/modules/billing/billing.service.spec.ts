import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService }       from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { BillingService }      from './billing.service';
import { DATA_SOURCE }         from '../../database/database.module';
import { RealtimeService }     from '../../core/realtime/realtime.service';
import { EventsService }       from '../../core/events/events.service';
import { BillingEnforcementService } from './billing-enforcement.service';
import { BillingPlansService } from './billing-plans.service';

jest.mock('stripe', () => {
  const instance = {
    checkout:      { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
    webhooks:      { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  };
  const ctor = jest.fn(() => instance);
  (ctor as any).default = ctor;
  (ctor as any).__instance = instance;
  return ctor;
});

const getStripeInstance = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const StripeRaw = require('stripe');
  return StripeRaw.__instance;
};

const buildMockQb = (resolveValue: any = null) => {
  const qb: any = {
    select:     jest.fn(),
    where:      jest.fn(),
    andWhere:   jest.fn(),
    getOne:     jest.fn().mockResolvedValue(resolveValue),
    getMany:    jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    update:     jest.fn(),
    set:        jest.fn(),
    delete:     jest.fn(),
    from:       jest.fn(),
    execute:    jest.fn().mockResolvedValue({ affected: 1 }),
  };
  qb.select.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.update.mockReturnValue(qb);
  qb.set.mockReturnValue(qb);
  qb.delete.mockReturnValue(qb);
  qb.from.mockReturnValue(qb);
  return qb;
};

const buildMockRepo = (getOneValue: any = null) => {
  const qb = buildMockQb(getOneValue);
  return {
    createQueryBuilder: jest.fn(() => qb),
    create: jest.fn((v: any) => v),
    save:   jest.fn((v: any) => Promise.resolve({ id: 'test-id', ...v })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    _qb: qb,
  };
};

const buildMockDs = (getOneValue: any = null) => {
  const repo = buildMockRepo(getOneValue);
  return {
    getRepository: jest.fn(() => repo),
    query: jest.fn().mockResolvedValue([]),
    _repo: repo,
  };
};

describe('BillingService', () => {
  let service: BillingService;
  let mockDs: ReturnType<typeof buildMockDs>;
  let enforcement: Record<string, jest.Mock>;
  let plans: Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDs = buildMockDs();
    plans = {
      resolve: jest.fn().mockResolvedValue({
        id: 'plan-pro', slug: 'professional', active: true, stripe_price_id: 'price_pro',
      }),
    };
    enforcement = {
      recordWebhookProcessed: jest.fn().mockResolvedValue('inserted'),
      markWebhookProcessed: jest.fn().mockResolvedValue(undefined),
      markWebhookFailed: jest.fn().mockResolvedValue(undefined),
      findTenantIdByStripe: jest.fn().mockResolvedValue('tenant-1'),
      startPaymentGrace: jest.fn().mockResolvedValue({ status: 'payment_grace' }),
      activateTenant: jest.fn().mockResolvedValue({ status: 'active' }),
      ensureState: jest.fn().mockResolvedValue({ status: 'trial' }),
      cancelTenant: jest.fn().mockResolvedValue({ status: 'cancelled' }),
      suspendTenant: jest.fn().mockResolvedValue({ status: 'suspended' }),
      getState: jest.fn().mockResolvedValue({ status: 'active' }),
    };

    const stripe = getStripeInstance();
    stripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/test',
      id:  'cs_test',
    });
    stripe.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/test',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => ({
              STRIPE_SECRET_KEY:         'sk_test_key',
              STRIPE_WEBHOOK_SECRET:     'whsec_test',
              STRIPE_PRICE_STARTER:      'price_starter',
              STRIPE_PRICE_PROFESSIONAL: 'price_pro',
              STRIPE_PRICE_ENTERPRISE:   'price_ent',
            }[key]),
          },
        },
        { provide: DATA_SOURCE, useValue: mockDs },
        { provide: RealtimeService, useValue: { sendToTenant: jest.fn(), sendToUser: jest.fn() } },
        { provide: EventsService, useValue: { emitTyped: jest.fn(), emitAsync: jest.fn().mockResolvedValue([]) } },
        { provide: BillingEnforcementService, useValue: enforcement },
        { provide: BillingPlansService, useValue: plans },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('createCheckoutSession', () => {
    it('usa stripe_price_id vindo do banco (não STRIPE_PRICE_*)', async () => {
      const r = await service.createCheckoutSession({
        orgId: 'o1', tenantId: 't1', planRef: 'professional',
        successUrl: 'https://ok', cancelUrl: 'https://cancel',
      });
      expect(r.url).toBe('https://checkout.stripe.com/test');
      const stripe = getStripeInstance();
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_pro', quantity: 1 }],
          metadata: expect.objectContaining({ plan_id: 'plan-pro', plan: 'professional', stripe_price_id: 'price_pro' }),
        }),
      );
    });

    it('falha se plano não informado', async () => {
      await expect(service.createCheckoutSession({
        orgId: 'o', tenantId: 't', successUrl: '', cancelUrl: '',
      })).rejects.toThrow(BadRequestException);
    });

    it('falha se plan_id inválido (não encontrado)', async () => {
      plans.resolve.mockResolvedValueOnce(null);
      await expect(service.createCheckoutSession({
        orgId: 'o', tenantId: 't', planRef: 'inexistente', successUrl: '', cancelUrl: '',
      })).rejects.toThrow(BadRequestException);
    });

    it('falha se plano inativo', async () => {
      plans.resolve.mockResolvedValueOnce({ id: 'p', slug: 'x', active: false, stripe_price_id: 'price_x' });
      await expect(service.createCheckoutSession({
        orgId: 'o', tenantId: 't', planRef: 'x', successUrl: '', cancelUrl: '',
      })).rejects.toThrow(BadRequestException);
    });

    it('falha se plano não sincronizado com Stripe', async () => {
      plans.resolve.mockResolvedValueOnce({ id: 'p', slug: 'x', active: true, stripe_price_id: null });
      await expect(service.createCheckoutSession({
        orgId: 'o', tenantId: 't', planRef: 'x', successUrl: '', cancelUrl: '',
      })).rejects.toThrow(BadRequestException);
    });

    it('reusa customer_id existente', async () => {
      const repo = mockDs._repo;
      repo._qb.getOne.mockResolvedValueOnce({ stripe_customer_id: 'cus_123', stripe_sub_id: 'sub_123' });
      await service.createCheckoutSession({
        orgId: 'o1', tenantId: 't1', planRef: 'professional',
        successUrl: 'https://ok', cancelUrl: 'https://cancel',
      });
      const stripe = getStripeInstance();
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_123' }),
      );
    });
  });

  describe('createPortalSession', () => {
    it('cria sessão de portal para customer existente', async () => {
      const repo = mockDs._repo;
      repo._qb.getOne.mockResolvedValueOnce({ stripe_customer_id: 'cus_portal' });
      const r = await service.createPortalSession('org-1', 'https://app.com');
      expect(r.url).toBe('https://billing.stripe.com/test');
    });

    it('lança BadRequestException sem assinatura', async () => {
      const repo = mockDs._repo;
      repo._qb.getOne.mockResolvedValueOnce(null);
      await expect(service.createPortalSession('org-sem-sub', 'x')).rejects.toThrow();
    });

    it('lança BadRequestException com customer pending_', async () => {
      const repo = mockDs._repo;
      repo._qb.getOne.mockResolvedValueOnce({ stripe_customer_id: 'pending_org-1' });
      await expect(service.createPortalSession('org-1', 'x')).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook', () => {
    it('rejeita assinatura inválida', async () => {
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('signature mismatch');
      });
      await expect(service.handleWebhook('bad_sig', Buffer.from('{}'))).rejects.toThrow('inválida');
    });

    it('retorna received:true para evento já processado', async () => {
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockReturnValueOnce({
        id: 'evt_done', type: 'checkout.session.completed', data: { object: {} },
      });
      enforcement.recordWebhookProcessed.mockResolvedValueOnce('duplicate');
      const r = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(r).toEqual({ received: true });
    });

    it('inicia payment_grace em invoice.payment_failed', async () => {
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockReturnValueOnce({
        id: 'evt_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_1',
            customer: 'cus_1',
            subscription: 'sub_1',
            status: 'open',
            amount_due: 25000,
            amount_paid: 0,
            currency: 'brl',
          },
        },
      });
      await service.handleWebhook('sig', Buffer.from('{}'));
      expect(enforcement.recordWebhookProcessed).toHaveBeenCalledWith(expect.objectContaining({
        stripeEventId: 'evt_failed',
        eventType: 'invoice.payment_failed',
      }));
      expect(enforcement.startPaymentGrace).toHaveBeenCalledWith('tenant-1', 'invoice.payment_failed');
    });

    it('reativa tenant em invoice.payment_succeeded', async () => {
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockReturnValueOnce({
        id: 'evt_paid',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_2',
            customer: 'cus_1',
            subscription: 'sub_1',
            status: 'paid',
            amount_due: 25000,
            amount_paid: 25000,
            currency: 'brl',
          },
        },
      });
      await service.handleWebhook('sig', Buffer.from('{}'));
      expect(enforcement.activateTenant).toHaveBeenCalledWith('tenant-1', 'invoice.payment_succeeded');
    });
  });

  describe('handleWebhook — lifecycle status (P0-2, retry-safe idempotency)', () => {
    function paidEvent(id: string) {
      return {
        id,
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_1', customer: 'cus_1', subscription: 'sub_1',
            status: 'paid', amount_due: 25000, amount_paid: 25000, currency: 'brl',
          },
        },
      };
    }

    it('primeira execução com sucesso: marca processed, nunca failed', async () => {
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockReturnValueOnce(paidEvent('evt_ok'));
      await service.handleWebhook('sig', Buffer.from('{}'));
      expect(enforcement.markWebhookProcessed).toHaveBeenCalledWith('evt_ok');
      expect(enforcement.markWebhookFailed).not.toHaveBeenCalled();
    });

    it('falha transitória: marca failed (nunca processed) e propaga o erro — não retorna 200 silencioso', async () => {
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockReturnValueOnce(paidEvent('evt_transient'));
      enforcement.activateTenant.mockRejectedValueOnce(new Error('db pool exhausted'));

      await expect(service.handleWebhook('sig', Buffer.from('{}'))).rejects.toThrow('db pool exhausted');

      expect(enforcement.markWebhookFailed).toHaveBeenCalledWith('evt_transient');
      expect(enforcement.markWebhookProcessed).not.toHaveBeenCalled();
    });

    it('retry legítimo após falha: recordWebhookProcessed reclama o evento (status=failed → processing) e reprocessa', async () => {
      // Simulates what billing-enforcement.service.ts actually does: a FAILED
      // row is reclaimed ('inserted'), a PROCESSED one is not ('duplicate').
      // Exercised here at the BillingService boundary via the same contract
      // the enforcement service guarantees.
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockReturnValueOnce(paidEvent('evt_retry'));
      enforcement.recordWebhookProcessed.mockResolvedValueOnce('inserted'); // reclaimed
      const r = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(r).toEqual({ received: true });
      expect(enforcement.activateTenant).toHaveBeenCalledWith('tenant-1', 'invoice.payment_succeeded');
      expect(enforcement.markWebhookProcessed).toHaveBeenCalledWith('evt_retry');
    });

    it('duplicate após sucesso: recordWebhookProcessed nega a reclamação — nenhum efeito reaplicado', async () => {
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockReturnValueOnce(paidEvent('evt_already_done'));
      enforcement.recordWebhookProcessed.mockResolvedValueOnce('duplicate');
      const r = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(r).toEqual({ received: true });
      expect(enforcement.activateTenant).not.toHaveBeenCalled();
      expect(enforcement.markWebhookProcessed).not.toHaveBeenCalled();
    });

    it('duas entregas concorrentes do mesmo evento: a segunda não reaplica o efeito', async () => {
      const stripe = getStripeInstance();
      // Both deliveries carry the same event.id — the enforcement layer (not
      // mocked-away here) is what actually serializes this via the DB; at
      // this boundary we assert the service correctly no-ops on 'duplicate'
      // regardless of which delivery "won".
      stripe.webhooks.constructEvent
        .mockReturnValueOnce(paidEvent('evt_concurrent'))
        .mockReturnValueOnce(paidEvent('evt_concurrent'));
      enforcement.recordWebhookProcessed
        .mockResolvedValueOnce('inserted')
        .mockResolvedValueOnce('duplicate');

      await service.handleWebhook('sig', Buffer.from('{}'));
      await service.handleWebhook('sig', Buffer.from('{}'));

      expect(enforcement.activateTenant).toHaveBeenCalledTimes(1);
      expect(enforcement.markWebhookProcessed).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkout.session.completed (BILL-001-002-004)', () => {
    const buildEvent = (metadata: Record<string, string> | null) => ({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_1', subscription: 'sub_1', metadata } },
    });

    it('vincula customer/subscription e ativa o tenant com metadata válida', async () => {
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockReturnValueOnce(
        buildEvent({ tenant_id: 'tenant-1', org_id: 'org-1', plan: 'professional' }),
      );
      const r = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(r).toEqual({ received: true });
      // acceptance: "tenant recebe customer/subscription" — via update chain + ativação
      expect(mockDs._repo._qb.execute).toHaveBeenCalled();
      expect(enforcement.activateTenant).toHaveBeenCalledWith('tenant-1', 'checkout.session.completed');
    });

    it('não provisiona (no-op) quando metadata está incompleta', async () => {
      const stripe = getStripeInstance();
      stripe.webhooks.constructEvent.mockReturnValueOnce(buildEvent({ org_id: 'org-1' }));
      const r = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(r).toEqual({ received: true });
      // idempotência registra o evento, mas nenhum efeito de provisionamento ocorre
      expect(enforcement.recordWebhookProcessed).toHaveBeenCalled();
      expect(enforcement.activateTenant).not.toHaveBeenCalled();
    });
  });

  describe('getSubscription', () => {
    it('retorna null quando não há subscription', async () => {
      const repo = mockDs._repo;
      repo._qb.getOne.mockResolvedValueOnce(null);
      expect(await service.getSubscription('org-x')).toBeNull();
    });

    it('retorna subscription existente', async () => {
      const sub = { id: 's1', plan: 'starter', status: 'trial' };
      const repo = mockDs._repo;
      repo._qb.getOne.mockResolvedValueOnce(sub);
      expect(await service.getSubscription('org-1')).toEqual(sub);
    });
  });
});
