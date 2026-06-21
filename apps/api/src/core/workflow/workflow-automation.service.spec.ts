import 'reflect-metadata';
import { WorkflowAutomationService } from './workflow-automation.service';

function makeExecution() {
  return {
    start: jest.fn(async () => 'exec-1'),
    logAction: jest.fn(async () => undefined),
    finish: jest.fn(async () => 'success'),
  };
}

const events = () => ({ on: jest.fn(), emitTyped: jest.fn() });
const context = () => ({
  runInTenantContext: jest.fn(
    async (_ctx: unknown, work: (manager: unknown) => Promise<unknown>) => work({}),
  ),
});

describe('WorkflowAutomationService.processEvent (persistência por execução)', () => {
  it('executa ações e registra execução com sucesso', async () => {
    const execution = makeExecution();
    const notifQueue = { add: jest.fn(async () => undefined) };
    const dbContext = context();
    const svc = new WorkflowAutomationService(
      null, events() as never, {} as never, execution as never, notifQueue as never,
      dbContext as never,
    );

    svc.register({ id: 'r1', name: 'Regra 1', event: 'lead.created', actions: [{ type: 'notify', template: 't' }] });
    await svc.processEvent('lead.created', { type: 'lead.created', tenantId: 't1', payload: {} } as never);

    expect(execution.start).toHaveBeenCalledWith(expect.objectContaining({ ruleId: 'r1', actionsTotal: 1 }));
    expect(notifQueue.add).toHaveBeenCalled();
    expect(execution.logAction).toHaveBeenCalledWith('exec-1', 't1', 'notify', 'success');
    expect(execution.finish).toHaveBeenCalledWith('exec-1', expect.objectContaining({ succeeded: 1, failed: 0 }));
    expect(dbContext.runInTenantContext).toHaveBeenCalledWith(
      { tenantId: 't1', orgId: null, role: null },
      expect.any(Function),
    );
  });

  it('ação que falha é registrada como failed e enviada ao DLQ', async () => {
    const execution = makeExecution();
    // add lança no primeiro uso (notification); enqueueDlq engole o erro internamente.
    const notifQueue = { add: jest.fn(async (name: string) => { if (name === 'notification') throw new Error('queue down'); }) };
    const svc = new WorkflowAutomationService(
      null, events() as never, {} as never, execution as never, notifQueue as never,
      context() as never,
    );

    svc.register({ id: 'r2', name: 'Regra 2', event: 'release.published', actions: [{ type: 'notify', template: 't' }] });
    await svc.processEvent('release.published', { type: 'release.published', tenantId: 't1', payload: {} } as never);

    expect(execution.logAction).toHaveBeenCalledWith('exec-1', 't1', 'notify', 'failed', expect.any(String));
    expect(execution.finish).toHaveBeenCalledWith('exec-1', expect.objectContaining({ succeeded: 0, failed: 1 }));
  });

  it('não há ação "tag" no engine (stub removido)', () => {
    const svc = new WorkflowAutomationService(
      null, events() as never, {} as never, makeExecution() as never, null as never,
      context() as never,
    );
    // getTriggers expõe as regras registadas; nenhuma usa "tag".
    const hasTag = svc.getTriggers().some((r) => r.actions.some((a) => (a as { type: string }).type === 'tag'));
    expect(hasTag).toBe(false);
  });

  it('falha fechado sem tenant e não inicia workflow_execution', async () => {
    const execution = makeExecution();
    const dbContext = context();
    const svc = new WorkflowAutomationService(
      null, events() as never, {} as never, execution as never, null as never,
      dbContext as never,
    );
    svc.register({ id: 'r3', name: 'Regra 3', event: 'lead.created', actions: [] });

    await svc.processEvent('lead.created', { type: 'lead.created', tenantId: '', payload: {} } as never);

    expect(dbContext.runInTenantContext).not.toHaveBeenCalled();
    expect(execution.start).not.toHaveBeenCalled();
  });

  it('mantém start, logAction e finish dentro do mesmo contexto assíncrono', async () => {
    let contextActive = false;
    const writes: boolean[] = [];
    const execution = {
      start: jest.fn(async () => { writes.push(contextActive); return 'exec-1'; }),
      logAction: jest.fn(async () => { writes.push(contextActive); }),
      finish: jest.fn(async () => { writes.push(contextActive); return 'success'; }),
    };
    const dbContext = {
      runInTenantContext: jest.fn(async (_ctx: unknown, work: () => Promise<void>) => {
        contextActive = true;
        try {
          await work();
        } finally {
          contextActive = false;
        }
      }),
    };
    const svc = new WorkflowAutomationService(
      null, events() as never, {} as never, execution as never,
      { add: jest.fn(async () => undefined) } as never, dbContext as never,
    );
    svc.register({
      id: 'r4',
      name: 'Regra 4',
      event: 'contract.signed',
      actions: [{ type: 'notify', template: 'signed' }],
    });

    await svc.processEvent(
      'contract.signed',
      { type: 'contract.signed', tenantId: 'tenant-a', payload: {} } as never,
    );

    expect(writes).toEqual([true, true, true]);
  });
});
