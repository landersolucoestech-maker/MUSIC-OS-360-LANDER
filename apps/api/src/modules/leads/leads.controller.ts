import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import type { JwtAuth }  from '../../core/guards/clerk-auth.guard';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto } from './dto/leads.dto';

@ApiTags('Leads') @ApiBearerAuth() @Controller('leads')
export class LeadsController {
  constructor(private readonly svc: LeadsService) {}

  @Get() @RequireRole('viewer') @ApiOperation({ summary: 'Listar leads' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryLeadDto) {
    return this.svc.list(t.id, q);
  }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter lead' })
  findById(
    @CurrentTenant() t: { id: string },
    @CurrentUser()   u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findById(t.id, id, u?.orgRole ?? undefined);
  }

  @Post() @RequireRole('editor') @Audit('lead.created') @ApiOperation({ summary: 'Criar lead' })
  create(
    @CurrentTenant() t: { id: string },
    @CurrentUser()   u: JwtAuth,
    @Body()          dto: CreateLeadDto,
  ) {
    return this.svc.create(t.id, u?.userId ?? '', dto);
  }

  @Patch(':id') @RequireRole('editor') @Audit('lead.updated') @ApiOperation({ summary: 'Actualizar lead' })
  update(
    @CurrentTenant() t: { id: string },
    @CurrentUser()   u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()          dto: UpdateLeadDto,
  ) {
    return this.svc.update(t.id, u?.userId ?? '', id, dto, u?.orgRole ?? undefined);
  }

  @Delete(':id') @RequireRole('manager') @Audit('lead.deleted') @ApiOperation({ summary: 'Fechar lead' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(t.id, id);
  }
}
