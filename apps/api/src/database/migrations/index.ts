/**
 * apps/api/src/database/migrations/index.ts
 *
 * THE single canonical list of every TypeORM migration in this project, in
 * chronological order. Both consumers — datasource.ts (the real runner
 * behind db:migrate/db:check/CI) and database.module.ts (the NestJS runtime
 * DataSource's MigrationValidatorService boot check) — import ALL_MIGRATIONS
 * from here. There is exactly one place to update when adding a migration;
 * see apps/api/DATABASE.md's "Fluxo de desenvolvimento normal".
 *
 * Generated once from the actual migrations/ directory contents (every file
 * matching \d{14}_PascalCase.ts, sorted by timestamp) to guarantee this
 * list started in exact parity with disk — see
 * scripts/verify-migration-source-of-truth.mjs's registry-parity check,
 * which fails CI if this list and the directory ever diverge again.
 */
import { InitialSchema20240101000000 } from './20240101000000_InitialSchema';
import { WorkflowTransitions20240601000001 } from './20240601000001_WorkflowTransitions';
import { DomainEventLog20240602000001 } from './20240602000001_DomainEventLog';
import { AuditLogEnterpriseColumns20260516000001 } from './20260516000001_AuditLogEnterpriseColumns';
import { ActivityLogs20260520000002 } from './20260520000002_ActivityLogs';
import { SupabaseAuthColumnNames20260520000004 } from './20260520000004_SupabaseAuthColumnNames';
import { RLSPolicies20260520000020 } from './20260520000020_RLSPolicies';
import { PerformanceIndexes20260521000030 } from './20260521000030_PerformanceIndexes';
import { ConversationsAndForms20260521000040 } from './20260521000040_ConversationsAndForms';
import { CrmPipelinesAnalytics20260521000050 } from './20260521000050_CrmPipelinesAnalytics';
import { InventoryLicensingFinancialRules20260521000060 } from './20260521000060_InventoryLicensingFinancialRules';
import { FixRLSFallback20260522000001 } from './20260522000001_FixRLSFallback';
import { ForceRLSFailClosed20260522000002 } from './20260522000002_ForceRLSFailClosed';
import { AddArtistIdToWorks20260523000001 } from './20260523000001_AddArtistIdToWorks';
import { FinancialCategoriesEnterprise20260526000002 } from './20260526000002_FinancialCategoriesEnterprise';
import { FinancialCategoryRulesDynamic20260526000003 } from './20260526000003_FinancialCategoryRulesDynamic';
import { AudiovisualPhase120260527000003 } from './20260527000003_AudiovisualPhase1';
import { AudiovisualTasks20260527000004 } from './20260527000004_AudiovisualTasks';
import { AudiovisualAssets20260527000005 } from './20260527000005_AudiovisualAssets';
import { LeadsContactsOperationalRefactor20260528000002 } from './20260528000002_LeadsContactsOperationalRefactor';
import { MarketingProjects20260529000001 } from './20260529000001_MarketingProjects';
import { MarketingProjectAutomation20260529000002 } from './20260529000002_MarketingProjectAutomation';
import { MarketingStrategyStructure20260529000003 } from './20260529000003_MarketingStrategyStructure';
import { MarketingAssets20260529000004 } from './20260529000004_MarketingAssets';
import { RegistryFieldsPhase120260601000001 } from './20260601000001_RegistryFieldsPhase1';
import { RegistryRightsHoldersIdentifiers20260601000002 } from './20260601000002_RegistryRightsHoldersIdentifiers';
import { SocietyIntegration20260601000003 } from './20260601000003_SocietyIntegration';
import { MarketingContentPublishing20260602000001 } from './20260602000001_MarketingContentPublishing';
import { CustomerCareConversationExtensions20260604000001 } from './20260604000001_CustomerCareConversationExtensions';
import { AddGenreToPhonograms20260605000001 } from './20260605000001_AddGenreToPhonograms';
import { SkillsAndCentralAssets20260607000001 } from './20260607000001_SkillsAndCentralAssets';
import { WorkflowExecutions20260607000002 } from './20260607000002_WorkflowExecutions';
import { MusicChatAutomation20260609000001 } from './20260609000001_MusicChatAutomation';
import { CreatePermissionsCatalog20260610000001 } from './20260610000001_CreatePermissionsCatalog';
import { CreateRolesAndRolePermissions20260610000002 } from './20260610000002_CreateRolesAndRolePermissions';
import { CreateOrgStructure20260610000003 } from './20260610000003_CreateOrgStructure';
import { AlterOrgMembersAddRbacColumns20260610000004 } from './20260610000004_AlterOrgMembersAddRbacColumns';
import { CreateMembershipJobFunctions20260610000005 } from './20260610000005_CreateMembershipJobFunctions';
import { BackfillOrgMembersRoleId20260610000006 } from './20260610000006_BackfillOrgMembersRoleId';
import { EnableRlsOnRbacTables20260610000007 } from './20260610000007_EnableRlsOnRbacTables';
import { PortableRlsTenantContext20260612000001 } from './20260612000001_PortableRlsTenantContext';
import { FixAppJwtInsufficientPrivilege20260612000002 } from './20260612000002_FixAppJwtInsufficientPrivilege';
import { CreateArtistPlatformProfiles20260612000003 } from './20260612000003_CreateArtistPlatformProfiles';
import { CreateReleaseWorksJoinTable20260613000001 } from './20260613000001_CreateReleaseWorksJoinTable';
import { AddMissingSafeColumns20260613000002 } from './20260613000002_AddMissingSafeColumns';
import { AddLeadsPipelineStage20260613000003 } from './20260613000003_AddLeadsPipelineStage';
import { AddDomainForeignKeys20260613000004 } from './20260613000004_AddDomainForeignKeys';
import { AddHrEmployeeForeignKeys20260613000005 } from './20260613000005_AddHrEmployeeForeignKeys';
import { RlsPoliciesInventoryLicensesFinancial20260613000006 } from './20260613000006_RlsPoliciesInventoryLicensesFinancial';
import { RlsPoliciesAssets20260613000007 } from './20260613000007_RlsPoliciesAssets';
import { RlsPoliciesAudiovisualSocietyMarketing20260613000008 } from './20260613000008_RlsPoliciesAudiovisualSocietyMarketing';
import { RlsPolicyReleaseWorks20260613000009 } from './20260613000009_RlsPolicyReleaseWorks';
import { RlsPoliciesMusicChatAutomation20260613000010 } from './20260613000010_RlsPoliciesMusicChatAutomation';
import { WorkflowExecutionTenantNotNull20260613000011 } from './20260613000011_WorkflowExecutionTenantNotNull';
import { RlsPoliciesSkillRunsWorkflowExecutions20260613000012 } from './20260613000012_RlsPoliciesSkillRunsWorkflowExecutions';
import { RlsPoliciesSkillWorkflowLogs20260613000013 } from './20260613000013_RlsPoliciesSkillWorkflowLogs';
import { HarmonizeRawUuidPolicies20260613000014 } from './20260613000014_HarmonizeRawUuidPolicies';
import { HarmonizeRawTextPolicies20260613000015 } from './20260613000015_HarmonizeRawTextPolicies';
import { NotificationSettings20260613000016 } from './20260613000016_NotificationSettings';
import { HardenRbacAclDefaults20260613000017 } from './20260613000017_HardenRbacAclDefaults';
import { CreateUsersProjection20260614000000 } from './20260614000000_CreateUsersProjection';
import { CreatePermissionGroups20260614000001 } from './20260614000001_CreatePermissionGroups';
import { ExtendPermissionsCatalog20260614000002 } from './20260614000002_ExtendPermissionsCatalog';
import { CreatePermissionAliases20260614000003 } from './20260614000003_CreatePermissionAliases';
import { CreateRoleTemplates20260614000004 } from './20260614000004_CreateRoleTemplates';
import { CreatePermissionDependenciesAndConflicts20260614000005 } from './20260614000005_CreatePermissionDependenciesAndConflicts';
import { ExtendRolesForEnterpriseRbac20260614000006 } from './20260614000006_ExtendRolesForEnterpriseRbac';
import { CreateRoleInheritance20260614000007 } from './20260614000007_CreateRoleInheritance';
import { CreateRbacDecisionLogs20260614000008 } from './20260614000008_CreateRbacDecisionLogs';
import { CreateTenantInvitations20260620000001 } from './20260620000001_CreateTenantInvitations';
import { HardenContactsLeadUploadsRls20260620000002 } from './20260620000002_HardenContactsLeadUploadsRls';
import { HardenRoleInheritanceFunctions20260620000003 } from './20260620000003_HardenRoleInheritanceFunctions';
import { ReconcileOperationalSchema20260620000004 } from './20260620000004_ReconcileOperationalSchema';
import { ForceRLSOperationalTables20260620000005 } from './20260620000005_ForceRLSOperationalTables';
import { HardenSupabaseDataApiSurface20260620000006 } from './20260620000006_HardenSupabaseDataApiSurface';
import { CreateRbacErrorLogs20260621000001 } from './20260621000001_CreateRbacErrorLogs';
import { PublicArtistRegistration20260630000001 } from './20260630000001_PublicArtistRegistration';
import { BillingEnforcement20260701000001 } from './20260701000001_BillingEnforcement';
import { BillingPlans20260701000002 } from './20260701000002_BillingPlans';
import { BillingRlsHardening20260701000003 } from './20260701000003_BillingRlsHardening';
import { ReconcileInventoryLicensesColumns20260705000001 } from './20260705000001_ReconcileInventoryLicensesColumns';
import { RemoveArtistBannerVideoFields20260705000002 } from './20260705000002_RemoveArtistBannerVideoFields';
import { RemoveDeadStructuresD1D8_20260705000003 } from './20260705000003_RemoveDeadStructuresD1D8';
import { ArtistsFormFieldColumns20260712000001 } from './20260712000001_ArtistsFormFieldColumns';
import { CatalogFormFieldColumns20260712000002 } from './20260712000002_CatalogFormFieldColumns';
import { HrFormFieldColumns20260712000003 } from './20260712000003_HrFormFieldColumns';
import { SharesContractsFormFieldColumns20260712000004 } from './20260712000004_SharesContractsFormFieldColumns';
import { CrmFinanceOpsFormFieldColumns20260712000005 } from './20260712000005_CrmFinanceOpsFormFieldColumns';
import { MakeShareRegistryFieldsNullable20260715000001 } from './20260715000001_MakeShareRegistryFieldsNullable';
import { AddEventsStartsAt20260716000001 } from './20260716000001_AddEventsStartsAt';
import { FinancialPrereqs20260718000000 } from './20260718000000_FinancialPrereqs';
import { FinancialEnums20260718000001 } from './20260718000001_FinancialEnums';
import { FinancialCategories20260718000002 } from './20260718000002_FinancialCategories';
import { FinancialPartiesAccounts20260718000003 } from './20260718000003_FinancialPartiesAccounts';
import { FinancialTransactions20260718000004 } from './20260718000004_FinancialTransactions';
import { TransactionAllocations20260718000005 } from './20260718000005_TransactionAllocations';
import { FinancialBudgets20260718000006 } from './20260718000006_FinancialBudgets';
import { FinancialRls20260718000007 } from './20260718000007_FinancialRls';
import { PerformanceMetricEntries20260718000008 } from './20260718000008_PerformanceMetricEntries';
import { FinancialOperationalBridges20260718000009 } from './20260718000009_FinancialOperationalBridges';
import { ReleasesFormFieldColumns20260718000010 } from './20260718000010_ReleasesFormFieldColumns';
import { WorkParticipantsNormalization20260718000011 } from './20260718000011_WorkParticipantsNormalization';
import { AudiovisualProjectsFormFieldColumns20260718000012 } from './20260718000012_AudiovisualProjectsFormFieldColumns';
import { ProjectsFormFieldAlignment20260718000013 } from './20260718000013_ProjectsFormFieldAlignment';
import { OrgMembersPhoneColumn20260718000014 } from './20260718000014_OrgMembersPhoneColumn';
import { BackfillLegacySocietyCodesToExternalIdentifiers20260718000015 } from './20260718000015_BackfillLegacySocietyCodesToExternalIdentifiers';
import { RemoveLegacySocietyCodeColumns20260718000016 } from './20260718000016_RemoveLegacySocietyCodeColumns';
import { RestoreEcadAddEntityCodeColumn20260718000017 } from './20260718000017_RestoreEcadAddEntityCodeColumn';
import { RebuildArtistsInCanonicalFormOrder20260719000001 } from './20260719000001_RebuildArtistsInCanonicalFormOrder';
import { RebuildWorksInCanonicalFormOrder20260719000002 } from './20260719000002_RebuildWorksInCanonicalFormOrder';
import { RebuildPhonogramsInCanonicalFormOrder20260719000003 } from './20260719000003_RebuildPhonogramsInCanonicalFormOrder';
import { RebuildReleasesInCanonicalFormOrder20260719000004 } from './20260719000004_RebuildReleasesInCanonicalFormOrder';
import { RebuildProjectsInCanonicalFormOrder20260719000005 } from './20260719000005_RebuildProjectsInCanonicalFormOrder';
import { RebuildAudiovisualProjectsInCanonicalFormOrder20260719000006 } from './20260719000006_RebuildAudiovisualProjectsInCanonicalFormOrder';
import { RebuildEventsInCanonicalFormOrder20260719000007 } from './20260719000007_RebuildEventsInCanonicalFormOrder';
import { RebuildMarketingProjectsInCanonicalFormOrder20260719000008 } from './20260719000008_RebuildMarketingProjectsInCanonicalFormOrder';
import { RebuildMarketingTasksInCanonicalFormOrder20260719000009 } from './20260719000009_RebuildMarketingTasksInCanonicalFormOrder';
import { RebuildClientsInCanonicalFormOrder20260719000010 } from './20260719000010_RebuildClientsInCanonicalFormOrder';
import { RebuildLeadsInCanonicalFormOrder20260719000011 } from './20260719000011_RebuildLeadsInCanonicalFormOrder';
import { RebuildContractsInCanonicalFormOrder20260719000012 } from './20260719000012_RebuildContractsInCanonicalFormOrder';
import { RebuildRightsHoldersInCanonicalFormOrder20260719000013 } from './20260719000013_RebuildRightsHoldersInCanonicalFormOrder';
import { RebuildSharesInCanonicalFormOrder20260719000014 } from './20260719000014_RebuildSharesInCanonicalFormOrder';
import { RebuildLicensesInCanonicalFormOrder20260719000015 } from './20260719000015_RebuildLicensesInCanonicalFormOrder';
import { RebuildTakedownsInCanonicalFormOrder20260719000016 } from './20260719000016_RebuildTakedownsInCanonicalFormOrder';
import { RebuildEmployeesInCanonicalFormOrder20260719000018 } from './20260719000018_RebuildEmployeesInCanonicalFormOrder';
import { RebuildPayrollEntriesInCanonicalFormOrder20260719000019 } from './20260719000019_RebuildPayrollEntriesInCanonicalFormOrder';
import { RebuildOrgMembersInCanonicalFormOrder20260719000020 } from './20260719000020_RebuildOrgMembersInCanonicalFormOrder';
import { RebuildMusicchatAutomationSettingsInCanonicalFormOrder20260719000021 } from './20260719000021_RebuildMusicchatAutomationSettingsInCanonicalFormOrder';
import { RebuildCampaignTasksInCanonicalFormOrder20260719000022 } from './20260719000022_RebuildCampaignTasksInCanonicalFormOrder';
import { RebuildCampaignAssetsInCanonicalFormOrder20260719000023 } from './20260719000023_RebuildCampaignAssetsInCanonicalFormOrder';
import { RebuildCampaignsInCanonicalFormOrder20260719000024 } from './20260719000024_RebuildCampaignsInCanonicalFormOrder';
import { RebuildLeaveRequestsInCanonicalFormOrder20260719000025 } from './20260719000025_RebuildLeaveRequestsInCanonicalFormOrder';
import { HardenRbacCatalogRls20260731000001 } from './20260731000001_HardenRbacCatalogRls';
import { RealtimeBroadcastAuthorization20260801000001 } from './20260801000001_RealtimeBroadcastAuthorization';
import { TenantZeroFormalization20260801000002 } from './20260801000002_TenantZeroFormalization';
import { GrantMusicosAppOnAllTables20260802000001 } from './20260802000001_GrantMusicosAppOnAllTables';

