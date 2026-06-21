import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { RequireRole } from '../../../core/decorators/roles.decorator';
import { Audit } from '../../../core/interceptors/audit.interceptor';
import type { JwtAuth } from '../../../core/guards/auth.guard';
import { AudiovisualProjectsService } from './projects.service';
import {
  CreateAudiovisualProjectDto, UpdateAudiovisualProjectDto,
  QueryAudiovisualProjectDto, TransitionProjectStatusDto, QueryDashboardDto,
} from '../dto/audiovisual.dto';

@ApiTags('Audiovisual — Projects')
@ApiBearerAuth()
@Controller('audiovisual/projects')
export class AudiovisualProjectsController {
  constructor(private readonly svc: AudiovisualProjectsService) {}

  @Get() @RequireRole('viewer') @ApiOperation({ summary: 'Listar projetos audiovisuais' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryAudiovisualProjectDto) {
    return this.svc.list(t.id, q);
  }

  @Get('dashboard') @RequireRole('viewer') @ApiOperation({ summary: 'KPIs do dashboard audiovisual' })
  dashboard(@CurrentTenant() t: { id: string }, @Query() q: QueryDashboardDto) {
    return this.svc.dashboard(t.id, q);
  }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter projeto' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findById(t.id, id);
  }

  @Post() @RequireRole('editor') @Audit('audiovisual.project.created')
  @ApiOperation({ summary: 'Criar projeto audiovisual' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Body() dto: CreateAudiovisualProjectDto) {
    return this.svc.create(t.id, u?.userId ?? '', dto);
  }

  @Patch(':id') @RequireRole('editor') @Audit('audiovisual.project.updated')
  @ApiOperation({ summary: 'Atualizar projeto' })
  update(
    @CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAudiovisualProjectDto,
  ) {
    return this.svc.update(t.id, u?.userId ?? '', id, dto);
  }

  @Post(':id/transition') @RequireRole('editor') @Audit('audiovisual.project.transitioned')
  @ApiOperation({ summary: 'Avançar/retroceder status do pipeline' })
  transition(
    @CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string, @Body() dto: TransitionProjectStatusDto,
  ) {
    return this.svc.transitionStatus(t.id, u?.userId ?? '', id, dto);
  }

  @Delete(':id') @RequireRole('manager') @Audit('audiovisual.project.deleted')
  @ApiOperation({ summary: 'Remover projeto (soft delete)' })
  remove(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.softDelete(t.id, u?.userId ?? '', id);
  }
}
