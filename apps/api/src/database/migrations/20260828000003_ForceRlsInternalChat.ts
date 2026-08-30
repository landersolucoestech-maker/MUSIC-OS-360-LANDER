import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends ForceRLSOperationalTables20260620000005's fail-closed RLS posture to
 * the Chat Interno tables (added after that migration, so not covered by it).
 *
 * These tables already have RLS ENABLED with a tenant_isolation policy (see
 * RlsPoliciesInternalChat20260828000002), but were missing FORCE ROW LEVEL
 * SECURITY, so the table-owner/admin connection (DATABASE_URL) could read/write
 * tenant data without a resolved tenant context. Adding FORCE makes the owner
 * role fail-closed — superusers still bypass RLS by PostgreSQL design, and the
 * NOBYPASSRLS application role (APP_DATABASE_URL) is unaffected because RLS
 * already applies to it.
 *
 * Idempotent: guarded by to_regclass; FORCE is a no-op if already set.
 */
export class ForceRlsInternalChat20260828000003 implements MigrationInterface {
  name = 'ForceRlsInternalChat20260828000003';

  private readonly TABLES = [
    'internal_conversations',
    'internal_conversation_participants',
    'internal_messages',
  ] as const;

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            EXECUTE 'ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY';
            EXECUTE 'ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY';
          END IF;
        END $$;
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            EXECUTE 'ALTER TABLE public.${table} NO FORCE ROW LEVEL SECURITY';
          END IF;
        END $$;
      `);
    }
  }
}
