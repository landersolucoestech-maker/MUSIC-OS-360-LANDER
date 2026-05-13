/**
 * seed.ts — dados iniciais para desenvolvimento.
 *
 * Cria:
 *   - 1 organização "Music OS 360 Demo"
 *   - 1 tenant "Demo Label"
 *   - 1 billing subscription (trial)
 *
 * Uso:  cd apps/api && npx ts-node --esm seed.ts
 *  ou:  cd apps/api && node --loader ts-node/esm seed.ts
 */
import 'dotenv/config';
import { neon }  from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq }      from 'drizzle-orm';
import {
  organizations,
  tenants,
  billingSubscriptions,
} from './src/database/schema.js';

const url =
  process.env.NEON_DATABASE_DIRECT_URL ??
  process.env.NEON_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!url) {
  console.error('❌  Defina NEON_DATABASE_DIRECT_URL, NEON_DATABASE_URL ou DATABASE_URL');
  process.exit(1);
}

const db = drizzle(neon(url));

async function seed() {
  console.log('🌱  A iniciar seed...');

  // ── 1. Organização ─────────────────────────────────────────────────────────
  const existingOrgs = await db.select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, 'music-os-360-demo'))
    .limit(1);

  let orgId: string;
  if (existingOrgs.length > 0) {
    orgId = existingOrgs[0].id;
    console.log('⏭️   Organização já existe:', orgId);
  } else {
    const [org] = await db.insert(organizations).values({
      name:           'Music OS 360 Demo',
      slug:           'music-os-360-demo',
      plan:           'professional',
      billing_status: 'trial',
      industry:       'gravadora',
    }).returning({ id: organizations.id });
    orgId = org.id;
    console.log('✅  Organização criada:', orgId);
  }

  // ── 2. Tenant ──────────────────────────────────────────────────────────────
  const existingTenants = await db.select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'demo-label'))
    .limit(1);

  let tenantId: string;
  if (existingTenants.length > 0) {
    tenantId = existingTenants[0].id;
    console.log('⏭️   Tenant já existe:', tenantId);
  } else {
    const [tenant] = await db.insert(tenants).values({
      org_id:   orgId,
      name:     'Demo Label',
      slug:     'demo-label',
      plan:     'professional',
      features: {
        artists:          true,
        catalog:          true,
        contracts:        true,
        accounting:       true,
        crm:              true,
        marketing:        true,
        events:           true,
        projects:         true,
        releases:         true,
        monitoring:       true,
        analytics:        true,
        support:          true,
        ai:               true,
      },
      settings: {
        timezone: 'America/Sao_Paulo',
        locale:   'pt-BR',
        currency: 'BRL',
      },
      active: true,
    }).returning({ id: tenants.id });
    tenantId = tenant.id;
    console.log('✅  Tenant criado:', tenantId);
  }

  // ── 3. Billing Subscription ────────────────────────────────────────────────
  const existingBilling = await db.select({ id: billingSubscriptions.id })
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.org_id, orgId))
    .limit(1);

  if (existingBilling.length > 0) {
    console.log('⏭️   Billing subscription já existe:', existingBilling[0].id);
  } else {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const [billing] = await db.insert(billingSubscriptions).values({
      org_id:       orgId,
      plan:         'professional',
      status:       'trial',
      trial_ends_at: trialEnd,
      seats:        10,
      seats_used:   1,
    }).returning({ id: billingSubscriptions.id });
    console.log('✅  Billing subscription criada:', billing.id);
  }

  console.log('\n🎉  Seed concluído!');
  console.log('    org_id:    ', orgId);
  console.log('    tenant_id: ', tenantId);
}

seed().catch((err) => {
  console.error('❌  Seed falhou:', err instanceof Error ? err.message : err);
  process.exit(1);
});
