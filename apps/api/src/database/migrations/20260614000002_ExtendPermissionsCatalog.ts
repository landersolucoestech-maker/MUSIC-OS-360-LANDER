import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260614000002_ExtendPermissionsCatalog  (PASSO 1 / Migration 002 — RBAC Enterprise)
 *
 * Estende o catálogo GLOBAL `permissions` (criado em 20260610000001) com os campos
 * de governança/grupo previstos na Modelagem Física Definitiva.
 *
 * NÃO-DESTRUTIVA:
 *   - Apenas ADD COLUMN IF NOT EXISTS (nenhuma coluna/constraint existente é alterada).
 *   - O CHECK existente `chk_permissions_key_fmt` (key = resource || ':' || action) é
 *     PRESERVADO intacto — a migração de separador `:`→`.` pertence à etapa de cutover (futura).
 *   - `group_id` entra NULLABLE de propósito: a tabela pode já conter linhas e o vínculo a
 *     `permission_groups` é populado na etapa de backfill (FASE 4). Tornar NOT NULL agora
 *     quebraria linhas existentes — o enforce de obrigatoriedade fica para migração posterior
 *     ao backfill.
 *
 * Idempotente. Reversível via down().
 */
export class ExtendPermissionsCatalog20260614000002 implements MigrationInterface {
  name = 'ExtendPermissionsCatalog20260614000002';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE "permissions"
        ADD COLUMN IF NOT EXISTS "group_id"        UUID,
        ADD COLUMN IF NOT EXISTS "label"           VARCHAR(160),
        ADD COLUMN IF NOT EXISTS "since_version"   INTEGER     NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "deprecated_at"   TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "replaced_by_key" VARCHAR(160),
        ADD COLUMN IF NOT EXISTS "is_assignable"   BOOLEAN     NOT NULL DEFAULT true
    `);

    // FK group_id → permission_groups (RESTRICT: não apagar grupo com permissões).
    // Adicionada idempotentemente (a coluna é nullable, logo segura sobre linhas existentes).
    await qr.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_permissions_group'
        ) THEN
          ALTER TABLE "permissions"
            ADD CONSTRAINT "fk_permissions_group"
            FOREIGN KEY ("group_id") REFERENCES "permission_groups" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_permissions_group_id" ON "permissions" ("group_id")`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS "idx_permissions_group_id"`);
    await qr.query(`ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "fk_permissions_group"`);
    await qr.query(`
      ALTER TABLE "permissions"
        DROP COLUMN IF EXISTS "group_id",
        DROP COLUMN IF EXISTS "label",
        DROP COLUMN IF EXISTS "since_version",
        DROP COLUMN IF EXISTS "deprecated_at",
        DROP COLUMN IF EXISTS "replaced_by_key",
        DROP COLUMN IF EXISTS "is_assignable"
    `);
  }
}
