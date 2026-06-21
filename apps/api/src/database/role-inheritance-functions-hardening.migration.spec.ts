import { HardenRoleInheritanceFunctions20260620000003 } from './migrations/20260620000003_HardenRoleInheritanceFunctions';

const FUNCTIONS = [
  'bump_role_inheritance_version',
  'guard_role_inheritance_global_delete',
  'validate_role_inheritance',
];

describe('HardenRoleInheritanceFunctions20260620000003', () => {
  function queryRunner() {
    return { query: jest.fn(async (_sql: string) => undefined) };
  }

  it('uses a trusted search_path and removes PUBLIC execute', async () => {
    const qr = queryRunner();
    await new HardenRoleInheritanceFunctions20260620000003().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    for (const functionName of FUNCTIONS) {
      expect(sql).toContain(
        `ALTER FUNCTION public.${functionName}()\n          SET search_path = pg_catalog`,
      );
      expect(sql).toContain(
        `REVOKE ALL ON FUNCTION public.${functionName}() FROM PUBLIC`,
      );
    }
  });
});
