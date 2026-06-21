import {
  isSafeKey,
  isWritableKey,
  assertSafeKey,
  UnsafeKeyError,
} from './safe-object';

const POLLUTING = [
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  '__defineGetter__',
  '__defineSetter__',
];

describe('safe-object (property injection / prototype pollution, CWE-915)', () => {
  describe('isSafeKey (strict identifier)', () => {
    it('rejects every prototype-polluting key', () => {
      for (const k of POLLUTING) expect(isSafeKey(k)).toBe(false);
    });

    it('rejects malformed / non-identifier keys', () => {
      for (const k of ['a.b', 'a[b]', '', ' ', 'a b', 'café']) {
        expect(isSafeKey(k)).toBe(false);
      }
    });

    it('rejects non-string keys', () => {
      for (const k of [null, undefined, 1, {}, []]) expect(isSafeKey(k)).toBe(false);
    });

    it('accepts plain identifier keys', () => {
      for (const k of ['valid_key', 'valid-key', 'validKey123']) {
        expect(isSafeKey(k)).toBe(true);
      }
    });
  });

  describe('isWritableKey (lenient — blocks only pollution)', () => {
    it('rejects every prototype-polluting key', () => {
      for (const k of POLLUTING) expect(isWritableKey(k)).toBe(false);
    });

    it('rejects empty / non-string keys', () => {
      for (const k of ['', null, undefined, 0, {}]) expect(isWritableKey(k)).toBe(false);
    });

    it('accepts free-form keys (accents, spaces, punctuation, brackets)', () => {
      for (const k of [
        'a.b',
        'a[b]',
        'valid_key',
        'valid-key',
        'validKey123',
        'Saldo Líquido (R$)',
        'Investimento (R$)',
      ]) {
        expect(isWritableKey(k)).toBe(true);
      }
    });
  });

  describe('assertSafeKey', () => {
    it('returns the key when safe', () => {
      expect(assertSafeKey('valid_key')).toBe('valid_key');
    });

    it('throws UnsafeKeyError on a polluting key', () => {
      for (const k of POLLUTING) {
        expect(() => assertSafeKey(k)).toThrow(UnsafeKeyError);
      }
    });
  });

  it('a guarded null-proto write cannot pollute Object.prototype', () => {
    const bag: Record<string, unknown> = Object.create(null);
    for (const k of POLLUTING) {
      if (isWritableKey(k)) bag[k] = 'x';
    }
    // nothing leaked onto the global prototype
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(bag, '__proto__')).toBe(false);
  });
});
