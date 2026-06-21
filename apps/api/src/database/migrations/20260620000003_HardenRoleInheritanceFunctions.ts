import type { MigrationInterface, QueryRunner } from 'typeorm';

const FUNCTIONS = [
  'bump_role_inheritance_version',
  'guard_role_inheritance_global_delete',
  'validate_role_inheritance',
] as const;

export class HardenRoleInheritanceFunctions20260620000003
  implements MigrationInterface
{
  name = 'HardenRoleInheritanceFunctions20260620000003';

  async up(qr: QueryRunner): Promise<void> {
    for (const functionName of FUNCTIONS) {
      await qr.query(`
        ALTER FUNCTION public.${functionName}()
          SET search_path = pg_catalog
      `);
      await qr.query(`
        REVOKE ALL ON FUNCTION public.${functionName}() FROM PUBLIC
      `);
    }
  }

  async down(qr: QueryRunner): Promise<void> {
    for (const functionName of FUNCTIONS) {
      await qr.query(`
        ALTER FUNCTION public.${functionName}()
          SET search_path = public, pg_catalog
      `);
      await qr.query(`
        GRANT EXECUTE ON FUNCTION public.${functionName}() TO PUBLIC
      `);
    }
  }
}
