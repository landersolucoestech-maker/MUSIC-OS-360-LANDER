/**
 * workflow-transitions.ts
 *
 * Frontend mirror of the backend workflow definitions.
 * Allows view modals to compute `allowed_transitions` from the entity's
 * current status without a round-trip to the backend — works in both
 * mock mode and HTTP mode.
 *
 * IMPORTANT: keep in sync with apps/api/src/core/workflow/definitions/
 */

export interface WorkflowTransition {
  to: string;
  label: string;
}

type RawDef = { from: string | string[]; to: string; label: string };

function matchesFrom(def: RawDef, currentStatus: string): boolean {
  const from = def.from;
  if (Array.isArray(from)) return from.includes(currentStatus);
  return from === currentStatus;
}

function buildAllowed(defs: RawDef[], currentStatus: string): WorkflowTransition[] {
  return defs
    .filter((d) => matchesFrom(d, currentStatus))
    .map((d) => ({ to: d.to, label: d.label }));
}

// ─── Releases ───────────────────────────────────────────────────────────────

const RELEASES_DEFS: RawDef[] = [
  { from: 'planejamento',  to: 'em_preparacao', label: 'Iniciar Preparação' },
  { from: 'em_preparacao', to: 'analise',        label: 'Enviar para Análise' },
  { from: ['analise', 'em_analise'], to: 'aprovado',       label: 'Aprovar' },
  { from: ['analise', 'em_analise'], to: 'em_preparacao',  label: 'Solicitar Revisão' },
  { from: 'aprovado',      to: 'agendado',       label: 'Agendar Distribuição' },
  { from: 'agendado',      to: 'distribuido',    label: 'Confirmar Distribuição' },
  { from: 'distribuido',   to: 'publicado',      label: 'Publicado nas Plataformas' },
  { from: ['planejamento', 'em_preparacao', 'analise', 'em_analise', 'aprovado', 'agendado'],
    to: 'cancelado', label: 'Cancelar' },
  { from: 'publicado',     to: 'arquivado',      label: 'Arquivar' },
];

// ─── Contracts ──────────────────────────────────────────────────────────────

const CONTRACTS_DEFS: RawDef[] = [
  { from: 'rascunho',               to: 'em_analise',           label: 'Enviar para Análise' },
  { from: 'em_analise',             to: 'rascunho',             label: 'Retornar para Rascunho' },
  { from: 'em_analise',             to: 'aguardando_assinatura',label: 'Aprovar para Assinatura' },
  { from: 'aguardando_assinatura',  to: 'assinado',             label: 'Registrar Assinatura' },
  { from: 'assinado',               to: 'vigente',              label: 'Ativar Contrato' },
  { from: 'vigente',                to: 'vencendo',             label: 'Marcar como Vencendo' },
  { from: ['vencendo', 'vigente'],  to: 'vencido',              label: 'Registrar Vencimento' },
  { from: ['vencido', 'vigente', 'assinado'], to: 'encerrado',  label: 'Encerrar Contrato' },
  { from: ['rascunho', 'em_analise', 'aguardando_assinatura'], to: 'cancelado', label: 'Cancelar' },
];

// ─── Leads ──────────────────────────────────────────────────────────────────

const LEADS_DEFS: RawDef[] = [
  { from: 'novo',                 to: 'contato',     label: 'Iniciar Contato' },
  { from: ['novo', 'contato'],    to: 'em_contato',  label: 'Em Contato' },
  { from: ['contato', 'em_contato'], to: 'qualificado', label: 'Qualificar Lead' },
  { from: 'qualificado',          to: 'proposta',    label: 'Enviar Proposta' },
  { from: 'proposta',             to: 'negociacao',  label: 'Em Negociação' },
  { from: ['proposta', 'negociacao'], to: 'fechado', label: 'Fechar Negócio' },
  { from: ['novo', 'contato', 'em_contato', 'qualificado', 'proposta', 'negociacao'],
    to: 'perdido', label: 'Marcar como Perdido' },
  { from: ['perdido', 'inativo'], to: 'novo',    label: 'Reativar Lead' },
  { from: ['fechado', 'perdido'], to: 'inativo', label: 'Arquivar' },
];

// ─── Campaigns ──────────────────────────────────────────────────────────────

const CAMPAIGNS_DEFS: RawDef[] = [
  { from: 'rascunho',             to: 'planejamento', label: 'Iniciar Planejamento' },
  { from: 'planejamento',         to: 'ativa',        label: 'Ativar Campanha' },
  { from: 'ativa',                to: 'pausada',      label: 'Pausar Campanha' },
  { from: 'pausada',              to: 'ativa',        label: 'Retomar Campanha' },
  { from: ['ativa', 'pausada'],   to: 'concluida',    label: 'Concluir Campanha' },
  { from: ['rascunho', 'planejamento', 'ativa', 'pausada'], to: 'cancelada', label: 'Cancelar Campanha' },
];

// ─── Projects ───────────────────────────────────────────────────────────────

const PROJECTS_DEFS: RawDef[] = [
  { from: 'planejamento',                        to: 'em_andamento',  label: 'Iniciar Projeto' },
  { from: 'planejamento',                        to: 'producao',      label: 'Iniciar Produção' },
  { from: ['em_andamento', 'producao'],          to: 'pos_producao',  label: 'Pós-Produção' },
  { from: ['em_andamento', 'producao', 'pos_producao'], to: 'pausado', label: 'Pausar Projeto' },
  { from: 'pausado',                             to: 'em_andamento',  label: 'Retomar Projeto' },
  { from: ['pos_producao', 'em_andamento'],      to: 'concluido',     label: 'Concluir Projeto' },
  { from: ['planejamento', 'em_andamento', 'producao', 'pos_producao', 'pausado'],
    to: 'cancelado', label: 'Cancelar Projeto' },
];

// ─── Tickets ────────────────────────────────────────────────────────────────

const TICKETS_DEFS: RawDef[] = [
  { from: 'open',          to: 'in_progress',   label: 'Iniciar Atendimento' },
  { from: 'in_progress',   to: 'pending_user',  label: 'Aguardar Resposta do Usuário' },
  { from: 'pending_user',  to: 'in_progress',   label: 'Retomar Atendimento' },
  { from: ['in_progress', 'pending_user'], to: 'resolved', label: 'Resolver Ticket' },
  { from: 'resolved',      to: 'closed',        label: 'Fechar Ticket' },
  { from: 'resolved',      to: 'in_progress',   label: 'Reabrir Ticket' },
  { from: ['open', 'in_progress', 'pending_user'], to: 'cancelled', label: 'Cancelar Ticket' },
];

// ─── Public API ─────────────────────────────────────────────────────────────

export type WorkflowEntityType =
  | 'release'
  | 'contract'
  | 'lead'
  | 'campaign'
  | 'project'
  | 'ticket';

const DEFS_MAP: Record<WorkflowEntityType, RawDef[]> = {
  release:  RELEASES_DEFS,
  contract: CONTRACTS_DEFS,
  lead:     LEADS_DEFS,
  campaign: CAMPAIGNS_DEFS,
  project:  PROJECTS_DEFS,
  ticket:   TICKETS_DEFS,
};

/**
 * Returns the workflow-allowed transitions for the given entity type and status.
 * Works in mock mode and HTTP mode — no backend call required.
 */
export function getWorkflowAllowedTransitions(
  entityType: WorkflowEntityType,
  currentStatus: string | null | undefined,
): WorkflowTransition[] {
  if (!currentStatus) return [];
  const defs = DEFS_MAP[entityType];
  if (!defs) return [];
  return buildAllowed(defs, currentStatus);
}
