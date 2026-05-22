#!/usr/bin/env ts-node
/**
 * scripts/smoke-test.ts
 *
 * Smoke test HTTP ponta a ponta.
 *
 * Uso:
 *   API_URL=http://localhost:3001 SMOKE_TOKEN=<jwt> SMOKE_TENANT=<uuid> pnpm smoke-test
 *
 * Sem SMOKE_TOKEN/SMOKE_TENANT, o script valida apenas disponibilidade pública
 * e ignora os testes autenticados.
 */

import 'reflect-metadata';
import * as path from 'path';

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
} catch { /* opcional */ }

const API_URL = (process.env['API_URL'] ?? 'http://localhost:3001').replace(/\/$/, '');
const SMOKE_TOKEN = process.env['SMOKE_TOKEN'] ?? '';
const SMOKE_TENANT = process.env['SMOKE_TENANT'] ?? '';

let passed = 0;
let failed = 0;
let skipped = 0;

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  code?: number;
  reason?: string;
}

const results: TestResult[] = [];

function apiPath(pathname: string): string {
  return `${API_URL}/api/v1${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    throw new Error(
      `API indisponivel em ${API_URL}. Inicie a API antes do smoke-test: pnpm --filter @music-os-360/api start:dev. Detalhe: ${(err as Error).message}`,
    );
  }
}

async function request(
  method: Method,
  pathname: string,
  body?: unknown,
  requireAuth = true,
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth && SMOKE_TOKEN) headers['Authorization'] = `Bearer ${SMOKE_TOKEN}`;
  if (requireAuth && SMOKE_TENANT) headers['X-Tenant-ID'] = SMOKE_TENANT;

  const res = await safeFetch(apiPath(pathname), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
}

async function test(name: string, fn: () => Promise<void>, skip = false): Promise<void> {
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
  };
}

async function healthCheck(): Promise<void> {
  const candidates = [`${API_URL}/api/v1/health`, `${API_URL}/health`];
  const errors: string[] = [];

  for (const url of candidates) {
    try {
      const res = await safeFetch(url);
      if (res.status === 200) return;
      errors.push(`${url} => ${res.status}`);
    } catch (err) {
      errors.push(`${url} => ${(err as Error).message}`);
    }
  }

  throw new Error(`health check falhou em todas as rotas: ${errors.join(' | ')}`);
}

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   MUSIC OS 360 — Smoke Test Ponta a Ponta                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`  API_URL:      ${API_URL}`);
  console.log(`  SMOKE_TOKEN:  ${SMOKE_TOKEN ? SMOKE_TOKEN.substring(0, 20) + '…' : '(não definido)'}`);
  console.log(`  SMOKE_TENANT: ${SMOKE_TENANT || '(não definido)'}`);
  console.log('');

  const hasAuth = !!SMOKE_TOKEN;
  const hasTenant = !!SMOKE_TENANT && !!SMOKE_TOKEN;

  await test('Health check responde 200', healthCheck);

  await test('Endpoint protegido sem token → 401/403', async () => {
    const r = await request('GET', '/artists', undefined, false);
    expect(r.status, 'status').toBeOneOf([401, 403]);
  });

  await test('GET /analytics/dashboard com auth', async () => {
    const r = await request('GET', '/analytics/dashboard');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  await test('GET /artists → 200 com dados', async () => {
    const r = await request('GET', '/artists');
    expect(r.status, 'status').toBe(200);
    const d = r.data as { data?: unknown[] };
    if (!Array.isArray(d?.data)) throw new Error('data.data não é array');
  }, !hasTenant);

  let createdArtistId: string | null = null;
  await test('POST /artists → 201', async () => {
    const r = await request('POST', '/artists', {
      nome_artistico: `Smoke Artist ${Date.now()}`,
      tipo: 'solo',
    });
    expect(r.status, 'status').toBeOneOf([200, 201]);
    const d = r.data as { id?: string; data?: { id?: string } };
    createdArtistId = d.id ?? d.data?.id ?? null;
    if (!createdArtistId) throw new Error('Artista criado sem ID');
  }, !hasTenant);

  await test('GET /pipelines → 200', async () => {
    const r = await request('GET', '/pipelines');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  await test('GET /crm/contacts → 200', async () => {
    const r = await request('GET', '/crm/contacts');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  await test('GET /campaigns → 200', async () => {
    const r = await request('GET', '/campaigns');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  await test('GET /analytics/revenue → 200', async () => {
    const r = await request('GET', '/analytics/revenue?months=3');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  await test('POST /forms/:id/submit público sem auth → 200/201/404', async () => {
    const demoFormId = '10000000-0000-0000-0000-000000000050';
    const r = await request('POST', `/forms/${demoFormId}/submit`, {
      data: { name: 'Smoke Test User', email: 'smoke@test.example.com' },
    }, false);
    expect(r.status, 'status').toBeOneOf([200, 201, 404]);
  });

  await test('X-Tenant-ID inválido → 401/403/404', async () => {
    const res = await safeFetch(apiPath('/artists'), {
      headers: {
        Authorization: `Bearer ${SMOKE_TOKEN}`,
        'X-Tenant-ID': '00000000-0000-0000-0000-ffffffff0000',
        'Content-Type': 'application/json',
      },
    });
    expect(res.status, 'status cross-tenant').toBeOneOf([401, 403, 404]);
  }, !hasAuth);

  await test('GET /activity-logs → 200', async () => {
    const r = await request('GET', '/activity-logs?limit=5');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  await test('GET /conversations → 200', async () => {
    const r = await request('GET', '/conversations');
    expect(r.status, 'status').toBe(200);
  }, !hasTenant);

  if (createdArtistId) {
    await test(`DELETE /artists/${createdArtistId} cleanup`, async () => {
      const r = await request('DELETE', `/artists/${createdArtistId}`);
      expect(r.status, 'status').toBeOneOf([200, 204]);
    }, !hasTenant);
  }

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
