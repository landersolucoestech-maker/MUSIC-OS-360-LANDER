/**
 * bootstrap-tenant-zero.ts  (Parte 69 — formalização do tenant-zero)
 *
 * Cria ou valida a LANDER RECORDS — o tenant institucional inicial do
 * MUSIC OS 360 — de forma idempotente. Deliberadamente separado do runner
 * de seeds genérico (`seeds/index.ts`): LANDER RECORDS não é uma fixture
 * descartável, então não deve depender de flags de seed genéricas nem ser
 * confundida com o tenant de demonstração criado por `01_default_tenant.ts`.
 *
 * Este módulo expõe a função pura `bootstrapTenantZero(ds)` — sem I/O de
 * conexão — para poder ser unit-testado sem Postgres real. O CLI real
 * (`npm run db:bootstrap:tenant-zero`, flags: `--force` para produção) vive
 * em `bootstrap-tenant-zero.cli.ts`.
 *
 * Garantias:
 *  - Nunca roda contra a branch MAIN do Supabase, com ou sem --force.
 *  - Idempotente: rodar duas vezes não duplica nem diverge a identidade.
 *  - Nunca promove um tenant/organização existente diferente do ID
 *    canônico para tenant-zero (a UNIQUE INDEX parcial da migration
 *    20260801000002 barra isso no nível de banco; este script também
 *    valida antes, para uma mensagem de erro legível).
 *  - Não concede nenhum bypass de RLS/RBAC/billing — a linha criada é um
 *    tenant/organização comum com `plan='enterprise'`,
 *    `billing_status='active'` (o mesmo caminho de billing usado por
 *    qualquer cliente enterprise real, não uma isenção especial).
 *  - Em produção, exige um owner real via
 *    TENANT_ZERO_OWNER_AUTH_USER_ID/TENANT_ZERO_OWNER_EMAIL (falha se
 *    ausentes) — nunca cria o owner sintético de DEV/STAGING em produção.
 */
import type { DataSource } from 'typeorm';
import {
  TENANT_ZERO_ORG_ID,
  TENANT_ZERO_TENANT_ID,
  TENANT_ZERO_SLUG,
  TENANT_ZERO_NAME,
  TENANT_ZERO_SYNTHETIC_OWNER_AUTH_USER_ID,
  TENANT_ZERO_SYNTHETIC_OWNER_EMAIL,
  TENANT_ZERO_SYNTHETIC_OWNER_NAME,
  TENANT_ZERO_AUDIT_ACTION_CREATED,
  TENANT_ZERO_AUDIT_ACTION_VERIFIED,
} from './tenant-zero.constants';

export interface BootstrapTenantZeroResult {
  orgId: string;
  tenantId: string;
  created: boolean;
}

class TenantZeroInvariantError extends Error {}

/**
 * Falha alto e claro se uma linha diferente do ID canônico já reivindicou
 * `is_system_tenant = true` — nunca "vence" silenciosamente pela ordem de
 * execução. A UNIQUE INDEX parcial da migration garante isto no banco;
 * esta checagem só existe para dar um erro legível antes de tentar o INSERT.
 */
async function assertNoConflictingSystemTenant(ds: DataSource, table: 'organizations' | 'tenants', canonicalId: string): Promise<void> {
  const rows = await ds.query(
    `SELECT id FROM ${table} WHERE is_system_tenant = true AND id != $1 LIMIT 1`,
    [canonicalId],
  );
  if (rows.length > 0) {
    throw new TenantZeroInvariantError(
      `${table}.id=${rows[0].id} já está marcado is_system_tenant=true, mas difere do ID canônico do tenant-zero (${canonicalId}). ` +
      'Nunca promova um tenant existente por nome/slug — corrija manualmente antes de rodar o bootstrap novamente.',
    );
  }
}

/**
 * Se a linha canônica já existir, valida que sua identidade (nome/slug)
 * ainda é a esperada — nunca sobrescreve silenciosamente um tenant que
 * porventura já exista com esse ID mas com dados divergentes.
 */
async function assertIdentityMatchesIfExists(
  ds: DataSource,
  table: 'organizations' | 'tenants',
  canonicalId: string,
): Promise<{ exists: boolean }> {
  const rows = await ds.query(`SELECT slug, name FROM ${table} WHERE id = $1`, [canonicalId]);
  if (rows.length === 0) return { exists: false };
  const row = rows[0] as { slug: string; name: string };
  if (row.slug !== TENANT_ZERO_SLUG) {
    throw new TenantZeroInvariantError(
      `${table}.id=${canonicalId} existe mas com slug="${row.slug}" (esperado "${TENANT_ZERO_SLUG}"). ` +
      'Identidade divergente — resolva manualmente, o bootstrap não sobrescreve slugs.',
    );
  }
  return { exists: true };
}

