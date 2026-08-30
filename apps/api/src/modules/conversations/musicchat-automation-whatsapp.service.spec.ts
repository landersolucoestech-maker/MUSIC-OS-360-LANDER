import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MusicChatAutomationService } from './musicchat-automation.service';
import { WhatsAppError } from '../integrations/whatsapp/whatsapp.errors';

/**
 * Decision Gate item 14 (GAP-18): escalonamento WhatsApp real, com controles
 * de produção — canal precisa estar habilitado, provedor configurado,
 * destinatário com telefone, limite anti-spam por minuto, status honesto
 * (sent/failed, nunca fabricado), retry controlado e limitado.
 */
function makeQb(overrides: Partial<Record<string, unknown>> = {}) {
  const qb: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
  };
  Object.assign(qb, overrides);
  return qb;
}

function makeService(opts: {
  channelEnabled?: boolean;
  configured?: boolean;
  memberPhone?: string | null;
  recentSends?: number;
} = {}) {
  const {
    channelEnabled = true, configured = true, memberPhone = '+5511999999999', recentSends = 0,
  } = opts;

  const notificationQb = makeQb({ getCount: jest.fn().mockResolvedValue(recentSends) });
  const memberQb = makeQb({ getOne: jest.fn().mockResolvedValue(memberPhone ? { phone: memberPhone } : null) });

  const notificationRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => ({ id: 'notif-1', metadata: {}, ...(v as object) })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(() => notificationQb),
  };
  const orgMemberRepo = { createQueryBuilder: jest.fn(() => memberQb) };
  const settingsRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 's1', tenant_id: 't1', notification_channels: { in_app: true, whatsapp: channelEnabled, sms: false },
    }),
  };
  const eventRepo = { create: jest.fn((v: unknown) => v), save: jest.fn().mockResolvedValue({}) };

  const ds = {
    getRepository: jest.fn((entity: { name: string }) => {
      if (entity.name === 'MusicChatAutomationNotificationEntity') return notificationRepo;
      if (entity.name === 'OrgMemberEntity') return orgMemberRepo;
      if (entity.name === 'MusicChatAutomationSettingsEntity') return settingsRepo;
      if (entity.name === 'MusicChatAutomationEventEntity') return eventRepo;
      return { createQueryBuilder: jest.fn(() => makeQb()) };
    }),
  };

  const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const whatsapp = {
    isConfigured: jest.fn().mockResolvedValue(configured),
    sendTextMessage: jest.fn().mockResolvedValue({ externalMessageId: 'wamid.123' }),
  };

  const ws = { sendToTenant: jest.fn(), sendToUser: jest.fn(), notifyDataChanged: jest.fn() };

  const svc = new MusicChatAutomationService(ds as never, notifications as never, whatsapp as never, ws as never);
  return { svc, notificationRepo, orgMemberRepo, settingsRepo, whatsapp, notifications, ws };
}

const baseDto = {
  conversationId: 'conv-1', level: 'manager', recipientUserId: 'auth-user-1',
  channel: 'whatsapp' as const, title: 'Escalonamento', body: 'Conversa sem resposta',
};

