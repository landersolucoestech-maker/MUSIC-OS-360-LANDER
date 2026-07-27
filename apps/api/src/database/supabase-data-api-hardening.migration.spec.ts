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

    // A migration TEM uma policy legítima com USING (true): migrator_admin_all,
    // em public.musicos360_migrations, escopada exclusivamente ao role
    // musicos_migrator (bookkeeping do próprio TypeORM — sem ela, FORCE RLS
    // bloquearia a migration seguinte de se registrar). Um "not.toMatch"
    // genérico para USING(true) daria falso-negativo aqui; a invariante real
    // de segurança é que USING(true) NUNCA aparece associado a nenhum role
    // que sirva tráfego de aplicação (authenticated/anon/musicos_app/
    // service_role/PUBLIC) — só ao role administrativo do migrator.
    // Extrai cada statement CREATE POLICY inteiro (até o ';' que o fecha) —
    // não "até a próxima CREATE POLICY", que vazaria statements não
    // relacionados (ex.: os GRANT EXECUTE ... TO authenticated do bloco de
    // hardening dos resolvers, que não têm relação com esta policy).
    const trueUsingBlocks = (sql.match(/CREATE POLICY[\s\S]*?;/g) ?? [])
      .filter((block) => /USING\s*\(\s*true\s*\)/i.test(block));

    expect(trueUsingBlocks).toHaveLength(1);
    expect(trueUsingBlocks[0]).toContain('CREATE POLICY migrator_admin_all');
    expect(trueUsingBlocks[0]).toContain('FOR ALL TO musicos_migrator');
    for (const applicationRole of ['authenticated', 'anon', 'musicos_app', 'service_role', 'PUBLIC']) {
      expect(trueUsingBlocks[0]).not.toContain(`TO ${applicationRole}`);
    }
  });
});
