/**
 * seeds/01_default_tenant.ts
 *
 * Seed inicial: cria a organização e tenant padrão de desenvolvimento.
 * Executado apenas em dev/staging — nunca em produção sem confirmação explícita.
 */

import { DataSource } from 'typeorm';

export interface SeedResult {
  orgId: string;
  tenantId: string;
  orgSlug: string;
}

export async function seedDefaultTenant(ds: DataSource): Promise<SeedResult> {
  const orgId    = '00000000-0000-0000-0000-000000000001';
  const tenantId = '00000000-0000-0000-0000-000000000002';
  const orgSlug  = 'dev-org';

  // ── organizations ──────────────────────────────────────────────────────────
  await ds.query(`
    INSERT INTO organizations (id, name, slug, plan, billing_status, industry)
    VALUES ($1, $2, $3, 'enterprise', 'active', 'gravadora')
    ON CONFLICT (id) DO NOTHING
  `, [orgId, 'Dev Organization (Seed)', orgSlug]);

  console.log(`  ✓ organizations: ${orgSlug} (${orgId})`);

  // ── tenants ────────────────────────────────────────────────────────────────
  await ds.query(`
    INSERT INTO tenants (id, org_id, name, slug, plan, active)
    VALUES ($1, $2, $3, $4, 'enterprise', TRUE)
    ON CONFLICT (id) DO NOTHING
  `, [tenantId, orgId, 'Dev Tenant (Seed)', 'dev-tenant']);

  console.log(`  ✓ tenants: dev-tenant (${tenantId})`);

  // ── billing_subscriptions ──────────────────────────────────────────────────
  await ds.query(`
    INSERT INTO billing_subscriptions (org_id, plan, status, seats, seats_used)
    VALUES ($1, 'enterprise', 'active', 25, 1)
    ON CONFLICT DO NOTHING
  `, [orgId]);

  console.log('  ✓ billing_subscriptions: enterprise/active');

  return { orgId, tenantId, orgSlug };
}
