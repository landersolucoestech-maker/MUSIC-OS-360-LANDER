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
import { InitialSchema20240101000000 }                from './migrations/20240101000000_InitialSchema';
import { WorkflowTransitions20240601000001 }          from './migrations/20240601000001_WorkflowTransitions';
import { DomainEventLog20240602000001 }               from './migrations/20240602000001_DomainEventLog';
import { AuditLogEnterpriseColumns20260516000001 }    from './migrations/20260516000001_AuditLogEnterpriseColumns';
import { ActivityLogs20260520000002 }                 from './migrations/20260520000002_ActivityLogs';
import { SupabaseAuthColumnNames20260520000004 }      from './migrations/20260520000004_SupabaseAuthColumnNames';
import { RLSPolicies20260520000020 }                  from './migrations/20260520000020_RLSPolicies';

// ── Source of truth: TypeORM migrations only ─────────────────────────────────
// The apps/api/drizzle/ directory contains legacy SQL snapshots that are
// ARCHIVED and must not be run. TypeORM is the sole migration executor.
// Run migrations: pnpm --filter api db:migrate
const ALL_MIGRATIONS = [
  InitialSchema20240101000000,
  WorkflowTransitions20240601000001,
  DomainEventLog20240602000001,
  AuditLogEnterpriseColumns20260516000001,
  ActivityLogs20260520000002,
  SupabaseAuthColumnNames20260520000004,
  RLSPolicies20260520000020,
] as const;

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
          migrations:     [...ALL_MIGRATIONS],
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
