/**
 * database/database.module.ts
 *
 * Módulo Drizzle ORM com PostgreSQL padrão (node-postgres / pg).
 * Fornece o token DRIZZLE_DB injectável em todos os repositórios.
 *
 * Ligação: DATABASE_URL (postgres://...)
 */

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE_DB = Symbol('DRIZZLE_DB');

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('DatabaseModule');

        const url = config.get<string>('DATABASE_URL');

        if (!url) {
          logger.warn(
            'DATABASE_URL não configurado — DB desactivado (modo standalone)',
          );
          return null;
        }

        const pool = new Pool({ connectionString: url });
        const db   = drizzle(pool, { schema });

        logger.log('PostgreSQL conectado via Drizzle ORM (node-postgres)');
        return db;
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
