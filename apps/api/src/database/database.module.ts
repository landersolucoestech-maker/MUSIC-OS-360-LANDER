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
import { DatabaseContextService } from './database-context.service';
import { makeTenantAwareDataSource } from './tenant-als';
import { TenantBootstrapResolver } from './tenant-bootstrap.resolver';
import {
  DATA_SOURCE,
  ADMIN_DATA_SOURCE,
  PROVISIONING_DATA_SOURCE,
} from './database.tokens';
import { InitialSchema20240101000000 }                from './migrations/20240101000000_InitialSchema';
import { WorkflowTransitions20240601000001 }          from './migrations/20240601000001_WorkflowTransitions';
import { DomainEventLog20240602000001 }               from './migrations/20240602000001_DomainEventLog';
import { AuditLogEnterpriseColumns20260516000001 }    from './migrations/20260516000001_AuditLogEnterpriseColumns';
import { ActivityLogs20260520000002 }                 from './migrations/20260520000002_ActivityLogs';
import { SupabaseAuthColumnNames20260520000004 }      from './migrations/20260520000004_SupabaseAuthColumnNames';
import { RLSPolicies20260520000020 }                  from './migrations/20260520000020_RLSPolicies';
import { PerformanceIndexes20260521000030 }           from './migrations/20260521000030_PerformanceIndexes';
import { ConversationsAndForms20260521000040 }        from './migrations/20260521000040_ConversationsAndForms';
import { CrmPipelinesAnalytics20260521000050 }         from './migrations/20260521000050_CrmPipelinesAnalytics';
import { InventoryLicensingFinancialRules20260521000060 } from './migrations/20260521000060_InventoryLicensingFinancialRules';
import { FixRLSFallback20260522000001 }                from './migrations/20260522000001_FixRLSFallback';
import { ForceRLSFailClosed20260522000002 }            from './migrations/20260522000002_ForceRLSFailClosed';
import { AddArtistIdToWorks20260523000001 }            from './migrations/20260523000001_AddArtistIdToWorks';
import { FinancialCategoriesEnterprise20260526000002 } from './migrations/20260526000002_FinancialCategoriesEnterprise';
import { FinancialCategoryRulesDynamic20260526000003 } from './migrations/20260526000003_FinancialCategoryRulesDynamic';
import { AudiovisualPhase120260527000003 }             from './migrations/20260527000003_AudiovisualPhase1';
import { AudiovisualTasks20260527000004 }              from './migrations/20260527000004_AudiovisualTasks';
import { AudiovisualAssets20260527000005 }             from './migrations/20260527000005_AudiovisualAssets';
import { LeadsContactsOperationalRefactor20260528000002 } from './migrations/20260528000002_LeadsContactsOperationalRefactor';
import { MarketingProjects20260529000001 }              from './migrations/20260529000001_MarketingProjects';
import { MarketingProjectAutomation20260529000002 }     from './migrations/20260529000002_MarketingProjectAutomation';
import { MarketingStrategyStructure20260529000003 }     from './migrations/20260529000003_MarketingStrategyStructure';
import { MarketingAssets20260529000004 }                from './migrations/20260529000004_MarketingAssets';
import { RegistryFieldsPhase120260601000001 }          from './migrations/20260601000001_RegistryFieldsPhase1';
import { RegistryRightsHoldersIdentifiers20260601000002 } from './migrations/20260601000002_RegistryRightsHoldersIdentifiers';
import { SocietyIntegration20260601000003 }            from './migrations/20260601000003_SocietyIntegration';
import { MarketingContentPublishing20260602000001 }    from './migrations/20260602000001_MarketingContentPublishing';
import { CustomerCareConversationExtensions20260604000001 } from './migrations/20260604000001_CustomerCareConversationExtensions';
import { AddGenreToPhonograms20260605000001 }          from './migrations/20260605000001_AddGenreToPhonograms';
import { SkillsAndCentralAssets20260607000001 }         from './migrations/20260607000001_SkillsAndCentralAssets';
import { WorkflowExecutions20260607000002 }             from './migrations/20260607000002_WorkflowExecutions';
import { MusicChatAutomation20260609000001 }            from './migrations/20260609000001_MusicChatAutomation';
import { CreatePermissionsCatalog20260610000001 }       from './migrations/20260610000001_CreatePermissionsCatalog';
import { CreateRolesAndRolePermissions20260610000002 }  from './migrations/20260610000002_CreateRolesAndRolePermissions';
import { CreateOrgStructure20260610000003 }             from './migrations/20260610000003_CreateOrgStructure';
import { AlterOrgMembersAddRbacColumns20260610000004 }  from './migrations/20260610000004_AlterOrgMembersAddRbacColumns';
import { CreateMembershipJobFunctions20260610000005 }   from './migrations/20260610000005_CreateMembershipJobFunctions';
import { BackfillOrgMembersRoleId20260610000006 }       from './migrations/20260610000006_BackfillOrgMembersRoleId';
import { EnableRlsOnRbacTables20260610000007 }          from './migrations/20260610000007_EnableRlsOnRbacTables';
import { PortableRlsTenantContext20260612000001 }       from './migrations/20260612000001_PortableRlsTenantContext';
import { FixAppJwtInsufficientPrivilege20260612000002 } from './migrations/20260612000002_FixAppJwtInsufficientPrivilege';
import { CreateArtistPlatformProfiles20260612000003 }   from './migrations/20260612000003_CreateArtistPlatformProfiles';
import { CreateReleaseWorksJoinTable20260613000001 }    from './migrations/20260613000001_CreateReleaseWorksJoinTable';
import { AddMissingSafeColumns20260613000002 }          from './migrations/20260613000002_AddMissingSafeColumns';
import { AddLeadsPipelineStage20260613000003 }          from './migrations/20260613000003_AddLeadsPipelineStage';
import { AddDomainForeignKeys20260613000004 }           from './migrations/20260613000004_AddDomainForeignKeys';
import { AddHrEmployeeForeignKeys20260613000005 }       from './migrations/20260613000005_AddHrEmployeeForeignKeys';
import { RlsPoliciesInventoryLicensesFinancial20260613000006 } from './migrations/20260613000006_RlsPoliciesInventoryLicensesFinancial';
import { RlsPoliciesAssets20260613000007 }              from './migrations/20260613000007_RlsPoliciesAssets';
import { RlsPoliciesAudiovisualSocietyMarketing20260613000008 } from './migrations/20260613000008_RlsPoliciesAudiovisualSocietyMarketing';
import { RlsPolicyReleaseWorks20260613000009 }          from './migrations/20260613000009_RlsPolicyReleaseWorks';
import { RlsPoliciesMusicChatAutomation20260613000010 } from './migrations/20260613000010_RlsPoliciesMusicChatAutomation';
import { WorkflowExecutionTenantNotNull20260613000011 } from './migrations/20260613000011_WorkflowExecutionTenantNotNull';
import { RlsPoliciesSkillRunsWorkflowExecutions20260613000012 } from './migrations/20260613000012_RlsPoliciesSkillRunsWorkflowExecutions';
import { RlsPoliciesSkillWorkflowLogs20260613000013 } from './migrations/20260613000013_RlsPoliciesSkillWorkflowLogs';
import { HarmonizeRawUuidPolicies20260613000014 } from './migrations/20260613000014_HarmonizeRawUuidPolicies';
import { HarmonizeRawTextPolicies20260613000015 } from './migrations/20260613000015_HarmonizeRawTextPolicies';
import { NotificationSettings20260613000016 } from './migrations/20260613000016_NotificationSettings';
import { HardenRbacAclDefaults20260613000017 } from './migrations/20260613000017_HardenRbacAclDefaults';
import { CreateUsersProjection20260614000000 } from './migrations/20260614000000_CreateUsersProjection';
import { CreatePermissionGroups20260614000001 } from './migrations/20260614000001_CreatePermissionGroups';
import { ExtendPermissionsCatalog20260614000002 } from './migrations/20260614000002_ExtendPermissionsCatalog';
import { CreatePermissionAliases20260614000003 } from './migrations/20260614000003_CreatePermissionAliases';
import { CreateRoleTemplates20260614000004 } from './migrations/20260614000004_CreateRoleTemplates';
import { CreatePermissionDependenciesAndConflicts20260614000005 } from './migrations/20260614000005_CreatePermissionDependenciesAndConflicts';
import { ExtendRolesForEnterpriseRbac20260614000006 } from './migrations/20260614000006_ExtendRolesForEnterpriseRbac';
import { CreateRoleInheritance20260614000007 } from './migrations/20260614000007_CreateRoleInheritance';
import { CreateRbacDecisionLogs20260614000008 } from './migrations/20260614000008_CreateRbacDecisionLogs';
import { CreateTenantInvitations20260620000001 } from './migrations/20260620000001_CreateTenantInvitations';
import { HardenContactsLeadUploadsRls20260620000002 } from './migrations/20260620000002_HardenContactsLeadUploadsRls';
import { HardenRoleInheritanceFunctions20260620000003 } from './migrations/20260620000003_HardenRoleInheritanceFunctions';
import { ReconcileOperationalSchema20260620000004 } from './migrations/20260620000004_ReconcileOperationalSchema';
import { ForceRLSOperationalTables20260620000005 } from './migrations/20260620000005_ForceRLSOperationalTables';
import { CreateRbacErrorLogs20260621000001 } from './migrations/20260621000001_CreateRbacErrorLogs';
import { HardenSupabaseDataApiSurface20260620000006 } from './migrations/20260620000006_HardenSupabaseDataApiSurface';
import { BillingEnforcement20260701000001 } from './migrations/20260701000001_BillingEnforcement';
import { BillingPlans20260701000002 } from './migrations/20260701000002_BillingPlans';
import { BillingRlsHardening20260701000003 } from './migrations/20260701000003_BillingRlsHardening';
import { ReconcileInventoryLicensesColumns20260705000001 } from './migrations/20260705000001_ReconcileInventoryLicensesColumns';
import { RemoveArtistBannerVideoFields20260705000002 } from './migrations/20260705000002_RemoveArtistBannerVideoFields';
import { RemoveDeadStructuresD1D8_20260705000003 } from './migrations/20260705000003_RemoveDeadStructuresD1D8';

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
  ConversationsAndForms20260521000040,
  CrmPipelinesAnalytics20260521000050,
  InventoryLicensingFinancialRules20260521000060,
  FixRLSFallback20260522000001,
  ForceRLSFailClosed20260522000002,
  AddArtistIdToWorks20260523000001,
  FinancialCategoriesEnterprise20260526000002,
  FinancialCategoryRulesDynamic20260526000003,
  AudiovisualPhase120260527000003,
  AudiovisualTasks20260527000004,
  AudiovisualAssets20260527000005,
  LeadsContactsOperationalRefactor20260528000002,
  MarketingProjects20260529000001,
  MarketingProjectAutomation20260529000002,
  MarketingStrategyStructure20260529000003,
  MarketingAssets20260529000004,
  RegistryFieldsPhase120260601000001,
  RegistryRightsHoldersIdentifiers20260601000002,
  SocietyIntegration20260601000003,
  MarketingContentPublishing20260602000001,
  CustomerCareConversationExtensions20260604000001,
  AddGenreToPhonograms20260605000001,
  SkillsAndCentralAssets20260607000001,
  WorkflowExecutions20260607000002,
  MusicChatAutomation20260609000001,
  CreatePermissionsCatalog20260610000001,
  CreateRolesAndRolePermissions20260610000002,
  CreateOrgStructure20260610000003,
  AlterOrgMembersAddRbacColumns20260610000004,
  CreateMembershipJobFunctions20260610000005,
  BackfillOrgMembersRoleId20260610000006,
  EnableRlsOnRbacTables20260610000007,
  PortableRlsTenantContext20260612000001,
  FixAppJwtInsufficientPrivilege20260612000002,
  CreateArtistPlatformProfiles20260612000003,
  CreateReleaseWorksJoinTable20260613000001,
  AddMissingSafeColumns20260613000002,
  AddLeadsPipelineStage20260613000003,
  AddDomainForeignKeys20260613000004,
  AddHrEmployeeForeignKeys20260613000005,
  RlsPoliciesInventoryLicensesFinancial20260613000006,
  RlsPoliciesAssets20260613000007,
  RlsPoliciesAudiovisualSocietyMarketing20260613000008,
  RlsPolicyReleaseWorks20260613000009,
  RlsPoliciesMusicChatAutomation20260613000010,
  WorkflowExecutionTenantNotNull20260613000011,
  RlsPoliciesSkillRunsWorkflowExecutions20260613000012,
  RlsPoliciesSkillWorkflowLogs20260613000013,
  HarmonizeRawUuidPolicies20260613000014,
  HarmonizeRawTextPolicies20260613000015,
  NotificationSettings20260613000016,
  HardenRbacAclDefaults20260613000017,
  CreateUsersProjection20260614000000,
  CreatePermissionGroups20260614000001,
  ExtendPermissionsCatalog20260614000002,
  CreatePermissionAliases20260614000003,
  CreateRoleTemplates20260614000004,
  CreatePermissionDependenciesAndConflicts20260614000005,
  ExtendRolesForEnterpriseRbac20260614000006,
  CreateRoleInheritance20260614000007,
  CreateRbacDecisionLogs20260614000008,
  CreateTenantInvitations20260620000001,
  HardenContactsLeadUploadsRls20260620000002,
  HardenRoleInheritanceFunctions20260620000003,
  ReconcileOperationalSchema20260620000004,
  ForceRLSOperationalTables20260620000005,
  HardenSupabaseDataApiSurface20260620000006,
  CreateRbacErrorLogs20260621000001,
  BillingEnforcement20260701000001,
  BillingPlans20260701000002,
  BillingRlsHardening20260701000003,
  ReconcileInventoryLicensesColumns20260705000001,
  RemoveArtistBannerVideoFields20260705000002,
  RemoveDeadStructuresD1D8_20260705000003,
] as const;

