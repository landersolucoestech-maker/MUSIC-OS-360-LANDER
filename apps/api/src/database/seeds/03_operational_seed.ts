/**
 * seeds/03_operational_seed.ts
 *
 * Fase 17 — Seed operacional completo.
 *
 * Cria dados mínimos reais para validar operação ponta a ponta:
 *   - Organization + Tenant
 *   - Admin user (owner)
 *   - Planos starter/professional/enterprise (billing)
 *   - Artista de demonstração
 *   - Contato CRM
 *   - Pipeline + Stage + Opportunity
 *   - Campanha + Task
 *   - Formulário de captura
 *   - Contrato rascunho
 *   - Transação financeira de exemplo
 *
 * IMPORTANT:
 *   Para SEED_ADMIN_SUB funcionar, o usuário deve já existir no Supabase Auth.
 *   Crie o usuário em auth.users via Supabase Dashboard ou CLI antes de rodar.
 *
 * Variáveis de ambiente usadas:
 *   SEED_ADMIN_SUB   — UUID do usuário Supabase Auth (obrigatório para membership)
 *   SEED_ADMIN_EMAIL — Email do admin (default: admin@musicos360.dev)
 *   SEED_ORG_NAME    — Nome da organização (default: MUSIC OS 360 Demo)
 *   SEED_ORG_SLUG    — Slug da organização (default: musicos360-demo)
 */

import { DataSource } from 'typeorm';
import type { SeedResult } from './01_default_tenant';

