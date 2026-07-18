import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 13A / M2 — classificação financeira (Fase 12 §2.1–2.2).
 *
 * - financial_category_templates: catálogo GLOBAL somente-leitura (sem
 *   tenant_id; escrita apenas pelo provisionamento/seed técnico — NUNCA nesta
 *   migration: estrutura e carga são separadas por decisão da Fase 12 §14).
 * - financial_categories: hierarquia por tenant (grupo>categoria>subcategoria,
 *   nível 1..3), com NATUREZA (define a linha do P&L), desativação lógica e
 *   PROIBIÇÃO de exclusão física quando referenciada (I9/I10 — FKs RESTRICT
 *   nas tabelas consumidoras, M4).
 */
export class FinancialCategories20260718000002 implements MigrationInterface {
  name = 'FinancialCategories20260718000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "financial_category_templates" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "parent_id"       uuid NULL REFERENCES "financial_category_templates" ("id"),
        "name"            varchar(120) NOT NULL,
        "nature"          "category_nature" NOT NULL,
        "includes_in_pnl" boolean NOT NULL DEFAULT true,
        "level"           smallint NOT NULL CHECK ("level" BETWEEN 1 AND 3),
        "sort_order"      integer NOT NULL DEFAULT 0,
        CONSTRAINT "uq_fincat_templates_parent_name" UNIQUE NULLS NOT DISTINCT ("parent_id", "name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "financial_categories" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"       uuid NOT NULL,
        "parent_id"       uuid NULL,
        "template_id"     uuid NULL REFERENCES "financial_category_templates" ("id"),
        "name"            varchar(120) NOT NULL,
        "nature"          "category_nature" NOT NULL,
        "includes_in_pnl" boolean NOT NULL DEFAULT true,
        "level"           smallint NOT NULL CHECK ("level" BETWEEN 1 AND 3),
        "is_active"       boolean NOT NULL DEFAULT true,
        "sort_order"      integer NOT NULL DEFAULT 0,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        "created_by"      uuid NULL,
        "updated_by"      uuid NULL,
        CONSTRAINT "uq_financial_categories_tenant_id_id" UNIQUE ("tenant_id", "id"),
        CONSTRAINT "uq_financial_categories_tenant_parent_name"
          UNIQUE NULLS NOT DISTINCT ("tenant_id", "parent_id", "name"),
        CONSTRAINT "fk_financial_categories_parent"
          FOREIGN KEY ("tenant_id", "parent_id")
          REFERENCES "financial_categories" ("tenant_id", "id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_financial_categories_tenant_parent"
        ON "financial_categories" ("tenant_id", "parent_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_financial_categories_tenant_active"
        ON "financial_categories" ("tenant_id", "is_active")
    `);

    // Hierarquia consistente: raiz tem level 1; filho tem level = pai + 1.
    // (CHECK não alcança outra linha — proteção via trigger, decisão M2.)
    await queryRunner.query(`
      CREATE FUNCTION "fn_fincat_level_guard"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      DECLARE v_parent_level smallint;
      BEGIN
        IF NEW."parent_id" IS NULL THEN
          IF NEW."level" <> 1 THEN
            RAISE EXCEPTION 'financial_categories: categoria raiz deve ter level 1 (recebido %)', NEW."level";
          END IF;
        ELSE
          SELECT "level" INTO v_parent_level
            FROM "financial_categories"
           WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."parent_id";
          IF v_parent_level IS NULL THEN
            RAISE EXCEPTION 'financial_categories: parent inexistente no tenant';
          END IF;
          IF NEW."level" <> v_parent_level + 1 THEN
            RAISE EXCEPTION 'financial_categories: level % incompatível com parent level %',
              NEW."level", v_parent_level;
          END IF;
        END IF;
        RETURN NEW;
      END $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_fincat_level_guard"
        BEFORE INSERT OR UPDATE OF "parent_id", "level" ON "financial_categories"
        FOR EACH ROW EXECUTE FUNCTION "fn_fincat_level_guard"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "trg_fincat_level_guard" ON "financial_categories"`);
    await queryRunner.query(`DROP FUNCTION "fn_fincat_level_guard"()`);
    await queryRunner.query(`DROP TABLE "financial_categories"`);
    await queryRunner.query(`DROP TABLE "financial_category_templates"`);
  }
}
