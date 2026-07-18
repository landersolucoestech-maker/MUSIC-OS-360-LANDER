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
 *   - Abramus: mock funcional completo (useAbramus.ts)
 *   - UBC:     mock funcional completo (useUbc.ts)
 *   - ECAD:    dados MOCK_DATA, conciliação visual em ECADViewModal
 *
 * MIGRAÇÃO FUTURA: cada entidade implementa IRightsProvider com a sua API.
 */

// ─── Identificadores ──────────────────────────────────────────────────────────

export type RightsEntityId = "ecad" | "ubc" | "abramus";

export type RightsKind = "obra" | "fonograma";

// ─── DTOs de pesquisa ─────────────────────────────────────────────────────────

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

// ─── DTOs de busca de artistas ────────────────────────────────────────────────

export interface ArtistSearchQuery {
  query: string;
  limit?: number;
}

export interface ArtistSearchResult {
  external_id: string;
  nome: string;
  tipo: "compositor" | "interprete" | "produtor" | "editora" | "gravadora";
  numero_filiado?: string | null;
  obras_count?: number | null;
  fonogramas_count?: number | null;
  generos?: string[] | null;
  data_filiacao?: string | null;
}

// ─── DTOs de registro ─────────────────────────────────────────────────────────

export interface RightsRegistrationStatus {
  entity: RightsEntityId;
  kind: RightsKind;
  local_id: string;
  external_id?: string | null;
  /** Código de registro na entidade (ex.: cod_ecad, cod_entidade) */
  code?: string | null;
  registered: boolean;
  registered_at?: string | null;
  last_synced_at?: string | null;
  iswc?: string | null;
  isrc?: string | null;
}

export interface RegisterObraInput {
  titulo: string;
  compositores: string[];
  letristas?: string[];
  editora?: string;
  genero?: string;
  duracao?: string;
  /** ISWC já existente (se disponível); senão será gerado pela entidade */
  iswc?: string;
  /** ID local da obra no catálogo */
  local_id: string;
}

export interface RegisterFonogramaInput {
  titulo: string;
  interpretes: string[];
  compositores?: string[];
  produtores?: string[];
  gravadora?: string;
  genero?: string;
  duracao?: string;
  /** ISRC já existente (se disponível); senão será gerado pela entidade */
  isrc?: string;
  /** Obra vinculada (ISWC ou external_id) */
  obra_id?: string;
  /** ID local do fonograma no catálogo */
  local_id: string;
}

export interface RegistrationResult {
  entity: RightsEntityId;
  kind: RightsKind;
  local_id: string;
  external_id: string;
  code: string;
  /** ISWC gerado/atribuído (para obras) */
  iswc?: string | null;
  /** ISRC gerado/atribuído (para fonogramas) */
  isrc?: string | null;
  registered_at: string;
  status: "pending" | "registered" | "rejected";
  rejection_reason?: string | null;
}

export interface RegistrationHistoryEntry {
  id: string;
  entity: RightsEntityId;
  kind: RightsKind;
  local_id: string;
  external_id?: string | null;
  titulo: string;
  action: "registered" | "updated" | "rejected" | "synced";
  iswc?: string | null;
  isrc?: string | null;
  performed_at: string;
  performed_by?: string | null;
  notes?: string | null;
}

// ─── DTOs de geração de código ────────────────────────────────────────────────

export interface GenerateISWCInput {
  /** ID local da obra no catálogo */
  local_obra_id: string;
  titulo: string;
  compositores: string[];
  /** Se já existe ISWC, retorna o existente */
  existing_iswc?: string | null;
}

export interface GenerateISWCResult {
  iswc: string;
  local_obra_id: string;
  source: "existing" | "generated" | "assigned_by_entity";
  generated_at: string;
}

export interface GenerateISRCInput {
  /** ID local do fonograma no catálogo */
  local_fonograma_id: string;
  titulo: string;
  interprete: string;
  ano?: number;
  /** País registante (ex.: "BR") */
  country_code?: string;
  /** Código de registante (ex.: "MSC") */
  registrant_code?: string;
  /** Se já existe ISRC, retorna o existente */
  existing_isrc?: string | null;
}

