import { BadRequestException } from '@nestjs/common';

/**
 * Resolução de aliases EN legados para os campos canônicos pt-BR de Contracts
 * (Fase 5 / C1). Puro: não loga, não conhece tenant/operação, não acessa
 * repository, não importa Swagger, não aplica defaults de negócio (ex.:
 * tipo='outro') — isso é responsabilidade do ContractsService.
 *
 * Regra de presença: `hasOwnProperty` decide presença; `undefined` é tratado
 * como ausente; `null` é tratado como fornecido (participa de conflito, mas
 * nunca vira erro de conteúdo para os campos opcionais — só título rejeita
 * null). A remoção de chaves `null` antes da persistência (para não alterar
 * a semântica atual de PATCH) é feita pelo chamador, não aqui.
 */

export interface ContractFieldRef {
  canonical: string;
  legacy?: string;
}

export type ContractAliasErrorCode =
  | 'CONTRACT_ALIAS_CONFLICT'
  | 'CONTRACT_TITLE_INVALID'
  | 'CONTRACT_VALUE_INVALID'
  | 'CONTRACT_DATE_INVALID'
  | 'CONTRACT_UUID_INVALID';

export interface ContractAliasErrorBody {
  code: ContractAliasErrorCode;
  message: string;
  fields?: ContractFieldRef[];
}

export interface ResolvedContractWriteFields {
  title?: string;
  tipo?: string | null;
  artist_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  arquivo_url?: string | null;
  valor?: string | null;
}

export interface ResolvedContractQueryFields {
  tipo?: string | null;
  artist_id?: string | null;
}

export interface ContractAliasResolution<T> {
  normalized: T;
  legacyAliasesUsed: string[];
}

// ── Helpers de presença/valor ────────────────────────────────────────────────

function isAbsent(input: Record<string, unknown>, key: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(input, key)) return true;
  return input[key] === undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Converte para a representação canônica final (string) usada pela entity, ou 'invalid'. */
function parseCanonicalValue(v: unknown): string | 'invalid' {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'invalid';
  if (typeof v === 'string') {
    if (v.trim() === '') return 'invalid';
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : 'invalid';
  }
  return 'invalid';
}

/** Só valida formato (getTime() finito) — nunca lança RangeError, nunca converte null em epoch. */
function parseStrictDate(v: unknown): string | 'invalid' {
  if (typeof v !== 'string') return 'invalid';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 'invalid' : d.toISOString();
}

function throwConflict(canonical: string, legacy: string): never {
  const body: ContractAliasErrorBody = {
    code: 'CONTRACT_ALIAS_CONFLICT',
    message: `Campos conflitantes: "${canonical}" e o alias legado "${legacy}".`,
    fields: [{ canonical, legacy }],
  };
  throw new BadRequestException(body);
}

function throwInvalid(code: ContractAliasErrorCode, canonical: string, field: string): never {
  const body: ContractAliasErrorBody = {
    code,
    message: `Campo "${field}" inválido.`,
    fields: [{ canonical, legacy: field !== canonical ? field : undefined }],
  };
  throw new BadRequestException(body);
}

// ── Resolução genérica de par (campos opcionais: tipo, artist_id, datas, valor) ─

interface PairSpec {
  canonical: string;
  legacy: string;
  invalidCode?: ContractAliasErrorCode;
  /** true se o valor não-null é aceitável; ausente = qualquer valor é aceito. */
  validate?: (v: unknown) => boolean;
  /** compara dois valores não-null já validados. */
  isEquivalent: (a: unknown, b: unknown) => boolean;
  /** mapeia um valor não-null já validado para a forma final persistida. */
  transform: (v: unknown) => unknown;
}

function resolvePair(input: Record<string, unknown>, spec: PairSpec, legacyUsed: Set<string>): unknown {
  const ptAbsent = isAbsent(input, spec.canonical);
  const enAbsent = isAbsent(input, spec.legacy);

  if (ptAbsent && enAbsent) return undefined;

  if (!ptAbsent && enAbsent) {
    const v = input[spec.canonical];
    if (v === null) return null;
    if (spec.validate && !spec.validate(v)) throwInvalid(spec.invalidCode!, spec.canonical, spec.canonical);
    return spec.transform(v);
  }

  if (ptAbsent && !enAbsent) {
    legacyUsed.add(spec.legacy);
    const v = input[spec.legacy];
    if (v === null) return null;
    if (spec.validate && !spec.validate(v)) throwInvalid(spec.invalidCode!, spec.canonical, spec.legacy);
    return spec.transform(v);
  }

  // ambos presentes
  const ptV = input[spec.canonical];
  const enV = input[spec.legacy];

  if (ptV === null && enV === null) {
    legacyUsed.add(spec.legacy);
    return null;
  }
  if (ptV === null || enV === null) {
    throwConflict(spec.canonical, spec.legacy);
  }

  if (spec.validate) {
    if (!spec.validate(ptV)) throwInvalid(spec.invalidCode!, spec.canonical, spec.canonical);
    if (!spec.validate(enV)) throwInvalid(spec.invalidCode!, spec.canonical, spec.legacy);
  }

  if (spec.isEquivalent(ptV, enV)) {
    legacyUsed.add(spec.legacy);
    return spec.transform(ptV);
  }
  throwConflict(spec.canonical, spec.legacy);
}

const TIPO_SPEC: PairSpec = {
  canonical: 'tipo',
  legacy: 'type',
  isEquivalent: (a, b) => a === b,
  transform: (v) => v,
};

