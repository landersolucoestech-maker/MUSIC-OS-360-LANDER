import { Global, Module } from '@nestjs/common';
import { TenantService }        from './tenant.service';
import { TenantEventsHandler }  from './tenant-events.handler';

@Global()
@Module({
  providers: [TenantService, TenantEventsHandler],
  exports:   [TenantService],
})
export class TenantModule {}
