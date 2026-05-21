#!/usr/bin/env ts-node
/**
 * scripts/smoke-test.ts
 *
 * Fase 20 — Smoke test HTTP ponta a ponta.
 *
 * Verifica que a API está viva e os fluxos críticos respondem.
 *
 * NÃO substitui testes de integração — testa em ambiente real/staging.
 *
 * Uso:
 *   API_URL=http://localhost:3001 SMOKE_TOKEN=<jwt> SMOKE_TENANT=<uuid> npm run smoke-test
 *
 * Variáveis:
 *   API_URL      — Base URL da API (default: http://localhost:3001)
 *   SMOKE_TOKEN  — JWT de um usuário real (obtido via Supabase Auth)
 *   SMOKE_TENANT — UUID do tenant a usar nos testes
 */

import 'reflect-metadata';
import * as path from 'path';

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
} catch { /* opcional */ }

const API_URL      = process.env['API_URL']      ?? 'http://localhost:3001';
const SMOKE_TOKEN  = process.env['SMOKE_TOKEN']  ?? '';
const SMOKE_TENANT = process.env['SMOKE_TENANT'] ?? '';

let passed = 0;
let failed = 0;
let skipped = 0;

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

interface TestResult {
  name:    string;
  status:  'PASS' | 'FAIL' | 'SKIP';
  code?:   number;
  reason?: string;
}

const results: TestResult[] = [];

async function request(
  method: Method,
  path: string,
  body?: unknown,
  requireAuth = true,
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type':  'application/json',
  };
  if (requireAuth && SMOKE_TOKEN) {
    headers['Authorization']  = `Bearer ${SMOKE_TOKEN}`;
  }
  if (requireAuth && SMOKE_TENANT) {
    headers['X-Tenant-ID'] = SMOKE_TENANT;
  }

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-JSON */ }

  return { status: res.status, data };
}

async function test(
  name: string,
  fn: () => Promise<void>,
  skip = false,
): Promise<void> {
  if (skip) {
    console.log(`  ⊘  ${name}`);
    results.push({ name, status: 'SKIP', reason: 'credentials not provided' });
    skipped++;
    return;
  }
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    results.push({ name, status: 'PASS' });
    passed++;
  } catch (err) {
    console.log(`  ✗  ${name} — ${(err as Error).message}`);
    results.push({ name, status: 'FAIL', reason: (err as Error).message });
    failed++;
  }
}

function expect(val: unknown, label: string) {
  return {
    toBe(expected: unknown) {
      if (val !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
    },
    toBeOneOf(arr: unknown[]) {
      if (!arr.includes(val)) throw new Error(`${label}: expected one of ${JSON.stringify(arr)}, got ${JSON.stringify(val)}`);
    },
    toBeLessThan(n: number) {
      if (typeof val !== 'number' || val >= n) throw new Error(`${label}: expected < ${n}, got ${val}`);
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof val !== 'number' || val < n) throw new Error(`${label}: expected >= ${n}, got ${val}`);
    },
  };
}

