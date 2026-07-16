import { BadRequestException } from '@nestjs/common';

/**
 * Resolução de aliases EN legados para os campos canônicos pt-BR de Phonograms
 * (C2): titulo/title, obra_id/workId, artista_id/artistId. Puro: não loga,
 * não conhece tenant/operação, não acessa repository, não importa Swagger,
 * não aplica defaults de negócio (ex.: tipo='master') — isso é
 * responsabilidade do PhonogramsService.
 *
 * Regra de presença: `hasOwnProperty` decide presença; `undefined` é tratado
 * como ausente; `null` é tratado como fornecido (participa de conflito, mas
 * nunca vira erro de conteúdo para os campos opcionais — só título rejeita
 * null). A remoção de chaves `null` antes da persistência (para não alterar
 * a semântica atual de PATCH) é feita pelo chamador, não aqui.
 */

export interface PhonogramFieldRef {
  canonical: string;
  legacy?: string;
}

export type PhonogramAliasErrorCode =
  | 'PHONOGRAM_ALIAS_CONFLICT'
  | 'PHONOGRAM_TITLE_INVALID'
  | 'PHONOGRAM_UUID_INVALID';

export interface PhonogramAliasErrorBody {
  code: PhonogramAliasErrorCode;
  message: string;
  fields?: PhonogramFieldRef[];
}

export interface ResolvedPhonogramWriteFields {
  titulo?: string;
  obra_id?: string | null;
  artista_id?: string | null;
}

export interface ResolvedPhonogramQueryFields {
  obra_id?: string;
  artista_id?: string;
}

export interface PhonogramAliasResolution<T> {
  normalized: T;
  legacyAliasesUsed: string[];
}

// ── Helpers de presença/valor ────────────────────────────────────────────────

function isAbsent(input: Record<string, unknown>, key: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(input, key)) return true;
  return input[key] === undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function throwConflict(canonical: string, legacy: string): never {
  const body: PhonogramAliasErrorBody = {
    code: 'PHONOGRAM_ALIAS_CONFLICT',
    message: 'Campos conflitantes.',
    fields: [{ canonical, legacy }],
  };
  throw new BadRequestException(body);
}

function throwInvalidUuid(canonical: string, field: string): never {
  const body: PhonogramAliasErrorBody = {
    code: 'PHONOGRAM_UUID_INVALID',
    message: 'UUID inválido.',
    fields: [{ canonical, legacy: field !== canonical ? field : undefined }],
  };
  throw new BadRequestException(body);
}

function throwInvalidTitle(field: string): never {
  const body: PhonogramAliasErrorBody = {
    code: 'PHONOGRAM_TITLE_INVALID',
    message: 'titulo inválido.',
    fields: [{ canonical: 'titulo', legacy: field !== 'titulo' ? field : undefined }],
  };
  throw new BadRequestException(body);
}

// ── Par genérico de UUID (obra_id/workId, artista_id/artistId) ──────────────

interface UuidPairSpec {
  canonical: string;
  legacy: string;
}

