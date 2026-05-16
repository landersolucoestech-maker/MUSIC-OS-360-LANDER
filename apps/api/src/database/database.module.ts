/**
 * database/database.module.ts
 *
 * TypeORM DataSource provider for MUSIC OS 360 API.
 * Provides the DATA_SOURCE token injectable across all services.
 *
 * Graceful standalone mode: if DATABASE_URL is not set the provider returns
 * null — services and guards check for this and bypass DB calls safely.
 *
 * Inclui MigrationValidatorService que verifica, no boot, se existem
 * migrations pendentes (fatal em produção, warn em dev).
 */

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';
import { MigrationValidatorService } from './migration-validator.service';

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
          synchronize:    false,  // NUNCA true — schema gerido via migrations
          logging:        config.get('NODE_ENV') !== 'production',
          ssl:            config.get('NODE_ENV') === 'production'
                            ? { rejectUnauthorized: false }
                            : false,
          migrationsTableName: 'musicos360_migrations',
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
    MigrationValidatorService,
  ],
  exports: [DATA_SOURCE, MigrationValidatorService],
})
export class DatabaseModule {}
