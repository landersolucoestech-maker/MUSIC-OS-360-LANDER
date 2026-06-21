#!/usr/bin/env tsx
/**
 * scripts/verify-fase5-dashboard.ts
 *
 * FASE 5 — Validação do Dashboard Real.
 *
 *   5.1 Dataset controlado DASH_A_* e DASH_B_*
 *   5.2 /analytics/dashboard cruzado com banco
 *   5.4 Agenda (eventos de hoje vs amanhã via /events list)
 *   5.5 Activity feed (audit-logs e activity-logs)
 *   5.6 Artistas destaque (releases/projects count, streams=null se sem fonte)
 *   5.7 Financeiro mês atual tenant-scoped
 *   5.8 Operational alerts (sem mock fabricado)
 *
 *   5.3 (UI browser) e 5.9 (network/console) requerem smoke manual.
 */

import 'reflect-metadata';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { Client } from 'pg';

try { require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); } catch {}

const API_URL = (process.env['API_URL'] ?? 'http://localhost:3001').replace(/\/$/, '');
const KEY     = process.env['ENCRYPTION_KEY'] ?? '';
const DB_URL  = process.env['DATABASE_URL'] ?? '';

const TA = '10000000-0000-0000-0000-000000000002';
const OA = '10000000-0000-0000-0000-000000000001';
const TB = '20000000-0000-0000-0000-000000000002';
const OB = '20000000-0000-0000-0000-000000000001';

const UID_A = '40000000-0000-0000-0000-000000000001'; // owner A (FASE 4)
const UID_B = '40000000-0000-0000-0000-000000000008'; // owner B (FASE 4)

const TS = Date.now();

let passed = 0, failed = 0;
const fails: Array<{ where: string; got: any; want: any }> = [];

function sign(uid: string, org: string): string {
  return jwt.sign(
    { sub: uid, session_id: `f5-${uid.slice(0,8)}`, app_metadata: { org_id: org, role: 'owner' } },
    KEY,
    { algorithm: 'HS256', issuer: 'music-os-360-dev', expiresIn: '1h' },
  );
}

const TOKEN_A = sign(UID_A, OA);
const TOKEN_B = sign(UID_B, OB);

async function call(
  method: string,
  pathname: string,
  opts: { auth: string; tenant: string; body?: unknown },
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.auth}`, 'X-Tenant-ID': opts.tenant };
  const url = `${API_URL}/api/v1${pathname.startsWith('/') ? pathname : '/'+pathname}`;
  const res = await fetch(url, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let body: any = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

function expect(label: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  ✓  ${label}`); passed++; }
  else      { console.log(`  ✗  ${label}${detail ? ` — ${detail}` : ''}`); failed++; fails.push({ where: label, got: detail, want: 'true' }); }
}
function section(t: string) { console.log(`\n── ${t} ──`); }

function pickId(body: any): string | null {
  if (!body) return null;
  if (typeof body.id === 'string') return body.id;
  if (body.data && typeof body.data.id === 'string') return body.data.id;
  if (body.data && body.data.data && typeof body.data.data.id === 'string') return body.data.data.id;
  return null;
}

function extractList(body: any): any[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (body.data && Array.isArray(body.data.data)) return body.data.data;
  if (Array.isArray(body.items)) return body.items;
  return [];
}

// ============================================================================
// 5.1 — DATASET CONTROLADO
// ============================================================================

interface SeedSet {
  artists:   string[];
  releases:  string[];
  contracts: string[];
  events:    string[];
  tx:        string[];
  leads:     string[];
}

