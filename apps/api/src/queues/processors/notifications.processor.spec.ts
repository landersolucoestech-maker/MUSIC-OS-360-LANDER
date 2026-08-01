import { Test } from '@nestjs/testing';
import { NotificationsProcessor } from './notifications.processor';
import { DATA_SOURCE }             from '../../database/database.module';
import { DatabaseContextService }  from '../../database/database-context.service';
import { RealtimeService }         from '../../core/realtime/realtime.service';
import { NOTIFICATION_JOB_NAMES }   from '../queue.constants';

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
  const mockWs = { sendToUser: jest.fn(), sendToTenant: jest.fn() };
  // Passthrough DatabaseContextService: invokes the work with no manager →
  // the processor falls back to the cached repo (flag-OFF behaviour).
  const mockDbContext = {
    runInTenantContext: jest.fn((_ctx: unknown, work: (m: unknown) => unknown) => work(undefined)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDs = buildMockDs();
    const module = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        { provide: DATA_SOURCE, useValue: mockDs },
        { provide: RealtimeService, useValue: mockWs },
        { provide: DatabaseContextService, useValue: mockDbContext },
      ],
    }).compile();
    processor = module.get<NotificationsProcessor>(NotificationsProcessor);
  });

  it('persiste no banco', async () => {
    await processor.process({ name: NOTIFICATION_JOB_NAMES.SEND, data: {
      tenantId: 't1', userId: 'u1', title: 'Teste', type: 'info', body: 'msg',
    }} as any);
    expect(mockDs._repo.save).toHaveBeenCalled();
    expect(mockDs._repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 't1', user_id: 'u1', title: 'Teste' }),
    );
  });

  it('envia via WebSocket após persistir', async () => {
    await processor.process({ name: NOTIFICATION_JOB_NAMES.SEND, data: {
      tenantId: 't1', userId: 'u1', title: 'WS Test', type: 'info',
    }} as any);
    expect(mockWs.sendToUser).toHaveBeenCalledWith(
      't1', 'u1', 'notification:new',
      expect.objectContaining({ id: 'n1' }),
    );
  });

  it('inclui entity e entityId quando fornecidos', async () => {
    await processor.process({ name: NOTIFICATION_JOB_NAMES.SEND, data: {
      tenantId: 't1', userId: 'u1', title: 'X',
      type: 'entity', entity: 'artists', entityId: 'a1',
    }} as any);
    expect(mockDs._repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'artists', entity_id: 'a1' }),
    );
  });

  // ── P2-5: session-context wiring ───────────────────────────────────────────
  it('persiste dentro de runInTenantContext com o tenant do job', async () => {
    await processor.process({ name: NOTIFICATION_JOB_NAMES.SEND, data: {
      tenantId: 't1', userId: 'u1', title: 'Ctx', type: 'info',
    }} as any);
    expect(mockDbContext.runInTenantContext).toHaveBeenCalledWith(
      { tenantId: 't1', orgId: null, role: null },
      expect.any(Function),
    );
    expect(mockDs._repo.save).toHaveBeenCalled();
  });

  it('aborta (fail-closed) job SEND sem tenantId, sem tocar o banco', async () => {
    const out = await processor.process({ name: NOTIFICATION_JOB_NAMES.SEND, data: {
      userId: 'u1', title: 'NoTenant', type: 'info',
    }} as any);
    expect(out).toBeNull();
    expect(mockDbContext.runInTenantContext).not.toHaveBeenCalled();
    expect(mockDs._repo.save).not.toHaveBeenCalled();
  });
});
