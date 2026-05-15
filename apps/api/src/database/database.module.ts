/**
 * database/database.module.ts
 *
 * TypeORM DataSource provider for MUSIC OS 360 API.
 * Provides the DATA_SOURCE token injectable across all services.
 *
 * Graceful standalone mode: if DATABASE_URL is not set the provider returns
 * null — services and guards check for this and bypass DB calls safely.
 */

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';

export const DATA_SOURCE = Symbol('DATA_SOURCE');

@Global()
@Module({
  providers: [
    {
      provide: DATA_SOURCE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<DataSource | null> => {
        const logger = new Logger('DatabaseModule');

        const url = config.get<string>('DATABASE_URL');

        if (!url) {
          logger.warn(
            'DATABASE_URL não configurado — DB desactivado (modo standalone)',
          );
          return null;
        }

        const ds = new DataSource({
          type:           'postgres',
          url,
          entities:       ALL_ENTITIES,
          synchronize:    false,
          logging:        config.get('NODE_ENV') !== 'production',
          ssl:            config.get('NODE_ENV') === 'production'
                            ? { rejectUnauthorized: false }
                            : false,
        });

        try {
          await ds.initialize();
          logger.log('PostgreSQL conectado via TypeORM');
          return ds;
        } catch (err) {
          logger.error('Falha ao conectar PostgreSQL — DB desactivado', (err as Error).message);
          return null;
        }
      },
    },
  ],
  exports: [DATA_SOURCE],
})
export class DatabaseModule {}