async function seedTenant(tenant: string, token: string, tag: string, opts: {
  artists: number; releases: number; contracts: number;
  eventsToday: number; eventsTomorrow: number;
  txRevenueThisMonth: number; txExpenseThisMonth: number;
  txRevenueOtherMonth: number;
  leads: number;
}): Promise<SeedSet> {
  const ctx = { auth: token, tenant };
  const out: SeedSet = { artists: [], releases: [], contracts: [], events: [], tx: [], leads: [] };

  for (let i = 0; i < opts.artists; i++) {
    const r = await call('POST', '/artists', { ...ctx, body: { nome_artistico: `${tag}_ARTIST_${i}_${TS}`, tipo: 'solo', status: 'em_negociacao', spotify_ouvintes: i === 0 ? 12345 : undefined } });
    { const id = pickId(r.body); if (id) out.artists.push(id); else console.log(`  !  artist POST falhou status=${r.status} body=${JSON.stringify(r.body).slice(0,150)}`); }
  }
  for (let i = 0; i < opts.releases; i++) {
    const r = await call('POST', '/releases', { ...ctx, body: { title: `${tag}_RELEASE_${i}_${TS}`, type: 'single', artistId: out.artists[0] ?? null } });
    const id = pickId(r.body); if (id) out.releases.push(id); else console.log(`  !  release POST status=${r.status} ${JSON.stringify(r.body).slice(0,150)}`);
  }
  for (let i = 0; i < opts.contracts; i++) {
    const r = await call('POST', '/contracts', { ...ctx, body: { titulo: `${tag}_CONTRACT_${i}_${TS}`, tipo: 'gravacao', data_inicio: '2026-01-01', data_fim: '2026-12-31', valor: 1000 + i } });
    const id = pickId(r.body); if (id) out.contracts.push(id); else console.log(`  !  contract POST status=${r.status} ${JSON.stringify(r.body).slice(0,150)}`);
  }
  // Eventos: hoje
  const todayIso = new Date().toISOString();
  for (let i = 0; i < opts.eventsToday; i++) {
    const r = await call('POST', '/events', { ...ctx, body: { title: `${tag}_EVENT_TODAY_${i}_${TS}`, type: 'show', startsAt: todayIso } });
    const id = pickId(r.body); if (id) out.events.push(id); else console.log(`  !  event POST status=${r.status} ${JSON.stringify(r.body).slice(0,150)}`);
  }
  // Eventos: amanhã
  const tomorrowIso = new Date(Date.now() + 86400000).toISOString();
  for (let i = 0; i < opts.eventsTomorrow; i++) {
    const r = await call('POST', '/events', { ...ctx, body: { title: `${tag}_EVENT_FUTURE_${i}_${TS}`, type: 'show', startsAt: tomorrowIso } });
    const id = pickId(r.body); if (id) out.events.push(id); else console.log(`  !  event(tom) POST status=${r.status} ${JSON.stringify(r.body).slice(0,150)}`);
  }
  // Transações receita exige tipoCliente. categoria='outros' evita exigência de artista/subcategoria.
  const today = new Date().toISOString().slice(0,10);
  for (let i = 0; i < opts.txRevenueThisMonth; i++) {
    const r = await call('POST', '/transactions', { ...ctx, body: { tipoTransacao: 'receita', tipoCliente: 'empresa', categoria: 'outros', descricao: `${tag}_TX_REV_${i}_${TS}`, valor: '1000.00', dataTransacao: today, formaPagamento: 'pix', status: 'pago' } });
    const id = pickId(r.body); if (id) out.tx.push(id); else console.log(`  !  tx-rev POST status=${r.status} ${JSON.stringify(r.body).slice(0,200)}`);
  }
  for (let i = 0; i < opts.txExpenseThisMonth; i++) {
    const r = await call('POST', '/transactions', { ...ctx, body: { tipoTransacao: 'despesa', tipoCliente: 'empresa', categoria: 'outros', descricao: `${tag}_TX_EXP_${i}_${TS}`, valor: '300.00', dataTransacao: today, formaPagamento: 'pix', status: 'pago' } });
    const id = pickId(r.body); if (id) out.tx.push(id); else console.log(`  !  tx-exp POST status=${r.status} ${JSON.stringify(r.body).slice(0,200)}`);
  }
  // Transação de outro mês (há 60 dias)
  const other = new Date(Date.now() - 60 * 86400000).toISOString().slice(0,10);
  for (let i = 0; i < opts.txRevenueOtherMonth; i++) {
    const r = await call('POST', '/transactions', { ...ctx, body: { tipoTransacao: 'receita', tipoCliente: 'empresa', categoria: 'outros', descricao: `${tag}_TX_OLD_${i}_${TS}`, valor: '9999.00', dataTransacao: other, formaPagamento: 'pix', status: 'pago' } });
    const id = pickId(r.body); if (id) out.tx.push(id); else console.log(`  !  tx-old POST status=${r.status} ${JSON.stringify(r.body).slice(0,200)}`);
  }
  // Leads
  for (let i = 0; i < opts.leads; i++) {
    const r = await call('POST', '/leads', { ...ctx, body: { name: `${tag}_LEAD_${i}_${TS}`, stage: 'prospect' } });
    const id = pickId(r.body); if (id) out.leads.push(id); else console.log(`  !  lead POST status=${r.status} ${JSON.stringify(r.body).slice(0,150)}`);
  }
  return out;
}