export async function bootstrapTenantZero(ds: DataSource): Promise<BootstrapTenantZeroResult> {
  await assertNoConflictingSystemTenant(ds, 'organizations', TENANT_ZERO_ORG_ID);
  await assertNoConflictingSystemTenant(ds, 'tenants', TENANT_ZERO_TENANT_ID);

  const { exists: orgExists } = await assertIdentityMatchesIfExists(ds, 'organizations', TENANT_ZERO_ORG_ID);
  await assertIdentityMatchesIfExists(ds, 'tenants', TENANT_ZERO_TENANT_ID);

  const created = !orgExists;
  const isProduction = (process.env['NODE_ENV'] ?? 'development') === 'production';

  await ds.query(
    `
    INSERT INTO organizations (id, name, slug, plan, billing_status, industry, is_system_tenant)
    VALUES ($1, $2, $3, 'enterprise', 'active', 'gravadora', true)
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, slug = EXCLUDED.slug, is_system_tenant = true
    `,
    [TENANT_ZERO_ORG_ID, TENANT_ZERO_NAME, TENANT_ZERO_SLUG],
  );

  await ds.query(
    `
    INSERT INTO tenants (id, org_id, name, slug, plan, active, is_system_tenant)
    VALUES ($1, $2, $3, $4, 'enterprise', TRUE, true)
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, slug = EXCLUDED.slug, active = TRUE, is_system_tenant = true
    `,
    [TENANT_ZERO_TENANT_ID, TENANT_ZERO_ORG_ID, TENANT_ZERO_NAME, TENANT_ZERO_SLUG],
  );

  // Billing: mesmo caminho normal de qualquer tenant enterprise ativo — não
  // é `manual_override`/isenção especial (ver docstring do módulo).
  await ds.query(
    `
    INSERT INTO billing_subscriptions (org_id, plan, status, seats, seats_used)
    VALUES ($1, 'enterprise', 'active', 25, 1)
    ON CONFLICT DO NOTHING
    `,
    [TENANT_ZERO_ORG_ID],
  );

  if (isProduction) {
    const ownerAuthUserId = process.env['TENANT_ZERO_OWNER_AUTH_USER_ID'];
    const ownerEmail = process.env['TENANT_ZERO_OWNER_EMAIL'];
    if (!ownerAuthUserId || !ownerEmail) {
      throw new TenantZeroInvariantError(
        'Em produção, TENANT_ZERO_OWNER_AUTH_USER_ID e TENANT_ZERO_OWNER_EMAIL são obrigatórias ' +
        '(um owner real, provisionado por processo seguro) — o owner sintético de DEV/STAGING nunca é criado em produção.',
      );
    }
    await ds.query(
      `
      INSERT INTO org_members (org_id, tenant_id, auth_user_id, email, role, role_id, is_active)
      VALUES ($1, $2, $3, $4, 'owner',
        (SELECT id FROM roles WHERE slug = 'owner' AND tenant_id IS NULL AND deleted_at IS NULL AND archived_at IS NULL LIMIT 1),
        TRUE)
      ON CONFLICT (tenant_id, auth_user_id) DO UPDATE
        SET role = EXCLUDED.role, role_id = EXCLUDED.role_id, is_active = TRUE
      `,
      [TENANT_ZERO_ORG_ID, TENANT_ZERO_TENANT_ID, ownerAuthUserId, ownerEmail],
    );
  } else {
    await ds.query(
      `
      INSERT INTO org_members (org_id, tenant_id, auth_user_id, email, full_name, role, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5, 'owner',
        (SELECT id FROM roles WHERE slug = 'owner' AND tenant_id IS NULL AND deleted_at IS NULL AND archived_at IS NULL LIMIT 1),
        TRUE)
      ON CONFLICT (tenant_id, auth_user_id) DO UPDATE
        SET role = EXCLUDED.role, role_id = EXCLUDED.role_id, is_active = TRUE
      `,
      [TENANT_ZERO_ORG_ID, TENANT_ZERO_TENANT_ID, TENANT_ZERO_SYNTHETIC_OWNER_AUTH_USER_ID, TENANT_ZERO_SYNTHETIC_OWNER_EMAIL, TENANT_ZERO_SYNTHETIC_OWNER_NAME],
    );
  }

  await ds.query(
    `
    INSERT INTO audit_logs (tenant_id, org_id, actor_role, action, entity, entity_id, after)
    VALUES ($1, $1, 'system', $2, 'organizations', $1, $3::jsonb)
    `,
    [
      TENANT_ZERO_ORG_ID,
      created ? TENANT_ZERO_AUDIT_ACTION_CREATED : TENANT_ZERO_AUDIT_ACTION_VERIFIED,
      JSON.stringify({ name: TENANT_ZERO_NAME, slug: TENANT_ZERO_SLUG, is_system_tenant: true }),
    ],
  );

  return { orgId: TENANT_ZERO_ORG_ID, tenantId: TENANT_ZERO_TENANT_ID, created };
}
