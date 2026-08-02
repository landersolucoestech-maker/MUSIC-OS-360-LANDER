/**
 * modules/reports/form-contracts/report-form-contracts.ts
 *
 * FONTE ÚNICA DE VERDADE das colunas de exportação/importação da Central de
 * Relatórios para entidades com formulário real.
 *
 * Consumida simultaneamente por:
 *   - ReportEntityDefinitionService  (exportableColumns / importableColumns)
 *   - ExportQueryBuilderService      (resolução física: coluna | metadata | cifrada)
 *   - ExportEngineService            (descriptografia na exportação)
 *   - ImportCommitService            (persistência: coluna | metadata | cifrada)
 *   - form-contracts.guard.spec      (guarda permanente DTO ↔ contrato)
 *
 * Regras:
 *   - `key` é a chave lógica estável da coluna no arquivo (o cabeçalho exibido
 *     vem da camada i18n central, field-labels.pt-br).
 *   - `storage` define onde o campo vive fisicamente na tabela.
 *   - `importable: false` marca campo somente-leitura no arquivo (exportado,
 *     mas nunca sobrescrito pela importação — ex.: códigos de registro ECAD).
 *   - `excludedFormFields` documenta TODO campo do DTO do formulário que ficou
 *     deliberadamente fora do contrato, com o motivo (o guard exige isso).
 *   - `formFieldAliases` mapeia campos legados/EN do DTO para a chave física
 *     canônica (ex.: `title` → `titulo`).
 */

export type ReportFieldStorage = 'column' | 'metadata' | 'encrypted';

export interface ReportFieldSpec {
  /** Chave lógica estável (coluna do arquivo e do formulário). */
  key: string;
  /** Onde o campo vive fisicamente. */
  storage: ReportFieldStorage;
  /** Coluna física para storage 'encrypted' (ex.: email → email_encrypted). */
  physical?: string;
  /** false ⇒ somente exportação (nunca sobrescrito na importação). */
  importable?: boolean;
}

export interface ReportFormContract {
  tableName: string;
  identityColumn: string;
  /** Ordem oficial e determinística das colunas do arquivo. */
  fields: ReportFieldSpec[];
  /** Campo do DTO → motivo da exclusão (auditável; exigido pelo guard). */
  excludedFormFields: Record<string, string>;
  /** Campo legado/EN do DTO → key canônica do contrato. */
  formFieldAliases?: Record<string, string>;
  /** Overrides opcionais (apenas colunas físicas do contrato). */
  filterableColumns?: string[];
  searchableColumns?: string[];
}

const col = (key: string): ReportFieldSpec => ({ key, storage: 'column' });
const ro = (key: string): ReportFieldSpec => ({ key, storage: 'column', importable: false });
const meta = (key: string): ReportFieldSpec => ({ key, storage: 'metadata' });
const enc = (key: string, physical: string): ReportFieldSpec => ({ key, storage: 'encrypted', physical });

