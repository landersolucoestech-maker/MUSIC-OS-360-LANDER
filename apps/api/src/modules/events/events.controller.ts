import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, QueryEventDto } from './dto/events.dto';

@ApiTags('Events') @ApiBearerAuth() @Controller('events')
export class EventsController {
  constructor(private readonly svc: EventsService) {}

  @Get()    @RequireRole('viewer')  @ApiOperation({ summary: 'Listar eventos' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryEventDto) { return this.svc.list(t.id, q); }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter evento' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t.id, id); }

  @Post() @RequireRole('editor') @Audit('event.created') @ApiOperation({ summary: 'Criar evento' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Body() dto: CreateEventDto) { return this.svc.create(t.id, u?.sub ?? '', dto); }

  @Patch(':id') @RequireRole('editor') @Audit('event.updated') @ApiOperation({ summary: 'Actualizar evento' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEventDto) { return this.svc.update(t.id, u?.sub ?? '', id, dto); }

  @Delete(':id') @RequireRole('manager') @Audit('event.deleted') @ApiOperation({ summary: 'Cancelar evento' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t.id, id); }
}
