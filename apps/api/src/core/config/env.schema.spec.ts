import {
  SUPABASE_DEV_REF,
  SUPABASE_MAIN_REF,
  SUPABASE_PROD_REF,
  SUPABASE_STAGING_REF,
  collectSupabaseEnvErrors,
  expectedSupabaseRef,
  extractSupabaseRef,
  forbiddenSupabaseRefs,
} from './env.schema';

function jwtFor(ref: string, role = 'anon'): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256' })}.${b64({ ref, role })}.sig`;
}

const url = (ref: string) => `https://${ref}.supabase.co`;
const pooler = (ref: string) => `postgresql://musicos_migrator.${ref}:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
const direct = (ref: string) => `postgresql://postgres:pw@db.${ref}.supabase.co:5432/postgres`;

describe('env.schema — matriz de isolamento de ambientes Supabase (incidente 2026-07-16/17)', () => {
  describe('expectedSupabaseRef / forbiddenSupabaseRefs', () => {
    it('development → DEV_REF; test → null (nenhum remoto); staging → STAGING_REF; production → PROD_REF', () => {
      expect(expectedSupabaseRef('development')).toBe(SUPABASE_DEV_REF);
      expect(expectedSupabaseRef(undefined)).toBe(SUPABASE_DEV_REF);
      expect(expectedSupabaseRef('test')).toBeNull();
      expect(expectedSupabaseRef('staging')).toBe(SUPABASE_STAGING_REF);
      expect(expectedSupabaseRef('production')).toBe(SUPABASE_PROD_REF);
    });

    it('MAIN_REF nunca é o esperado de nenhum ambiente (main ≠ production)', () => {
      for (const env of ['development', 'test', 'staging', 'production']) {
        expect(expectedSupabaseRef(env)).not.toBe(SUPABASE_MAIN_REF);
        expect(forbiddenSupabaseRefs(env)).toContain(SUPABASE_MAIN_REF);
      }
    });
  });

  describe('collectSupabaseEnvErrors — matriz obrigatória', () => {
    it('development + DEV_REF → passa', () => {
      expect(collectSupabaseEnvErrors({ SUPABASE_URL: url(SUPABASE_DEV_REF), DATABASE_URL: pooler(SUPABASE_DEV_REF) }, 'development')).toEqual([]);
    });

    it('development + MAIN_REF → falha (denylist cruzada)', () => {
      const errors = collectSupabaseEnvErrors({ DATABASE_URL: pooler(SUPABASE_MAIN_REF) }, 'development');
      expect(errors.some((e) => e.includes('OUTRO ambiente') && e.includes(SUPABASE_MAIN_REF))).toBe(true);
    });

    it('development + PROD_REF → falha', () => {
      const errors = collectSupabaseEnvErrors({ SUPABASE_URL: url(SUPABASE_PROD_REF) }, 'development');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('development + STAGING_REF → falha', () => {
      const errors = collectSupabaseEnvErrors({ SUPABASE_URL: url(SUPABASE_STAGING_REF) }, 'development');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('production + PROD_REF → passa (com variáveis obrigatórias presentes)', () => {
      const errors = collectSupabaseEnvErrors({
        SUPABASE_URL: url(SUPABASE_PROD_REF),
        DATABASE_URL: pooler(SUPABASE_PROD_REF),
        SUPABASE_ANON_KEY: jwtFor(SUPABASE_PROD_REF, 'anon'),
      }, 'production');
      expect(errors).toEqual([]);
    });

    it('production + MAIN_REF → falha (main não é sinônimo de production)', () => {
      const errors = collectSupabaseEnvErrors({
        SUPABASE_URL: url(SUPABASE_MAIN_REF),
        DATABASE_URL: pooler(SUPABASE_MAIN_REF),
        SUPABASE_ANON_KEY: jwtFor(SUPABASE_MAIN_REF, 'anon'),
      }, 'production');
      expect(errors.some((e) => e.includes('OUTRO ambiente'))).toBe(true);
    });

    it('production + DEV_REF → falha', () => {
      const errors = collectSupabaseEnvErrors({ SUPABASE_URL: url(SUPABASE_DEV_REF) }, 'production');
      expect(errors.some((e) => e.includes('OUTRO ambiente'))).toBe(true);
    });

    it('staging + STAGING_REF → passa', () => {
      const errors = collectSupabaseEnvErrors({
        SUPABASE_URL: url(SUPABASE_STAGING_REF),
        DATABASE_URL: pooler(SUPABASE_STAGING_REF),
        SUPABASE_ANON_KEY: jwtFor(SUPABASE_STAGING_REF, 'anon'),
      }, 'staging');
      expect(errors).toEqual([]);
    });

    it('staging + DEV_REF → falha', () => {
      const errors = collectSupabaseEnvErrors({ SUPABASE_URL: url(SUPABASE_DEV_REF) }, 'staging');
      expect(errors.some((e) => e.includes('OUTRO ambiente'))).toBe(true);
    });

    it('test + qualquer ref remoto → falha (sem fallback silencioso)', () => {
      const errors = collectSupabaseEnvErrors({ DATABASE_URL: pooler(SUPABASE_DEV_REF) }, 'test');
      expect(errors.some((e) => e.includes('não aceita nenhum projeto Supabase remoto') || e.includes('OUTRO ambiente'))).toBe(true);
    });

    it('test + Postgres local (não-Supabase) → passa', () => {
      expect(collectSupabaseEnvErrors({ DATABASE_URL: 'postgresql://postgres:pw@localhost:5432/test' }, 'test')).toEqual([]);
    });

    it('SUPABASE_URL e DATABASE_URL com refs diferentes → falha por divergência', () => {
      const errors = collectSupabaseEnvErrors({
        SUPABASE_URL: url(SUPABASE_DEV_REF),
        DATABASE_URL: pooler(SUPABASE_STAGING_REF),
      }, 'development');
      expect(errors.some((e) => e.includes('divergentes'))).toBe(true);
    });

    it('URL e JWT com refs diferentes → falha', () => {
      const errors = collectSupabaseEnvErrors({
        SUPABASE_URL: url(SUPABASE_DEV_REF),
        SUPABASE_ANON_KEY: jwtFor(SUPABASE_MAIN_REF, 'anon'),
      }, 'development');
      expect(errors.some((e) => e.includes('SUPABASE_ANON_KEY') && e.includes('OUTRO ambiente'))).toBe(true);
    });

    it('variável obrigatória ausente em production → falha', () => {
      const errors = collectSupabaseEnvErrors({}, 'production');
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining('DATABASE_URL e obrigatorio'),
        expect.stringContaining('SUPABASE_URL e obrigatorio'),
        expect.stringContaining('SUPABASE_ANON_KEY e obrigatorio'),
      ]));
    });

    it('ref desconhecido (fora dos KNOWN_REFS) → falha em qualquer ambiente', () => {
      const stranger = 'aaaabbbbccccddddeeee';
      for (const env of ['development', 'staging', 'production']) {
        const errors = collectSupabaseEnvErrors({ SUPABASE_URL: url(stranger) }, env);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('denylist absoluta (branch preview banido) prevalece em qualquer ambiente', () => {
      const errors = collectSupabaseEnvErrors({ SUPABASE_URL: url('mkyvkciwyhfawmvluugb') }, 'development');
      expect(errors.some((e) => e.includes('banido'))).toBe(true);
    });

    it('hostname Supabase malformado (ref não extraível) → falha', () => {
      const errors = collectSupabaseEnvErrors({ SUPABASE_URL: 'https://.supabase.co' }, 'development');
      expect(errors.some((e) => e.includes('malformado'))).toBe(true);
    });

    it('ref extraído do pooler é validado (denylist cruzada via connection string)', () => {
      const errors = collectSupabaseEnvErrors({ DATABASE_URL: pooler(SUPABASE_PROD_REF) }, 'development');
      expect(errors.some((e) => e.includes('DATABASE_URL') && e.includes('OUTRO ambiente'))).toBe(true);
    });

    it('ref extraído da URL direta (db.<ref>) é validado, incluindo DIRECT_DATABASE_URL', () => {
      const errors = collectSupabaseEnvErrors({ DIRECT_DATABASE_URL: direct(SUPABASE_MAIN_REF) }, 'development');
      expect(errors.some((e) => e.includes('DIRECT_DATABASE_URL') && e.includes('OUTRO ambiente'))).toBe(true);
    });

    it('JWT com role invertida (service_role em ANON_KEY) → falha', () => {
      const errors = collectSupabaseEnvErrors({
        SUPABASE_URL: url(SUPABASE_DEV_REF),
        SUPABASE_ANON_KEY: jwtFor(SUPABASE_DEV_REF, 'service_role'),
      }, 'development');
      expect(errors.some((e) => e.includes('chaves invertidas'))).toBe(true);
    });
  });

  describe('extractSupabaseRef — formatos suportados', () => {
    it('extrai de URL https, host direto db.<ref> e usuário do pooler', () => {
      expect(extractSupabaseRef(url(SUPABASE_DEV_REF))).toBe(SUPABASE_DEV_REF);
      expect(extractSupabaseRef(direct(SUPABASE_DEV_REF))).toBe(SUPABASE_DEV_REF);
      expect(extractSupabaseRef(pooler(SUPABASE_DEV_REF))).toBe(SUPABASE_DEV_REF);
      expect(extractSupabaseRef('postgresql://postgres:pw@localhost:5432/x')).toBeNull();
    });
  });
});
