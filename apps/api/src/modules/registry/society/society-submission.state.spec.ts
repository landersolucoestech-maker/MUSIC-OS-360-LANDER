import { SocietySubmissionStatus as S } from '@music-os-360/types';
import { canTransition, allowedNext, REQUIRES_SNAPSHOT } from './society-submission.state';

describe('society submission state machine', () => {
  it('allows the happy path transitions', () => {
    expect(canTransition(S.DRAFT, S.VALIDATING)).toBe(true);
    expect(canTransition(S.VALIDATING, S.VALID)).toBe(true);
    expect(canTransition(S.VALID, S.READY)).toBe(true);
    expect(canTransition(S.READY, S.SUBMITTED)).toBe(true);
    expect(canTransition(S.SUBMITTED, S.APPROVED)).toBe(true);
  });

  it('blocks illegal jumps', () => {
    expect(canTransition(S.DRAFT, S.APPROVED)).toBe(false);
    expect(canTransition(S.DRAFT, S.SUBMITTED)).toBe(false);
    expect(canTransition(S.VALID, S.SUBMITTED)).toBe(false);
  });

  it('treats APPROVED and CANCELLED as terminal', () => {
    expect(allowedNext(S.APPROVED)).toHaveLength(0);
    expect(allowedNext(S.CANCELLED)).toHaveLength(0);
  });

  it('forbids self-transition', () => {
    expect(canTransition(S.DRAFT, S.DRAFT)).toBe(false);
  });

  it('requires a snapshot before EXPORTED/SUBMITTED', () => {
    expect(REQUIRES_SNAPSHOT).toContain(S.EXPORTED);
    expect(REQUIRES_SNAPSHOT).toContain(S.SUBMITTED);
  });

  it('maps every status', () => {
    for (const st of Object.values(S)) {
      expect(Array.isArray(allowedNext(st))).toBe(true);
    }
  });
});
