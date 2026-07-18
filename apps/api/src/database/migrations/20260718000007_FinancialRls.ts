import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 13A / M7 — RLS, policies e grants do núcleo financeiro (Fase 12 §8).
 *
 * Padrão AUDITADO do projeto (mesmo de operational_list_items):
 * - ENABLE + FORCE ROW LEVEL SECURITY em toda tabela tenant-owned;
 * - policy "<tabela>_isolation" com private_get_tenant_id() (contexto de tenant
 *   resolvido SERVER-SIDE pela cadeia — nunca por dado enviado pelo cliente);
 * - policy "migrator_admin_all" e GRANTs CONDICIONAIS à existência das roles
 *   musicos_app/musicos_migrator (dependência de provisionamento DOCUMENTADA:
 *   roles de cluster nunca são criadas em migration e nenhuma senha aparece
 *   aqui; sem as roles, grants são pulados e a policy de isolamento permanece).
 * - templates globais: somente leitura para a role de app.
 *
 * DELETE físico concedido SOMENTE onde o domínio permite:
 * transaction_allocations (delete auditado). Nas demais, exclusão é lógica.
 */
export class FinancialRls20260718000007 implements MigrationInterface {
  name = 'FinancialRls20260718000007';

  private static readonly TENANT_TABLES = [
    'financial_categories',
    'financial_accounts',
    'counterparties',
    'cost_centers',
    'financial_transactions',
    'transaction_allocations',
    'budgets',
    'budget_revisions',
  ] as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of FinancialRls20260718000007.TENANT_TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY "${table}_isolation" ON "${table}"
          USING ("tenant_id" = private_get_tenant_id())
          WITH CHECK ("tenant_id" = private_get_tenant_id())
      `);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_migrator') THEN
            CREATE POLICY "migrator_admin_all" ON "${table}"
              FOR ALL TO "musicos_migrator" USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `);
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          GRANT SELECT, INSERT, UPDATE ON "financial_categories" TO "musicos_app";
          GRANT SELECT, INSERT, UPDATE ON "financial_accounts" TO "musicos_app";
          GRANT SELECT, INSERT, UPDATE ON "counterparties" TO "musicos_app";
          GRANT SELECT, INSERT, UPDATE ON "cost_centers" TO "musicos_app";
          GRANT SELECT, INSERT, UPDATE ON "financial_transactions" TO "musicos_app";
          GRANT SELECT, INSERT, UPDATE, DELETE ON "transaction_allocations" TO "musicos_app";
          GRANT SELECT, INSERT, UPDATE ON "budgets" TO "musicos_app";
          GRANT SELECT, INSERT ON "budget_revisions" TO "musicos_app";
        END IF;
      END $$;
    `);

    // Templates globais: RLS habilitada com leitura livre e escrita restrita ao
    // migrator (catálogo de fábrica imutável para tenants).
    await queryRunner.query(`ALTER TABLE "financial_category_templates" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "financial_category_templates" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "financial_category_templates_read_all" ON "financial_category_templates"
        FOR SELECT USING (true)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_migrator') THEN
          CREATE POLICY "migrator_admin_all" ON "financial_category_templates"
            FOR ALL TO "musicos_migrator" USING (true) WITH CHECK (true);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          GRANT SELECT ON "financial_category_templates" TO "musicos_app";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "migrator_admin_all" ON "financial_category_templates"`);
    await queryRunner.query(`DROP POLICY "financial_category_templates_read_all" ON "financial_category_templates"`);
    await queryRunner.query(`ALTER TABLE "financial_category_templates" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "financial_category_templates" DISABLE ROW LEVEL SECURITY`);
    for (const table of [...FinancialRls20260718000007.TENANT_TABLES].reverse()) {
      await queryRunner.query(`DROP POLICY IF EXISTS "migrator_admin_all" ON "${table}"`);
      await queryRunner.query(`DROP POLICY "${table}_isolation" ON "${table}"`);
      await queryRunner.query(`ALTER TABLE "${table}" NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
    // Grants não são revogados individualmente: as tabelas caem nos downs de
    // M2–M6 e os privilégios caem junto (sem REVOKE amplo aqui).
  }
}
