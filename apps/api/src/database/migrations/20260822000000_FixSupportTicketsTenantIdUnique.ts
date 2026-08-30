import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260822000000_FixSupportTicketsTenantIdUnique
 *
 * Bug de migration descoberto ao verificar REM-02 (Remaining Product
 * Completion Backlog): `CreateSupportTicketMessages20260822000001` cria uma
 * FK composta `(tenant_id, ticket_id) REFERENCES support_tickets
 * (tenant_id, id)`, mas `support_tickets` (20240101000000_InitialSchema)
 * nunca recebeu o `UNIQUE (tenant_id, id)` que outras tabelas do CRM
 * (clients, artists, contracts, ...) já têm via as migrations
 * `RebuildXInCanonicalFormOrder` de 2026-07-19 — Postgres rejeita a FK sem
 * esse índice único no lado referenciado.
 *
 * Correção mínima e aditiva: apenas ADD CONSTRAINT UNIQUE (id já é PK, logo
 * o par (tenant_id, id) já é necessariamente único — nenhum dado existente
 * pode violar isto). Não é um rebuild de canonical form order (fora de
 * escopo aqui) — apenas o suficiente para satisfazer a FK seguinte.
 * Precisa rodar antes de CreateSupportTicketMessages20260822000001.
 */
export class FixSupportTicketsTenantIdUnique20260822000000 implements MigrationInterface {
  name = 'FixSupportTicketsTenantIdUnique20260822000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "support_tickets"
      ADD CONSTRAINT "uq_support_tickets_tenant_id_id" UNIQUE ("tenant_id", "id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "uq_support_tickets_tenant_id_id"`);
  }
}