function resolveUuidPair(
  input: Record<string, unknown>,
  spec: UuidPairSpec,
  legacyUsed: Set<string>,
): string | null | undefined {
  const ptAbsent = isAbsent(input, spec.canonical);
  const enAbsent = isAbsent(input, spec.legacy);

  if (ptAbsent && enAbsent) return undefined;

  if (!ptAbsent && enAbsent) {
    const v = input[spec.canonical];
    if (v === null) return null;
    if (typeof v !== 'string' || !UUID_RE.test(v)) throwInvalidUuid(spec.canonical, spec.canonical);
    return v;
  }

  if (ptAbsent && !enAbsent) {
    legacyUsed.add(spec.legacy);
    const v = input[spec.legacy];
    if (v === null) return null;
    if (typeof v !== 'string' || !UUID_RE.test(v)) throwInvalidUuid(spec.canonical, spec.legacy);
    return v;
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

  if (typeof ptV !== 'string' || !UUID_RE.test(ptV)) throwInvalidUuid(spec.canonical, spec.canonical);
  if (typeof enV !== 'string' || !UUID_RE.test(enV)) throwInvalidUuid(spec.canonical, spec.legacy);

  if (ptV.toLowerCase() === enV.toLowerCase()) {
    legacyUsed.add(spec.legacy);
    return ptV; // persiste o valor original (case do lado canônico)
  }
  throwConflict(spec.canonical, spec.legacy);
}

const OBRA_ID_SPEC: UuidPairSpec = { canonical: 'obra_id', legacy: 'workId' };
const ARTISTA_ID_SPEC: UuidPairSpec = { canonical: 'artista_id', legacy: 'artistId' };

// ── Título — obrigatoriedade tratada pelo chamador; aqui só conteúdo/conflito ─

function assertTitleContent(v: unknown, field: string): asserts v is string {
  if (v === null || typeof v !== 'string' || v.trim() === '') {
    throwInvalidTitle(field);
  }
}

function resolveTitulo(input: Record<string, unknown>, legacyUsed: Set<string>): string | undefined {
  const ptAbsent = isAbsent(input, 'titulo');
  const enAbsent = isAbsent(input, 'title');

  if (ptAbsent && enAbsent) return undefined;

  if (!ptAbsent && enAbsent) {
    const v = input['titulo'];
    assertTitleContent(v, 'titulo');
    return v;
  }

  if (ptAbsent && !enAbsent) {
    legacyUsed.add('title');
    const v = input['title'];
    assertTitleContent(v, 'title');
    return v;
  }

  const ptV = input['titulo'];
  const enV = input['title'];
  assertTitleContent(ptV, 'titulo');
  assertTitleContent(enV, 'title');
  legacyUsed.add('title');
  if (ptV.trim() === enV.trim()) return ptV; // persiste o valor original do lado PT, sem trim
  throwConflict('titulo', 'title');
}

// ── API pública ──────────────────────────────────────────────────────────────

/**
 * Resolve os 3 aliases de escrita (create/update). Não valida obrigatoriedade
 * de título (isso é decisão de create-vs-update, portanto do service) — só
 * conteúdo/conflito quando um valor é efetivamente enviado.
 */
export function resolvePhonogramAliases(
  input: Record<string, unknown>,
): PhonogramAliasResolution<ResolvedPhonogramWriteFields> {
  const legacyUsed = new Set<string>();
  const normalized: ResolvedPhonogramWriteFields = {};

  const titulo = resolveTitulo(input, legacyUsed);
  if (titulo !== undefined) normalized.titulo = titulo;

  const obraId = resolveUuidPair(input, OBRA_ID_SPEC, legacyUsed);
  if (obraId !== undefined) normalized.obra_id = obraId;

  const artistaId = resolveUuidPair(input, ARTISTA_ID_SPEC, legacyUsed);
  if (artistaId !== undefined) normalized.artista_id = artistaId;

  return { normalized, legacyAliasesUsed: Array.from(legacyUsed) };
}

/**
 * Resolve exclusivamente os 2 aliases de consulta (obra_id/workId,
 * artista_id/artistId). Não conhece nem processa titulo/title — impossível
 * vazarem pela query.
 */
export function resolvePhonogramQueryAliases(
  input: Record<string, unknown>,
): PhonogramAliasResolution<ResolvedPhonogramQueryFields> {
  const legacyUsed = new Set<string>();
  const normalized: ResolvedPhonogramQueryFields = {};

  const obraId = resolveUuidPair(input, OBRA_ID_SPEC, legacyUsed);
  if (obraId !== undefined && obraId !== null) normalized.obra_id = obraId;

  const artistaId = resolveUuidPair(input, ARTISTA_ID_SPEC, legacyUsed);
  if (artistaId !== undefined && artistaId !== null) normalized.artista_id = artistaId;

  return { normalized, legacyAliasesUsed: Array.from(legacyUsed) };
}