export const ALL_MIGRATIONS = [
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
  PublicArtistRegistration20260630000001,
  BillingEnforcement20260701000001,
  BillingPlans20260701000002,
  BillingRlsHardening20260701000003,
  ReconcileInventoryLicensesColumns20260705000001,
  RemoveArtistBannerVideoFields20260705000002,
  RemoveDeadStructuresD1D8_20260705000003,
  ArtistsFormFieldColumns20260712000001,
  CatalogFormFieldColumns20260712000002,
  HrFormFieldColumns20260712000003,
  SharesContractsFormFieldColumns20260712000004,
  CrmFinanceOpsFormFieldColumns20260712000005,
  MakeShareRegistryFieldsNullable20260715000001,
  AddEventsStartsAt20260716000001,
  FinancialPrereqs20260718000000,
  FinancialEnums20260718000001,
  FinancialCategories20260718000002,
  FinancialPartiesAccounts20260718000003,
  FinancialTransactions20260718000004,
  TransactionAllocations20260718000005,
  FinancialBudgets20260718000006,
  FinancialRls20260718000007,
  PerformanceMetricEntries20260718000008,
  FinancialOperationalBridges20260718000009,
  ReleasesFormFieldColumns20260718000010,
  WorkParticipantsNormalization20260718000011,
  AudiovisualProjectsFormFieldColumns20260718000012,
  ProjectsFormFieldAlignment20260718000013,
  OrgMembersPhoneColumn20260718000014,
  BackfillLegacySocietyCodesToExternalIdentifiers20260718000015,
  RemoveLegacySocietyCodeColumns20260718000016,
  RestoreEcadAddEntityCodeColumn20260718000017,
  RebuildArtistsInCanonicalFormOrder20260719000001,
  RebuildWorksInCanonicalFormOrder20260719000002,
  RebuildPhonogramsInCanonicalFormOrder20260719000003,
  RebuildReleasesInCanonicalFormOrder20260719000004,
  RebuildProjectsInCanonicalFormOrder20260719000005,
  RebuildAudiovisualProjectsInCanonicalFormOrder20260719000006,
  RebuildEventsInCanonicalFormOrder20260719000007,
  RebuildMarketingProjectsInCanonicalFormOrder20260719000008,
  RebuildMarketingTasksInCanonicalFormOrder20260719000009,
  RebuildClientsInCanonicalFormOrder20260719000010,
  RebuildLeadsInCanonicalFormOrder20260719000011,
  RebuildContractsInCanonicalFormOrder20260719000012,
  RebuildRightsHoldersInCanonicalFormOrder20260719000013,
  RebuildSharesInCanonicalFormOrder20260719000014,
  RebuildLicensesInCanonicalFormOrder20260719000015,
  RebuildTakedownsInCanonicalFormOrder20260719000016,
  RebuildEmployeesInCanonicalFormOrder20260719000018,
  RebuildPayrollEntriesInCanonicalFormOrder20260719000019,
  RebuildOrgMembersInCanonicalFormOrder20260719000020,
  RebuildMusicchatAutomationSettingsInCanonicalFormOrder20260719000021,
  RebuildCampaignTasksInCanonicalFormOrder20260719000022,
  RebuildCampaignAssetsInCanonicalFormOrder20260719000023,
  RebuildCampaignsInCanonicalFormOrder20260719000024,
  RebuildLeaveRequestsInCanonicalFormOrder20260719000025,
  HardenRbacCatalogRls20260731000001,
  RealtimeBroadcastAuthorization20260801000001,
  TenantZeroFormalization20260801000002,
  GrantMusicosAppOnAllTables20260802000001,
] as const;
