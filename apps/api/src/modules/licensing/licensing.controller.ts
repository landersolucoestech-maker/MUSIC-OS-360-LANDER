import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { LicensingService } from './licensing.service';
import { CreateLicenseDto, UpdateLicenseDto, QueryLicenseDto } from './dto/licensing.dto';

@ApiTags('Licensing') @ApiBearerAuth() @Controller('licenses')
export class LicensingController {
  constructor(private readonly svc: LicensingService) {}

  @Get() @RequireRole('viewer') @RequirePermission('license:read') @ApiOperation({ summary: 'Listar licenças' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryLicenseDto) {
    return this.svc.list(t.id, q);
  }

  @Get('stats') @RequireRole('viewer') @RequirePermission('license:read') @ApiOperation({ summary: 'Contagem + soma de valor por status, sobre o tenant inteiro' })
  stats(@CurrentTenant() t: { id: string }) {
    return this.svc.stats(t.id);
  }

  @Get(':id') @RequireRole('viewer') @RequirePermission('license:read') @ApiOperation({ summary: 'Obter licença' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findById(t.id, id);
  }

  @Post() @RequireRole('editor') @RequirePermission('license:create') @Audit('license.created') @ApiOperation({ summary: 'Criar licença' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Body() dto: CreateLicenseDto) {
    return this.svc.create(t.id, u?.sub ?? '', dto);
  }

  @Patch(':id') @RequireRole('editor') @RequirePermission('license:update') @Audit('license.updated') @ApiOperation({ summary: 'Atualizar licença' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLicenseDto) {
    return this.svc.update(t.id, u?.sub ?? '', id, dto);
  }

  @Delete(':id') @RequireRole('manager') @RequirePermission('license:delete') @Audit('license.deleted') @ApiOperation({ summary: 'Remover licença' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.softDelete(t.id, id);
  }
}
