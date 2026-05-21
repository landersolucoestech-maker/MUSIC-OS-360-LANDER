#!/usr/bin/env ts-node
/**
 * scripts/db-ops.ts
 *
 * Wrapper TypeScript para operações de banco de dados.
 * Chamado pelos scripts npm: db:migrate, db:rollback, db:seed, db:reset, db:check, db:generate
 *
 * Uso (via npm run):
 *   npm run db:migrate              — aplica todas as migrations pendentes
 *   npm run db:rollback             — reverte a última migration
 *   npm run db:seed                 — executa seeds (dev/staging)
 *   npm run db:reset                — [dev only] dropa tudo + migrate + seed
 *   npm run db:check                — lista migrations pendentes/aplicadas
 *   npm run db:generate -- NomeMig  — gera nova migration baseada nas entidades
 */

import 'reflect-metadata';
import { AppDataSource } from '../src/database/datasource';

const COMMAND = process.argv[2];
const ARG     = process.argv[3];
const isProduction = process.env['NODE_ENV'] === 'production';

async function migrate(): Promise<void> {
  console.log('\n[db:migrate] Inicializando DataSource…');
  await AppDataSource.initialize();

  const pending = await AppDataSource.showMigrations();
  if (!pending) {
    console.log('[db:migrate] Nenhuma migration pendente. Schema está actualizado.\n');
    return;
  }

  console.log('[db:migrate] Aplicando migrations…');
  await AppDataSource.runMigrations({ transaction: 'each' });
  console.log('[db:migrate] Migrations aplicadas com sucesso.\n');
}

async function rollback(): Promise<void> {
  if (isProduction) {
    const confirm = process.env['CONFIRM_ROLLBACK'];
    if (confirm !== 'YES_I_KNOW_WHAT_I_AM_DOING') {
      console.error(
        '\n[db:rollback] PROIBIDO em produção sem confirmação explícita.\n' +
        'Defina CONFIRM_ROLLBACK=YES_I_KNOW_WHAT_I_AM_DOING para prosseguir.\n',
      );
      process.exit(1);
    }
  }

  console.log('\n[db:rollback] Revertendo última migration…');
  await AppDataSource.initialize();
  await AppDataSource.undoLastMigration({ transaction: 'each' });
  console.log('[db:rollback] Migration revertida.\n');
}

async function check(): Promise<void> {
  console.log('\n[db:check] Verificando estado das migrations…\n');
  await AppDataSource.initialize();

  const hasPending = await AppDataSource.showMigrations();
  if (!hasPending) {
    console.log('✓ Sem migrations pendentes — schema sincronizado.\n');
  } else {
    console.log('⚠ Existem migrations pendentes — execute: npm run db:migrate\n');
    process.exit(1);
  }
}

async function reset(): Promise<void> {
  if (isProduction) {
    console.error('\n[db:reset] PROIBIDO em produção. Use db:migrate.\n');
    process.exit(1);
  }

  console.log('\n[db:reset] Inicializando DataSource…');
  await AppDataSource.initialize();

  console.log('[db:reset] Dropando todas as tabelas (CASCADE)…');
  await AppDataSource.dropDatabase();

  console.log('[db:reset] Criando schema do zero…');
  await AppDataSource.runMigrations({ transaction: 'each' });

  console.log('[db:reset] Executando seeds…');
  // Importação dinâmica para evitar execução automática
  const { seedDefaultTenant } = await import('../src/database/seeds/01_default_tenant');
  const { seedAdminUser }     = await import('../src/database/seeds/02_admin_user');
  const tenant = await seedDefaultTenant(AppDataSource);
  await seedAdminUser(AppDataSource, tenant);

  console.log('\n[db:reset] Reset concluído (dev).\n');
}

async function seedOperational(): Promise<void> {
  const env   = process.env['NODE_ENV'] ?? 'development';
  const force = process.argv.includes('--force');

  if (env === 'production' && !force) {
    console.error('\n[seed:operational] Seeds em produção requerem --force.\n');
    process.exit(1);
  }

  console.log(`\n[seed:operational] Iniciando seed operacional (env=${env})…`);

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const { seedOperational: runSeed } = await import('../src/database/seeds/03_operational_seed');
  await runSeed(AppDataSource);

  console.log('[seed:operational] Concluído.\n');
}

async function generate(): Promise<void> {
  const name = ARG ?? 'AutoMigration';
  console.log(
    `\n[db:generate] Para gerar a migration '${name}', execute manualmente:\n` +
    `  npx typeorm migration:generate -d src/database/datasource.ts src/database/migrations/${Date.now()}_${name}\n` +
    '\nNota: ts-node deve estar instalado globalmente ou use npx ts-node.\n',
  );
  process.exit(0);
}

async function main(): Promise<void> {
  try {
    switch (COMMAND) {
      case 'migrate':            await migrate();              break;
      case 'rollback':           await rollback();             break;
      case 'check':              await check();                break;
      case 'reset':              await reset();                break;
      case 'generate':           await generate();             break;
      case 'seed:operational':   await seedOperational();      break;
      default:
        console.error(`\n[db-ops] Comando desconhecido: '${COMMAND ?? ''}'`);
        console.error('Comandos válidos: migrate | rollback | check | reset | generate | seed:operational\n');
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n[db-ops:${COMMAND}] Erro:`, (err as Error).message);
    if (process.env['NODE_ENV'] !== 'production') {
      console.error((err as Error).stack);
    }
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main();
