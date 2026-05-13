import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { SharesService } from './shares.service';
import { CreateShareDto, UpdateShareDto, QueryShareDto } from './dto/shares.dto';

@ApiTags('Shares') @ApiBearerAuth() @Controller('shares')
export class SharesController {
  constructor(private readonly svc: SharesService) {}

  @Get()    @RequireRole('viewer')  @ApiOperation({ summary: 'Listar shares' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryShareDto) { return this.svc.list(t.id, q); }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter share' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t.id, id); }

  @Post() @RequireRole('editor') @Audit('share.created') @ApiOperation({ summary: 'Criar share' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() _u: any, @Body() dto: CreateShareDto) { return this.svc.create(t.id, dto); }

  @Patch(':id') @RequireRole('editor') @Audit('share.updated') @ApiOperation({ summary: 'Actualizar share' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() _u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateShareDto) { return this.svc.update(t.id, id, dto); }

  @Delete(':id') @RequireRole('manager') @Audit('share.deleted') @ApiOperation({ summary: 'Inactivar share' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t.id, id); }
}