// ─── Artistas (formulário completo — 68 campos) ──────────────────────────────
const ARTISTS_CONTRACT: ReportFormContract = {
  tableName: 'artists',
  identityColumn: 'nome_artistico',
  fields: [
    // Identidade e perfil (colunas diretas)
    col('nome_artistico'), col('nome_civil'), col('tipo'), col('status'),
    col('genero_musical'), col('observacoes'), col('especialidades'),
    // Perfil estendido (metadata jsonb)
    meta('slug_artistico'), meta('tipo_perfil'), meta('fase_carreira'),
    meta('genero'), meta('data_nascimento'), meta('rg'), meta('endereco'),
    meta('tags_musicais'),
    // Contato (cifrados)
    enc('email', 'email_encrypted'), enc('telefone', 'telefone_encrypted'),
    enc('cpf_cnpj', 'cpf_cnpj_encrypted'),
    // Mídia e links (colunas diretas)
    col('foto_url'), col('spotify_url'), col('youtube_url'), col('deezer_url'),
    col('apple_music_url'), col('soundcloud_url'), col('galeria_urls'),
    col('documentos'),
    // Mídia e links (metadata)
    meta('presskit_url'), meta('documentos_pessoais_url'),
    meta('apple_music_albuns_url'), meta('soundcloud_seguidores_url'),
    meta('instagram_url'), meta('tiktok_url'),
    // Métricas de plataformas (metadata)
    meta('instagram_seguidores'), meta('tiktok_seguidores'),
    meta('spotify_ouvintes'), meta('youtube_inscritos'), meta('deezer_fas'),
    // Equipe e negócios (colunas diretas)
    col('manager_nome'), enc('manager_contato', 'manager_contato_encrypted'),
    col('produtor_executivo'), col('agencia_booking'), col('label_parceira'),
    col('contrato_id'),
    // Equipe e negócios (metadata)
    meta('agencia'), meta('empresario_id'), meta('empresario_nome'),
    meta('empresario_email'), meta('empresario_telefone'),
    meta('gravadora_id'), meta('gravadora_nome'), meta('gravadora_email'),
    meta('gravadora_telefone'), meta('gravadora_responsavel_id'),
    meta('gravadora_responsavel_nome'), meta('gravadora_responsavel_email'),
    meta('gravadora_responsavel_telefone'),
    // Dados bancários (metadata)
    meta('banco'), meta('conta'), meta('chave_pix'), meta('titular_conta'),
    // Distribuição (metadata; arrays serializados em JSON reversível)
    meta('distribuidoras_selecionadas'), meta('distribuidoras_gerais'),
    meta('distribuidoras_emails'), meta('distribuidoras_empresa_selecionadas'),
    meta('distribuidoras_empresa_emails'),
    // Rede (metadata; arrays/objetos serializados em JSON reversível)
    meta('contatos_equipe'), meta('contatos_vinculados'), meta('relacionamentos'),
  ],
  excludedFormFields: {
    metadata: 'objeto jsonb interno bruto — os campos individuais já são colunas do contrato',
    notas_internas: 'anotação interna oculta por política (HIDDEN_INTERNAL_HINT)',
  },
  filterableColumns: ['status', 'tipo', 'genero_musical'],
  searchableColumns: ['nome_artistico', 'nome_civil', 'genero_musical', 'observacoes'],
};

// ─── Funcionários (RH) ────────────────────────────────────────────────────────
const EMPLOYEES_CONTRACT: ReportFormContract = {
  tableName: 'employees',
  identityColumn: 'nome',
  fields: [
    col('nome'), col('cargo'), col('departamento'), col('status'),
    col('tipo_contrato'), col('salario'), col('data_admissao'),
    col('data_demissao'), col('documentos'),
    enc('email', 'email_encrypted'), enc('telefone', 'telefone_encrypted'),
    enc('cpf', 'cpf_encrypted'),
  ],
  excludedFormFields: {
    metadata: 'objeto jsonb interno bruto — sem campos de formulário próprios',
  },
};

// ─── Contratos ────────────────────────────────────────────────────────────────
const CONTRACTS_CONTRACT: ReportFormContract = {
  tableName: 'contracts',
  identityColumn: 'titulo',
  fields: [
    col('titulo'), col('tipo'), col('status'), col('valor'),
    col('data_inicio'), col('data_fim'), col('exclusivo'), col('observacoes'),
    col('arquivo_url'), col('signing_platform'),
    col('artista_id'), col('cliente_id'), col('lancamento_id'),
    col('template_id'), // campo do wizard (regra 2026-07-12: coluna própria)
    ro('autentique_doc_id'), // estado técnico da integração de assinatura
    ro('versoes'),           // histórico de versões (gerado pelo fluxo de assinatura)
  ],
  excludedFormFields: {
    metadata: 'objeto jsonb interno bruto',
    currency: 'alias legado sem coluna própria (valor é BRL por contrato)',
    signedAt: 'estado gerenciado exclusivamente pela integração de assinatura',
    parties: 'estrutura da integração de assinatura, não coluna tabular',
    signers: 'estrutura da integração de assinatura, não coluna tabular',
  },
  formFieldAliases: {
    title: 'titulo',
    type: 'tipo',
    value: 'valor',
    fileUrl: 'arquivo_url',
    startsAt: 'data_inicio',
    expiresAt: 'data_fim',
    artistId: 'artista_id',
  },
};

