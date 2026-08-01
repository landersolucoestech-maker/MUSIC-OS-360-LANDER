/**
 * bootstrap-tenant-zero.cli.ts
 *
 * Entry point de `npm run db:bootstrap:tenant-zero`. Separado de
 * `bootstrap-tenant-zero.ts` de propósito: aquele módulo é puro (só recebe
 * um `DataSource` já pronto) para ser testável em unit tests sem abrir
 * conexão nenhuma; este arquivo é quem importa `./datasource`
 * (que valida env/DATABASE_URL no import — ver datasource.ts:43) e decide
 * quando abrir/fechar a conexão real.
 */
import 'reflect-metadata';
import { AppDataSource } from './datasource';
import { extractSupabaseRef, SUPABASE_MAIN_REF } from '../core/config/env.schema';
import { bootstrapTenantZero } from './bootstrap-tenant-zero';

async function run(): Promise<void> {
  const env = process.env['NODE_ENV'] ?? 'development';
  const force = process.argv.includes('--force');

  if (env === 'production' && !force) {
    console.error(
      '\n[MUSIC OS 360] Bootstrap do tenant-zero em produção requer a flag --force ' +
      'e TENANT_ZERO_OWNER_AUTH_USER_ID/TENANT_ZERO_OWNER_EMAIL.\n',
    );
    process.exit(1);
  }

  const targetRef = extractSupabaseRef(process.env['DATABASE_URL']);
  if (targetRef === SUPABASE_MAIN_REF) {
    console.error(
      '\n[MUSIC OS 360] Recusado: DATABASE_URL aponta para a branch MAIN do Supabase. ' +
      'O bootstrap do tenant-zero nunca pode rodar contra MAIN.\n',
    );
    process.exit(1);
  }

  console.log(`\n[MUSIC OS 360] Bootstrap do tenant-zero — LANDER RECORDS (env=${env})…`);

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  try {
    const result = await bootstrapTenantZero(AppDataSource);
    console.log(
      result.created
        ? `  ✓ LANDER RECORDS criada — org=${result.orgId} tenant=${result.tenantId}`
        : `  ✓ LANDER RECORDS já existia e foi validada — org=${result.orgId} tenant=${result.tenantId}`,
    );
  } catch (err) {
    console.error('\n[MUSIC OS 360] Erro no bootstrap do tenant-zero:', (err as Error).message);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

run();
