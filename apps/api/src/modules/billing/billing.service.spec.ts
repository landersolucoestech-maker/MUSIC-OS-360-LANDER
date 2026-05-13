import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService }       from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { BillingService }      from './billing.service';
import { DRIZZLE_DB }          from '../../database/database.module';
import { WsGateway }           from '../../core/websocket/ws.gateway';

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

const buildMockDb = () => {
  const mock = {
    select:              jest.fn(),
    from:                jest.fn(),
    where:               jest.fn(),
    limit:               jest.fn(),
    insert:              jest.fn(),
    values:              jest.fn(),
    onConflictDoNothing: jest.fn(),
    update:              jest.fn(),
    set:                 jest.fn(),
  };
  mock.select.mockReturnValue(mock);
  mock.from.mockReturnValue(mock);
  mock.where.mockReturnValue(mock);
  mock.limit.mockResolvedValue([]);
  mock.insert.mockReturnValue(mock);
  mock.values.mockReturnValue(mock);
  mock.onConflictDoNothing.mockResolvedValue([]);
  mock.update.mockReturnValue(mock);
  mock.set.mockReturnValue(mock);
  return mock;
};

describe('BillingService', () => {
  let service: BillingService;
  let mockDb: ReturnType<typeof buildMockDb>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb = buildMockDb();

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
        { provide: DRIZZLE_DB, useValue: mockDb },
        { provide: WsGateway,  useValue: { sendToTenant: jest.fn(), sendToUser: jest.fn() } },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('createCheckoutSession', () => {
    it('retorna url para plano válido', async () => {
      const r = await service.createCheckoutSession({
        orgId: 'o1', tenantId: 't1', plan: 'professional',
        successUrl: 'https://ok', cancelUrl: 'https://cancel',
      });
      expect(r.url).toBe('https://checkout.stripe.com/test');
    });

    it('lança BadRequestException para plano inválido', async () => {
      await expect(service.createCheckoutSession({
        orgId: 'o', tenantId: 't', plan: 'diamante' as any,
        successUrl: '', cancelUrl: '',
      })).rejects.toThrow(BadRequestException);
    });

    it('reusa customer_id existente', async () => {
      mockDb.limit.mockResolvedValueOnce([{ stripe_customer_id: 'cus_123', stripe_sub_id: 'sub_123' }]);
      await service.createCheckoutSession({
        orgId: 'o1', tenantId: 't1', plan: 'starter',
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
      mockDb.limit.mockResolvedValueOnce([{ stripe_customer_id: 'cus_portal' }]);
      const r = await service.createPortalSession('org-1', 'https://app.com');
      expect(r.url).toBe('https://billing.stripe.com/test');
    });

    it('lança BadRequestException sem assinatura', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      await expect(service.createPortalSession('org-sem-sub', 'x')).rejects.toThrow();
    });

    it('lança BadRequestException com customer pending_', async () => {
      mockDb.limit.mockResolvedValueOnce([{ stripe_customer_id: 'pending_org-1' }]);
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
      mockDb.limit.mockResolvedValueOnce([{ id: 'wh-1', status: 'processed' }]);
      const r = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(r).toEqual({ received: true });
    });
  });

  describe('getSubscription', () => {
    it('retorna null quando não há subscription', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      expect(await service.getSubscription('org-x')).toBeNull();
    });

    it('retorna subscription existente', async () => {
      const sub = { id: 's1', plan: 'starter', status: 'trial' };
      mockDb.limit.mockResolvedValueOnce([sub]);
      expect(await service.getSubscription('org-1')).toEqual(sub);
    });
  });
});