let SEED_A: SeedSet;
let SEED_B: SeedSet;
let OPTS_A: any;
let OPTS_B: any;

async function f51(): Promise<void> {
  section('5.1 — DATASET CONTROLADO');
  OPTS_A = {
    artists: 3, releases: 2, contracts: 2,
    eventsToday: 2, eventsTomorrow: 1,
    txRevenueThisMonth: 3, txExpenseThisMonth: 2, txRevenueOtherMonth: 1,
    leads: 2,
  };
  OPTS_B = {
    artists: 1, releases: 1, contracts: 1,
    eventsToday: 1, eventsTomorrow: 2,
    txRevenueThisMonth: 1, txExpenseThisMonth: 1, txRevenueOtherMonth: 0,
    leads: 1,
  };
  SEED_A = await seedTenant(TA, TOKEN_A, `DASH_A_${TS}`, OPTS_A);
  SEED_B = await seedTenant(TB, TOKEN_B, `DASH_B_${TS}`, OPTS_B);
  console.log('  Tenant A:', { artists: SEED_A.artists.length, releases: SEED_A.releases.length, contracts: SEED_A.contracts.length, events: SEED_A.events.length, tx: SEED_A.tx.length, leads: SEED_A.leads.length });
  console.log('  Tenant B:', { artists: SEED_B.artists.length, releases: SEED_B.releases.length, contracts: SEED_B.contracts.length, events: SEED_B.events.length, tx: SEED_B.tx.length, leads: SEED_B.leads.length });

  expect('Tenant A seed criou todos os artistas', SEED_A.artists.length === OPTS_A.artists, `got=${SEED_A.artists.length}`);
  expect('Tenant A seed criou todos os contratos', SEED_A.contracts.length === OPTS_A.contracts, `got=${SEED_A.contracts.length}`);
  expect('Tenant A seed criou eventos (hoje+amanhã)', SEED_A.events.length === OPTS_A.eventsToday + OPTS_A.eventsTomorrow, `got=${SEED_A.events.length}`);
  expect('Tenant A seed criou transações (mês + antigas)', SEED_A.tx.length === OPTS_A.txRevenueThisMonth + OPTS_A.txExpenseThisMonth + OPTS_A.txRevenueOtherMonth, `got=${SEED_A.tx.length}`);
  expect('Tenant B seed criou todos os artistas', SEED_B.artists.length === OPTS_B.artists, `got=${SEED_B.artists.length}`);
}

// ============================================================================
// 5.2 — /analytics/dashboard cruzado com banco
// ============================================================================

let DASH_A: any;
let DASH_B: any;
let DB: Client;

