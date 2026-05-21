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
import { PerformanceIndexes20260521000030 }           from './migrations/20260521000030_PerformanceIndexes';

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
  PerformanceIndexes20260521000030,
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

        const isProd = config.get('NODE_ENV') === 'production';

        const ds = new DataSource({
          type:           'postgres',
          url,
          entities:       ALL_ENTITIES,
          migrations:     [...ALL_MIGRATIONS],
          synchronize:    false,  // NUNCA true — schema gerido via migrations
          logging:        isProd ? ['error', 'warn'] : ['query', 'error', 'warn'],
          ssl:            isProd ? { rejectUnauthorized: false } : false,
          migrationsTableName: 'musicos360_migrations',
          // Connection pool tuning
          extra: {
            // Production: keep more connections alive; dev: minimal pool
            max:              isProd ? 20 : 5,
            min:              isProd ? 2  : 1,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
            // Statement timeout prevents runaway queries (30s prod, 60s dev)
            statement_timeout: isProd ? 30_000 : 60_000,
          },
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
