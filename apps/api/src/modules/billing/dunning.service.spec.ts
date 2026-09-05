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
    const getRepository = jest.fn((entity: unknown) => {
      if (entity === BillingSubscriptionEntity) return { createQueryBuilder: jest.fn(() => subsQb) };
      if (entity === TenantEntity) return { createQueryBuilder: jest.fn(() => tenantQb) };
      return { createQueryBuilder: jest.fn(() => updateQb) };
    });
    // No dbContext provided in these tests → DunningService falls back to
    // work(this.ds!.manager) — real TypeORM's ds.manager is itself an
    // EntityManager with getRepository, so this mock mirrors that shape.
    return { getRepository, manager: { getRepository } };
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

  it('P1 (RLS-blind fix): hard-suspend writes go through runInTenantContext with the resolved tenantId', async () => {
    const ds = makeDs(makeSub(20));
    const ws = { sendToTenant: jest.fn() };
    const notifQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const dbContext = {
      runInTenantContext: jest.fn(async (ctx: unknown, work: (m: unknown) => Promise<unknown>) => {
        expect(ctx).toEqual({ tenantId: 'tenant-1', orgId: null, role: null });
        return work(ds.manager);
      }),
    };
    const service = new DunningService(ds as never, ws as never, notifQueue as never, dbContext as never);

    await service.runDunningCycle();

    expect(dbContext.runInTenantContext).toHaveBeenCalledTimes(1);
  });

  it('P1 (per-tenant isolation): one sub throwing does not abort the cycle for the others', async () => {
    const badSub = { id: 'sub-bad', org_id: 'org-bad', status: 'past_due', updated_at: new Date().toISOString() };
    const goodSub = makeSub(5);
    const subsQb = { where: jest.fn().mockReturnThis(), getMany: jest.fn(async () => [badSub, goodSub]) };
    const tenantQbGood = {
      select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => ({ id: 'tenant-1' })),
    };
    // resolveTenantId's own try/catch normally swallows a throw and returns
    // null (skipping that sub) — the FIRST tenant lookup (org-bad) throws to
    // exercise that path; the SECOND (the good sub) must still succeed.
    let call = 0;
    const ds2 = {
      manager: {},
      getRepository: jest.fn((entity: unknown) => {
        if (entity === BillingSubscriptionEntity) return { createQueryBuilder: jest.fn(() => subsQb) };
        if (entity === TenantEntity) {
          call += 1;
          if (call === 1) throw new Error('boom for org-bad');
          return { createQueryBuilder: jest.fn(() => tenantQbGood) };
        }
        return {};
      }),
    };
    const ws = { sendToTenant: jest.fn() };
    const notifQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const service = new DunningService(ds2 as never, ws as never, notifQueue as never);

    await service.runDunningCycle();

    // The good sub still got its reminder despite the bad one throwing first.
    expect(notifQueue.add).toHaveBeenCalledWith(
      NOTIFICATION_JOB_NAMES.SEND,
      expect.objectContaining({ tenantId: 'tenant-1', type: 'billing.payment_reminder' }),
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
