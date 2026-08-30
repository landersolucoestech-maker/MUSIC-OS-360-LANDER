import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enables tenant RLS for the three Chat Interno tables. Tenant isolation is
 * the DB-level backstop; fine-grained per-conversation participant
 * authorization is enforced in the internal-chat service layer (see
 * apps/api/src/modules/internal-chat), matching this codebase's existing
 * convention (no `private_get_user_id()`-style row-owner RLS elsewhere —
 * see musicchat_automation_* / conversations RLS for the same tenant-only
 * pattern).
 *
 * This migration intentionally does not FORCE RLS and does not change
 * columns, constraints, foreign keys, grants, or indexes.
 */
export class RlsPoliciesInternalChat20260828000002 implements MigrationInterface {
  name = 'RlsPoliciesInternalChat20260828000002';

  private static readonly TABLES = [
    'internal_conversations',
    'internal_conversation_participants',
    'internal_messages',
  ] as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of RlsPoliciesInternalChat20260828000002.TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
              FROM pg_policy
             WHERE polname = 'tenant_isolation'
               AND polrelid = 'public.${table}'::regclass
          ) THEN
            CREATE POLICY "tenant_isolation"
              ON "${table}"
              USING (tenant_id = private_get_tenant_id())
              WITH CHECK (tenant_id = private_get_tenant_id());
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of RlsPoliciesInternalChat20260828000002.TABLES) {
      await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation" ON "${table}"`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
  }
}
