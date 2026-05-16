/**
 * seeds/02_admin_user.ts
 *
 * Seed: cria o OrgMember admin padrão de desenvolvimento.
 * Depende de 01_default_tenant.ts (org + tenant já existem).
 */

import { DataSource } from 'typeorm';
import type { SeedResult } from './01_default_tenant';

export async function seedAdminUser(
  ds: DataSource,
  tenant: SeedResult,
): Promise<void> {
  const { orgId, tenantId } = tenant;

  const adminSubjectId = process.env['SEED_ADMIN_SUB'] ?? '00000000-0000-0000-0000-000000000099';
  const adminEmail     = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@musicos360.dev';
  const adminName      = process.env['SEED_ADMIN_NAME']  ?? 'Admin Dev (Seed)';

  await ds.query(`
    INSERT INTO org_members (org_id, tenant_id, clerk_user_id, email, full_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5, 'owner', TRUE)
    ON CONFLICT (tenant_id, clerk_user_id) DO UPDATE
      SET role      = EXCLUDED.role,
          is_active = TRUE
  `, [orgId, tenantId, adminSubjectId, adminEmail, adminName]);

  console.log(`  ✓ org_members: ${adminEmail} (role=owner, tenant=${tenantId})`);
}
