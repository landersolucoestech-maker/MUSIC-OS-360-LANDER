/**
 * database/datasource.ts
 *
 * TypeORM DataSource standalone — usado pelo TypeORM CLI e scripts de migration.
 * NÃO importar dentro do NestJS (usa database.module.ts para injeção).
 *
 * Uso:
 *   npx typeorm migration:generate -d src/database/datasource.ts migrations/MeuNome
 *   npx typeorm migration:run     -d src/database/datasource.ts
 *   npx typeorm migration:revert  -d src/database/datasource.ts
 *   npx typeorm schema:log        -d src/database/datasource.ts
 */

import 'reflect-metadata';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';
import { ALL_MIGRATIONS } from './migrations/index';
import { assertDatabaseCommandEnv } from '../core/config/env.schema';

// ─── Carregar variáveis de ambiente se dotenv estiver disponível ───────────────
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv');
  // Try apps/api/.env first (2 levels up from src/database/), then root .env
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch { /* dotenv opcional */ }

const DATABASE_URL = process.env['DATABASE_URL'];

if (!DATABASE_URL) {
  console.error(
    '\n[MUSIC OS 360] DATABASE_URL não definida.\n' +
    'Defina a variável de ambiente DATABASE_URL antes de correr migrations.\n',
  );
  process.exit(1);
}

// Guard fail-closed em NÍVEL DE MÓDULO: qualquer importador (db-ops, seeds,
// verify-*, TypeORM CLI) é bloqueado ANTES de existir um DataSource se o alvo
// não for o autorizado para o NODE_ENV (dev → somente o branch DEV).
assertDatabaseCommandEnv('datasource');

const isProduction = process.env['NODE_ENV'] === 'production';
const dbSslDisabled = process.env['DB_SSL'] === 'false';

export const AppDataSource = new DataSource({
  type:        'postgres',
  url:          DATABASE_URL,
  entities:     ALL_ENTITIES,
  synchronize:  false,  // NUNCA true — só migrations versionadas
  logging:      !isProduction,
  ssl:          dbSslDisabled ? false : { rejectUnauthorized: false },

  // Was a glob (path.join(__dirname, 'migrations', '*.{ts,js}')) — replaced
  // with the shared ALL_MIGRATIONS registry (./migrations/index.ts) so this
  // and database.module.ts's runtime DataSource can never drift again (the
  // glob auto-discovered new files silently; database.module.ts's own
  // explicit list did not, which is exactly how the two fell ~50 migrations
  // out of sync before this fix). Adding a migration now means adding it to
  // migrations/index.ts — see apps/api/DATABASE.md.
  migrations: [...ALL_MIGRATIONS],
  migrationsTableName: 'musicos360_migrations',
  migrationsRun:       false,
});
