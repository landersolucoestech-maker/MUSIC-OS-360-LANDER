import { HardenSupabaseDataApiSurface20260620000006 } from './migrations/20260620000006_HardenSupabaseDataApiSurface';

describe('HardenSupabaseDataApiSurface20260620000006', () => {
  it('removes anonymous grants and protects artist platform profiles by tenant', async () => {
    const qr = { query: jest.fn(async (_sql: string) => undefined) };

    await new HardenSupabaseDataApiSurface20260620000006().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon');
    expect(sql).toContain('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon');
    expect(sql).toContain(
      'ALTER TABLE public.artist_platform_profiles FORCE ROW LEVEL SECURITY',
    );
    expect(sql).toContain('artist_platform_profiles_select_tenant');
    expect(sql).toContain('artist_platform_profiles_insert_tenant');
    expect(sql).toContain('artist_platform_profiles_update_tenant');
    expect(sql).toContain('artist_platform_profiles_delete_tenant');
    expect(sql).toContain(
      'tenant_id = (SELECT public.private_get_tenant_id())',
    );
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.private_get_tenant_id() FROM PUBLIC, anon',
    );
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });
});
