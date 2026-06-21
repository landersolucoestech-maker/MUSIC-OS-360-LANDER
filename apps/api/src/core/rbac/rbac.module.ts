import { Global, Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { PermissionResolverService } from './permission-resolver.service';
import { RbacMutationService } from './rbac-mutation.service';
import { RbacTelemetryService } from './rbac-telemetry.service';
import { RbacDistributedCacheService } from './rbac-distributed-cache.service';
import { RbacDecisionService } from './rbac-decision.service';
import { RbacErrorLogService } from './rbac-error-log.service';

@Global()
@Module({
  providers: [
    RbacDistributedCacheService,
    PermissionResolverService,
    RbacService,
    RbacMutationService,
    RbacTelemetryService,
    RbacDecisionService,
    RbacErrorLogService,
  ],
  exports: [
    RbacDistributedCacheService,
    RbacService,
    PermissionResolverService,
    RbacMutationService,
    RbacTelemetryService,
    RbacDecisionService,
    RbacErrorLogService,
  ],
})
export class RbacModule {}
