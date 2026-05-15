import { Test } from '@nestjs/testing';
import { NotificationsProcessor } from './notifications.processor';
import { DATA_SOURCE }             from '../../database/database.module';
import { WsGateway }               from '../../core/websocket/ws.gateway';

const mockNotif = { id: 'n1', title: 'T', type: 'info', created_at: new Date() };

const buildMockDs = () => {
  const repo = {
    create: jest.fn((v: any) => v),
    save:   jest.fn().mockResolvedValue(mockNotif),
  };
  return {
    getRepository: jest.fn(() => repo),
    _repo: repo,
  };
};

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let mockDs: ReturnType<typeof buildMockDs>;
  const mockWs = { sendToUser: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDs = buildMockDs();
    const module = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        { provide: DATA_SOURCE, useValue: mockDs },
        { provide: WsGateway,   useValue: mockWs },
      ],
    }).compile();
    processor = module.get<NotificationsProcessor>(NotificationsProcessor);
  });

  it('persiste no banco', async () => {
    await processor.process({ data: {
      tenantId: 't1', userId: 'u1', title: 'Teste', type: 'info', body: 'msg',
    }} as any);
    expect(mockDs._repo.save).toHaveBeenCalled();
    expect(mockDs._repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 't1', user_id: 'u1', title: 'Teste' }),
    );
  });

  it('envia via WebSocket após persistir', async () => {
    await processor.process({ data: {
      tenantId: 't1', userId: 'u1', title: 'WS Test', type: 'info',
    }} as any);
    expect(mockWs.sendToUser).toHaveBeenCalledWith(
      't1', 'u1', 'notification:new',
      expect.objectContaining({ id: 'n1' }),
    );
  });

  it('inclui entity e entityId quando fornecidos', async () => {
    await processor.process({ data: {
      tenantId: 't1', userId: 'u1', title: 'X',
      type: 'entity', entity: 'artists', entityId: 'a1',
    }} as any);
    expect(mockDs._repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'artists', entity_id: 'a1' }),
    );
  });
});