export interface GenerateISRCResult {
  isrc: string;
  local_fonograma_id: string;
  source: "existing" | "generated" | "assigned_by_entity";
  generated_at: string;
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
 * IRightsProvider — contrato completo de gestão de direitos autorais.
 *
 * Implementações previstas:
 *   - MockRightsProvider    (standalone — MOCK_DATA)
 *   - EcadRightsProvider    (ECAD API — quando disponível)
 *   - UbcRightsProvider     (UBC API)
 *   - AbramusRightsProvider (Abramus API — já tem mock funcional)
 */
export interface IRightsProvider {
  readonly entity: RightsEntityId;

  // ── Pesquisa ────────────────────────────────────────────────────────────────

  /** Pesquisa obras ou fonogramas na base da entidade */
  search(query: RightsSearchQuery): Promise<RightsSearchResult[]>;

  /** Pesquisa artistas, compositores, editoras na base da entidade */
  searchArtists(query: ArtistSearchQuery): Promise<ArtistSearchResult[]>;

  // ── Importação ──────────────────────────────────────────────────────────────

  /** Importa um registro externo para o catálogo local */
  import(kind: RightsKind, externalId: string): Promise<{ local_id: string }>;

  /** Verifica o status de registro de um item local */
  getRegistrationStatus(kind: RightsKind, localId: string): Promise<RightsRegistrationStatus>;

  /** Histório de operações de registro */
  getRegistrationHistory(kind: RightsKind, localId: string): Promise<RegistrationHistoryEntry[]>;

  // ── Registro de novas obras/fonogramas ──────────────────────────────────────

  /** Registra uma nova obra (composição) na entidade */
  registerObra(input: RegisterObraInput): Promise<RegistrationResult>;

  /** Atualiza dados de uma obra já registada */
  updateObraRegistration(externalId: string, input: Partial<RegisterObraInput>): Promise<RegistrationResult>;

  /** Registra um novo fonograma na entidade */
  registerFonograma(input: RegisterFonogramaInput): Promise<RegistrationResult>;

  /** Atualiza dados de um fonograma já registado */
  updateFonogramaRegistration(externalId: string, input: Partial<RegisterFonogramaInput>): Promise<RegistrationResult>;

  // ── Geração de códigos ──────────────────────────────────────────────────────

  /** Gera ou recupera o ISWC de uma obra */
  generateISWC(input: GenerateISWCInput): Promise<GenerateISWCResult>;

  /** Gera ou recupera o ISRC de um fonograma */
  generateISRC(input: GenerateISRCInput): Promise<GenerateISRCResult>;

  // ── Sincronização ───────────────────────────────────────────────────────────

  /** Sincroniza todos os registros locais com a entidade externa */
  syncAll(): Promise<{ synced: number; errors: number }>;

  // ── Arrecadação ─────────────────────────────────────────────────────────────

  /** Consulta arrecadação de um período */
  getArrecadacao(periodo: string): Promise<ArrecadacaoEntry[]>;

  /** Resumo de arrecadação de um período */
  getArrecadacaoSummary(periodo: string): Promise<ArrecadacaoSummary>;

  /** Concilia arrecadação recebida com catálogo local */
  conciliar(periodo: string): Promise<ConciliacaoResult>;

  // ── Saúde ───────────────────────────────────────────────────────────────────

  /** Verifica conexão com a entidade */
  verifyConnection(): Promise<boolean>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Chave de localStorage para arrecadação cacheada */
export function arrecadacaoStorageKey(entity: RightsEntityId, periodo: string): string {
  return `musicos360_${entity}_arrecadacao_${periodo}`;
}

/** Gera um ISWC canónico (formato T-XXXXXXXXX-C) — apenas para MOCK */
export function generateMockISWC(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash);
  const body = String(abs).padStart(9, "0").slice(0, 9);
  const check = (abs % 10).toString();
  return `T-${body.slice(0, 3)}.${body.slice(3, 6)}.${body.slice(6)}-${check}`;
}

/** Gera um ISRC canónico (formato CC-XXX-YY-NNNNN) — apenas para MOCK */
export function generateMockISRC(
  country: string = "BR",
  registrant: string = "MSC",
  year: number = new Date().getFullYear(),
  sequence: number = Math.floor(Math.random() * 99999),
): string {
  const y = String(year).slice(-2);
  const seq = String(sequence).padStart(5, "0");
  return `${country}-${registrant}-${y}-${seq}`;
}

