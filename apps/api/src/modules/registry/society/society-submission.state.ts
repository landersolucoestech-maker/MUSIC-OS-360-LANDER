/**
 * Society submission state machine.
 *
 * Single source of truth for allowed status transitions. The service consults
 * this before persisting any status change, and a DB CHECK guards the column.
 */

import { SocietySubmissionStatus } from '@music-os-360/types';

const S = SocietySubmissionStatus;

export const SUBMISSION_TRANSITIONS: Record<SocietySubmissionStatus, SocietySubmissionStatus[]> = {
  [S.DRAFT]:               [S.VALIDATING, S.CANCELLED],
  [S.VALIDATING]:          [S.VALID, S.INVALID],
  [S.VALID]:               [S.READY, S.INVALID, S.VALIDATING],
  [S.INVALID]:             [S.DRAFT, S.VALIDATING, S.CANCELLED],
  [S.READY]:               [S.EXPORTED, S.SUBMITTED, S.CANCELLED, S.VALIDATING],
  [S.EXPORTED]:            [S.SUBMITTED, S.READY],
  [S.SUBMITTED]:           [S.PROCESSING, S.APPROVED, S.REJECTED, S.FAILED],
  [S.PROCESSING]:          [S.APPROVED, S.REJECTED, S.FAILED, S.REQUIRES_CORRECTION],
  [S.REQUIRES_CORRECTION]: [S.DRAFT, S.VALIDATING],
  [S.REJECTED]:            [S.DRAFT, S.CANCELLED],
  [S.APPROVED]:            [], // terminal
  [S.FAILED]:              [S.DRAFT, S.CANCELLED],
  [S.CANCELLED]:           [], // terminal
};

export function canTransition(from: SocietySubmissionStatus, to: SocietySubmissionStatus): boolean {
  if (from === to) return false;
  return (SUBMISSION_TRANSITIONS[from] ?? []).includes(to);
}

export function allowedNext(from: SocietySubmissionStatus): SocietySubmissionStatus[] {
  return SUBMISSION_TRANSITIONS[from] ?? [];
}

/** Statuses that require a payload snapshot to already exist before entering. */
export const REQUIRES_SNAPSHOT: SocietySubmissionStatus[] = [S.EXPORTED, S.SUBMITTED];
