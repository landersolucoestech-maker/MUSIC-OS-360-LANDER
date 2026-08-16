import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria "finance_category_keyword_rules" — regras de categorização automática
 * de transações por palavra-chave (keywords → categoria financeira), um
 * conceito distinto de "financial_rules" (motor de taxa/comissão/imposto,
 * calculado por percentual/fixo sobre eventos de transação/fatura/contrato)
 * E também distinto de "financial_category_rules" (migration
 * 20260526000003 — tabela de taxonomia dinâmica seedada por tenant,
 * transaction_type/counterparty_type/category/subcategory, sem service/
 * controller vivo; nome evitado propositalmente para não colidir).
 *
 * O frontend (TransacaoRules.tsx, FinanceCategoryRuleModal, e o matcher
 * client-side matchTransactionCategory em financialCategorizationRules.utils.ts)
 * já existia inteiramente pronto, mas chamava endpoints inexistentes em
 * /financial-categories/rules* — toda ação na página resultava em 404/400.
 * A correspondência keyword→transação é sempre avaliada no cliente (não há
 * lógica de avaliação server-side aqui, ao contrário de financial_rules);
 * esta tabela só precisa persistir as definições das regras em si.
 */
export class CreateFinancialCategoryRules20260816000001
  implements MigrationInterface
{
  name = 'CreateFinancialCategoryRules20260816000001';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "finance_category_keyword_rules" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL REFERENCES "tenants" ("id") ON DELETE CASCADE,
        "keywords" TEXT[] NOT NULL DEFAULT '{}',
        "transaction_type" VARCHAR(20) NOT NULL,
        "category_id" UUID NOT NULL REFERENCES "financial_categories" ("id") ON DELETE RESTRICT,
        "priority" INTEGER NOT NULL DEFAULT 100,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_by" VARCHAR(255),
        "updated_by" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ
      )
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_finance_category_keyword_rules_tenant_active"
        ON "finance_category_keyword_rules" ("tenant_id", "active")
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_finance_category_keyword_rules_tenant_type"
        ON "finance_category_keyword_rules" ("tenant_id", "transaction_type")
    `);
    await qr.query(`ALTER TABLE "finance_category_keyword_rules" ENABLE ROW LEVEL SECURITY`);
    await qr.query(`ALTER TABLE "finance_category_keyword_rules" FORCE ROW LEVEL SECURITY`);
    await qr.query(`
      DROP POLICY IF EXISTS "finance_category_keyword_rules_isolation" ON "finance_category_keyword_rules"
    `);
    await qr.query(`
      CREATE POLICY "finance_category_keyword_rules_isolation"
        ON "finance_category_keyword_rules"
        USING ("tenant_id" = private_get_tenant_id())
        WITH CHECK ("tenant_id" = private_get_tenant_id())
    `);
    await qr.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "finance_category_keyword_rules" TO "musicos_app";
        END IF;
      END $$;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "finance_category_keyword_rules"`);
  }
}
