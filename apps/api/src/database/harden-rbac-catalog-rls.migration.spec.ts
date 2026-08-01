import { HardenRbacCatalogRls20260731000001 } from './migrations/20260731000001_HardenRbacCatalogRls';

const MUSICOS_APP_TABLES = [
  'permissions',
  'role_permissions',
  'permission_dependencies',
  'permission_conflicts',
  'role_templates',
  'role_template_permissions',
];

const LOCKED_TABLES = ['permission_groups', 'permission_aliases'];

describe('HardenRbacCatalogRls20260731000001', () => {
  it('enables fail-closed RLS on all 8 RBAC catalog tables and revokes anon/authenticated', async () => {
    const qr = { query: jest.fn(async (_sql: string) => undefined) };

    await new HardenRbacCatalogRls20260731000001().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    for (const table of [...MUSICOS_APP_TABLES, ...LOCKED_TABLES]) {
      expect(sql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      expect(sql).toContain(`REVOKE ALL ON TABLE "${table}" FROM anon`);
      expect(sql).toContain(`REVOKE ALL ON TABLE "${table}" FROM authenticated`);
    }
  });

  it('grants musicos_app a policy only on the tables it actually has GRANTs on', async () => {
    const qr = { query: jest.fn(async (_sql: string) => undefined) };

    await new HardenRbacCatalogRls20260731000001().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    for (const table of MUSICOS_APP_TABLES) {
      expect(sql).toContain(
        `CREATE POLICY "musicos_app_access" ON "${table}"`,
      );
    }

    // The two catalog tables with zero existing musicos_app GRANTs must stay
    // owner-only — no policy should reference them at all, matching current
    // reality (nothing but the table owner can already touch them).
    for (const table of LOCKED_TABLES) {
      expect(sql).not.toContain(`ON "${table}"\n                     FOR ALL TO musicos_app`);
      expect(sql).not.toMatch(
        new RegExp(`CREATE POLICY[^;]*ON "${table}"[^;]*TO musicos_app`),
      );
    }
  });

  it('never grants anon or authenticated a policy on any of the 8 tables', async () => {
    const qr = { query: jest.fn(async (_sql: string) => undefined) };

    await new HardenRbacCatalogRls20260731000001().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    const policyBlocks = sql.match(/CREATE POLICY[\s\S]*?USING[\s\S]*?;/g) ?? [];
    expect(policyBlocks.length).toBeGreaterThan(0);
    for (const block of policyBlocks) {
      expect(block).not.toContain('TO anon');
      expect(block).not.toContain('TO authenticated');
      expect(block).not.toContain('TO PUBLIC');
    }
  });

  it('down() drops the musicos_app policies and disables RLS on all 8 tables', async () => {
    const qr = { query: jest.fn(async (_sql: string) => undefined) };

    await new HardenRbacCatalogRls20260731000001().down(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    for (const table of MUSICOS_APP_TABLES) {
      expect(sql).toContain(`DROP POLICY IF EXISTS "musicos_app_access" ON "${table}"`);
    }
    for (const table of [...MUSICOS_APP_TABLES, ...LOCKED_TABLES]) {
      expect(sql).toContain(`ALTER TABLE "${table}" NO FORCE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
  });
});
