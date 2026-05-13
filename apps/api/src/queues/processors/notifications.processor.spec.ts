import { Test } from '@nestjs/testing';
import { NotificationsProcessor } from './notifications.processor';
import { DRIZZLE_DB }             from '../../database/database.module';
import { WsGateway }              from '../../core/websocket/ws.gateway';

const mockNotif = { id: 'n1', title: 'T', type: 'info', created_at: new Date() };

const buildMockDb = () => {
  const m = {
    insert:    jest.fn(),
    values:    jest.fn(),
    returning: jest.fn().mockResolvedValue([mockNotif]),
  };
  m.insert.mockReturnValue(m);
  m.values.mockReturnValue(m);
  return m;
};

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let mockDb: ReturnType<typeof buildMockDb>;
  const mockWs = { sendToUser: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb = buildMockDb();
    const module = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        { provide: DRIZZLE_DB, useValue: mockDb },
        { provide: WsGateway,  useValue: mockWs },
      ],
    }).compile();
    processor = module.get<NotificationsProcessor>(NotificationsProcessor);
  });

  it('persiste no banco', async () => {
    await processor.process({ data: {
      tenantId: 't1', userId: 'u1', title: 'Teste',
      type: 'info', body: 'msg',
    }} as any);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith(
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
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'artists', entity_id: 'a1' }),
    );
  });
});
