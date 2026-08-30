import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260822000002_CreateSupportRequests
 *
 * Product-completion audit (GAP-05c): SupportRequests.tsx is a fully-built
 * feature-request/voting board (create, list, filter, sort, upvote), but
 * useRequests() has no real backend — every mutation just showed an error
 * toast. The frontend already tracks "voted" state client-side-only (resets
 * on reload, not persisted anywhere) — so the specified mechanism is a plain
 * atomic vote counter, not a per-user vote-uniqueness table.
 *
 * Follows the same RLS/grants pattern as 20260803000001_CreateClientAttachments.
 */
export class CreateSupportRequests20260822000002 implements MigrationInterface {
  name = 'CreateSupportRequests20260822000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE support_requests (
        id           uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id    uuid NOT NULL,
        type         varchar(20) NOT NULL,
        title        varchar(500) NOT NULL,
        description  text NOT NULL DEFAULT '',
        status       varchar(20) NOT NULL DEFAULT 'pending',
        priority     varchar(20) NOT NULL DEFAULT 'medium',
        votes        integer NOT NULL DEFAULT 0,
        created_by   varchar(255),
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now(),
        deleted_at   timestamp,
        CONSTRAINT support_requests_pkey PRIMARY KEY (id),
        CONSTRAINT support_requests_type_check
          CHECK (type IN ('feature', 'bug', 'question', 'billing', 'integration')),
        CONSTRAINT support_requests_status_check
          CHECK (status IN ('pending', 'in_review', 'approved', 'done', 'rejected'))
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_support_requests_tenant_id ON support_requests (tenant_id) WHERE (deleted_at IS NULL)`);

    await queryRunner.query(`ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE support_requests FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON support_requests
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON support_requests
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);

    await queryRunner.query(`ALTER TABLE support_requests OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON support_requests TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON support_requests TO musicos_app`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS support_requests`);
  }
}
