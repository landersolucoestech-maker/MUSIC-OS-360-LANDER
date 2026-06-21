import 'reflect-metadata';
import { SupportTriageAutomation } from './support-triage.automation';
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
 *  - SELECT ... FROM skill_runs      → skillRunRows (guarda de idempotência)
 *  - SELECT ... FROM support_tickets → ticketRows
 *  - UPDATE                          → undefined
 */
function makeDs(ticketRows: unknown[], skillRunRows: unknown[] = []) {
  const query = jest.fn(async (sql: string) => {
    if (/FROM\s+skill_runs/i.test(sql)) return skillRunRows;
    if (/FROM\s+support_tickets/i.test(sql)) return ticketRows;
    return undefined;
  });
  return { ds: { query }, query };
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 't1',
    payload: {
      tenantId: 't1',
      ticketId: 'k1',
      createdBy: 'u1',
      category: 'financial',
      priority: 'high',
      ...overrides,
    },
  };
}

const TICKET_ROW = {
  subject: 'Cobrança duplicada',
  description: 'Fui cobrado duas vezes na fatura deste mês.',
  category: 'financial',
  metadata: {},
};

const VALID_TRIAGE_JSON = JSON.stringify({
  category: 'Erro financeiro',
  priority: 'high',
  severity: 'high',
  affectedModule: 'financial',
  likelyCause: 'Cobrança em duplicidade no gateway',
  suggestedResponse: 'Olá! Já estamos verificando a cobrança duplicada.',
  escalationNeeded: true,
  SLARecommendation: { responseTime: '2h', resolutionTime: '1 dia útil', reason: 'tema financeiro sensível' },
  internalNotes: ['Verificar logs do gateway'],
  recommendedActions: [{ action: 'Abrir investigação financeira', priority: 'high', ownerArea: 'financial' }],
});

const IDEMPOTENCY_KEY = 'support.ticket.created:t1:k1';

describe('SupportTriageAutomation (support.ticket.created → support-triage)', () => {
  it('Fluxo: executa, registra skill_run e grava support_tickets.metadata.aiTriage no sucesso', async () => {
    const { ds, query } = makeDs([TICKET_ROW]);
    const skillRun = makeSkillRun();
    const ai = makeAi(VALID_TRIAGE_JSON);
    const handler = new SupportTriageAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    await handler.onSupportTicketCreated(makeEvent() as never);

    expect(skillRun.start).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        skillName: 'support-triage',
        entityType: 'support_ticket',
        entityId: 'k1',
        input: { idempotencyKey: IDEMPOTENCY_KEY },
      }),
    );
    expect(skillRun.succeed).toHaveBeenCalledWith(
      'run-1', 't1', 'support-triage',
      expect.objectContaining({ idempotencyKey: IDEMPOTENCY_KEY, status: 'generated' }),
    );
    expect(skillRun.fail).not.toHaveBeenCalled();

    // input montado a partir do ticket: subject + message(description) + affectedModule(category)
    const aiCalls = ai.complete.mock.calls as unknown as Array<[{ prompt: string; jsonMode: boolean }]>;
    const aiArg = aiCalls[0][0];
    expect(aiArg.jsonMode).toBe(true);
    expect(aiArg.prompt).toContain('Cobrança duplicada');
    expect(aiArg.prompt).toContain('financial');

    // aiTriage gravado via UPDATE
    const updateCall = query.mock.calls.find((c: unknown[]) => /UPDATE/i.test(c[0] as string));
    expect(updateCall).toBeDefined();
    const params = (updateCall as unknown as [string, string[]])[1];
    const meta = JSON.parse(params[0]);
    expect(meta.aiTriage).toBeDefined();
    expect(meta.aiTriage.source).toBe('native-automation');
    expect(meta.aiTriage.skill).toBe('support-triage');
    expect(meta.aiTriage.event).toBe('support.ticket.created');
    expect(meta.aiTriage.idempotencyKey).toBe(IDEMPOTENCY_KEY);
    expect(meta.aiTriage.status).toBe('generated');
    expect(meta.aiTriage.parsed.category).toBe('Erro financeiro');
  });

  it('Idempotência (metadata): não reprocessa se aiTriage com a mesma chave já existe', async () => {
    const rowWithTriage = {
      ...TICKET_ROW,
      metadata: { aiTriage: { idempotencyKey: IDEMPOTENCY_KEY, status: 'generated' } },
    };
    const { ds, query } = makeDs([rowWithTriage]);
    const skillRun = makeSkillRun();
    const ai = makeAi(VALID_TRIAGE_JSON);
    const handler = new SupportTriageAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    await handler.onSupportTicketCreated(makeEvent() as never);

    expect(skillRun.start).not.toHaveBeenCalled();
    expect(ai.complete).not.toHaveBeenCalled();
    const updateCall = query.mock.calls.find((c: unknown[]) => /UPDATE/i.test(c[0] as string));
    expect(updateCall).toBeUndefined();
  });

  it('Idempotência (skill_runs): não reprocessa se já houver run de sucesso com a mesma chave', async () => {
    const { ds, query } = makeDs([TICKET_ROW], [{ '1': 1 }]);
    const skillRun = makeSkillRun();
    const ai = makeAi(VALID_TRIAGE_JSON);
    const handler = new SupportTriageAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    await handler.onSupportTicketCreated(makeEvent() as never);

    expect(skillRun.start).not.toHaveBeenCalled();
    expect(ai.complete).not.toHaveBeenCalled();
    const updateCall = query.mock.calls.find((c: unknown[]) => /UPDATE/i.test(c[0] as string));
    expect(updateCall).toBeUndefined();
  });

  it('Falha da IA registra fail, não relança e não grava aiTriage', async () => {
    const { ds, query } = makeDs([TICKET_ROW]);
    const skillRun = makeSkillRun();
    const ai = makeFailingAi();
    const handler = new SupportTriageAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    // Não deve lançar (support.ticket.created não é revertido)
    await expect(handler.onSupportTicketCreated(makeEvent() as never)).resolves.toBeUndefined();

    expect(skillRun.start).toHaveBeenCalled();
    expect(skillRun.fail).toHaveBeenCalledWith('run-1', 't1', 'support-triage', expect.any(Error));
    expect(skillRun.succeed).not.toHaveBeenCalled();
    const updateCall = query.mock.calls.find((c: unknown[]) => /UPDATE/i.test(c[0] as string));
    expect(updateCall).toBeUndefined();
  });

  it('Guarda: tenantId/ticketId ausente é ignorado (sem run, sem query)', async () => {
    const { ds, query } = makeDs([TICKET_ROW]);
    const skillRun = makeSkillRun();
    const ai = makeAi(VALID_TRIAGE_JSON);
    const handler = new SupportTriageAutomation(ds as never, skillRun as never, ai as never, passThroughTenantContext(ds) as never);

    await handler.onSupportTicketCreated({ tenantId: 't1', payload: { ticketId: '' } } as never);

    expect(skillRun.start).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
