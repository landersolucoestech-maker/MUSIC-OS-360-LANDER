import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 13A / M6 — orçamento por projeto (Fase 12 §2.8–2.9; Fase 11 §17).
 *
 * - UM orçamento vigente por projeto (unique parcial is_active + não deletado);
 * - realizado/comprometido/saldo NUNCA persistidos (derivados das transações);
 * - revisão NUNCA sobrescreve silenciosamente: budget_revisions é APPEND-ONLY
 *   (trigger bloqueia UPDATE/DELETE) com valor anterior, novo e motivo;
 * - moeda com CHECK ISO-4217; BRL operacional (Q5);
 * - linhas por categoria/períodos/versões formais: onda 2 (NÃO criadas aqui).
 */
export class FinancialBudgets20260718000006 implements MigrationInterface {
  name = 'FinancialBudgets20260718000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "budgets" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"  uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "amount"     numeric(15,2) NOT NULL CHECK ("amount" >= 0),
        "currency"   char(3) NOT NULL DEFAULT 'BRL' CHECK ("currency" ~ '^[A-Z]{3}$'),
        "notes"      text NULL,
        "is_active"  boolean NOT NULL DEFAULT true,
        "version"    integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "deleted_at" timestamptz NULL,
        CONSTRAINT "uq_budgets_tenant_id_id" UNIQUE ("tenant_id", "id"),
        CONSTRAINT "fk_budgets_project"
          FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects" ("tenant_id", "id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_budgets_active_per_project"
        ON "budgets" ("tenant_id", "project_id")
        WHERE "is_active" AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "budget_revisions" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"       uuid NOT NULL,
        "budget_id"       uuid NOT NULL,
        "previous_amount" numeric(15,2) NOT NULL,
        "new_amount"      numeric(15,2) NOT NULL CHECK ("new_amount" >= 0),
        "reason"          text NOT NULL,
        "created_by"      uuid NULL,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_budget_revisions_tenant_id_id" UNIQUE ("tenant_id", "id"),
        CONSTRAINT "fk_budget_revisions_budget"
          FOREIGN KEY ("tenant_id", "budget_id")
          REFERENCES "budgets" ("tenant_id", "id") ON DELETE CASCADE
      )
    `);
    // CASCADE justificado: revisões são satélites do orçamento; o DELETE físico
    // de budgets em produção é evitado por soft delete — o CASCADE só atua em
    // manutenção administrativa.
    await queryRunner.query(`
      CREATE INDEX "idx_budget_revisions_tenant_budget"
        ON "budget_revisions" ("tenant_id", "budget_id")
    `);

    await queryRunner.query(`
      CREATE FUNCTION "fn_budget_revisions_append_only"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'budget_revisions: histórico append-only — % proibido', TG_OP;
      END $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_budget_revisions_append_only"
        BEFORE UPDATE OR DELETE ON "budget_revisions"
        FOR EACH ROW EXECUTE FUNCTION "fn_budget_revisions_append_only"()
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_budgets_version_lock"
        BEFORE UPDATE ON "budgets"
        FOR EACH ROW EXECUTE FUNCTION "fn_financial_version_lock"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "trg_budgets_version_lock" ON "budgets"`);
    await queryRunner.query(`DROP TRIGGER "trg_budget_revisions_append_only" ON "budget_revisions"`);
    await queryRunner.query(`DROP FUNCTION "fn_budget_revisions_append_only"()`);
    await queryRunner.query(`DROP TABLE "budget_revisions"`);
    await queryRunner.query(`DROP TABLE "budgets"`);
  }
}