// Re-export from tokens file — services should import from database.tokens
// to avoid circular deps (service → module → service).
export {
  DATA_SOURCE,
  ADMIN_DATA_SOURCE,
  PROVISIONING_DATA_SOURCE,
} from './database.tokens';

/**
 * Factory for the ADMIN_DATA_SOURCE provider — a read-only owner connection
 * for cross-tenant enumeration and request identity bootstrap. It consults ONLY DATABASE_URL and
 * deliberately never reads APP_DATABASE_URL or DATABASE_SESSION_CONTEXT_ENABLED,
 * so enumeration always sees every tenant regardless of the session-context flag.
 */
export async function createAdminDataSource(config: ConfigService): Promise<DataSource | null> {
  const logger = new Logger('DatabaseModule');
  const isProd = config.get('NODE_ENV') === 'production';

  // Always the owner connection — never APP_DATABASE_URL, never flag-gated.
  const url = config.get<string>('DATABASE_URL');
  if (!url) {
    if (isProd) {
      throw new Error('DATABASE_URL is required in production');
    }
    logger.warn('DATABASE_URL não configurado — ADMIN_DATA_SOURCE desativado (modo standalone)');
    return null;
  }

  const dbSslDisabled = config.get<string>('DB_SSL') === 'false';

  const adminDs = new DataSource({
    type:                'postgres',
    url,
    entities:            ALL_ENTITIES,
    // Metadata apenas (nunca executa: migrationsRun=false). Permite ao
    // MigrationValidatorService rodar showMigrations() na conexão owner —
    // musicos360_migrations tem RLS sem policy e fica invisível ao app role.
    migrations:          [...ALL_MIGRATIONS],
    synchronize:         false,
    migrationsRun:       false,
    logging:             isProd ? ['error', 'warn'] : ['error', 'warn'],
    ssl:                 dbSslDisabled ? false : { rejectUnauthorized: false },
    migrationsTableName: 'musicos360_migrations',
    // Reduced pool — enumeration only.
    extra: {
      max:               2,
      min:               0,
      idleTimeoutMillis: 30_000,
    },
  });

  try {
    await adminDs.initialize();
    logger.log('ADMIN_DATA_SOURCE conectado (owner, bootstrap/enumeração read-only)');
    return adminDs;
  } catch (err) {
    const message = err instanceof Error ? (err.message || err.name) : String(err);
    logger.error('Falha ao inicializar ADMIN_DATA_SOURCE', message);
    throw new Error(`ADMIN_DATA_SOURCE não inicializou: ${message}`);
  }
}