describe('MusicChatAutomationService — escalonamento WhatsApp (Decision Gate item 14)', () => {
  it('não envia e marca CHANNEL_DISABLED quando o canal whatsapp está desabilitado nas configurações', async () => {
    const { svc, notificationRepo } = makeService({ channelEnabled: false });
    await svc.sendNotification('t1', baseDto);

    expect(notificationRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'notif-1' }),
      expect.objectContaining({
        status: 'failed',
        metadata: expect.objectContaining({ externalDelivery: expect.objectContaining({ sent: false, code: 'CHANNEL_DISABLED' }) }),
      }),
    );
  });

  it('não envia e marca PROVIDER_NOT_CONFIGURED quando o WhatsApp Cloud API não está configurado', async () => {
    const { svc, notificationRepo, whatsapp } = makeService({ configured: false });
    await svc.sendNotification('t1', baseDto);

    expect(whatsapp.sendTextMessage).not.toHaveBeenCalled();
    expect(notificationRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ metadata: expect.objectContaining({ externalDelivery: expect.objectContaining({ code: 'PROVIDER_NOT_CONFIGURED' }) }) }),
    );
  });

  it('não envia e marca INVALID_RECIPIENT quando o destinatário não tem telefone cadastrado', async () => {
    const { svc, notificationRepo, whatsapp } = makeService({ memberPhone: null });
    await svc.sendNotification('t1', baseDto);

    expect(whatsapp.sendTextMessage).not.toHaveBeenCalled();
    expect(notificationRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ metadata: expect.objectContaining({ externalDelivery: expect.objectContaining({ code: 'INVALID_RECIPIENT' }) }) }),
    );
  });

  it('não envia e marca RATE_LIMITED quando o limite por minuto do tenant é atingido', async () => {
    const { svc, notificationRepo, whatsapp } = makeService({ recentSends: 20 });
    await svc.sendNotification('t1', baseDto);

    expect(whatsapp.sendTextMessage).not.toHaveBeenCalled();
    expect(notificationRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ metadata: expect.objectContaining({ externalDelivery: expect.objectContaining({ code: 'RATE_LIMITED' }) }) }),
    );
  });

  it('envia de verdade e marca status=sent com o id real da mensagem quando todos os controles passam', async () => {
    const { svc, notificationRepo, whatsapp } = makeService();
    await svc.sendNotification('t1', baseDto);

    expect(whatsapp.sendTextMessage).toHaveBeenCalledWith('t1', '+5511999999999', baseDto.body);
    expect(notificationRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'sent',
        metadata: expect.objectContaining({ externalDelivery: expect.objectContaining({ sent: true, externalMessageId: 'wamid.123' }) }),
      }),
    );
  });

  it('marca status=failed honestamente (nunca "sent" fictício) quando a Meta API rejeita o envio', async () => {
    const { svc, notificationRepo, whatsapp } = makeService();
    whatsapp.sendTextMessage.mockRejectedValueOnce(new WhatsAppError('WHATSAPP_INVALID_RECIPIENT', 'Número inválido'));

    await svc.sendNotification('t1', baseDto);

    expect(notificationRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'failed',
        metadata: expect.objectContaining({ externalDelivery: expect.objectContaining({ sent: false, code: 'WHATSAPP_INVALID_RECIPIENT' }) }),
      }),
    );
  });

  it('canal sms permanece honestamente prepared_not_sent_in_production — nunca chama o provedor WhatsApp', async () => {
    const { svc, whatsapp } = makeService();
    await svc.sendNotification('t1', { ...baseDto, channel: 'sms' });
    expect(whatsapp.sendTextMessage).not.toHaveBeenCalled();
    expect(whatsapp.isConfigured).not.toHaveBeenCalled();
  });
});

describe('MusicChatAutomationService.retryNotification', () => {
  it('404 quando a notificação não existe', async () => {
    const { svc, notificationRepo } = makeService();
    notificationRepo.findOne.mockResolvedValueOnce(null);
    await expect(svc.retryNotification('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita reenvio de canal que não é whatsapp', async () => {
    const { svc, notificationRepo } = makeService();
    notificationRepo.findOne.mockResolvedValueOnce({ id: 'n1', channel: 'sms', status: 'failed', metadata: {} });
    await expect(svc.retryNotification('t1', 'n1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita reenvio de notificação que não está com status failed', async () => {
    const { svc, notificationRepo } = makeService();
    notificationRepo.findOne.mockResolvedValueOnce({ id: 'n1', channel: 'whatsapp', status: 'sent', metadata: {} });
    await expect(svc.retryNotification('t1', 'n1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita reenvio após atingir o limite de tentativas', async () => {
    const { svc, notificationRepo } = makeService();
    notificationRepo.findOne.mockResolvedValueOnce({ id: 'n1', channel: 'whatsapp', status: 'failed', metadata: { retryCount: 3 } });
    await expect(svc.retryNotification('t1', 'n1')).rejects.toThrow(/Limite de 3 tentativas/);
  });

  it('reenvia com sucesso e incrementa retryCount', async () => {
    const { svc, notificationRepo } = makeService();
    notificationRepo.findOne
      .mockResolvedValueOnce({ id: 'n1', conversation_id: 'conv-1', channel: 'whatsapp', status: 'failed', metadata: { retryCount: 0 } })
      .mockResolvedValueOnce({ id: 'n1', conversation_id: 'conv-1', channel: 'whatsapp', status: 'prepared', metadata: { retryCount: 1 } })
      .mockResolvedValueOnce({ id: 'n1', conversation_id: 'conv-1', channel: 'whatsapp', status: 'sent', metadata: { retryCount: 1 } });

    const result = await svc.retryNotification('t1', 'n1');

    expect(notificationRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n1' }),
      expect.objectContaining({ status: 'prepared', metadata: expect.objectContaining({ retryCount: 1 }) }),
    );
    expect(result.status).toBe('sent');
  });
});
