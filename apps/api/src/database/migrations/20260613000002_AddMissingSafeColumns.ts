import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona colunas que existem nas entities mas faltam no banco real, de forma
 * ADITIVA e NÃO-DESTRUTIVA (nenhum DROP, nenhuma alteração de coluna existente).
 *
 * - payroll_entries.deleted_at        — soft delete (nullable)
 * - leave_requests.deleted_at         — soft delete (nullable)
 * - leave_requests.documento_url      — nullable
 * - leave_requests.created_by         — nullable
 * - audiovisual_approvals.created_at  — NOT NULL DEFAULT now() (backfill seguro)
 * - audiovisual_approvals.updated_at  — NOT NULL DEFAULT now() (backfill seguro)
 * - audiovisual_approvals.deleted_at  — soft delete (nullable)
 *
 * created_at/updated_at usam DEFAULT now() para que linhas existentes recebam um
 * valor válido no momento do ALTER, sem violar NOT NULL. Tudo idempotente via
 * IF NOT EXISTS.
 */
export class AddMissingSafeColumns20260613000002 implements MigrationInterface {
  name = 'AddMissingSafeColumns20260613000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // payroll_entries
    await queryRunner.query(
      `ALTER TABLE "payroll_entries" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp NULL`,
    );

    // leave_requests
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "documento_url" text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "created_by" varchar(255) NULL`,
    );

    // audiovisual_approvals
    await queryRunner.query(
      `ALTER TABLE "audiovisual_approvals" ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "audiovisual_approvals" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "audiovisual_approvals" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversão somente das colunas adicionadas por esta migration.
    await queryRunner.query(`ALTER TABLE "audiovisual_approvals" DROP COLUMN IF EXISTS "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "audiovisual_approvals" DROP COLUMN IF EXISTS "updated_at"`);
    await queryRunner.query(`ALTER TABLE "audiovisual_approvals" DROP COLUMN IF EXISTS "created_at"`);
    await queryRunner.query(`ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "created_by"`);
    await queryRunner.query(`ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "documento_url"`);
    await queryRunner.query(`ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "payroll_entries" DROP COLUMN IF EXISTS "deleted_at"`);
  }
}
