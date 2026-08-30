import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260822000001_CreateSupportTicketMessages
 *
 * Product-completion audit (GAP-04): SupportTicketDetail.tsx has a full reply
 * composer wired to useTicketMessages(), but no backend messages sub-resource
 * ever existed — addMessage() only showed an error toast. This adds the real
 * table backing it, matching the frontend's already-specified `SupportMessage`
 * contract (apps/web/src/modules/support/types/index.ts) exactly.
 *
 * Follows the same RLS/grants pattern as 20260803000001_CreateClientAttachments
 * (FORCE RLS, tenant_isolation + super_admin_full_access, OWNER musicos_migrator).
 */
export class CreateSupportTicketMessages20260822000001 implements MigrationInterface {
  name = 'CreateSupportTicketMessages20260822000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE support_ticket_messages (
        id             uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id      uuid NOT NULL,
        ticket_id      uuid NOT NULL,
        sender_id      varchar(255) NOT NULL,
        sender_name    varchar(255) NOT NULL,
        sender_role    varchar(20) NOT NULL DEFAULT 'support',
        message        text NOT NULL,
        internal_note  boolean NOT NULL DEFAULT false,
        created_at     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id),
        CONSTRAINT fk_support_ticket_messages_ticket
          FOREIGN KEY (tenant_id, ticket_id) REFERENCES support_tickets (tenant_id, id),
        CONSTRAINT support_ticket_messages_sender_role_check
          CHECK (sender_role IN ('user', 'support', 'admin'))
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_support_ticket_messages_tenant_id ON support_ticket_messages (tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_support_ticket_messages_ticket_id ON support_ticket_messages (tenant_id, ticket_id)`);

    await queryRunner.query(`ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE support_ticket_messages FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON support_ticket_messages
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON support_ticket_messages
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);

    await queryRunner.query(`ALTER TABLE support_ticket_messages OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON support_ticket_messages TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON support_ticket_messages TO musicos_app`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS support_ticket_messages`);
  }
}
