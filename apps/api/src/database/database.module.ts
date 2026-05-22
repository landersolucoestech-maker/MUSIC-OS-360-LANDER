/**
 * database/database.module.ts
 *
 * TypeORM DataSource provider for MUSIC OS 360 API.
 * Provides the DATA_SOURCE token injectable across all services.
 *
 * Graceful standalone mode: if DATABASE_URL is not set the provider returns
 * null â€” services and guards check for this and bypass DB calls safely.
 *
 * Inclui MigrationValidatorService que verifica, no boot, se existem
 * migrations pendentes (fatal em produÃ§Ã£o, warn em dev).
 */

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';
import { MigrationValidatorService } from './migration-validator.service';
import { DATA_SOURCE } from './database.tokens';
import { InitialSchema20240101000000 }                from './migrations/20240101000000_InitialSchema';
import { WorkflowTransitions20240601000001 }          from './migrations/20240601000001_WorkflowTransitions';
import { DomainEventLog20240602000001 }               from './migrations/20240602000001_DomainEventLog';
import { AuditLogEnterpriseColumns20260516000001 }    from './migrations/20260516000001_AuditLogEnterpriseColumns';
import { ActivityLogs20260520000002 }                 from './migrations/20260520000002_ActivityLogs';
import { SupabaseAuthColumnNames20260520000004 }      from './migrations/20260520000004_SupabaseAuthColumnNames';
import { RLSPolicies20260520000020 }                  from './migrations/20260520000020_RLSPolicies';
import { PerformanceIndexes20260521000030 }           from './migrations/20260521000030_PerformanceIndexes';
import { ConversationsAndForms20260521000040 }        from './migrations/20260521000040_ConversationsAndForms';
import { CrmPipelinesAnalytics20260521000050 }        from './migrations/20260521000050_CrmPipelinesAnalytics';
import { InventoryLicensingFinancialRules20260521000060 } from './migrations/20260521000060_InventoryLicensingFinancialRules';
import { FixRLSFallback20260522000001 }                from './migrations/20260522000001_FixRLSFallback';
import { ForceRLSFailClosed20260522000002 }            from './migrations/20260522000002_ForceRLSFailClosed';

// â”€â”€ Source of truth: TypeORM migrations only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  ConversationsAndForms20260521000040,
  CrmPipelinesAnalytics20260521000050,
  InventoryLicensingFinancialRules20260521000060,
  FixRLSFallback20260522000001,
  ForceRLSFailClosed20260522000002,
] as const;

// Re-export from tokens file â€” services should import from database.tokens
// to avoid circular deps (service â†’ module â†’ service).
export { DATA_SOURCE } from './database.tokens';

@Global()
@Module({
  providers: [
    {
      provide: DATA_SOURCE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<DataSource | null> => {
        const logger = new Logger('DatabaseModule');
        const isProd = config.get('NODE_ENV') === 'production';

        const url = config.get<string>('DATABASE_URL');

        if (!url) {
          if (isProd) {
            throw new Error('DATABASE_URL is required in production');
          }
          logger.warn(
            'DATABASE_URL nÃ£o configurado â€” DB desactivado (modo standalone)',
          );
          return null;
        }

        const ds = new DataSource({
          type:           'postgres',
          url,
          entities:       ALL_ENTITIES,
          migrations:     [...ALL_MIGRATIONS],
          synchronize:    false,  // NUNCA true â€” schema gerido via migrations
          logging:        isProd ? ['error', 'warn'] : ['query', 'error', 'warn'],
          ssl:            { rejectUnauthorized: false },  // Supabase requires SSL for all connections
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
          if (isProd) {
            logger.error('Fatal PostgreSQL connection failure in production', (err as Error).message);
            throw err;
          }
          logger.error('Falha ao conectar PostgreSQL â€” DB desactivado', (err as Error).message);
          return null;
        }
      },
    },
    MigrationValidatorService,
  ],
  exports: [DATA_SOURCE, MigrationValidatorService],
})
export class DatabaseModule {}
