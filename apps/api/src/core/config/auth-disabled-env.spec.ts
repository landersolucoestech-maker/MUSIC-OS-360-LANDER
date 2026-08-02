/**
 * Parte 76 — AUTH_DISABLED nunca pode escapar de development.
 * O código já bloqueava isso (envSchema.superRefine + create-app.ts), mas
 * não havia nenhum teste cobrindo a regra — só foi descoberto por inspeção
 * manual durante esta Parte.
 */
import { envSchema } from './env.schema';

function issuePaths(result: ReturnType<typeof envSchema.safeParse>): string[] {
  if (result.success) return [];
  return result.error.issues.map((i) => i.path.join('.'));
}

describe('envSchema — AUTH_DISABLED/USE_MOCK/MOCK_MODE proibidos fora de development', () => {
  it('AUTH_DISABLED=true em development não gera issue', () => {
    const result = envSchema.safeParse({ NODE_ENV: 'development', AUTH_DISABLED: 'true' });
    expect(issuePaths(result)).not.toContain('AUTH_DISABLED');
  });

  it('AUTH_DISABLED=true em staging gera issue explícita', () => {
    const result = envSchema.safeParse({ NODE_ENV: 'staging', AUTH_DISABLED: 'true' });
    expect(issuePaths(result)).toContain('AUTH_DISABLED');
  });

  it('AUTH_DISABLED=true em production gera issue explícita', () => {
    const result = envSchema.safeParse({ NODE_ENV: 'production', AUTH_DISABLED: 'true' });
    expect(issuePaths(result)).toContain('AUTH_DISABLED');
  });

  it('AUTH_DISABLED ausente/false nunca gera issue, em nenhum ambiente', () => {
    for (const NODE_ENV of ['development', 'staging', 'production'] as const) {
      expect(issuePaths(envSchema.safeParse({ NODE_ENV }))).not.toContain('AUTH_DISABLED');
      expect(issuePaths(envSchema.safeParse({ NODE_ENV, AUTH_DISABLED: 'false' }))).not.toContain('AUTH_DISABLED');
    }
  });

  it('USE_MOCK/MOCK_MODE seguem a mesma regra que AUTH_DISABLED', () => {
    const staging = envSchema.safeParse({ NODE_ENV: 'staging', USE_MOCK: 'true', MOCK_MODE: 'true' });
    const paths = issuePaths(staging);
    expect(paths).toContain('USE_MOCK');
    expect(paths).toContain('MOCK_MODE');
  });
});
