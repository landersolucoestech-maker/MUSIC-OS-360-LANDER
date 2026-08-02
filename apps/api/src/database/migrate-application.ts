/**
 * migrate-application.ts  (Parte 72 — desacoplamento de migrations gerenciadas externamente)
 *
 * Executor e verificador segmentados: operam apenas sobre migrations
 * classificadas como APPLICATION (ver migration-classification.ts),
 * deixando EXTERNAL_MANAGED/PRIVILEGED de fora sem abortar a fila inteira —
 * ao contrário de `dataSource.runMigrations()` puro, que para na primeira
 * falha mesmo quando a migration seguinte não depende da que falhou.
 *
 * Usa só API pública do TypeORM (MigrationExecutor.getPendingMigrations +
 * .insertMigration) — não reimplementa o SQL de tracking. O tracking só é
 * inserido depois do up() físico ter sucesso, dentro da mesma transação
 * (mesma semântica de `transaction: 'each'`): se o INSERT falhar, o up()
 * também é revertido.
 *
 * Funções puras recebendo um DataSource já pronto — sem I/O de conexão —
 * para serem testáveis sem depender do módulo de import-time-guard de
 * datasource.ts (mesmo padrão de bootstrap-tenant-zero.ts).
 */
import type { DataSource, Migration } from 'typeorm';
import { MigrationExecutor } from 'typeorm';
import { getMigrationCategory, MigrationCategory } from './migration-classification';

export interface MigrateApplicationResult {
  applied: string[];
  skippedNonApplication: string[];
}

export async function migrateApplication(dataSource: DataSource): Promise<MigrateApplicationResult> {
  const queryRunner = dataSource.createQueryRunner();
  const executor = new MigrationExecutor(dataSource, queryRunner);
  executor.transaction = 'each';

  try {
    const pending = await executor.getPendingMigrations();
    const applicationPending = pending.filter((m: Migration) => getMigrationCategory(m.name) === MigrationCategory.APPLICATION);
    const nonApplicationPending = pending.filter((m: Migration) => getMigrationCategory(m.name) !== MigrationCategory.APPLICATION);

    const applied: string[] = [];
    for (const migration of applicationPending) {
      if (!migration.instance) {
        throw new Error(`Migration "${migration.name}" sem instância carregada — verifique migrations/index.ts.`);
      }
      await queryRunner.startTransaction();
      try {
        await migration.instance.up(queryRunner);
        await executor.insertMigration(migration);
        await queryRunner.commitTransaction();
        applied.push(migration.name);
      } catch (err) {
        await queryRunner.rollbackTransaction().catch(() => { /* re-lançamos o erro original abaixo */ });
        throw new Error(`Migration APPLICATION "${migration.name}" falhou: ${(err as Error).message}`);
      }
    }

    return { applied, skippedNonApplication: nonApplicationPending.map((m: Migration) => m.name) };
  } finally {
    await queryRunner.release();
  }
}

export interface CheckApplicationResult {
  applicationPending: string[];
  nonApplicationPending: string[];
}

export async function checkApplication(dataSource: DataSource): Promise<CheckApplicationResult> {
  const queryRunner = dataSource.createQueryRunner();
  const executor = new MigrationExecutor(dataSource, queryRunner);

  try {
    const pending = await executor.getPendingMigrations();
    return {
      applicationPending: pending.filter((m: Migration) => getMigrationCategory(m.name) === MigrationCategory.APPLICATION).map((m) => m.name),
      nonApplicationPending: pending.filter((m: Migration) => getMigrationCategory(m.name) !== MigrationCategory.APPLICATION).map((m) => m.name),
    };
  } finally {
    await queryRunner.release();
  }
}
