import { HardenContactsLeadUploadsRls20260620000002 } from './migrations/20260620000002_HardenContactsLeadUploadsRls';

const TABLES = [
  'contacts',
  'contact_attachments',
  'contact_contracts',
  'contact_timeline',
  'lead_uploads',
];

describe('HardenContactsLeadUploadsRls20260620000002', () => {
  function queryRunner() {
    return { query: jest.fn(async (_sql: string) => undefined) };
  }

  it('habilita e força RLS com policies mínimas por operação', async () => {
    const qr = queryRunner();
    await new HardenContactsLeadUploadsRls20260620000002().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    for (const table of TABLES) {
      expect(sql).toContain(
        `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`,
      );
      expect(sql).toContain(
        `ALTER TABLE public."${table}" FORCE ROW LEVEL SECURITY`,
      );
      expect(sql).toContain(`CREATE POLICY "${table}_tenant_select"`);
      expect(sql).toContain(`CREATE POLICY "${table}_tenant_insert"`);
      expect(sql).toContain(`CREATE POLICY "${table}_tenant_update"`);
      expect(sql).toContain(`CREATE POLICY "${table}_tenant_delete"`);
    }

    expect(sql.match(/CREATE POLICY ".+_tenant_(select|insert|update|delete)"/g)).toHaveLength(20);
    expect(sql).toContain(
      '"tenant_id" = (SELECT public.app_current_tenant_id())',
    );
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)|WITH CHECK\s*\(\s*true\s*\)/i);
  });

  it('restringe ACLs e endurece os resolvers SECURITY DEFINER', async () => {
    const qr = queryRunner();
    await new HardenContactsLeadUploadsRls20260620000002().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.app_current_tenant_id() FROM PUBLIC',
    );
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.private_get_tenant_id() FROM PUBLIC',
    );
    expect(sql.match(/SET search_path = pg_catalog/g)).toHaveLength(2);
    expect(sql).toContain('public.app_jwt()');
    expect(sql).toContain('SELECT public.app_current_tenant_id()');

    for (const table of TABLES) {
      expect(sql).toContain(
        `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM PUBLIC`,
      );
      expect(sql).toContain(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${table}" TO authenticated`,
      );
    }
  });

  it('impede vínculos entre pais e filhos de tenants diferentes', async () => {
    const qr = queryRunner();
    await new HardenContactsLeadUploadsRls20260620000002().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).toContain('fk_contact_attachments_contact_tenant');
    expect(sql).toContain('fk_contact_contracts_contact_tenant');
    expect(sql).toContain('fk_contact_contracts_contract_tenant');
    expect(sql).toContain('fk_contact_timeline_contact_tenant');
    expect(sql).toContain('fk_lead_uploads_lead_tenant');
    expect(sql.match(/VALIDATE CONSTRAINT "fk_/g)).toHaveLength(5);
  });

  it('revoga exposição direta das partições de decisão RBAC', async () => {
    const qr = queryRunner();
    await new HardenContactsLeadUploadsRls20260620000002().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    for (const relation of [
      'rbac_decision_logs',
      'rbac_decision_logs_2026_05',
      'rbac_decision_logs_2026_06',
      'rbac_decision_logs_2026_07',
      'rbac_decision_logs_2026_08',
      'rbac_decision_logs_default',
    ]) {
      expect(sql).toContain(`to_regclass('public.${relation}')`);
      expect(sql).toContain(
        `REVOKE ALL PRIVILEGES ON TABLE public."${relation}" FROM authenticated`,
      );
    }
  });

  it('remove policies, FORCE RLS e constraints no rollback', async () => {
    const qr = queryRunner();
    await new HardenContactsLeadUploadsRls20260620000002().down(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    for (const table of TABLES) {
      expect(sql).toContain(
        `DROP POLICY IF EXISTS "${table}_tenant_select" ON public."${table}"`,
      );
      expect(sql).toContain(
        `ALTER TABLE public."${table}" NO FORCE ROW LEVEL SECURITY`,
      );
      expect(sql).toContain(
        `ALTER TABLE public."${table}" DISABLE ROW LEVEL SECURITY`,
      );
    }
    expect(sql).toContain(
      'DROP CONSTRAINT IF EXISTS "fk_lead_uploads_lead_tenant"',
    );
  });
});
