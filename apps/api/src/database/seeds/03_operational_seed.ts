/**
 * seeds/03_operational_seed.ts
 *
 * Seed operacional minimo para validar a plataforma sem recriar o CRM legado.
 */

import { DataSource } from 'typeorm';

export async function seedOperational(ds: DataSource): Promise<void> {
  const orgId = process.env['SEED_ORG_ID'] ?? '10000000-0000-0000-0000-000000000001';
  const tenantId = process.env['SEED_TENANT_ID'] ?? '10000000-0000-0000-0000-000000000002';
  const orgSlug = process.env['SEED_ORG_SLUG'] ?? 'musicos360-demo';
  const orgName = process.env['SEED_ORG_NAME'] ?? 'MUSIC OS 360 Demo';
  const adminSub = process.env['SEED_ADMIN_SUB'];
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@musicos360.dev';
  const adminName = process.env['SEED_ADMIN_NAME'] ?? 'Admin (Operational Seed)';
  const effectiveAdminSub = adminSub ?? '00000000-0000-0000-0000-000000000099';

  console.log('\n[seed:operational] Iniciando seed operacional...');

  await ds.query(`
    INSERT INTO organizations (id, name, slug, plan, billing_status, industry)
    VALUES ($1, $2, $3, 'enterprise', 'active', 'gravadora')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      billing_status = EXCLUDED.billing_status
  `, [orgId, orgName, orgSlug]);

  await ds.query(`
    INSERT INTO tenants (id, org_id, name, slug, plan, active)
    VALUES ($1, $2, $3, $4, 'enterprise', TRUE)
    ON CONFLICT (id) DO UPDATE SET active = TRUE
  `, [tenantId, orgId, orgName, `${orgSlug}-tenant`]);

  await ds.query(`
    INSERT INTO billing_subscriptions (org_id, plan, status, seats, seats_used)
    VALUES ($1, 'enterprise', 'active', 50, 1)
    ON CONFLICT DO NOTHING
  `, [orgId]);

  // Dual-write (PASSO 12-G): grava role legado E role_id canônico.
  await ds.query(`
    INSERT INTO org_members (org_id, tenant_id, auth_user_id, email, full_name, role, role_id, is_active)
    VALUES ($1, $2, $3, $4, $5, 'owner',
      (SELECT id FROM roles WHERE slug = 'owner' AND tenant_id IS NULL AND deleted_at IS NULL AND archived_at IS NULL LIMIT 1),
      TRUE)
    ON CONFLICT (tenant_id, auth_user_id) DO UPDATE
      SET role = 'owner',
          role_id = (SELECT id FROM roles WHERE slug = 'owner' AND tenant_id IS NULL AND deleted_at IS NULL AND archived_at IS NULL LIMIT 1),
          is_active = TRUE
  `, [orgId, tenantId, effectiveAdminSub, adminEmail, adminName]);

  await ds.query(`SET app.current_tenant_id = '${tenantId}'`);

  const artistId = '10000000-0000-0000-0000-000000000010';
  await ds.query(`
    INSERT INTO artists (id, tenant_id, nome_artistico, nome_civil, tipo, status, genero_musical, created_by)
    VALUES ($1, $2, 'MC Demo Artist', 'Jose da Silva', 'solo', 'ativo', 'Funk', $3)
    ON CONFLICT (id) DO NOTHING
  `, [artistId, tenantId, effectiveAdminSub]);

  const contactId = '10000000-0000-0000-0000-000000000021';
  await ds.query(`
    INSERT INTO contacts
      (id, tenant_id, name, company_name, contact_type, status, priority, created_by)
    VALUES ($1, $2, 'Maria Produtora', 'Gravadora Demo Records', 'producer', 'active', 'high', $3)
    ON CONFLICT (id) DO NOTHING
  `, [contactId, tenantId, effectiveAdminSub]);

  const campaignId = '10000000-0000-0000-0000-000000000040';
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  await ds.query(`
    INSERT INTO campaigns (id, tenant_id, nome, tipo, status, objetivo, artista_id, data_inicio, data_fim, created_by)
    VALUES ($1, $2, 'Lancamento Verao Demo', 'digital', 'rascunho', 'Lancar single de verao', $3, $4, $5, $6)
    ON CONFLICT (id) DO NOTHING
  `, [campaignId, tenantId, artistId, now, end, effectiveAdminSub]);

  const campaignTaskId = '10000000-0000-0000-0000-000000000041';
  await ds.query(`
    INSERT INTO campaign_tasks (id, tenant_id, campaign_id, title, status, priority, due_date, created_by)
    VALUES ($1, $2, $3, 'Criar artes para redes sociais', 'pending', 'high', $4, $5)
    ON CONFLICT (id) DO NOTHING
  `, [campaignTaskId, tenantId, campaignId, end, effectiveAdminSub]);

  const formId = '10000000-0000-0000-0000-000000000050';
  await ds.query(`
    INSERT INTO forms (id, tenant_id, name, description, status, fields, created_by)
    VALUES ($1, $2, 'Formulario de Captura Demo', 'Capture leads via site', 'active',
      '[{"name":"name","label":"Nome","type":"text","required":true},{"name":"email","label":"Email","type":"email","required":true}]',
      $3)
    ON CONFLICT (id) DO NOTHING
  `, [formId, tenantId, effectiveAdminSub]);

  const contractId = '10000000-0000-0000-0000-000000000060';
  await ds.query(`
    INSERT INTO contracts (id, tenant_id, titulo, tipo, status, artista_id, valor, exclusivo, created_by)
    VALUES ($1, $2, 'Contrato de Gravacao Demo', 'gravacao', 'rascunho', $3, 50000, FALSE, $4)
    ON CONFLICT (id) DO NOTHING
  `, [contractId, tenantId, artistId, effectiveAdminSub]);

  const txId = '10000000-0000-0000-0000-000000000070';
  await ds.query(`
    INSERT INTO transactions (id, tenant_id, tipo, categoria, descricao, valor, data, status, artista_id, created_by)
    VALUES ($1, $2, 'receita', 'external-rights-receipts', 'Recebimento externo de direitos Q1 Demo', 15000, $3, 'pendente', $4, $5)
    ON CONFLICT (id) DO NOTHING
  `, [txId, tenantId, now, artistId, effectiveAdminSub]);

  await ds.query(`
    INSERT INTO contact_timeline (tenant_id, contact_id, event_type, summary, actor_id)
    VALUES ($1, $2, 'contact.created', 'Contato criado via seed operacional', $3)
    ON CONFLICT DO NOTHING
  `, [tenantId, contactId, effectiveAdminSub]);

  await ds.query(`RESET app.current_tenant_id`);

  console.log('\n[seed:operational] Seed operacional completo.\n');
}