async function f52(): Promise<void> {
  section('5.2 — /analytics/dashboard vs banco');
  DB = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await DB.connect();

  const ra = await call('GET', '/analytics/dashboard', { auth: TOKEN_A, tenant: TA });
  const rb = await call('GET', '/analytics/dashboard', { auth: TOKEN_B, tenant: TB });
  expect('GET /analytics/dashboard Tenant A → 200', ra.status === 200, `status=${ra.status}`);
  expect('GET /analytics/dashboard Tenant B → 200', rb.status === 200, `status=${rb.status}`);
  DASH_A = ra.body?.data ?? ra.body;
  DASH_B = rb.body?.data ?? rb.body;
  console.log('  Tenant A counters:', JSON.stringify({ artists: DASH_A.artists, contracts: DASH_A.contracts, leads: DASH_A.leads, revenue: DASH_A.revenue_current_month, expenses: DASH_A.expenses_current_month, net: DASH_A.net_result_current_month }));
  console.log('  Tenant B counters:', JSON.stringify({ artists: DASH_B.artists, contracts: DASH_B.contracts, leads: DASH_B.leads, revenue: DASH_B.revenue_current_month, expenses: DASH_B.expenses_current_month, net: DASH_B.net_result_current_month }));

  // Cross-check: para cada contador-chave, query banco direto e bater
  const checks: Array<{ label: string; sql: string; tenant: string; expect: number }> = [
    { label: 'A artists count = banco',   sql: 'SELECT COUNT(*)::int AS c FROM artists   WHERE tenant_id=$1 AND deleted_at IS NULL', tenant: TA, expect: DASH_A.artists },
    { label: 'A contracts count = banco', sql: 'SELECT COUNT(*)::int AS c FROM contracts WHERE tenant_id=$1 AND deleted_at IS NULL', tenant: TA, expect: DASH_A.contracts },
    { label: 'A leads count = banco',     sql: 'SELECT COUNT(*)::int AS c FROM leads     WHERE tenant_id=$1 AND deleted_at IS NULL', tenant: TA, expect: DASH_A.leads },
    { label: 'B artists count = banco',   sql: 'SELECT COUNT(*)::int AS c FROM artists   WHERE tenant_id=$1 AND deleted_at IS NULL', tenant: TB, expect: DASH_B.artists },
    { label: 'B contracts count = banco', sql: 'SELECT COUNT(*)::int AS c FROM contracts WHERE tenant_id=$1 AND deleted_at IS NULL', tenant: TB, expect: DASH_B.contracts },
    { label: 'B leads count = banco',     sql: 'SELECT COUNT(*)::int AS c FROM leads     WHERE tenant_id=$1 AND deleted_at IS NULL', tenant: TB, expect: DASH_B.leads },
  ];
  for (const c of checks) {
    const r = await DB.query<{ c: number }>(c.sql, [c.tenant]);
    expect(c.label, r.rows[0]?.c === c.expect, `db=${r.rows[0]?.c} dashboard=${c.expect}`);
  }

  // Tenant isolation: dashboards têm contadores diferentes
  expect('Dashboard A ≠ Dashboard B (artists)', DASH_A.artists !== DASH_B.artists);
  expect('Dashboard A ≠ Dashboard B (contracts)', DASH_A.contracts !== DASH_B.contracts);

  // Métricas operacionais não fabricadas — quando não há fonte, deve ser 0 (e a chave existe)
  const operationalKeys = ['pending_tasks_count','overdue_tasks_count','onboarding_in_progress_count','overdue_followups_count','pending_distribution_setups','pending_external_syncs','failed_external_syncs','successful_external_syncs','distributor_submissions_count','society_submissions_count','external_validation_errors_count','pending_provider_requirements_count'];
  for (const k of operationalKeys) {
    expect(`Dashboard A contém '${k}' (não inventado)`, typeof DASH_A[k] === 'number' && DASH_A[k] >= 0, `value=${DASH_A[k]}`);
  }
}

// ============================================================================
// 5.4 — AGENDA DE HOJE
// ============================================================================

