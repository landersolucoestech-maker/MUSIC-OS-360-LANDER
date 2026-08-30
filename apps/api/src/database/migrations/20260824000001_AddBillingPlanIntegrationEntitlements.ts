import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260824000001_AddBillingPlanIntegrationEntitlements
 *
 * Entitlements de integração por plano, na TABELA CANÔNICA de planos.
 *
 * POR QUE NÃO `billing_plans.features`:
 * `features` é, por contrato deste projeto, uma LISTA DE RÓTULOS exibida no card
 * do plano — "nunca um mapa de flags" (ver comentário em BillingPlanEntity). O
 * admin form, billing e landing fazem `.map/.push/.filter` nela, e um `{}`
 * persistido ali já causou o bug real "features.map is not a function"
 * (Parte 84), com normalização defensiva em BillingPlansService.list()/get().
 * Guardar `{integrations:[…]}` em `features` reintroduziria exatamente esse bug.
 *
 * POR QUE NÃO UMA TABELA NOVA:
 * Seria um segundo sistema de planos — proibido. Esta coluna vive na mesma
 * tabela, é lida/escrita pelo mesmo serviço de planos e participa do mesmo
 * ciclo de vida. É a menor evolução de schema que resolve o requisito.
 *
 * Formato: lista DINÂMICA de slugs comerciais.
 *   billing_plans.integrations = ["docusign","whatsapp"]
 * Sem chave por provedor, sem nome de plano em código — adicionar uma
 * integração comercial nova não exige schema nem código.
 */
export class AddBillingPlanIntegrationEntitlements20260824000001 implements MigrationInterface {
  name = 'AddBillingPlanIntegrationEntitlements20260824000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_plans"
        ADD COLUMN IF NOT EXISTS "integrations" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    // Estado inicial coerente com os módulos que cada plano já anuncia.
    // Só provedores COMMERCIAL com adapter real entram — nada aspiracional.
    const seed: Array<[string, string[]]> = [
      ['starter',      []],
      ['professional', ['autentique', 'whatsapp', 'google_ads']],
      ['enterprise',   ['autentique', 'whatsapp', 'google_ads', 'meta_business', 'abramus', 'docusign']],
    ];
    for (const [slug, list] of seed) {
      await queryRunner.query(
        `UPDATE "billing_plans" SET "integrations" = $1::jsonb, "updated_at" = now() WHERE "slug" = $2`,
        [JSON.stringify(list), slug],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "billing_plans" DROP COLUMN IF EXISTS "integrations"`);
  }
}
