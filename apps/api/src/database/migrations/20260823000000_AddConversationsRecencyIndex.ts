import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260823000000_AddConversationsRecencyIndex
 *
 * MusicChat remediation wave (2026-08-23): ConversationsService.listConversations()
 * always orders by `last_message_at DESC` (the inbox's primary sort — most recent
 * conversation first), but the only index on `conversations` covering the query's WHERE
 * clause is `idx_conversations_tenant_status (tenant_id, status) WHERE deleted_at IS NULL`
 * — it doesn't help the ORDER BY. Adds a covering index for the actual access pattern.
 *
 * Additive/safe: a new index only, no column/constraint change, no data migration.
 */
export class AddConversationsRecencyIndex20260823000000 implements MigrationInterface {
  name = 'AddConversationsRecencyIndex20260823000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX idx_conversations_tenant_recency
        ON conversations (tenant_id, last_message_at DESC)
        WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_conversations_tenant_recency`);
  }
}
