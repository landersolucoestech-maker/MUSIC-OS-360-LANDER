import { redactSensitiveObject, REDACTED } from './redact';

describe('redactSensitiveObject (clear-text exposure, CWE-312/532)', () => {
  it('redacts secret-looking keys, keeps metadata', () => {
    const out = redactSensitiveObject({
      runId: 'r1',
      status: 'ok',
      password: 'p',
      access_token: 'at',
      refresh_token: 'rt',
      api_key: 'ak',
      client_secret: 'cs',
      DATABASE_URL: 'postgres://u:p@h/db',
      SUPABASE_SERVICE_ROLE_KEY: 'srk',
      JWT_SECRET: 'js',
      R2_SECRET_KEY: 'r2',
      authorization: 'Bearer x',
    }) as Record<string, string>;
    expect(out.runId).toBe('r1');
    expect(out.status).toBe('ok');
    for (const k of [
      'password', 'access_token', 'refresh_token', 'api_key', 'client_secret',
      'DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'R2_SECRET_KEY', 'authorization',
    ]) {
      expect(out[k]).toBe(REDACTED);
    }
  });

  it('redacts nested objects and arrays', () => {
    const out = redactSensitiveObject({
      list: [{ token: 't', name: 'n' }],
      nested: { deep: { secret: 's', keep: 'k' } },
    }) as any;
    expect(out.list[0].token).toBe(REDACTED);
    expect(out.list[0].name).toBe('n');
    expect(out.nested.deep.secret).toBe(REDACTED);
    expect(out.nested.deep.keep).toBe('k');
  });

  it('leaves primitives untouched', () => {
    expect(redactSensitiveObject('hello')).toBe('hello');
    expect(redactSensitiveObject(42)).toBe(42);
    expect(redactSensitiveObject(null)).toBeNull();
  });
});
