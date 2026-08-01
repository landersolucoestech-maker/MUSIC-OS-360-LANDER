import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260801000002_TenantZeroFormalization  (Parte 69 — LANDER RECORDS tenant-zero)
 *
 * Adiciona uma coluna explícita `is_system_tenant` a `organizations` e
 * `tenants`, marcando qual linha é o tenant institucional inicial (LANDER
 * RECORDS). Não é um bypass de RLS/RBAC/billing — nenhuma policy, guard ou
 * regra de negócio deve ler esta coluna para conceder acesso; ela existe
 * apenas para que o bootstrap (`bootstrap-tenant-zero.ts`) e ferramentas
 * administrativas possam identificar a linha sem depender de nome, slug ou
 * ordem de criação (`ORDER BY created_at LIMIT 1` continua proibido).
 *
 * A constraint real está no índice único parcial: como o índice cobre
 * apenas as linhas onde `is_system_tenant = true`, o Postgres rejeita
 * qualquer segunda linha com o mesmo valor — no máximo um tenant-zero por
 * tabela, sempre, independente do que o código da aplicação faça.
 *
 * Idempotente: `ADD COLUMN IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT
 * EXISTS` seguros para rodar em bancos já existentes (DEV/STAGING/PROD),
 * default `false` não promove nenhum tenant existente, e down() reverte
 * sem apagar nenhum tenant.
 */
export class TenantZeroFormalization20260801000002 implements MigrationInterface {
  name = 'TenantZeroFormalization20260801000002';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_system_tenant boolean NOT NULL DEFAULT false`);
    await qr.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_system_tenant boolean NOT NULL DEFAULT false`);

    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS organizations_single_system_tenant
      ON organizations (is_system_tenant)
      WHERE is_system_tenant = true
    `);
    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS tenants_single_system_tenant
      ON tenants (is_system_tenant)
      WHERE is_system_tenant = true
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS tenants_single_system_tenant`);
    await qr.query(`DROP INDEX IF EXISTS organizations_single_system_tenant`);
    await qr.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS is_system_tenant`);
    await qr.query(`ALTER TABLE organizations DROP COLUMN IF EXISTS is_system_tenant`);
  }
}
