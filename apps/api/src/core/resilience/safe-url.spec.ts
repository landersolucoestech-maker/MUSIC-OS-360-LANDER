import { assertAllowedHost, DisallowedHostError } from './safe-url';

describe('assertAllowedHost (SSRF guard, CWE-918)', () => {
  const ALLOWED = ['api.deezer.com', 'api.spotify.com'] as const;

  it('returns the URL when the host is allowlisted and HTTPS', () => {
    expect(assertAllowedHost('https://api.deezer.com/artist/123', ALLOWED)).toBe(
      'https://api.deezer.com/artist/123',
    );
  });

  it('rejects a non-allowlisted host', () => {
    expect(() => assertAllowedHost('https://evil.example.com/x', ALLOWED)).toThrow(DisallowedHostError);
  });

  it('rejects non-HTTPS schemes', () => {
    expect(() => assertAllowedHost('http://api.deezer.com/x', ALLOWED)).toThrow(DisallowedHostError);
    expect(() => assertAllowedHost('file:///etc/passwd', ALLOWED)).toThrow(DisallowedHostError);
  });

  it('rejects malformed URLs', () => {
    expect(() => assertAllowedHost('not a url', ALLOWED)).toThrow(DisallowedHostError);
  });

  it('blocks userinfo/@ host-spoofing attempts', () => {
    // `@` would make api.deezer.com userinfo and the real host internal-host.
    expect(() => assertAllowedHost('https://api.deezer.com@internal-host/x', ALLOWED)).toThrow(DisallowedHostError);
  });

  it('keeps an encoded identifier inside the path (cannot change host)', () => {
    const id = encodeURIComponent('../../@internal-host');
    const url = assertAllowedHost(`https://api.deezer.com/artist/${id}`, ALLOWED);
    expect(new URL(url).hostname).toBe('api.deezer.com');
  });
});
