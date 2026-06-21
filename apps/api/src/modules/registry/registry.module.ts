import { Module } from '@nestjs/common';
import { RightsHoldersController } from './rights-holders.controller';
import { ExternalIdentifiersController } from './external-identifiers.controller';
import { RightsHoldersService } from './rights-holders.service';
import { ExternalIdentifierService } from './external-identifiers.service';
import { SocietyAccountsController } from './society/society-accounts.controller';
import { SocietySubmissionsController } from './society/society-submissions.controller';
import { SocietyAccountsService } from './society/society-accounts.service';
import { SocietySubmissionService } from './society/society-submission.service';
import { SocietySyncService } from './society/society-sync.service';
import { SocietySyncController } from './society/society-sync.controller';
import { WorkRegistryValidationService, RecordingRegistryValidationService } from './validation/entity-validators';
import { SocietyValidationService } from './validation/society-validation.service';
import { SocietyPayloadBuilderService } from './payloads/society-payload-builder.service';
import { AbramusPayloadBuilderService } from './payloads/abramus-payload-builder.service';
import { ManualExportAdapter } from './adapters/manual-export.adapter';
import { PartnerApiAdapter } from './adapters/partner-api.adapter';
import { PortalRpaAdapter } from './adapters/portal-rpa.adapter';
import { SocietyAdapterRegistry } from './adapters/society-adapter.registry';
import { RegistryOperationsService } from './registry-operations.service';
import { RegistryOperationsController } from './registry-operations.controller';

/**
 * Registry (ABRAMUS/ECAD) module.
 *  - Phase 2: rights holders + external identifiers.
 *  - Phase 3: society gateway (accounts, submissions, events, immutable snapshots, state machine).
 *  - Phase 4: validation + payload builders + adapters (ManualExport functional;
 *    PartnerApi/PortalRpa stubs, env-gated) + validate/prepare/export endpoints.
 * `submit`/`sync` + tests land in Phase 5.
 */
@Module({
  controllers: [
    RightsHoldersController,
    ExternalIdentifiersController,
    SocietyAccountsController,
    SocietySubmissionsController,
    SocietySyncController,
    RegistryOperationsController,
  ],
  providers: [
    RightsHoldersService,
    ExternalIdentifierService,
    SocietyAccountsService,
    SocietySubmissionService,
    SocietySyncService,
    WorkRegistryValidationService,
    RecordingRegistryValidationService,
    SocietyValidationService,
    SocietyPayloadBuilderService,
    AbramusPayloadBuilderService,
    ManualExportAdapter,
    PartnerApiAdapter,
    PortalRpaAdapter,
    SocietyAdapterRegistry,
    RegistryOperationsService,
  ],
  exports: [
    RightsHoldersService,
    ExternalIdentifierService,
    SocietyAccountsService,
    SocietySubmissionService,
    SocietyValidationService,
    RegistryOperationsService,
  ],
})
export class RegistryModule {}
