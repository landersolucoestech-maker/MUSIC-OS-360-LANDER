import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { SupportTicketsService } from './support-tickets.service';
import { CreateSupportTicketDto, UpdateSupportTicketDto, QuerySupportTicketDto } from './dto/support-tickets.dto';

@ApiTags('SupportTickets') @ApiBearerAuth() @Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly svc: SupportTicketsService) {}

  @Get()    @RequireRole('manager') @ApiOperation({ summary: 'Listar tickets de suporte' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QuerySupportTicketDto) { return this.svc.list(t.id, q); }

  @Get(':id') @RequireRole('manager') @ApiOperation({ summary: 'Obter ticket de suporte' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t.id, id); }

  @Post() @RequireRole('viewer') @Audit('support-ticket.created') @ApiOperation({ summary: 'Criar ticket de suporte' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: any, @Body() dto: CreateSupportTicketDto) {
    return this.svc.create(t.id, u?.id ?? 'unknown', dto);
  }

  @Patch(':id') @RequireRole('manager') @Audit('support-ticket.updated') @ApiOperation({ summary: 'Actualizar ticket de suporte' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() _u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupportTicketDto) { return this.svc.update(t.id, id, dto); }

  @Delete(':id') @RequireRole('manager') @Audit('support-ticket.deleted') @ApiOperation({ summary: 'Fechar ticket de suporte' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t.id, id); }
}
