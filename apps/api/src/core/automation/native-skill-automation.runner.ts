/**
 * core/automation/native-skill-automation.runner.ts
 *
 * Runner comum para automações NATIVAS, INTERNAS e INVISÍVEIS de AI Skills.
 *
 * Centraliza tudo o que é idêntico entre as automações orientadas a evento
 * (project.completed → project-planning, release.created → release-checklist, …):
 *   — montagem da idempotencyKey ({event}:{tenant}:{entity});
 *   — DUPLA guarda de idempotência: metadata + skill_runs (status success);
 *   — ciclo de auditoria SkillRunService.start/succeed/fail;
 *   — chamada AIService.complete em jsonMode;
 *   — parse via parser do pacote @music-os-360/ai-skills (injetado pelo consumer);
 *   — montagem do ENVELOPE padrão;
 *   — persistência do metadata preservando o existente + histórico defensivo;
 *   — fail-safe: NUNCA lança para o emissor do evento; falha da IA registra `fail`
 *     e permite retry, sem reverter o evento original e sem sobrescrever um
 *     resultado válido.
 *
 * Cada automação fornece apenas a parte específica: load do registro, montagem do
 * input, prompts/parser do pacote e a persistência (UPDATE) da própria tabela.
 *
 * Não cria tarefas reais, não envia notificações, não cria tabelas/migrations.
 */

import { Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AIService } from '../../modules/ai/ai.service';
import { DatabaseContextService } from '../../database/database-context.service';
import { SkillRunService } from '../skills/skill-run.service';

const logger = new Logger('NativeSkillAutomation');

/** Status canônico do envelope persistido em metadata. */
const ENVELOPE_STATUS_GENERATED = 'generated';

/**
 * Janela (minutos) em que um skill_run 'running' ainda bloqueia reexecução.
 * Um 'running' mais antigo que isto é considerado órfão/stale (processo morreu
 * antes de succeed/fail) e NÃO bloqueia retry. 'success' bloqueia sempre.
 */
const STALE_RUNNING_MINUTES = 15;

export interface NativeAutomationDeps {
  ds: DataSource | null;
  dbContext?: DatabaseContextService;
  skillRun: SkillRunService;
  ai: AIService;
}

export interface NativeSkillValidation {
  valid: boolean;
  errors: string[];
}

export interface NativeSkillAutomationParams<TRow, TInput> {
  /** Nome do evento de domínio (ex.: 'project.completed'). Usado na idempotencyKey e no envelope. */
  eventName: string;
  /** Nome da skill (ex.: 'project-planning'). Usado em skill_runs e no envelope. */
  skillName: string;
  /** Tenant do evento. */
  tenantId: string | null | undefined;
  /** Usuário responsável (para skill_run e AIService). */
  userId: string | null | undefined;
  /** Tipo do agregado (ex.: 'project', 'release'). */
  entityType: string;
  /** ID do agregado. */
  entityId: string | null | undefined;
  /** Chave em `metadata` onde o envelope é gravado (ex.: 'aiPlan', 'aiChecklist'). */
  metadataKey: string;
  /** System prompt canônico (do pacote). */
  systemPrompt: string;
  /** Elegibilidade opcional avaliada ANTES de qualquer acesso ao banco. */
  isEligible?: () => boolean;
  /** Carrega o registro (incl. metadata). Retorna null se não existir. */
  load: (manager: EntityManager) => Promise<TRow | null>;
  /** Extrai o objeto metadata do registro carregado. */
  getMetadata: (row: TRow) => Record<string, unknown>;
  /** Monta o input da skill a partir do registro. */
  buildInput: (row: TRow) => TInput;
  /** Validação opcional do input (do pacote). */
  validateInput?: (input: TInput) => NativeSkillValidation;
  /** Builder do user prompt (do pacote). */
  buildPrompt: (input: TInput) => string;
  /** Parser da resposta (do pacote). */
  parseResponse: (content: string, input: TInput) => unknown;
  /** Persiste o metadata final (UPDATE puro da própria tabela). */
  saveMetadata: (nextMetadata: Record<string, unknown>, manager: EntityManager) => Promise<void>;
}

/**
 * Executa uma automação nativa de skill de ponta a ponta, de forma fail-safe.
 * NUNCA lança para o emissor do evento.
 */
