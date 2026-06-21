import { Controller, Get, Patch, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { RequireRole } from '../../../core/decorators/roles.decorator';
import { Audit } from '../../../core/interceptors/audit.interceptor';
import type { JwtAuth } from '../../../core/guards/auth.guard';
import { SocietySubmissionService } from './society-submission.service';
import { QuerySubmissionDto, UpdateSubmissionStatusDto } from '../dto/society.dto';

@ApiTags('Registry · Submissions') @ApiBearerAuth() @Controller('registry/submissions')
export class SocietySubmissionsController {
  constructor(private readonly svc: SocietySubmissionService) {}

  @Get() @RequireRole('viewer') @ApiOperation({ summary: 'Listar submissões' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QuerySubmissionDto) {
    return this.svc.list(t.id, q);
  }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter submissão + transições permitidas' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getWithAllowed(t.id, id);
  }

  @Get(':id/events') @RequireRole('viewer') @ApiOperation({ summary: 'Histórico de eventos da submissão' })
  events(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getEvents(t.id, id);
  }

  @Get(':id/payload') @RequireRole('viewer') @ApiOperation({ summary: 'Snapshot de payload atual' })
  payload(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getCurrentPayload(t.id, id);
  }

  @Patch(':id/status') @RequireRole('manager') @Audit('registry.submission.status_changed')
  @ApiOperation({ summary: 'Mudar status (state machine)' })
  changeStatus(
    @CurrentTenant() t: { id: string },
    @CurrentUser() u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubmissionStatusDto,
  ) {
    return this.svc.transition(t.id, u?.userId ?? '', id, dto);
  }
}
