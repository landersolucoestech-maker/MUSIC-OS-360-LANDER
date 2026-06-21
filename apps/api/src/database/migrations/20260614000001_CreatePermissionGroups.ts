import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260614000001_CreatePermissionGroups  (PASSO 1 / Migration 001 — RBAC Enterprise)
 *
 * Catálogo GLOBAL de grupos de permissões (domínio para UX + governança).
 * - Sem tenant_id (capacidade de plataforma, não dado de tenant) → sem RLS.
 * - Sem soft delete (catálogo gerido por migrations/seeds).
 * - Aditiva e não-destrutiva. Idempotente. Reversível via down().
 *
 * Escopo PASSO 1: apenas a estrutura. O seed dos grupos pertence à etapa de backfill (FASE 4).
 */
export class CreatePermissionGroups20260614000001 implements MigrationInterface {
  name = 'CreatePermissionGroups20260614000001';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "permission_groups" (
        "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "key"        VARCHAR(64)  NOT NULL,
        "domain"     VARCHAR(64)  NOT NULL,
        "label"      VARCHAR(160) NOT NULL,
        "sort_order" INTEGER      NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "uq_permission_groups_key" UNIQUE ("key"),
        CONSTRAINT "chk_permission_groups_key_fmt" CHECK ("key" ~ '^[a-z][a-z0-9_]*$')
      )
    `);
    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_permission_groups_domain" ON "permission_groups" ("domain")`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "permission_groups"`);
  }
}
