import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, QueryProjectDto } from './dto/projects.dto';

@ApiTags('Projects') @ApiBearerAuth() @Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()    @RequireRole('viewer')  @ApiOperation({ summary: 'Listar projectos' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryProjectDto) { return this.svc.list(t.id, q); }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter projecto' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t.id, id); }

  @Post() @RequireRole('editor') @Audit('project.created') @ApiOperation({ summary: 'Criar projecto' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Body() dto: CreateProjectDto) { return this.svc.create(t.id, u?.sub ?? '', dto); }

  @Patch(':id') @RequireRole('editor') @Audit('project.updated') @ApiOperation({ summary: 'Actualizar projecto' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) { return this.svc.update(t.id, u?.sub ?? '', id, dto); }

  @Delete(':id') @RequireRole('manager') @Audit('project.deleted') @ApiOperation({ summary: 'Cancelar projecto' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t.id, id); }
}
