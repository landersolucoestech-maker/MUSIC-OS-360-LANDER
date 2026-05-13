import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { TakedownsService } from './takedowns.service';
import { CreateTakedownDto, UpdateTakedownDto, QueryTakedownDto } from './dto/takedowns.dto';

@ApiTags('Takedowns') @ApiBearerAuth() @Controller('takedowns')
export class TakedownsController {
  constructor(private readonly svc: TakedownsService) {}

  @Get()    @RequireRole('viewer')  @ApiOperation({ summary: 'Listar takedowns' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryTakedownDto) { return this.svc.list(t.id, q); }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter takedown' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t.id, id); }

  @Post() @RequireRole('editor') @Audit('takedown.created') @ApiOperation({ summary: 'Criar takedown' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Body() dto: CreateTakedownDto) { return this.svc.create(t.id, u?.sub ?? '', dto); }

  @Patch(':id') @RequireRole('editor') @Audit('takedown.updated') @ApiOperation({ summary: 'Actualizar takedown' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() _u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTakedownDto) { return this.svc.update(t.id, id, dto); }

  @Delete(':id') @RequireRole('manager') @Audit('takedown.deleted') @ApiOperation({ summary: 'Fechar takedown' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t.id, id); }
}
