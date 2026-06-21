import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { RequireRole } from '../../../core/decorators/roles.decorator';
import { Audit } from '../../../core/interceptors/audit.interceptor';
import type { JwtAuth } from '../../../core/guards/auth.guard';
import { AudiovisualTasksService, type CreateTaskInput, type UpdateTaskInput } from './tasks.service';

@ApiTags('Audiovisual — Tasks')
@ApiBearerAuth()
@Controller('audiovisual')
export class AudiovisualTasksController {
  constructor(private readonly svc: AudiovisualTasksService) {}

  @Get('projects/:projectId/tasks') @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar tarefas do projeto' })
  list(@CurrentTenant() t: { id: string }, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.svc.listByProject(t.id, projectId);
  }

  @Post('projects/:projectId/tasks') @RequireRole('editor') @Audit('audiovisual.task.created')
  @ApiOperation({ summary: 'Criar tarefa manual' })
  create(
    @CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth,
    @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateTaskInput,
  ) {
    return this.svc.create(t.id, u?.userId ?? '', projectId, dto);
  }

  @Patch('tasks/:id') @RequireRole('editor') @Audit('audiovisual.task.updated')
  @ApiOperation({ summary: 'Atualizar tarefa' })
  update(
    @CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskInput,
  ) {
    return this.svc.update(t.id, u?.userId ?? '', id, dto);
  }

  @Delete('tasks/:id') @RequireRole('editor') @Audit('audiovisual.task.deleted')
  @ApiOperation({ summary: 'Remover tarefa (soft delete)' })
  remove(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(t.id, u?.userId ?? '', id);
  }
}
