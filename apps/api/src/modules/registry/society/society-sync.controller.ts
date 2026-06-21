import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { RequireRole } from '../../../core/decorators/roles.decorator';
import { Audit } from '../../../core/interceptors/audit.interceptor';
import type { JwtAuth } from '../../../core/guards/auth.guard';
import { SocietySyncService } from './society-sync.service';
import { RunSyncDto } from '../dto/operations.dto';

@ApiTags('Registry · Sync') @ApiBearerAuth() @Controller('registry')
export class SocietySyncController {
  constructor(private readonly svc: SocietySyncService) {}

  @Post('sync/abramus') @RequireRole('manager') @Audit('registry.sync.run') @ApiOperation({ summary: 'Disparar sincronização de status' })
  run(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Body() dto: RunSyncDto) {
    return this.svc.runSync(t.id, u?.userId ?? '', dto);
  }

  @Get('sync-jobs') @RequireRole('viewer') @ApiOperation({ summary: 'Listar jobs de sincronização' })
  list(@CurrentTenant() t: { id: string }) {
    return this.svc.list(t.id);
  }

  @Get('sync-jobs/:id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter job de sincronização' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findById(t.id, id);
  }
}