// ── Testes ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   MUSIC OS 360 — Fase 20: Smoke Test Ponta a Ponta        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`  API_URL:      ${API_URL}`);
  console.log(`  SMOKE_TOKEN:  ${SMOKE_TOKEN ? SMOKE_TOKEN.substring(0, 20) + '…' : '(não definido)'}`);
  console.log(`  SMOKE_TENANT: ${SMOKE_TENANT || '(não definido)'}`);
  console.log('');

  const hasAuth   = !!SMOKE_TOKEN;
  const hasTenant = !!SMOKE_TENANT && !!SMOKE_TOKEN;

  // ── 1. Health check ────────────────────────────────────────────────────────
  await test('Health check responde 200', async () => {
    const r = await request('GET', '/health', undefined, false);
    expect(r.status, 'status').toBe(200);
    const d = r.data as { status: string };
    expect(d?.status, 'data.status').toBe('ok');
  });

  // ── 2. Auth — endpoint protegido sem token retorna 401 ────────────────────
  await test('Endpoint protegido sem token → 401', async () => {
    const r = await request('GET', '/artists', undefined, false);
    expect(r.status, 'status').toBeOneOf([401, 403]);
  });

  // ── 3. Analytics dashboard ────────────────────────────────────────────────
  await test('GET /analytics/dashboard com auth', async () => {
    const r = await request('GET', '/analytics/dashboard');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  // ── 4. Listar artistas ────────────────────────────────────────────────────
  await test('GET /artists → 200 com dados', async () => {
    const r = await request('GET', '/artists');
    expect(r.status, 'status').toBe(200);
    const d = r.data as { data: unknown[] };
    if (!Array.isArray(d?.data)) throw new Error('data.data não é array');
  }, !hasTenant);

  // ── 5. Criar artista ──────────────────────────────────────────────────────
  let createdArtistId: string | null = null;
  await test('POST /artists → 201', async () => {
    const r = await request('POST', '/artists', {
      nome_artistico: `Smoke Artist ${Date.now()}`,
      tipo: 'solo',
    });
    expect(r.status, 'status').toBeOneOf([201, 200]);
    const d = r.data as { id: string };
    if (!d?.id) throw new Error('Artista criado sem ID');
    createdArtistId = d.id;
  }, !hasTenant);

  // ── 6. Listar pipelines ───────────────────────────────────────────────────
  await test('GET /pipelines → 200', async () => {
    const r = await request('GET', '/pipelines');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  // ── 7. Listar contactos CRM ───────────────────────────────────────────────
  await test('GET /crm/contacts → 200', async () => {
    const r = await request('GET', '/crm/contacts');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  // ── 8. Listar campanhas ────────────────────────────────────────────────────
  await test('GET /campaigns → 200', async () => {
    const r = await request('GET', '/campaigns');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  // ── 9. Analytics revenue ──────────────────────────────────────────────────
  await test('GET /analytics/revenue → 200', async () => {
    const r = await request('GET', '/analytics/revenue?months=3');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  // ── 10. Submissão de formulário público (sem auth) ─────────────────────────
  await test('POST /forms/:id/submit público (sem auth) → 201 ou 404', async () => {
    const demoFormId = '10000000-0000-0000-0000-000000000050';
    const r = await request('POST', `/forms/${demoFormId}/submit`, {
      data: { name: 'Smoke Test User', email: 'smoke@test.example.com' },
    }, false);
    // 201 = criado, 404 = form não existe (ok em env sem seed)
    expect(r.status, 'status').toBeOneOf([201, 200, 404]);
  });

  // ── 11. Cross-tenant bloqueado ─────────────────────────────────────────────
  await test('X-Tenant-ID inválido → 403', async () => {
    const fakeTenantId = '00000000-0000-0000-0000-ffffffff0000';
    const res = await fetch(`${API_URL}/api/v1/artists`, {
      headers: {
        'Authorization':  `Bearer ${SMOKE_TOKEN}`,
        'X-Tenant-ID': fakeTenantId,
        'Content-Type':  'application/json',
      },
    });
    expect(res.status, 'status cross-tenant').toBeOneOf([403, 401, 404]);
  }, !hasAuth);

  // ── 12. Audit trail (activity logs) ────────────────────────────────────────
  await test('GET /activity-logs → 200', async () => {
    const r = await request('GET', '/activity-logs?limit=5');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  // ── 13. Conversations ─────────────────────────────────────────────────────
  await test('GET /conversations → 200', async () => {
    const r = await request('GET', '/conversations');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  // ── Cleanup: deletar artista criado no teste 5 ─────────────────────────────
  if (createdArtistId) {
    await test(`DELETE /artists/${createdArtistId} (cleanup)`, async () => {
      const r = await request('DELETE', `/artists/${createdArtistId}`);
      expect(r.status, 'status').toBeOneOf([200, 204]);
    }, !hasTenant);
  }

  // ── Resultado ─────────────────────────────────────────────────────────────
  console.log('\n── Resultado ───────────────────────────────────────────────\n');
  console.log(`  ✓ Passados  : ${passed}`);
  console.log(`  ✗ Falhados  : ${failed}`);
  console.log(`  ⊘ Ignorados : ${skipped} (sem credenciais)`);

  if (skipped > 0) {
    console.log('\n  Para executar testes autenticados, defina:');
    console.log('    API_URL=http://localhost:3001');
    console.log('    SMOKE_TOKEN=<jwt-supabase>');
    console.log('    SMOKE_TENANT=<uuid-tenant>');
  }

  if (failed === 0) {
    console.log('\n  ✓ SMOKE TEST PASSOU — plataforma operacional.\n');
  } else {
    console.log('\n  ✗ SMOKE TEST FALHOU — verifique as falhas acima.\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n[smoke-test] Erro fatal:', (err as Error).message);
  process.exit(1);
});
