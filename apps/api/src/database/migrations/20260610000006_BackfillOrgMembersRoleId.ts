import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260610000006_BackfillOrgMembersRoleId  (M6 — FASE 4 RBAC Enterprise)
 *
 * Preenche org_members.role_id a partir de org_members.role (string legada), usando os roles
 * globais seedados em M2 e o mapa legado→canônico (artista→artist, tenant_owner→owner).
 * Valores fora do mapa caem em 'viewer' (fail-safe). NÃO altera org_members.role.
 *
 * Idempotente (só toca role_id IS NULL). Não depende de dado manual. Emite relatório de divergências
 * via RAISE NOTICE. Reversível via down() (zera role_id; a fonte legada `role` permanece intacta).
 */
export class BackfillOrgMembersRoleId20260610000006 implements MigrationInterface {
  name = 'BackfillOrgMembersRoleId20260610000006';

  async up(qr: QueryRunner): Promise<void> {
    // 1) Match direto por slug (inclui linhas-alias 'artista'/'tenant_owner').
    await qr.query(`
      UPDATE "org_members" m
         SET "role_id" = r."id"
        FROM "roles" r
       WHERE r."tenant_id" IS NULL
         AND r."deleted_at" IS NULL
         AND r."slug" = m."role"
         AND m."role_id" IS NULL
    `);

    // 2) Resolve aliases para o role canônico (artista→artist, tenant_owner→owner).
    await qr.query(`
      UPDATE "org_members" m
         SET "role_id" = r."canonical_role_id"
        FROM "roles" r
       WHERE r."id" = m."role_id"
         AND r."canonical_role_id" IS NOT NULL
    `);

    // 3) Fail-safe: roles desconhecidos → viewer.
    await qr.query(`
      UPDATE "org_members" m
         SET "role_id" = v."id"
        FROM "roles" v
       WHERE v."tenant_id" IS NULL AND v."deleted_at" IS NULL AND v."slug" = 'viewer'
         AND m."role_id" IS NULL
    `);

    // 4) Relatório de divergências (roles legados sem correspondência canônica).
    await qr.query(`
      DO $$
      DECLARE divergentes INTEGER;
      BEGIN
        SELECT COUNT(*) INTO divergentes
          FROM "org_members" m
          LEFT JOIN "roles" r
            ON r."tenant_id" IS NULL AND r."deleted_at" IS NULL AND r."slug" = m."role"
         WHERE r."id" IS NULL;
        RAISE NOTICE '[M6] Membros com role legado fora do mapa canonico (resolvidos para viewer): %', divergentes;
      END $$
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    // A fonte de verdade legada é org_members.role; zerar role_id é seguro e reversível.
    await qr.query(`UPDATE "org_members" SET "role_id" = NULL`);
  }
}
