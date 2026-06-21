import 'reflect-metadata';
import { WorkflowExecutionService } from './workflow-execution.service';

function makeRepo() {
  return {
    create: jest.fn((x: Record<string, unknown>) => x),
    save: jest.fn(async (x: Record<string, unknown>) => ({ ...x, id: 'exec-1' })),
    findOne: jest.fn(async () => ({ id: 'exec-1', started_at: new Date(Date.now() - 500) })),
    update: jest.fn(async () => undefined),
    findAndCount: jest.fn(async () => [[{ id: 'exec-1' }], 1]),
    find: jest.fn(async () => [{ id: 'log-1' }]),
  };
}
const makeDs = () => {
  const repo = makeRepo();
  return { ds: { getRepository: jest.fn(() => repo) }, repo };
};
const ev = () => ({ emitTyped: jest.fn() });

describe('WorkflowExecutionService', () => {
  it('start persiste e emite workflow.execution.started', async () => {
    const { ds, repo } = makeDs();
    const events = ev();
    const svc = new WorkflowExecutionService(ds as never, events as never);
    const id = await svc.start({ tenantId: 't1', ruleId: 'r1', ruleName: 'R1', eventType: 'x.y', actionsTotal: 2 });
    expect(id).toBe('exec-1');
    expect(repo.save).toHaveBeenCalled();
    expect(events.emitTyped).toHaveBeenCalledWith('workflow.execution.started', expect.any(Object));
  });

  it('rejeita start sem tenantId antes de persistir', async () => {
    const { ds, repo } = makeDs();
    const svc = new WorkflowExecutionService(ds as never, ev() as never);

    await expect(svc.start({
      tenantId: '' as never,
      ruleId: 'r1',
      ruleName: 'R1',
      eventType: 'x.y',
      actionsTotal: 1,
    })).rejects.toThrow('Workflow execution requires tenantId');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('logAction exige tenantId', async () => {
    const { ds, repo } = makeDs();
    const svc = new WorkflowExecutionService(ds as never, ev() as never);

    await expect(
      svc.logAction('exec-1', '' as never, 'notify', 'success'),
    ).rejects.toThrow('Workflow execution requires tenantId');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('finish → success quando não há falhas (emite completed)', async () => {
    const { ds } = makeDs();
    const events = ev();
    const svc = new WorkflowExecutionService(ds as never, events as never);
    const status = await svc.finish('exec-1', { tenantId: 't1', ruleId: 'r1', succeeded: 2, failed: 0 });
    expect(status).toBe('success');
    expect(events.emitTyped).toHaveBeenCalledWith('workflow.execution.completed', expect.any(Object));
  });

  it('finish rejeita tenantId vazio antes de atualizar', async () => {
    const { ds, repo } = makeDs();
    const svc = new WorkflowExecutionService(ds as never, ev() as never);

    await expect(svc.finish('exec-1', {
      tenantId: '' as never,
      ruleId: 'r1',
      succeeded: 1,
      failed: 0,
    })).rejects.toThrow('Workflow execution requires tenantId');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('finish → partial quando há sucesso e falha', async () => {
    const { ds } = makeDs();
    const events = ev();
    const svc = new WorkflowExecutionService(ds as never, events as never);
    const status = await svc.finish('exec-1', { tenantId: 't1', ruleId: 'r1', succeeded: 1, failed: 1 });
    expect(status).toBe('partial');
    expect(events.emitTyped).toHaveBeenCalledWith('workflow.execution.completed', expect.any(Object));
  });

  it('finish → failed quando tudo falha (emite failed)', async () => {
    const { ds } = makeDs();
    const events = ev();
    const svc = new WorkflowExecutionService(ds as never, events as never);
    const status = await svc.finish('exec-1', { tenantId: 't1', ruleId: 'r1', succeeded: 0, failed: 2, error: 'boom' });
    expect(status).toBe('failed');
    expect(events.emitTyped).toHaveBeenCalledWith('workflow.execution.failed', expect.any(Object));
  });

  it('list clampa limites; get retorna execução + logs', async () => {
    const { ds } = makeDs();
    const svc = new WorkflowExecutionService(ds as never, ev() as never);
    const page = await svc.list('t1', { limit: 999, offset: -1 });
    expect(page).toMatchObject({ total: 1, limit: 100, offset: 0 });
    const detail = await svc.get('t1', 'exec-1');
    expect(detail?.execution.id).toBe('exec-1');
    expect(detail?.logs).toHaveLength(1);
  });

  it('sem DATA_SOURCE: start tenant-scoped retorna "" e list vazio', async () => {
    const svc = new WorkflowExecutionService(null, ev() as never);
    expect(await svc.start({ tenantId: 't1', ruleId: 'r', ruleName: 'R', eventType: 'e', actionsTotal: 0 })).toBe('');
    expect(await svc.list('t1')).toEqual({ data: [], total: 0, limit: 25, offset: 0 });
  });
});
