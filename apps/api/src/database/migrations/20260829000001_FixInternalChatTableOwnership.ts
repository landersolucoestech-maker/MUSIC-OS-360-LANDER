import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateInternalChat20260828000001 omitted the OWNER TO / GRANT statements that every
 * sibling table-creation migration in this project includes (see CreateSupportRequests,
 * CreateSupportTicketMessages, CreateClientAttachments). Migrations run as the Postgres
 * superuser `postgres` (see FixDefaultPrivilegesCreatorRole20260803000002), so the three
 * internal chat tables are currently owned by `postgres`. A table's owner — when that
 * owner is a superuser — always bypasses RLS regardless of FORCE ROW LEVEL SECURITY, by
 * PostgreSQL design. That makes ForceRlsInternalChat20260828000003 a no-op against the
 * privileged/admin connection unless ownership is transferred to the non-superuser
 * `musicos_migrator` role first. This migration closes that gap; it must be applied
 * before (or together with) ForceRlsInternalChat20260828000003 for that migration's
 * stated purpose to actually hold.
 *
 * Idempotent: ALTER TABLE ... OWNER TO and GRANT are no-ops when already set/granted.
 */
export class FixInternalChatTableOwnership20260829000001 implements MigrationInterface {
  name = 'FixInternalChatTableOwnership20260829000001';

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
            EXECUTE 'ALTER TABLE public.${table} OWNER TO musicos_migrator';
            EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.${table} TO musicos_migrator';
            EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.${table} TO musicos_app';
          END IF;
        END $$;
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [{ current_user: creatorRole }] = await queryRunner.query(`SELECT current_user`);
    for (const table of this.TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            EXECUTE 'REVOKE SELECT, INSERT, UPDATE, DELETE ON public.${table} FROM musicos_app';
            EXECUTE 'ALTER TABLE public.${table} OWNER TO "${creatorRole}"';
          END IF;
        END $$;
      `);
    }
  }
}