export async function createProvisioningDataSource(
  config: ConfigService,
): Promise<DataSource | null> {
  const logger = new Logger('ProvisioningDataSource');
  const url = config.get<string>('DATABASE_URL');
  if (!url) {
    if (config.get<string>('NODE_ENV') === 'production') {
      throw new Error('DATABASE_URL is required for workspace provisioning');
    }
    return null;
  }
  const ds = new DataSource({
    type: 'postgres',
    url,
    entities: ALL_ENTITIES,
    migrations: [],
    synchronize: false,
    migrationsRun: false,
    logging: ['error', 'warn'],
    ssl: config.get<string>('DB_SSL') === 'false'
      ? false
      : { rejectUnauthorized: false },
    extra: { max: 2, min: 0, idleTimeoutMillis: 30_000 },
  });
  await ds.initialize();
  logger.log('Owner connection ready for authenticated workspace bootstrap');
  return ds;
}

@Global()
@Module({
  providers: [
    {
      provide: DATA_SOURCE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<DataSource | null> => {
        const logger = new Logger('DatabaseModule');
        const isProd = config.get('NODE_ENV') === 'production';

        // P2-2/P2-4: when runtime session-context is enabled AND a dedicated
        // application connection (NOBYPASSRLS role) is provided, connect through
        // APP_DATABASE_URL so RLS actually applies to the API's own traffic.
        // DATABASE_URL remains the owner/migration connection and the fallback.
        const sessionContextEnabled =
          config.get<string>('DATABASE_SESSION_CONTEXT_ENABLED') === 'true';
        const appUrl = config.get<string>('APP_DATABASE_URL');
        const useAppUrl = sessionContextEnabled && !!appUrl;
        const url = useAppUrl ? appUrl : config.get<string>('DATABASE_URL');

        if (!url) {
          if (isProd) {
            throw new Error('DATABASE_URL is required in production');
          }
          logger.warn(
            'DATABASE_URL não configurado — DB desativado (modo standalone)',
          );
          return null;
        }

        try {
          const parsedUrl = new URL(url);
          logger.log(
            `${useAppUrl ? 'APP_DATABASE_URL (session-context ON, NOBYPASSRLS app role)' : 'DATABASE_URL'} detectado — host=${parsedUrl.hostname} port=${parsedUrl.port || 'default'} user=${parsedUrl.username}`,
          );
        } catch {
          throw new Error('Database URL configurado, mas URL invalida');
        }

        const poolMax = Number(config.get<string>('DB_POOL_MAX') ?? (isProd ? 20 : 20));
        const poolMin = Number(config.get<string>('DB_POOL_MIN') ?? (isProd ? 2 : 1));
        const poolConnectionTimeoutMs = Number(config.get<string>('DB_POOL_CONNECTION_TIMEOUT_MS') ?? 15_000);
        const dbSslDisabled = config.get<string>('DB_SSL') === 'false';

        const ds = new DataSource({
          type:           'postgres',
          url,
          entities:       ALL_ENTITIES,
          migrations:     [...ALL_MIGRATIONS],
          synchronize:    false,  // NUNCA true — schema gerido via migrations
          logging:        isProd ? ['error', 'warn'] : ['query', 'error', 'warn'],
          ssl:            dbSslDisabled ? false : { rejectUnauthorized: false },
          migrationsTableName: 'musicos360_migrations',
          // Connection pool tuning
          extra: {
            max:              poolMax,
            min:              poolMin,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: poolConnectionTimeoutMs,
          },
        });

        try {
          await ds.initialize();
          logger.log('PostgreSQL conectado via TypeORM');
          // FASE 3J: quando session-context está ativo, envolve o DataSource num
          // Proxy ALS-aware para que TODA query do request-path HTTP (e dos jobs)
          // rode no contexto de tenant aberto por runInTenantContext. Sem o flag,
          // retorna o DataSource cru (zero mudança de comportamento).
          return useAppUrl ? makeTenantAwareDataSource(ds) : ds;
        } catch (err) {
          const aggregateErrors = err && typeof err === 'object' && 'errors' in err
            ? (err as { errors?: unknown[] }).errors
            : undefined;
          const message = err instanceof Error
            ? (err.message || err.stack || err.name)
            : String(err);
          const detail = Array.isArray(aggregateErrors)
            ? `${message} ${JSON.stringify(aggregateErrors.map((inner) => {
                if (!inner || typeof inner !== 'object') return String(inner);
                const record = inner as Record<string, unknown>;
                return {
                  code: record['code'],
                  address: record['address'],
                  port: record['port'],
                  message: record['message'],
                };
              }))}`
            : message;
          logger.error('Falha ao conectar PostgreSQL via TypeORM', detail);
          throw new Error(`DATABASE_URL configurado, mas PostgreSQL nao inicializou: ${detail}`);
        }
      },
    },
    {
      // P2-7: administrative, read-only connection for cross-tenant enumeration
      // (schedulers' discoverTenantIds). ALWAYS uses DATABASE_URL (owner),
      // independent of DATABASE_SESSION_CONTEXT_ENABLED / APP_DATABASE_URL.
      // Small pool — used only for bootstrap/enumeration SELECTs, never for writes.
      provide: ADMIN_DATA_SOURCE,
      inject: [ConfigService],
      useFactory: createAdminDataSource,
    },
    {
      provide: PROVISIONING_DATA_SOURCE,
      inject: [ConfigService],
      useFactory: createProvisioningDataSource,
    },
    MigrationValidatorService,
    DatabaseContextService,
    TenantBootstrapResolver,
  ],
  exports: [
    DATA_SOURCE,
    ADMIN_DATA_SOURCE,
    PROVISIONING_DATA_SOURCE,
    MigrationValidatorService,
    DatabaseContextService,
    TenantBootstrapResolver,
  ],
})
export class DatabaseModule {}
