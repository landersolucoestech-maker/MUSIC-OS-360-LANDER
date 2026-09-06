import 'reflect-metadata';
import { ProjectPlanningAutomation } from './project-planning.automation';
import { passThroughTenantContext } from '../../../test/helpers/tenant-context.mock';

// ─── Mocks de fronteira (DB / SkillRunService / AIService) ────────────────────

function makeSkillRun() {
  return {
    start: jest.fn(async () => 'run-1'),
    succeed: jest.fn(async () => undefined),
    fail: jest.fn(async () => undefined),
    log: jest.fn(async () => undefined),
  };
}

function makeAi(content: string) {
  return {
    complete: jest.fn(async () => ({
      content,
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: 1,
      outputTokens: 1,
      costUsd: 0,
      latencyMs: 1,
    })),
  };
}

function makeFailingAi() {
  return { complete: jest.fn(async () => { throw new Error('Nenhum provider de AI configurado'); }) };
}

/**
 * Mock de DataSource que roteia por SQL:
 *  - SELECT ... FROM skill_runs → skillRunRows (guarda de idempotência)
 *  - SELECT ... FROM projects   → projectRows
 *  - UPDATE                     → undefined
 */
function makeDs(projectRows: unknown[], skillRunRows: unknown[] = []) {
  const query = jest.fn(async (sql: string) => {
    if (/FROM\s+skill_runs/i.test(sql)) return skillRunRows;
    if (/FROM\s+projects/i.test(sql)) return projectRows;
    return undefined;
  });
  return { ds: { query }, query };
}

function makeEvent(type = 'lancamento') {
  return {
    tenantId: 't1',
    payload: {
      projectId: 'p1',
      tenantId: 't1',
      title: 'Single Aurora',
      type,
      artistId: null,
      completedBy: 'u1',
      completedAt: new Date().toISOString(),
    },
  };
}

const PROJECT_ROW = {
  nome: 'Single Aurora',
  type: 'lancamento',
  descricao: 'Lançamento do single Aurora',
  artist_id: null,
  end_date: null,
  metadata: {},
};

const VALID_PLAN_JSON = JSON.stringify({
  summary: 'Plano operacional do lançamento',
  phases: [{ name: 'Pré-lançamento', description: 'preparar', order: 1 }],
  tasks: [{ title: 'Pitch playlists', description: 'enviar', department: 'Marketing', priority: 'high' }],
  dependencies: [],
  risks: [],
  suggestedOwners: [],
  milestones: [],
  checklist: ['Confirmar metadados'],
});

const IDEMPOTENCY_KEY = 'project.completed:t1:p1';

describe('ProjectPlanningAutomation (project.completed → project-planning)', () => {
  it('Item 6/7: executa, registra skill_run e grava projects.metadata.aiPlan no sucesso', async () => {
    const { ds, query } = makeDs([PROJECT_ROW]);
    const skillRun = makeSkillRun();
    const ai = makeAi(VALID_PLAN_JSON);
    const handler = new ProjectPlanningAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    await handler.onProjectCompleted(makeEvent() as never);

    // skill_run start com os campos corretos
    expect(skillRun.start).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        skillName: 'project-planning',
        entityType: 'project',
        entityId: 'p1',
        input: { idempotencyKey: IDEMPOTENCY_KEY },
      }),
    );
    // sucesso registrado, sem falha
    expect(skillRun.succeed).toHaveBeenCalledWith(
      'run-1', 't1', 'project-planning',
      expect.objectContaining({ idempotencyKey: IDEMPOTENCY_KEY, status: 'generated' }),
    );
    expect(skillRun.fail).not.toHaveBeenCalled();

    // aiPlan gravado via UPDATE
    const updateCall = query.mock.calls.find((c: unknown[]) => /UPDATE/i.test(c[0] as string));
    expect(updateCall).toBeDefined();
    const params = (updateCall as unknown as [string, string[]])[1];
    const meta = JSON.parse(params[0]);
    expect(meta.aiPlan).toBeDefined();
    expect(meta.aiPlan.source).toBe('native-automation');
    expect(meta.aiPlan.skill).toBe('project-planning');
    expect(meta.aiPlan.event).toBe('project.completed');
    expect(meta.aiPlan.idempotencyKey).toBe(IDEMPOTENCY_KEY);
    expect(meta.aiPlan.status).toBe('generated');
    expect(meta.aiPlan.parsed.summary).toContain('Plano operacional');
  });

  it('Item 8: idempotência — não reprocessa se aiPlan com a mesma chave já existe', async () => {
    const rowWithPlan = {
      ...PROJECT_ROW,
      metadata: { aiPlan: { idempotencyKey: IDEMPOTENCY_KEY, status: 'generated' } },
    };
    const { ds, query } = makeDs([rowWithPlan]);
    const skillRun = makeSkillRun();
    const ai = makeAi(VALID_PLAN_JSON);
    const handler = new ProjectPlanningAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    await handler.onProjectCompleted(makeEvent() as never);

    expect(skillRun.start).not.toHaveBeenCalled();
    expect(ai.complete).not.toHaveBeenCalled();
    // apenas o SELECT; nenhum UPDATE
    const updateCall = query.mock.calls.find((c: unknown[]) => /UPDATE/i.test(c[0] as string));
    expect(updateCall).toBeUndefined();
  });

  it('R2: idempotência (skill_runs) — não reprocessa se já houver run de sucesso com a mesma chave', async () => {
    const { ds, query } = makeDs([PROJECT_ROW], [{ '1': 1 }]);
    const skillRun = makeSkillRun();
    const ai = makeAi(VALID_PLAN_JSON);
    const handler = new ProjectPlanningAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    await handler.onProjectCompleted(makeEvent() as never);

    expect(skillRun.start).not.toHaveBeenCalled();
    expect(ai.complete).not.toHaveBeenCalled();
    const updateCall = query.mock.calls.find((c: unknown[]) => /UPDATE/i.test(c[0] as string));
    expect(updateCall).toBeUndefined();
  });

  it('Item 9: falha da IA registra fail, não relança e não grava aiPlan', async () => {
    const { ds, query } = makeDs([PROJECT_ROW]);
    const skillRun = makeSkillRun();
    const ai = makeFailingAi();
    const handler = new ProjectPlanningAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    // Não deve lançar (project.completed não é revertido)
    await expect(handler.onProjectCompleted(makeEvent() as never)).resolves.toBeUndefined();

    expect(skillRun.start).toHaveBeenCalled();
    expect(skillRun.fail).toHaveBeenCalledWith('run-1', 't1', 'project-planning', expect.any(Error));
    expect(skillRun.succeed).not.toHaveBeenCalled();
    const updateCall = query.mock.calls.find((c: unknown[]) => /UPDATE/i.test(c[0] as string));
    expect(updateCall).toBeUndefined();
  });

  it('Guarda: projeto não-musical é ignorado (sem run, sem query)', async () => {
    const { ds, query } = makeDs([PROJECT_ROW]);
    const skillRun = makeSkillRun();
    const ai = makeAi(VALID_PLAN_JSON);
    const handler = new ProjectPlanningAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    await handler.onProjectCompleted(makeEvent('financeiro') as never);

    // M2: isEligible=false barra ANTES de qualquer load/IA/start.
    expect(skillRun.start).not.toHaveBeenCalled();
    expect(ai.complete).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
