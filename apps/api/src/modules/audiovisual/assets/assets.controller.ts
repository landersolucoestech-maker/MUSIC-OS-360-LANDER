import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { RequireRole } from '../../../core/decorators/roles.decorator';
import { Audit } from '../../../core/interceptors/audit.interceptor';
import type { JwtAuth } from '../../../core/guards/auth.guard';
import { AudiovisualAssetsService, type CreateAssetInput } from './assets.service';

@ApiTags('Audiovisual — Assets / Files')
@ApiBearerAuth()
@Controller('audiovisual')
export class AudiovisualAssetsController {
  constructor(private readonly svc: AudiovisualAssetsService) {}

  @Get('projects/:projectId/assets') @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar arquivos do projeto (filtro opcional por kind)' })
  list(
    @CurrentTenant() t: { id: string }, @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('kind') kind?: string,
  ) {
    return this.svc.listByProject(t.id, projectId, kind);
  }

  @Post('projects/:projectId/assets') @RequireRole('editor') @Audit('audiovisual.asset.created')
  @ApiOperation({ summary: 'Registrar arquivo (URL já uploaded externamente)' })
  create(
    @CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth,
    @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateAssetInput,
  ) {
    return this.svc.create(t.id, u?.userId ?? '', projectId, dto);
  }

  @Patch('assets/:id') @RequireRole('editor') @Audit('audiovisual.asset.updated')
  @ApiOperation({ summary: 'Atualizar metadata do arquivo' })
  update(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateAssetInput>) {
    return this.svc.update(t.id, id, dto);
  }

  @Delete('assets/:id') @RequireRole('editor') @Audit('audiovisual.asset.deleted')
  @ApiOperation({ summary: 'Remover arquivo (soft delete; storage externo permanece)' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(t.id, id);
  }
}