export async function runNativeSkillAutomation<TRow, TInput>(
  deps: NativeAutomationDeps,
  params: NativeSkillAutomationParams<TRow, TInput>,
): Promise<void> {
  if (!params.tenantId) {
    logger.warn(`[${params.skillName} automation] evento sem tenantId — abortado (fail-closed)`);
    return;
  }
  if (!deps.dbContext) {
    logger.warn(
      `[${params.skillName} automation] DatabaseContextService indisponivel — abortado (fail-closed)`,
    );
    return;
  }

  try {
    const work = (manager: EntityManager) => execute(deps, params, manager);
    await deps.dbContext.runInTenantContext(
      { tenantId: params.tenantId, orgId: null, role: null },
      work,
    );
  } catch (err) {
    // Erros ANTES do skillRun.start (load/guarda/persistência inicial). Não propaga.
    await recordPreStartFailure(deps, params, err);
  }
}

/**
 * Observabilidade de falhas pré-start (B1): erros que ocorrem antes do skillRun.start
 * (ex.: load() lança) não deixariam trilha em skill_runs. Aqui registramos um log
 * interno claro e, quando há dados mínimos (tenant + entity), abrimos best-effort um
 * skill_run e o marcamos como `failed` — preservando a auditoria e permitindo retry
 * (status 'failed' não bloqueia). Tudo é fail-safe: NUNCA lança ao emissor.
 */
async function recordPreStartFailure<TRow, TInput>(
  deps: NativeAutomationDeps,
  params: NativeSkillAutomationParams<TRow, TInput>,
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  logger.warn(
    `[${params.skillName} automation] falha pré-start (não-fatal): ${message}`,
  );

  const { tenantId, entityId, skillName } = params;
  // Sem dados mínimos ou sem runtime de skill_run → fica só o log acima.
  if (!tenantId || !entityId || !deps.skillRun || !deps.dbContext) return;

  try {
    await deps.dbContext.runInTenantContext(
      { tenantId, orgId: null, role: null },
      async () => {
        const idempotencyKey = `${params.eventName}:${tenantId}:${entityId}`;
        const runId = await deps.skillRun.start({
          tenantId,
          userId: params.userId ?? null,
          skillName,
          entityType: params.entityType,
          entityId,
          input: { idempotencyKey, phase: 'pre-start' },
        });
        await deps.skillRun.fail(runId, tenantId, skillName, err);
      },
    );
  } catch {
    // best-effort — se o próprio registro de auditoria falhar, não há mais o que fazer.
  }
}