async function f54(): Promise<void> {
  section('5.4 — AGENDA DE HOJE');
  // Lista todos os eventos do Tenant A, filtra por data
  const r = await call('GET', '/events?limit=200', { auth: TOKEN_A, tenant: TA });
  expect('GET /events A → 200', r.status === 200);
  const list: any[] = Array.isArray(r.body?.data) ? r.body.data : (r.body?.data?.data ?? r.body?.items ?? []);
  const todayPrefix = new Date().toISOString().slice(0,10);
  const eventosHojeTotal = list.filter((e) => {
    const raw = e.data_inicio ?? e.startsAt ?? e.data ?? e.start_date;
    return typeof raw === 'string' && raw.slice(0,10) === todayPrefix;
  });
  const ours = eventosHojeTotal.filter((e) => (e.title ?? e.titulo ?? '').includes(`DASH_A_${TS}_EVENT_TODAY`));
  expect('eventos com data=hoje incluem os criados nesta passada', ours.length === OPTS_A.eventsToday, `match=${ours.length} esperado=${OPTS_A.eventsToday}`);

  // Confirmar que eventos amanhã NÃO entram no recorte hoje
  const amanha = list.filter((e) => (e.title ?? e.titulo ?? '').includes(`DASH_A_${TS}_EVENT_FUTURE`));
  expect('eventos do dia seguinte criados', amanha.length === OPTS_A.eventsTomorrow);
  const tomorrowSetAlsoHoje = amanha.filter((e) => {
    const raw = e.data_inicio ?? e.startsAt ?? e.data ?? e.start_date;
    return typeof raw === 'string' && raw.slice(0,10) === todayPrefix;
  });
  expect('eventos de amanhã NÃO caem em "hoje"', tomorrowSetAlsoHoje.length === 0, `bleed=${tomorrowSetAlsoHoje.length}`);
}

// ============================================================================
// 5.5 — ACTIVITY FEED
// ============================================================================

async function f55(): Promise<void> {
  section('5.5 — ACTIVITY FEED');
  // Esperar a fila assíncrona de audit drainar
  await new Promise((r) => setTimeout(r, 3000));

  // Retry: até 3 tentativas se a 1ª retornar não-200
  let r = await call('GET', '/audit-logs?limit=200', { auth: TOKEN_A, tenant: TA });
  for (let i = 0; i < 3 && r.status !== 200; i++) {
    await new Promise((res) => setTimeout(res, 1500));
    r = await call('GET', '/audit-logs?limit=200', { auth: TOKEN_A, tenant: TA });
  }
  expect('GET /audit-logs A → 200', r.status === 200, `status=${r.status}`);
  const list = extractList(r.body);
  const expectedActions = ['artist.created', 'release.created', 'contract.created', 'event.created', 'transaction.created', 'lead.created'];
  for (const action of expectedActions) {
    const found = list.some((e: any) => (e.action === action) || (e.event_type === action));
    expect(`audit-logs contém ação '${action}'`, found, `count=${list.length}`);
  }
  // Reload simulado
  const r2 = await call('GET', '/audit-logs?limit=200', { auth: TOKEN_A, tenant: TA });
  const list2 = extractList(r2.body);
  expect('audit-logs persistente (2ª chamada igual/maior)', list2.length >= list.length, `1st=${list.length} 2nd=${list2.length}`);

  // activity-logs também
  const ra = await call('GET', '/activity-logs?limit=100', { auth: TOKEN_A, tenant: TA });
  expect('GET /activity-logs A → 200', ra.status === 200, `status=${ra.status}`);
}

// ============================================================================
// 5.6 — ARTISTAS DESTAQUE (releases/projects count + streams=null safety)
// ============================================================================

