/**
 * seeds/index.ts
 *
 * Runner de seeds — executa todos os seeds em ordem.
 * Invocado pelo script npm run db:seed.
 *
 * Flags:
 *   --force   Executa mesmo em NODE_ENV=production (requer confirmação explícita)
 */

import 'reflect-metadata';
import { AppDataSource } from '../datasource';
import { seedDefaultTenant } from './01_default_tenant';
import { seedAdminUser }     from './02_admin_user';

async function run(): Promise<void> {
  const env    = process.env['NODE_ENV'] ?? 'development';
  const force  = process.argv.includes('--force');

  if (env === 'production' && !force) {
    console.error(
      '\n[MUSIC OS 360] Seeds em produção requerem a flag --force.\n' +
      'Exemplo: npm run db:seed -- --force\n' +
      'ATENÇÃO: seeds sobrescrevem dados existentes.\n',
    );
    process.exit(1);
  }

  console.log(`\n[MUSIC OS 360] Iniciando seeds (env=${env})…`);

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('  ✓ DataSource inicializado');
  }

  try {
    const tenant = await seedDefaultTenant(AppDataSource);
    await seedAdminUser(AppDataSource, tenant);

    console.log('\n[MUSIC OS 360] Seeds concluídos com sucesso.\n');
  } catch (err) {
    console.error('\n[MUSIC OS 360] Erro durante seeds:', (err as Error).message);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

run();
