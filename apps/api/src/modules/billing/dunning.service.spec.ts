import 'reflect-metadata';
import { DunningService } from './dunning.service';
import { NotificationsProcessor } from '../../queues/processors/notifications.processor';
import { NOTIFICATION_JOB_NAMES } from '../../queues/queue.constants';
import { BillingSubscriptionEntity, TenantEntity } from '../../database/entities';

/**
 * P1: DunningService.enqueueNotification (formerly enqueueEmail) used to add
 * a job literally named 'email' with a {tenantId, template, data} payload —
 * NotificationsProcessor's switch only handles 'send'/'broadcast-tenant' and
 * reads {tenantId, title, body, type}. Every dunning notification was
 * silently dropped at the processor's `default:` branch. These tests prove
 * (a) the producer now sends a job the processor's switch actually routes,
 * and (b) — not accepting "job added successfully" as proof — that feeding
 * the exact captured payload through a real NotificationsProcessor.process()
 * actually persists a notification, rather than hitting `default:`.
 */
describe('DunningService — notification dispatch (P1, job-name/payload contract)', () => {
  function makeSub(daysAgo: number) {
    const updatedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return { id: 'sub-1', org_id: 'org-1', status: 'past_due', updated_at: updatedAt.toISOString() };
  }

  function makeDs(sub: Record<string, unknown>) {
    // BillingSubscriptionEntity's query builder is used both for the initial
    // past_due listing (getMany) and, inside hardSuspend, for an UPDATE —
    // support both chains on the same mock.
    const subsQb = {
      where: jest.fn().mockReturnThis(), getMany: jest.fn(async () => [sub]),
      update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => ({ affected: 1 })),
    };
    const tenantQb = {
      select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => ({ id: 'tenant-1' })),
      update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => ({ affected: 1 })),
    };
    const updateQb = {
      update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(), execute: jest.fn(async () => ({ affected: 1 })),
    };
    return {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === BillingSubscriptionEntity) return { createQueryBuilder: jest.fn(() => subsQb) };
        if (entity === TenantEntity) return { createQueryBuilder: jest.fn(() => tenantQb) };
        return { createQueryBuilder: jest.fn(() => updateQb) };
      }),
    };
  }

  it('reminder (day 5): enqueues NOTIFICATION_JOB_NAMES.SEND with a NotificationPayload-shaped job — not "email"/{template,data}', async () => {
    const ds = makeDs(makeSub(5));
    const ws = { sendToTenant: jest.fn() };
    const notifQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const service = new DunningService(ds as never, ws as never, notifQueue as never);

    await service.runDunningCycle();

    expect(notifQueue.add).toHaveBeenCalledWith(
      NOTIFICATION_JOB_NAMES.SEND,
      expect.objectContaining({
        tenantId: 'tenant-1',
        type: 'billing.payment_reminder',
        title: expect.stringContaining('atraso'),
      }),
      { attempts: 3 },
    );
    // The old, dropped shape must never be sent again.
    expect(notifQueue.add).not.toHaveBeenCalledWith('email', expect.anything(), expect.anything());
  });

  it('proves dispatch, not just enqueue: the captured job actually persists via a real NotificationsProcessor.process()', async () => {
    const ds = makeDs(makeSub(5));
    const ws = { sendToTenant: jest.fn() };
    const notifQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const service = new DunningService(ds as never, ws as never, notifQueue as never);

    await service.runDunningCycle();

    const [jobName, jobData] = notifQueue.add.mock.calls[0];

    // Real processor, mocked persistence — proves the switch routes this job
    // name to handleSend (which reads title/type/metadata), not `default:`.
    const saved = { id: 'notif-1', created_at: new Date() };
    const notifRepo = { create: jest.fn((x) => x), save: jest.fn(async () => saved) };
    const processorDs = { getRepository: jest.fn(() => notifRepo) };
    const wsGateway = { sendToUser: jest.fn(), sendToTenant: jest.fn() };
    const dbContext = {
      runInTenantContext: jest.fn(async (_ctx: unknown, work: (m: unknown) => Promise<unknown>) => work(null)),
    };
    const processor = new NotificationsProcessor(processorDs as never, wsGateway as never, dbContext as never);

    const result = await processor.process({ name: jobName, id: 'job-1', data: jobData } as never);

    expect(notifRepo.save).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });

  it('hard-suspend (day 15+): same fix applies — enqueues a routable job', async () => {
    const ds = makeDs(makeSub(20));
    const ws = { sendToTenant: jest.fn() };
    const notifQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const service = new DunningService(ds as never, ws as never, notifQueue as never);

    await service.runDunningCycle();

    expect(notifQueue.add).toHaveBeenCalledWith(
      NOTIFICATION_JOB_NAMES.SEND,
      expect.objectContaining({ tenantId: 'tenant-1', type: 'billing.hard_suspend' }),
      { attempts: 3 },
    );
  });

  it('soft-suspend warning (day 10): same fix applies — enqueues a routable job', async () => {
    const ds = makeDs(makeSub(10));
    const ws = { sendToTenant: jest.fn() };
    const notifQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const service = new DunningService(ds as never, ws as never, notifQueue as never);

    await service.runDunningCycle();

    expect(notifQueue.add).toHaveBeenCalledWith(
      NOTIFICATION_JOB_NAMES.SEND,
      expect.objectContaining({ tenantId: 'tenant-1', type: 'billing.soft_suspend_warning' }),
      { attempts: 3 },
    );
  });
});
