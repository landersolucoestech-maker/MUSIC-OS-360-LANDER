import { TransactionEventsHandler } from './transaction-events.handler';

/** P2-9 — context propagation + fail-closed for the transaction-paid handler. */
describe('TransactionEventsHandler — P2-9', () => {
  const makeQb = (one: unknown) => ({
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(one),
    execute: jest.fn().mockResolvedValue({}),
  });

  function build() {
    const contractRepo = { createQueryBuilder: jest.fn(() => makeQb(null)) };
    const taskRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'existing' }),
      create: jest.fn(), save: jest.fn(),
    };
    const ds = { getRepository: jest.fn().mockReturnValueOnce(contractRepo).mockReturnValueOnce(taskRepo) };
    const activityLogs = { create: jest.fn().mockResolvedValue(undefined) };
    const dbContext = { runInTenantContext: jest.fn((_c: unknown, w: (m: unknown) => unknown) => w(undefined)) };
    const handler = new TransactionEventsHandler(ds as any, activityLogs as any, dbContext as any);
    return { handler, contractRepo, taskRepo, activityLogs, dbContext };
  }

  const payload = { transactionId: 'tx1', contratoId: 'c1', valor: 100, paidBy: 'u1', paidAt: '2026-06-12' };

  it('tenantId válido → executa dentro de runInTenantContext', async () => {
    const { handler, dbContext, activityLogs } = build();
    await handler.onTransactionPaid({ tenantId: 't1', payload, correlationId: null } as any);
    expect(dbContext.runInTenantContext).toHaveBeenCalledWith({ tenantId: 't1', orgId: null, role: null }, expect.any(Function));
    expect(activityLogs.create).toHaveBeenCalledWith('t1', 'u1', expect.objectContaining({ action: 'paid' }));
  });

  it('tenantId ausente → aborta (fail-closed), não toca banco', async () => {
    const { handler, dbContext, contractRepo } = build();
    await handler.onTransactionPaid({ payload, correlationId: null } as any);
    expect(dbContext.runInTenantContext).not.toHaveBeenCalled();
    expect(contractRepo.createQueryBuilder).not.toHaveBeenCalled();
  });
});
