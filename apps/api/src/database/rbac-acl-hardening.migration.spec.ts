import { HardenRbacAclDefaults20260613000017 } from './migrations/20260613000017_HardenRbacAclDefaults';

describe('HardenRbacAclDefaults20260613000017', () => {
  it('applies least privilege without changing RBAC schema or RLS', async () => {
    const query = jest.fn(async (_sql: string) => undefined);

    await new HardenRbacAclDefaults20260613000017().up({ query } as never);

    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).toContain('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC');
    expect(sql).toContain("'anon', 'authenticated'");
    expect(sql).toContain('GRANT SELECT ON TABLE public.permissions TO musicos_app');
    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE\n              ON TABLE public.roles TO musicos_app',
    );
    expect(sql).toContain(
      'GRANT SELECT, INSERT, DELETE\n              ON TABLE public.role_permissions TO musicos_app',
    );
    expect(sql).toContain('REVOKE ALL PRIVILEGES ON TABLES FROM %I');
    expect(sql).toContain('REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I');
    expect(sql).not.toMatch(/CREATE TABLE|ALTER TABLE|DROP TABLE|CREATE POLICY|DROP POLICY/i);
  });

  it('restores only the audited legacy ACL baseline on rollback', async () => {
    const query = jest.fn(async (_sql: string) => undefined);

    await new HardenRbacAclDefaults20260613000017().down({ query } as never);

    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE');
    expect(sql).toContain('GRANT SELECT, USAGE ON SEQUENCES');
    expect(sql).not.toMatch(/CREATE TABLE|ALTER TABLE|DROP TABLE|CREATE POLICY|DROP POLICY/i);
  });
});
