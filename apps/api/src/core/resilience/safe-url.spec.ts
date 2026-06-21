import {
  assertSafePathSegment,
  assertSafeStorefront,
  assertSafeLimit,
  assertSafeTypes,
  assertSafeQueryValue,
  assertAllowedHost,
  UnsafeInputError,
  DisallowedHostError,
} from './safe-url';

describe('safe-url SSRF guards (CWE-918)', () => {
  describe('assertSafePathSegment', () => {
    it('accepts a clean id', () => {
      expect(assertSafePathSegment('123abc_-.~', 'id')).toBe('123abc_-.~');
    });
    it.each([
      ['slash', 'a/b'],
      ['backslash', 'a\\b'],
      ['question', 'a?b'],
      ['hash', 'a#b'],
      ['at', 'a@b'],
      ['percent-encoded slash', 'a%2fb'],
      ['space', 'a b'],
      ['full url', 'https://evil.com'],
      ['scheme', 'http://x'],
      ['empty', ''],
    ])('rejects %s', (_label, value) => {
      expect(() => assertSafePathSegment(value, 'id')).toThrow(UnsafeInputError);
    });
  });

  describe('assertSafeStorefront', () => {
    it('accepts two lowercase letters', () => {
      expect(assertSafeStorefront('br')).toBe('br');
    });
    it.each(['BR', 'bra', 'b', '1r', 'b/', ''])('rejects "%s"', (v) => {
      expect(() => assertSafeStorefront(v)).toThrow(UnsafeInputError);
    });
  });

  describe('assertSafeLimit', () => {
    it('accepts an in-range integer', () => {
      expect(assertSafeLimit('10')).toBe(10);
      expect(assertSafeLimit(50)).toBe(50);
    });
    it.each([0, 51, -1, 1.5, NaN, 'abc', '10; DROP'])('rejects %s', (v) => {
      expect(() => assertSafeLimit(v as unknown)).toThrow(UnsafeInputError);
    });
  });

  describe('assertSafeTypes', () => {
    const allowed = ['artists', 'albums', 'songs'];
    it('accepts allowlisted, comma-separated values', () => {
      expect(assertSafeTypes('artists,albums', allowed)).toBe('artists,albums');
    });
    it.each(['playlists', 'artists,evil', '', 'artists;drop'])('rejects "%s"', (v) => {
      expect(() => assertSafeTypes(v, allowed)).toThrow(UnsafeInputError);
    });
  });

  describe('assertSafeQueryValue', () => {
    it('accepts a normal term', () => {
      expect(assertSafeQueryValue('hello world', 'term')).toBe('hello world');
    });
    it('rejects control characters and over-long input', () => {
      expect(() => assertSafeQueryValue('a\nb', 'term')).toThrow(UnsafeInputError);
      expect(() => assertSafeQueryValue('x'.repeat(9999), 'term')).toThrow(UnsafeInputError);
      expect(() => assertSafeQueryValue('', 'term')).toThrow(UnsafeInputError);
    });
  });

  describe('assertAllowedHost', () => {
    const ALLOWED = ['api.deezer.com', 'api.spotify.com'];
    it('accepts an allowlisted HTTPS host', () => {
      expect(assertAllowedHost('https://api.deezer.com/artist/1', ALLOWED)).toBe('https://api.deezer.com/artist/1');
    });
    it('rejects a non-allowlisted host', () => {
      expect(() => assertAllowedHost('https://evil.example.com/x', ALLOWED)).toThrow(DisallowedHostError);
    });
    it('rejects non-HTTPS', () => {
      expect(() => assertAllowedHost('http://api.deezer.com/x', ALLOWED)).toThrow(DisallowedHostError);
    });
    it('blocks @ host-spoofing', () => {
      expect(() => assertAllowedHost('https://api.deezer.com@internal/x', ALLOWED)).toThrow(DisallowedHostError);
    });
  });
});
