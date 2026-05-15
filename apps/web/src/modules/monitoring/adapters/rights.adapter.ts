/**
 * modules/monitoring/adapters/rights.adapter.ts
 *
 * Adaptador de direitos para o módulo monitoring.
 *
 * RESPONSABILIDADE: converter dados de arrecadação/conciliação vindos
 * das APIs de direitos (ECAD, UBC, Abramus) para o formato das entidades
 * locais do módulo monitoring (Takedown, conciliação ECAD).
 *
 * ESTADO ACTUAL: transformações de/para MOCK_DATA.
 * MIGRAÇÃO FUTURA:
 *   - ECAD → useEcadArrecadacao / useEcadConciliacao (hooks)
 *   - UBC  → useUbcDistribuicao (hook)
 *   - Abramus → useAbramus (hook funcional existente)
 *   Os shapes deste adaptador permanecem estáveis na migração.
 *
 * Fluxo esperado (futuro):
 *   API de direitos → fromRightsRecord() → entidade local → UI
 *   entidade local → toRightsQuery()     → API de direitos
 */

import type { Takedown } from "@/modules/monitoring/types/monitoring.types";

// ─── Tipos de entrada do adaptador (formato APIs externas) ────────────────────

/** Registro de arrecadação genérico vindo de ECAD, UBC ou Abramus */
export interface RightsRecord {
  source: "ecad" | "ubc" | "abramus";
  external_id: string;
  isrc?: string | null;
  iswc?: string | null;
  obra_titulo?: string | null;
  fonograma_titulo?: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  valor_bruto_cents: number;
  moeda: "BRL";
  status: "pendente" | "conciliado" | "divergente" | "cancelado";
  plataformas?: string[];
  observacoes?: string | null;
}

/** Consulta enviada para as APIs de direitos */
export interface RightsQuery {
  isrc?: string;
  iswc?: string;
  periodo_inicio: string;
  periodo_fim: string;
  fontes?: Array<"ecad" | "ubc" | "abramus">;
}

// ─── Tipos de output do adaptador ────────────────────────────────────────────

/** Registro de conciliação normalizado para exibição em monitoring */
export interface MonitoringRightsEntry {
  id: string;
  source: "ecad" | "ubc" | "abramus";
  source_label: string;
  isrc: string | null;
  iswc: string | null;
  titulo: string | null;
  periodo: string;
  valor_bruto_brl: string;
  status: RightsRecord["status"];
  status_label: string;
  plataformas: string[];
  observacoes: string | null;
  conciliado_em: string | null;
}

// ─── Mapeamentos estáticos ────────────────────────────────────────────────────

const SOURCE_LABELS: Record<RightsRecord["source"], string> = {
  ecad: "ECAD",
  ubc: "UBC",
  abramus: "Abramus",
};

const STATUS_LABELS: Record<RightsRecord["status"], string> = {
  pendente: "Pendente",
  conciliado: "Conciliado",
  divergente: "Divergente",
  cancelado: "Cancelado",
};

// ─── Funções de adaptação ─────────────────────────────────────────────────────

/**
 * Converte um RightsRecord (API externa) em MonitoringRightsEntry (UI).
 * MIGRAÇÃO FUTURA: receber dados reais de useEcadArrecadacao / useUbcDistribuicao.
 */
export function fromRightsRecord(record: RightsRecord): MonitoringRightsEntry {
  const valorBrl = (record.valor_bruto_cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const periodo = `${formatPeriodo(record.periodo_inicio)} – ${formatPeriodo(record.periodo_fim)}`;

  return {
    id: `${record.source}_${record.external_id}`,
    source: record.source,
    source_label: SOURCE_LABELS[record.source],
    isrc: record.isrc ?? null,
    iswc: record.iswc ?? null,
    titulo: record.fonograma_titulo ?? record.obra_titulo ?? null,
    periodo,
    valor_bruto_brl: valorBrl,
    status: record.status,
    status_label: STATUS_LABELS[record.status],
    plataformas: record.plataformas ?? [],
    observacoes: record.observacoes ?? null,
    conciliado_em: record.status === "conciliado" ? new Date().toISOString() : null,
  };
}

/**
 * Constrói uma consulta para as APIs de direitos a partir de um
 * Takedown local (faz match por ISRC quando disponível no campo `motivo`).
 *
 * MIGRAÇÃO FUTURA: o campo isrc virá diretamente de Takedown.isrc
 * após a adição desse campo na entidade.
 */
export function toRightsQuery(
  takedown: Takedown,
  options: { periodo_inicio: string; periodo_fim: string; fontes?: RightsQuery["fontes"] }
): RightsQuery {
  return {
    isrc: extractIsrcFromTakedown(takedown),
    periodo_inicio: options.periodo_inicio,
    periodo_fim: options.periodo_fim,
    fontes: options.fontes,
  };
}

// ─── Utilitários internos ─────────────────────────────────────────────────────

function formatPeriodo(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Tenta extrair ISRC do campo `motivo` do Takedown.
 * MIGRAÇÃO FUTURA: remover esta heurística quando Takedown tiver campo isrc dedicado.
 */
function extractIsrcFromTakedown(takedown: Takedown): string | undefined {
  const isrcPattern = /[A-Z]{2}[A-Z0-9]{3}\d{7}/;
  const motivo = takedown.motivo ?? "";
  const match = isrcPattern.exec(motivo);
  return match?.[0];
}
