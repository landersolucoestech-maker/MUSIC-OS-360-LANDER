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

// ─── Carregar variáveis de ambiente se dotenv estiver disponível ───────────────
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  // Try apps/api/.env first (2 levels up from src/database/), then root .env
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch { /* dotenv opcional */ }

const DATABASE_URL = process.env['DATABASE_URL'];

if (!DATABASE_URL) {
  console.error(
    '\n[MUSIC OS 360] DATABASE_URL não definida.\n' +
    'Defina DATABASE_URL como Secret do Replit antes de correr migrations.\n',
  );
  process.exit(1);
}

const isProduction = process.env['NODE_ENV'] === 'production';

export const AppDataSource = new DataSource({
  type:        'postgres',
  url:          DATABASE_URL,
  entities:     ALL_ENTITIES,
  synchronize:  false,  // NUNCA true — só migrations versionadas
  logging:      !isProduction,
  ssl:          { rejectUnauthorized: false },  // Supabase requires SSL for all connections

  migrations: [
    path.join(__dirname, 'migrations', '*.{ts,js}'),
  ],
  migrationsTableName: 'musicos360_migrations',
  migrationsRun:       false,
});
