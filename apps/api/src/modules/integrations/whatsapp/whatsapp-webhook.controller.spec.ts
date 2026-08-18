import 'reflect-metadata';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

function makeRes() {
  return { status: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() } as any;
}

function makeController(overrides: {
  findTenant?: jest.Mock;
  verify?: jest.Mock;
  ingest?: jest.Mock;
  markProcessed?: jest.Mock;
  handleInboundMessage?: jest.Mock;
} = {}) {
  const whatsapp: any = {
    findTenantByPhoneNumberId: overrides.findTenant ?? jest.fn().mockResolvedValue('tenant-a'),
    verifyWebhookChallenge: overrides.verify ?? jest.fn(() => 'challenge-echo'),
  };
  const webhookSvc: any = {
    validateHmacSignature: jest.fn().mockReturnValue(true),
    ingest: overrides.ingest ?? jest.fn().mockResolvedValue({ isDuplicate: false, eventId: 'evt-1', status: 'pending' }),
    markProcessed: overrides.markProcessed ?? jest.fn().mockResolvedValue(undefined),
  };
  const musicChat: any = {
    handleInboundMessage: overrides.handleInboundMessage ?? jest.fn().mockResolvedValue({ action: 'received' }),
  };
  return { controller: new WhatsAppWebhookController(whatsapp, webhookSvc, musicChat), whatsapp, webhookSvc, musicChat };
}

const messagePayload = (overrides: Partial<any> = {}) => ({
  object: 'whatsapp_business_account',
  entry: [{
    id: 'waba-1',
    changes: [{
      field: 'messages',
      value: {
        metadata: { phone_number_id: 'phone-123' },
        contacts: [{ profile: { name: 'Maria' }, wa_id: '5511999999999' }],
        messages: [{ id: 'wamid.ABC', from: '5511999999999', timestamp: '1700000000', type: 'text', text: { body: 'Olá' } }],
        ...overrides,
      },
    }],
  }],
});

describe('WhatsAppWebhookController', () => {
  const rawReq = (): any => ({ rawBody: Buffer.from('{}') });

  // ── GET verification ─────────────────────────────────────────────────────────

  it('webhook verification válida: responde 200 com o challenge em texto puro', () => {
    const { controller, whatsapp } = makeController({ verify: jest.fn(() => 'challenge-123') });
    const res = makeRes();

    controller.verify('subscribe', 'right-token', 'challenge-123', res);

    expect(whatsapp.verifyWebhookChallenge).toHaveBeenCalledWith('subscribe', 'right-token', 'challenge-123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('challenge-123');
  });

  it('webhook verification inválida: responde 403, nunca ecoa o challenge', () => {
    const { controller } = makeController({
      verify: jest.fn(() => { throw Object.assign(new Error('bad token'), { code: 'WHATSAPP_WEBHOOK_INVALID' }); }),
    });
    const res = makeRes();

    controller.verify('subscribe', 'wrong-token', 'challenge-123', res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).not.toHaveBeenCalledWith('challenge-123');
  });

  // ── POST inbound ─────────────────────────────────────────────────────────────

  it('evento inbound textual válido: chama handleInboundMessage com o dto normalizado', async () => {
    const { controller, musicChat, webhookSvc } = makeController();

    await controller.receive(messagePayload(), 'sha256=whatever', rawReq());

    expect(webhookSvc.ingest).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'whatsapp', eventType: 'message', externalId: 'wamid.ABC', tenantId: 'tenant-a',
    }));
    expect(musicChat.handleInboundMessage).toHaveBeenCalledWith('tenant-a', expect.objectContaining({
      externalContactId: '5511999999999',
      customerName: 'Maria',
      channel: 'whatsapp',
      body: 'Olá',
      phone: '5511999999999',
    }));
    expect(webhookSvc.markProcessed).toHaveBeenCalledWith('evt-1', 'processed');
  });

  it('evento duplicado: não reprocessa (handleInboundMessage não é chamado de novo)', async () => {
    const { controller, musicChat, webhookSvc } = makeController({
      ingest: jest.fn().mockResolvedValue({ isDuplicate: true, eventId: 'evt-1', status: 'processed' }),
    });

    await controller.receive(messagePayload(), 'sha256=whatever', rawReq());

    expect(musicChat.handleInboundMessage).not.toHaveBeenCalled();
    expect(webhookSvc.markProcessed).not.toHaveBeenCalled();
  });

  it('evento sem mensagem (field !== messages, ex.: statuses): ignora com segurança', async () => {
    const { controller, musicChat, webhookSvc } = makeController();
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{ id: 'waba-1', changes: [{ field: 'statuses', value: { statuses: [{ id: 'wamid.X', status: 'delivered' }] } }] }],
    };

    await controller.receive(payload, 'sha256=whatever', rawReq());

    expect(webhookSvc.ingest).not.toHaveBeenCalled();
    expect(musicChat.handleInboundMessage).not.toHaveBeenCalled();
  });

  it('payload desconhecido (object diferente de whatsapp_business_account): ignora com segurança', async () => {
    const { controller, musicChat, webhookSvc } = makeController();

    const result = await controller.receive({ object: 'page' }, 'sha256=whatever', rawReq());

    expect(result).toEqual({ received: true });
    expect(webhookSvc.ingest).not.toHaveBeenCalled();
    expect(musicChat.handleInboundMessage).not.toHaveBeenCalled();
  });

  it('provider não configurado (nenhum tenant com esse phone_number_id): ignora com segurança', async () => {
    const { controller, musicChat, webhookSvc } = makeController({ findTenant: jest.fn().mockResolvedValue(null) });

    await controller.receive(messagePayload(), 'sha256=whatever', rawReq());

    expect(webhookSvc.ingest).not.toHaveBeenCalled();
    expect(musicChat.handleInboundMessage).not.toHaveBeenCalled();
  });
});
