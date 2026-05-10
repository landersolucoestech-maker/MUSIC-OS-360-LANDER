/**
 * shared/integrations/contracts/rights.contract.ts
 *
 * Contrato de gestão de direitos autorais e arrecadação.
 *
 * Entidades cobertas:
 *   - ECAD   — arrecadação de execução pública (rádio, TV, shows, streaming)
 *   - UBC    — União Brasileira de Compositores: registro e distribuição
 *   - Abramus — registro de obras e fonogramas (mock funcional já existe)
 *
 * ESTADO ACTUAL:
 *   - Abramus: mock funcional (useAbramus.ts)
 *   - ECAD:    dados MOCK_DATA, conciliação visual em ECADViewModal
 *   - UBC:     ainda sem hook — apenas referências em dados mock
 *
 * MIGRAÇÃO FUTURA: cada entidade implementa IRightsProvider com a sua API.
 */

// ─── Identificadores ──────────────────────────────────────────────────────────

export type RightsEntityId = "ecad" | "ubc" | "abramus";

export type RightsKind = "obra" | "fonograma";

// ─── DTOs de registro ─────────────────────────────────────────────────────────

export interface RightsRegistrationStatus {
  entity: RightsEntityId;
  kind: RightsKind;
  local_id: string;
  external_id?: string | null;
  /** Código de registro na entidade (ex.: cod_ecad, cod_abramus) */
  code?: string | null;
  registered: boolean;
  registered_at?: string | null;
  last_synced_at?: string | null;
}

export interface RightsSearchQuery {
  query: string;
  kind: RightsKind;
  limit?: number;
  offset?: number;
}

export interface RightsSearchResult {
  external_id: string;
  kind: RightsKind;
  titulo: string;
  iswc?: string | null;
  isrc?: string | null;
  compositores?: string[] | null;
  interpretes?: string[] | null;
  gravadora?: string | null;
  produtores?: string[] | null;
  genero?: string | null;
  artista_nome?: string | null;
  duracao?: string | null;
  data_registro?: string | null;
}

// ─── DTOs de arrecadação ──────────────────────────────────────────────────────

export type ArrecadacaoTipo =
  | "execucao_publica"   // rádio, TV, shows ao vivo
  | "streaming"          // plataformas digitais
  | "sincronizacao"      // filmes, séries, publicidade
  | "mecanica"           // reprodução mecânica, CDs
  | "sonorizacao";       // estabelecimentos comerciais

export interface ArrecadacaoEntry {
  id: string;
  entity: RightsEntityId;
  tipo: ArrecadacaoTipo;
  obra_id?: string | null;
  fonograma_id?: string | null;
  periodo: string;                // "YYYY-MM"
  valor_bruto_cents: number;
  valor_liquido_cents: number;
  execucoes?: number;
  fonte?: string;                 // ex.: "Globo", "Spotify Brasil"
  referencia?: string;
  created_at: string;
}

export interface ArrecadacaoSummary {
  entity: RightsEntityId;
  periodo: string;
  total_bruto_cents: number;
  total_liquido_cents: number;
  total_execucoes: number;
  por_tipo: Record<ArrecadacaoTipo, number>;
}

// ─── DTOs de conciliação ─────────────────────────────────────────────────────

export interface ConciliacaoResult {
  matched: Array<{
    local_id: string;
    external_id: string;
    titulo: string;
    diferenca_cents: number;
  }>;
  unmatched_local: string[];   // IDs locais sem correspondência
  unmatched_external: string[]; // IDs externos sem correspondência local
  total_matched: number;
  total_unmatched_local: number;
  total_unmatched_external: number;
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

/**
 * IRightsProvider — contrato de gestão de direitos autorais.
 *
 * Implementações previstas:
 *   - MockRightsProvider    (standalone — MOCK_DATA)
 *   - EcadRightsProvider    (ECAD API — quando disponível)
 *   - UbcRightsProvider     (UBC API)
 *   - AbramusRightsProvider (Abramus API — já tem mock funcional)
 */
export interface IRightsProvider {
  readonly entity: RightsEntityId;

  /** Pesquisa obras ou fonogramas na base da entidade */
  search(query: RightsSearchQuery): Promise<RightsSearchResult[]>;

  /** Importa um registro externo para o catálogo local */
  import(kind: RightsKind, externalId: string): Promise<{ local_id: string }>;

  /** Verifica o status de registro de um item local */
  getRegistrationStatus(kind: RightsKind, localId: string): Promise<RightsRegistrationStatus>;

  /** Sincroniza todos os registros locais com a entidade externa */
  syncAll(): Promise<{ synced: number; errors: number }>;

  /** Consulta arrecadação de um período */
  getArrecadacao(periodo: string): Promise<ArrecadacaoEntry[]>;

  /** Resumo de arrecadação de um período */
  getArrecadacaoSummary(periodo: string): Promise<ArrecadacaoSummary>;

  /** Concilia arrecadação recebida com catálogo local */
  conciliar(periodo: string): Promise<ConciliacaoResult>;

  /** Verifica conexão com a entidade */
  verifyConnection(): Promise<boolean>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Chave de localStorage para arrecadação cacheada */
export function arrecadacaoStorageKey(entity: RightsEntityId, periodo: string): string {
  return `musicos360_${entity}_arrecadacao_${periodo}`;
}
