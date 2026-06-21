/**
 * scripts/rbac-roleid-backfill.ts  (PASSO 12-G)
 *
 * Dry-run / backfill controlado de org_members.role_id a partir de org_members.role.
 * - SEM fallback viewer: role sem correspondência NÃO é preenchida (reportada).
 * - Idempotente: só toca linhas com role_id IS NULL.
 * - Transacional e reversível (role_id volta a NULL; `role` nunca é alterado).
 *
 * Uso:
 *   MODE=dryrun      tsx scripts/rbac-roleid-backfill.ts   (default — não escreve)
 *   MODE=apply       tsx scripts/rbac-roleid-backfill.ts   (só aplica se dry-run 100% válido)
 *   MODE=rollback-sim tsx scripts/rbac-roleid-backfill.ts  (simula reversão; não escreve)
 */
import 'reflect-metadata';
import { AppDataSource } from '../src/database/datasource';

type Cls = 'OK' | 'ALIAS' | 'SEM_CORRESPONDENCIA' | 'CROSS_TENANT' | 'ARQUIVADA' | 'REMOVIDA' | 'ALIAS_INVALIDO';

// Detecta uma vez se a coluna roles.archived_at existe (DBs pré-Enterprise-006 não a têm).
async function hasArchivedColumn(ds: any): Promise<boolean> {
  const r = await ds.query(`SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='archived_at'`);
  return r.length > 0;
}

async function classify(ds: any, tenantId: string | null, role: string, archSel: string): Promise<{ roleId: string | null; cls: Cls }> {
  const rows = await ds.query(
    `SELECT id, tenant_id, canonical_role_id, ${archSel} AS archived_at, deleted_at FROM roles
     WHERE slug=$1 AND (tenant_id=$2 OR tenant_id IS NULL)
     ORDER BY (tenant_id=$2) DESC NULLS LAST LIMIT 1`, [role, tenantId]);
  if (rows.length === 0) {
    const other = await ds.query(`SELECT 1 FROM roles WHERE slug=$1 AND tenant_id IS NOT NULL AND tenant_id<>$2 AND deleted_at IS NULL LIMIT 1`, [role, tenantId]);
    return { roleId: null, cls: other.length ? 'CROSS_TENANT' : 'SEM_CORRESPONDENCIA' };
  }
  const r = rows[0];
  if (r.deleted_at) return { roleId: null, cls: 'REMOVIDA' };
  if (r.archived_at) return { roleId: null, cls: 'ARQUIVADA' };
  if (r.canonical_role_id) {
    const can = await ds.query(`SELECT id, ${archSel} AS archived_at, deleted_at FROM roles WHERE id=$1`, [r.canonical_role_id]);
    if (!can.length || can[0].deleted_at || can[0].archived_at) return { roleId: null, cls: 'ALIAS_INVALIDO' };
    return { roleId: can[0].id, cls: 'ALIAS' };
  }
  return { roleId: r.id, cls: 'OK' };
}

async function main() {
  const mode = process.env['MODE'] ?? 'dryrun';
  const ds = AppDataSource;
  await ds.initialize();
  const t0 = Date.now();

  const archSel = (await hasArchivedColumn(ds)) ? '"archived_at"' : 'NULL::timestamptz';
  const members = await ds.query(`SELECT id, tenant_id, role, role_id FROM org_members ORDER BY created_at`);
  const report: Array<{ membership_id: string; tenant_id: string; role: string; expected_role_id: string | null; cls: Cls; status: string }> = [];
  let valid = 0, invalid = 0, alreadyFilled = 0;

  for (const m of members) {
    const { roleId, cls } = await classify(ds, m.tenant_id, m.role, archSel);
    const filled = m.role_id != null;
    if (filled) alreadyFilled++;
    if (roleId) valid++; else invalid++;
    report.push({
      membership_id: m.id, tenant_id: m.tenant_id, role: m.role,
      expected_role_id: roleId, cls,
      status: filled ? 'JA_PREENCHIDO' : (roleId ? 'A_PREENCHER' : 'BLOQUEADO'),
    });
  }

  console.log(`\n=== ${mode.toUpperCase()} — org_members: ${members.length} ===`);
  console.table(report);
  const byCls: Record<string, number> = {};
  for (const r of report) byCls[r.cls] = (byCls[r.cls] ?? 0) + 1;
  console.log('classificações:', byCls, '| válidos:', valid, '| inválidos:', invalid, '| já preenchidos:', alreadyFilled);

  if (mode === 'rollback-sim') {
    const filled = report.filter((r) => r.status === 'JA_PREENCHIDO').length;
    console.log(`\n[ROLLBACK-SIM] registros com role_id preenchido que voltariam a NULL: ${filled}. Reversível: SIM. Dependências: nenhuma (role permanece fonte legada). NENHUMA ESCRITA.`);
    await ds.destroy(); return;
  }

  if (mode === 'apply') {
    if (invalid > 0) {
      console.error(`\n[APPLY ABORTADO] ${invalid} membership(s) sem role_id resolvível — dry-run não 100% válido. Backfill NÃO executado.`);
      await ds.destroy(); process.exit(2);
    }
    const qr = ds.createQueryRunner();
    await qr.connect(); await qr.startTransaction();
    try {
      let updated = 0;
      for (const r of report) {
        if (r.status === 'A_PREENCHER' && r.expected_role_id) {
          const res = await qr.query(`UPDATE org_members SET role_id=$1, updated_at=now() WHERE id=$2 AND role_id IS NULL RETURNING id`, [r.expected_role_id, r.membership_id]);
          // TypeORM (pg) retorna [rows, affected]; contamos linhas efetivamente retornadas pelo RETURNING.
          const rows = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res;
          updated += Array.isArray(rows) ? rows.length : 0;
        }
      }
      await qr.commitTransaction();
      console.log(`\n[APPLY] backfill commit OK — linhas atualizadas: ${updated} (idempotente: role_id IS NULL).`);
    } catch (e) {
      await qr.rollbackTransaction();
      console.error('[APPLY] rollback por erro:', (e as Error).message); process.exitCode = 1;
    } finally { await qr.release(); }
  } else {
    console.log('\n[DRY-RUN] nenhuma escrita realizada.');
  }

  console.log(`tempo: ${Date.now() - t0}ms`);
  await ds.destroy();
}
main().catch((e) => { console.error('ERRO:', e?.message ?? e); process.exit(1); });
