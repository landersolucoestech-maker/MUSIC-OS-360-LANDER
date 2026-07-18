import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 13A / M0 — pré-requisitos do domínio financeiro (Fase 12 §14).
 *
 * 1. pgcrypto (idempotente, já presente na cadeia — reafirmado aqui porque o
 *    domínio financeiro depende de gen_random_uuid()).
 * 2. UNIQUE ("tenant_id","id") nas tabelas-alvo de FK COMPOSTA do domínio
 *    financeiro (invariante I6: vínculo cross-tenant impossível no banco, não
 *    apenas na RLS). Constraint aditiva: não altera dados nem comportamento.
 *
 * Dependência externa: nenhuma role de cluster é exigida aqui. A propriedade
 * dos objetos permanece com o executor da migração (sem transferência).
 */
export class FinancialPrereqs20260718000000 implements MigrationInterface {
  name = 'FinancialPrereqs20260718000000';

  private static readonly TARGETS = [
    'projects',
    'artists',
    'phonograms',
    'releases',
    'clients',
    'contracts',
    'events',
  ] as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    for (const table of FinancialPrereqs20260718000000.TARGETS) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ADD CONSTRAINT "uq_${table}_tenant_id_id" UNIQUE ("tenant_id", "id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Ordem inversa; a extensão pgcrypto é compartilhada pela plataforma e NÃO
    // é removida (Fase 13A Etapa 14 — objetos globais não derrubados).
    for (const table of [...FinancialPrereqs20260718000000.TARGETS].reverse()) {
      await queryRunner.query(`
        ALTER TABLE "${table}" DROP CONSTRAINT "uq_${table}_tenant_id_id"
      `);
    }
  }
}
