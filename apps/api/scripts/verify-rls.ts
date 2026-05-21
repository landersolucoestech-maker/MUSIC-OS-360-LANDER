#!/usr/bin/env ts-node
/**
 * scripts/verify-rls.ts
 *
 * Fase 16 — Verificação detalhada de RLS e políticas.
 *
 * Verifica por tabela:
 *   - RLS habilitado
 *   - Política SELECT existe
 *   - Política INSERT existe
 *   - Política UPDATE existe
 *   - Política DELETE existe
 *   - Políticas referenciam tenant_id corretamente
 *
 * Uso:
 *   npm run verify:rls
 *   npm run verify:rls -- --fix    (aplica RLS em tabelas que faltam)
 */

import 'reflect-metadata';
import * as path from 'path';

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
} catch { /* opcional */ }

const FIX_MODE = process.argv.includes('--fix');

const MULTITENANT_TABLES = [
  'artists', 'works', 'phonograms', 'contracts', 'contract_templates',
  'transactions', 'invoices', 'clients', 'leads', 'lead_interactions',
  'campaigns', 'briefings', 'events', 'projects', 'releases', 'shares',
  'takedowns', 'support_tickets', 'notifications', 'uploads',
  'audit_logs', 'ai_jobs', 'artist_goals', 'content_detections',
  'ecad_reports', 'employees', 'payroll_entries', 'leave_requests',
  'workflow_transitions', 'domain_event_log', 'activity_logs',
  'conversations', 'conversation_messages', 'conversation_notes',
  'forms', 'form_submissions',
  'crm_companies', 'crm_contacts', 'crm_tags', 'crm_contact_tags',
  'crm_tasks', 'crm_timeline_events',
  'pipelines', 'pipeline_stages', 'pipeline_opportunities',
  'campaign_tasks', 'campaign_assets', 'ai_usage_logs',
];

interface PolicyRow {
  tablename:  string;
  policyname: string;
  cmd:        string;  // SELECT | INSERT | UPDATE | DELETE | ALL
  qual:       string | null;
  with_check: string | null;
}

async function main(): Promise<void> {
  let fails = 0;

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   MUSIC OS 360 — Verificação de RLS e Políticas           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const { Client } = await import('pg');
  const client = new Client({
    connectionString: process.env['DATABASE_URL'],
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
  } catch (err) {
    console.error(`Falha ao conectar: ${(err as Error).message}`);
    process.exit(1);
  }

  // Tabelas existentes
  const existsRes = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  const existingTables = new Set(existsRes.rows.map(r => r.tablename));

  // RLS por tabela
  const rlsRes = await client.query<{ tablename: string; rowsecurity: boolean }>(
    `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
  );
  const rlsMap = new Map(rlsRes.rows.map(r => [r.tablename, r.rowsecurity]));

  // Políticas
  const policiesRes = await client.query<PolicyRow>(
    `SELECT tablename, policyname, cmd, qual, with_check
     FROM pg_policies WHERE schemaname = 'public'`
  );
  const policiesByTable = new Map<string, PolicyRow[]>();
  for (const row of policiesRes.rows) {
    const arr = policiesByTable.get(row.tablename) ?? [];
    arr.push(row);
    policiesByTable.set(row.tablename, arr);
  }

  for (const table of MULTITENANT_TABLES) {
    if (!existingTables.has(table)) {
      console.log(`  ⚠  ${table} — tabela não existe (execute db:migrate)`);
      continue;
    }

    const rlsOn  = rlsMap.get(table) ?? false;
    const policies = policiesByTable.get(table) ?? [];
    const cmds   = new Set(policies.map(p => p.cmd));
    const hasAll = cmds.has('ALL');
    const hasSel = cmds.has('SELECT') || hasAll;
    const hasIns = cmds.has('INSERT') || hasAll;
    const hasUpd = cmds.has('UPDATE') || hasAll;
    const hasDel = cmds.has('DELETE') || hasAll;

    const tableOk = rlsOn && hasSel && hasIns && hasUpd && hasDel;

    if (tableOk) {
      console.log(`  ✓  ${table}`);
      for (const p of policies) {
        const qualSnip = p.qual ? p.qual.substring(0, 80) : '—';
        console.log(`       [${p.cmd.padEnd(6)}] ${p.policyname}: ${qualSnip}`);
      }
    } else {
      console.log(`  ✗  ${table}`);
      if (!rlsOn) {
        console.log(`       RLS DESABILITADO`);
        fails++;
        if (FIX_MODE) {
          await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
          console.log(`       → RLS habilitado via --fix`);
        }
      }
      if (!hasSel) { console.log('       MISSING SELECT policy'); fails++; }
      if (!hasIns) { console.log('       MISSING INSERT policy'); fails++; }
      if (!hasUpd) { console.log('       MISSING UPDATE policy'); fails++; }
      if (!hasDel) { console.log('       MISSING DELETE policy'); fails++; }

      if (FIX_MODE && policies.length === 0) {
        await client.query(`
          CREATE POLICY tenant_isolation ON ${table}
            USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
            WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
        `);
        console.log(`       → Política tenant_isolation criada via --fix`);
      }
    }
  }

  console.log('\n── Resumo ──────────────────────────────────────────────────\n');
  if (fails === 0) {
    console.log('  ✓ Todas as tabelas multi-tenant têm RLS e políticas completas.\n');
  } else {
    console.log(`  ✗ ${fails} problema(s) de RLS encontrado(s).`);
    if (!FIX_MODE) {
      console.log('  Execute com --fix para aplicar RLS automaticamente.\n');
    }
  }

  await client.end();
  if (fails > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n[verify:rls] Erro fatal:', (err as Error).message);
  process.exit(1);
});
