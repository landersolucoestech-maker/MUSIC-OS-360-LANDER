import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { RequireRole } from '../../../core/decorators/roles.decorator';
import { Audit } from '../../../core/interceptors/audit.interceptor';
import {
  AudiovisualProductionDaysService, type CreateProductionDayInput,
} from './production-days.service';

@ApiTags('Audiovisual — Production Days')
@ApiBearerAuth()
@Controller('audiovisual')
export class AudiovisualProductionDaysController {
  constructor(private readonly svc: AudiovisualProductionDaysService) {}

  @Get('projects/:projectId/production-days') @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar dias de gravação do projeto' })
  list(@CurrentTenant() t: { id: string }, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.svc.listByProject(t.id, projectId);
  }

  @Post('projects/:projectId/production-days') @RequireRole('editor') @Audit('audiovisual.production_day.created')
  @ApiOperation({ summary: 'Agendar dia de gravação' })
  create(
    @CurrentTenant() t: { id: string }, @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProductionDayInput,
  ) {
    return this.svc.create(t.id, projectId, dto);
  }

  @Patch('production-days/:id') @RequireRole('editor') @Audit('audiovisual.production_day.updated')
  @ApiOperation({ summary: 'Atualizar dia de gravação' })
  update(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateProductionDayInput>) {
    return this.svc.update(t.id, id, dto);
  }

  @Delete('production-days/:id') @RequireRole('manager') @Audit('audiovisual.production_day.deleted')
  @ApiOperation({ summary: 'Remover dia de gravação' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(t.id, id);
  }
}
