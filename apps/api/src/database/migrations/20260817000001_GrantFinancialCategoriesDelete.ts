import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task Z — achado via validação de runtime real.
 *
 * 20260718000007_FinancialRls concedeu apenas SELECT/INSERT/UPDATE em
 * "financial_categories" ("exclusão é lógica" — arquivar via is_active,
 * já implementado em FinancialCategoriesService.archive()). Só que o
 * serviço TAMBÉM tem um remove() genuinamente distinto — um hard delete
 * guardado por checagens de aplicação (zero subcategorias, zero
 * transações vinculadas, e agora — Task Z — zero regras de categorização
 * vinculadas) para o caso de categoria criada por engano e nunca usada.
 * Sem o GRANT, mesmo uma categoria 100% sem uso nunca conseguia ser
 * excluída: toda chamada quebrava com "permission denied for table
 * financial_categories" (42501) — nunca chegava a testar a FK. RLS
 * (tenant_id = private_get_tenant_id()) já garante que o DELETE nunca
 * cruza tenant, então conceder aqui é seguro.
 */
export class GrantFinancialCategoriesDelete20260817000001
  implements MigrationInterface
{
  name = 'GrantFinancialCategoriesDelete20260817000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          GRANT DELETE ON "financial_categories" TO "musicos_app";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          REVOKE DELETE ON "financial_categories" FROM "musicos_app";
        END IF;
      END $$;
    `);
  }
}
