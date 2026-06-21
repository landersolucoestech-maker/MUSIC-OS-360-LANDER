import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260614000003_CreatePermissionAliases  (PASSO 1 / Migration 003 — RBAC Enterprise)
 *
 * Mapa GLOBAL de aliases de chave de permissão (vocabulário legado → novo), usado no backfill
 * e na compatibilidade durante o cutover (ex.: `accounting:read` → `billing.read`).
 * - Sem tenant_id (catálogo de plataforma) → sem RLS.
 * - `legacy_key` único (lookup determinístico no backfill).
 * - Aditiva e não-destrutiva. Idempotente. Reversível via down().
 *
 * Escopo PASSO 1: apenas a estrutura. O seed dos aliases pertence à etapa de backfill (FASE 4).
 */
export class CreatePermissionAliases20260614000003 implements MigrationInterface {
  name = 'CreatePermissionAliases20260614000003';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "permission_aliases" (
        "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "legacy_key" VARCHAR(160) NOT NULL,
        "new_key"    VARCHAR(160) NOT NULL,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "uq_permission_aliases_legacy_key" UNIQUE ("legacy_key"),
        CONSTRAINT "chk_permission_aliases_distinct"  CHECK ("legacy_key" <> "new_key")
      )
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "permission_aliases"`);
  }
}
