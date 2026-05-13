/**
 * database/database.module.ts
 *
 * Módulo Drizzle ORM com Neon PostgreSQL (serverless).
 * Fornece o token DRIZZLE_DB injectável em todos os repositórios.
 *
 * Ligação: NEON_DATABASE_URL (pooler, ws)
 * Ligação directa (migrations): NEON_DATABASE_DIRECT_URL
 */

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
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

        const url =
          config.get<string>('NEON_DATABASE_URL') ??
          config.get<string>('DATABASE_URL');

        if (!url) {
          logger.warn(
            'NEON_DATABASE_URL não configurado — DB desactivado (modo standalone)',
          );
          return null;
        }

        const sql = neon(url);
        const db = drizzle(sql, { schema });

        logger.log('Neon PostgreSQL conectado via Drizzle ORM');
        return db;
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
