import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, QueryClientDto } from './dto/clients.dto';

@ApiTags('Clients') @ApiBearerAuth() @Controller('clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()    @RequireRole('viewer') @RequirePermission('client:read') @ApiOperation({ summary: 'Listar clientes' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryClientDto) { return this.svc.list(t.id, q); }

  @Get(':id') @RequireRole('viewer') @RequirePermission('client:read') @ApiOperation({ summary: 'Obter cliente' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t.id, id); }

  @Post() @RequireRole('editor') @RequirePermission('client:create') @Audit('client.created') @ApiOperation({ summary: 'Criar cliente' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Body() dto: CreateClientDto) { return this.svc.create(t.id, u?.sub ?? '', dto); }

  @Patch(':id') @RequireRole('editor') @RequirePermission('client:update') @Audit('client.updated') @ApiOperation({ summary: 'Actualizar cliente' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) { return this.svc.update(t.id, u?.sub ?? '', id, dto); }

  @Delete(':id') @RequireRole('manager') @RequirePermission('client:delete') @Audit('client.deleted') @ApiOperation({ summary: 'Remover cliente' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t.id, id); }
}
