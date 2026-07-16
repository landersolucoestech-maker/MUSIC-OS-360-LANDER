import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C3 / Fase E1 — expansão (expand-and-contract) de events.data → events.starts_at.
 *
 * Adiciona a coluna canônica futura `starts_at` com a MESMA semântica física da
 * coluna legada `data` (timestamp without time zone, precisão padrão 6), porém
 * nullable nesta fase — o NOT NULL só chega na fase E5, após dual-write (E2) e
 * backfill abortivo (E3). Nenhum dado é copiado aqui e `data` permanece intacta.
 */
export class AddEventsStartsAt20260716000001 implements MigrationInterface {
  name = 'AddEventsStartsAt20260716000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
        ADD COLUMN IF NOT EXISTS "starts_at" timestamp
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_events_tenant_starts_at"
        ON "events" ("tenant_id", "starts_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_events_tenant_starts_at"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "starts_at"`);
  }
}