async function execute<TRow, TInput>(
  deps: NativeAutomationDeps,
  params: NativeSkillAutomationParams<TRow, TInput>,
  manager: EntityManager,
): Promise<void> {
  const { ds, skillRun, ai } = deps;
  const { tenantId, entityId, skillName, eventName, metadataKey } = params;

  // 1/2. Validar tenantId e entityId.
  if (!tenantId || !entityId) return;
  // Sem banco → nada a fazer (ambiente sem DATA_SOURCE).
  if (!ds) return;

  // 3. Portão OFICIAL de elegibilidade / controle de custo (M2).
  // Avaliado SEMPRE, antes de qualquer query/IA. Automações sem filtro próprio
  // passam por aqui com `true` (default), mantendo um único ponto de decisão de custo.
  const eligible = params.isEligible ? params.isEligible() : true;
  if (!eligible) return;

  // 4. Chave de idempotência.
  const idempotencyKey = `${eventName}:${tenantId}:${entityId}`;

  // 5. Carregar registro (dados + metadata para a guarda de idempotência).
  const row = await params.load(manager);
  if (!row) return;

  const metadata = params.getMetadata(row);
  const existing = metadata[metadataKey] as Record<string, unknown> | undefined;

  // 6. Guarda de idempotência (metadata): já existe envelope gerado com esta chave.
  if (
    existing &&
    existing.idempotencyKey === idempotencyKey &&
    existing.status === ENVELOPE_STATUS_GENERATED
  ) {
    return;
  }

  // 7. Guarda de idempotência (skill_runs): já existe execução EM ANDAMENTO ('running')
  // ou de SUCESSO ('success') com esta chave. Bloquear 'running' fecha a janela TOCTOU
  // entre dois eventos concorrentes do mesmo agregado (M1). Falhas anteriores
  // ('failed'/'cancelled') NÃO bloqueiam → retry seguro.
  if (await hasActiveOrSucceededRun(manager, tenantId, skillName, idempotencyKey)) return;

  // 8. Registrar execução (auditável + retry seguro).
  const runId = await skillRun.start({
    tenantId,
    userId: params.userId ?? null,
    skillName,
    entityType: params.entityType,
    entityId,
    input: { idempotencyKey },
  });

  try {
    const input = params.buildInput(row);

    const validation = params.validateInput?.(input);
    if (validation && !validation.valid) {
      await skillRun.fail(
        runId, tenantId, skillName,
        new Error(`input inválido: ${validation.errors.join('; ')}`),
      );
      return;
    }

    // Execução da IA via gateway backend (OpenAI→Claude→Gemini), em jsonMode.
    const completion = await ai.complete({
      tenantId,
      userId: params.userId ?? 'system',
      skill: skillName,
      systemPrompt: params.systemPrompt,
      prompt: params.buildPrompt(input),
      jsonMode: true,
    });

    const parsed = params.parseResponse(completion.content, input);

    const envelope: Record<string, unknown> = {
      source: 'native-automation',
      skill: skillName,
      event: eventName,
      idempotencyKey,
      automationRunId: runId,
      generatedAt: new Date().toISOString(),
      provider: completion.provider,
      model: completion.model,
      status: ENVELOPE_STATUS_GENERATED,
      parsed,
    };

    await persist(params, metadata, existing, idempotencyKey, envelope, manager);

    await skillRun.succeed(runId, tenantId, skillName, {
      idempotencyKey,
      provider: completion.provider,
      model: completion.model,
      status: ENVELOPE_STATUS_GENERATED,
    });
  } catch (err) {
    // Falha da IA/persistência: registra e permite retry; NÃO relança e NÃO grava
    // o envelope (um resultado válido nunca é sobrescrito por falha).
    await skillRun.fail(runId, tenantId, skillName, err);
  }
}

/**
 * True se já existir um skill_run que deva BLOQUEAR a reexecução desta skill com a
 * mesma idempotencyKey:
 *   - 'success' → bloqueia sempre;
 *   - 'running' → bloqueia apenas se RECENTE (started_at dentro da janela de
 *     STALE_RUNNING_MINUTES). Um 'running' mais antigo é órfão/stale e NÃO bloqueia,
 *     permitindo retry após a morte de um processo anterior.
 * 'failed'/'cancelled' nunca bloqueiam.
 */
async function hasActiveOrSucceededRun(
  manager: EntityManager,
  tenantId: string,
  skillName: string,
  idempotencyKey: string,
): Promise<boolean> {
  const rows = (await manager.query(
    `SELECT 1
       FROM skill_runs
      WHERE tenant_id = $1
        AND skill_name = $2
        AND input_payload->>'idempotencyKey' = $3
        AND (
          status = 'success'
          OR (status = 'running' AND started_at >= NOW() - ($4 || ' minutes')::interval)
        )
      LIMIT 1`,
    [tenantId, skillName, idempotencyKey, String(STALE_RUNNING_MINUTES)],
  )) as unknown[];
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Monta o metadata final preservando o existente e o histórico defensivo, e delega
 * o UPDATE ao consumer. O histórico (`${metadataKey}History`) só é populado quando
 * havia um envelope anterior com chave de idempotência diferente — normalmente um
 * no-op, já que a chave é estável por entidade.
 */
async function persist<TRow, TInput>(
  params: NativeSkillAutomationParams<TRow, TInput>,
  metadata: Record<string, unknown>,
  existing: Record<string, unknown> | undefined,
  idempotencyKey: string,
  envelope: Record<string, unknown>,
  manager: EntityManager,
): Promise<void> {
  const next: Record<string, unknown> = { ...metadata };

  if (existing && existing.idempotencyKey !== idempotencyKey) {
    const historyKey = `${params.metadataKey}History`;
    const history = Array.isArray(metadata[historyKey]) ? (metadata[historyKey] as unknown[]) : [];
    next[historyKey] = [...history, existing];
  }
  next[params.metadataKey] = envelope;

  await params.saveMetadata(next, manager);
}