// ─── Templates de contrato ────────────────────────────────────────────────────
const CONTRACT_TEMPLATES_CONTRACT: ReportFormContract = {
  tableName: 'contract_templates',
  identityColumn: 'titulo',
  fields: [
    col('titulo'), col('tipo'), col('conteudo'), col('ativo'), col('variaveis'),
  ],
  excludedFormFields: {
    metadata: 'não persistido em coluna própria (campo legado do DTO)',
  },
  formFieldAliases: {
    title: 'titulo',
    type: 'tipo',
    content: 'conteudo',
    variables: 'variaveis',
  },
};

// ─── Metas de artista ─────────────────────────────────────────────────────────
const ARTIST_GOALS_CONTRACT: ReportFormContract = {
  tableName: 'artist_goals',
  identityColumn: 'titulo',
  fields: [
    col('titulo'), col('tipo'), col('periodo'), col('status'),
    col('meta_valor'), col('valor_atual'), col('data_inicio'), col('data_fim'),
    col('artista_id'),
  ],
  excludedFormFields: {
    metadata: 'objeto jsonb interno bruto',
  },
};

// ─── Obras ────────────────────────────────────────────────────────────────────
const WORKS_CONTRACT: ReportFormContract = {
  tableName: 'works',
  identityColumn: 'titulo',
  fields: [
    col('titulo'), col('tipo'), col('status'), col('genero'),
    col('compositor'), col('compositores'), col('editora'),
    col('isrc'), col('iswc'),
    // Campos do formulário de Obra (regra 2026-07-12: 1 coluna por campo, nome exato)
    col('idioma'), col('cod_entidade'), col('cod_ecad'), col('duracao'),
    col('instrumental'), col('criada_por_ia'), col('tipo_ia'),
    col('ia_harmonia'), col('ia_melodia'), col('ia_letra'),
    col('outros_titulos'), col('referencias_conexas'), col('letra_completa'),
    col('letristas'), col('projeto_id'),
    col('artista_id'), col('tipo_obra'),
    // Somente leitura: registro/sociedades e enriquecimento (não são do form de criação)
    ro('duration_seconds'),
    ro('language'), ro('lyrics'), ro('is_instrumental'), ro('ai_used'),
    ro('registry_status'),
    ro('external_reference'), ro('origem_externa'), ro('origem_externa_sincronizado_em'),
  ],
  excludedFormFields: {
    metadata: 'objeto jsonb interno bruto',
    authors: 'relacionamento (autores/percentuais) gerido na tela própria de shares',
    shares: 'relacionamento em tabela própria (shares), reportável separadamente',
    participantes: 'relacionamento normalizado em work_participants (migration 20260718000011), reportável separadamente',
    co_compositores: 'coluna removida (20260718000011) — sem writer ativo, nenhum dado real perdido',
    detentores: 'coluna removida (20260718000011) — sem writer ativo, nenhum dado real perdido',
    abramus_protocol: 'coluna órfã removida (20260718000016) — nunca escrita por nenhum fluxo real',
  },
};

// ─── Fonogramas ───────────────────────────────────────────────────────────────
const PHONOGRAMS_CONTRACT: ReportFormContract = {
  tableName: 'phonograms',
  identityColumn: 'titulo',
  fields: [
    col('titulo'), col('status'), col('genero_musical'), col('isrc'),
    col('duracao'), col('artista_id'), col('obra_id'),
    // Campos do formulário de Fonograma (regra 2026-07-12: 1 coluna por campo, nome exato)
    col('cod_entidade'), col('cod_ecad'), col('agregadora'),
    col('isrc_pais'), col('isrc_registrante'), col('isrc_ano'), col('isrc_designacao'),
    col('criada_por_ia'), col('instrumental'), col('nacional'), col('pub_simultanea'),
    col('emissao'), col('gravacao_original'), col('data_lancamento'),
    col('duracao_min'), col('duracao_seg'), col('midia'), col('classificacao'),
    col('pais_origem'), col('pais_publicacao'), col('gravadora'),
    col('observacoes'), col('participacao'), col('arquivo_audio'),
    // Somente leitura: registro/sociedades e metadados de gravação
    ro('tipo'), ro('version_title'), ro('interpretes'), ro('compositores'),
    ro('produtores'), ro('duration_seconds'),
    ro('recording_date'), ro('release_date'), ro('copyright_year'),
    ro('copyright_owner'), ro('country_of_recording'),
    ro('registry_status'),
    ro('external_reference'), ro('origem_externa'), ro('origem_externa_sincronizado_em'),
  ],
  excludedFormFields: {
    metadata: 'objeto jsonb interno bruto',
    fileUrl: 'arquivo de áudio gerido pelo fluxo de upload (audio_file_id)',
    abramus_protocol: 'coluna órfã removida (20260718000016) — nunca escrita por nenhum fluxo real',
  },
  formFieldAliases: {
    title: 'titulo',
    duration: 'duracao',
    artistId: 'artista_id',
    workId: 'obra_id',
  },
};

