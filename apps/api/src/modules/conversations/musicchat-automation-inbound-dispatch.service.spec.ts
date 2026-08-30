import 'reflect-metadata';
import { MusicChatAutomationService } from './musicchat-automation.service';

/**
 * MusicChat Inbox wave (decisão de produto 2026-08-22): sendSystemMessage()
 * (usada pelas respostas automáticas de boas-vindas/menu do bot de triagem)
 * só gravava a mensagem no banco — nunca despachava de fato ao WhatsApp real.
 * O cliente nunca via a mensagem de boas-vindas no app dele. Corrigido:
 * addConversationMessage() agora despacha via WhatsAppCloudProvider quando
 * senderType='system' numa conversa de canal whatsapp.
 */
function makeQb(overrides: Partial<Record<string, unknown>> = {}) {
  const qb: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
  };
  Object.assign(qb, overrides);
  return qb;
}

function makeService() {
  const conv = {
    id: 'conv-1', tenant_id: 't1', channel: 'whatsapp', status: 'open',
    metadata: { external_contact_id: '5511999999999' },
  };

  const settingsRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 's1', tenant_id: 't1', enabled: true,
      welcome_message: 'Bem-vindo!', main_menu_message: '1. Falar com atendente',
      menu_options: [], templates: [], return_to_menu_rule: { enabled: true, commands: [] },
    }),
  };
  const convQb = makeQb({ getOne: jest.fn().mockResolvedValue(null) }); // findOrCreateConversation: nenhuma existente
  const convRepo = {
    createQueryBuilder: jest.fn(() => convQb),
    create: jest.fn((v: unknown) => ({ id: 'conv-1', ...(v as object) })),
    save: jest.fn(async (v: unknown) => ({ ...conv, ...(v as object) })),
    findOne: jest.fn().mockResolvedValue(conv), // findConversation (usado dentro do dispatch)
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const msgRepo = {
    create: jest.fn((v: unknown) => ({ id: 'msg-1', created_at: new Date(), metadata: {}, ...(v as object) })),
    save: jest.fn(async (v: unknown) => v),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const eventRepo = { create: jest.fn((v: unknown) => v), save: jest.fn().mockResolvedValue({}) };

  const ds = {
    getRepository: jest.fn((entity: { name: string }) => {
      if (entity.name === 'MusicChatAutomationSettingsEntity') return settingsRepo;
      if (entity.name === 'ConversationEntity') return convRepo;
      if (entity.name === 'ConversationMessageEntity') return msgRepo;
      if (entity.name === 'MusicChatAutomationEventEntity') return eventRepo;
      return { createQueryBuilder: jest.fn(() => makeQb()) };
    }),
  };

  const notifications = { enqueue: jest.fn() };
  const whatsapp = {
    isConfigured: jest.fn().mockResolvedValue(true),
    sendTextMessage: jest.fn().mockResolvedValue({ externalMessageId: 'wamid.999' }),
  };

  const ws = { sendToTenant: jest.fn(), sendToUser: jest.fn(), notifyDataChanged: jest.fn() };

  const svc = new MusicChatAutomationService(ds as never, notifications as never, whatsapp as never, ws as never);
  return { svc, whatsapp, msgRepo, ws };
}

describe('MusicChatAutomationService.handleInboundMessage — mensagem de boas-vindas chega ao WhatsApp real', () => {
  it('despacha a mensagem de boas-vindas via WhatsAppCloudProvider usando external_contact_id (telefone ainda não gravado em metadata neste ponto)', async () => {
    const { svc, whatsapp } = makeService();

    await svc.handleInboundMessage('t1', {
      externalContactId: '5511999999999',
      customerName: 'Fulano',
      channel: 'whatsapp',
      body: 'Oi',
      phone: '5511999999999',
    });

    expect(whatsapp.sendTextMessage).toHaveBeenCalledWith('t1', '5511999999999', 'Bem-vindo!\n\n1. Falar com atendente');
  });

  it('marca delivery_status=sent na mensagem do sistema após despacho bem-sucedido', async () => {
    const { svc, msgRepo } = makeService();

    await svc.handleInboundMessage('t1', {
      externalContactId: '5511999999999',
      customerName: 'Fulano',
      channel: 'whatsapp',
      body: 'Oi',
      phone: '5511999999999',
    });

    const call = msgRepo.update.mock.calls.find(([, payload]) => (payload as any)?.metadata?.delivery_status === 'sent');
    expect(call).toBeDefined();
  });
});
