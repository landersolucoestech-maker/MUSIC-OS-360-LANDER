import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationEntity } from '../../database/entities';

/**
 * Task M — gap real fechado: `transfer()` usava `convRepo.update()` direto
 * (sem casUpdate), diferente de `updateConversation()` que já estava
 * protegido desde a Task K. Este spec prova o cenário A/B para `transfer()`.
 */
const TENANT = 'tenant-test';
const CONV_ID = 'conv-test';
const NOW = new Date('2026-08-15T10:00:00.000Z');

const baseConv = {
  id: CONV_ID,
  tenant_id: TENANT,
  contact_id: null,
  subject: 'Dúvida sobre contrato',
  status: 'open',
  channel: 'whatsapp',
  assigned_to: 'user-a',
  last_message_at: null,
  metadata: {},
  created_by: 'user-a',
  deleted_at: null,
  updated_at: NOW,
} as unknown as ConversationEntity;

function buildMockDs(updateResult: { affected: number } = { affected: 1 }) {
  const qbResult = { getOne: jest.fn().mockResolvedValue(baseConv) };
  const convRepo = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn(() => qbResult),
    })),
    update: jest.fn().mockResolvedValue(updateResult),
  };
  return {
    getRepository: jest.fn(() => convRepo),
    _convRepo: convRepo,
  };
}

function buildService(updateResult?: { affected: number }) {
  const mockDs = buildMockDs(updateResult);
  const mockEvents = { emitTyped: jest.fn() };
  const mockWs = { sendToTenant: jest.fn() };
  const service = new ConversationsService(mockDs as any, mockEvents as any, mockWs as any);
  return { service, mockDs };
}

describe('ConversationsService.transfer() — Task M concorrência otimista', () => {
  it('sem expectedUpdatedAt: aplica incondicionalmente (retrocompatível)', async () => {
    const { service, mockDs } = buildService({ affected: 1 });
    await service.transfer(TENANT, 'user-b', CONV_ID, { assignee_id: 'user-b' });
    expect(mockDs._convRepo.update).toHaveBeenCalledWith(
      { id: CONV_ID, tenant_id: TENANT },
      expect.objectContaining({ assigned_to: 'user-b' }),
    );
  });

  it('cenário A/B: A abre v.X e transfere (v.Y); B tenta transferir contra v.X -> 409, nunca sobrescreve A em silêncio', async () => {
    const { service, mockDs } = buildService({ affected: 0 });
    await expect(
      service.transfer(TENANT, 'user-b', CONV_ID, {
        assignee_id: 'user-b',
        expectedUpdatedAt: NOW.toISOString(),
      }),
    ).rejects.toThrow(ConflictException);
    expect(mockDs._convRepo.update).toHaveBeenCalledTimes(1);
  });

  it('expectedUpdatedAt nunca vaza para a coluna persistida', async () => {
    const { service, mockDs } = buildService({ affected: 1 });
    await service.transfer(TENANT, 'user-b', CONV_ID, {
      assignee_id: 'user-b',
      expectedUpdatedAt: NOW.toISOString(),
    });
    const [, payload] = mockDs._convRepo.update.mock.calls[0];
    expect(payload).not.toHaveProperty('expectedUpdatedAt');
  });
});