// ─── Clientes ─────────────────────────────────────────────────────────────────
// Parte 78: sem contrato central, o exportador (heurística genérica) omitia
// email/telefone/cpf_cnpj por completo (colunas *_encrypted nunca aparecem em
// exportableColumns). Uma exportação de "Clientes" sem contato é inútil na
// prática — registra o contrato para que o engine descriptografe esses campos
// como faz para artists/employees.
const CLIENTS_CONTRACT: ReportFormContract = {
  tableName: 'clients',
  identityColumn: 'nome',
  fields: [
    col('tipo_pessoa'), col('categoria'), col('perfil'), col('nome'),
    col('foto'), col('nome_pf'), col('razao_social'), col('nome_fantasia'),
    enc('email', 'email_encrypted'), enc('telefone', 'telefone_encrypted'),
    enc('cpf_cnpj', 'cpf_cnpj_encrypted'),
    col('instagram'), col('funcao'),
    col('logradouro'), col('numero'), col('complemento'), col('bairro'),
    col('cidade'), col('estado'), col('cep'), col('endereco_completo'),
    col('status_contato'), col('prioridade_contato'),
    col('responsavel_nome'), col('responsavel_email'),
    col('responsavel_telefone'), col('responsavel_cargo'),
    col('observacoes'), col('status'),
  ],
  excludedFormFields: {
    metadata: 'objeto jsonb interno bruto — sem campos de formulário próprios',
    avatarUrl: 'aceito pelo CreateClientDto mas descartado pelo service — sem coluna própria mapeada (normalizeClientPayload nunca persiste avatarUrl)',
  },
  formFieldAliases: {
    name: 'nome',
    type: 'tipo_pessoa',
    category: 'categoria',
    phone: 'telefone',
    document: 'cpf_cnpj',
    address: 'endereco_completo',
    // Parte 79: CreateClientDto ganhou estes campos para suportar "Contatos"
    // do CRM (mesma tabela física `clients` — Contato = Cliente).
    city: 'cidade',
    state: 'estado',
    zipCode: 'cep',
    responsible: 'responsavel_nome',
    notes: 'observacoes',
  },
};

export const REPORT_FORM_CONTRACTS: Record<string, ReportFormContract> = {
  artists: ARTISTS_CONTRACT,
  employees: EMPLOYEES_CONTRACT,
  contracts: CONTRACTS_CONTRACT,
  contract_templates: CONTRACT_TEMPLATES_CONTRACT,
  artist_goals: ARTIST_GOALS_CONTRACT,
  works: WORKS_CONTRACT,
  phonograms: PHONOGRAMS_CONTRACT,
  clients: CLIENTS_CONTRACT,
};

export function getReportFormContract(tableName: string): ReportFormContract | null {
  return REPORT_FORM_CONTRACTS[tableName] ?? null;
}

export function contractFieldByKey(
  contract: ReportFormContract,
): Map<string, ReportFieldSpec> {
  return new Map(contract.fields.map((f) => [f.key, f]));
}

export function contractExportableColumns(contract: ReportFormContract): string[] {
  return contract.fields.map((f) => f.key);
}

export function contractImportableColumns(contract: ReportFormContract): string[] {
  return contract.fields.filter((f) => f.importable !== false).map((f) => f.key);
}

export function contractDirectColumns(contract: ReportFormContract): Set<string> {
  return new Set(contract.fields.filter((f) => f.storage === 'column').map((f) => f.key));
}

export function contractEncryptedFields(contract: ReportFormContract): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of contract.fields) {
    if (f.storage === 'encrypted' && f.physical) out[f.key] = f.physical;
  }
  return out;
}

export function contractMetadataFields(contract: ReportFormContract): Set<string> {
  return new Set(contract.fields.filter((f) => f.storage === 'metadata').map((f) => f.key));
}