const ARTIST_ID_SPEC: PairSpec = {
  canonical: 'artist_id',
  legacy: 'artistId',
  invalidCode: 'CONTRACT_UUID_INVALID',
  validate: (v) => typeof v === 'string' && UUID_RE.test(v),
  isEquivalent: (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase(),
  transform: (v) => v,
};

const DATA_INICIO_SPEC: PairSpec = {
  canonical: 'data_inicio',
  legacy: 'startsAt',
  invalidCode: 'CONTRACT_DATE_INVALID',
  validate: (v) => parseStrictDate(v) !== 'invalid',
  isEquivalent: (a, b) => parseStrictDate(a) === parseStrictDate(b),
  transform: (v) => v, // persiste o valor original, não o ISO normalizado
};

const DATA_FIM_SPEC: PairSpec = {
  canonical: 'data_fim',
  legacy: 'expiresAt',
  invalidCode: 'CONTRACT_DATE_INVALID',
  validate: (v) => parseStrictDate(v) !== 'invalid',
  isEquivalent: (a, b) => parseStrictDate(a) === parseStrictDate(b),
  transform: (v) => v,
};

const ARQUIVO_URL_SPEC: PairSpec = {
  canonical: 'arquivo_url',
  legacy: 'fileUrl',
  isEquivalent: (a, b) => a === b,
  transform: (v) => v,
};

const VALOR_SPEC: PairSpec = {
  canonical: 'valor',
  legacy: 'value',
  invalidCode: 'CONTRACT_VALUE_INVALID',
  validate: (v) => parseCanonicalValue(v) !== 'invalid',
  isEquivalent: (a, b) => parseCanonicalValue(a) === parseCanonicalValue(b),
  transform: (v) => parseCanonicalValue(v), // única responsabilidade de coerção do valor
};

// ── Título — obrigatoriedade tratada pelo chamador; aqui só conteúdo/conflito ──

function assertTitleContent(v: unknown, field: string): asserts v is string {
  if (v === null || typeof v !== 'string' || v.trim() === '') {
    throwInvalid('CONTRACT_TITLE_INVALID', 'title', field);
  }
}

/**
 * Após a normalização de nomenclatura (2026-09-05), a coluna física passou
 * de `titulo` para `title`. `titulo` agora é o alias legado PT aceito para
 * chamadores antigos — mesma estrutura de antes, papéis invertidos.
 */
function resolveTitle(input: Record<string, unknown>, legacyUsed: Set<string>): string | undefined {
  const enAbsent = isAbsent(input, 'title');
  const ptAbsent = isAbsent(input, 'titulo');

  if (ptAbsent && enAbsent) return undefined;

  if (!enAbsent && ptAbsent) {
    const v = input['title'];
    assertTitleContent(v, 'title');
    return v;
  }

  if (enAbsent && !ptAbsent) {
    legacyUsed.add('titulo');
    const v = input['titulo'];
    assertTitleContent(v, 'titulo');
    return v;
  }

  const enV = input['title'];
  const ptV = input['titulo'];
  assertTitleContent(enV, 'title');
  assertTitleContent(ptV, 'titulo');
  legacyUsed.add('titulo');
  if (enV.trim() === ptV.trim()) return enV;
  throwConflict('title', 'titulo');
}

// ── API pública ──────────────────────────────────────────────────────────────

/**
 * Resolve os 7 aliases de escrita (create/update). Não valida obrigatoriedade
 * de título (isso é decisão de create-vs-update, portanto do service) — só
 * conteúdo/conflito quando um valor é efetivamente enviado.
 */
export function resolveContractAliases(input: Record<string, unknown>): ContractAliasResolution<ResolvedContractWriteFields> {
  const legacyUsed = new Set<string>();
  const normalized: ResolvedContractWriteFields = {};

  const title = resolveTitle(input, legacyUsed);
  if (title !== undefined) normalized.title = title;

  const tipo = resolvePair(input, TIPO_SPEC, legacyUsed);
  if (tipo !== undefined) normalized.tipo = tipo as string | null;

  const artistId = resolvePair(input, ARTIST_ID_SPEC, legacyUsed);
  if (artistId !== undefined) normalized.artist_id = artistId as string | null;

  const dataInicio = resolvePair(input, DATA_INICIO_SPEC, legacyUsed);
  if (dataInicio !== undefined) normalized.data_inicio = dataInicio as string | null;

  const dataFim = resolvePair(input, DATA_FIM_SPEC, legacyUsed);
  if (dataFim !== undefined) normalized.data_fim = dataFim as string | null;

  const arquivoUrl = resolvePair(input, ARQUIVO_URL_SPEC, legacyUsed);
  if (arquivoUrl !== undefined) normalized.arquivo_url = arquivoUrl as string | null;

  const valor = resolvePair(input, VALOR_SPEC, legacyUsed);
  if (valor !== undefined) normalized.valor = valor as string | null;

  return { normalized, legacyAliasesUsed: Array.from(legacyUsed) };
}

/**
 * Resolve exclusivamente os 2 aliases de consulta (tipo/type, artist_id/artistId).
 * Não conhece nem processa title/value/datas — impossível vazarem pela query.
 */
export function resolveContractQueryAliases(input: Record<string, unknown>): ContractAliasResolution<ResolvedContractQueryFields> {
  const legacyUsed = new Set<string>();
  const normalized: ResolvedContractQueryFields = {};

  const tipo = resolvePair(input, TIPO_SPEC, legacyUsed);
  if (tipo !== undefined) normalized.tipo = tipo as string | null;

  const artistId = resolvePair(input, ARTIST_ID_SPEC, legacyUsed);
  if (artistId !== undefined) normalized.artist_id = artistId as string | null;

  return { normalized, legacyAliasesUsed: Array.from(legacyUsed) };
}
