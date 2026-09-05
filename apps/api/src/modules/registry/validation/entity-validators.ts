/**
 * Pure registry rule evaluators — no DB. Given an entity + its active shares,
 * return validation issues. The orchestrating SocietyValidationService loads the
 * data, calls these, and persists the results.
 */

import { Injectable } from '@nestjs/common';
import { SocietyValidationSeverity } from '@music-os-360/types';
import type { WorkEntity, PhonogramEntity, ShareEntity } from '../../../database/entities';
import type { RegistryValidationIssue } from '../payloads/registry-payload.types';
import { isValidIsrc, isValidCpf, isValidCnpj, onlyDigits } from '../validators/registry-validators';
import { isRegistryEligibleShare } from '../../shares/share-eligibility.util';

const E = SocietyValidationSeverity.ERROR;
const W = SocietyValidationSeverity.WARNING;

function issue(severity: SocietyValidationSeverity, code: string, field: string | null, message: string): RegistryValidationIssue {
  return { severity, code, field_path: field, message };
}

function toPercent(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isPublisherRole(role: string | null | undefined): boolean {
  const r = (role ?? '').toLowerCase();
  return r.includes('publisher') || r.includes('editora') || r.includes('editor');
}

function isInterpreterRole(role: string | null | undefined): boolean {
  const r = (role ?? '').toLowerCase();
  return r.includes('interpret') || r.includes('main_artist') || r.includes('artist') || r.includes('vocal') || r.includes('cantor');
}

function isProducerRole(role: string | null | undefined): boolean {
  const r = (role ?? '').toLowerCase();
  return r.includes('producer') || r.includes('produtor');
}

function validateDocumentSoft(doc: string | null | undefined): boolean {
  if (!doc) return true;
  const digits = onlyDigits(doc);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return true; // unknown length — not blocked here
}

@Injectable()
export class WorkRegistryValidationService {
  validate(work: WorkEntity, shares: ShareEntity[]): RegistryValidationIssue[] {
    const issues: RegistryValidationIssue[] = [];
    const active = shares.filter((s) => !s.deleted_at);
    // share_type IS NULL = elegibilidade transitória de registro — shares
    // financeiras/pendentes (ver Fase 5 / C6) nunca contam como autor nem
    // entram na soma de splits.
    const eligible = active.filter(isRegistryEligibleShare);

    if (!work.titulo || !work.titulo.trim()) {
      issues.push(issue(E, 'work_title_required', 'title', 'Título da obra é obrigatório.'));
    }

    const authors = eligible.filter((s) => !isPublisherRole(s.role ?? s.papel));
    if (authors.length === 0) {
      issues.push(issue(E, 'work_no_author', 'authors', 'A obra precisa de pelo menos um autor/compositor.'));
    }

    let percentualSum = 0;
    for (const s of eligible) {
      if (!s.titular_nome || !s.titular_nome.trim()) {
        issues.push(issue(E, 'work_split_titular_nome_missing', 'splits.titular_nome', `Share ${s.id} elegível para registro está sem titular_nome.`));
      }
      if (s.percentual == null) {
        issues.push(issue(E, 'work_split_percentual_missing', 'splits.percentual', `Share ${s.id} elegível para registro está sem percentual.`));
        continue;
      }
      const p = toPercent(s.percentual);
      if (p < 0 || p > 100) {
        issues.push(issue(E, 'work_split_percentage_invalid', 'splits', `Percentual inválido (${p}). Deve estar entre 0 e 100.`));
      }
      percentualSum += p;
      if (!validateDocumentSoft(s.titular_doc)) {
        issues.push(issue(W, 'work_invalid_document', 'splits.document', `Documento do titular "${s.titular_nome}" parece inválido.`));
      }
    }

    if (eligible.length > 0) {
      if (Math.abs(percentualSum - 100) > 0.01) {
        issues.push(issue(E, 'work_split_not_100', 'splits', `A soma dos splits ativos deve ser 100% (atual: ${percentualSum.toFixed(2)}%).`));
      }
    }

    if (work.ai_used === true) {
      const tools = Array.isArray(work.ai_tools) ? work.ai_tools : [];
      const prompts = Array.isArray(work.ai_prompts) ? work.ai_prompts : [];
      if (tools.length === 0 && prompts.length === 0) {
        issues.push(issue(E, 'work_ai_declaration_missing', 'ai_declaration', 'IA declarada: informe ferramentas (ai_tools) ou prompts (ai_prompts).'));
      }
    }

    return issues;
  }
}

@Injectable()
export class RecordingRegistryValidationService {
  validate(recording: PhonogramEntity, shares: ShareEntity[]): RegistryValidationIssue[] {
    const issues: RegistryValidationIssue[] = [];
    const active = shares.filter((s) => !s.deleted_at);
    // share_type IS NULL = elegibilidade transitória de registro (ver Fase 5 / C6).
    const eligible = active.filter(isRegistryEligibleShare);

    if (!recording.work_id) {
      issues.push(issue(E, 'recording_work_required', 'work_id', 'Fonograma deve estar vinculado a uma obra (work_id).'));
    }
    if (!recording.titulo || !recording.titulo.trim()) {
      issues.push(issue(E, 'recording_title_required', 'title', 'Título do fonograma é obrigatório.'));
    }

    const hasDuration = (recording.duration_seconds ?? 0) > 0 || !!(recording.duracao && recording.duracao.trim());
    if (!hasDuration) {
      issues.push(issue(E, 'recording_duration_required', 'duration_seconds', 'Duração do fonograma é obrigatória.'));
    }

    const hasMainArtist = !!recording.main_artist_id || !!recording.artist_id ||
      eligible.some((s) => isInterpreterRole(s.role ?? s.papel));
    if (!hasMainArtist) {
      issues.push(issue(E, 'recording_main_artist_required', 'main_artist', 'Fonograma precisa de um artista principal/intérprete.'));
    }

    const hasProducer = !!recording.phonographic_producer_id ||
      eligible.some((s) => isProducerRole(s.role ?? s.papel)) ||
      !!(recording.produtores && recording.produtores.trim());
    if (!hasProducer) {
      issues.push(issue(E, 'recording_producer_required', 'phonographic_producer', 'Fonograma precisa de um produtor fonográfico.'));
    }

    const hasInterpreter = eligible.some((s) => isInterpreterRole(s.role ?? s.papel)) ||
      !!(recording.interpretes && recording.interpretes.trim()) || !!recording.artist_id;
    if (!hasInterpreter) {
      issues.push(issue(E, 'recording_no_interpreter', 'interpreters', 'Fonograma precisa de pelo menos um intérprete.'));
    }

    if (recording.isrc && !isValidIsrc(recording.isrc)) {
      issues.push(issue(E, 'recording_isrc_invalid', 'isrc', 'ISRC inválido. Deixe vazio para PENDING_ISRC ou corrija o formato.'));
    }

    return issues;
  }
}
