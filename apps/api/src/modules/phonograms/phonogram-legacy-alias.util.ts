import { BadRequestException } from '@nestjs/common';

/**
 * Resolução de aliases EN legados para os campos canônicos pt-BR de Phonograms
 * (C2): title/titulo, work_id/workId, artist_id/artistId. Puro: não loga,
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
  title?: string;
  work_id?: string | null;
  artist_id?: string | null;
}

export interface ResolvedPhonogramQueryFields {
  work_id?: string;
  artist_id?: string;
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
    message: 'title inválido.',
    fields: [{ canonical: 'title', legacy: field !== 'title' ? field : undefined }],
  };
  throw new BadRequestException(body);
}

// ── Par genérico de UUID (work_id/workId, artist_id/artistId) ──────────────

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

const WORK_ID_SPEC: UuidPairSpec = { canonical: 'work_id', legacy: 'workId' };
const ARTIST_ID_SPEC: UuidPairSpec = { canonical: 'artist_id', legacy: 'artistId' };

// ── Título — obrigatoriedade tratada pelo chamador; aqui só conteúdo/conflito ─

function assertTitleContent(v: unknown, field: string): asserts v is string {
  if (v === null || typeof v !== 'string' || v.trim() === '') {
    throwInvalidTitle(field);
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
  if (enV.trim() === ptV.trim()) return enV; // persiste o valor original do lado EN, sem trim
  throwConflict('title', 'titulo');
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

  const title = resolveTitle(input, legacyUsed);
  if (title !== undefined) normalized.title = title;

  const workId = resolveUuidPair(input, WORK_ID_SPEC, legacyUsed);
  if (workId !== undefined) normalized.work_id = workId;

  const artistId = resolveUuidPair(input, ARTIST_ID_SPEC, legacyUsed);
  if (artistId !== undefined) normalized.artist_id = artistId;

  return { normalized, legacyAliasesUsed: Array.from(legacyUsed) };
}

/**
 * Resolve exclusivamente os 2 aliases de consulta (work_id/workId,
 * artist_id/artistId). Não conhece nem processa titulo/title — impossível
 * vazarem pela query.
 */
export function resolvePhonogramQueryAliases(
  input: Record<string, unknown>,
): PhonogramAliasResolution<ResolvedPhonogramQueryFields> {
  const legacyUsed = new Set<string>();
  const normalized: ResolvedPhonogramQueryFields = {};

  const workId = resolveUuidPair(input, WORK_ID_SPEC, legacyUsed);
  if (workId !== undefined && workId !== null) normalized.work_id = workId;

  const artistId = resolveUuidPair(input, ARTIST_ID_SPEC, legacyUsed);
  if (artistId !== undefined && artistId !== null) normalized.artist_id = artistId;

  return { normalized, legacyAliasesUsed: Array.from(legacyUsed) };
}
