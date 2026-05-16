import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20240602000001_DomainEventLog
 *
 * Cria a tabela `domain_event_log` para persistência append-only de todos
 * os domain events emitidos pelo sistema MUSIC OS 360.
 *
 * Campos:
 *   - aggregate_type / aggregate_id — rastreabilidade por entidade de domínio
 *   - processed_at   — timestamp do processamento pelo handler (null = pendente)
 *   - error          — mensagem de erro se o handler falhou
 *
 * A tabela é append-only: sem soft-delete, sem updates (excepto processed_at/error).
 * Rollback: down() dropa tabela e índices.
 */
export class DomainEventLog20240602000001 implements MigrationInterface {
  name = 'DomainEventLog20240602000001';

  async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "domain_event_log" (
        "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"      UUID,
        "event_type"     VARCHAR(100) NOT NULL,
        "aggregate_type" VARCHAR(100),
        "aggregate_id"   VARCHAR(255),
        "actor_id"       VARCHAR(255),
        "correlation_id" VARCHAR(255),
        "payload"        JSONB        NOT NULL DEFAULT '{}',
        "occurred_at"    TIMESTAMP    NOT NULL DEFAULT NOW(),
        "processed_at"   TIMESTAMP,
        "error"          TEXT,
        "created_at"     TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_del_tenant_id"
        ON "domain_event_log" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_del_tenant_event_type"
        ON "domain_event_log" ("tenant_id", "event_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_del_correlation_id"
        ON "domain_event_log" ("correlation_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_del_occurred_at"
        ON "domain_event_log" ("occurred_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_del_aggregate"
        ON "domain_event_log" ("aggregate_type", "aggregate_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_del_aggregate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_del_occurred_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_del_correlation_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_del_tenant_event_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_del_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "domain_event_log"`);
  }
}