async function f56(): Promise<void> {
  section('5.6 — ARTISTAS DESTAQUE');
  // Cria projeto vinculado ao primeiro artista A
  const artistA0 = SEED_A.artists[0];
  if (!artistA0) {
    console.log('  →  sem artistA0, pulando');
    return;
  }

  // Cria projeto via /projects (se existir)
  const pj = await call('POST', '/projects', { auth: TOKEN_A, tenant: TA, body: { nome: `DASH_A_PROJECT_${TS}`, artista_id: artistA0, status: 'em_andamento' } });
  console.log('  POST /projects =>', pj.status);

  // Lista artistas e valida campos esperados (não exige endpoint "destaques" dedicado — frontend deriva)
  const r = await call('GET', '/artists?limit=200', { auth: TOKEN_A, tenant: TA });
  const list = Array.isArray(r.body?.data) ? r.body.data : (r.body?.data?.data ?? r.body?.items ?? []);
  const myArtists = list.filter((a: any) => (a.nome_artistico ?? '').includes(`DASH_A_${TS}_ARTIST`));
  expect('artistas DASH_A_* listados', myArtists.length === OPTS_A.artists, `got=${myArtists.length}`);

  // O artista com spotify_ouvintes=12345 (índice 0) deve preservar; outros podem ter null ou undefined
  const a0 = myArtists.find((a: any) => (a.nome_artistico ?? '').endsWith(`_0_${TS}`));
  expect('artistA0 retorna spotify_ouvintes=12345 (streams reais)', a0?.spotify_ouvintes === 12345, `got=${a0?.spotify_ouvintes}`);
  const a1 = myArtists.find((a: any) => (a.nome_artistico ?? '').endsWith(`_1_${TS}`));
  // Hooks frontend tratam undefined/null como "–"
  expect('artistA1 não fabrica streams (null/undefined)', a1?.spotify_ouvintes == null, `got=${a1?.spotify_ouvintes}`);
}

// ============================================================================
// 5.7 — FINANCEIRO TENANT-SCOPED, MÊS ACTUAL
// ============================================================================

async function f57(): Promise<void> {
  section('5.7 — FINANCEIRO MÊS ACTUAL');
  // Para Tenant A, recalcular o que esperamos
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const dbA = await DB.query<{ receitas: string; despesas: string }>(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo='receita' AND status NOT IN ('cancelado','cancelled') THEN valor::numeric ELSE 0 END),0)::numeric AS receitas,
      COALESCE(SUM(CASE WHEN tipo='despesa' AND status NOT IN ('cancelado','cancelled') THEN valor::numeric ELSE 0 END),0)::numeric AS despesas
    FROM transactions WHERE tenant_id=$1 AND deleted_at IS NULL AND data >= $2
  `, [TA, monthStart]);
  const expectedRevA = parseFloat(dbA.rows[0]?.receitas ?? '0');
  const expectedExpA = parseFloat(dbA.rows[0]?.despesas ?? '0');
  expect('revenue_current_month A bate com banco', Math.abs(DASH_A.revenue_current_month - expectedRevA) < 0.01, `dashboard=${DASH_A.revenue_current_month} db=${expectedRevA}`);
  expect('expenses_current_month A bate com banco', Math.abs(DASH_A.expenses_current_month - expectedExpA) < 0.01, `dashboard=${DASH_A.expenses_current_month} db=${expectedExpA}`);
  expect('net_result_current_month A correto', Math.abs(DASH_A.net_result_current_month - (expectedRevA - expectedExpA)) < 0.01);

  // Mesma checagem para B
  const dbB = await DB.query<{ receitas: string; despesas: string }>(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo='receita' AND status NOT IN ('cancelado','cancelled') THEN valor::numeric ELSE 0 END),0)::numeric AS receitas,
      COALESCE(SUM(CASE WHEN tipo='despesa' AND status NOT IN ('cancelado','cancelled') THEN valor::numeric ELSE 0 END),0)::numeric AS despesas
    FROM transactions WHERE tenant_id=$1 AND deleted_at IS NULL AND data >= $2
  `, [TB, monthStart]);
  const expectedRevB = parseFloat(dbB.rows[0]?.receitas ?? '0');
  const expectedExpB = parseFloat(dbB.rows[0]?.despesas ?? '0');
  expect('revenue_current_month B bate com banco', Math.abs(DASH_B.revenue_current_month - expectedRevB) < 0.01, `dashboard=${DASH_B.revenue_current_month} db=${expectedRevB}`);
  expect('expenses_current_month B bate com banco', Math.abs(DASH_B.expenses_current_month - expectedExpB) < 0.01);

  // Transação antiga (60 dias) NÃO entra
  // — para A, criamos 1 receita antiga de 9999. Se entrasse, revenue seria muito maior.
  // Verifico: revenue_current_month deve ser < 9999 (i.e., não inclui a antiga isolada).
  // Mais robusto: somar só as desta passada (created in OPTS_A.txRevenueThisMonth * 1000)
  const ourMonthRevenue = OPTS_A.txRevenueThisMonth * 1000;
  expect('A revenue exclui transação de 60 dias atrás', DASH_A.revenue_current_month < 9999 + ourMonthRevenue || DASH_A.revenue_current_month === expectedRevA, `db=${expectedRevA}`);

  // Tenant isolation
  expect('Tenant B revenue isolado (não soma A)', DASH_B.revenue_current_month < DASH_A.revenue_current_month || DASH_B.revenue_current_month === expectedRevB);
}

