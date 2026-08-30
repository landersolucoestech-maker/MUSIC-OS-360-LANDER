import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260822000003_CreateKnowledgeBase
 *
 * Product-completion audit (Decision Gate item 8 / GAP-05b): "Central de
 * Suporte" (self-service help for using Music OS 360 itself — categories
 * like financeiro/contratos/usuarios/permissoes/integracoes) has a fully
 * built read UI (SupportKnowledge.tsx) and authoring UI
 * (admin/components/knowledge/KnowledgeBaseManager.tsx), but zero backend —
 * useKnowledgeArticles() and SUPPORT_KNOWLEDGE_CATEGORIES are hardcoded
 * empty, every mutation just shows an error toast.
 *
 * Content is GLOBAL (Music OS 360's own platform documentation, authored
 * once by super_admin, read by every tenant) — not tenant-specific data.
 * Follows the same global-table pattern as billing_plans
 * (20260701000002_BillingPlans.ts): no tenant_id, RLS enabled with a
 * permissive global-access policy, authorization enforced at the RBAC/
 * controller layer (RequireRole super_admin for writes).
 */
export class CreateKnowledgeBase20260822000003 implements MigrationInterface {
  name = 'CreateKnowledgeBase20260822000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE knowledge_categories (
        id          uuid NOT NULL DEFAULT gen_random_uuid(),
        slug        varchar(80) NOT NULL,
        name        varchar(120) NOT NULL,
        description text,
        icon        varchar(60),
        color       varchar(30),
        sort_order  integer NOT NULL DEFAULT 0,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now(),
        deleted_at  timestamp,
        CONSTRAINT knowledge_categories_pkey PRIMARY KEY (id),
        CONSTRAINT knowledge_categories_slug_key UNIQUE (slug)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE knowledge_articles (
        id            uuid NOT NULL DEFAULT gen_random_uuid(),
        category_id   uuid NOT NULL REFERENCES knowledge_categories(id) ON DELETE RESTRICT,
        title         varchar(300) NOT NULL,
        summary       text NOT NULL DEFAULT '',
        content       text NOT NULL DEFAULT '',
        type          varchar(20) NOT NULL DEFAULT 'article',
        status        varchar(20) NOT NULL DEFAULT 'draft',
        featured      boolean NOT NULL DEFAULT false,
        views         integer NOT NULL DEFAULT 0,
        helpful_count integer NOT NULL DEFAULT 0,
        read_time     integer NOT NULL DEFAULT 1,
        sort_order    integer NOT NULL DEFAULT 0,
        created_by    varchar(255),
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now(),
        deleted_at    timestamp,
        CONSTRAINT knowledge_articles_pkey PRIMARY KEY (id),
        CONSTRAINT knowledge_articles_type_check
          CHECK (type IN ('article', 'faq', 'tutorial', 'internal_doc')),
        CONSTRAINT knowledge_articles_status_check
          CHECK (status IN ('draft', 'published', 'archived'))
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_knowledge_categories_sort ON knowledge_categories (sort_order) WHERE (deleted_at IS NULL)`);
    await queryRunner.query(`CREATE INDEX idx_knowledge_articles_category ON knowledge_articles (category_id) WHERE (deleted_at IS NULL)`);
    await queryRunner.query(`CREATE INDEX idx_knowledge_articles_status ON knowledge_articles (status) WHERE (deleted_at IS NULL)`);

    for (const table of ['knowledge_categories', 'knowledge_articles']) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY ${table}_global_access ON ${table}
          AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true)
      `);
      await queryRunner.query(`ALTER TABLE ${table} OWNER TO musicos_migrator`);
      await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ${table} TO musicos_migrator`);
      await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO musicos_app`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS knowledge_articles`);
    await queryRunner.query(`DROP TABLE IF EXISTS knowledge_categories`);
  }
}
