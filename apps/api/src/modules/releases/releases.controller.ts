import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { ReleasesService } from './releases.service';
import { CreateReleaseDto, UpdateReleaseDto, QueryReleaseDto } from './dto/releases.dto';

@ApiTags('Releases') @ApiBearerAuth() @Controller('releases')
export class ReleasesController {
  constructor(private readonly svc: ReleasesService) {}

  @Get()    @RequireRole('viewer')  @ApiOperation({ summary: 'Listar lançamentos' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryReleaseDto) { return this.svc.list(t.id, q); }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter lançamento' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t.id, id); }

  @Post() @RequireRole('editor') @Audit('release.created') @ApiOperation({ summary: 'Criar lançamento' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Body() dto: CreateReleaseDto) { return this.svc.create(t.id, u?.sub ?? '', dto); }

  @Patch(':id') @RequireRole('editor') @Audit('release.updated') @ApiOperation({ summary: 'Actualizar lançamento' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReleaseDto) { return this.svc.update(t.id, u?.sub ?? '', id, dto); }

  @Delete(':id') @RequireRole('manager') @Audit('release.deleted') @ApiOperation({ summary: 'Arquivar lançamento' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t.id, id); }
}
