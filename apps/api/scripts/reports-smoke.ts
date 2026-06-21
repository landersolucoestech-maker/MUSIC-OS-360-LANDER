/**
 * scripts/reports-smoke.ts  ·  FASE 2.4
 *
 * Smoke HTTP REAL da Central de Relatórios contra uma API JÁ EM EXECUÇÃO
 * (real NestJS + PostgreSQL + JWT + Tenant + RBAC). Obtém JWT real via
 * /dev-auth/token e exercita export (JSON/CSV/XLSX), import/validate,
 * import/commit (+ create-only + rollback). Sai com código ≠ 0 em qualquer falha.
 *
 * Pré-requisito: API rodando (ex.: node dist/apps/api/src/main.js).
 * Uso: API_URL=http://localhost:3001 npm run reports:smoke
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';

const API = (process.env['API_URL'] ?? 'http://localhost:3001').replace(/\/$/, '');
const TAG = `HTTPSMOKE_${Date.now()}`;
let failures = 0;
function check(name: string, cond: boolean, detail = ''): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : ' ' + detail}`);
  if (!cond) failures++;
}
async function api(method: string, p: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(`${API}/api/v1${p}`, {
    method, headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') ?? '';
  const data = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
  return { status: res.status, data, headers: res.headers };
}

async function main(): Promise<void> {
  console.log(`\n[reports:smoke] API=${API}`);
  const envText = fs.existsSync(path.resolve(process.cwd(), '.env')) ? fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8') : '';
  const url = (envText.match(/^DATABASE_URL=(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
  const ds = await new DataSource({ type: 'postgres', url, entities: ALL_ENTITIES, synchronize: false, logging: false, ssl: false }).initialize();

  try {
    const tok = await api('GET', '/dev-auth/token');
    const payload = (tok.data as any)?.data ?? tok.data;
    const token = payload?.token;
    const tenantId = payload?.orgId ?? payload?.tenantId;
    check('dev-auth → JWT + tenant', !!token && !!tenantId, `status=${tok.status}`);
    const H = { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId };

    const ej = await api('GET', '/reports/entities/artists/export?format=json', H);
    check('export JSON → 200 + label pt-BR', ej.status === 200 && Array.isArray((ej.data as any)?.data) && (ej.data as any)?.metadata?.columns?.some((c: any) => c.label === 'Nome artístico'), `status=${ej.status}`);
    const ec = await api('GET', '/reports/entities/artists/export?format=csv', H);
    check('export CSV → 200 + cabeçalho pt-BR', ec.status === 200 && String(ec.data).includes('Nome artístico') && !String(ec.data).includes('nome_artistico'), `status=${ec.status}`);
    const ex = await fetch(`${API}/api/v1/reports/entities/artists/export?format=xlsx`, { headers: H });
    check('export XLSX → 200 + binário', ex.status === 200 && (await ex.arrayBuffer()).byteLength > 0, `status=${ex.status}`);

    const bad = await api('GET', '/reports/entities/artists/export?format=json&columns=id', H);
    check('coluna fora do contrato → 400', bad.status === 400, `status=${bad.status}`);
    const noTok = await api('GET', '/reports/entities/artists/export?format=json');
    check('sem token → 401/403', [401, 403].includes(noTok.status), `status=${noTok.status}`);

    // O TransformInterceptor global pode envelopar o corpo em { data: ... }.
    const unwrap = (d: any) => (d && typeof d === 'object' && 'data' in d && !Array.isArray(d) && !('validRows' in d) && !('importedRows' in d) ? d.data : d);

    const vName = `${TAG}_V`;
    const v = await api('POST', '/reports/entities/artists/import/validate', H, { filename: 'a.csv', content: `Nome artístico\n${vName}` });
    check('import validate → validRows=1', [200, 201].includes(v.status) && unwrap(v.data)?.validRows === 1, `status=${v.status}`);
    check('validate NÃO persiste', (await ds.query(`SELECT COUNT(*)::int c FROM artists WHERE nome_artistico=$1`, [vName]))[0].c === 0);

    const cName = `${TAG}_C`;
    const c1 = await api('POST', '/reports/entities/artists/import/commit', H, { filename: 'a.csv', content: `Nome artístico\n${cName}` });
    check('import commit → importedRows=1', unwrap(c1.data)?.importedRows === 1, `status=${c1.status}`);
    check('commit persiste tenant correto', (await ds.query(`SELECT tenant_id FROM artists WHERE nome_artistico=$1`, [cName]))[0]?.tenant_id === tenantId);

    const c2 = await api('POST', '/reports/entities/artists/import/commit', H, { filename: 'a.csv', content: `Nome artístico\n${cName}` });
    check('create-only: duplicado rejeitado', unwrap(c2.data)?.importedRows === 0 && (unwrap(c2.data)?.errors ?? []).some((e: string) => /já existe/i.test(e)));

    const rName = `${TAG}_R`;
    await api('POST', '/reports/entities/artists/import/commit', H, { filename: 'a.csv', content: `Nome artístico\n${rName}\n${cName}` });
    check('rollback total: novo NÃO inserido', (await ds.query(`SELECT COUNT(*)::int c FROM artists WHERE nome_artistico=$1`, [rName]))[0].c === 0);
  } finally {
    await ds.query(`DELETE FROM artists WHERE nome_artistico LIKE $1`, [`${TAG}%`]).catch(() => {});
    await ds.destroy().catch(() => {});
  }
  console.log(`\n[reports:smoke] ${failures === 0 ? 'OK — todos os fluxos passaram' : `FALHOU — ${failures} falha(s)`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error('[reports:smoke] erro fatal:', e?.message ?? e); process.exit(1); });