export async function seedOperational(ds: DataSource): Promise<void> {
  const orgId    = process.env['SEED_ORG_ID']    ?? '10000000-0000-0000-0000-000000000001';
  const tenantId = process.env['SEED_TENANT_ID'] ?? '10000000-0000-0000-0000-000000000002';
  const orgSlug  = process.env['SEED_ORG_SLUG']  ?? 'musicos360-demo';
  const orgName  = process.env['SEED_ORG_NAME']  ?? 'MUSIC OS 360 Demo';
  const adminSub = process.env['SEED_ADMIN_SUB'];
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@musicos360.dev';
  const adminName  = process.env['SEED_ADMIN_NAME']  ?? 'Admin (Operational Seed)';

  console.log('\n[seed:operational] Iniciando seed operacional…');
  console.log(`  Org:    ${orgName} (${orgId})`);
  console.log(`  Tenant: ${tenantId}`);
  console.log(`  Admin:  ${adminEmail}`);

  if (!adminSub) {
    console.warn('\n  ⚠ SEED_ADMIN_SUB não definido — membership será criado com ID placeholder.');
    console.warn('  Para login real, defina SEED_ADMIN_SUB com o UUID do usuário Supabase Auth.\n');
  }

  // ── 1. Organization ───────────────────────────────────────────────────────
  await ds.query(`
    INSERT INTO organizations (id, name, slug, plan, billing_status, industry)
    VALUES ($1, $2, $3, 'enterprise', 'active', 'gravadora')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      billing_status = EXCLUDED.billing_status
  `, [orgId, orgName, orgSlug]);
  console.log('  ✓ organizations');

  // ── 2. Tenant ─────────────────────────────────────────────────────────────
  await ds.query(`
    INSERT INTO tenants (id, org_id, name, slug, plan, active)
    VALUES ($1, $2, $3, $4, 'enterprise', TRUE)
    ON CONFLICT (id) DO UPDATE SET active = TRUE
  `, [tenantId, orgId, orgName, `${orgSlug}-tenant`]);
  console.log('  ✓ tenants');

  // ── 3. Billing Subscription ───────────────────────────────────────────────
  await ds.query(`
    INSERT INTO billing_subscriptions (org_id, plan, status, seats, seats_used)
    VALUES ($1, 'enterprise', 'active', 50, 1)
    ON CONFLICT DO NOTHING
  `, [orgId]);
  console.log('  ✓ billing_subscriptions');

  // ── 4. Admin Member ───────────────────────────────────────────────────────
  const effectiveAdminSub = adminSub ?? '00000000-0000-0000-0000-000000000099';
  await ds.query(`
    INSERT INTO org_members (org_id, tenant_id, auth_user_id, email, full_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5, 'owner', TRUE)
    ON CONFLICT (tenant_id, auth_user_id) DO UPDATE SET role = 'owner', is_active = TRUE
  `, [orgId, tenantId, effectiveAdminSub, adminEmail, adminName]);
  console.log(`  ✓ org_members: ${adminEmail} (owner)`);

  // ── 5. Set RLS context ────────────────────────────────────────────────────
  await ds.query(`SET app.current_tenant_id = '${tenantId}'`);

  // ── 6. Artista de demonstração ────────────────────────────────────────────
  const artistId = '10000000-0000-0000-0000-000000000010';
  await ds.query(`
    INSERT INTO artists (id, tenant_id, nome_artistico, nome_civil, tipo, status, genero_musical, created_by)
    VALUES ($1, $2, 'MC Demo Artist', 'José da Silva', 'solo', 'ativo', 'Funk', $3)
    ON CONFLICT (id) DO NOTHING
  `, [artistId, tenantId, effectiveAdminSub]);
  console.log('  ✓ artists: MC Demo Artist');

  // ── 7. CRM Company ─────────────────────────────────────────────────────────
  const companyId = '10000000-0000-0000-0000-000000000020';
  await ds.query(`
    INSERT INTO crm_companies (id, tenant_id, name, industry, created_by)
    VALUES ($1, $2, 'Gravadora Demo Records', 'gravadora', $3)
    ON CONFLICT (id) DO NOTHING
  `, [companyId, tenantId, effectiveAdminSub]);
  console.log('  ✓ crm_companies');

  // ── 8. CRM Contact ────────────────────────────────────────────────────────
  const contactId = '10000000-0000-0000-0000-000000000021';
  await ds.query(`
    INSERT INTO crm_contacts (id, tenant_id, name, job_title, company_id, source, score, status, created_by)
    VALUES ($1, $2, 'Maria Produtora', 'Produtora Musical', $3, 'manual', 75, 'active', $4)
    ON CONFLICT (id) DO NOTHING
  `, [contactId, tenantId, companyId, effectiveAdminSub]);
  console.log('  ✓ crm_contacts');

  // ── 9. CRM Tag ────────────────────────────────────────────────────────────
  const tagId = '10000000-0000-0000-0000-000000000022';
  await ds.query(`
    INSERT INTO crm_tags (id, tenant_id, name, color)
    VALUES ($1, $2, 'VIP', '#f59e0b')
    ON CONFLICT DO NOTHING
  `, [tagId, tenantId]);
  await ds.query(`
    INSERT INTO crm_contact_tags (tenant_id, contact_id, tag_id)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
  `, [tenantId, contactId, tagId]);
  console.log('  ✓ crm_tags + crm_contact_tags');

  // ── 10. Pipeline ──────────────────────────────────────────────────────────
  const pipelineId = '10000000-0000-0000-0000-000000000030';
  await ds.query(`
    INSERT INTO pipelines (id, tenant_id, name, type, description, is_active, created_by)
    VALUES ($1, $2, 'Aquisição de Artistas', 'artist_acquisition', 'Pipeline demo de aquisição', TRUE, $3)
    ON CONFLICT (id) DO NOTHING
  `, [pipelineId, tenantId, effectiveAdminSub]);

  const stage1Id = '10000000-0000-0000-0000-000000000031';
  const stage2Id = '10000000-0000-0000-0000-000000000032';
  const stage3Id = '10000000-0000-0000-0000-000000000033';

  await ds.query(`
    INSERT INTO pipeline_stages (id, tenant_id, pipeline_id, name, position, color, sla_days, win_probability)
    VALUES
      ($1, $2, $3, 'Prospecção',   0, '#94a3b8', 7,  10),
      ($4, $2, $3, 'Negociação',   1, '#f59e0b', 14, 50),
      ($5, $2, $3, 'Contrato',     2, '#22c55e', 30, 80)
    ON CONFLICT (id) DO NOTHING
  `, [stage1Id, tenantId, pipelineId, stage2Id, stage3Id]);

  const oppId = '10000000-0000-0000-0000-000000000034';
  await ds.query(`
    INSERT INTO pipeline_opportunities (id, tenant_id, pipeline_id, stage_id, title, contact_id, value, status, probability, created_by)
    VALUES ($1, $2, $3, $4, 'Artista Emergente — Demo', $5, 50000, 'open', 50, $6)
    ON CONFLICT (id) DO NOTHING
  `, [oppId, tenantId, pipelineId, stage1Id, contactId, effectiveAdminSub]);
  console.log('  ✓ pipelines + pipeline_stages + pipeline_opportunities');

  // ── 11. Campanha ──────────────────────────────────────────────────────────
  const campaignId = '10000000-0000-0000-0000-000000000040';
  const now = new Date();
  const end = new Date(now); end.setMonth(end.getMonth() + 1);

  await ds.query(`
    INSERT INTO campaigns (id, tenant_id, nome, tipo, status, objetivo, artista_id, data_inicio, data_fim, created_by)
    VALUES ($1, $2, 'Lançamento Verão Demo', 'digital', 'rascunho', 'Lançar single de verão', $3, $4, $5, $6)
    ON CONFLICT (id) DO NOTHING
  `, [campaignId, tenantId, artistId, now, end, effectiveAdminSub]);

  const campaignTaskId = '10000000-0000-0000-0000-000000000041';
  await ds.query(`
    INSERT INTO campaign_tasks (id, tenant_id, campaign_id, title, status, priority, due_date, created_by)
    VALUES ($1, $2, $3, 'Criar artes para redes sociais', 'pending', 'high', $4, $5)
    ON CONFLICT (id) DO NOTHING
  `, [campaignTaskId, tenantId, campaignId, end, effectiveAdminSub]);
  console.log('  ✓ campaigns + campaign_tasks');

  // ── 12. Formulário de captura ─────────────────────────────────────────────
  const formId = '10000000-0000-0000-0000-000000000050';
  await ds.query(`
    INSERT INTO forms (id, tenant_id, name, description, status, fields, created_by)
    VALUES ($1, $2, 'Formulário de Contacto Demo', 'Capture leads via site', 'active',
      '[{"name":"name","label":"Nome","type":"text","required":true},{"name":"email","label":"Email","type":"email","required":true}]',
      $3)
    ON CONFLICT (id) DO NOTHING
  `, [formId, tenantId, effectiveAdminSub]);
  console.log('  ✓ forms');

  // ── 13. Contrato ──────────────────────────────────────────────────────────
  const contractId = '10000000-0000-0000-0000-000000000060';
  await ds.query(`
    INSERT INTO contracts (id, tenant_id, titulo, tipo, status, artista_id, valor, exclusivo, created_by)
    VALUES ($1, $2, 'Contrato de Gravação Demo', 'gravacao', 'rascunho', $3, 50000, FALSE, $4)
    ON CONFLICT (id) DO NOTHING
  `, [contractId, tenantId, artistId, effectiveAdminSub]);
  console.log('  ✓ contracts');

  // ── 14. Transação financeira ──────────────────────────────────────────────
  const txId = '10000000-0000-0000-0000-000000000070';
  await ds.query(`
    INSERT INTO transactions (id, tenant_id, tipo, categoria, descricao, valor, data, status, artista_id, created_by)
    VALUES ($1, $2, 'receita', 'external-rights-receipts', 'Recebimento externo de direitos Q1 Demo', 15000, $3, 'pendente', $4, $5)
    ON CONFLICT (id) DO NOTHING
  `, [txId, tenantId, now, artistId, effectiveAdminSub]);
  console.log('  ✓ transactions');

  // ── 15. CRM Timeline Event ────────────────────────────────────────────────
  await ds.query(`
    INSERT INTO crm_timeline_events (tenant_id, contact_id, event_type, summary, actor_id)
    VALUES ($1, $2, 'contact.created', 'Contacto criado via seed operacional', $3)
    ON CONFLICT DO NOTHING
  `, [tenantId, contactId, effectiveAdminSub]);
  console.log('  ✓ crm_timeline_events');

  // ── Reset RLS context ─────────────────────────────────────────────────────
  await ds.query(`RESET app.current_tenant_id`);

  console.log('\n[seed:operational] ✓ Seed operacional completo.\n');
  console.log('  Dados criados:');
  console.log(`  - Org: ${orgName} (${orgId})`);
  console.log(`  - Tenant: ${tenantId}`);
  console.log(`  - Admin: ${adminEmail}`);
  console.log('  - Artista: MC Demo Artist');
  console.log('  - CRM Contact: Maria Produtora (tag: VIP)');
  console.log('  - Pipeline: Aquisição de Artistas (3 stages, 1 opportunity)');
  console.log('  - Campanha: Lançamento Verão Demo (1 task)');
  console.log('  - Formulário de captura ativo');
  console.log('  - Contrato rascunho');
  console.log('  - Transação financeira');
  if (!adminSub) {
    console.log('\n  ⚠ Para autenticação real:');
    console.log('    1. Crie o usuário no Supabase Auth Dashboard');
    console.log('    2. Defina SEED_ADMIN_SUB=<uuid-supabase> no .env');
    console.log('    3. Execute novamente: npm run db:seed:operational\n');
  }
}