// ============================================================================
// 5.8 — OPERATIONAL ALERTS (sem mock)
// ============================================================================

async function f58(): Promise<void> {
  section('5.8 — OPERATIONAL ALERTS');
  // Contratos vencendo: criamos contratos com data_fim '2026-12-31' → não vencem em 30 dias
  // Logo, o counter `contracts_expiring_soon_count` reflete somente contratos reais com data_fim <30 dias.
  expect('contracts_expiring_soon_count é numérico', typeof DASH_A.contracts_expiring_soon_count === 'number');
  expect('open_tickets é numérico', typeof DASH_A.open_tickets === 'number');
  expect('overdue_invoices_count é numérico', typeof DASH_A.overdue_invoices_count === 'number');
  expect('failed_external_syncs é numérico', typeof DASH_A.failed_external_syncs === 'number');

  // Validar que os contadores são consistentes com queries diretas (não chumbados)
  const r1 = await DB.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM support_tickets WHERE tenant_id=$1 AND status NOT IN ('resolved','closed') AND deleted_at IS NULL`, [TA]);
  expect('open_tickets bate com banco', DASH_A.open_tickets === r1.rows[0]?.c, `db=${r1.rows[0]?.c} dash=${DASH_A.open_tickets}`);
  const r2 = await DB.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM crm_tasks WHERE tenant_id=$1 AND status='pending'`, [TA]);
  expect('pending_tasks_count bate com banco', DASH_A.pending_tasks_count === r2.rows[0]?.c, `db=${r2.rows[0]?.c} dash=${DASH_A.pending_tasks_count}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  MUSIC OS 360 — FASE 5: Dashboard Real (HTTP+DB)          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  API_URL  : ${API_URL}`);
  console.log(`  Tenant A : ${TA}`);
  console.log(`  Tenant B : ${TB}`);
  console.log(`  TS       : ${TS}`);

  if (!KEY || !DB_URL) { console.error('ENCRYPTION_KEY ou DATABASE_URL ausente — abortando'); process.exit(2); }

  try {
    await f51();
    await f52();
    await f54();
    await f55();
    await f56();
    await f57();
    await f58();
  } catch (err) {
    console.error('\n[FATAL]', (err as Error).message);
    failed++;
  } finally {
    try { if (DB) await DB.end(); } catch {}
  }

  console.log('\n── RESULTADO ──');
  console.log(`  Passados : ${passed}`);
  console.log(`  Falhados : ${failed}`);
  if (fails.length > 0) {
    console.log('\n── FALHAS ──');
    for (const f of fails) console.log(`  - ${f.where}  ${f.got}`);
  }
  if (failed === 0) {
    console.log('\n  ✓ FASE 5 PASSOU — dashboard reflete dados reais.\n');
    process.exit(0);
  } else {
    console.log('\n  ✗ FASE 5 FALHOU.\n');
    process.exit(1);
  }
}

main().catch((e) => { console.error('\n[fase5] Erro fatal:', e); process.exit(1); });
